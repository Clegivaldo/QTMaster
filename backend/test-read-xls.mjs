import xlsx from 'xlsx';

console.log('Testing xlsx library read...');
const startTime = Date.now();

try {
  const workbook = xlsx.readFile('/app/uploads/Elitech RC-4HC.xls');
  const elapsed = Date.now() - startTime;
  
  console.log(`✓ Read successful in ${elapsed}ms`);
  console.log(`Sheet names: ${workbook.SheetNames.join(', ')}`);
  
  if (workbook.SheetNames.length > 0) {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(firstSheet, { header: 1 });
    console.log(`Rows in first sheet: ${data.length}`);
    console.log('First 3 rows:', JSON.stringify(data.slice(0, 3), null, 2));
  }
} catch (error) {
  const elapsed = Date.now() - startTime;
  console.error(`✗ Read failed after ${elapsed}ms:`, error.message);
  process.exit(1);
}
