import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

// Import renderer
import { EditorTemplateRenderer } from './src/services/editorTemplateRenderer.js';

async function main() {
    // Get template 123
    const template = await prisma.editorTemplate.findFirst({
        where: { name: '123' }
    });

    if (!template) {
        console.log('Template 123 not found');
        return;
    }

    console.log('=== Generating HTML for Template 123 ===');
    console.log('Template ID:', template.id);

    const renderer = new EditorTemplateRenderer();

    // Mock data (same as reportGenerationService would pass)
    const data = {
        client: {
            name: 'Cliente Teste ABC',
            document: '12.345.678/0001-90',
            email: 'cliente@teste.com',
            phone: '(11) 99999-9999'
        },
        validation: {
            id: 'validation-test',
            startDate: new Date(),
            endDate: new Date(),
            temperatureStats: { min: 2, max: 8, avg: 5 },
            humidityStats: { min: 30, max: 60, avg: 45 }
        },
        sensors: [],
        sensorData: [],
        report: {
            generatedAt: new Date(),
            generatedBy: 'Test User'
        }
    };

    try {
        const html = await renderer.renderToHTML(template.id, data);
        console.log('\n=== Generated HTML Stats ===');
        console.log('Length:', html.length);
        console.log('Contains body:', html.includes('<body'));
        console.log('Contains editor-element:', html.includes('editor-element'));

        // Save to file for inspection
        fs.writeFileSync('/app/generated_html_123.html', html);
        console.log('\nHTML saved to /app/generated_html_123.html');
        console.log('\nFirst 2000 chars:');
        console.log(html.substring(0, 2000));
    } catch (error) {
        console.error('Error rendering:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
