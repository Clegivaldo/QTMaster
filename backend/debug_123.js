import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Get template 123
    const template = await prisma.editorTemplate.findFirst({
        where: { name: '123' }
    });

    if (!template) {
        console.log('Template 123 not found');
        return;
    }

    console.log('=== Template 123 Detailed Analysis ===');

    const pages = template.pages || [];
    const rootElements = template.elements || [];

    console.log('ROOT ELEMENTS count:', rootElements.length);
    console.log('PAGES count:', pages.length);

    console.log('\n--- ROOT ELEMENTS ---');
    for (const el of rootElements) {
        console.log('ID:', el.id);
        console.log('  Type:', el.type);
        console.log('  Content:', JSON.stringify(el.content)?.substring(0, 100));
    }

    console.log('\n--- PAGE 1 ELEMENTS ---');
    if (pages.length > 0) {
        const pageElements = pages[0].elements || [];
        console.log('Page 1 elements count:', pageElements.length);
        for (const el of pageElements) {
            console.log('ID:', el.id);
            console.log('  Type:', el.type);
            console.log('  Content:', JSON.stringify(el.content)?.substring(0, 100));
        }
    }

    // Check which root elements are NOT in page elements
    if (pages.length > 0) {
        const pageElements = pages[0].elements || [];
        const pageIds = new Set(pageElements.map(e => e.id));

        console.log('\n--- ROOT ELEMENTS NOT IN PAGE 1 ---');
        for (const el of rootElements) {
            if (!pageIds.has(el.id)) {
                console.log('MISSING:', el.id, '-', el.type);
            }
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
