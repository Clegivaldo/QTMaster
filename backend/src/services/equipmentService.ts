import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export class EquipmentService {
  async getBrands() {
    return prisma.equipmentBrand.findMany({ orderBy: { name: 'asc' } });
  }

  async createBrand(payload: { name: string; description?: string | undefined }) {
    const data: Prisma.EquipmentBrandCreateInput = {
      name: payload.name,
      ...(payload.description !== undefined ? { description: payload.description } : {}),
    };
    return prisma.equipmentBrand.create({ data });
  }

  async updateBrand(id: string, payload: { name?: string; description?: string | undefined }) {
    const data: Prisma.EquipmentBrandUpdateInput = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.description !== undefined) data.description = payload.description;
    return prisma.equipmentBrand.update({ where: { id }, data });
  }

  async deleteBrand(id: string) {
    return prisma.equipmentBrand.delete({ where: { id } });
  }

  async getEquipmentTypes() {
    return prisma.equipmentItemType.findMany({ orderBy: { name: 'asc' } });
  }

  async createEquipmentType(payload: { name: string; description?: string | undefined }) {
    const data: Prisma.EquipmentItemTypeCreateInput = {
      name: payload.name,
      ...(payload.description !== undefined ? { description: payload.description } : {}),
    };
    return prisma.equipmentItemType.create({ data });
  }

  async updateEquipmentType(id: string, payload: { name?: string; description?: string | undefined }) {
    const data: Prisma.EquipmentItemTypeUpdateInput = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.description !== undefined) data.description = payload.description;
    return prisma.equipmentItemType.update({ where: { id }, data });
  }

  async deleteEquipmentType(id: string) {
    return prisma.equipmentItemType.delete({ where: { id } });
  }

  async getModels(filter?: { brandId?: string | undefined; typeId?: string | undefined }) {
    return prisma.equipmentModel.findMany({
      where: {
        ...(filter?.brandId && { brandId: filter.brandId }),
        ...(filter?.typeId && { typeId: filter.typeId }),
      },
      include: {
        brand: true,
        type: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createModel(payload: { name: string; brandId: string; typeId: string; description?: string | undefined }) {
    const data: Prisma.EquipmentModelCreateInput = {
      name: payload.name,
      brand: { connect: { id: payload.brandId } },
      type: { connect: { id: payload.typeId } },
      ...(payload.description !== undefined ? { description: payload.description } : {}),
    };
    return prisma.equipmentModel.create({ data });
  }

  async updateModel(id: string, payload: { name?: string; description?: string | undefined; brandId?: string; typeId?: string }) {
    const data: Prisma.EquipmentModelUpdateInput = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.brandId !== undefined) data.brand = { connect: { id: payload.brandId } };
    if (payload.typeId !== undefined) data.type = { connect: { id: payload.typeId } };
    return prisma.equipmentModel.update({ where: { id }, data });
  }

  async deleteModel(id: string) {
    return prisma.equipmentModel.delete({ where: { id } });
  }

  async getClientEquipment(clientId?: string) {
    return prisma.clientEquipment.findMany({
      where: {
        ...(clientId && { clientId }),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        brand: true,
        model: true,
        equipmentType: true,
      },
      orderBy: { serialNumber: 'asc' },
    });
  }

  async getClientEquipmentById(id: string) {
    return prisma.clientEquipment.findUnique({
      where: { id },
      include: {
        brand: true,
        model: true,
        equipmentType: true,
        client: true,
      },
    });
  }

  async createClientEquipment(payload: {
    clientId: string;
    equipmentTypeId: string;
    brandId: string;
    modelId: string;
    name?: string;
    serialNumber: string;
    assetNumber?: string | undefined;
    tag?: string | undefined;
    acceptanceMinTemp?: number | undefined;
    acceptanceMaxTemp?: number | undefined;
    acceptanceMinHum?: number | undefined;
    acceptanceMaxHum?: number | undefined;
    acceptanceNotes?: string | undefined;
  }) {
    const data: Prisma.ClientEquipmentCreateInput = {
      client: { connect: { id: payload.clientId } },
      equipmentType: { connect: { id: payload.equipmentTypeId } },
      brand: { connect: { id: payload.brandId } },
      model: { connect: { id: payload.modelId } },
      serialNumber: payload.serialNumber,
    };
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.assetNumber !== undefined) data.assetNumber = payload.assetNumber;
    if (payload.tag !== undefined) data.tag = payload.tag;
    if (payload.acceptanceMinTemp !== undefined) data.acceptanceMinTemp = payload.acceptanceMinTemp;
    if (payload.acceptanceMaxTemp !== undefined) data.acceptanceMaxTemp = payload.acceptanceMaxTemp;
    if (payload.acceptanceMinHum !== undefined) data.acceptanceMinHum = payload.acceptanceMinHum;
    if (payload.acceptanceMaxHum !== undefined) data.acceptanceMaxHum = payload.acceptanceMaxHum;
    if (payload.acceptanceNotes !== undefined) data.acceptanceNotes = payload.acceptanceNotes;
    return prisma.clientEquipment.create({ data });
  }

  async updateClientEquipment(
    id: string,
    payload: {
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
    }
  ) {
    const data: Prisma.ClientEquipmentUpdateInput = {};
    if (payload.equipmentTypeId !== undefined) data.equipmentType = { connect: { id: payload.equipmentTypeId } };
    if (payload.brandId !== undefined) data.brand = { connect: { id: payload.brandId } };
    if (payload.modelId !== undefined) data.model = { connect: { id: payload.modelId } };
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.serialNumber !== undefined) data.serialNumber = payload.serialNumber;
    if (payload.assetNumber !== undefined) data.assetNumber = payload.assetNumber;
    if (payload.tag !== undefined) data.tag = payload.tag;
    if (payload.acceptanceMinTemp !== undefined) data.acceptanceMinTemp = payload.acceptanceMinTemp;
    if (payload.acceptanceMaxTemp !== undefined) data.acceptanceMaxTemp = payload.acceptanceMaxTemp;
    if (payload.acceptanceMinHum !== undefined) data.acceptanceMinHum = payload.acceptanceMinHum;
    if (payload.acceptanceMaxHum !== undefined) data.acceptanceMaxHum = payload.acceptanceMaxHum;
    if (payload.acceptanceNotes !== undefined) data.acceptanceNotes = payload.acceptanceNotes;
    return prisma.clientEquipment.update({ where: { id }, data });
  }

  async deleteClientEquipment(id: string) {
    return prisma.clientEquipment.delete({ where: { id } });
  }
}

export const equipmentService = new EquipmentService();
