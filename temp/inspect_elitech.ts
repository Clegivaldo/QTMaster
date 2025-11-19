import * as XLSX from 'xlsx';
import * as fs from 'fs';

function readWorkbook(filePath: string) {
  const XLSXLib: any = (XLSX as any)?.default ?? XLSX;
  return XLSXLib.readFile(filePath);
}

function detectResumoModelAndSerial(workbook: any) {
  const resumo = workbook.SheetNames.includes('Resumo') ? workbook.Sheets['Resumo'] : undefined;
  let model = '';
  let serial = '';
  if (resumo) {
    try {
      const modelCell = resumo['B5'];
      const serialCell = resumo['B6'];
      model = modelCell ? String((modelCell as any).v || (modelCell as any).w || '').trim() : '';
      serial = serialCell ? String((serialCell as any).v || (serialCell as any).w || '').trim() : '';
    } catch (e) {
      // ignore
    }
  }
  return { model, serial, hasResumo: !!resumo };
}

function chooseSheet(workbook: any, preferLista: boolean) {
  let sheetName = workbook.SheetNames[0];
  if (preferLista && workbook.SheetNames.includes('Lista')) sheetName = 'Lista';
  return sheetName;
}

function detectMapping(headers: string[]) {
  const mapping: any = {};
  const possibleTimestampColumns = ['tempo','timestamp','data','hora','time','date','data_hora','datetime','data/hora','data e hora','timestamp_leitura','leitura_data'];
  const possibleTemperatureColumns = ['temperatura','temperature','temp','temp_celsius','temp_c','temperatura_c'];
  const possibleHumidityColumns = ['umidade','humidity','hum','hum_rel','umidade_relativa','humidity_rel'];
  const possibleSensorColumns = ['sensor','sensor_id','serial','serial_number','numero_serie','sensor_serial','id_sensor','sensor_id'];

  headers.forEach(h => {
    const lower = h.toLowerCase().trim();
    if (possibleTimestampColumns.some(p => lower.includes(p))) mapping.timestamp = h;
    else if (possibleTemperatureColumns.some(p => lower.includes(p))) mapping.temperature = h;
    else if (possibleHumidityColumns.some(p => lower.includes(p))) mapping.humidity = h;
    else if (possibleSensorColumns.some(p => lower.includes(p))) mapping.sensorId = h;
  });
  return mapping;
}

function parseRows(worksheet: any, headers: string[], maxRows = 20) {
  const XLSXLib: any = (XLSX as any)?.default ?? XLSX;
  const range = XLSXLib.utils.decode_range(worksheet['!ref'] as string);
  const rows = XLSXLib.utils.sheet_to_json(worksheet, { header: 1, range: { s: { r: range.s.r+1, c: range.s.c }, e: { r: Math.min(range.s.r + maxRows, range.e.r), c: range.e.c } }, defval: null, raw: false }) as any[];
  return rows.map((arr: any[]) => Object.fromEntries(headers.map((h, idx) => [h, arr[idx]])));
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: tsx inspect_elitech.ts <path-to-file>');
    process.exit(1);
  }

  const filePath = arg;
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(2);
  }

  console.log('Reading workbook:', filePath);
  const workbook = readWorkbook(filePath);
  console.log('Sheet names:', workbook.SheetNames);

  const { model, serial, hasResumo } = detectResumoModelAndSerial(workbook);
  console.log('Resumo present:', hasResumo);
  console.log('Resumo model (B5):', model);
  console.log('Resumo serial (B6):', serial);

  const preferLista = model.toLowerCase().includes('rc-4hc') || model.toLowerCase().includes('rc4hc');
  console.log('Prefer Lista sheet for RC-4HC:', preferLista);

  const sheetName = chooseSheet(workbook, preferLista);
  console.log('Chosen sheet:', sheetName);
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    console.error('Worksheet not found:', sheetName);
    process.exit(3);
  }

  const XLSXLib: any = (XLSX as any)?.default ?? XLSX;
  const headerRow = XLSXLib.utils.sheet_to_json(worksheet, { header: 1, range: 0 }) as any[];
  const headers: string[] = (headerRow[0] || []).map((h: any) => String(h || '').trim());
  console.log('Headers:', headers);

  const mapping = detectMapping(headers);
  console.log('Detected mapping:', mapping);

  const parsed = parseRows(worksheet, headers, 50);
  console.log('First parsed rows (up to 50):');
  parsed.forEach((r, i) => console.log(i + 1, r));

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(10); });
