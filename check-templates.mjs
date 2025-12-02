import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTemplates() {
  try {
    const templates = await prisma.editorTemplate.findMany({
      select: { id: true, name: true, elements: true }
    });

    console.log('Templates encontrados:', templates.length);
    templates.forEach(t => {
      console.log(`ID: ${t.id}, Name: ${t.name}, Elements length: ${t.elements ? JSON.stringify(t.elements).length : 'NULL'}`);
      if (!t.elements || t.elements.length === 0) {
        console.log(`  Template ${t.id} has no elements!`);
      }
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplates();