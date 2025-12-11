const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const s = await p.sensor.findUnique({ where: { serialNumber: 'EF7216103439' } });
    console.log(JSON.stringify(s));
  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
})();
