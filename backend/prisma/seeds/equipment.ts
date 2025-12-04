import { PrismaClient } from '@prisma/client';
import { logger } from '../../src/utils/logger.js';

const prisma = new PrismaClient();

export async function seedEquipment() {
  try {
    logger.info('Seeding equipment types/brands/models and client equipments...');

    // Equipment types
    const types = [
      { name: 'Câmara Fria', description: 'Ambientes de refrigeração para produtos alimentícios' },
      { name: 'Estufa', description: 'Estufas para testes térmicos de laboratórios' },
      { name: 'Freezer', description: 'Freezers de armazenamento a baixas temperaturas' },
    ];

    const createdTypes: any[] = [];
    for (const t of types) {
      let rec = await prisma.equipmentItemType.findFirst({ where: { name: t.name } });
      if (!rec) rec = await prisma.equipmentItemType.create({ data: t as any });
      createdTypes.push(rec);
    }

    // Brands
    const brands = [
      { name: 'ThermoCorp', description: 'Equipamentos de controle térmico' },
      { name: 'ColdTech', description: 'Soluções de refrigeração industrial' },
      { name: 'LabEquip', description: 'Equipamentos laboratoriais' },
    ];

    const createdBrands: any[] = [];
    for (const b of brands) {
      let rec = await prisma.equipmentBrand.findFirst({ where: { name: b.name } });
      if (!rec) rec = await prisma.equipmentBrand.create({ data: b as any });
      createdBrands.push(rec);
    }

    // Models (brand + type)
    const models = [
      { name: 'TC-500', brand: createdBrands[0].id, type: createdTypes[0].id },
      { name: 'CT-FRZ-100', brand: createdBrands[1].id, type: createdTypes[2].id },
      { name: 'LE-EST-42', brand: createdBrands[2].id, type: createdTypes[1].id },
    ];

    const createdModels: any[] = [];
    for (const m of models) {
      let rec = await prisma.equipmentModel.findFirst({ where: { brandId: m.brand, name: m.name } });
      if (!rec) rec = await prisma.equipmentModel.create({ data: { name: m.name, brandId: m.brand, typeId: m.type } as any });
      createdModels.push(rec);
    }

    // Associate some equipments to clients (pick first clients)
    const clients = await prisma.client.findMany({ take: 5 });
    if (clients.length === 0) {
      logger.warn('No clients found to attach equipments to');
      return;
    }

    const sampleEquipments = [
      {
        client: clients[0],
        model: createdModels[0],
        brand: createdBrands[0],
        type: createdTypes[0],
        name: 'Câmara Fria - Linha A',
        serialNumber: 'SN-TC-0001',
        assetNumber: 'AT-1001',
        tag: 'CF-1001',
        acceptanceMinTemp: -20,
        acceptanceMaxTemp: 8,
      },
      {
        client: clients[1],
        model: createdModels[2],
        brand: createdBrands[2],
        type: createdTypes[1],
        name: 'Estufa Laboratório 3',
        serialNumber: 'SN-LE-042-01',
        assetNumber: 'AT-2001',
        tag: 'EST-2001',
        acceptanceMinTemp: 30,
        acceptanceMaxTemp: 120,
      },
      {
        client: clients[2],
        model: createdModels[1],
        brand: createdBrands[1],
        type: createdTypes[2],
        name: 'Freezer Armazenagem',
        serialNumber: 'SN-CT-100A',
        assetNumber: 'AT-3001',
        tag: 'FRZ-3001',
        acceptanceMinTemp: -80,
        acceptanceMaxTemp: -20,
      },
    ];

    for (const e of sampleEquipments) {
      const exists = await prisma.clientEquipment.findFirst({ where: { serialNumber: e.serialNumber } });
      if (exists) {
        logger.info(`Equipment ${e.serialNumber} exists, skipping`);
        continue;
      }

      await prisma.clientEquipment.create({
        data: {
          clientId: e.client.id,
          equipmentTypeId: e.type.id,
          brandId: e.brand.id,
          modelId: e.model.id,
          name: e.name,
          serialNumber: e.serialNumber,
          assetNumber: e.assetNumber,
          tag: e.tag,
          acceptanceMinTemp: e.acceptanceMinTemp,
          acceptanceMaxTemp: e.acceptanceMaxTemp,
        } as any,
      });

      logger.info(`Created client equipment ${e.serialNumber}`);
    }

    logger.info('Equipment seeds completed');
  } catch (error) {
    logger.error('Error seeding equipment:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
