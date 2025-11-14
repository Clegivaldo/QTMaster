import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const cnpj = '10.520.565/0001-53';
  const client = await prisma.client.findFirst({ where: { cnpj } });
  console.log(client ? client.id : 'NOT_FOUND');
  await prisma.$disconnect();
})();
