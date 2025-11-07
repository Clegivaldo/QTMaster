import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';
import { fastReportService } from '../services/fastReportService.js';
import { requireParam, stripUndefined } from '../utils/requestUtils.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().optional().or(z.literal('')),
  templatePath: z.string().min(1, 'Template path is required'),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  description: z.string().optional().or(z.literal('')),
  templatePath: z.string().min(1, 'Template path is required').optional(),
  isActive: z.boolean().optional(),
});

const uploadTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().optional().or(z.literal('')),
});

// Configure multer for template uploads
const templateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const templatesPath = process.env.TEMPLATES_PATH || path.join(process.cwd(), 'templates');
    cb(null, templatesPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `template-${uniqueSuffix}${extension}`);
  },
});

const templateUpload = multer({
  storage: templateStorage,
  fileFilter: (req, file, cb) => {
    // Only allow FastReport template files
    const allowedExtensions = ['.frx', '.fr3'];
    const extension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error('Only FastReport template files (.frx, .fr3) are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  isActive: z.string().optional().transform(val => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export class ReportTemplateController {
  async getTemplates(req: Request, res: Response) {
    try {
      const { page, limit, search, isActive, sortBy, sortOrder } = querySchema.parse(req.query);
      
      const skip = (page - 1) * limit;
      
      // Build where clause
      const where: any = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ];
      }
      
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      // Get templates with pagination
      const [templates, total] = await Promise.all([
        prisma.reportTemplate.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            _count: {
              select: {
                reports: true,
              },
            },
          },
        }),
        prisma.reportTemplate.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          templates,
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
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      logger.error('Get templates error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async getTemplate(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      const template = await prisma.reportTemplate.findUnique({
        where: { id },
        include: {
          reports: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              status: true,
              createdAt: true,
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              reports: true,
            },
          },
        },
      });

      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.json({
        success: true,
        data: { template },
      });
    } catch (error) {
      logger.error('Get template error:', { error: error instanceof Error ? error.message : error, templateId: req.params.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async createTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const validatedData = createTemplateSchema.parse(req.body);

      // Check if template name already exists
      const existingTemplate = await prisma.reportTemplate.findFirst({
        where: { name: validatedData.name },
      });

      if (existingTemplate) {
        res.status(400).json({
          error: 'Template with this name already exists',
        });
        return;
      }

      // Create template
      const template = await prisma.reportTemplate.create({
        data: {
          name: validatedData.name,
          description: validatedData.description || null,
          templatePath: validatedData.templatePath,
          isActive: true,
        },
      });

      logger.info('Template created:', {
        templateId: template.id,
        name: template.name,
        userId: req.user?.id,
      });

      res.status(201).json({
        success: true,
        data: { template },
      });
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      logger.error('Create template error:', { error: error instanceof Error ? error.message : error, userId: req.user?.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async updateTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
      const validatedData = updateTemplateSchema.parse(req.body);

      // Check if template exists
      const existingTemplate = await prisma.reportTemplate.findUnique({
        where: { id },
      });

      if (!existingTemplate) {
        res.status(404).json({
          error: 'Template not found',
        });
        return;
      }

      // Check if new name conflicts with existing template
      if (validatedData.name && validatedData.name !== existingTemplate.name) {
        const nameConflict = await prisma.reportTemplate.findFirst({
          where: { 
            name: validatedData.name,
            id: { not: id },
          },
        });

        if (nameConflict) {
          res.status(400).json({
            error: 'Template with this name already exists',
          });
          return;
        }
      }

      // Prepare data removing undefined fields (Prisma strict typing)
      const dataToUpdate = {
        ...stripUndefined(validatedData) as any,
        updatedAt: new Date(),
      } as any;

      // Ensure explicit null when description was provided as empty string
      if (Object.prototype.hasOwnProperty.call(validatedData, 'description')) {
        dataToUpdate.description = validatedData.description || null;
      }

      // Update template
      const template = await prisma.reportTemplate.update({
        where: { id },
        data: dataToUpdate,
      });

      logger.info('Template updated:', {
        templateId: id,
        name: template.name,
        changes: validatedData,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        data: { template },
      });
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      logger.error('Update template error:', { error: error instanceof Error ? error.message : error, templateId: req.params.id, userId: req.user?.id });
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }

  async deleteTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      // Check if template exists
      const existingTemplate = await prisma.reportTemplate.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              reports: true,
            },
          },
        },
      });

      if (!existingTemplate) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      // Check if template has associated reports
      if (existingTemplate._count.reports > 0) {
        res.status(400).json({ error: 'Cannot delete template with associated reports', details: { reports: existingTemplate._count.reports } });
        return;
      }

      // Delete template
      await prisma.reportTemplate.delete({
        where: { id },
      });

      logger.info('Template deleted:', { templateId: id, name: existingTemplate.name, userId: req.user?.id });

      res.json({
        success: true,
        message: 'Template deleted successfully',
      });
      return;
    } catch (error) {
      logger.error('Delete template error:', { 
        error: error instanceof Error ? error.message : error, 
        templateId: req.params.id, 
        userId: req.user?.id 
      });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async getActiveTemplates(req: Request, res: Response) {
    try {
      const templates = await prisma.reportTemplate.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
        },
        orderBy: { name: 'asc' },
      });

      res.json({
        success: true,
        data: { templates },
      });
    } catch (error) {
      logger.error('Get active templates error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async uploadTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      // Use multer middleware
      templateUpload.single('template')(req, res, async (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              res.status(400).json({
                error: 'File too large. Maximum size is 10MB.',
              });
              return;
            }
          }

          res.status(400).json({ error: err.message });
          return;
        }

        if (!req.file) {
          res.status(400).json({ error: 'No template file provided' });
          return;
        }

        try {
          const validatedData = uploadTemplateSchema.parse(req.body);

          // Check if template name already exists
          const existingTemplate = await prisma.reportTemplate.findFirst({ where: { name: validatedData.name } });
          if (existingTemplate) {
            await fs.unlink(req.file.path).catch(() => {});
            res.status(400).json({ error: 'Template with this name already exists' });
            return;
          }

          // Validate template file
          const isValid = await fastReportService.validateTemplate(req.file.filename);
          if (!isValid) {
            await fs.unlink(req.file.path).catch(() => {});
            res.status(400).json({ error: 'Invalid FastReport template file' });
            return;
          }

          // Create template record
          const template = await prisma.reportTemplate.create({
            data: {
              name: validatedData.name,
              description: validatedData.description || null,
              templatePath: req.file.filename,
              isActive: true,
            },
          });

          logger.info('Template uploaded:', { templateId: template.id, name: template.name, filename: req.file.filename, userId: req.user?.id });

          res.status(201).json({ success: true, data: { template } });
        } catch (error) {
          // Delete uploaded file on error
          if (req.file) await fs.unlink(req.file.path).catch(() => {});

          if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
            return;
          }

          logger.error('Upload template error:', { error: error instanceof Error ? error.message : error, userId: req.user?.id });
          res.status(500).json({ error: 'Internal server error' });
        }
      });
    } catch (error) {
      logger.error('Upload template error:', { 
        error: error instanceof Error ? error.message : error, 
        userId: req.user?.id 
      });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async previewTemplate(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      const template = await prisma.reportTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      // Check if template file exists
      const isValid = await fastReportService.validateTemplate(template.templatePath);
      if (!isValid) {
        res.status(400).json({ error: 'Template file not found or invalid' });
        return;
      }

      // For now, return template metadata
      // In a full implementation, this could generate a preview image or return template structure
      res.json({ success: true, data: {
          template: {
            id: template.id,
            name: template.name,
            description: template.description,
            templatePath: template.templatePath,
            isActive: template.isActive,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
          },
          preview: {
            message: 'Template preview functionality would be implemented here',
            templateExists: true,
          },
        },
      });
      return;
    } catch (error) {
      logger.error('Preview template error:', { 
        error: error instanceof Error ? error.message : error, 
        templateId: req.params.id 
      });
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }

  async getTemplateVersions(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      const template = await prisma.reportTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      // For now, return basic version info
      // In a full implementation, this would track template versions
      const versions = [
        {
          id: '1',
          version: '1.0.0',
          templateId: template.id,
          templatePath: template.templatePath,
          createdAt: template.createdAt,
          isActive: template.isActive,
          changes: 'Initial version',
        },
      ];

      res.json({
        success: true,
        data: { versions },
      });
    } catch (error) {
      logger.error('Get template versions error:', { 
        error: error instanceof Error ? error.message : error, 
        templateId: req.params.id 
      });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  // Middleware getter for template upload
  getUploadMiddleware() {
    return templateUpload.single('template');
  }
}