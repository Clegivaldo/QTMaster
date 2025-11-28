import handlebars from 'handlebars';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { redisService } from './redisService.js';
import { formatDateShort, formatDateLong } from '../utils/formatDate.js';

interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'array' | 'object' | 'boolean';
  description: string;
  example: any;
  required?: boolean;
  category: string;
}

interface TemplateEngineOptions {
  cacheEnabled?: boolean;
  strictMode?: boolean;
  helpers?: Record<string, Function>;
}

interface RenderContext {
  client: any;
  validation: any;
  statistics: any;
  sensorData: any[];
  sensors: any[];
  cycles: any[];
  importedItems: any[];
  currentDate: string;
  currentTime: string;
  user: any;
}

export class TemplateEngineService {
  private templateCache = new Map<string, { template: handlebars.TemplateDelegate; timestamp: number; hits: number }>();
  private variableCache = new Map<string, TemplateVariable[]>();
  private readonly CACHE_TTL = 3600; // 1 hora em segundos
  private readonly MAX_CACHE_SIZE = 100;
  private cacheStats = { hits: 0, misses: 0, evictions: 0 };

  constructor(private options: TemplateEngineOptions = {}) {
    this.setupDefaultHelpers();
    this.setupCustomHelpers();
    this.startCacheCleanupJob();
  }

