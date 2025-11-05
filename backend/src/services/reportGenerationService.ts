import puppeteer from 'puppeteer';
import { TemplateService } from './templateService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ReportData {
  validation: {
    id: string;
    name: string;
    description?: string | null;
    minTemperature: number;
    maxTemperature: number;
    minHumidity?: number | null;
    maxHumidity?: number | null;
    isApproved?: boolean | null;
    statistics?: any;
    createdAt: Date;
    updatedAt: Date;
  };
  client: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    cnpj?: string | null;
  };
  suitcase: {
    id: string;
    name: string;
    description?: string | null;
  };
  sensors: Array<{
    id: string;
    serialNumber: string;
    model: string;
    type: {
      name: string;
      description?: string | null;
    };
  }>;
  sensorData: Array<{
    id: string;
    timestamp: Date;
    temperature: number;
    humidity?: number | null;
    sensor: {
      serialNumber: string;
      model: string;
    };
  }>;
  user: {
    name: string;
    email: string;
  };
}

export class ReportGenerationService {
  public templateService: TemplateService;

  constructor() {
    this.templateService = new TemplateService();
  }

  /**
   * Gera um relatório PDF completo
   */
  async generateReport(validationId: string, templateName: string = 'default-report'): Promise<Buffer> {
    // Buscar dados da validação
    const reportData = await this.getReportData(validationId);
    
    // Gerar gráficos usando Chart.js no HTML
    const chartData = this.prepareChartData(reportData.sensorData);

    // Preparar dados para o template
    const templateData = this.templateService.prepareTemplateData(reportData, chartData);

    // Renderizar HTML
    const html = this.templateService.renderTemplate(templateName, templateData);

    // Gerar PDF com Puppeteer
    return this.generatePDFFromHTML(html);
  }

  /**
   * Busca todos os dados necessários para o relatório
   */
  private async getReportData(validationId: string): Promise<ReportData> {
    const validation = await prisma.validation.findUnique({
      where: { id: validationId },
      include: {
        client: true,
        suitcase: {
          include: {
            sensors: {
              include: {
                sensor: {
                  include: {
                    type: true
                  }
                }
              }
            }
          }
        },
        user: true,
        sensorData: {
          include: {
            sensor: true
          },
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    });

    if (!validation) {
      throw new Error('Validação não encontrada');
    }

    return {
      validation: {
        id: validation.id,
        name: validation.name,
        description: validation.description,
        minTemperature: validation.minTemperature,
        maxTemperature: validation.maxTemperature,
        minHumidity: validation.minHumidity,
        maxHumidity: validation.maxHumidity,
        isApproved: validation.isApproved,
        statistics: validation.statistics,
        createdAt: validation.createdAt,
        updatedAt: validation.updatedAt,
      },
      client: {
        id: validation.client.id,
        name: validation.client.name,
        email: validation.client.email,
        phone: validation.client.phone,
        address: validation.client.address,
        cnpj: validation.client.cnpj,
      },
      suitcase: {
        id: validation.suitcase.id,
        name: validation.suitcase.name,
        description: validation.suitcase.description,
      },
      sensors: validation.suitcase.sensors.map(ss => ({
        id: ss.sensor.id,
        serialNumber: ss.sensor.serialNumber,
        model: ss.sensor.model,
        type: {
          name: ss.sensor.type.name,
          description: ss.sensor.type.description,
        }
      })),
      sensorData: validation.sensorData.map(sd => ({
        id: sd.id,
        timestamp: sd.timestamp,
        temperature: sd.temperature,
        humidity: sd.humidity,
        sensor: {
          serialNumber: sd.sensor.serialNumber,
          model: sd.sensor.model,
        }
      })),
      user: {
        name: validation.user.name,
        email: validation.user.email,
      }
    };
  }

  /**
   * Prepara dados para gráficos Chart.js
   */
  prepareChartData(sensorData: ReportData['sensorData']) {
    const temperatureData = {
      labels: sensorData.map(d => d.timestamp.toLocaleString('pt-BR')),
      datasets: [{
        label: 'Temperatura (°C)',
        data: sensorData.map(d => d.temperature),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    };

    const humidityData = sensorData.filter(d => d.humidity !== null && d.humidity !== undefined);
    const humidityChartData = humidityData.length > 0 ? {
      labels: humidityData.map(d => d.timestamp.toLocaleString('pt-BR')),
      datasets: [{
        label: 'Umidade (%)',
        data: humidityData.map(d => d.humidity!),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.1
      }]
    } : null;

    return {
      temperatureChart: JSON.stringify(temperatureData),
      humidityChart: humidityChartData ? JSON.stringify(humidityChartData) : null,
    };
  }

  /**
   * Gera PDF usando Puppeteer a partir de HTML
   */
  async generatePDFFromHTML(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      timeout: 60000,
      protocolTimeout: 60000
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }
}