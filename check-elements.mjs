import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTemplateElements() {
  try {
    const templates = await prisma.editorTemplate.findMany({
      select: { id: true, name: true, elements: true }
    });

    console.log('Checking template elements...');
    templates.forEach(t => {
      console.log(`\nTemplate: ${t.name} (${t.id})`);
      if (t.elements && Array.isArray(t.elements)) {
        t.elements.forEach((el, index) => {
          console.log(`  Element ${index}: type=${el.type}`);
          console.log(`    content=${JSON.stringify(el.content)}`);
          console.log(`    position=${JSON.stringify(el.position)}`);
          console.log(`    size=${JSON.stringify(el.size)}`);
          console.log(`    hasPosition=${!!el.position}, hasSize=${!!el.size}`);
          if (!el.position || !el.size) {
            console.log(`    WARNING: Element ${index} missing position or size!`);
          }
        });
      } else {
        console.log('  No elements array');
      }
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplateElements();