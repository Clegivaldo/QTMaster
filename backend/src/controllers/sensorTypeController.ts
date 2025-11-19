import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireParam, stripUndefined } from '../utils/requestUtils.js';
import { AuthenticatedRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';

// Validation schemas
const createSensorTypeSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  description: z.string().optional().or(z.literal('')),
  dataConfig: z.object({
    temperatureColumn: z.string().min(1, 'Coluna de temperatura é obrigatória'),
    humidityColumn: z.string().optional().or(z.literal('')),
    timestampColumn: z.string().min(1, 'Coluna de timestamp é obrigatória'),
    startRow: z.number().min(1, 'Linha inicial deve ser maior que 0'),
    dateFormat: z.string().min(1, 'Formato de data é obrigatório'),
    hasHeader: z.boolean().optional().default(true),
    separator: z.string().optional().default(','),
  }),
});

const updateSensorTypeSchema = createSensorTypeSchema.partial();

export class SensorTypeController {
  async getSensorTypes(req: Request, res: Response): Promise<void> {
    try {
      const sensorTypes = await prisma.sensorType.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              sensors: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: { sensorTypes },
      });
    } catch (error) {
      logger.error('Get sensor types error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        error: 'Internal server error',
      });
      return;
    }
  }

  async getSensorType(req: Request, res: Response): Promise<void> {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      const sensorType = await prisma.sensorType.findUnique({
        where: { id },
        include: {
          sensors: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              serialNumber: true,
              model: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              sensors: true,
            },
          },
        },
      });

      if (!sensorType) {
        res.status(404).json({ error: 'Tipo de sensor não encontrado' });
        return;
      }

      res.json({
        success: true,
        data: { sensorType },
      });
      return;
    } catch (error) {
      logger.error('Get sensor type error:', { error: error instanceof Error ? error.message : error, sensorTypeId: req.params.id });
      res.status(500).json({
        error: 'Internal server error',
      });
      return;
    }
  }

  async createSensorType(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = createSensorTypeSchema.parse(req.body);

      // Convert empty description to null
      const sensorTypeData = {
        ...validatedData,
        description: validatedData.description || null,
      };

      // Check if name already exists
      const existingSensorType = await prisma.sensorType.findFirst({
        where: { name: sensorTypeData.name },
      });

      if (existingSensorType) {
        res.status(400).json({ error: 'Nome do tipo de sensor já está em uso' });
        return;
      }

      const sensorType = await prisma.sensorType.create({
        data: sensorTypeData as any,
      });

      logger.info('Sensor type created:', { sensorTypeId: sensorType.id, name: sensorType.name, userId: req.user?.id });

      res.status(201).json({ success: true, data: { sensorType } });
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.issues });
        return;
      }

      logger.error('Create sensor type error:', { error: error instanceof Error ? error.message : error, userId: req.user?.id });
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }

  async updateSensorType(req: Request, res: Response): Promise<void> {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
  const validatedData = updateSensorTypeSchema.parse(req.body);

      // Check if sensor type exists
      const existingSensorType = await prisma.sensorType.findUnique({
        where: { id },
      });

      if (!existingSensorType) {
        res.status(404).json({ error: 'Tipo de sensor não encontrado' });
        return;
      }

      // Check if name already exists (if provided and different from current)
      if (validatedData.name && validatedData.name !== existingSensorType.name) {
        const nameExists = await prisma.sensorType.findFirst({
          where: { 
            name: validatedData.name,
            id: { not: id ?? '' },
          },
        });

        if (nameExists) {
          res.status(400).json({ error: 'Nome do tipo de sensor já está em uso' });
          return;
        }
      }

      // Build update data with only defined properties
      const updateData: Record<string, any> = {};
      if (validatedData.name !== undefined) {
        updateData.name = validatedData.name;
      }
      if (validatedData.description !== undefined) {
        updateData.description = validatedData.description === '' ? null : validatedData.description;
      }
      if (validatedData.dataConfig !== undefined) {
        updateData.dataConfig = validatedData.dataConfig;
      }

      const sensorType = await prisma.sensorType.update({
        where: { id },
        data: updateData,
      });

      logger.info('Sensor type updated:', { sensorTypeId: sensorType.id, name: sensorType.name, userId: req.user?.id });

      res.json({ success: true, data: { sensorType } });
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.issues });
        return;
      }

      logger.error('Update sensor type error:', { error: error instanceof Error ? error.message : error, sensorTypeId: req.params.id, userId: req.user?.id, stack: error instanceof Error ? error.stack : undefined });
      // In development return error message to aid debugging
      const devMessage = process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : 'Internal server error';
      res.status(500).json({ error: devMessage });
      return;
    }
  }

  async deleteSensorType(req: Request, res: Response): Promise<void> {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      // Check if sensor type exists
      const existingSensorType = await prisma.sensorType.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              sensors: true,
            },
          },
        },
      });

      if (!existingSensorType) {
        res.status(404).json({ error: 'Tipo de sensor não encontrado' });
        return;
      }

      // Check if sensor type has associated sensors
      if (existingSensorType._count.sensors > 0) {
        res.status(400).json({ error: 'Não é possível excluir tipo de sensor com sensores associados', details: { sensors: existingSensorType._count.sensors } });
        return;
      }

      await prisma.sensorType.delete({
        where: { id },
      });

      logger.info('Sensor type deleted:', { sensorTypeId: id, name: existingSensorType.name, userId: req.user?.id });

      res.json({ success: true, message: 'Tipo de sensor excluído com sucesso' });
      return;
    } catch (error) {
      logger.error('Delete sensor type error:', { error: error instanceof Error ? error.message : error, sensorTypeId: req.params.id, userId: req.user?.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
}