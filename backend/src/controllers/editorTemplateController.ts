import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import PDFDocument from 'pdfkit';
import { requireParam } from '../utils/requestUtils.js';

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
  type: z.enum(['text', 'heading', 'image', 'table', 'chart', 'line', 'rectangle', 'circle', 'signature', 'barcode', 'qrcode']),
  content: z.any(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  size: z.object({
    width: z.number(),
    height: z.number()
  }),
  styles: elementStylesSchema,
  locked: z.boolean().default(false),
  visible: z.boolean().default(true),
  zIndex: z.number(),
  groupId: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  description: z.string().max(500, 'Descrição muito longa').optional(),
  category: z.string().default('default'),
  elements: z.array(templateElementSchema),
  globalStyles: z.object({
    fontFamily: z.string(),
    fontSize: z.number(),
    color: z.string(),
    backgroundColor: z.string(),
    lineHeight: z.number()
  }),
  pageSettings: z.object({
    size: z.enum(['A4', 'A3', 'Letter', 'Legal', 'Custom']),
    orientation: z.enum(['portrait', 'landscape']),
    margins: z.object({
      top: z.number(),
      right: z.number(),
      bottom: z.number(),
      left: z.number()
    }),
    backgroundColor: z.string(),
    showMargins: z.boolean(),
    customSize: z.object({
      width: z.number(),
      height: z.number()
    }).optional()
  }),
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

// In-memory storage for development (replace with database later)
const templates: Map<string, any> = new Map();

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
      
      // Filter templates based on criteria
      let filteredTemplates = Array.from(templates.values()).filter(template => {
        // Access control
        if (!template.isPublic && template.createdBy !== authReq.user?.id) {
          return false;
        }
        
        // Category filter
        if (category && template.category !== category) {
          return false;
        }
        
        // Tags filter
        if (tags.length > 0 && !tags.every(tag => template.tags.includes(tag))) {
          return false;
        }
        
        // Public filter
        if (isPublic !== undefined && template.isPublic !== isPublic) {
          return false;
        }
        
        // Created by filter
        if (createdBy && template.createdBy !== createdBy) {
          return false;
        }
        
        return true;
      });
      
      // Sort templates
      filteredTemplates.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];
        
        if (sortBy === 'name') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        } else {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }
        
        return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
      });
      
      // Paginate
      const skip = (page - 1) * limit;
      const paginatedTemplates = filteredTemplates.slice(skip, skip + limit);
      const total = filteredTemplates.length;
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          templates: paginatedTemplates.map(template => ({
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
          details: error.errors,
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
  const id = requireParam(req, res, 'id');
  if (!id) return;

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

      const template = templates.get(id);

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

      const template = {
        ...templateData,
        id: randomUUID(),
        createdBy: authReq.user.id,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      templates.set(template.id, template);

      res.status(201).json({
        success: true,
        data: {
          template,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
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
      const updateData = updateTemplateSchema.parse(req.body);

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

      const existingTemplate = templates.get(id);

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

      const template = {
        ...existingTemplate,
        ...updateData,
        version: existingTemplate.version + 1,
        updatedAt: new Date().toISOString(),
      };

      templates.set(id, template);

      res.json({
        success: true,
        data: {
          template,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
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

      const existingTemplate = templates.get(id);

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

      templates.delete(id);

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

      const originalTemplate = templates.get(id);

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

      const duplicatedTemplate = {
        ...originalTemplate,
        id: randomUUID(),
        name: name || `${originalTemplate.name} (Cópia)`,
        isPublic: false,
        createdBy: authReq.user.id,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      templates.set(duplicatedTemplate.id, duplicatedTemplate);

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
      const searchResults = Array.from(templates.values())
        .filter(template => {
          // Access control
          if (!template.isPublic && template.createdBy !== authReq.user?.id) {
            return false;
          }
          
          // Search in name, description, and tags
          return (
            template.name.toLowerCase().includes(query) ||
            template.description?.toLowerCase().includes(query) ||
            template.tags.some((tag: string) => tag.toLowerCase().includes(query))
          );
        })
        .slice(0, 20) // Limit results
        .map(template => ({
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
        }));

      res.json({
        success: true,
        data: {
          templates: searchResults,
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

      const template = templates.get(id);

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

      // Garantir diretório de exports
      const exportsDir = process.env.EXPORTS_PATH || path.join(process.cwd(), 'exports');
      await fsPromises.mkdir(exportsDir, { recursive: true });

      const filePath = path.join(exportsDir, filename);

      // Gerar conteúdo do arquivo conforme formato
      if (exportOptions.format === 'pdf') {
        // Gerar PDF simples com pdfkit
        const doc = new PDFDocument({ size: 'A4' });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        doc.fontSize(18).text(template.name || 'Template', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Export gerado em: ${new Date().toLocaleString()}`);
        doc.moveDown();
        doc.fontSize(10).text('Conteúdo do template (resumo):');
        doc.fontSize(9).text(JSON.stringify({ elements: (template.elements || []).length }, null, 2));
        doc.end();
        await new Promise<void>((resolve, reject) => {
          stream.on('finish', () => resolve());
          stream.on('error', (err) => reject(err));
        });
      } else if (exportOptions.format === 'png') {
        // Escrever PNG placeholder (1x1 transparente) — base64 embutido
        const transparentPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
        const buffer = Buffer.from(transparentPngBase64, 'base64');
        await fsPromises.writeFile(filePath, buffer);
      } else if (exportOptions.format === 'html') {
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${template.name}</title></head><body><h1>${template.name}</h1><pre>${JSON.stringify(template, null, 2)}</pre></body></html>`;
        await fsPromises.writeFile(filePath, html, 'utf-8');
      } else if (exportOptions.format === 'json') {
        await fsPromises.writeFile(filePath, JSON.stringify(template, null, 2), 'utf-8');
      } else {
        // Caso não esperado, criar um arquivo de texto
        await fsPromises.writeFile(filePath, `Export do template ${template.name}`, 'utf-8');
      }

      // URL pública para download
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
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
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
  let template = templates.get(id);

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
        doc.fontSize(9).text(JSON.stringify({ elements: (template.elements || []).length }, null, 2));
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
            errors: error.errors.map(err => err.message),
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
}