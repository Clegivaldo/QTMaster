import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Get AABS template
    const template = await prisma.editorTemplate.findFirst({
        where: { name: 'AABS' }
    });

    if (!template) {
        console.log('Template AABS not found');
        return;
    }

    console.log('=== Template AABS Merge Simulation ===');

    const pages = template.pages || [];
    const rootElements = template.elements || [];

    // Build element map (same as renderer)
    const elementMap = new Map();
    for (const el of rootElements) {
        if (el && el.id) {
            elementMap.set(el.id, el);
        }
    }

    console.log('Element map size:', elementMap.size);
    console.log('Root element IDs:', Array.from(elementMap.keys()));

    if (pages.length > 0) {
        const pageElements = pages[0].elements || [];
        console.log('Page element IDs:', pageElements.map(e => e.id));

        const mergedElements = pageElements.map(pageEl => {
            const rootEl = elementMap.get(pageEl.id);
            console.log(`\nLooking up: ${pageEl.id}`);
            console.log('  Found in map:', !!rootEl);

            if (rootEl) {
                const merged = {
                    ...pageEl,
                    content: rootEl.content,
                    properties: rootEl.properties || pageEl.properties,
                    styles: rootEl.styles || pageEl.styles
                };
                console.log('  BEFORE merge - pageEl.content:', JSON.stringify(pageEl.content));
                console.log('  BEFORE merge - pageEl.properties:', JSON.stringify(pageEl.properties));
                console.log('  AFTER merge - merged.content:', JSON.stringify(merged.content));
                console.log('  AFTER merge - merged.properties:', JSON.stringify(merged.properties));
                console.log('  isDynamic:', merged.properties?.isDynamic);
                return merged;
            }
            return pageEl;
        });

        console.log('\n=== FINAL MERGED ELEMENTS ===');
        for (const el of mergedElements) {
            console.log('ID:', el.id);
            console.log('  finalContent:', JSON.stringify(el.content));
            console.log('  finalProperties:', JSON.stringify(el.properties));
            console.log('  isDynamic:', el.properties?.isDynamic);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
