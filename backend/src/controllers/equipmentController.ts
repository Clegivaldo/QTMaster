import { Request, Response } from 'express';
import { z } from 'zod';
import { equipmentService } from '../services/equipmentService.js';
import { logger } from '../utils/logger.js';
import { requireParam } from '../utils/requestUtils.js';

const brandSchema = z.object({
  name: z.string().min(1, 'Nome da marca é obrigatório'),
  description: z.string().optional(),
});

const typeSchema = z.object({
  name: z.string().min(1, 'Nome do tipo é obrigatório'),
  description: z.string().optional(),
});

const modelSchema = z.object({
  name: z.string().min(1, 'Nome do modelo é obrigatório'),
  brandId: z.string().min(1, 'Marca é obrigatória'),
  typeId: z.string().min(1, 'Tipo é obrigatório'),
  description: z.string().optional(),
});

const clientEquipmentSchema = z.object({
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  equipmentTypeId: z.string().min(1, 'Tipo é obrigatório'),
  brandId: z.string().min(1, 'Marca é obrigatória'),
  modelId: z.string().min(1, 'Modelo é obrigatório'),
  name: z.string().optional(),
  serialNumber: z.string().min(1, 'Número de série é obrigatório'),
  assetNumber: z.string().optional(),
  tag: z.string().optional(),
  acceptanceMinTemp: z.number().optional(),
  acceptanceMaxTemp: z.number().optional(),
  acceptanceMinHum: z.number().optional(),
  acceptanceMaxHum: z.number().optional(),
  acceptanceNotes: z.string().optional(),
});

export class EquipmentController {
  async getBrands(req: Request, res: Response) {
    try {
      const brands = await equipmentService.getBrands();
      res.json({ success: true, data: { brands } });
    } catch (error) {
      logger.error('Error fetching brands', { error });
      res.status(500).json({ error: 'Erro ao carregar marcas' });
    }
  }

  async createBrand(req: Request, res: Response) {
    try {
      const payload = brandSchema.parse(req.body);
      const brand = await equipmentService.createBrand(payload);
      res.status(201).json({ success: true, data: { brand } });
    } catch (error) {
      logger.error('Create brand error', { error });
      res.status(500).json({ error: 'Erro ao criar marca' });
    }
  }

