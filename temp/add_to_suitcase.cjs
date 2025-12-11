const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const sensorId = process.argv[2];
  if (!sensorId) {
    console.error('missing sensorId');
    process.exit(2);
  }
  try {
    let suitcase = await p.suitcase.findFirst();
    if (!suitcase) {
      suitcase = await p.suitcase.create({ data: { name: 'Import Test Suitcase' } });
    }
    const exists = await p.suitcaseSensor.findUnique({ where: { suitcaseId_sensorId: { suitcaseId: suitcase.id, sensorId } } }).catch(() => null);
    if (!exists) {
      await p.suitcase.update({ where: { id: suitcase.id }, data: { sensors: { create: { sensor: { connect: { id: sensorId } }, position: 1 } } } });
      console.log(JSON.stringify({ created: true, suitcaseId: suitcase.id, sensorId }));
    } else {
      console.log(JSON.stringify({ created: false, reason: 'already-mapped', suitcaseId: suitcase.id, sensorId }));
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
