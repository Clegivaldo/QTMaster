#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { prisma } from './dist/lib/prisma.js';

async function main() {
  const uploads = '/tmp/uploads';
  if (!fs.existsSync(uploads)) {
    console.error(JSON.stringify({ error: 'uploads-dir-not-found', path: uploads }));
    process.exit(2);
  }
  const files = fs.readdirSync(uploads).filter(f => f.toLowerCase().endsWith('.xls'));
  if (!files.length) {
    console.log(JSON.stringify({ message: 'no-xls-found' }));
    process.exit(0);
  }

  for (const file of files) {
    try {
      const match = file.match(/[A-Z]{2}\d{10,}/);
      let sensor = null;
      if (match) {
        const serial = match[0];
        sensor = await prisma.sensor.findUnique({ where: { serialNumber: serial } });
      }
      const args = [path.join('/tmp', 'uploads', file)];
      if (sensor) args.push('--sensorId', sensor.id);

      console.log('Processing', file, 'sensorId:', sensor ? sensor.id : 'none');
      await runImport(args);
    } catch (e) {
      console.error('Error processing', file, String(e));
    }
  }
  await prisma.$disconnect();
}

function runImport(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('node', ['import-file-force.mjs', ...args], { cwd: '/app', stdio: ['ignore', 'pipe', 'pipe'] });
    p.stdout.on('data', d => process.stdout.write(d.toString()));
    p.stderr.on('data', d => process.stderr.write(d.toString()));
    p.on('close', (c) => { resolve(c); });
    p.on('error', (err) => reject(err));
  });
}

main().catch(e => { console.error(e); process.exit(1); });
