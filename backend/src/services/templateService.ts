import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { ReportData } from './reportGenerationService.js';

export class TemplateService {
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.registerHelpers();
    this.loadTemplates();
  }

  /**
   * Registra helpers do Handlebars
   */
  private registerHelpers() {
    // Helper para formatar datas
    Handlebars.registerHelper('formatDate', (date: Date) => {
      return date.toLocaleDateString('pt-BR');
    });

    // Helper para formatar data e hora
    Handlebars.registerHelper('formatDateTime', (date: Date) => {
      return date.toLocaleString('pt-BR');
    });

    // Helper para formatar números
    Handlebars.registerHelper('formatNumber', (number: number, decimals: number = 2) => {
      return number.toFixed(decimals);
    });

    // Helper para condicionais
    Handlebars.registerHelper('eq', (a: any, b: any) => {
      return a === b;
    });

    // Helper para verificar se existe
    Handlebars.registerHelper('exists', (value: any) => {
      return value !== null && value !== undefined;
    });
  }

  /**
   * Carrega templates do diretório
   */
  private loadTemplates() {
    const templatesDir = path.join(process.cwd(), 'templates');
    
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    const templateFiles = fs.readdirSync(templatesDir)
      .filter(file => file.endsWith('.hbs'));

    templateFiles.forEach(file => {
      const templateName = path.basename(file, '.hbs');
      const templatePath = path.join(templatesDir, file);
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      
      this.templates.set(templateName, Handlebars.compile(templateContent));
    });

  console.log(`📄 Loaded ${templateFiles.length} report templates`);
  }

  /**
   * Renderiza um template com dados
   */
  renderTemplate(templateName: string, data: any): string {
    const template = this.templates.get(templateName);
    
    if (!template) {
      throw new Error(`Template '${templateName}' não encontrado`);
    }

    return template(data);
  }

  /**
   * Prepara dados para o template
   */
  prepareTemplateData(reportData: ReportData, charts: {
    temperatureChart: string;
    humidityChart?: string | null;
  }): any {
    // Preparar amostra dos dados (primeiros 50 registros)
    const sensorDataSample = reportData.sensorData.slice(0, 50);
    
    return {
      ...reportData,
      sensorDataSample,
      hasMoreData: reportData.sensorData.length > 50,
      totalDataCount: reportData.sensorData.length,
      generatedAt: new Date(),
      temperatureChartData: charts.temperatureChart,
      humidityChartData: charts.humidityChart,
    };
  }

  /**
   * Lista templates disponíveis
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Recarrega templates (útil para desenvolvimento)
   */
  reloadTemplates() {
    this.templates.clear();
    this.loadTemplates();
  }
}