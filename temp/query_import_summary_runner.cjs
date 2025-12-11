const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const s = process.argv[2];
(async()=>{
  const r = await prisma.sensorData.aggregate({ where: { sensorId: s }, _count:{ _all:true }, _min:{ timestamp:true }, _max:{ timestamp:true } });
  console.log(JSON.stringify({ sensorId: s, count: r._count._all, min: r._min.timestamp, max: r._max.timestamp }));
  await prisma.$disconnect();
})();
