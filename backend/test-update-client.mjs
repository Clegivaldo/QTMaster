import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const cnpj = '10.520.565/0001-53';
  const client = await prisma.client.findFirst({ where: { cnpj } });
  console.log('Found client before update:', client);
  if (!client) return;

  const updated = await prisma.client.update({
    where: { id: client.id },
    data: { street: 'Rua Atualizada', city: 'Cidade Atualizada', complement: 'Sala 100' },
  });

  console.log('Updated client:', updated);

  const reloaded = await prisma.client.findUnique({ where: { id: client.id } });
  console.log('Reloaded client:', reloaded);

  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
