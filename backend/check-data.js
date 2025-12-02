const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const validations = await prisma.validation.findMany({ take: 1 });
    console.log('Validações encontradas:', validations.length);

    if (validations.length > 0) {
      console.log('Primeira validação:', {
        id: validations[0].id,
        clientId: validations[0].clientId,
        equipmentId: validations[0].equipmentId
      });
    }

    const templates = await prisma.editorTemplate.findMany({ take: 1 });
    console.log('Templates encontrados:', templates.length);

    if (templates.length > 0) {
      console.log('Primeiro template:', {
        id: templates[0].id,
        name: templates[0].name
      });
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();