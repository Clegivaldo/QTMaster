const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const s = process.argv[2];
(async()=>{
  const res = await prisma.sensor.findMany({ where: { serialNumber: { contains: s } }, take: 10 });
  console.log(JSON.stringify(res, null, 2));
  await prisma.$disconnect();
})();
