import puppeteer from 'puppeteer';
import type { TemplateService } from './templateService.js';
import { getTemplateService } from './templateServiceInstance.js';
import { prisma } from '../lib/prisma.js';
import { formatDateShort } from '../utils/formatDate.js';

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
    chartConfig?: any;
  };
  client: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    cnpj?: string | null;
    street?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    complement?: string | null;
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
  async generateReport(validationId: string, templateNameOrId: string = 'default-report'): Promise<Buffer> {
    // Buscar dados da validação
    const reportData = await this.getReportData(validationId);

    // Verificar se é um UUID ou CUID (template do banco)
    // CUIDs começam com 'c' e têm 25 caracteres, UUIDs têm 36 caracteres com hífens
    const isDatabaseId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateNameOrId) || /^c[a-z0-9]{20,}$/i.test(templateNameOrId);

    if (isDatabaseId) {
      // Usar EditorTemplateRenderer
      const { EditorTemplateRenderer } = await import('./editorTemplateRenderer.js');
      const renderer = new EditorTemplateRenderer();

      // Preparar dados no formato esperado pelo EditorTemplateRenderer
      const templateData = {
        client: {
          name: reportData.client.name,
          document: reportData.client.cnpj || undefined,
          email: reportData.client.email || undefined,
          phone: reportData.client.phone || undefined,
          address: reportData.client.address || undefined
        },
        validation: {
          id: reportData.validation.id,
          startDate: reportData.validation.createdAt,
          endDate: reportData.validation.updatedAt,
          temperatureStats: reportData.validation.statistics?.temperature || { min: 0, max: 0, avg: 0 },
          humidityStats: reportData.validation.statistics?.humidity,
          minTemperature: reportData.validation.minTemperature,
          maxTemperature: reportData.validation.maxTemperature,
          minHumidity: reportData.validation.minHumidity,
          maxHumidity: reportData.validation.maxHumidity,
          chartConfig: reportData.validation.chartConfig
        },
        sensors: reportData.sensors,
        sensorData: reportData.sensorData.map(d => ({
          timestamp: d.timestamp,
          temperature: d.temperature,
          humidity: d.humidity || undefined,
          sensorId: d.sensor.serialNumber
        })),
        report: {
          generatedAt: new Date(),
          generatedBy: reportData.user.name
        }
      };

      const html = await renderer.renderToHTML(templateNameOrId, templateData as any);
      return this.generatePDFFromHTML(html);
    }

    // Gerar gráficos usando Chart.js no HTML
    const chartData = this.prepareChartData(reportData.sensorData, reportData.validation.chartConfig);

    // Preparar dados para o template
    const templateData = this.templateService.prepareTemplateData(reportData, chartData);

    // Renderizar HTML
    const html = this.templateService.renderTemplate(templateNameOrId, templateData);

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
        chartConfig: validation.chartConfig
      },
      client: {
        id: validation.client.id,
        name: validation.client.name,
        email: validation.client.email,
        phone: validation.client.phone,
        address: validation.client.address,
        cnpj: validation.client.cnpj,
        street: validation.client.street,
        neighborhood: validation.client.neighborhood,
        city: validation.client.city,
        state: validation.client.state,
        complement: validation.client.complement,
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
  prepareChartData(sensorData: ReportData['sensorData'], chartConfig?: any) {
    // Filtrar dados baseado no dateRange se disponível
    if (!sensorData || sensorData.length === 0) {
      return {
        temperatureChart: JSON.stringify({ labels: [], datasets: [] }),
        humidityChart: null,
        chartRangeStartIso: null,
        chartRangeEndIso: null
      };
    }

    let filteredData = sensorData;
    if (chartConfig?.dateRange?.start && chartConfig?.dateRange?.end) {
      const startTime = new Date(chartConfig.dateRange.start).getTime();
      const endTime = new Date(chartConfig.dateRange.end).getTime();
      filteredData = sensorData.filter(d => {
        const dataTime = new Date(d.timestamp).getTime();
        return dataTime >= startTime && dataTime <= endTime;
      });
    }

    // Build datasets using {x: ISOtimestamp, y: value} so Chart.js time scale can
    // apply explicit min/max domain (chartRangeStartIso/chartRangeEndIso).
    const temperatureData = {
      datasets: [{
        label: 'Temperatura (°C)',
        data: filteredData.map(d => ({ x: new Date(d.timestamp).toISOString(), y: d.temperature })),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: false,
        parsing: false
      }]
    };

    const humidityData = filteredData.filter(d => d.humidity !== null && d.humidity !== undefined);
    const humidityChartData = humidityData.length > 0 ? {
      datasets: [{
        label: 'Umidade (%)',
        data: humidityData.map(d => ({ x: new Date(d.timestamp).toISOString(), y: d.humidity! })),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.1,
        fill: false,
        parsing: false
      }]
    } : null;

    // Determine explicit x-axis range (timestamps) if there is filtered data
    const startTs = filteredData.length > 0 ? new Date(filteredData[0].timestamp).toISOString() : null;
    const endTs = filteredData.length > 0 ? new Date(filteredData[filteredData.length - 1].timestamp).toISOString() : null;

    return {
      temperatureChart: JSON.stringify(temperatureData),
      humidityChart: humidityChartData ? JSON.stringify(humidityChartData) : null,
      chartRangeStartIso: startTs,
      chartRangeEndIso: endTs
    };
  }

  /**
   * Gera PDF usando Puppeteer a partir de HTML
   */
  async generatePDFFromHTML(html: string): Promise<Buffer> {
    let browser = null;

    try {
      // Escolher executablePath confiável para Chromium (prioriza env var)
      const candidatePaths = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/chrome'
      ].filter(Boolean) as string[];

      let executablePath: string | undefined;
      for (const p of candidatePaths) {
        try {
          const fsCheck = await import('fs');
          if (fsCheck.existsSync(p)) {
            executablePath = p;
            break;
          }
        } catch (_) {
          // ignore
        }
      }

      if (!executablePath) {
        console.warn('⚠️ Chromium executable not found in known paths, attempting default puppeteer binary');
      } else {
        console.info(`🧭 Using Chromium executable at: ${executablePath}`);
      }

      const launchOptions: any = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ],
        timeout: 60000,
        protocolTimeout: 60000
      };

      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }

      browser = await puppeteer.launch(launchOptions);

      const page = await browser.newPage();

      page.setDefaultTimeout(30000);
      page.setDefaultNavigationTimeout(30000);

      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px'
        }
      });

      // Ensure we return a Node Buffer
      return Buffer.from(pdfBuffer as Uint8Array);
    } catch (error) {
      console.error('Erro ao gerar PDF com Puppeteer:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}