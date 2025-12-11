#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { enhancedFileProcessorService } from './src/services/enhancedFileProcessorService.ts';
import { prisma } from './src/lib/prisma.ts';

async function main() {
  try {
    const tmpPath = '/tmp';
    // Filename to import (must exist inside container)
    const filename = 'Elitech-RC-4HC.xls';
    const src = path.join(tmpPath, filename);

    if (!fs.existsSync(src)) {
      console.error('Sample file not found in container:', src);
      process.exit(2);
    }

    // Ensure there is a suitcase to attach to
    let suitcase = await prisma.suitcase.findFirst({ include: { sensors: { include: { sensor: true } } } });
    if (!suitcase) {
      suitcase = await prisma.suitcase.create({ data: { name: 'Import Test Suitcase' } });
      // reload with sensors relation
      suitcase = await prisma.suitcase.findUnique({ where: { id: suitcase.id }, include: { sensors: { include: { sensor: true } } } });
      console.log('Created test suitcase', suitcase.id);
    } else {
      console.log('Using existing suitcase', suitcase.id);
    }

    const stats = fs.statSync(src);
    const fileObj = {
      originalname: filename,
      mimetype: 'application/vnd.ms-excel',
      size: stats.size,
      path: src
    };

    console.log('Starting import for', src);
    const result = await enhancedFileProcessorService.processFileWithRobustService(fileObj, suitcase, 'script-importer');
    console.log('Import result:', result);

    if (result && result.sensorId) {
      const sensorId = result.sensorId;
      // Query min/max timestamps for that sensor
      const dataAsc = await prisma.sensorData.findMany({ where: { sensorId }, orderBy: { timestamp: 'asc' }, take: 1 });
      const dataDesc = await prisma.sensorData.findMany({ where: { sensorId }, orderBy: { timestamp: 'desc' }, take: 1 });
      const minTs = dataAsc[0]?.timestamp;
      const maxTs = dataDesc[0]?.timestamp;
      console.log('Sample sensorId:', sensorId);
      console.log('Min timestamp (db):', minTs ? minTs.toISOString() : 'none');
      console.log('Max timestamp (db):', maxTs ? maxTs.toISOString() : 'none');
      if (minTs && maxTs) {
        console.log('Min local:', new Date(minTs).toLocaleString());
        console.log('Max local:', new Date(maxTs).toLocaleString());
      }
    }

  } catch (err) {
    console.error('Import script error:', err?.message ?? err);
    console.error(err?.stack ?? '');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
