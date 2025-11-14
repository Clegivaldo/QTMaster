import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';
import { AuditService } from '../services/auditService.js';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import PDFDocument from 'pdfkit';
import { requireParam } from '../utils/requestUtils.js';
import { prisma } from '../lib/prisma.js';

// Validation schemas
const elementStylesSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontWeight: z.string().optional(),
  fontStyle: z.string().optional(),
  textDecoration: z.string().optional(),
  color: z.string().optional(),
  textAlign: z.string().optional(),
  lineHeight: z.number().optional(),
  letterSpacing: z.number().optional(),
  padding: z.object({
    top: z.number(),
    right: z.number(),
    bottom: z.number(),
    left: z.number()
  }).optional(),
  margin: z.object({
    top: z.number(),
    right: z.number(),
    bottom: z.number(),
    left: z.number()
  }).optional(),
  border: z.object({
    width: z.number(),
    style: z.string(),
    color: z.string()
  }).optional(),
  borderRadius: z.number().optional(),
  backgroundColor: z.string().optional(),
  opacity: z.number().optional(),
  rotation: z.number().optional(),
  shadow: z.object({
    offsetX: z.number(),
    offsetY: z.number(),
    blur: z.number(),
    spread: z.number(),
    color: z.string()
  }).optional(),
  zIndex: z.number().optional()
});

const templateElementSchema = z.object({
  id: z.string(),
  type: z.string(), // Allow any element type
  content: z.any(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  size: z.object({
    width: z.number(),
    height: z.number()
  }),
  styles: z.any().optional(), // Allow any styles
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
  zIndex: z.number().optional(),
  groupId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  pageId: z.string().optional() // Allow pageId for multi-page support
}).passthrough(); // Allow additional unknown properties

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  description: z.string().max(500, 'Descrição muito longa').nullable().optional(),
  category: z.string().default('default'),
  elements: z.array(z.any()).optional().default([]),
  globalStyles: z.any().optional().default({}), // Flexível para aceitar qualquer estrutura
  pages: z.any().optional(),
  pageSettings: z.any().optional(), // Flexível para aceitar qualquer estrutura
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false)
});

const updateTemplateSchema = createTemplateSchema.partial().extend({
  version: z.number().optional()
});

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  category: z.string().optional(),
  tags: z.string().optional().transform(val => val ? val.split(',') : []),
  isPublic: z.string().optional().transform(val => val ? val === 'true' : undefined),
  createdBy: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional().default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const exportOptionsSchema = z.object({
  format: z.enum(['pdf', 'png', 'html', 'json']),
  quality: z.number().min(0.1).max(1).optional().default(0.9),
  dpi: z.number().min(72).max(600).optional().default(300),
  includeMetadata: z.boolean().optional().default(true)
});

// In-memory storage removed - now using Prisma for persistent database storage

export class EditorTemplateController {
  
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { page, limit, category, tags, isPublic, createdBy, sortBy, sortOrder } = querySchema.parse(req.query);
      
