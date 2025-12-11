#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import crypto from 'crypto';
import { prisma } from './dist/lib/prisma.js';

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error(JSON.stringify({ error: 'missing filename argument' }));
    process.exit(2);
  }
  let filename = argv[0];
  let sensorId = null;
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--sensorId=')) sensorId = a.split('=')[1];
    if (a === '--sensorId' && argv[i+1]) { sensorId = argv[i+1]; i++; }
  }

  const tmpPath = '/tmp';
  const candidates = [path.join(tmpPath, filename), path.join(tmpPath, 'uploads', filename)];
  const src = candidates.find(p => fs.existsSync(p));
  if (!src) {
    console.error(JSON.stringify({ error: 'file-not-found', tried: candidates }));
    process.exit(3);
  }

  // Choose improved python parser next to original
  const scriptPath = path.join(process.cwd(), 'backend', 'python', 'fallback_parser_improved.py');
  if (!fs.existsSync(scriptPath)) {
    console.error(JSON.stringify({ error: 'parser-not-found', script: scriptPath }));
    process.exit(4);
  }

  const py = spawn('python3', [scriptPath, src], { stdio: ['ignore', 'pipe', 'pipe'] });

  let lineBuf = '';
  let processed = 0;
  let failed = 0;
  const batch = [];
  const BATCH_SIZE = 1000;

  py.stdout.on('data', async (chunk) => {
    lineBuf += chunk.toString('utf8');
    let idx;
    while ((idx = lineBuf.indexOf('\n')) >= 0) {
      const line = lineBuf.slice(0, idx).trim();
      lineBuf = lineBuf.slice(idx+1);
      if (!line) continue;
      try {
        const obj = JSON.parse(line);
        if (!obj || !obj.timestamp) { failed++; continue; }
        const rec = {
          id: undefined,
          sensorId: sensorId || null,
          timestamp: new Date(obj.timestamp),
          temperature: obj.temperature ?? null,
          humidity: obj.humidity ?? null,
          fileName: path.basename(filename),
          rowNumber: obj.rowNumber != null ? Number(obj.rowNumber) : 0,
          createdAt: new Date(),
          validationId: null,
        };
        batch.push(rec);
        processed++;
        if (batch.length >= BATCH_SIZE) {
          await flushBatch(batch);
        }
      } catch (e) {
        failed++;
      }
    }
  });

  py.stderr.on('data', (d) => {
    // forward debug
    process.stderr.write(d.toString());
  });

  py.on('close', async (code) => {
    if (lineBuf.trim()) {
      try {
        const obj = JSON.parse(lineBuf.trim());
        if (obj && obj.timestamp) batch.push({ sensorId: sensorId || null, timestamp: new Date(obj.timestamp), temperature: obj.temperature ?? null, humidity: obj.humidity ?? null, fileName: path.basename(filename), rowNumber: null, createdAt: new Date(), validationId: null });
      } catch (e) { failed++; }
    }
    if (batch.length) await flushBatch(batch);
    console.log(JSON.stringify({ file: filename, sensorId: sensorId, processedRows: processed, failedLines: failed }));
    await prisma.$disconnect();
    process.exit(0);
  });

  async function flushBatch(arr) {
    if (!arr.length) return;
    // assign ids to entries and map types
    const mapped = arr.map((r) => ({
      id: crypto.randomUUID(),
      sensorId: r.sensorId,
      timestamp: r.timestamp,
      temperature: r.temperature,
      humidity: r.humidity,
      fileName: r.fileName,
      rowNumber: Number(r.rowNumber || 0),
      createdAt: r.createdAt,
      validationId: r.validationId,
    }));
    try {
      await prisma.sensorData.createMany({ data: mapped, skipDuplicates: true });
      arr.length = 0;
    } catch (err) {
      console.error('DB insert error', String(err));
    }
  }
}

main().catch(err => { console.error(JSON.stringify({ error: err?.message ?? String(err) })); process.exit(1); });
