import { Request, Response } from 'express';
import { z } from 'zod';
import { ValidationCycleType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { validationService } from '../services/validationService.js';
import type { ParameterRange } from '../services/validationService.js';
import { AuthenticatedRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';
import { requireParam, stripUndefined } from '../utils/requestUtils.js';

// Validation schemas
const dateTimeString = (fieldName: string) => z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), `${fieldName} precisa ser uma data válida em ISO`)
  .transform((val) => new Date(val));

const optionalDateTime = (fieldName: string) => z
  .string()
  .optional()
  .refine((val) => (val ? !Number.isNaN(Date.parse(val)) : true), `${fieldName} precisa ser uma data válida`) 
  .transform((val) => (val ? new Date(val) : undefined));

const cycleSchema = z.object({
  name: z.string().min(1, 'Nome do ciclo é obrigatório'),
  cycleType: z
    .nativeEnum(ValidationCycleType)
    .optional()
    .default(ValidationCycleType.NORMAL),
  startAt: dateTimeString('Data/hora de início'),
  endAt: dateTimeString('Data/hora de fim'),
  notes: z.string().optional(),
});

const importedItemSchema = z.object({
  timestamp: dateTimeString('Timestamp'),
  temperature: z.number(),
  humidity: z.number().optional(),
  cycleName: z.string().optional(),
  note: z.string().optional(),
  fileName: z.string().optional(),
  rowNumber: z.number().int().optional(),
  isVisible: z.boolean().optional(),
});

const createValidationSchema = z.object({
  suitcaseId: z.string().optional(),
  clientId: z.string().min(1, 'Client ID is required'),
  validationNumber: z.string().min(1, 'Número da validação é obrigatório'),
  equipmentId: z.string().min(1, 'Equipamento é obrigatório'),
  equipmentSerial: z.string().optional(),
  equipmentTag: z.string().optional(),
  equipmentPatrimony: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().optional().or(z.literal('')),
  parameters: z.object({
    minTemperature: z.number(),
    maxTemperature: z.number(),
    minHumidity: z.number().optional(),
    maxHumidity: z.number().optional(),
  }),
  sensorDataIds: z.array(z.string()).optional(),
  cycles: z.array(cycleSchema).optional(),
  importedItems: z.array(importedItemSchema).optional(),
  startAt: optionalDateTime('Data/hora de início'),
  endAt: optionalDateTime('Data/hora de finalização'),
});

const updateApprovalSchema = z.object({
  isApproved: z.boolean(),
});

