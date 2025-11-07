import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';
import { requireParam, stripUndefined } from '../utils/requestUtils.js';

// Validation schemas
const createSensorSchema = z.object({
  serialNumber: z.string().min(1, 'Número de série é obrigatório').max(255, 'Número de série muito longo'),
  model: z.string().min(1, 'Modelo é obrigatório').max(255, 'Modelo muito longo'),
  typeId: z.string().min(1, 'Tipo de sensor é obrigatório'),
  calibrationDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

const updateSensorSchema = createSensorSchema.partial();

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  typeId: z.string().optional(),
  sortBy: z.enum(['serialNumber', 'model', 'createdAt']).optional().default('serialNumber'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export class SensorController {
  async getSensors(req: Request, res: Response) {
    try {
      const { page, limit, search, typeId, sortBy, sortOrder } = querySchema.parse(req.query);
      
      const skip = (page - 1) * limit;
      
      // Build where clause for search and filters
      const where: any = {};
      
      if (search) {
        where.OR = [
          { serialNumber: { contains: search, mode: 'insensitive' as const } },
          { model: { contains: search, mode: 'insensitive' as const } },
        ];
      }
      
      if (typeId) {
        where.typeId = typeId;
      }

      // Get sensors with pagination
      const [sensors, total] = await Promise.all([
        prisma.sensor.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            type: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                sensorData: true,
                suitcaseSensors: true,
              },
            },
          },
        }),
        prisma.sensor.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          sensors,
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
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      logger.error('Get sensors error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }

  async getSensor(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      const sensor = await prisma.sensor.findUnique({
        where: { id },
        include: {
          type: true,
          suitcaseSensors: {
            include: {
              suitcase: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          sensorData: {
            take: 10,
            orderBy: { timestamp: 'desc' },
            select: {
              id: true,
              timestamp: true,
              temperature: true,
              humidity: true,
              fileName: true,
            },
          },
          _count: {
            select: {
              sensorData: true,
              suitcaseSensors: true,
            },
          },
        },
      });

        if (!sensor) {
          res.status(404).json({
            error: 'Sensor não encontrado',
          });
          return;
      }

      res.json({
        success: true,
        data: { sensor },
      });
    } catch (error) {
      logger.error('Get sensor error:', { error: error instanceof Error ? error.message : error, sensorId: req.params.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async createSensor(req: AuthenticatedRequest, res: Response) {
    try {
      const validatedData = createSensorSchema.parse(req.body);

      // Check if serial number already exists
      const existingSensor = await prisma.sensor.findUnique({
        where: { serialNumber: validatedData.serialNumber },
      });

       if (existingSensor) {
         res.status(400).json({
           error: 'Número de série já está em uso',
         });
         return;
      }

      // Check if sensor type exists
      const sensorType = await prisma.sensorType.findUnique({
        where: { id: validatedData.typeId },
      });

      if (!sensorType) {
        res.status(400).json({ error: 'Tipo de sensor não encontrado' });
        return;
      }

      // Normalize payload for Prisma: remove undefineds and convert explicit empty calibrationDate to null
      const dataToCreate = { ...stripUndefined(validatedData) as any };
      if (Object.prototype.hasOwnProperty.call(validatedData, 'calibrationDate')) {
        dataToCreate.calibrationDate = validatedData.calibrationDate ?? null;
      }

      const sensor = await prisma.sensor.create({
        data: dataToCreate,
        include: {
          type: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info('Sensor created:', { sensorId: sensor.id, serialNumber: sensor.serialNumber, userId: req.user?.id });

      res.status(201).json({ success: true, data: { sensor } });
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      logger.error('Create sensor error:', { error: error instanceof Error ? error.message : error, userId: req.user?.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async updateSensor(req: AuthenticatedRequest, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
      const validatedData = updateSensorSchema.parse(req.body);

      // Check if sensor exists
      const existingSensor = await prisma.sensor.findUnique({
        where: { id },
      });

      if (!existingSensor) {
        res.status(404).json({ error: 'Sensor não encontrado' });
        return;
      }

      // Check if serial number already exists (if provided and different from current)
      if (validatedData.serialNumber && validatedData.serialNumber !== existingSensor.serialNumber) {
        const serialExists = await prisma.sensor.findFirst({
          where: { 
            serialNumber: validatedData.serialNumber,
            id: { not: id },
          },
        });

          if (serialExists) {
            res.status(400).json({ error: 'Número de série já está em uso' });
            return;
          }
      }

      // Check if sensor type exists (if provided)
      if (validatedData.typeId) {
        const sensorType = await prisma.sensorType.findUnique({
          where: { id: validatedData.typeId },
        });

          if (!sensorType) {
            res.status(400).json({ error: 'Tipo de sensor não encontrado' });
            return;
          }
      }

      const dataToUpdate = { ...stripUndefined(validatedData) as any };

      // Normalize calibrationDate to null if explicitly empty
      if (Object.prototype.hasOwnProperty.call(validatedData, 'calibrationDate')) {
        dataToUpdate.calibrationDate = validatedData.calibrationDate ?? null;
      }

      const sensor = await prisma.sensor.update({
        where: { id },
        data: dataToUpdate,
        include: {
          type: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info('Sensor updated:', { sensorId: sensor.id, serialNumber: sensor.serialNumber, userId: req.user?.id });

      res.json({ success: true, data: { sensor } });
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      logger.error('Update sensor error:', { error: error instanceof Error ? error.message : error, sensorId: req.params.id, userId: req.user?.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async deleteSensor(req: AuthenticatedRequest, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      // Check if sensor exists
      const existingSensor = await prisma.sensor.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              sensorData: true,
              suitcaseSensors: true,
            },
          },
        },
      });

      if (!existingSensor) {
        res.status(404).json({ error: 'Sensor não encontrado' });
        return;
      }

      // Check if sensor has associated data or is in suitcases
      if (existingSensor._count.sensorData > 0 || existingSensor._count.suitcaseSensors > 0) {
        res.status(400).json({ error: 'Não é possível excluir sensor com dados ou maletas associadas', details: { sensorData: existingSensor._count.sensorData, suitcases: existingSensor._count.suitcaseSensors } });
        return;
      }

      await prisma.sensor.delete({
        where: { id },
      });

      logger.info('Sensor deleted:', { sensorId: id, serialNumber: existingSensor.serialNumber, userId: req.user?.id });

      res.json({ success: true, message: 'Sensor excluído com sucesso' });
      return;
    } catch (error) {
      logger.error('Delete sensor error:', { error: error instanceof Error ? error.message : error, sensorId: req.params.id, userId: req.user?.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
}