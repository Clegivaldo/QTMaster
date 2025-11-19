(async ()=>{
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const suitcaseId = 'cmi5wyins0003mv0tkui49liy';
    const suitcase = await prisma.suitcase.findUnique({ where: { id: suitcaseId }, include: { sensors: { include: { sensor: true } } } });
    console.log(JSON.stringify((suitcase && suitcase.sensors) ? suitcase.sensors.map(s=>({suitcaseSensorId: s.id, sensorId: s.sensor.id, serial: s.sensor.serialNumber})) : [], null, 2));
    await prisma.$disconnect();
  } catch(e) { console.error(e); process.exit(1); }
})();
