#!/usr/bin/env node
import { prisma } from './src/lib/prisma.ts';

async function main() {
  const sensorId = process.argv[2];
  if (!sensorId) {
    console.error('Usage: query-sensor.mjs <sensorId>');
    process.exit(2);
  }

  try {
    const rows = await prisma.sensorData.findMany({
      where: { sensorId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    console.log(`Latest ${rows.length} rows for sensor ${sensorId}:`);
    for (const r of rows) {
      console.log(`${r.timestamp?.toISOString() || 'null'} | ${r.fileName || 'unknown'} | row:${r.rowNumber}`);
    }
  } catch (err) {
    console.error('Query error:', err?.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
