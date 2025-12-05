import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Import renderer
import { EditorTemplateRenderer } from './src/services/editorTemplateRenderer.js';

async function main() {
    // Get template AABS
    const template = await prisma.editorTemplate.findFirst({
        where: { name: 'AABS' }
    });

    if (!template) {
        console.log('Template AABS not found');
        return;
    }

    console.log('=== Rendering Template AABS ===');
    console.log('Template ID:', template.id);

    const renderer = new EditorTemplateRenderer();

    // Mock data
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
        console.log('\n=== Generated HTML ===');
        console.log('Length:', html.length);
        console.log('Content:');
        console.log(html);
    } catch (error) {
        console.error('Error rendering:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
