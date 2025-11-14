import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT cnpj, COUNT(*) AS occurrences
      FROM clients
      WHERE cnpj IS NOT NULL AND cnpj <> ''
      GROUP BY cnpj
      HAVING COUNT(*) > 1;
    `);

    if (!rows || rows.length === 0) {
      console.log('No duplicate CNPJ values found.');
    } else {
      console.log('Duplicate CNPJ values:');
      for (const r of rows) {
        console.log(`${r.cnpj} -> ${r.occurrences}`);
      }
    }
  } catch (err) {
    console.error('Error running duplicate CNPJ query:', err);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) run();