  async updateBrand(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
      const validatedPayload = brandSchema.partial().parse(req.body);
      const payload: { name?: string; description?: string | undefined } = {};
      if (validatedPayload.name !== undefined) payload.name = validatedPayload.name;
      if (validatedPayload.description !== undefined) payload.description = validatedPayload.description;
      const brand = await equipmentService.updateBrand(id, payload);
      res.json({ success: true, data: { brand } });
    } catch (error) {
      logger.error('Update brand error', { error });
      res.status(500).json({ error: 'Erro ao atualizar marca' });
    }
  }

  async deleteBrand(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
      await equipmentService.deleteBrand(id);
      res.json({ success: true });
    } catch (error) {
      logger.error('Delete brand error', { error });
      res.status(500).json({ error: 'Erro ao remover marca' });
    }
  }

  async getEquipmentTypes(req: Request, res: Response) {
    try {
      const types = await equipmentService.getEquipmentTypes();
      res.json({ success: true, data: { types } });
    } catch (error) {
      logger.error('Error fetching equipment types', { error });
      res.status(500).json({ error: 'Erro ao carregar tipos de equipamento' });
    }
  }

  async createEquipmentType(req: Request, res: Response) {
    try {
      const payload = typeSchema.parse(req.body);
      const equipmentType = await equipmentService.createEquipmentType(payload);
      res.status(201).json({ success: true, data: { equipmentType } });
    } catch (error) {
      logger.error('Create equipment type error', { error });
      res.status(500).json({ error: 'Erro ao criar tipo de equipamento' });
    }
  }

  async updateEquipmentType(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
      const validatedPayload = typeSchema.partial().parse(req.body);
      const payload: { name?: string; description?: string | undefined } = {};
      if (validatedPayload.name !== undefined) payload.name = validatedPayload.name;
      if (validatedPayload.description !== undefined) payload.description = validatedPayload.description;
      const equipmentType = await equipmentService.updateEquipmentType(id, payload);
      res.json({ success: true, data: { equipmentType } });
    } catch (error) {
      logger.error('Update equipment type error', { error });
      res.status(500).json({ error: 'Erro ao atualizar tipo de equipamento' });
    }
  }

  async deleteEquipmentType(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
      await equipmentService.deleteEquipmentType(id);
      res.json({ success: true });
    } catch (error) {
      logger.error('Delete equipment type error', { error });
      res.status(500).json({ error: 'Erro ao remover tipo de equipamento' });
    }
  }

  async getModels(req: Request, res: Response) {
    try {
      const { brandId, typeId } = req.query as { brandId?: string; typeId?: string };
      const filter: { brandId?: string; typeId?: string } = {};
      if (brandId) filter.brandId = brandId;
      if (typeId) filter.typeId = typeId;
      const models = await equipmentService.getModels(filter);
      res.json({ success: true, data: { models } });
    } catch (error) {
      logger.error('Error fetching models', { error });
      res.status(500).json({ error: 'Erro ao carregar modelos' });
    }
  }

  async createModel(req: Request, res: Response) {
    try {
      const payload = modelSchema.parse(req.body);
      const model = await equipmentService.createModel(payload);
      res.status(201).json({ success: true, data: { model } });
    } catch (error) {
      logger.error('Create model error', { error });
      res.status(500).json({ error: 'Erro ao criar modelo' });
    }
  }

  async updateModel(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
      const validatedPayload = modelSchema.partial().parse(req.body);
      const payload: {
        name?: string;
        description?: string | undefined;
        brandId?: string;
        typeId?: string;
      } = {};
      if (validatedPayload.name !== undefined) payload.name = validatedPayload.name;
      if (validatedPayload.description !== undefined) payload.description = validatedPayload.description;
      if (validatedPayload.brandId !== undefined) payload.brandId = validatedPayload.brandId;
      if (validatedPayload.typeId !== undefined) payload.typeId = validatedPayload.typeId;
      const model = await equipmentService.updateModel(id, payload);
      res.json({ success: true, data: { model } });
    } catch (error) {
      logger.error('Update model error', { error });
      res.status(500).json({ error: 'Erro ao atualizar modelo' });
    }
  }

  async deleteModel(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
      await equipmentService.deleteModel(id);
      res.json({ success: true });
    } catch (error) {
      logger.error('Delete model error', { error });
      res.status(500).json({ error: 'Erro ao remover modelo' });
    }
  }

  async getClientEquipmentById(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
      const equipment = await equipmentService.getClientEquipmentById(id);
      if (!equipment) {
        res.status(404).json({ error: 'Equipamento não encontrado' });
        return;
      }
      res.json({ success: true, data: { equipment } });
    } catch (error) {
      logger.error('Get client equipment error', { error });
      res.status(500).json({ error: 'Erro ao carregar equipamento' });
    }
  }

  async getClientEquipments(req: Request, res: Response) {
    try {
      const { clientId } = req.query as { clientId?: string };
      const equipment = await equipmentService.getClientEquipment(clientId);
      res.json({ success: true, data: { equipment } });
    } catch (error) {
      logger.error('Error fetching client equipment', { error });
      res.status(500).json({ error: 'Erro ao carregar equipamentos' });
    }
  }

  async createClientEquipment(req: Request, res: Response) {
    try {
      const payload = clientEquipmentSchema.parse(req.body);
      // Strip undefined values for Prisma compatibility
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([_, value]) => value !== undefined)
      );
      const equipment = await equipmentService.createClientEquipment(cleanPayload as any);
      res.status(201).json({ success: true, data: { equipment } });
    } catch (error) {
      logger.error('Create client equipment error', { error });
      res.status(500).json({ error: 'Erro ao cadastrar equipamento' });
    }
  }

  async updateClientEquipment(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
      const validatedPayload = clientEquipmentSchema.partial().parse(req.body);
      const payload: {
        equipmentTypeId?: string;
        brandId?: string;
        modelId?: string;
        name?: string;
        serialNumber?: string;
        assetNumber?: string | undefined;
        tag?: string | undefined;
        acceptanceMinTemp?: number | undefined;
        acceptanceMaxTemp?: number | undefined;
        acceptanceMinHum?: number | undefined;
        acceptanceMaxHum?: number | undefined;
        acceptanceNotes?: string | undefined;
      } = {};
      if (validatedPayload.equipmentTypeId !== undefined) payload.equipmentTypeId = validatedPayload.equipmentTypeId;
      if (validatedPayload.brandId !== undefined) payload.brandId = validatedPayload.brandId;
      if (validatedPayload.modelId !== undefined) payload.modelId = validatedPayload.modelId;
      if (validatedPayload.name !== undefined) payload.name = validatedPayload.name;
      if (validatedPayload.serialNumber !== undefined) payload.serialNumber = validatedPayload.serialNumber;
      if (validatedPayload.assetNumber !== undefined) payload.assetNumber = validatedPayload.assetNumber;
      if (validatedPayload.tag !== undefined) payload.tag = validatedPayload.tag;
      if (validatedPayload.acceptanceMinTemp !== undefined)
        payload.acceptanceMinTemp = validatedPayload.acceptanceMinTemp;
      if (validatedPayload.acceptanceMaxTemp !== undefined)
        payload.acceptanceMaxTemp = validatedPayload.acceptanceMaxTemp;
      if (validatedPayload.acceptanceMinHum !== undefined) payload.acceptanceMinHum = validatedPayload.acceptanceMinHum;
      if (validatedPayload.acceptanceMaxHum !== undefined) payload.acceptanceMaxHum = validatedPayload.acceptanceMaxHum;
      if (validatedPayload.acceptanceNotes !== undefined) payload.acceptanceNotes = validatedPayload.acceptanceNotes;
      const equipment = await equipmentService.updateClientEquipment(id, payload);
      res.json({ success: true, data: { equipment } });
    } catch (error) {
      logger.error('Update client equipment error', { error });
      res.status(500).json({ error: 'Erro ao atualizar equipamento' });
    }
  }

  async deleteClientEquipment(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;
      await equipmentService.deleteClientEquipment(id);
      res.json({ success: true });
    } catch (error) {
      logger.error('Delete client equipment error', { error });
      res.status(500).json({ error: 'Erro ao remover equipamento' });
    }
  }
}
