#!/usr/bin/env node
const mod = await import('../src/lib/prisma.js');
const prisma = mod.prisma || (mod.default && mod.default.prisma) || mod.default || mod;

async function main() {
  const suitcaseId = process.argv[2] || 'cmi5wyins0003mv0tkui49liy';
  console.log('Querying suitcase sensors for suitcaseId=', suitcaseId);

  const suitcaseSensors = await prisma.suitcaseSensor.findMany({
    where: { suitcaseId },
    select: { id: true, sensorId: true },
  });

  console.log('Suitcase sensors (count=' + suitcaseSensors.length + '):');
  console.log(JSON.stringify(suitcaseSensors, null, 2));

  const sensorIds = suitcaseSensors.map(s => s.sensorId);
  if (sensorIds.length === 0) {
    console.log('No sensorIds found for suitcase. Listing recent sensors...');
    const recent = await prisma.sensor.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    console.log('Recent sensors:');
    console.log(JSON.stringify(recent, null, 2));
  } else {
    const sensors = await prisma.sensor.findMany({ where: { id: { in: sensorIds } } });
    console.log('Matched sensors (count=' + sensors.length + '):');
    console.log(JSON.stringify(sensors, null, 2));
    const missing = sensorIds.filter(id => !sensors.find(s => s.id === id));
    if (missing.length > 0) {
      console.log('Missing sensor ids: ', missing);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
