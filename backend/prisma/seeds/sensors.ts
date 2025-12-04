import { PrismaClient } from '@prisma/client';
import { logger } from '../../src/utils/logger.js';

const prisma = new PrismaClient();

export async function seedSensors() {
  try {
    logger.info('Seeding sensor types and sensors...');

    const sensorTypesData = [
      {
        name: 'Temperatura/Umidade (T/H)',
        description: 'Sensor combinado de temperatura e umidade',
        dataConfig: {
          temperatureColumn: 'B',
          humidityColumn: 'C',
          timestampColumn: 'A',
          startRow: 2,
          dateFormat: 'DD/MM/YYYY HH:mm:ss',
        },
      },
      {
        name: 'Temperatura (T)',
        description: 'Sensor de temperatura apenas',
        dataConfig: {
          temperatureColumn: 'B',
          timestampColumn: 'A',
          startRow: 2,
          dateFormat: 'YYYY-MM-DD HH:mm:ss',
        },
      },
    ];

    const createdTypes: any[] = [];
    for (const st of sensorTypesData) {
      let rec = await prisma.sensorType.findFirst({ where: { name: st.name } });
      if (!rec) rec = await prisma.sensorType.create({ data: st as any });
      createdTypes.push(rec);
    }

    // Create sample sensors
    const sensors = [
      { serialNumber: 'SEN-T-0001', model: 'TH-100', type: createdTypes[0] },
      { serialNumber: 'SEN-T-0002', model: 'TH-100', type: createdTypes[0] },
      { serialNumber: 'SEN-TMP-01', model: 'T-50', type: createdTypes[1] },
      { serialNumber: 'SEN-TMP-02', model: 'T-50', type: createdTypes[1] },
    ];

    for (const s of sensors) {
      const exists = await prisma.sensor.findFirst({ where: { serialNumber: s.serialNumber } });
      if (exists) {
        logger.info(`Sensor ${s.serialNumber} exists, skipping`);
        continue;
      }

      await prisma.sensor.create({
        data: {
          serialNumber: s.serialNumber,
          model: s.model,
          typeId: s.type.id,
          calibrationDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
        } as any,
      });

      logger.info(`Created sensor ${s.serialNumber}`);
    }

    // Optionally create a suitcase and attach sensors
    const suitcase = await prisma.suitcase.findFirst({ where: { name: 'Maleta Padrão Seed' } });
    let suitcaseRec = suitcase;
    if (!suitcaseRec) {
      suitcaseRec = await prisma.suitcase.create({ data: { name: 'Maleta Padrão Seed', description: 'Maleta usada em testes e demonstrações' } });
    }

    const existingSensors = await prisma.sensor.findMany({ where: { serialNumber: { in: sensors.map(s => s.serialNumber) } } });
    for (let i = 0; i < existingSensors.length; i++) {
      const s = existingSensors[i];
      const existsLink = await prisma.suitcaseSensor.findFirst({ where: { suitcaseId: suitcaseRec!.id, sensorId: s.id } });
      if (!existsLink) {
        await prisma.suitcaseSensor.create({ data: { suitcaseId: suitcaseRec!.id, sensorId: s.id, position: i + 1 } as any });
        logger.info(`Attached sensor ${s.serialNumber} to suitcase`);
      }
    }

    logger.info('Sensor seeds completed');
  } catch (error) {
    logger.error('Error seeding sensors:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
