const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sensorId = 'cmiyxytgu0jc6se4ng0rrrgnj';
  const res = await prisma.sensorData.aggregate({
    where: { sensorId },
    _count: { _all: true },
    _min: { timestamp: true },
    _max: { timestamp: true },
  });

  console.log(JSON.stringify({
    sensorId,
    count: res._count && res._count._all != null ? res._count._all : (res._count || {}).count || 0,
    minTimestamp: res._min ? res._min.timestamp : null,
    maxTimestamp: res._max ? res._max.timestamp : null,
  }));
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
