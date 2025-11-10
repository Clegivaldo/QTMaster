import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function run() {
  const id = randomUUID();
  try {
    const template = await prisma.editorTemplate.create({
      data: {
        id,
        name: 'smoke-test-template',
        description: 'Created by smoke test',
        category: 'test',
        elements: [],
        globalStyles: {},
        tags: [],
        isPublic: false,
        createdBy: 'smoke-test-user',
        version: 1,
        revision: 0
      }
    });

    console.log('Created template:', template.id, template.name);

    // Clean up
    await prisma.editorTemplate.delete({ where: { id } });
    console.log('Deleted test template');
  } catch (err) {
    console.error('Error during test create:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
