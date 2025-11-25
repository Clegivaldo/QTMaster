import puppeteer from 'puppeteer';
import type { TemplateService } from './templateService.js';
import { getTemplateService } from './templateServiceInstance.js';
import { prisma } from '../lib/prisma.js';

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
     this.templateService = getTemplateService();
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
        id: validation.suitcase?.id ?? '',
        name: validation.suitcase?.name ?? '',
        description: validation.suitcase?.description ?? null,
      },
      sensors: validation.suitcase?.sensors ? validation.suitcase.sensors.map(ss => ({
        id: ss.sensor.id,
        serialNumber: ss.sensor.serialNumber,
        model: ss.sensor.model,
        type: {
          name: ss.sensor.type.name,
          description: ss.sensor.type.description,
        }
      })) : [],
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
    let browser = null;
    
    try {
      // Configuração otimizada para Docker com novo headless
      browser = await puppeteer.launch({
        headless: true, // Usar modo headless
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-ipc-flooding-protection'
        ],
        executablePath: '/usr/bin/chromium-browser',
        timeout: 30000,
        protocolTimeout: 30000
      });

      const page = await browser.newPage();
      
      // Configurar timeouts da página
      page.setDefaultTimeout(30000);
      page.setDefaultNavigationTimeout(30000);
      
      // Configurar página
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        timeout: 30000
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Erro na geração de PDF:', message);
      throw new Error(`Erro na geração de PDF: ${message}`);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.warn('⚠️ Erro ao fechar browser:', closeError);
        }
      }
    }
  }
}