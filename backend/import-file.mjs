#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
// Use built `dist` modules when running in-container to avoid loading TS directly.
import { enhancedFileProcessorService } from './dist/services/enhancedFileProcessorService.js';
import { prisma } from './dist/lib/prisma.js';

async function main() {
  try {
    const filename = process.argv[2];
    if (!filename) {
      console.error(JSON.stringify({ error: 'missing filename argument' }));
      process.exit(2);
    }
    const tmpPath = '/tmp';
    // Support files placed either in /tmp or in /tmp/uploads
    const candidates = [path.join(tmpPath, filename), path.join(tmpPath, 'uploads', filename)];
    let src = candidates.find(p => fs.existsSync(p));
    if (!src) {
      console.error(JSON.stringify({ error: 'file-not-found', tried: candidates }));
      process.exit(3);
    }

    // Ensure there is a suitcase to attach to
    let suitcase = await prisma.suitcase.findFirst({ include: { sensors: { include: { sensor: true } } } });
    if (!suitcase) {
      suitcase = await prisma.suitcase.create({ data: { name: 'Import Test Suitcase' } });
      suitcase = await prisma.suitcase.findUnique({ where: { id: suitcase.id }, include: { sensors: { include: { sensor: true } } } });
    }

    const stats = fs.statSync(src);
    const fileObj = {
      originalname: path.basename(filename),
      mimetype: 'application/octet-stream',
      size: stats.size,
      path: src
    };

    const result = await enhancedFileProcessorService.processFileWithRobustService(fileObj, suitcase, 'script-importer');
    // Build a concise JSON summary
    const summary = {
      file: path.basename(filename),
      success: !!result?.success,
      sensorId: result?.sensorId || null,
      recordsProcessed: result?.recordsProcessed ?? null,
      recordsFailed: result?.recordsFailed ?? null,
      error: result?.error ?? null
    };

    if (summary.sensorId) {
      const sensorId = summary.sensorId;
      const dataAsc = await prisma.sensorData.findMany({ where: { sensorId }, orderBy: { timestamp: 'asc' }, take: 1 });
      const dataDesc = await prisma.sensorData.findMany({ where: { sensorId }, orderBy: { timestamp: 'desc' }, take: 1 });
      summary.dbMin = dataAsc[0]?.timestamp ? dataAsc[0].timestamp.toISOString() : null;
      summary.dbMax = dataDesc[0]?.timestamp ? dataDesc[0].timestamp.toISOString() : null;
    }

    console.log(JSON.stringify(summary));
  } catch (err) {
    console.error(JSON.stringify({ error: err?.message ?? String(err) }));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => { console.error(JSON.stringify({ error: err?.message ?? String(err) })); process.exit(1); });
