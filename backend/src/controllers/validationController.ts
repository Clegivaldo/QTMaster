import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validationService } from '../services/validationService.js';
import { AuthenticatedRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';
import { requireParam, stripUndefined } from '../utils/requestUtils.js';

// Validation schemas
const createValidationSchema = z.object({
  suitcaseId: z.string().min(1, 'Suitcase ID is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().optional().or(z.literal('')),
  parameters: z.object({
    minTemperature: z.number(),
    maxTemperature: z.number(),
    minHumidity: z.number().optional(),
    maxHumidity: z.number().optional(),
  }),
  sensorDataIds: z.array(z.string()).min(1, 'At least one sensor data point is required'),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

const updateApprovalSchema = z.object({
  isApproved: z.boolean(),
});

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  clientId: z.string().optional(),
  isApproved: z.string().optional().transform(val => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }),
  sortBy: z.enum(['name', 'createdAt', 'isApproved']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export class ValidationController {
  async getValidations(req: Request, res: Response) {
    try {
      const { page, limit, search, clientId, isApproved, sortBy, sortOrder } = querySchema.parse(req.query);
      
      const skip = (page - 1) * limit;
      
      // Build where clause
      const where: any = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ];
      }
      
      if (clientId) {
        where.clientId = clientId;
      }
      
      if (isApproved !== undefined) {
        where.isApproved = isApproved;
      }

      // Get validations with pagination
      const [validations, total] = await Promise.all([
        prisma.validation.findMany({
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
            suitcase: {
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
            _count: {
              select: {
                sensorData: true,
                reports: true,
              },
            },
          },
        }),
        prisma.validation.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          validations,
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
        res.status(400).json({ error: 'Validation error', details: error.issues });
        return;
      }

      logger.error('Get validations error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }

  async getValidation(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      const validation = await prisma.validation.findUnique({
        where: { id },
        include: {
          client: true,
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
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          sensorData: {
            take: 10,
            orderBy: { timestamp: 'desc' },
            include: {
              sensor: {
                select: {
                  id: true,
                  serialNumber: true,
                },
              },
            },
          },
          reports: {
            select: {
              id: true,
              name: true,
              status: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              sensorData: true,
              reports: true,
            },
          },
        },
      });

      if (!validation) {
        res.status(404).json({ error: 'Validation not found' });
        return;
      }

      res.json({ success: true, data: { validation } });
      return;
    } catch (error) {
      logger.error('Get validation error:', { error: error instanceof Error ? error.message : error, validationId: req.params.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async getSensorDataForValidation(req: Request, res: Response) {
    try {
      const suitcaseId = requireParam(req, res, 'suitcaseId');
      if (!suitcaseId) return;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const sensorData = await validationService.getSensorDataForValidation(
        suitcaseId,
        start,
        end
      );

      res.json({
        success: true,
        data: { sensorData },
      });
    } catch (error) {
      logger.error('Get sensor data for validation error:', { 
        error: error instanceof Error ? error.message : error, 
        suitcaseId: req.params.suitcaseId 
      });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async getChartData(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      const validation = await prisma.validation.findUnique({
        where: { id },
        select: {
          minTemperature: true,
          maxTemperature: true,
          minHumidity: true,
          maxHumidity: true,
          sensorData: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!validation) {
        res.status(404).json({ error: 'Validation not found' });
        return;
      }

      const parameters = stripUndefined({
        minTemperature: validation.minTemperature,
        maxTemperature: validation.maxTemperature,
        minHumidity: validation.minHumidity ?? undefined,
        maxHumidity: validation.maxHumidity ?? undefined,
      }) as any;

      const sensorDataIds = validation.sensorData.map(sd => sd.id);
  const chartData = await validationService.getChartData(sensorDataIds, parameters as any);

      res.json({ success: true, data: { chartData, parameters } });
      return;
    } catch (error) {
      logger.error('Get chart data error:', { error: error instanceof Error ? error.message : error, validationId: req.params.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async createValidation(req: AuthenticatedRequest, res: Response) {
    try {
      const validatedData = createValidationSchema.parse(req.body);

      // Check if suitcase exists
      const suitcase = await prisma.suitcase.findUnique({
        where: { id: validatedData.suitcaseId },
      });

      if (!suitcase) {
        res.status(404).json({ error: 'Suitcase not found' });
        return;
      }

      // Check if client exists
      const client = await prisma.client.findUnique({
        where: { id: validatedData.clientId },
      });

      if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      // Validate temperature parameters
      if (validatedData.parameters.minTemperature >= validatedData.parameters.maxTemperature) {
        res.status(400).json({ error: 'Minimum temperature must be less than maximum temperature' });
        return;
      }

      // Validate humidity parameters if provided
      if (validatedData.parameters.minHumidity !== undefined && 
          validatedData.parameters.maxHumidity !== undefined &&
          validatedData.parameters.minHumidity >= validatedData.parameters.maxHumidity) {
        res.status(400).json({ error: 'Minimum humidity must be less than maximum humidity' });
        return;
      }

      // Create validation
      const validation = await validationService.createValidation(
        validatedData.suitcaseId,
        validatedData.clientId,
        req.user!.id,
        validatedData.name,
        validatedData.description,
        stripUndefined(validatedData.parameters) as any,
        validatedData.sensorDataIds
      );

      // Get full validation data for response
      const fullValidation = await prisma.validation.findUnique({
        where: { id: validation.id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          suitcase: {
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

      res.status(201).json({ success: true, data: { validation: fullValidation } });
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.issues });
        return;
      }

      logger.error('Create validation error:', { error: error instanceof Error ? error.message : error, userId: req.user?.id });
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }

  async updateApproval(req: AuthenticatedRequest, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
      const { isApproved } = updateApprovalSchema.parse(req.body);

      const validation = await validationService.updateValidationApproval(
        id,
        isApproved,
        req.user!.id
      );

      res.json({ success: true, data: { validation } });
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.issues });
        return;
      }

      logger.error('Update validation approval error:', { 
        error: error instanceof Error ? error.message : error, 
        validationId: req.params.id, 
        userId: req.user?.id 
      });
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }

  async deleteValidation(req: AuthenticatedRequest, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      // Check if validation exists
      const existingValidation = await prisma.validation.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              reports: true,
            },
          },
        },
      });

      if (!existingValidation) {
        res.status(404).json({ error: 'Validation not found' });
        return;
      }

      // Check if validation has associated reports
      if (existingValidation._count.reports > 0) {
        res.status(400).json({ error: 'Cannot delete validation with associated reports', details: { reports: existingValidation._count.reports } });
        return;
      }

      // Remove validation association from sensor data
      await prisma.sensorData.updateMany({
        where: { validationId: id },
        data: { validationId: null },
      });

      // Delete validation
      await prisma.validation.delete({
        where: { id },
      });

      logger.info('Validation deleted:', { validationId: id, name: existingValidation.name, userId: req.user?.id });

      res.json({ success: true, message: 'Validation deleted successfully' });
      return;
    } catch (error) {
      logger.error('Delete validation error:', { 
        error: error instanceof Error ? error.message : error, 
        validationId: req.params.id, 
        userId: req.user?.id 
      });
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }
}