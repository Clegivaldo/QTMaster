import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { EditorTemplateRenderer } from './src/services/editorTemplateRenderer.js';
import { getReportGenerationService } from './src/services/serviceInstances.js';

const prisma = new PrismaClient();

async function run() {
  const id = randomUUID();
  try {
    console.log('Creating editor template in DB with id', id);

    const tableElement = {
      id: 'table-e2e-1',
      type: 'table',
      position: { x: 10, y: 10 },
      size: { width: 800, height: 300 },
      content: {
        dataSource: 'sensorData',
        columns: [
          { header: 'Timestamp', field: 'timestamp' },
          { header: 'Temperatura (°C)', field: 'temperature' },
          { header: 'Umidade (%)', field: 'humidity' }
        ],
        styles: {
          headerBackground: '#111827',
          headerColor: '#ffffff',
          borderColor: '#e5e7eb',
          fontSize: 12,
          alternateRows: true
        },
        pagination: { rowsPerPage: 50, showPageNumbers: false }
      },
      styles: {}
    };

    const template = await prisma.editorTemplate.create({
      data: {
        id,
        name: 'e2e-table-persistence-template',
        description: 'Template criado pelo script E2E para verificar persistência de tabela',
        category: 'e2e',
        elements: [tableElement],
        globalStyles: {},
        tags: ['e2e'],
        isPublic: false,
        createdBy: 'e2e-script',
        version: 1,
        revision: 0
      }
    });

    console.log('Template created:', template.id);

    // Prepare mock data similar to other mock scripts
    const now = Date.now();
    const sensorData = Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(now - (10 - i) * 15 * 60 * 1000).toISOString(),
      temperature: (5 + Math.random() * 2 - 1).toFixed(2),
      humidity: (60 + Math.random() * 10 - 5).toFixed(1),
      sensorId: 'sensor-1'
    }));

    const templateData = {
      client: { name: 'Cliente E2E Teste', document: '00.000.000/0000-00' },
      validation: {
        id: 'e2e-validation',
        startDate: new Date(now - 2 * 60 * 60 * 1000),
        endDate: new Date(now),
        temperatureStats: { min: 2, max: 8, avg: 5 }
      },
      sensors: [ { id: 'sensor-1', serialNumber: 'SN-E2E-1', model: 'Mock' } ],
      sensorData: sensorData.map(d => ({ timestamp: new Date(d.timestamp), temperature: parseFloat(d.temperature), humidity: parseFloat(d.humidity), sensorId: d.sensorId })),
      report: { generatedAt: new Date(), generatedBy: 'E2E Script' }
    };

    const renderer = new EditorTemplateRenderer();
    console.log('Rendering HTML from editor template...');
    const html = await renderer.renderToHTML(id, templateData);

    fs.writeFileSync('backend/e2e-mock-report.html', html, 'utf-8');
    console.log('✅ backend/e2e-mock-report.html saved');

    const svc = getReportGenerationService();
    const pdfBuffer = await svc.generatePDFFromHTML(html);
    fs.writeFileSync('backend/e2e-mock-report.pdf', pdfBuffer);
    console.log('✅ backend/e2e-mock-report.pdf saved (', pdfBuffer.length, 'bytes )');

    // Basic validation: ensure the generated HTML contains the table headers we set
    const hasTimestamp = html.includes('Timestamp');
    const hasTemp = html.includes('Temperatura (°C)');
    const hasHum = html.includes('Umidade (%)');

    if (hasTimestamp && hasTemp && hasHum) {
      console.log('✅ Table headers present in generated HTML');
    } else {
      console.warn('⚠️ Table headers NOT found in generated HTML - check renderer output');
    }

    // Clean up created template
    await prisma.editorTemplate.delete({ where: { id } });
    console.log('Cleaned up test template from DB');

  } catch (err) {
    console.error('E2E script error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
