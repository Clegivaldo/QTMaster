import('path');
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const keepName = '123';
  console.log('Finding templates...');
  const templates = await prisma.editorTemplate.findMany();
  for (const t of templates) {
    if (t.name !== keepName) {
      console.log(`Deleting ${t.name} (${t.id})`);
      try {
        await prisma.editorTemplate.delete({ where: { id: t.id } });
        console.log('Deleted');
      } catch (err) {
        console.error('Delete failed for', t.id, err.message || err);
      }
    } else {
      console.log(`Keeping ${t.name} (${t.id})`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
