import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(){
  const sensorId = 'cmi5wyifr0002mv0txvv6qrln';
  console.log('Checking sensor existence for id:', sensorId);
  const sensor = await prisma.sensor.findUnique({ where: { id: sensorId } });
  console.log('Sensor found:', !!sensor, sensor || 'null');

  try {
    const created = await prisma.sensorData.create({
      data: {
        sensorId,
        timestamp: new Date(),
        temperature: 25.3,
        humidity: 50.2,
        fileName: 'debug-insert.csv',
        rowNumber: 1,
        validationId: null
      }
    });
    console.log('Insert succeeded:', created);
  } catch (e) {
    console.error('Insert failed:', e && e.message ? e.message : e);
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