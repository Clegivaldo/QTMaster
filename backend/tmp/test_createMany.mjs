import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(){
  const sensorId = 'cmi5wyifr0002mv0txvv6qrln';
  console.log('Checking sensor existence for id:', sensorId);
  const sensor = await prisma.sensor.findUnique({ where: { id: sensorId } });
  console.log('Sensor found:', !!sensor, sensor || 'null');

  const payload = [{
    sensorId,
    timestamp: new Date(),
    temperature: 25.3,
    humidity: 50.2,
    fileName: 'debug-createMany.csv',
    rowNumber: 1,
    validationId: null,
    createdAt: new Date()
  }];

  try {
    const res = await prisma.sensorData.createMany({ data: payload, skipDuplicates: true });
    console.log('createMany result:', res);
  } catch (e) {
    console.error('createMany failed:', e && e.message ? e.message : e);
    if (e && e.code) console.error('Error code:', e.code);
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error('Script error', e);
  prisma.$disconnect();
});