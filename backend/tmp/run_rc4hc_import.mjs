import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('Usage: node run_rc4hc_import.mjs <absolute_file_path_inside_container>');
    process.exit(2);
  }
  const originalName = path.basename(filePath);
  const stat = fs.statSync(filePath);

  // Use placeholder serial if file reading is not desired here
  const serial = `RC4HC-${Date.now()}`;

  // Ensure sensor type
  const typeName = 'Elitech RC-4HC';
  const dataConfig = {
    temperatureColumn: 'C',
    humidityColumn: 'D',
    timestampColumn: 'B',
    startRow: 2,
    dateFormat: 'DD/MM/YYYY HH:mm:ss',
    hasHeader: true,
    separator: ';'
  };
  let sensorType = await prisma.sensorType.findFirst({ where: { name: typeName } });
  if (!sensorType) {
    sensorType = await prisma.sensorType.create({ data: { name: typeName, description: 'Elitech RC-4HC (Temp+Hum)', dataConfig } });
  }

  // Ensure sensor
  let sensor = await prisma.sensor.findUnique({ where: { serialNumber: serial } });
  if (!sensor) {
    sensor = await prisma.sensor.create({ data: { serialNumber: serial, model: 'Elitech RC-4HC', typeId: sensorType.id } });
  }

  // Ensure suitcase
  const suitcaseName = `Maleta RC-4HC (${serial})`;
  let suitcase = await prisma.suitcase.findFirst({ where: { name: suitcaseName } });
  if (!suitcase) {
    suitcase = await prisma.suitcase.create({ data: { name: suitcaseName } });
    await prisma.suitcaseSensor.create({ data: { suitcaseId: suitcase.id, sensorId: sensor.id, position: 1 } });
  }

  // Find admin user for attribution
  const admin = await prisma.user.findFirst({ where: { email: { in: ['admin@sistema.com', 'admin@laudo.com'] } } });
  if (!admin) {
    console.error('Admin user not found. Seed users first.');
    process.exit(3);
  }

  // Build a pseudo multer file
  console.log('Parsing XLS via xlsx library...', { originalName, suitcaseId: suitcase.id, sensorId: sensor.id, serial });
  const XLSXLib = (await import('xlsx')).default ?? await import('xlsx');
  const wb = XLSXLib.readFile(filePath);
  const sheetName = wb.SheetNames.includes('Lista') ? 'Lista' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('Worksheet not found');
  const range = XLSXLib.utils.decode_range(ws['!ref']);
  // Read all rows as arrays, then map
  const rows = XLSXLib.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
  // Row 0: headers; start from row 1
  const batch = [];
  let total = 0, failed = 0;
  for (let i = 1; i < rows.length; i++) {
    const arr = rows[i];
    if (!arr || arr.length < 4) continue;
    const tsRaw = arr[1];
    const tempRaw = arr[2];
    const humRaw = arr[3];
    const ts = tsRaw ? new Date(String(tsRaw)) : null;
    const t = typeof tempRaw === 'number' ? tempRaw : parseFloat(String(tempRaw).replace(',', '.'));
    const h = humRaw == null ? null : (typeof humRaw === 'number' ? humRaw : parseFloat(String(humRaw).replace(',', '.')));
    total++;
    if (ts && !isNaN(t)) {
      batch.push({ sensorId: sensor.id, timestamp: ts, temperature: t, humidity: (h == null || isNaN(h)) ? null : h, fileName: originalName, rowNumber: total, validationId: null, createdAt: new Date() });
      if (batch.length >= 1000) {
        try { await prisma.sensorData.createMany({ data: batch, skipDuplicates: true }); } catch { failed += batch.length; }
        batch.length = 0;
      }
    } else {
      failed++;
    }
  }
  if (batch.length) {
    try { await prisma.sensorData.createMany({ data: batch, skipDuplicates: true }); } catch { failed += batch.length; }
  }
  console.log('Import summary:', { total, failed, inserted: total - failed });
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
