import { editorTemplateRenderer } from './dist/services/editorTemplateRenderer.js';
import { PrismaClient } from '@prisma/client';

async function testEditorTemplateRenderer() {
  const prisma = new PrismaClient();

  try {
    // Get a template
    const template = await prisma.editorTemplate.findFirst();
    if (!template) {
      console.log('No templates found');
      return;
    }

    console.log('Testing template:', template.id);

    // Get a validation
    const validation = await prisma.validation.findFirst({
      include: {
        client: true,
        equipment: true,
        sensorData: true,
      },
    });

    if (!validation) {
      console.log('No validations found');
      return;
    }

    console.log('Testing with validation:', validation.id);

    // Prepare template data
    const templateData = {
      client: {
        name: validation.client.name,
        document: validation.client.cnpj || '',
        email: validation.client.email || undefined,
        phone: validation.client.phone || undefined,
      },
      validation: {
        id: validation.id,
        startDate: new Date(validation.createdAt),
        endDate: new Date(validation.updatedAt),
        temperatureStats: { min: 20, max: 30, avg: 25 },
        humidityStats: { min: 40, max: 60, avg: 50 },
      },
      sensors: validation.equipment ? [{
        id: validation.equipment.id,
        name: validation.equipment.name || undefined,
        serialNumber: validation.equipment.serialNumber,
        model: 'Test Model',
      }] : [],
      sensorData: validation.sensorData.slice(0, 5).map((sd) => ({
        timestamp: new Date(sd.timestamp),
        temperature: sd.temperature,
        humidity: sd.humidity || undefined,
        sensorId: sd.sensorId,
      })),
      report: {
        generatedAt: new Date(),
        generatedBy: 'Test User',
      },
    };

    console.log('Template data prepared');

    // Test rendering
    const html = await editorTemplateRenderer.renderToHTML(template.id, templateData);
    console.log('HTML rendered successfully, length:', html.length);

  } catch (error) {
    console.error('Error testing editor template renderer:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEditorTemplateRenderer();