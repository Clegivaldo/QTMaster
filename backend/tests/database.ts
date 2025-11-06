/**
 * Configuração de banco de dados para testes
 */

import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export const setupTestDatabase = async () => {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',
      },
    },
  });

  await prisma.$connect();
  
  // Limpar dados de teste
  await cleanupTestData();
  
  return prisma;
};

export const cleanupTestData = async () => {
  if (!prisma) return;

  // Limpar tabelas em ordem para evitar conflitos de foreign key
  const tablenames = [
    'Report',
    'Validation',
    'SensorData',
    'SuitcaseSensor',
    'Suitcase',
    'Sensor',
    'SensorType',
    'Client',
    'User',
  ];

  for (const tablename of tablenames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    } catch (error) {
      console.warn(`Failed to truncate ${tablename}:`, error);
    }
  }
};

export const teardownTestDatabase = async () => {
  if (prisma) {
    await cleanupTestData();
    await prisma.$disconnect();
  }
};

export const createTestUser = async (userData: any = {}) => {
  return await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test User',
      role: 'USER',
      ...userData,
    },
  });
};

export const createTestClient = async (clientData: any = {}) => {
  return await prisma.client.create({
    data: {
      name: 'Test Client',
      email: 'client@example.com',
      phone: '(11) 99999-9999',
      ...clientData,
    },
  });
};

export const createTestSensorType = async (typeData: any = {}) => {
  return await prisma.sensorType.create({
    data: {
      name: 'Test Sensor Type',
      description: 'Test sensor type for testing',
      dataConfig: {
        temperatureColumn: 'A',
        humidityColumn: 'B',
        timestampColumn: 'C',
        startRow: 2,
      },
      ...typeData,
    },
  });
};

export const createTestSensor = async (sensorData: any = {}) => {
  const sensorType = await createTestSensorType();
  
  return await prisma.sensor.create({
    data: {
      serialNumber: 'TEST001',
      model: 'Test Model',
      typeId: sensorType.id,
      ...sensorData,
    },
  });
};

export const createTestSuitcase = async (suitcaseData: any = {}) => {
  return await prisma.suitcase.create({
    data: {
      name: 'Test Suitcase',
      description: 'Test suitcase for testing',
      ...suitcaseData,
    },
  });
};

export { prisma };