      if (!authReq.user?.id) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
        return;
      }
      
      // Build Prisma where condition
      const whereCondition: any = {
        OR: [
          { isPublic: true },
          { createdBy: authReq.user.id }
        ]
      };
      
      if (category) {
        whereCondition.category = category;
      }
      
      if (tags.length > 0) {
        whereCondition.tags = {
          hasSome: tags
        };
      }
      
      if (isPublic !== undefined) {
        whereCondition.isPublic = isPublic;
      }
      
      if (createdBy) {
        whereCondition.createdBy = createdBy;
      }
      
      // Get total count
      const total = await prisma.editorTemplate.count({
        where: whereCondition
      });
      
      // Get paginated templates
      const skip = (page - 1) * limit;
      const templates = await prisma.editorTemplate.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        }
      });
      
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          templates: templates.map((template: any) => ({
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category,
            tags: template.tags,
            thumbnail: template.thumbnail,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
            createdBy: template.createdBy,
            isPublic: template.isPublic,
            version: template.version
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.issues,
        });
        return;
      }

      logger.error('Get editor templates error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      if (!authReq.user?.id) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do template é obrigatório',
        });
        return;
      }

      const template = await prisma.editorTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template não encontrado',
        });
        return;
      }

      // Verificar permissões
      if (!template.isPublic && template.createdBy !== authReq.user.id) {
        res.status(403).json({
          success: false,
          error: 'Acesso negado',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          template,
        },
      });
    } catch (error) {
      logger.error('Get editor template error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const templateData = createTemplateSchema.parse(req.body);

      if (!authReq.user?.id) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
        return;
      }

      // Create template in database
      const createPayload: any = {
        id: randomUUID(),
        name: templateData.name,
        description: templateData.description || null,
        category: templateData.category,
        elements: (templateData.elements || []) as any,
        globalStyles: (templateData.globalStyles || {}) as any,
        pageSettings: (templateData.pageSettings ? templateData.pageSettings : undefined) as any,
        tags: templateData.tags,
        isPublic: templateData.isPublic,
        createdBy: authReq.user.id,
        version: 1,
        revision: 0
      };

      // Handle pages separately as it's a JSON field
      if (templateData.pages) {
        createPayload.pages = templateData.pages as any;
      }

      const template = await prisma.editorTemplate.create({
        data: createPayload
      });

      // Log audit event
      await AuditService.logDataCreation(
        'template',
        template.id,
        authReq.user.id,
        authReq.user.email,
        req.ip || 'unknown',
        { name: template.name, category: template.category },
        req.get('User-Agent')
      );

      res.status(201).json({
        success: true,
        data: {
          template: {
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category,
            elements: template.elements as any,
            globalStyles: template.globalStyles as any,
            pageSettings: template.pageSettings as any,
            tags: template.tags,
            isPublic: template.isPublic,
            createdBy: template.createdBy,
            version: template.version,
            revision: (template as any).revision ?? 0,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.issues,
        });
        return;
      }

      logger.error('Create editor template error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      
      // Log detalhado para debug
      console.log('=== UPDATE TEMPLATE DEBUG ===');
      console.log('Template ID:', id);
      console.log('User ID:', authReq.user?.id);
      console.log('User:', authReq.user);
      console.log('Request body:', JSON.stringify(req.body).substring(0, 200));
      
      const updateData = updateTemplateSchema.parse(req.body);
      console.log('✅ Schema validation passed');

      if (!authReq.user?.id) {
        console.log('❌ User not authenticated');
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do template é obrigatório',
        });
        return;
      }

      // Get existing template
      const existingTemplate = await prisma.editorTemplate.findUnique({
        where: { id }
      });

      if (!existingTemplate) {
        res.status(404).json({
          success: false,
          error: 'Template não encontrado',
        });
        return;
      }

      if (existingTemplate.createdBy !== authReq.user.id) {
        res.status(403).json({
          success: false,
          error: 'Acesso negado',
        });
        return;
      }

      // Update template in database
      const updatePayload: any = {
        name: updateData.name || existingTemplate.name,
        description: updateData.description !== undefined ? updateData.description : existingTemplate.description,
        category: updateData.category || existingTemplate.category,
        elements: updateData.elements !== undefined ? updateData.elements : existingTemplate.elements,
        globalStyles: updateData.globalStyles !== undefined ? updateData.globalStyles : existingTemplate.globalStyles,
        pageSettings: updateData.pageSettings !== undefined ? (updateData.pageSettings as any) : (existingTemplate.pageSettings as any),
        tags: updateData.tags || existingTemplate.tags,
        isPublic: updateData.isPublic !== undefined ? updateData.isPublic : existingTemplate.isPublic,
        // Allow client to override version if provided; otherwise increment
        version: (updateData as any).version !== undefined ? (updateData as any).version : existingTemplate.version + 1,
        revision: (updateData as any).revision !== undefined ? (updateData as any).revision : ((existingTemplate as any).revision ?? 0)
      };

      // Handle pages separately as it's a JSON field
      if (updateData.pages !== undefined) {
        updatePayload.pages = updateData.pages as any;
      } else if ((existingTemplate as any).pages) {
        updatePayload.pages = (existingTemplate as any).pages;
      }

      const template = await prisma.editorTemplate.update({
        where: { id },
        data: updatePayload
      });

      // Log audit event
      await AuditService.logDataUpdate(
        'template',
        id,
        authReq.user.id,
        authReq.user.email,
        req.ip || 'unknown',
        { name: existingTemplate.name, version: existingTemplate.version },
        { name: template.name, version: template.version },
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: {
          template: {
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category,
            elements: template.elements as any,
            globalStyles: template.globalStyles as any,
            pageSettings: template.pageSettings as any,
            pages: (template as any).pages,
            tags: template.tags,
            isPublic: template.isPublic,
            createdBy: template.createdBy,
            version: template.version,
            revision: (template as any).revision ?? 0,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt
          },
        },
      });
    } catch (error) {
      console.log('❌ UPDATE TEMPLATE ERROR:');
      console.log('Error type:', error?.constructor?.name);
      console.log('Error:', error);
      
      if (error instanceof z.ZodError) {
        console.log('❌ Zod validation error:', JSON.stringify(error.issues, null, 2));
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.issues,
        });
        return;
      }

      logger.error('Update editor template error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      if (!authReq.user?.id) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do template é obrigatório',
        });
        return;
      }

      const existingTemplate = await prisma.editorTemplate.findUnique({
        where: { id }
      });

      if (!existingTemplate) {
        res.status(404).json({
          success: false,
          error: 'Template não encontrado',
        });
        return;
      }

      if (existingTemplate.createdBy !== authReq.user.id) {
        res.status(403).json({
          success: false,
          error: 'Acesso negado',
        });
        return;
      }

      await prisma.editorTemplate.delete({
        where: { id }
      });

      // Log audit event
      await AuditService.logDataDeletion(
        'template',
        id,
        authReq.user.id,
        authReq.user.email,
        req.ip || 'unknown',
        { name: existingTemplate.name, category: existingTemplate.category },
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Template excluído com sucesso',
      });
    } catch (error) {
      logger.error('Delete editor template error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async duplicateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const { name } = req.body;

      if (!authReq.user?.id) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do template é obrigatório',
        });
        return;
      }

      const originalTemplate = await prisma.editorTemplate.findUnique({
        where: { id }
      });

      if (!originalTemplate) {
        res.status(404).json({
          success: false,
          error: 'Template não encontrado',
        });
        return;
      }

      // Verificar permissões
      if (!originalTemplate.isPublic && originalTemplate.createdBy !== authReq.user.id) {
        res.status(403).json({
          success: false,
          error: 'Acesso negado',
        });
        return;
      }

      const duplicatePayload: any = {
        id: randomUUID(),
        name: name || `${originalTemplate.name} (Cópia)`,
        description: originalTemplate.description,
        category: originalTemplate.category,
        elements: (originalTemplate.elements || []) as any,
        globalStyles: (originalTemplate.globalStyles || {}) as any,
        pageSettings: (originalTemplate.pageSettings || null) as any,
        tags: originalTemplate.tags,
        isPublic: false,
        createdBy: authReq.user.id,
        version: 1
      };

      // Handle pages separately as it's a JSON field
      if ((originalTemplate as any).pages) {
        duplicatePayload.pages = (originalTemplate as any).pages;
      }

      const duplicatedTemplate = await prisma.editorTemplate.create({
        data: duplicatePayload
      });

      res.status(201).json({
        success: true,
        data: {
          template: duplicatedTemplate,
        },
      });
    } catch (error) {
      logger.error('Duplicate editor template error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async searchTemplates(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { q } = req.query;

      if (!authReq.user?.id) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
        return;
      }

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Query de busca é obrigatória',
        });
        return;
      }

      const query = q.toLowerCase();
      
      // Search in database
      const searchResults = await prisma.editorTemplate.findMany({
        where: {
          AND: [
            {
              OR: [
                { isPublic: true },
                { createdBy: authReq.user.id }
              ]
            },
            {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { tags: { hasSome: [query] } }
              ]
            }
          ]
        },
        take: 20
      });

      res.json({
        success: true,
        data: {
          templates: searchResults.map((template: any) => ({
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category,
            tags: template.tags,
            thumbnail: template.thumbnail,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
            createdBy: template.createdBy,
            isPublic: template.isPublic
          })),
        },
      });
    } catch (error) {
      logger.error('Search editor templates error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async exportTemplate(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const exportOptions = exportOptionsSchema.parse(req.body);

      if (!authReq.user?.id) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do template é obrigatório',
        });
        return;
      }

      const template = await prisma.editorTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template não encontrado',
        });
        return;
      }

      // Verificar permissões
      if (!template.isPublic && template.createdBy !== authReq.user.id) {
        res.status(403).json({
          success: false,
          error: 'Acesso negado',
        });
        return;
      }

      // Gerar nome do arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${exportOptions.format}`;

      // Gerar conteúdo do arquivo conforme formato e retornar diretamente ao cliente
      if (exportOptions.format === 'pdf') {
        // Gerar PDF simples com pdfkit e enviar diretamente como blob
        const doc = new PDFDocument({ size: 'A4' });
        
        // Coletar dados do PDF em um buffer
        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
          res.setHeader('Content-Length', pdfBuffer.length);
          res.send(pdfBuffer);
        });
        
        doc.on('error', (err) => {
          logger.error('PDF generation error:', err);
          res.status(500).json({
            success: false,
            error: 'Erro ao gerar PDF',
          });
        });
        
        // Conteúdo do PDF
        doc.fontSize(18).text(template.name || 'Template', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Export gerado em: ${new Date().toLocaleString('pt-BR')}`);
        doc.moveDown();
        
        // Renderizar elementos do template
        const elements = (template.elements as any[]) || [];
        
        if (elements.length > 0) {
          doc.fontSize(14).text('Elementos do Template:', { underline: true });
          doc.moveDown();
          
          // Mostrar contagem de elementos
          doc.fontSize(11).text(`Total de elementos: ${elements.length}`);
          doc.moveDown();
          
          doc.fontSize(9).text('Detalhes dos elementos:');
          doc.moveDown();
          
          // Mostrar detalhes resumidos de cada elemento (máximo 10 para não ficar muito grande)
          elements.slice(0, 10).forEach((el: any, idx: number) => {
            const elType = el.type || 'unknown';
            const elContent = el.content ? (typeof el.content === 'string' ? el.content : JSON.stringify(el.content).substring(0, 50)) : '(sem conteúdo)';
            doc.fontSize(8).text(`${idx + 1}. [${elType}] ${elContent}`);
          });
          
          if (elements.length > 10) {
            doc.fontSize(8).text(`... e mais ${elements.length - 10} elemento${elements.length - 10 !== 1 ? 's' : ''}`);
          }
        } else {
          doc.fontSize(11).text('(Nenhum elemento no template)');
        }
        
        // Informações adicionais
        doc.moveDown(2);
        doc.fontSize(9).text('Metadados:', { underline: true });
        doc.fontSize(8).text(`Categoria: ${template.category || 'N/A'}`);
        doc.fontSize(8).text(`Versão: ${template.version || 1}`);
        doc.fontSize(8).text(`Criado em: ${new Date(template.createdAt).toLocaleString('pt-BR')}`);
        doc.fontSize(8).text(`Público: ${template.isPublic ? 'Sim' : 'Não'}`);
        
        if (template.tags && (template.tags as any[]).length > 0) {
          doc.fontSize(8).text(`Tags: ${(template.tags as any[]).join(', ')}`);
        }
        
        doc.end();
      } else if (exportOptions.format === 'png') {
        // Retornar PNG placeholder (1x1 transparente)
        const transparentPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
        const buffer = Buffer.from(transparentPngBase64, 'base64');
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
      } else if (exportOptions.format === 'html') {
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${template.name}</title></head><body><h1>${template.name}</h1><pre>${JSON.stringify(template, null, 2)}</pre></body></html>`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.send(html);
      } else if (exportOptions.format === 'json') {
        const jsonData = JSON.stringify(template, null, 2);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(jsonData);
      } else {
        // Caso não esperado, criar um arquivo de texto
        const textData = `Export do template ${template.name}`;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(textData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.issues,
        });
        return;
      }

      logger.error('Export editor template error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  // Public export endpoint for local testing — accepts either an existing template id or a template in the body
  async exportTemplatePublic(req: Request, res: Response): Promise<void> {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
      const exportOptions = exportOptionsSchema.parse(req.body.options || req.body);

      // Try to find existing template by id
      let template = await prisma.editorTemplate.findUnique({
        where: { id }
      });

      // If template not found, allow providing template body in request
      if (!template) {
        if (req.body && req.body.template) {
          template = req.body.template;
        } else {
          res.status(404).json({ success: false, error: 'Template not found and no template provided' });
          return;
        }
      }

      // Generate filename and file as in exportTemplate
      if (!template) {
        res.status(400).json({ success: false, error: 'Template is required' });
        return;
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${(template.name || 'template').replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${exportOptions.format}`;
      const exportsDir = process.env.EXPORTS_PATH || path.join(process.cwd(), 'exports');
      await fsPromises.mkdir(exportsDir, { recursive: true });
      const filePath = path.join(exportsDir, filename);

      if (exportOptions.format === 'pdf') {
        const doc = new PDFDocument({ size: 'A4' });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        doc.fontSize(18).text(template.name || 'Template', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Export gerado em: ${new Date().toLocaleString()}`);
        doc.moveDown();
        doc.fontSize(10).text('Conteúdo do template (resumo):');
        const elements = template.elements as any[];
        doc.fontSize(9).text(JSON.stringify({ elements: (elements || []).length }, null, 2));
        doc.end();
        await new Promise<void>((resolve, reject) => {
          stream.on('finish', () => resolve());
          stream.on('error', (err) => reject(err));
        });
      } else if (exportOptions.format === 'png') {
        const transparentPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
        const buffer = Buffer.from(transparentPngBase64, 'base64');
        await fsPromises.writeFile(filePath, buffer);
      } else if (exportOptions.format === 'html') {
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${template.name}</title></head><body><h1>${template.name}</h1><pre>${JSON.stringify(template, null, 2)}</pre></body></html>`;
        await fsPromises.writeFile(filePath, html, 'utf-8');
      } else if (exportOptions.format === 'json') {
        await fsPromises.writeFile(filePath, JSON.stringify(template, null, 2), 'utf-8');
      } else {
        await fsPromises.writeFile(filePath, `Export do template ${template.name}`, 'utf-8');
      }

      const exportUrl = `/api/exports/${filename}`;
      res.json({ success: true, data: { url: exportUrl, filename, format: exportOptions.format } });
    } catch (error) {
      logger.error('Public export error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async validateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templateData = createTemplateSchema.parse(req.body);

      res.json({
        success: true,
        data: {
          isValid: true,
          errors: [],
          warnings: []
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.json({
          success: true,
          data: {
            isValid: false,
            errors: error.issues.map((err: any) => err.message),
            warnings: []
          },
        });
        return;
      }

      logger.error('Validate editor template error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async exportTemplateData(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { template, options } = req.body;
      
      if (!authReq.user?.id) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
        return;
      }

      if (!template || !template.name) {
        res.status(400).json({
          success: false,
          error: 'Template obrigatório com propriedade "name"',
        });
        return;
      }

      if (!options || !options.format) {
        res.status(400).json({
          success: false,
          error: 'Opções de exportação obrigatórias com propriedade "format"',
        });
        return;
      }

      const exportOptions = { 
        format: options.format,
        quality: Math.max(1, Math.min(100, options.quality ?? 100)),
        dpi: Math.max(72, Math.min(600, options.dpi || 300)),
        includeMetadata: options.includeMetadata ?? true
      };

      // Gerar nome do arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${(template.name || 'template').replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${exportOptions.format}`;

      // Garantir diretório de exports
      const exportsDir = process.env.EXPORTS_PATH || path.join(process.cwd(), 'exports');
      await fsPromises.mkdir(exportsDir, { recursive: true });

      const filePath = path.join(exportsDir, filename);

      // Gerar conteúdo do arquivo conforme formato
      if (exportOptions.format === 'pdf') {
        const doc = new PDFDocument({ size: 'A4' });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        doc.fontSize(18).text(template.name || 'Template', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Export gerado em: ${new Date().toLocaleString()}`);
        doc.moveDown();
        doc.fontSize(10).text('Conteúdo do template (resumo):');
        doc.fontSize(9).text(JSON.stringify({ elements: (template.elements || []).length, pages: (template.pages || []).length }, null, 2));
        doc.end();
        await new Promise<void>((resolve, reject) => {
          stream.on('finish', () => resolve());
          stream.on('error', (err) => reject(err));
        });
      } else if (exportOptions.format === 'png') {
        const transparentPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
        const buffer = Buffer.from(transparentPngBase64, 'base64');
        await fsPromises.writeFile(filePath, buffer);
      } else if (exportOptions.format === 'html') {
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${template.name}</title></head><body><h1>${template.name}</h1><pre>${JSON.stringify(template, null, 2)}</pre></body></html>`;
        await fsPromises.writeFile(filePath, html, 'utf-8');
      } else if (exportOptions.format === 'json') {
        await fsPromises.writeFile(filePath, JSON.stringify(template, null, 2), 'utf-8');
      } else {
        await fsPromises.writeFile(filePath, `Export do template ${template.name}`, 'utf-8');
      }

      const exportUrl = `/api/exports/${filename}`;

      res.json({
        success: true,
        data: {
          url: exportUrl,
          filename,
          format: exportOptions.format,
        },
      });
    } catch (error) {
      logger.error('Export template data error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: 'Erro ao exportar template',
      });
    }
  }
}