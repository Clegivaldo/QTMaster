import puppeteer, { Browser } from 'puppeteer';
import handlebars from 'handlebars';
import path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { createHash } from 'crypto';
import { logger } from '../utils/logger.js';
import { redisService } from './redisService.js';
import { templateEngineService } from './templateEngineService.js';
import { formatDateShort, formatDateLong } from '../utils/formatDate.js';

interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface PDFGenerationOptions {
  format?: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
  header?: {
    height: string;
    template: string;
  };
  footer?: {
    height: string;
    template: string;
  };
  printBackground?: boolean;
  displayHeaderFooter?: boolean;
  preferCSSPageSize?: boolean;
  scale?: number;
}

interface ChartGenerationOptions {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar';
  data: any;
  options?: any;
  width?: number;
  height?: number;
}

export class PDFGenerationService {
  private browser: Browser | null = null;
  private maxConcurrentReports: number = 5;
  private currentReports: number = 0;
  private pendingReports: Array<() => void> = [];
  private templateCache = new Map<string, handlebars.TemplateDelegate>();
  private readonly MAX_CACHE_SIZE = 50;
  private readonly RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  };
  private readonly DEFAULT_OPTIONS: PDFGenerationOptions = {
    format: 'A4',
    orientation: 'portrait',
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '20mm',
      right: '20mm',
    },
    printBackground: true,
    displayHeaderFooter: false,
    preferCSSPageSize: true,
    scale: 1,
  };

  constructor() {
    this.setupHandlebarsHelpers();
    this.maxConcurrentReports = Number(process.env.MAX_CONCURRENT_REPORTS) || 5;
  }

  async initialize(): Promise<void> {
    if (this.browser) {
      return; // Já inicializado
    }

    try {
      const defaultArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ];

      // Avoid passing --single-process on Windows (known issues on Win32)
      // Note: --single-process can cause Chromium to crash on some Linux/Alpine builds.
      // We avoid adding it by default; set FORCE_SINGLE_PROCESS=true to enable if needed.
      if (process.env.FORCE_SINGLE_PROCESS === 'true') {
        defaultArgs.push('--single-process');
      }

      const launchOptions: any = {
        headless: true,
        args: defaultArgs,
      };

      // If user provided an explicit executable path via env var, use it.
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      } else {
        // Probe common Chromium/Chrome locations inside containers
        const candidates = [
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/google-chrome',
          '/snap/bin/chromium',
        ];

        for (const p of candidates) {
          try {
            if (existsSync(p)) {
              launchOptions.executablePath = p;
              logger.debug('Found Chromium executable', { path: p });
              break;
            }
          } catch (e) {
            // ignore
          }
        }
      }

      logger.debug('Launching Puppeteer with options', { launchOptions });

      try {
        this.browser = await puppeteer.launch(launchOptions);
      } catch (launchErr) {
        logger.error('Puppeteer launch failed, dumping stderr/stack', launchErr instanceof Error ? launchErr.stack : String(launchErr));
        throw launchErr;
      }

      logger.info('Serviço de geração de PDF inicializado com sucesso');
    } catch (error) {
      logger.error('Erro ao inicializar Puppeteer', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const hint = 'Verifique se o Chromium está disponível ou defina PUPPETEER_EXECUTABLE_PATH.';
      throw new Error(`Falha ao inicializar serviço de PDF: ${errorMsg} - ${hint}`);
    }
  }

  async generatePDF(
    templateContent: string,
    data: any,
    options: Partial<PDFGenerationOptions> = {}
  ): Promise<Buffer> {
    // Validar dados antes da renderização
    this.validateRenderData(data);

    // Tentar gerar PDF com retry logic
    return this.retryOperation(
      async () => this.generatePDFInternal(templateContent, data, options),
      'generatePDF'
    );
  }

  private async generatePDFInternal(
    templateContent: string,
    data: any,
    options: Partial<PDFGenerationOptions> = {}
  ): Promise<Buffer> {
    if (!this.browser) {
      await this.initialize();
    }

    const startTime = Date.now();
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };

    let page = null;

    try {
      // Renderizar template HTML
      const html = await this.renderHTMLTemplate(templateContent, data);

      // Adicionar estilos CSS
      const styledHTML = await this.addStyles(html, finalOptions);

      // Criar nova página
      page = await this.browser!.newPage();

      // Configurar viewport
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 1,
      });

      // Increase navigation timeout for complex templates (use env var if available)
      const reportTimeout = Number(process.env.REPORT_GENERATION_TIMEOUT) || 120000;
      await page.setDefaultNavigationTimeout(reportTimeout);
      await page.setDefaultTimeout(reportTimeout);

      // Configure request interception to avoid external third-party resources
      // (e.g. Google fonts/analytics) that may stall rendering.
      try {
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          const url = req.url();
          // Block remote fonts and analytics to speed up rendering and avoid timeouts
          if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com') || url.includes('google-analytics.com') || url.includes('googletagmanager.com')) {
            req.abort();
            return;
          }
          // Allow other resources
          req.continue();
        });
      } catch (err) {
        logger.debug('Request interception not supported or already enabled', err instanceof Error ? err.message : String(err));
      }

      // Definir conteúdo da página e aguardar carregamento com uma timeout maior para templates grandes
      await page.setContent(styledHTML, {
        waitUntil: ['load', 'networkidle2'],
        timeout: 60000,
      });

      // Aguardar carregamento de fontes e imagens (se houver)
      try {
        await page.evaluateHandle('document.fonts.ready');
      } catch (err) {
        // Não bloquear caso não seja suportado
        logger.debug('document.fonts.ready not available or timed out', err instanceof Error ? err.message : String(err));
      }

      // Gerar PDF
      const pdfBuffer = await page.pdf({
        format: finalOptions.format ?? 'A4',
        landscape: finalOptions.orientation === 'landscape',
        margin: finalOptions.margin ?? { top: '20px', bottom: '20px', left: '20px', right: '20px' },
        printBackground: finalOptions.printBackground ?? true,
        displayHeaderFooter: finalOptions.displayHeaderFooter ?? false,
        headerTemplate: finalOptions.header?.template || '',
        footerTemplate: finalOptions.footer?.template || '',
        preferCSSPageSize: finalOptions.preferCSSPageSize ?? false,
        scale: finalOptions.scale ?? 1,
      });

      const processingTime = Date.now() - startTime;
      logger.info(`PDF gerado com sucesso em ${processingTime}ms`, {
        size: pdfBuffer.length,
        format: finalOptions.format,
        orientation: finalOptions.orientation,
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao gerar PDF', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao gerar PDF: ${errorMsg}`);
    } finally {
      if (page) {
        await page.close().catch((err) => logger.warn('Erro ao fechar página', err));
      }
    }
  }

  private async acquireSlot(): Promise<void> {
    if (this.currentReports < this.maxConcurrentReports) {
      this.currentReports++;
      return;
    }

    await new Promise<void>((resolve) => {
      this.pendingReports.push(() => {
        this.currentReports++;
        resolve();
      });
    });
  }

  private releaseSlot(): void {
    this.currentReports = Math.max(0, this.currentReports - 1);
    const next = this.pendingReports.shift();
    if (next) next();
  }

  async generateReportPDF(
    templateId: string,
    validationId: string,
    userId: string,
    options: Partial<PDFGenerationOptions> = {}
  ): Promise<{
    pdfBuffer: Buffer;
    metadata: {
      pageCount: number;
      fileSize: number;
      processingTime: number;
      warnings: string[];
      errors: string[];
    };
  }> {
    const startTime = Date.now();

    try {
      // Buscar template
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template não encontrado: ${templateId}`);
      }

      // Renderizar template com dados
      const renderResult = await templateEngineService.renderTemplate(
        templateId,
        validationId,
        userId,
        { cache: true }
      );

      if (renderResult.errors.length > 0) {
        logger.warn('Erros durante renderização do template', renderResult.errors);
      }

      // Gerar PDF
      const pdfBuffer = await this.generatePDF(renderResult.html, {}, {
        ...this.getDefaultReportOptions(),
        ...options,
      });

      // Calcular metadata
      const processingTime = Date.now() - startTime;
      const metadata = {
        pageCount: await this.getPageCount(pdfBuffer),
        fileSize: pdfBuffer.length,
        processingTime,
        warnings: renderResult.warnings,
        errors: renderResult.errors,
      };

      return { pdfBuffer, metadata };
    } catch (error) {
      logger.error('Erro ao gerar relatório PDF', error);
      throw error;
    }
  }

  async generateFromEditorTemplate(
    templateId: string,
    validationId: string,
    userId: string,
    options: Partial<PDFGenerationOptions> = {}
  ): Promise<{
    pdfBuffer: Buffer;
    metadata: {
      pageCount: number;
      fileSize: number;
      processingTime: number;
      warnings: string[];
      errors: string[];
    };
  }> {
    const startTime = Date.now();

    try {
      await this.acquireSlot();
      // Import renderer dynamically to avoid circular dependencies
      const { editorTemplateRenderer } = await import('./editorTemplateRenderer.js');
      const { prisma } = await import('../lib/prisma.js');

      // Fetch validation data
      const validation = await prisma.validation.findUnique({
        where: { id: validationId },
        include: {
          client: true,
          equipment: {
            include: {
              equipmentType: true,
            },
          },
          sensorData: {
            include: {
              sensor: {
                include: {
                  type: true,
                },
              },
            },
            orderBy: {
              timestamp: 'asc',
            },
          },
          cycles: {
            orderBy: {
              startAt: 'asc'
            }
          },
        },
      });

      if (!validation) {
        throw new Error(`Validation not found: ${validationId}`);
      }

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      // Calculate statistics
      // Filter hidden sensors
      const hiddenSensorIds = new Set((validation as any).hiddenSensorIds || []);
      let activeSensorData = validation.sensorData.filter((sd: any) => !hiddenSensorIds.has(sd.sensorId));

      // Filter by date range if configured
      const chartConfig = (validation as any).chartConfig;
      if (chartConfig?.dateRange?.start && chartConfig?.dateRange?.end) {
        const startTime = new Date(chartConfig.dateRange.start).getTime();
        const endTime = new Date(chartConfig.dateRange.end).getTime();

        if (!isNaN(startTime) && !isNaN(endTime)) {
          activeSensorData = activeSensorData.filter((sd: any) => {
            const time = new Date(sd.timestamp).getTime();
            return time >= startTime && time <= endTime;
          });
        }
      }

      // Calculate statistics using only active sensors
      const temperatures = activeSensorData.map((d: any) => d.temperature).filter((t: any) => t !== null);
      const humidities = activeSensorData.map((d: any) => d.humidity).filter((h: any) => h !== null);

      const temperatureStats = temperatures.length > 0 ? {
        min: Math.min(...temperatures),
        max: Math.max(...temperatures),
        avg: temperatures.reduce((a: number, b: number) => a + b, 0) / temperatures.length,
      } : { min: 0, max: 0, avg: 0 };

      const humidityStats = humidities.length > 0 ? {
        min: Math.min(...humidities),
        max: Math.max(...humidities),
        avg: humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length,
      } : undefined;

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
          minTemperature: (validation as any).minTemperature,
          maxTemperature: (validation as any).maxTemperature,
          temperatureStats,
          humidityStats,
          temperatureStats,
          humidityStats,
          chartConfig: (validation as any).chartConfig,
          cycles: (validation as any).cycles || [],
        },
        sensors: validation.equipment ? [{
          id: validation.equipment.id,
          name: validation.equipment.name || undefined,
          serialNumber: validation.equipment.serialNumber,
          model: validation.equipment.equipmentType.name || 'Unknown',
        }] : [],
        sensorData: activeSensorData.map((sd: any) => ({
          timestamp: new Date(sd.timestamp),
          temperature: sd.temperature,
          humidity: sd.humidity || undefined,
          sensorId: sd.sensorId,
        })),
        report: {
          generatedAt: new Date(),
          generatedBy: user?.name || 'Sistema',
        },
        chartRangeStartIso: chartConfig?.dateRange?.start ? new Date(chartConfig.dateRange.start).toISOString() : null,
        chartRangeEndIso: chartConfig?.dateRange?.end ? new Date(chartConfig.dateRange.end).toISOString() : null,
      };

      // Render template to HTML
      const html = await editorTemplateRenderer.renderToHTML(templateId, templateData as any);

      // Generate PDF
      const pdfBuffer = await this.generatePDF(html, {}, {
        ...this.getDefaultReportOptions(),
        ...options,
      });

      const processingTime = Date.now() - startTime;
      logger.info(`PDF gerado de editor template em ${processingTime}ms`, {
        templateId,
        validationId,
        size: pdfBuffer.length,
      });

      return {
        pdfBuffer,
        metadata: {
          pageCount: await this.getPageCount(pdfBuffer),
          fileSize: pdfBuffer.length,
          processingTime,
          warnings: [],
          errors: [],
        },
      };
    } catch (error) {
      logger.error('Erro ao gerar PDF de editor template', { error, templateId, validationId });
      throw error;
    } finally {
      // Release the concurrency slot even on failure
      this.releaseSlot();
    }
  }

  async generateHTMLFromEditorTemplate(
    templateId: string,
    validationId: string,
    userId: string
  ): Promise<string> {
    try {
      // Import renderer dynamically to avoid circular dependencies
      const { editorTemplateRenderer } = await import('./editorTemplateRenderer.js');
      const { prisma } = await import('../lib/prisma.js');

      // Fetch validation data
      const validation = await prisma.validation.findUnique({
        where: { id: validationId },
        include: {
          client: true,
          equipment: {
            include: {
              equipmentType: true,
            },
          },
          sensorData: {
            include: {
              sensor: {
                include: {
                  type: true,
                },
              },
            },
            orderBy: {
              timestamp: 'asc',
            },
          },
        },
      });

      if (!validation) {
        throw new Error(`Validation not found: ${validationId}`);
      }

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      // Calculate statistics
      const temperatures = validation.sensorData.map((d: any) => d.temperature).filter((t: any) => t !== null);
      const humidities = validation.sensorData.map((d: any) => d.humidity).filter((h: any) => h !== null);

      const temperatureStats = temperatures.length > 0 ? {
        min: Math.min(...temperatures),
        max: Math.max(...temperatures),
        avg: temperatures.reduce((a: number, b: number) => a + b, 0) / temperatures.length,
      } : { min: 0, max: 0, avg: 0 };

      const humidityStats = humidities.length > 0 ? {
        min: Math.min(...humidities),
        max: Math.max(...humidities),
        avg: humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length,
      } : undefined;

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
          temperatureStats,
          humidityStats,
        },
        sensors: validation.equipment ? [{
          id: validation.equipment.id,
          name: validation.equipment.name || undefined,
          serialNumber: validation.equipment.serialNumber,
          model: validation.equipment.equipmentType.name || 'Unknown',
        }] : [],
        sensorData: validation.sensorData.map((sd: any) => ({
          timestamp: new Date(sd.timestamp),
          temperature: sd.temperature,
          humidity: sd.humidity || undefined,
          sensorId: sd.sensorId,
        })),
        report: {
          generatedAt: new Date(),
          generatedBy: user?.name || 'Sistema',
        },
      };

      // Render template to HTML
      const html = await editorTemplateRenderer.renderToHTML(templateId, templateData as any);

      // Add styles for preview
      const styledHTML = await this.addStyles(html, this.DEFAULT_OPTIONS);

      return styledHTML;
    } catch (error) {
      logger.error('Erro ao gerar HTML de editor template', { error, templateId, validationId });
      throw error;
    }
  }

  private async renderHTMLTemplate(templateContent: string, data: any): Promise<string> {
    const cacheKey = `pdf_template:${Buffer.from(templateContent).toString('base64').slice(0, 30)}`;

    // Verificar cache
    if (this.templateCache.has(cacheKey)) {
      const compiledTemplate = this.templateCache.get(cacheKey)!;
      return compiledTemplate(data);
    }

    // Compilar template
    let compiledTemplate: handlebars.TemplateDelegate;

    try {
      compiledTemplate = handlebars.compile(templateContent, {
        strict: false,
        noEscape: false,
        preventIndent: true,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Erro ao compilar template: ${errorMsg}`);
    }

    // Armazenar no cache (limitar tamanho)
    if (this.templateCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.templateCache.keys().next().value;
      if (firstKey !== undefined) {
        this.templateCache.delete(firstKey);
      }
    }

    this.templateCache.set(cacheKey, compiledTemplate);

    // Renderizar
    return compiledTemplate(data);
  }

  private async addStyles(html: string, options: PDFGenerationOptions): Promise<string> {
    const css = `
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #374151;
          background: white;
        }
        
        .report-container {
          padding: 20px;
          max-width: 100%;
          min-height: 100vh;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        .avoid-break {
          page-break-inside: avoid;
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 12px;
        }
        
        .table th,
        .table td {
          border: 1px solid #d1d5db;
          padding: 8px 12px;
          text-align: left;
          vertical-align: top;
        }
        
        .table th {
          background-color: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        
        .table tbody tr:nth-child(even) {
          background-color: #f9fafb;
        }
        
        .chart-container {
          margin: 20px 0;
          text-align: center;
          page-break-inside: avoid;
        }
        
        .chart {
          max-width: 100%;
          height: auto;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #3b82f6;
        }
        
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #d1d5db;
          font-size: 12px;
          color: #6b7280;
        }
        
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .font-normal { font-weight: 400; }
        
        .text-red-500 { color: #ef4444; }
        .text-green-500 { color: #10b981; }
        .text-blue-500 { color: #3b82f6; }
        .text-yellow-500 { color: #f59e0b; }
        .text-gray-500 { color: #6b7280; }
        .text-gray-700 { color: #374151; }
        
        .bg-red-50 { background-color: #fef2f2; }
        .bg-green-50 { background-color: #f0fdf4; }
        .bg-blue-50 { background-color: #eff6ff; }
        .bg-yellow-50 { background-color: #fffbeb; }
        
        .border-red-200 { border-color: #fecaca; }
        .border-green-200 { border-color: #bbf7d0; }
        .border-blue-200 { border-color: #bfdbfe; }
        .border-yellow-200 { border-color: #fde68a; }
        
        .p-2 { padding: 8px; }
        .p-4 { padding: 16px; }
        .p-6 { padding: 24px; }
        
        .m-2 { margin: 8px; }
        .m-4 { margin: 16px; }
        .m-6 { margin: 24px; }
        
        .mb-2 { margin-bottom: 8px; }
        .mb-4 { margin-bottom: 16px; }
        .mb-6 { margin-bottom: 24px; }
        
        .mt-2 { margin-top: 8px; }
        .mt-4 { margin-top: 16px; }
        .mt-6 { margin-top: 24px; }
        
        .text-xs { font-size: 12px; }
        .text-sm { font-size: 14px; }
        .text-base { font-size: 16px; }
        .text-lg { font-size: 18px; }
        .text-xl { font-size: 20px; }
        .text-2xl { font-size: 24px; }
        
        .grid {
          display: grid;
          gap: 16px;
        }
        
        .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
        .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
        .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
        
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
        
        /* Estilos específicos para cabeçalho e rodapé */
        @page {
          margin: ${options.margin?.top || '20mm'} ${options.margin?.right || '20mm'} ${options.margin?.bottom || '20mm'} ${options.margin?.left || '20mm'};
        }
        
        .pdf-header {
          font-size: 10px;
          color: #6b7280;
          text-align: center;
          width: 100%;
        }
        
        .pdf-footer {
          font-size: 10px;
          color: #6b7280;
          text-align: center;
          width: 100%;
        }
      </style>
    `;

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Relatório</title>
          ${css}
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="report-container">
            ${html}
          </div>
        </body>
      </html>
    `;
  }

  private setupHandlebarsHelpers(): void {
    // Helper para formatação de data (padroniza para dd/MM/yy HH:mm)
    handlebars.registerHelper('formatDate', (date, format) => {
      if (!date) return '';
      switch (format) {
        case 'short':
          return formatDateShort(date);
        case 'long':
          return formatDateLong(date);
        case 'datetime':
          return formatDateShort(date);
        case 'iso':
          return new Date(date).toISOString();
        case 'time':
          return formatDateShort(date).split(' ')[1] || '';
        default:
          return formatDateShort(date);
      }
    });

    // Helper para formatação de números
    handlebars.registerHelper('formatNumber', (number, decimals) => {
      if (number === null || number === undefined) return '';
      return Number(number).toFixed(decimals || 2);
    });

    // Helper para temperatura
    handlebars.registerHelper('formatTemperature', (temp, decimals) => {
      if (temp === null || temp === undefined) return '';
      return `${Number(temp).toFixed(decimals || 1)} °C`;
    });

    // Helper para umidade
    handlebars.registerHelper('formatHumidity', (humidity, decimals) => {
      if (humidity === null || humidity === undefined) return '';
      return `${Number(humidity).toFixed(decimals || 1)} %`;
    });

    // Helper para condicional
    handlebars.registerHelper('ifEquals', (arg1, arg2, options) => {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    handlebars.registerHelper('ifNotEquals', (arg1, arg2, options) => {
      return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
    });

    // Helper para comparação numérica
    handlebars.registerHelper('ifGreaterThan', (arg1, arg2, options) => {
      return (arg1 > arg2) ? options.fn(this) : options.inverse(this);
    });

    handlebars.registerHelper('ifLessThan', (arg1, arg2, options) => {
      return (arg1 < arg2) ? options.fn(this) : options.inverse(this);
    });

    // Helper para iteração com índice
    handlebars.registerHelper('eachWithIndex', (array, options) => {
      let result = '';
      if (Array.isArray(array)) {
        array.forEach((item, index) => {
          result += options.fn({ ...item, index: index + 1, first: index === 0, last: index === array.length - 1 });
        });
      }
      return result;
    });

    // Helper para formatação de moeda
    handlebars.registerHelper('formatCurrency', (value, currency) => {
      if (value === null || value === undefined) return '';
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency || 'BRL',
      }).format(value);
    });

    // Helper para formatação de percentual
    handlebars.registerHelper('formatPercentage', (value, decimals) => {
      if (value === null || value === undefined) return '';
      return `${Number(value).toFixed(decimals || 1)} %`;
    });

    // Helper para formatação de CNPJ/CPF
    handlebars.registerHelper('formatCNPJ', (cnpj) => {
      if (!cnpj) return '';
      const cleaned = cnpj.replace(/\D/g, '');
      if (cleaned.length === 14) {
        return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      }
      return cnpj;
    });

    // Helper para formatação de telefone
    handlebars.registerHelper('formatPhone', (phone) => {
      if (!phone) return '';
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length === 11) {
        return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      } else if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      }
      return phone;
    });

    // Helper para truncar texto
    handlebars.registerHelper('truncate', (text, length) => {
      if (!text) return '';
      if (text.length <= length) return text;
      return text.substring(0, length) + '...';
    });

    // Helper para uppercase
    handlebars.registerHelper('uppercase', (text) => {
      return text ? text.toString().toUpperCase() : '';
    });

    // Helper para lowercase
    handlebars.registerHelper('lowercase', (text) => {
      return text ? text.toString().toLowerCase() : '';
    });

    // Helper para capitalize
    handlebars.registerHelper('capitalize', (text) => {
      if (!text) return '';
      return text.toString().charAt(0).toUpperCase() + text.toString().slice(1).toLowerCase();
    });
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.RETRY_OPTIONS.initialDelay;

    for (let attempt = 1; attempt <= this.RETRY_OPTIONS.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.RETRY_OPTIONS.maxRetries) {
          logger.error(`${operationName} falhou após ${attempt} tentativas`, {
            error: lastError.message,
            attempts: attempt,
          });
          break;
        }

        logger.warn(`${operationName} falhou (tentativa ${attempt}/${this.RETRY_OPTIONS.maxRetries})`, {
          error: lastError.message,
          nextRetryIn: delay,
        });

        // Aguardar antes de tentar novamente
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Aumentar delay para próxima tentativa (exponential backoff)
        delay = Math.min(
          delay * this.RETRY_OPTIONS.backoffMultiplier,
          this.RETRY_OPTIONS.maxDelay
        );

        // Verificar se browser ainda está ativo, caso contrário reinicializar
        if (this.browser && !this.browser.isConnected()) {
          logger.warn('Browser desconectado, reinicializando...');
          await this.close();
          await this.initialize();
        }
      }
    }

    throw lastError || new Error(`${operationName} falhou após múltiplas tentativas`);
  }

  private validateRenderData(data: any): void {
    if (data === null || data === undefined) {
      throw new Error('Dados de renderização não podem ser nulos');
    }

    // Validar estrutura básica de dados
    if (typeof data === 'object') {
      // Verificar se há propriedades circulares
      try {
        JSON.stringify(data);
      } catch (error) {
        throw new Error('Dados contêm referências circulares');
      }

      // Validar tipos de dados críticos
      if ('validation' in data && data.validation) {
        if (!data.validation.id) {
          throw new Error('Validação deve ter um ID');
        }
      }

      if ('client' in data && data.client) {
        if (!data.client.name && !data.client.companyName) {
          logger.warn('Cliente sem nome ou razão social');
        }
      }

      if ('sensors' in data && data.sensors) {
        if (!Array.isArray(data.sensors)) {
          throw new Error('Sensores devem ser um array');
        }

        data.sensors.forEach((sensor: any, index: number) => {
          if (!sensor.id) {
            throw new Error(`Sensor na posição ${index} não tem ID`);
          }
        });
      }
    }

    logger.debug('Dados de renderização validados com sucesso');
  }

  private getDefaultReportOptions(): PDFGenerationOptions {
    return {
      format: 'A4',
      orientation: 'portrait',
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm',
      },
      header: {
        height: '15mm',
        template: `
          <div class="pdf-header">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        `,
      },
      footer: {
        height: '10mm',
        template: `
          <div class="pdf-footer">
            Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
          </div>
        `,
      },
      printBackground: true,
      displayHeaderFooter: true,
      preferCSSPageSize: true,
    };
  }

  private async getTemplate(templateId: string): Promise<any> {
    // TODO: Implementar acesso ao template via API pública do templateEngineService
    // Por enquanto, importar diretamente do prisma
    const { prisma } = await import('../lib/prisma.js');
    return prisma.editorTemplate.findUnique({ where: { id: templateId } });
  }

  private async getPageCount(pdfBuffer: Buffer): Promise<number> {
    // Esta é uma estimativa - em produção, você pode querer usar uma biblioteca específica
    // para contar páginas ou extrair metadata do PDF
    return 1; // Simplificado para este exemplo
  }

  async generateChartImage(
    chartData: ChartGenerationOptions,
    outputPath?: string
  ): Promise<string> {
    // Implementar geração de gráficos como imagem
    // Por enquanto, retornar um placeholder
    if (outputPath) {
      return outputPath;
    }

    // Gerar gráfico simples usando HTML/CSS
    const chartHTML = this.generateSimpleChart(chartData);
    const chartBuffer = await this.generatePDFFromHTML(chartHTML);

    // Salvar como imagem (simplificado)
    const tempPath = `/tmp/chart_${Date.now()}.png`;
    await fs.writeFile(tempPath, chartBuffer);

    return tempPath;
  }

  private generateSimpleChart(options: ChartGenerationOptions): string {
    // Gerar gráfico simples em HTML para demonstração
    return `
      <div class="chart-container">
        <div style="width: 100%; height: 300px; background: linear-gradient(90deg, #3b82f6 0%, #10b981 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; border-radius: 8px;">
          Gráfico ${options.type.toUpperCase()} - ${options.data.length} pontos
        </div>
      </div>
    `;
  }

  private async generatePDFFromHTML(html: string): Promise<Buffer> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();

    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      return Buffer.from(await page.screenshot({ type: 'png', fullPage: true }));
    } finally {
      await page.close();
    }
  }

  /**
   * Generate cache key for PDF based on template, validation and data
   */
  private generatePDFCacheKey(
    templateId: string,
    validationId: string,
    additionalData?: any
  ): string {
    const dataString = JSON.stringify({
      templateId,
      validationId,
      additional: additionalData || {},
    });
    const hash = createHash('sha256').update(dataString).digest('hex');
    return `pdf:cache:${hash}`;
  }

  /**
   * Get cached PDF if available
   */
  async getCachedPDF(
    templateId: string,
    validationId: string,
    additionalData?: any
  ): Promise<Buffer | null> {
    try {
      const cacheKey = this.generatePDFCacheKey(templateId, validationId, additionalData);
      const cached = await redisService.get(cacheKey);

      if (cached) {
        logger.info('PDF cache hit', { templateId, validationId });
        // Redis stores as base64 string
        return Buffer.from(cached, 'base64');
      }

      logger.debug('PDF cache miss', { templateId, validationId });
      return null;
    } catch (error) {
      logger.error('Error getting cached PDF', { error, templateId, validationId });
      return null;
    }
  }

  /**
   * Cache PDF with TTL (default 1 hour)
   */
  async cachePDF(
    templateId: string,
    validationId: string,
    pdfBuffer: Buffer,
    ttl: number = 3600,
    additionalData?: any
  ): Promise<boolean> {
    try {
      const cacheKey = this.generatePDFCacheKey(templateId, validationId, additionalData);
      // Store as base64 string in Redis
      const base64PDF = pdfBuffer.toString('base64');
      const success = await redisService.set(cacheKey, base64PDF, ttl);

      if (success) {
        logger.info('PDF cached successfully', {
          templateId,
          validationId,
          size: pdfBuffer.length,
          ttl
        });
      }

      return success;
    } catch (error) {
      logger.error('Error caching PDF', { error, templateId, validationId });
      return false;
    }
  }

  /**
   * Invalidate PDF cache for a specific template or validation
   */
  async invalidatePDFCache(templateId?: string, validationId?: string): Promise<number> {
    try {
      let pattern = 'pdf:cache:*';

      if (templateId && validationId) {
        // Invalidate specific cache
        const cacheKey = this.generatePDFCacheKey(templateId, validationId);
        const deleted = await redisService.del(cacheKey);
        return deleted ? 1 : 0;
      } else if (templateId || validationId) {
        // Invalidate all caches matching pattern
        // Note: This is a simplified approach. For production, consider storing
        // a mapping of templateId/validationId to cache keys
        const count = await redisService.invalidatePattern(pattern);
        logger.info('Invalidated PDF cache', { templateId, validationId, count });
        return count;
      }

      return 0;
    } catch (error) {
      logger.error('Error invalidating PDF cache', { error, templateId, validationId });
      return 0;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.templateCache.clear();
      logger.info('Serviço de geração de PDF encerrado');
    }
  }

  async clearCache(): Promise<void> {
    this.templateCache.clear();
    logger.info('Cache de templates limpo');
  }

  async clearPDFCache(): Promise<number> {
    const count = await redisService.invalidatePattern('pdf:cache:*');
    logger.info('PDF cache cleared', { count });
    return count;
  }

  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.templateCache.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }
}

// Singleton instance
export const pdfGenerationService = new PDFGenerationService();

// Função auxiliar para inicialização automática
export async function initializePDFService(): Promise<void> {
  await pdfGenerationService.initialize();
}

// Função auxiliar para limpeza
export async function cleanupPDFService(): Promise<void> {
  await pdfGenerationService.close();
}
