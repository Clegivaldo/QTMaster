const XLSX = require('xlsx');
const fs = require('fs');

function readWorkbook(filePath) {
  return XLSX.readFile(filePath);
}

function detectResumoModelAndSerial(workbook) {
  const resumo = workbook.SheetNames.includes('Resumo') ? workbook.Sheets['Resumo'] : undefined;
  let model = '';
  let serial = '';
  if (resumo) {
    try {
      const modelCell = resumo['B5'];
      const serialCell = resumo['B6'];
      model = modelCell ? String(modelCell.v || modelCell.w || '').trim() : '';
      serial = serialCell ? String(serialCell.v || serialCell.w || '').trim() : '';
    } catch (e) {
      // ignore
    }
  }
  return { model, serial, hasResumo: !!resumo };
}

function chooseSheet(workbook, preferLista) {
  let sheetName = workbook.SheetNames[0];
  if (preferLista && workbook.SheetNames.includes('Lista')) sheetName = 'Lista';
  return sheetName;
}

function detectMapping(headers) {
  const mapping = {};
  const possibleTimestampColumns = ['tempo','timestamp','data','hora','time','date','data_hora','datetime','data/hora','data e hora','timestamp_leitura','leitura_data'];
  const possibleTemperatureColumns = ['temperatura','temperature','temp','temp_celsius','temp_c','temperatura_c'];
  const possibleHumidityColumns = ['umidade','humidity','hum','hum_rel','umidade_relativa','humidity_rel'];
  const possibleSensorColumns = ['sensor','sensor_id','serial','serial_number','numero_serie','sensor_serial','id_sensor','sensor_id'];

  headers.forEach(h => {
    const lower = String(h || '').toLowerCase().trim();
    if (possibleTimestampColumns.some(p => lower.includes(p))) mapping.timestamp = h;
    else if (possibleTemperatureColumns.some(p => lower.includes(p))) mapping.temperature = h;
    else if (possibleHumidityColumns.some(p => lower.includes(p))) mapping.humidity = h;
    else if (possibleSensorColumns.some(p => lower.includes(p))) mapping.sensorId = h;
  });
  return mapping;
}

function parseRows(worksheet, headers, maxRows = 20) {
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: { s: { r: range.s.r+1, c: range.s.c }, e: { r: Math.min(range.s.r + maxRows, range.e.r), c: range.e.c } }, defval: null, raw: false });
  return rows.map(arr => Object.fromEntries(headers.map((h, idx) => [h, arr[idx]])));
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node inspect_elitech.cjs <path-to-file>');
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

  const preferLista = String(model || '').toLowerCase().includes('rc-4hc') || String(model || '').toLowerCase().includes('rc4hc');
  console.log('Prefer Lista sheet for RC-4HC:', preferLista);

  const sheetName = chooseSheet(workbook, preferLista);
  console.log('Chosen sheet:', sheetName);
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    console.error('Worksheet not found:', sheetName);
    process.exit(3);
  }

  const headerRow = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0 });
  const headers = (headerRow[0] || []).map(h => String(h || '').trim());
  console.log('Headers:', headers);

  const mapping = detectMapping(headers);
  console.log('Detected mapping:', mapping);

  const parsed = parseRows(worksheet, headers, 50);
  console.log('First parsed rows (up to 50):');
  parsed.forEach((r, i) => console.log(i + 1, r));

  process.exit(0);
}

main();
