import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function createTestData() {
  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.upsert({
      where: { email: 'admin@sistema.com' },
      update: {},
      create: {
        id: randomUUID(),
        email: 'admin@sistema.com',
        password: hashedPassword,
        name: 'Administrador',
        role: 'ADMIN'
      }
    });
    console.log('User created:', user.email);

    // Create client
    const client = await prisma.client.upsert({
      where: { cnpj: '12345678000199' },
      update: {},
      create: {
        id: randomUUID(),
        name: 'Cliente Teste Ltda',
        cnpj: '12345678000199',
        email: 'cliente@teste.com',
        phone: '11999999999'
      }
    });
    console.log('Client created:', client.name);

    // Create equipment type
    let equipmentType = await prisma.equipmentItemType.findFirst({
      where: { name: 'Câmara Climática' }
    });
    if (!equipmentType) {
      equipmentType = await prisma.equipmentItemType.create({
        data: {
          id: randomUUID(),
          name: 'Câmara Climática',
          description: 'Câmara para testes térmicos'
        }
      });
    }

    // Create brand
    let brand = await prisma.equipmentBrand.findFirst({
      where: { name: 'TestBrand' }
    });
    if (!brand) {
      brand = await prisma.equipmentBrand.create({
        data: {
          id: randomUUID(),
          name: 'TestBrand',
          description: 'Marca de teste'
        }
      });
    }

    // Create model
    let model = await prisma.equipmentModel.findFirst({
      where: {
        brandId: brand.id,
        name: 'Model X1'
      }
    });
    if (!model) {
      model = await prisma.equipmentModel.create({
        data: {
          id: randomUUID(),
          name: 'Model X1',
          brandId: brand.id,
          typeId: equipmentType.id,
          description: 'Modelo de teste'
        }
      });
    }

    // Create equipment
    let equipment = await prisma.clientEquipment.findFirst({
      where: { serialNumber: 'TEST123' }
    });
    if (!equipment) {
      equipment = await prisma.clientEquipment.create({
        data: {
          id: randomUUID(),
          clientId: client.id,
          equipmentTypeId: equipmentType.id,
          brandId: brand.id,
          modelId: model.id,
          serialNumber: 'TEST123',
          assetNumber: 'ASSET001'
        }
      });
    }
    console.log('Equipment created/found:', equipment.name);

    // Create suitcase
    let suitcase = await prisma.suitcase.findFirst({
      where: { name: 'Mala Teste' }
    });
    if (!suitcase) {
      suitcase = await prisma.suitcase.create({
        data: {
          id: randomUUID(),
          name: 'Mala Teste',
          description: 'Mala para testes'
        }
      });
    }
    console.log('Suitcase created/found:', suitcase.name);

    // Create validation
    let validation = await prisma.validation.findFirst({
      where: { validationNumber: 'VAL001' }
    });
    if (!validation) {
      validation = await prisma.validation.create({
        data: {
          id: randomUUID(),
          suitcaseId: suitcase.id,
          clientId: client.id,
          userId: user.id,
          name: 'Validação de Teste',
          description: 'Validação para testar PDF generation',
          validationNumber: 'VAL001',
          equipmentId: equipment.id,
          equipmentSerial: 'TEST123',
          minTemperature: -20,
          maxTemperature: 60,
          minHumidity: 10,
          maxHumidity: 90
        }
      });
    }
    console.log('Validation created/found:', validation.name);

    console.log('Test data created successfully!');
    console.log('Login credentials: admin@sistema.com / admin123');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();