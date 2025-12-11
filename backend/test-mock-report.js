import { getReportGenerationService } from './src/services/serviceInstances.js';
import fs from 'fs';

async function run() {
  try {
    const svc = getReportGenerationService();

    const mockReportData = {
      validation: {
        id: 'mock-validation-id',
        name: 'Validação de Teste - Câmara Fria',
        description: 'Teste de qualificação térmica para câmara fria',
        minTemperature: 2.0,
        maxTemperature: 8.0,
        minHumidity: 45.0,
        maxHumidity: 75.0,
        isApproved: true,
        statistics: {
          avgTemperature: 5.2,
          minTemperature: 2.1,
          maxTemperature: 7.8,
          avgHumidity: 62.5
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      client: {
        id: 'mock-client-id',
        name: 'Empresa Teste Ltda',
        email: 'contato@empresateste.com.br',
        phone: '(11) 99999-9999',
        address: 'Rua Teste, 123 - São Paulo/SP',
        cnpj: '12.345.678/0001-90',
      },
      suitcase: {
        id: 'mock-suitcase-id',
        name: 'Maleta de Validação #001',
        description: 'Maleta com 4 sensores de temperatura e umidade',
      },
      sensors: [
        {
          id: 'sensor-1',
          serialNumber: 'SN001234',
          model: 'TempLog Pro',
          type: { name: 'Sensor de Temperatura e Umidade' }
        }
      ],
      sensorData: Array.from({ length: 20 }, (_, i) => ({
        id: `data-${i+1}`,
        timestamp: new Date(Date.now() - (20 - i) * 15 * 60 * 1000),
        temperature: 5.0 + Math.random() * 2 - 1,
        humidity: 60 + Math.random() * 10 - 5,
        sensor: { serialNumber: i % 2 === 0 ? 'SN001234' : 'SN001235', model: 'TempLog Pro' }
      })),
      user: { name: 'João Silva', email: 'joao.silva@empresa.com' }
    };

    // Prepare charts
    const chartData = svc.prepareChartData(mockReportData.sensorData);
    const templateData = svc.templateService.prepareTemplateData(mockReportData, chartData);
    const html = svc.templateService.renderTemplate('test-report', templateData);
    const pdfBuffer = await svc.generatePDFFromHTML(html);

    fs.writeFileSync('mock-test-report.pdf', pdfBuffer);
    console.log('✅ mock-test-report.pdf saved (', pdfBuffer.length, 'bytes )');
  } catch (err) {
    console.error('Error generating mock report:', err);
  }
}

run();