  async renderTemplate(
    templateId: string,
    validationId: string,
    userId: string,
    options: { cache?: boolean; strict?: boolean } = {}
  ): Promise<{ html: string; warnings: string[]; errors: string[] }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Buscar template
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template não encontrado: ${templateId}`);
      }

      // Buscar dados de contexto
      const context = await this.buildRenderContext(validationId, userId);
      if (!context) {
        throw new Error(`Dados de validação não encontrados: ${validationId}`);
      }

      // Validar variáveis do template
      const validation = this.validateTemplateVariables(template.content, context);
      warnings.push(...validation.warnings);
      errors.push(...validation.errors);

      // Renderizar template
      const html = await this.renderTemplateContent(template.content, context, {
        cache: options.cache !== false,
        strict: (options.strict ?? this.options.strictMode ?? false) as boolean,
      });

      return { html, warnings, errors };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Erro ao renderizar template: ${errorMsg}`);
      return { html: '', warnings, errors };
    }
  }

  async renderTemplateWithData(
    templateContent: string,
    data: RenderContext,
    options: { cache?: boolean; strict?: boolean } = {}
  ): Promise<{ html: string; warnings: string[]; errors: string[] }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Validar variáveis do template
      const validation = this.validateTemplateVariables(templateContent, data);
      warnings.push(...validation.warnings);
      errors.push(...validation.errors);

      // Renderizar template
      const html = await this.renderTemplateContent(templateContent, data, {
        cache: options.cache !== false,
        strict: (options.strict ?? this.options.strictMode ?? false) as boolean,
      });

      return { html, warnings, errors };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Erro ao renderizar template: ${errorMsg}`);
      return { html: '', warnings, errors };
    }
  }

  private async getTemplate(templateId: string): Promise<any> {
    // Buscar do cache primeiro
    const cacheKey = `template:${templateId}`;
    const cached = await redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Buscar do banco de dados
    const template = await prisma.editorTemplate.findUnique({
      where: { id: templateId },
    });

    if (template) {
      // Armazenar no cache
      await redisService.set(cacheKey, JSON.stringify(template), this.CACHE_TTL);
    }

    return template;
  }

  private async buildRenderContext(validationId: string, userId: string): Promise<RenderContext | null> {
    try {
      // Buscar validação com dados relacionados
      const validation = await prisma.validation.findUnique({
        where: { id: validationId },
        include: {
          client: true,
          suitcase: {
            include: {
              sensors: {
                include: {
                  sensor: true,
                },
              },
            },
          },
          sensorData: {
            orderBy: { timestamp: 'asc' },
          },
          cycles: {
            include: {
              importedItems: {
                orderBy: { timestamp: 'asc' }
              }
            }
          },
          importedItems: {
            orderBy: { timestamp: 'asc' }
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!validation) {
        return null;
      }

      // Calcular estatísticas
      const statistics = await this.calculateStatistics(validation);

      // Preparar dados dos sensores
      const sensors = validation.suitcase ? validation.suitcase.sensors.map(ss => ({
        id: ss.sensor.id,
        serialNumber: ss.sensor.serialNumber,
        model: ss.sensor.model,
        position: ss.position,
      })) : [];

      return {
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
        validation: {
          id: validation.id,
          name: validation.name,
          description: validation.description,
          startDate: validation.startAt 
            ? validation.startAt.toISOString().split('T')[0] 
            : validation.createdAt.toISOString().split('T')[0],
          endDate: validation.endAt 
            ? validation.endAt.toISOString().split('T')[0] 
            : validation.updatedAt.toISOString().split('T')[0],
          duration: validation.startAt && validation.endAt
            ? this.calculateDuration(validation.startAt, validation.endAt)
            : this.calculateDuration(validation.createdAt, validation.updatedAt),
          minTemperature: validation.minTemperature,
          maxTemperature: validation.maxTemperature,
          minHumidity: validation.minHumidity,
          maxHumidity: validation.maxHumidity,
          isApproved: validation.isApproved,
          createdAt: validation.createdAt,
          updatedAt: validation.updatedAt,
          startAt: validation.startAt,
          endAt: validation.endAt,
          hiddenSensorIds: validation.hiddenSensorIds || [],
        },
        statistics,
        sensorData: validation.sensorData,
        sensors,
        cycles: validation.cycles || [],
        importedItems: validation.importedItems || [],
        currentDate: new Date().toLocaleDateString('pt-BR'),
        currentTime: new Date().toLocaleTimeString('pt-BR'),
        user: validation.user,
      };
    } catch (error) {
      logger.error('Erro ao construir contexto de renderização', error);
      return null;
    }
  }

  private async calculateStatistics(validation: any): Promise<any> {
    const sensorData = validation.sensorData;
    
    if (!sensorData || sensorData.length === 0) {
      return {
        temperature: { min: 0, max: 0, average: 0, standardDeviation: 0 },
        humidity: { min: 0, max: 0, average: 0, standardDeviation: 0 },
        readingsCount: 0,
      };
    }

    const temperatures = sensorData.map((d: any) => d.temperature).filter((t: number) => !isNaN(t));
    const humidities = sensorData.map((d: any) => d.humidity).filter((h: number) => !isNaN(h) && h !== null);

    const tempStats = this.calculateBasicStats(temperatures);
    const humidityStats = humidities.length > 0 ? this.calculateBasicStats(humidities) : null;

    return {
      temperature: tempStats,
      humidity: humidityStats,
      readingsCount: sensorData.length,
    };
  }

  private calculateBasicStats(values: number[]): { min: number; max: number; average: number; standardDeviation: number } {
    if (values.length === 0) {
      return { min: 0, max: 0, average: 0, standardDeviation: 0 };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      min: Math.round(min * 10) / 10,
      max: Math.round(max * 10) / 10,
      average: Math.round(average * 10) / 10,
      standardDeviation: Math.round(standardDeviation * 10) / 10,
    };
  }

  private calculateDuration(startDate: Date, endDate: Date): string {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} dias e ${diffHours % 24} horas`;
    } else if (diffHours > 0) {
      return `${diffHours} horas`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minutos`;
    }
  }

  private async renderTemplateContent(
    templateContent: string,
    context: RenderContext,
    options: { cache?: boolean; strict?: boolean }
  ): Promise<string> {
    const cacheKey = `template_render:${Buffer.from(templateContent).toString('base64').slice(0, 50)}`;
    
    // Verificar cache
    if (options.cache && this.templateCache.has(cacheKey)) {
      const cached = this.templateCache.get(cacheKey)!;
      
      // Verificar se o cache expirou
      const now = Date.now();
      if (now - cached.timestamp > this.CACHE_TTL * 1000) {
        // Cache expirado, remover
        this.templateCache.delete(cacheKey);
        this.cacheStats.evictions++;
      } else {
        // Cache válido, incrementar hits e retornar
        cached.hits++;
        cached.timestamp = now; // Atualizar timestamp (LRU)
        this.cacheStats.hits++;
        logger.debug(`Template cache hit: ${cacheKey.slice(0, 30)}...`, {
          hits: cached.hits,
          age: Math.round((now - cached.timestamp) / 1000),
        });
        return cached.template(context);
      }
    }

    // Cache miss
    if (options.cache) {
      this.cacheStats.misses++;
    }

    // Compilar template
    let compiledTemplate: handlebars.TemplateDelegate;
    
    try {
      compiledTemplate = handlebars.compile(templateContent, {
        strict: options.strict ?? false,
        noEscape: false,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Erro ao compilar template: ${errorMsg}`);
    }

    // Armazenar no cache se habilitado
    if (options.cache) {
      if (this.templateCache.size >= this.MAX_CACHE_SIZE) {
        // Implementar LRU: remover o item menos recentemente usado
        let oldestKey: string | null = null;
        let oldestTimestamp = Infinity;
        
        for (const [key, value] of this.templateCache.entries()) {
          if (value.timestamp < oldestTimestamp) {
            oldestTimestamp = value.timestamp;
            oldestKey = key;
          }
        }
        
        if (oldestKey) {
          this.templateCache.delete(oldestKey);
          this.cacheStats.evictions++;
          logger.debug(`Template cache eviction (LRU): ${oldestKey.slice(0, 30)}...`);
        }
      }
      
      this.templateCache.set(cacheKey, {
        template: compiledTemplate,
        timestamp: Date.now(),
        hits: 0,
      });
      logger.debug(`Template compiled and cached: ${cacheKey.slice(0, 30)}...`);
    }

    // Renderizar
    return compiledTemplate(context);
  }

  validateTemplateVariables(templateContent: string, context: RenderContext): {
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Extrair variáveis do template
      const variables = this.extractVariables(templateContent);
      
      // Buscar variáveis disponíveis
      const availableVariables = this.getAvailableVariables();
      const availableVarNames = availableVariables.map(v => v.name);

      // Verificar variáveis usadas
      variables.forEach(variable => {
        if (!availableVarNames.includes(variable)) {
          warnings.push(`Variável não reconhecida: ${variable}`);
        }
      });

      // Verificar variáveis obrigatórias
      const requiredVariables = availableVariables.filter(v => v.required);
      requiredVariables.forEach(variable => {
        const value = this.getNestedValue(context, variable.name);
        if (value === undefined || value === null || value === '') {
          errors.push(`Variável obrigatória ausente: ${variable.name}`);
        }
      });

      // Verificar tipos de dados
      variables.forEach(variable => {
        const availableVar = availableVariables.find(v => v.name === variable);
        if (availableVar) {
          const value = this.getNestedValue(context, variable);
          if (value !== undefined && value !== null) {
            const typeValidation = this.validateVariableType(value, availableVar.type);
            if (!typeValidation.isValid) {
              warnings.push(`Tipo de dado incorreto para ${variable}: ${typeValidation.message}`);
            }
          }
        }
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Erro na validação de variáveis: ${errorMsg}`);
    }

    return { warnings, errors };
  }

  extractVariables(templateContent: string): string[] {
    const variableRegex = /\{\{([^#^\/]+?)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = variableRegex.exec(templateContent)) !== null) {
      if (match[1]) {
        const variable = match[1].trim();
        if (variable && !variable.startsWith('#') && !variable.startsWith('/')) {
          variables.add(variable);
        }
      }
    }

    return Array.from(variables);
  }

  private getAvailableVariables(): TemplateVariable[] {
    return [
      // Cliente
      { name: 'client.name', type: 'text', description: 'Nome do cliente', example: 'Empresa ABC Ltda', category: 'cliente' },
      { name: 'client.email', type: 'text', description: 'Email do cliente', example: 'contato@empresa.com', category: 'cliente' },
      { name: 'client.phone', type: 'text', description: 'Telefone do cliente', example: '(11) 1234-5678', category: 'cliente' },
      { name: 'client.address', type: 'text', description: 'Endereço completo do cliente', example: 'Rua Exemplo, 123 - Centro', category: 'cliente' },
      { name: 'client.cnpj', type: 'text', description: 'CNPJ do cliente', example: '12.345.678/0001-90', category: 'cliente' },
      { name: 'client.street', type: 'text', description: 'Rua do cliente', example: 'Rua Exemplo', category: 'cliente' },
      { name: 'client.neighborhood', type: 'text', description: 'Bairro do cliente', example: 'Centro', category: 'cliente' },
      { name: 'client.city', type: 'text', description: 'Cidade do cliente', example: 'São Paulo', category: 'cliente' },
      { name: 'client.state', type: 'text', description: 'Estado do cliente', example: 'SP', category: 'cliente' },
      
      // Validação
      { name: 'validation.name', type: 'text', description: 'Nome da validação', example: 'Validação Câmara 001', required: true, category: 'validação' },
      { name: 'validation.description', type: 'text', description: 'Descrição da validação', example: 'Validação de temperatura e umidade', category: 'validação' },
      { name: 'validation.startDate', type: 'date', description: 'Data inicial da validação', example: '2024-01-01', category: 'validação' },
      { name: 'validation.endDate', type: 'date', description: 'Data final da validação', example: '2024-01-03', category: 'validação' },
      { name: 'validation.duration', type: 'text', description: 'Duração da validação', example: '72 horas', category: 'validação' },
      { name: 'validation.minTemperature', type: 'number', description: 'Temperatura mínima', example: 20.0, category: 'validação' },
      { name: 'validation.maxTemperature', type: 'number', description: 'Temperatura máxima', example: 25.0, category: 'validação' },
      { name: 'validation.minHumidity', type: 'number', description: 'Umidade mínima', example: 50.0, category: 'validação' },
      { name: 'validation.maxHumidity', type: 'number', description: 'Umidade máxima', example: 70.0, category: 'validação' },
      { name: 'validation.isApproved', type: 'boolean', description: 'Status de aprovação', example: true, category: 'validação' },
      { name: 'validation.createdAt', type: 'date', description: 'Data de criação', example: '2024-01-01T10:00:00Z', category: 'validação' },
      
      // Estatísticas
      { name: 'statistics.temperature.average', type: 'number', description: 'Temperatura média', example: 22.5, category: 'estatísticas' },
      { name: 'statistics.temperature.min', type: 'number', description: 'Temperatura mínima', example: 20.1, category: 'estatísticas' },
      { name: 'statistics.temperature.max', type: 'number', description: 'Temperatura máxima', example: 24.8, category: 'estatísticas' },
      { name: 'statistics.temperature.standardDeviation', type: 'number', description: 'Desvio padrão temperatura', example: 1.2, category: 'estatísticas' },
      { name: 'statistics.humidity.average', type: 'number', description: 'Umidade média', example: 62.1, category: 'estatísticas' },
      { name: 'statistics.humidity.min', type: 'number', description: 'Umidade mínima', example: 45.2, category: 'estatísticas' },
      { name: 'statistics.humidity.max', type: 'number', description: 'Umidade máxima', example: 78.9, category: 'estatísticas' },
      { name: 'statistics.humidity.standardDeviation', type: 'number', description: 'Desvio padrão umidade', example: 8.5, category: 'estatísticas' },
      { name: 'statistics.readingsCount', type: 'number', description: 'Total de leituras', example: 1440, category: 'estatísticas' },
      
      // Dados dos sensores
      { name: 'sensorData', type: 'array', description: 'Array com todos os dados dos sensores', example: '[]', category: 'dados' },
      { name: 'sensors', type: 'array', description: 'Array com informações dos sensores', example: '[]', category: 'dados' },
      
      // Data e hora atual
      { name: 'currentDate', type: 'date', description: 'Data atual', example: '01/01/2024', category: 'sistema' },
      { name: 'currentTime', type: 'text', description: 'Hora atual', example: '14:30:00', category: 'sistema' },
      
      // Usuário
      { name: 'user.name', type: 'text', description: 'Nome do usuário', example: 'João Silva', category: 'usuário' },
      { name: 'user.email', type: 'text', description: 'Email do usuário', example: 'joao@empresa.com', category: 'usuário' },
    ];
  }

  private validateVariableType(value: any, expectedType: string): { isValid: boolean; message?: string } {
    switch (expectedType) {
      case 'text':
        return { isValid: typeof value === 'string' };
      case 'number':
        return { isValid: typeof value === 'number' && !isNaN(value) };
      case 'date':
        return { isValid: value instanceof Date || !isNaN(new Date(value).getTime()) };
      case 'boolean':
        return { isValid: typeof value === 'boolean' };
      case 'array':
        return { isValid: Array.isArray(value) };
      case 'object':
        return { isValid: typeof value === 'object' && value !== null && !Array.isArray(value) };
      default:
        return { isValid: true };
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) return undefined;
      
      // Handle array access: sensorData[0]
      if (key.includes('[') && key.includes(']')) {
        const arrayKey = key.substring(0, key.indexOf('['));
        const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
        return current[arrayKey]?.[index];
      }
      
      return current[key];
    }, obj);
  }

  private setupDefaultHelpers(): void {
    // Helper para formatação de data
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

    // Helper para comparação
    handlebars.registerHelper('ifGreaterThan', (arg1, arg2, options) => {
      return (arg1 > arg2) ? options.fn(this) : options.inverse(this);
    });

    handlebars.registerHelper('ifLessThan', (arg1, arg2, options) => {
      return (arg1 < arg2) ? options.fn(this) : options.inverse(this);
    });

    // Helper para iteração com índice
    handlebars.registerHelper('eachWithIndex', (array: any[], options: any) => {
      let result = '';
      array.forEach((item: any, index: number) => {
        result += options.fn({ ...item, index: index + 1 });
      });
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
  }

  private setupCustomHelpers(): void {
    // Adicionar helpers personalizados do usuário se fornecidos
    if (this.options.helpers) {
      Object.entries(this.options.helpers).forEach(([name, helper]) => {
        handlebars.registerHelper(name, helper as handlebars.HelperDelegate);
      });
    }
  }

  async getTemplateVariables(): Promise<TemplateVariable[]> {
    return this.getAvailableVariables();
  }

  async validateTemplate(templateContent: string): Promise<{
    isValid: boolean;
    warnings: string[];
    errors: string[];
  }> {
    try {
      // Testar compilação do template
      handlebars.compile(templateContent);
      
      // Validar variáveis
      const variables = this.extractVariables(templateContent);
      const availableVariables = this.getAvailableVariables();
      const availableVarNames = availableVariables.map(v => v.name);
      
      const warnings: string[] = [];
      const errors: string[] = [];
      
      variables.forEach(variable => {
        if (!availableVarNames.includes(variable)) {
          warnings.push(`Variável não reconhecida: ${variable}`);
        }
      });
      
      return {
        isValid: errors.length === 0,
        warnings,
        errors,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        isValid: false,
        warnings: [],
        errors: [`Erro ao validar template: ${errorMsg}`],
      };
    }
  }

  private startCacheCleanupJob(): void {
    // Limpar cache expirado a cada 10 minutos
    setInterval(() => {
      this.cleanExpiredCache();
    }, 10 * 60 * 1000);
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, value] of this.templateCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL * 1000) {
        this.templateCache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.cacheStats.evictions += expiredCount;
      logger.info(`Limpeza automática de cache: ${expiredCount} templates expirados removidos`);
    }
  }

  getCacheStats(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    evictions: number;
    hitRate: string;
  } {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 
      ? `${((this.cacheStats.hits / total) * 100).toFixed(2)}%` 
      : '0%';

    return {
      size: this.templateCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      evictions: this.cacheStats.evictions,
      hitRate,
    };
  }

  async clearCache(): Promise<void> {
    const previousSize = this.templateCache.size;
    
    this.templateCache.clear();
    this.variableCache.clear();
    this.cacheStats = { hits: 0, misses: 0, evictions: 0 };
    
    logger.info(`Cache limpo: ${previousSize} templates removidos`);
    
    // Limpar cache do Redis (se o método existir)
    // TODO: Implementar deletePattern no redisService
    // await redisService.deletePattern('template:*');
  }
}

// Singleton instance
export const templateEngineService = new TemplateEngineService({
  cacheEnabled: true,
  strictMode: false,
});
