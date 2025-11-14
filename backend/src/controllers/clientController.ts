import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';
import { requireParam, stripUndefined } from '../utils/requestUtils.js';
import { redisService, CACHE_KEYS, CACHE_TTL } from '../services/redisService.js';

// Validation schemas
const createClientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  street: z.string().optional().or(z.literal('')),
  neighborhood: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  complement: z.string().optional().or(z.literal('')),
  cnpj: z.string().optional().or(z.literal('')),
});

const updateClientSchema = createClientSchema.partial();

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'email', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export class ClientController {
  async getClients(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, sortBy, sortOrder } = querySchema.parse(req.query);
      
      const skip = (page - 1) * limit;
      
      // Build where clause for search
      const where = search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { cnpj: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {};

      // Get clients with pagination
      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            _count: {
              select: {
                reports: true,
                validations: true,
              },
            },
          },
        }),
        prisma.client.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          clients,
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
          details: error.issues,
        });
        return;
      }

      logger.error('Get clients error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async getClient(req: Request, res: Response): Promise<void> {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      const client = await prisma.client.findUnique({
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
            },
          },
          validations: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              isApproved: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              reports: true,
              validations: true,
            },
          },
        },
      });

      if (!client) {
        res.status(404).json({
          error: 'Cliente não encontrado',
        });
        return;
      }

      res.json({
        success: true,
        data: { client },
      });
    } catch (error) {
      logger.error('Get client error:', { error: error instanceof Error ? error.message : error, clientId: req.params.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async createClient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = createClientSchema.parse(req.body);

      // Convert empty strings to null
      const clientData = {
        ...validatedData,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        address: validatedData.address || null,
        street: validatedData.street || null,
        neighborhood: validatedData.neighborhood || null,
        city: validatedData.city || null,
        state: validatedData.state || null,
        complement: validatedData.complement || null,
        cnpj: validatedData.cnpj || null,
      };

      // Check if email already exists (if provided)
      if (clientData.email) {
        const existingClient = await prisma.client.findFirst({
          where: { email: clientData.email },
        });

        if (existingClient) {
          res.status(400).json({
            error: 'Email já está em uso por outro cliente',
          });
          return;
        }
      }

      // Check if CNPJ already exists (if provided)
      if (clientData.cnpj) {
        const existingByCnpj = await prisma.client.findFirst({
          where: { cnpj: clientData.cnpj },
        });

        if (existingByCnpj) {
          res.status(400).json({
            error: 'CNPJ já está em uso por outro cliente',
          });
          return;
        }
      }

      const client = await prisma.client.create({
        data: clientData,
      });

      logger.info('Client created:', { clientId: client.id, name: client.name, userId: req.user?.id });

      res.status(201).json({
        success: true,
        data: { client },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.issues,
        });
        return;
      }
      // Prisma unique constraint error handling
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Determine which field caused the unique constraint
        const target = (error.meta && (error.meta as any).target) || [];
        const field = Array.isArray(target) ? target.join(', ') : String(target);
        res.status(400).json({ error: `${field || 'Campo'} já está em uso` });
        return;
      }

      logger.error('Create client error:', { error: error instanceof Error ? error.message : error, userId: req.user?.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async updateClient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
      const validatedData = updateClientSchema.parse(req.body);

      // Check if client exists
      const existingClient = await prisma.client.findUnique({
        where: { id },
      });

      if (!existingClient) {
        res.status(404).json({
          error: 'Cliente não encontrado',
        });
        return;
      }

      // Convert empty strings to null and filter undefined values
      const clientData: any = {};
      if (validatedData.name !== undefined) {
        clientData.name = validatedData.name;
      }
      if (validatedData.email !== undefined) {
        clientData.email = validatedData.email === '' ? null : validatedData.email;
      }
      if (validatedData.phone !== undefined) {
        clientData.phone = validatedData.phone === '' ? null : validatedData.phone;
      }
      if (validatedData.address !== undefined) {
        clientData.address = validatedData.address === '' ? null : validatedData.address;
      }
      if (validatedData.street !== undefined) {
        clientData.street = validatedData.street === '' ? null : validatedData.street;
      }
      if (validatedData.neighborhood !== undefined) {
        clientData.neighborhood = validatedData.neighborhood === '' ? null : validatedData.neighborhood;
      }
      if (validatedData.city !== undefined) {
        clientData.city = validatedData.city === '' ? null : validatedData.city;
      }
      if (validatedData.state !== undefined) {
        clientData.state = validatedData.state === '' ? null : validatedData.state;
      }
      if (validatedData.complement !== undefined) {
        clientData.complement = validatedData.complement === '' ? null : validatedData.complement;
      }
      if (validatedData.cnpj !== undefined) {
        clientData.cnpj = validatedData.cnpj === '' ? null : validatedData.cnpj;
      }

      // Check if email already exists (if provided and different from current)
      if (clientData.email && clientData.email !== existingClient.email) {
        const emailExists = await prisma.client.findFirst({
          where: { 
            email: clientData.email,
            id: { not: id },
          },
        });

        if (emailExists) {
          res.status(400).json({
            error: 'Email já está em uso por outro cliente',
          });
          return;
        }
      }

      // Check if CNPJ already exists (if provided and different from current)
      if (clientData.cnpj && clientData.cnpj !== existingClient.cnpj) {
        const cnpjExists = await prisma.client.findFirst({
          where: {
            cnpj: clientData.cnpj,
            id: { not: id },
          },
        });

        if (cnpjExists) {
          res.status(400).json({
            error: 'CNPJ já está em uso por outro cliente',
          });
          return;
        }
      }

      const client = await prisma.client.update({
        where: { id },
        data: clientData,
      });

      logger.info('Client updated:', { clientId: client.id, name: client.name, userId: req.user?.id });

      res.json({
        success: true,
        data: { client },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.issues,
        });
        return;
      }
      // Prisma unique constraint error handling
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta && (error.meta as any).target) || [];
        const field = Array.isArray(target) ? target.join(', ') : String(target);
        res.status(400).json({ error: `${field || 'Campo'} já está em uso` });
        return;
      }

      logger.error('Update client error:', { error: error instanceof Error ? error.message : error, clientId: req.params.id, userId: req.user?.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async deleteClient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      // Check if client exists
      const existingClient = await prisma.client.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              reports: true,
              validations: true,
            },
          },
        },
      });

      if (!existingClient) {
        res.status(404).json({
          error: 'Cliente não encontrado',
        });
        return;
      }

      // Check if client has associated reports or validations
      if (existingClient._count.reports > 0 || existingClient._count.validations > 0) {
        res.status(400).json({
          error: 'Não é possível excluir cliente com relatórios ou validações associadas',
          details: {
            reports: existingClient._count.reports,
            validations: existingClient._count.validations,
          },
        });
        return;
      }

      await prisma.client.delete({
        where: { id },
      });

      logger.info('Client deleted:', { clientId: id, name: existingClient.name, userId: req.user?.id });

      res.json({
        success: true,
        message: 'Cliente excluído com sucesso',
      });
    } catch (error) {
      logger.error('Delete client error:', { error: error instanceof Error ? error.message : error, clientId: req.params.id, userId: req.user?.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
}