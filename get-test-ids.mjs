import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getTestIds() {
  try {
    // Get validation
    const validation = await prisma.validation.findFirst({
      where: { validationNumber: 'VAL001' }
    });

    // Get a template (any template)
    const template = await prisma.editorTemplate.findFirst();

    console.log('Validation ID:', validation?.id);
    console.log('Template ID:', template?.id);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getTestIds();