const updateHiddenSensorsSchema = z.object({
  hiddenSensorIds: z.array(z.string()),
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
          equipment: {
            include: {
              brand: true,
              model: true,
              equipmentType: true,
            },
          },
          cycles: {
            include: {
              importedItems: true,
            },
            orderBy: { startAt: 'asc' },
          },
          importedItems: true,
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

      // Obter sensores selecionados do query parameter
      const selectedSensorIds = req.query.selectedSensorIds 
        ? (req.query.selectedSensorIds as string).split(',')
        : undefined;

      const validation = await prisma.validation.findUnique({
        where: { id },
        select: {
          minTemperature: true,
          maxTemperature: true,
          minHumidity: true,
          maxHumidity: true,
          hiddenSensorIds: true,
        },
      });

      if (!validation) {
        res.status(404).json({ error: 'Validation not found' });
        return;
      }

      const parameters: ParameterRange = {
        minTemperature: validation.minTemperature,
        maxTemperature: validation.maxTemperature,
        ...(validation.minHumidity !== null && { minHumidity: validation.minHumidity }),
        ...(validation.maxHumidity !== null && { maxHumidity: validation.maxHumidity }),
      };

      // Get sensor data IDs for this validation
      const sensorData = await prisma.sensorData.findMany({
        where: { validationId: id },
        select: { id: true },
      });
      
      const sensorDataIds = sensorData.map(sd => sd.id);
      const chartData = await validationService.getChartData(
        sensorDataIds, 
        parameters as any, 
        selectedSensorIds,
        validation.hiddenSensorIds
      );

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

      // It's valid to create a validation without sensor data/imported items.
      // Sensor data and suitcase associations will be added later during import.

      // Validate temperature parameters
      if (validatedData.parameters.minTemperature >= validatedData.parameters.maxTemperature) {
        res.status(400).json({ error: 'Minimum temperature must be less than maximum temperature' });
        return;
      }

      // Validate humidity parameters if provided
      if (
        validatedData.parameters.minHumidity !== undefined &&
        validatedData.parameters.maxHumidity !== undefined &&
        validatedData.parameters.minHumidity >= validatedData.parameters.maxHumidity
      ) {
        res.status(400).json({ error: 'Minimum humidity must be less than maximum humidity' });
        return;
      }

      const validation = await validationService.createValidation({
        suitcaseId: validatedData.suitcaseId,
        clientId: validatedData.clientId,
        userId: req.user!.id,
        name: validatedData.name,
        description: validatedData.description || null,
        validationNumber: validatedData.validationNumber,
        equipmentId: validatedData.equipmentId,
        equipmentSerial: validatedData.equipmentSerial,
        equipmentTag: validatedData.equipmentTag,
        equipmentPatrimony: validatedData.equipmentPatrimony,
        startAt: validatedData.startAt,
        endAt: validatedData.endAt,
        parameters: stripUndefined(validatedData.parameters) as any,
        sensorDataIds: validatedData.sensorDataIds,
        cycles: validatedData.cycles,
        importedItems: validatedData.importedItems,
      } as any);

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
          equipment: {
            include: {
              brand: true,
              model: true,
              equipmentType: true,
            },
          },
          cycles: {
            include: {
              importedItems: true,
            },
            orderBy: { startAt: 'asc' },
          },
          importedItems: true,
          _count: {
            select: {
              sensorData: true,
              reports: true,
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

  async toggleImportedItemVisibility(req: AuthenticatedRequest, res: Response) {
    try {
      const validationId = requireParam(req, res, 'validationId');
      if (!validationId) return;
      const itemId = requireParam(req, res, 'itemId');
      if (!itemId) return;

      const { isVisible } = z.object({ isVisible: z.boolean() }).parse(req.body);

      const item = await validationService.toggleImportItemVisibility(validationId, itemId, isVisible);

      res.json({ success: true, data: { item } });
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.issues });
        return;
      }

      logger.error('Toggle import visibility error:', {
        error: error instanceof Error ? error.message : error,
        validationId: req.params.validationId,
        itemId: req.params.itemId,
        userId: req.user?.id,
      });
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }

  async updateHiddenSensors(req: AuthenticatedRequest, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
      
      const { hiddenSensorIds } = updateHiddenSensorsSchema.parse(req.body);

      const validation = await prisma.validation.update({
        where: { id },
        data: { hiddenSensorIds },
      });

      res.json({ success: true, data: { validation } });
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.issues });
        return;
      }

      logger.error('Update hidden sensors error:', { 
        error: error instanceof Error ? error.message : error, 
        validationId: req.params.id, 
        userId: req.user?.id 
      });
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }

  async getAcceptanceWindows(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      const validation = await prisma.validation.findUnique({
        where: { id },
        include: {
          cycles: {
            include: {
              importedItems: {
                orderBy: { timestamp: 'asc' }
              }
            }
          },
          importedItems: {
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      if (!validation) {
        res.status(404).json({ error: 'Validation not found' });
        return;
      }

      const parameters: ParameterRange = {
        minTemperature: validation.minTemperature,
        maxTemperature: validation.maxTemperature,
      };
      
      // Add humidity parameters only if they exist
      if (validation.minHumidity !== null && validation.minHumidity !== undefined) {
        parameters.minHumidity = validation.minHumidity;
      }
      if (validation.maxHumidity !== null && validation.maxHumidity !== undefined) {
        parameters.maxHumidity = validation.maxHumidity;
      }

      // Calcular janelas para cada ciclo
      const cycleWindows = validation.cycles.map(cycle => {
        const windows = validationService.calculateAcceptanceWindows(
          cycle.importedItems,
          parameters
        );

        return {
          cycleId: cycle.id,
          cycleName: cycle.name,
          cycleType: cycle.cycleType,
          windows: windows.map(window => ({
            start: window.start.toISOString(),
            end: window.end.toISOString(),
            duration: window.duration,
            durationFormatted: validationService.formatDuration(window.duration)
          })),
          totalAcceptanceTime: windows.reduce((sum, window) => sum + window.duration, 0),
          totalAcceptanceTimeFormatted: validationService.formatDuration(
            windows.reduce((sum, window) => sum + window.duration, 0)
          )
        };
      });

      // Calcular janelas para todos os dados (sem filtro de ciclo)
      const allWindows = validationService.calculateAcceptanceWindows(
        validation.importedItems,
        parameters
      );

      res.json({
        success: true,
        data: {
          cycles: cycleWindows,
          overall: {
            windows: allWindows.map(window => ({
              start: window.start.toISOString(),
              end: window.end.toISOString(),
              duration: window.duration,
              durationFormatted: validationService.formatDuration(window.duration)
            })),
            totalAcceptanceTime: allWindows.reduce((sum, window) => sum + window.duration, 0),
            totalAcceptanceTimeFormatted: validationService.formatDuration(
              allWindows.reduce((sum, window) => sum + window.duration, 0)
            )
          }
        }
      });
    } catch (error) {
      logger.error('Get acceptance windows error:', { 
        error: error instanceof Error ? error.message : error, 
        validationId: req.params.id 
      });
      res.status(500).json({
        error: 'Internal server error',
      });
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