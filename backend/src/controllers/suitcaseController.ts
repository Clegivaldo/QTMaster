import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';
import { requireParam, stripUndefined } from '../utils/requestUtils.js';

// Validation schemas
const createSuitcaseSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  description: z.string().optional().or(z.literal('')),
  sensors: z.array(z.object({
    sensorId: z.string().min(1, 'ID do sensor é obrigatório'),
    position: z.number().optional(),
  })).optional().default([]),
});

const updateSuitcaseSchema = createSuitcaseSchema.partial();

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export class SuitcaseController {
  async getSuitcases(req: Request, res: Response) {
    try {
      const { page, limit, search, sortBy, sortOrder } = querySchema.parse(req.query);
      
      const skip = (page - 1) * limit;
      
      // Build where clause for search
      const where = search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {};

      // Get suitcases with pagination
      const [suitcases, total] = await Promise.all([
        prisma.suitcase.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
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
              orderBy: { position: 'asc' },
            },
            _count: {
              select: {
                validations: true,
              },
            },
          },
        }),
        prisma.suitcase.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          suitcases,
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

      logger.error('Get suitcases error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async getSuitcase(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      const suitcase = await prisma.suitcase.findUnique({
        where: { id },
        include: {
          sensors: {
            include: {
              sensor: {
                include: {
                  type: {
                    select: {
                      id: true,
                      name: true,
                      dataConfig: true,
                    },
                  },
                  _count: {
                    select: {
                      sensorData: true,
                    },
                  },
                },
              },
            },
            orderBy: { position: 'asc' },
          },
          validations: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              isApproved: true,
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
              validations: true,
            },
          },
        },
      });

      if (!suitcase) {
        res.status(404).json({ error: 'Maleta não encontrada' });
        return;
      }

      res.json({ success: true, data: { suitcase } });
      return;
    } catch (error) {
      logger.error('Get suitcase error:', { error: error instanceof Error ? error.message : error, suitcaseId: req.params.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async createSuitcase(req: AuthenticatedRequest, res: Response) {
    try {
      const validatedData = createSuitcaseSchema.parse(req.body);

      // Convert empty description to null
      const suitcaseData = {
        name: validatedData.name,
        description: validatedData.description || null,
      };

      // Check if name already exists
      const existingSuitcase = await prisma.suitcase.findFirst({
        where: { name: suitcaseData.name },
      });

      if (existingSuitcase) {
        res.status(400).json({ error: 'Nome da maleta já está em uso' });
        return;
      }

      // Validate sensors exist and are not duplicated
      if (validatedData.sensors && validatedData.sensors.length > 0) {
        const sensorIds = validatedData.sensors.map(s => s.sensorId);
        const uniqueSensorIds = [...new Set(sensorIds)];
        
        if (sensorIds.length !== uniqueSensorIds.length) {
          res.status(400).json({ error: 'Sensores duplicados não são permitidos na mesma maleta' });
          return;
        }

        // Check if all sensors exist
        const existingSensors = await prisma.sensor.findMany({
          where: { id: { in: uniqueSensorIds } },
          select: { id: true },
        });

        if (existingSensors.length !== uniqueSensorIds.length) {
          res.status(400).json({ error: 'Um ou mais sensores não foram encontrados' });
          return;
        }
      }

      // Create suitcase with sensors in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const suitcase = await tx.suitcase.create({
          data: suitcaseData,
        });

        // Add sensors if provided
        if (validatedData.sensors && validatedData.sensors.length > 0) {
          await tx.suitcaseSensor.createMany({
            data: validatedData.sensors.map((sensor, index) => ({
              suitcaseId: suitcase.id,
              sensorId: sensor.sensorId,
              position: sensor.position ?? index + 1,
            })),
          });
        }

        return tx.suitcase.findUnique({
          where: { id: suitcase.id },
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
              orderBy: { position: 'asc' },
            },
          },
        });
      });

      logger.info('Suitcase created:', { suitcaseId: result?.id, name: result?.name, sensorsCount: validatedData.sensors?.length || 0, userId: req.user?.id });

      res.status(201).json({ success: true, data: { suitcase: result } });
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.issues });
        return;
      }

      logger.error('Create suitcase error:', { error: error instanceof Error ? error.message : error, userId: req.user?.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async updateSuitcase(req: AuthenticatedRequest, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
      const validatedData = updateSuitcaseSchema.parse(req.body);

      // Check if suitcase exists
      const existingSuitcase = await prisma.suitcase.findUnique({
        where: { id },
      });

      if (!existingSuitcase) {
        res.status(404).json({ error: 'Maleta não encontrada' });
        return;
      }

      // Check if name already exists (if provided and different from current)
      if (validatedData.name && validatedData.name !== existingSuitcase.name) {
        const nameExists = await prisma.suitcase.findFirst({
          where: { 
            name: validatedData.name,
            id: { not: id },
          },
        });

        if (nameExists) {
          res.status(400).json({ error: 'Nome da maleta já está em uso' });
          return;
        }
      }

      // Validate sensors if provided
      if (validatedData.sensors) {
        const sensorIds = validatedData.sensors.map(s => s.sensorId);
        const uniqueSensorIds = [...new Set(sensorIds)];
        
        if (sensorIds.length !== uniqueSensorIds.length) {
          res.status(400).json({ error: 'Sensores duplicados não são permitidos na mesma maleta' });
          return;
        }

        // Check if all sensors exist
        if (uniqueSensorIds.length > 0) {
          const existingSensors = await prisma.sensor.findMany({
            where: { id: { in: uniqueSensorIds } },
            select: { id: true },
          });

            if (existingSensors.length !== uniqueSensorIds.length) {
            res.status(400).json({ error: 'Um ou mais sensores não foram encontrados' });
            return;
          }
        }
      }

      // Update suitcase with sensors in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update basic suitcase data
        const suitcaseData: any = stripUndefined({
          name: validatedData.name,
          description: validatedData.description !== undefined ? (validatedData.description || null) : undefined,
        });

        const suitcase = await tx.suitcase.update({
          where: { id },
          data: suitcaseData,
        });

        // Update sensors if provided
        if (validatedData.sensors !== undefined) {
          // Remove existing sensor associations
          await tx.suitcaseSensor.deleteMany({
            where: { suitcaseId: id },
          });

          // Add new sensor associations
          if (validatedData.sensors.length > 0) {
            await tx.suitcaseSensor.createMany({
              data: validatedData.sensors.map((sensor, index) => ({
                suitcaseId: id,
                sensorId: sensor.sensorId,
                position: sensor.position ?? index + 1,
              })),
            });
          }
        }

        return tx.suitcase.findUnique({
          where: { id },
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
              orderBy: { position: 'asc' },
            },
          },
        });
      });

      logger.info('Suitcase updated:', { suitcaseId: result?.id, name: result?.name, sensorsCount: validatedData.sensors?.length, userId: req.user?.id });

      res.json({ success: true, data: { suitcase: result } });
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.issues });
        return;
      }

      logger.error('Update suitcase error:', { error: error instanceof Error ? error.message : error, suitcaseId: req.params.id, userId: req.user?.id });
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }

  async deleteSuitcase(req: AuthenticatedRequest, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      // Check if suitcase exists
      const existingSuitcase = await prisma.suitcase.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              validations: true,
            },
          },
        },
      });

      if (!existingSuitcase) {
        res.status(404).json({ error: 'Maleta não encontrada' });
        return;
      }

      // Check if suitcase has associated validations
      if (existingSuitcase._count.validations > 0) {
        res.status(400).json({ error: 'Não é possível excluir maleta com validações associadas', details: { validations: existingSuitcase._count.validations } });
        return;
      }

      // Delete suitcase and associated sensors in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete sensor associations first
        await tx.suitcaseSensor.deleteMany({
          where: { suitcaseId: id },
        });

        // Delete suitcase
        await tx.suitcase.delete({
          where: { id },
        });
      });

      logger.info('Suitcase deleted:', { suitcaseId: id, name: existingSuitcase.name, userId: req.user?.id });

      res.json({ success: true, message: 'Maleta excluída com sucesso' });
      return;
    } catch (error) {
      logger.error('Delete suitcase error:', { error: error instanceof Error ? error.message : error, suitcaseId: req.params.id, userId: req.user?.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
}