import { PrismaClient } from '@prisma/client';

async function checkValidations() {
  const prisma = new PrismaClient();

  try {
    const validations = await prisma.validation.findMany({ take: 5 });
    console.log('Validações encontradas:', validations.map(v => ({ id: v.id, createdAt: v.createdAt })));
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkValidations();