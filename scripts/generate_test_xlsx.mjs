import fs from 'fs';
import path from 'path';

const outDir = path.resolve(process.cwd(), 'temp_test_exports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const tempCsv = fs.readFileSync(path.resolve(process.cwd(), 'temp_test_validation_temperaturas.csv'), 'utf-8');
const humCsv = fs.readFileSync(path.resolve(process.cwd(), 'temp_test_validation_umidades.csv'), 'utf-8');

(async () => {
  try {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const tempRows = tempCsv.split(/\r?\n/).map(r => r.split(','));
    const humRows = humCsv.split(/\r?\n/).map(r => r.split(','));

    const wsTemp = XLSX.utils.aoa_to_sheet(tempRows);
    // Set date cells in column A (assuming header present)
    for (let i = 1; i < tempRows.length; i++) {
      const cellAddr = XLSX.utils.encode_cell({ c: 0, r: i });
      const raw = tempRows[i][0];
      if (!raw) continue;
      // parse dd/mm/yy HH:mm
      const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/);
      if (m) {
        const [_, dd, mm, yy, hh, mi] = m;
        const year = 2000 + Number(yy);
        const d = new Date(year, Number(mm) - 1, Number(dd), Number(hh), Number(mi));
        wsTemp[cellAddr] = { t: 'd', v: d, z: 'dd/mm/yy hh:mm' };
      }
    }

    const wsHum = XLSX.utils.aoa_to_sheet(humRows);
    for (let i = 1; i < humRows.length; i++) {
      const cellAddr = XLSX.utils.encode_cell({ c: 0, r: i });
      const raw = humRows[i][0];
      if (!raw) continue;
      const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/);
      if (m) {
        const [_, dd, mm, yy, hh, mi] = m;
        const year = 2000 + Number(yy);
        const d = new Date(year, Number(mm) - 1, Number(dd), Number(hh), Number(mi));
        wsHum[cellAddr] = { t: 'd', v: d, z: 'dd/mm/yy hh:mm' };
      }
    }

    XLSX.utils.book_append_sheet(wb, wsTemp, 'Temperatura');
    XLSX.utils.book_append_sheet(wb, wsHum, 'Umidade');

    const outPath = path.join(outDir, 'validacao_sample_pivot.xlsx');
    XLSX.writeFile(wb, outPath);
    console.log('XLSX gerado em', outPath);
  } catch (err) {
    console.error('Não foi possível gerar XLSX automaticamente. Para gerar, instale a dependência:');
    console.log('  npm install xlsx');
    console.log('Depois rode:');
    console.log('  node scripts/generate_test_xlsx.mjs');
  }
})();
