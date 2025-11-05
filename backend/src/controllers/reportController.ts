import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { reportService } from '../services/reportService.js';
import { AuthenticatedRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';

// Validation schemas
const createReportSchema = z.object({
  validationId: z.string().min(1, 'Validation ID is required'),
  templateId: z.string().min(1, 'Template ID is required'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
});

const updateReportSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  status: z.enum(['DRAFT', 'VALIDATED', 'FINALIZED']).optional(),
});

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  clientId: z.string().optional(),
  status: z.enum(['DRAFT', 'VALIDATED', 'FINALIZED']).optional(),
  userId: z.string().optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export class ReportController {
  async getReports(req: Request, res: Response) {
    try {
      const { 
        page, 
        limit, 
        search, 
        clientId, 
        status, 
        userId, 
        startDate, 
        endDate, 
        sortBy, 
        sortOrder 
      } = querySchema.parse(req.query);
      
      const skip = (page - 1) * limit;
      
      // Build where clause
      const where: any = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' as const } },
          { client: { name: { contains: search, mode: 'insensitive' as const } } },
          { validation: { name: { contains: search, mode: 'insensitive' as const } } },
        ];
      }
      
      if (clientId) {
        where.clientId = clientId;
      }
      
      if (status) {
        where.status = status;
      }
      
      if (userId) {
        where.userId = userId;
      }
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      // Get reports with pagination
      const [reports, total] = await Promise.all([
        prisma.report.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
            validation: {
              select: {
                id: true,
                name: true,
                isApproved: true,
              },
            },
            template: {
              select: {
                id: true,
                name: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.report.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          reports,
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
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }

      logger.error('Get reports error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async getReport(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const report = await prisma.report.findUnique({
        where: { id },
        include: {
          client: true,
          validation: {
            include: {
              suitcase: {
                include: {
                  sensors: {
                    include: {
                      sensor: {
                        select: {
                          id: true,
                          serialNumber: true,
                          model: true,
                          type: {
                            select: {
                              id: true,
                              name: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              _count: {
                select: {
                  sensorData: true,
                },
              },
            },
          },
          template: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!report) {
        return res.status(404).json({
          error: 'Report not found',
        });
      }

      res.json({
        success: true,
        data: { report },
      });
    } catch (error) {
      logger.error('Get report error:', { error: error instanceof Error ? error.message : error, reportId: req.params.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async createReport(req: AuthenticatedRequest, res: Response) {
    try {
      const validatedData = createReportSchema.parse(req.body);

      // Check if validation exists and is approved
      const validation = await prisma.validation.findUnique({
        where: { id: validatedData.validationId },
        include: {
          client: true,
        },
      });

      if (!validation) {
        return res.status(404).json({
          error: 'Validation not found',
        });
      }

      if (!validation.isApproved) {
        return res.status(400).json({
          error: 'Cannot create report for unapproved validation',
        });
      }

      // Check if template exists and is active
      const template = await prisma.reportTemplate.findUnique({
        where: { id: validatedData.templateId },
      });

      if (!template) {
        return res.status(404).json({
          error: 'Template not found',
        });
      }

      if (!template.isActive) {
        return res.status(400).json({
          error: 'Template is not active',
        });
      }

      // Create report
      const report = await reportService.createReport(
        validatedData.validationId,
        validatedData.templateId,
        req.user!.id,
        validation.clientId,
        validatedData.name
      );

      // Get full report data for response
      const fullReport = await prisma.report.findUnique({
        where: { id: report.id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          validation: {
            select: {
              id: true,
              name: true,
            },
          },
          template: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: { report: fullReport },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }

      logger.error('Create report error:', { error: error instanceof Error ? error.message : error, userId: req.user?.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async updateReport(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateReportSchema.parse(req.body);

      // Check if report exists
      const existingReport = await prisma.report.findUnique({
        where: { id },
      });

      if (!existingReport) {
        return res.status(404).json({
          error: 'Report not found',
        });
      }

      // Check if report is finalized (cannot be modified)
      if (existingReport.status === 'FINALIZED') {
        return res.status(400).json({
          error: 'Cannot modify finalized report',
        });
      }

      // Update report
      const report = await reportService.updateReport(id, validatedData, req.user!.id);

      // Get full report data for response
      const fullReport = await prisma.report.findUnique({
        where: { id: report.id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          validation: {
            select: {
              id: true,
              name: true,
            },
          },
          template: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: { report: fullReport },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }

      logger.error('Update report error:', { 
        error: error instanceof Error ? error.message : error, 
        reportId: req.params.id, 
        userId: req.user?.id 
      });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async deleteReport(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      // Check if report exists
      const existingReport = await prisma.report.findUnique({
        where: { id },
      });

      if (!existingReport) {
        return res.status(404).json({
          error: 'Report not found',
        });
      }

      // Check if report is finalized (cannot be deleted)
      if (existingReport.status === 'FINALIZED') {
        return res.status(400).json({
          error: 'Cannot delete finalized report',
        });
      }

      // Delete report
      await reportService.deleteReport(id, req.user!.id);

      logger.info('Report deleted:', { reportId: id, name: existingReport.name, userId: req.user?.id });

      res.json({
        success: true,
        message: 'Report deleted successfully',
      });
    } catch (error) {
      logger.error('Delete report error:', { 
        error: error instanceof Error ? error.message : error, 
        reportId: req.params.id, 
        userId: req.user?.id 
      });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async getReportStatistics(req: Request, res: Response) {
    try {
      const stats = await reportService.getReportStatistics();

      res.json({
        success: true,
        data: { statistics: stats },
      });
    } catch (error) {
      logger.error('Get report statistics error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async generatePdf(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const report = await prisma.report.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          status: true,
          pdfPath: true,
        },
      });

      if (!report) {
        return res.status(404).json({
          error: 'Report not found',
        });
      }

      if (report.status === 'DRAFT') {
        return res.status(400).json({
          error: 'Cannot generate PDF for draft report',
        });
      }

      // Generate PDF
      const pdfPath = await reportService.generatePdf(id, req.user!.id);

      res.json({
        success: true,
        message: 'PDF generated successfully',
        data: {
          reportId: id,
          pdfPath,
        },
      });
    } catch (error) {
      logger.error('Generate PDF error:', { 
        error: error instanceof Error ? error.message : error, 
        reportId: req.params.id,
        userId: req.user?.id 
      });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  async previewPdf(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const report = await prisma.report.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
        },
      });

      if (!report) {
        return res.status(404).json({
          error: 'Report not found',
        });
      }

      // Generate preview PDF
      const previewPath = await reportService.previewPdf(id);

      res.json({
        success: true,
        message: 'Preview generated successfully',
        data: {
          reportId: id,
          previewPath,
        },
      });
    } catch (error) {
      logger.error('Preview PDF error:', { 
        error: error instanceof Error ? error.message : error, 
        reportId: req.params.id 
      });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  async downloadReport(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const report = await prisma.report.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          pdfPath: true,
          status: true,
        },
      });

      if (!report) {
        return res.status(404).json({
          error: 'Report not found',
        });
      }

      if (!report.pdfPath) {
        return res.status(400).json({
          error: 'Report PDF not generated yet',
        });
      }

      // Get PDF buffer and send as download
      const pdfBuffer = await reportService.getPdfBuffer(id);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${report.name}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Download report error:', { 
        error: error instanceof Error ? error.message : error, 
        reportId: req.params.id 
      });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
}