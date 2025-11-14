# Exemplos de Código e Implementação

## 1. Importação de Dados - Backend

### 1.1 Serviço de Processamento de Excel
```typescript
// backend/src/services/excelProcessingService.ts
import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma';
import { validateSensorData } from '../utils/validationUtils';

interface ProcessingOptions {
  suitcaseId: string;
  userId: string;
  validateData: boolean;
  chunkSize: number;
}

export class ExcelProcessingService {
  async processExcelFile(
    filePath: string, 
    originalName: string,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converter para JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      defval: null,
      raw: false 
    });
    
    // Detectar estrutura das colunas
    const columnMapping = this.detectColumnStructure(rawData[0]);
    
    // Validar e processar em chunks
    const results = await this.processInChunks(
      rawData, 
      columnMapping, 
      options
    );
    
    return {
      totalRows: rawData.length,
      processedRows: results.successful,
      failedRows: results.failed,
      errors: results.errors,
      processingTime: results.duration
    };
  }
  
  private detectColumnStructure(firstRow: any): ColumnMapping {
    const mapping: ColumnMapping = {};
    
    const possibleTimestampColumns = ['timestamp', 'data', 'hora', 'time', 'date'];
    const possibleTemperatureColumns = ['temperatura', 'temperature', 'temp'];
    const possibleHumidityColumns = ['umidade', 'humidity', 'hum'];
    const possibleSensorColumns = ['sensor', 'sensor_id', 'serial'];
    
    Object.keys(firstRow).forEach(column => {
      const lowerColumn = column.toLowerCase();
      
      if (possibleTimestampColumns.some(col => lowerColumn.includes(col))) {
        mapping.timestamp = column;
      } else if (possibleTemperatureColumns.some(col => lowerColumn.includes(col))) {
        mapping.temperature = column;
      } else if (possibleHumidityColumns.some(col => lowerColumn.includes(col))) {
        mapping.humidity = column;
      } else if (possibleSensorColumns.some(col => lowerColumn.includes(col))) {
        mapping.sensorId = column;
      }
    });
    
    return mapping;
  }
  
  private async processInChunks(
    data: any[],
    mapping: ColumnMapping,
    options: ProcessingOptions
  ): Promise<ChunkResult> {
    const chunkSize = options.chunkSize || 1000;
    const results = { successful: 0, failed: 0, errors: [] as string[] };
    const startTime = Date.now();
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkResults = await this.processChunk(chunk, mapping, options);
      
      results.successful += chunkResults.successful;
      results.failed += chunkResults.failed;
      results.errors.push(...chunkResults.errors);
      
      // Atualizar progresso
      await this.updateJobProgress(options.jobId, {
        processed: i + chunk.length,
        total: data.length,
        percentage: Math.round(((i + chunk.length) / data.length) * 100)
      });
    }
    
    return {
      ...results,
      duration: Date.now() - startTime
    };
  }
  
  private async processChunk(
    chunk: any[],
    mapping: ColumnMapping,
    options: ProcessingOptions
  ): Promise<ChunkResult> {
    const sensorDataToCreate = [];
    const errors = [];
    let successful = 0;
    let failed = 0;
    
    for (const row of chunk) {
      try {
        const parsedData = this.parseRow(row, mapping);
        
        // Validar dados
        if (options.validateData) {
          const validation = validateSensorData(parsedData);
          if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
          }
        }
        
        sensorDataToCreate.push({
          sensorId: parsedData.sensorId,
          timestamp: parsedData.timestamp,
          temperature: parsedData.temperature,
          humidity: parsedData.humidity,
          fileName: options.fileName,
          rowNumber: chunk.indexOf(row) + 1,
          createdAt: new Date()
        });
        
        successful++;
      } catch (error) {
        failed++;
        errors.push(`Row ${chunk.indexOf(row) + 1}: ${error.message}`);
      }
    }
    
    // Inserir dados válidos em lote
    if (sensorDataToCreate.length > 0) {
      await prisma.sensorData.createMany({
        data: sensorDataToCreate,
        skipDuplicates: true
      });
    }
    
    return { successful, failed, errors };
  }
  
  private parseRow(row: any, mapping: ColumnMapping): ParsedRow {
    return {
      sensorId: row[mapping.sensorId] || 'unknown',
      timestamp: this.parseTimestamp(row[mapping.timestamp]),
      temperature: parseFloat(row[mapping.temperature]),
      humidity: mapping.humidity ? parseFloat(row[mapping.humidity]) : null
    };
  }
  
  private parseTimestamp(value: any): Date {
    // Detectar formato automático
    if (typeof value === 'number') {
      // Excel serial date
      return this.excelSerialToDate(value);
    } else if (typeof value === 'string') {
      // Tentar parsear diferentes formatos
      const formats = [
        'YYYY-MM-DD HH:mm:ss',
        'DD/MM/YYYY HH:mm:ss',
        'MM/DD/YYYY HH:mm:ss',
        'ISO8601'
      ];
      
      for (const format of formats) {
        const date = this.tryParseDate(value, format);
        if (date) return date;
      }
    }
    
    throw new Error(`Invalid timestamp format: ${value}`);
  }
  
  private excelSerialToDate(serial: number): Date {
    const excelEpoch = new Date(1900, 0, 1);
    const days = serial - 2; // Excel bug com 29/02/1900
    return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
  }
}
```

## 2. Editor de Layout - Frontend

### 2.1 Componente de Elemento de Tabela
```typescript
// frontend/src/components/EditorElements/TableElement.tsx
import React, { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Table, Settings, Trash2 } from 'lucide-react';

interface TableElementProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: TableProperties;
  onUpdate: (id: string, properties: TableProperties) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

interface TableProperties {
  dataSource: string; // {{validation.sensorData}}
  columns: TableColumn[];
  showHeader: boolean;
  headerStyle: React.CSSProperties;
  rowStyle: React.CSSProperties;
  alternatingRowColors: boolean;
  borderStyle: 'none' | 'grid' | 'horizontal' | 'vertical';
  fontSize: number;
  fontFamily: string;
}

interface TableColumn {
  field: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: 'text' | 'number' | 'date' | 'temperature' | 'humidity';
  decimalPlaces?: number;
}

export const TableElement: React.FC<TableElementProps> = ({
  id,
  x,
  y,
  width,
  height,
  properties,
  onUpdate,
  onDelete,
  isSelected,
  onSelect
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [localProperties, setLocalProperties] = useState(properties);
  
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    data: { type: 'table', x, y }
  });
  
  const style: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width,
    height,
    border: isSelected ? '2px solid #3b82f6' : '1px solid #d1d5db',
    backgroundColor: 'white',
    boxShadow: isSelected ? '0 4px 6px rgba(0, 0, 0, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
    cursor: 'move',
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
  };
  
  // Dados de exemplo para preview
  const sampleData = [
    { timestamp: '2024-01-01 10:00:00', temperature: 22.5, humidity: 65.2 },
    { timestamp: '2024-01-01 11:00:00', temperature: 23.1, humidity: 64.8 },
    { timestamp: '2024-01-01 12:00:00', temperature: 23.8, humidity: 63.5 },
  ];
  
  const formatValue = (value: any, format: string, decimalPlaces?: number) => {
    switch (format) {
      case 'temperature':
        return `${Number(value).toFixed(decimalPlaces || 1)} °C`;
      case 'humidity':
        return `${Number(value).toFixed(decimalPlaces || 1)} %`;
      case 'number':
        return Number(value).toFixed(decimalPlaces || 2);
      case 'date':
        return new Date(value).toLocaleString('pt-BR');
      default:
        return value;
    }
  };
  
  const getBorderStyle = () => {
    switch (properties.borderStyle) {
      case 'grid':
        return { border: '1px solid #d1d5db' };
      case 'horizontal':
        return { borderBottom: '1px solid #d1d5db' };
      case 'vertical':
        return { borderRight: '1px solid #d1d5db' };
      default:
        return {};
    }
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(id)}
      {...listeners}
      {...attributes}
    >
      {/* Header */}
      {isSelected && (
        <div className="absolute -top-8 left-0 right-0 flex justify-between items-center bg-blue-500 text-white px-2 py-1 rounded-t">
          <span className="text-sm font-medium">Tabela</span>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings(true);
              }}
              className="p-1 hover:bg-blue-600 rounded"
            >
              <Settings size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
              className="p-1 hover:bg-blue-600 rounded"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
      
      {/* Table Content */}
      <div className="w-full h-full overflow-auto p-2">
        <table className="w-full text-sm" style={{ fontSize: properties.fontSize, fontFamily: properties.fontFamily }}>
          {properties.showHeader && (
            <thead>
              <tr style={properties.headerStyle}>
                {properties.columns.map((column) => (
                  <th
                    key={column.field}
                    style={{
                      textAlign: column.align || 'left',
                      width: column.width,
                      ...getBorderStyle()
                    }}
                    className="p-2 font-semibold"
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {sampleData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{
                  ...properties.rowStyle,
                  backgroundColor: properties.alternatingRowColors && rowIndex % 2 === 0 
                    ? '#f9fafb' 
                    : 'white'
                }}
              >
                {properties.columns.map((column) => (
                  <td
                    key={column.field}
                    style={{
                      textAlign: column.align || 'left',
                      ...getBorderStyle()
                    }}
                    className="p-2"
                  >
                    {formatValue(row[column.field], column.format, column.decimalPlaces)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Settings Modal */}
      {showSettings && (
        <TableSettingsModal
          properties={localProperties}
          onUpdate={(newProperties) => {
            setLocalProperties(newProperties);
            onUpdate(id, newProperties);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};
```

### 2.2 Hook para Gerenciamento de Templates
```typescript
// frontend/src/hooks/useTemplateEngine.ts
import { useState, useCallback, useMemo } from 'react';
import { templateService } from '../services/templateService';

interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'array' | 'object';
  description: string;
  example: any;
  required?: boolean;
}

interface TemplateEngine {
  variables: TemplateVariable[];
  renderTemplate: (template: string, data: any) => string;
  validateVariables: (template: string) => ValidationResult;
  extractVariables: (template: string) => string[];
}

export const useTemplateEngine = (): TemplateEngine => {
  const [variables] = useState<TemplateVariable[]>([
    // Cliente
    { name: 'client.name', type: 'text', description: 'Nome do cliente', example: 'Empresa ABC Ltda' },
    { name: 'client.cnpj', type: 'text', description: 'CNPJ do cliente', example: '12.345.678/0001-90' },
    { name: 'client.address', type: 'text', description: 'Endereço completo do cliente', example: 'Rua Exemplo, 123 - Centro' },
    
    // Validação
    { name: 'validation.name', type: 'text', description: 'Nome da validação', example: 'Validação Câmara 001' },
    { name: 'validation.startDate', type: 'date', description: 'Data inicial da validação', example: '2024-01-01' },
    { name: 'validation.endDate', type: 'date', description: 'Data final da validação', example: '2024-01-03' },
    { name: 'validation.duration', type: 'text', description: 'Duração da validação', example: '72 horas' },
    { name: 'validation.minTemperature', type: 'number', description: 'Temperatura mínima', example: 20.0 },
    { name: 'validation.maxTemperature', type: 'number', description: 'Temperatura máxima', example: 25.0 },
    { name: 'validation.isApproved', type: 'text', description: 'Status de aprovação', example: 'Aprovado' },
    
    // Estatísticas
    { name: 'statistics.temperature.average', type: 'number', description: 'Temperatura média', example: 22.5 },
    { name: 'statistics.temperature.min', type: 'number', description: 'Temperatura mínima', example: 20.1 },
    { name: 'statistics.temperature.max', type: 'number', description: 'Temperatura máxima', example: 24.8 },
    { name: 'statistics.temperature.standardDeviation', type: 'number', description: 'Desvio padrão temperatura', example: 1.2 },
    { name: 'statistics.readingsCount', type: 'number', description: 'Total de leituras', example: 1440 },
    
    // Dados dos sensores
    { name: 'sensorData', type: 'array', description: 'Array com todos os dados dos sensores', example: '[]' },
    { name: 'sensors', type: 'array', description: 'Array com informações dos sensores', example: '[]' },
    
    // Data e hora atual
    { name: 'currentDate', type: 'date', description: 'Data atual', example: new Date().toLocaleDateString('pt-BR') },
    { name: 'currentTime', type: 'text', description: 'Hora atual', example: new Date().toLocaleTimeString('pt-BR') },
  ]);
  
  const renderTemplate = useCallback((template: string, data: any): string => {
    let rendered = template;
    
    // Processar variáveis simples {{variable}}
    const simpleVariables = template.match(/\{\{([^#^}]+)\}\}/g) || [];
    simpleVariables.forEach(variable => {
      const varName = variable.replace(/\{\{|\}\}/g, '').trim();
      const value = this.getNestedValue(data, varName);
      if (value !== undefined) {
        rendered = rendered.replace(variable, String(value));
      }
    });
    
    // Processar loops {{#each array}}...{{/each}}
    const loops = template.match(/\{\{#each\s+([^}]+)\}\}(.*?)\{\{\/each\}\}/gs) || [];
    loops.forEach(loop => {
      const match = loop.match(/\{\{#each\s+([^}]+)\}\}(.*?)\{\{\/each\}\}/s);
      if (match) {
        const arrayPath = match[1].trim();
        const templateContent = match[2];
        const array = this.getNestedValue(data, arrayPath);
        
        if (Array.isArray(array)) {
          const renderedItems = array.map((item, index) => {
            let itemTemplate = templateContent;
            // Substituir @index, @key, @first, @last
            itemTemplate = itemTemplate.replace(/@index/g, String(index));
            itemTemplate = itemTemplate.replace(/@first/g, index === 0 ? 'true' : 'false');
            itemTemplate = itemTemplate.replace(/@last/g, index === array.length - 1 ? 'true' : 'false');
            
            // Substituir propriedades do item
            Object.keys(item).forEach(key => {
              const regex = new RegExp(`\\${key}\\b`, 'g');
              itemTemplate = itemTemplate.replace(regex, String(item[key]));
            });
            
            return itemTemplate;
          }).join('');
          
          rendered = rendered.replace(loop, renderedItems);
        } else {
          rendered = rendered.replace(loop, '');
        }
      }
    });
    
    // Processar condicionais {{#if condition}}...{{/if}}
    const conditionals = template.match(/\{\{#if\s+([^}]+)\}\}(.*?)\{\{\/if\}\}/gs) || [];
    conditionals.forEach(conditional => {
      const match = conditional.match(/\{\{#if\s+([^}]+)\}\}(.*?)\{\{\/if\}\}/s);
      if (match) {
        const condition = match[1].trim();
        const content = match[2];
        const value = this.getNestedValue(data, condition);
        
        if (this.isTruthy(value)) {
          rendered = rendered.replace(conditional, content);
        } else {
          rendered = rendered.replace(conditional, '');
        }
      }
    });
    
    return rendered;
  }, []);
  
  const validateVariables = useCallback((template: string): ValidationResult => {
    const usedVariables = this.extractVariables(template);
    const availableVariableNames = variables.map(v => v.name);
    
    const invalidVariables = usedVariables.filter(
      variable => !availableVariableNames.includes(variable)
    );
    
    const warnings = invalidVariables.map(variable => ({
      type: 'warning' as const,
      message: `Variável não reconhecida: ${variable}`,
      variable
    }));
    
    return {
      isValid: invalidVariables.length === 0,
      warnings,
      errors: []
    };
  }, [variables]);
  
  const extractVariables = useCallback((template: string): string[] => {
    const matches = template.match(/\{\{([^#^}]+)\}\}/g) || [];
    return matches
      .map(match => match.replace(/\{\{|\}\}/g, '').trim())
      .filter(variable => !variable.startsWith('#') && !variable.startsWith('/'));
  }, []);
  
  // Funções auxiliares
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => {
      if (key.includes('[') && key.includes(']')) {
        // Handle array access: sensorData[0]
        const arrayKey = key.substring(0, key.indexOf('['));
        const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
        return current?.[arrayKey]?.[index];
      }
      return current?.[key];
    }, obj);
  };
  
  const isTruthy = (value: any): boolean => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
    return Boolean(value);
  };
  
  return {
    variables,
    renderTemplate,
    validateVariables,
    extractVariables
  };
};
```

## 3. Geração de PDF - Backend

### 3.1 Serviço de Geração de PDF com Puppeteer
```typescript
// backend/src/services/pdfGenerationService.ts
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs/promises';

interface PDFGenerationOptions {
  format: 'A4' | 'A3' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margin: {
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
  printBackground: boolean;
  displayHeaderFooter: boolean;
}

export class PDFGenerationService {
  private browser: puppeteer.Browser | null = null;
  private templateCache = new Map<string, handlebars.TemplateDelegate>();
  
  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    // Registrar helpers do Handlebars
    this.registerHandlebarsHelpers();
  }
  
  async generatePDF(
    template: string,
    data: any,
    options: PDFGenerationOptions
  ): Promise<Buffer> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }
    
    const page = await this.browser.newPage();
    
    try {
      // Renderizar template HTML
      const html = await this.renderHTMLTemplate(template, data);
      
      // Adicionar estilos CSS
      const styledHTML = await this.addStyles(html);
      
      // Configurar página
      await page.setContent(styledHTML, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      // Aguardar carregamento de fontes e imagens
      await page.evaluateHandle('document.fonts.ready');
      
      // Gerar PDF
      const pdfBuffer = await page.pdf({
        format: options.format,
        landscape: options.orientation === 'landscape',
        margin: options.margin,
        printBackground: options.printBackground,
        displayHeaderFooter: options.displayHeaderFooter,
        headerTemplate: options.header?.template || '',
        footerTemplate: options.footer?.template || '',
        preferCSSPageSize: true
      });
      
      return pdfBuffer;
      
    } finally {
      await page.close();
    }
  }
  
  private async renderHTMLTemplate(
    template: string, 
    data: any
  ): Promise<string> {
    // Usar cache de template quando possível
    let compiledTemplate = this.templateCache.get(template);
    
    if (!compiledTemplate) {
      compiledTemplate = handlebars.compile(template);
      this.templateCache.set(template, compiledTemplate);
    }
    
    return compiledTemplate(data);
  }
  
  private async addStyles(html: string): Promise<string> {
    const css = `
      <style>
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #374151;
          margin: 0;
          padding: 0;
        }
        
        .report-container {
          padding: 20px;
          max-width: 100%;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        .table th,
        .table td {
          border: 1px solid #d1d5db;
          padding: 8px 12px;
          text-align: left;
        }
        
        .table th {
          background-color: #f9fafb;
          font-weight: 600;
        }
        
        .chart-container {
          margin: 20px 0;
          text-align: center;
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
        
        .text-red-500 { color: #ef4444; }
        .text-green-500 { color: #10b981; }
        .text-blue-500 { color: #3b82f6; }
        
        @media print {
          .no-print { display: none; }
          .page-break { page-break-before: always; }
        }
      </style>
    `;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
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
  
  private registerHandlebarsHelpers(): void {
    // Helper para formatação de data
    handlebars.registerHelper('formatDate', (date, format) => {
      if (!date) return '';
      const dateObj = new Date(date);
      
      switch (format) {
        case 'short':
          return dateObj.toLocaleDateString('pt-BR');
        case 'long':
          return dateObj.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          });
        case 'datetime':
          return dateObj.toLocaleString('pt-BR');
        default:
          return dateObj.toLocaleDateString('pt-BR');
      }
    });
    
    // Helper para formatação de números
    handlebars.registerHelper('formatNumber', (number, decimals) => {
      if (number === null || number === undefined) return '';
      return Number(number).toFixed(decimals || 2);
    });
    
    // Helper para temperatura
    handlebars.registerHelper('formatTemperature', (temp) => {
      if (temp === null || temp === undefined) return '';
      return `${Number(temp).toFixed(1)} °C`;
    });
    
    // Helper para umidade
    handlebars.registerHelper('formatHumidity', (humidity) => {
      if (humidity === null || humidity === undefined) return '';
      return `${Number(humidity).toFixed(1)} %`;
    });
    
    // Helper para condicional
    handlebars.registerHelper('ifEquals', (arg1, arg2, options) => {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });
    
    // Helper para iteração com índice
    handlebars.registerHelper('eachWithIndex', (array, options) => {
      let result = '';
      array.forEach((item, index) => {
        result += options.fn({ ...item, index: index + 1 });
      });
      return result;
    });
  }
  
  async generateReportPDF(
    validationData: any,
    template: string,
    options: Partial<PDFGenerationOptions> = {}
  ): Promise<Buffer> {
    const defaultOptions: PDFGenerationOptions = {
      format: 'A4',
      orientation: 'portrait',
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm'
      },
      header: {
        height: '15mm',
        template: `
          <div style="text-align: center; font-size: 10px; color: #6b7280;">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        `
      },
      footer: {
        height: '10mm',
        template: `
          <div style="text-align: center; font-size: 8px; color: #9ca3af;">
            Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
          </div>
        `
      },
      printBackground: true,
      displayHeaderFooter: true
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    return this.generatePDF(template, validationData, finalOptions);
  }
  
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Singleton instance
export const pdfService = new PDFGenerationService();
```

## 4. Dashboard - Frontend

### 4.1 Componente de Gráfico de Temperatura
```typescript
// frontend/src/components/Charts/TemperatureChart.tsx
import React, { useEffect, useRef } from 'react';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { ptBR } from 'date-fns/locale';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface TemperatureChartProps {
  data: SensorDataPoint[];
  minTemperature?: number;
  maxTemperature?: number;
  width?: number;
  height?: number;
}

interface SensorDataPoint {
  timestamp: string;
  temperature: number;
  sensorId?: string;
}

export const TemperatureChart: React.FC<TemperatureChartProps> = ({
  data,
  minTemperature,
  maxTemperature,
  width = 800,
  height = 400
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Destruir chart anterior se existir
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Preparar dados
    const datasets = this.prepareDatasets(data, minTemperature, maxTemperature);
    
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Variação de Temperatura',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += context.parsed.y.toFixed(1) + ' °C';
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'hour',
              displayFormats: {
                hour: 'HH:mm\nDD/MM'
              }
            },
            adapters: {
              date: {
                locale: ptBR
              }
            },
            title: {
              display: true,
              text: 'Tempo'
            }
          },
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Temperatura (°C)'
            },
            ticks: {
              callback: function(value) {
                return value + ' °C';
              }
            }
          }
        },
        elements: {
          line: {
            tension: 0.1
          },
          point: {
            radius: 0, // Esconder pontos para grandes datasets
            hoverRadius: 5
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
    
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, minTemperature, maxTemperature]);
  
  private prepareDatasets(
    data: SensorDataPoint[],
    minTemp?: number,
    maxTemp?: number
  ): any[] {
    // Agrupar por sensor se houver múltiplos sensores
    const sensors = [...new Set(data.map(d => d.sensorId || 'default'))];
    
    const datasets = sensors.map((sensorId, index) => {
      const sensorData = data.filter(d => (d.sensorId || 'default') === sensorId);
      const color = this.getColorForIndex(index);
      
      return {
        label: sensorId === 'default' ? 'Temperatura' : `Sensor ${sensorId}`,
        data: sensorData.map(d => ({
          x: new Date(d.timestamp),
          y: d.temperature
        })),
        borderColor: color,
        backgroundColor: color + '20',
        fill: false,
        pointBackgroundColor: color,
        pointBorderColor: color,
        pointHoverBackgroundColor: 'white',
        pointHoverBorderColor: color,
        pointHoverBorderWidth: 2
      };
    });
    
    // Adicionar linhas de limite se especificadas
    if (minTemp !== undefined) {
      datasets.push({
        label: 'Temperatura Mínima',
        data: this.createLimitLine(data, minTemp),
        borderColor: '#ef4444',
        backgroundColor: '#ef444420',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      });
    }
    
    if (maxTemp !== undefined) {
      datasets.push({
        label: 'Temperatura Máxima',
        data: this.createLimitLine(data, maxTemp),
        borderColor: '#ef4444',
        backgroundColor: '#ef444420',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      });
    }
    
    return datasets;
  }
  
  private createLimitLine(data: SensorDataPoint[], value: number): any[] {
    const minTime = new Date(Math.min(...data.map(d => new Date(d.timestamp).getTime())));
    const maxTime = new Date(Math.max(...data.map(d => new Date(d.timestamp).getTime())));
    
    return [
      { x: minTime, y: value },
      { x: maxTime, y: value }
    ];
  }
  
  private getColorForIndex(index: number): string {
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // yellow
      '#ef4444', // red
      '#8b5cf6', // purple
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316'  // orange
    ];
    
    return colors[index % colors.length];
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
};
```

## 5. Integração com Banco de Dados

### 5.1 Query de Performance para Dashboard
```sql
-- Materialized View para estatísticas rápidas do dashboard
CREATE MATERIALIZED VIEW dashboard_statistics AS
WITH daily_stats AS (
  SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_readings,
    AVG(temperature) as avg_temperature,
    MIN(temperature) as min_temperature,
    MAX(temperature) as max_temperature,
    AVG(humidity) as avg_humidity
  FROM sensor_data 
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE_TRUNC('day', created_at)
),
validation_stats AS (
  SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_validations,
    COUNT(*) FILTER (WHERE is_approved = true) as approved_validations,
    COUNT(*) FILTER (WHERE is_approved = false) as rejected_validations
  FROM validations
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE_TRUNC('day', created_at)
),
import_stats AS (
  SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_imports,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_imports,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_imports
  FROM file_imports
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE_TRUNC('day', created_at)
)
SELECT 
  COALESCE(d.date, v.date, i.date) as date,
  COALESCE(d.total_readings, 0) as total_readings,
  COALESCE(d.avg_temperature, 0) as avg_temperature,
  COALESCE(d.min_temperature, 0) as min_temperature,
  COALESCE(d.max_temperature, 0) as max_temperature,
  COALESCE(d.avg_humidity, 0) as avg_humidity,
  COALESCE(v.total_validations, 0) as total_validations,
  COALESCE(v.approved_validations, 0) as approved_validations,
  COALESCE(v.rejected_validations, 0) as rejected_validations,
  COALESCE(i.total_imports, 0) as total_imports,
  COALESCE(i.successful_imports, 0) as successful_imports,
  COALESCE(i.failed_imports, 0) as failed_imports
FROM daily_stats d
FULL OUTER JOIN validation_stats v ON d.date = v.date
FULL OUTER JOIN import_stats i ON d.date = i.date
ORDER BY date DESC;

-- Índice para performance
CREATE INDEX idx_dashboard_statistics_date ON dashboard_statistics(date);

-- Atualizar materialized view diariamente
CREATE OR REPLACE FUNCTION refresh_dashboard_statistics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_statistics;
END;
$$ LANGUAGE plpgsql;

-- Agendar atualização
CREATE OR REPLACE FUNCTION schedule_dashboard_refresh()
RETURNS void AS $$
BEGIN
  -- Remover job existente se houver
  PERFORM cron.unschedule('refresh-dashboard-stats');
  
  -- Agendar para rodar às 6h da manhã
  PERFORM cron.schedule('refresh-dashboard-stats', '0 6 * * *', 'SELECT refresh_dashboard_statistics();');
END;
$$ LANGUAGE plpgsql;
```

### 5.2 Função de Backup Automatizado
```sql
-- Função para backup automatizado
CREATE OR REPLACE FUNCTION create_automated_backup()
RETURNS TABLE(backup_file TEXT, backup_size BIGINT, created_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  backup_filename TEXT;
  backup_path TEXT;
  backup_size BIGINT;
  backup_time TIMESTAMP WITH TIME ZONE;
BEGIN
  backup_time := NOW();
  backup_filename := 'backup_' || TO_CHAR(backup_time, 'YYYYMMDD_HH24MISS') || '.sql';
  backup_path := '/backups/' || backup_filename;
  
  -- Executar backup usando pg_dump (requer superusuário ou permissões adequadas)
  COPY (
    SELECT 'pg_dump -h localhost -U postgres -d qt_master -f ' || backup_path
  ) TO PROGRAM 'bash -c';
  
  -- Obter tamanho do arquivo
  SELECT pg_size_pretty(pg_total_relation_size('pg_class')) INTO backup_size;
  
  -- Registrar no log de auditoria
  INSERT INTO audit_logs (action, resource, metadata, success, timestamp)
  VALUES ('BACKUP_CREATED', 'database', 
    jsonb_build_object('filename', backup_filename, 'size', backup_size), 
    true, backup_time);
  
  RETURN QUERY SELECT backup_filename, backup_size, backup_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agendar backup diário
SELECT cron.schedule('daily-backup', '0 2 * * *', 'SELECT create_automated_backup();');
```

## 6. Configuração Docker

### 6.1 Docker Compose para Desenvolvimento
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: qt-postgres-dev
    environment:
      POSTGRES_DB: qt_master
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
      - ./init-scripts:/docker-entrypoint-initdb.d
    networks:
      - qt-network

  redis:
    image: redis:7-alpine
    container_name: qt-redis-dev
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    networks:
      - qt-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: qt-backend-dev
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres123@postgres:5432/qt_master
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev-jwt-secret-key
      PORT: 3001
    ports:
      - "3001:3001"
    volumes:
      - ./backend:/app
      - /app/node_modules
      - ./uploads:/app/uploads
    depends_on:
      - postgres
      - redis
    networks:
      - qt-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: qt-frontend-dev
    environment:
      NODE_ENV: development
      VITE_API_URL: http://localhost:3001
      VITE_WS_URL: ws://localhost:3001
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    networks:
      - qt-network

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: qt-pgadmin-dev
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@qt.com
      PGADMIN_DEFAULT_PASSWORD: admin123
    ports:
      - "5050:80"
    depends_on:
      - postgres
    networks:
      - qt-network

  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: qt-redis-commander-dev
    environment:
      REDIS_HOSTS: local:redis:6379
    ports:
      - "8081:8081"
    depends_on:
      - redis
    networks:
      - qt-network

volumes:
  postgres_data:
  redis_data:

networks:
  qt-network:
    driver: bridge
```

### 6.2 Dockerfile para Backend com Puppeteer
```dockerfile
# backend/Dockerfile
FROM node:18-slim

# Instalar dependências do Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY . .

# Build TypeScript
RUN npm run build

# Crier usuário não-root para segurança
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Mudar para usuário não-root
USER pptruser

# Expor porta
EXPOSE 3001

# Comando para iniciar
CMD ["node", "dist/server.js"]
```

## 7. Testes e Validação

### 7.1 Teste de Performance de Importação
```typescript
// backend/tests/performance/importPerformance.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { ExcelProcessingService } from '../../src/services/excelProcessingService';
import fs from 'fs/promises';
import path from 'path';

describe('Import Performance Tests', () => {
  let service: ExcelProcessingService;
  let testFiles: string[] = [];
  
  beforeAll(async () => {
    service = new ExcelProcessingService();
    
    // Gerar arquivos de teste com diferentes tamanhos
    testFiles = await generateTestFiles([
      { name: 'small', rows: 100 },
      { name: 'medium', rows: 1000 },
      { name: 'large', rows: 10000 },
      { name: 'xlarge', rows: 50000 }
    ]);
  });
  
  afterAll(async () => {
    // Limpar arquivos de teste
    for (const file of testFiles) {
      await fs.unlink(file).catch(() => {});
    }
  });
  
  it('should process small file (< 1000 rows) in less than 2 seconds', async () => {
    const startTime = Date.now();
    
    const result = await service.processExcelFile(
      testFiles.find(f => f.includes('small'))!,
      'small_test.xlsx',
      {
        suitcaseId: 'test-suitcase',
        userId: 'test-user',
        validateData: true,
        chunkSize: 100
      }
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(2000); // 2 segundos
    expect(result.processedRows).toBe(100);
    expect(result.failedRows).toBe(0);
  });
  
  it('should process large file (> 10000 rows) efficiently', async () => {
    const startTime = Date.now();
    
    const result = await service.processExcelFile(
      testFiles.find(f => f.includes('large'))!,
      'large_test.xlsx',
      {
        suitcaseId: 'test-suitcase',
        userId: 'test-user',
        validateData: true,
        chunkSize: 1000
      }
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Expectativa: processar 10000 linhas em menos de 30 segundos
    expect(duration).toBeLessThan(30000);
    expect(result.processedRows).toBe(10000);
    expect(result.processingTime).toBeLessThan(25000);
  });
  
  it('should handle memory efficiently during processing', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    await service.processExcelFile(
      testFiles.find(f => f.includes('xlarge'))!,
      'xlarge_test.xlsx',
      {
        suitcaseId: 'test-suitcase',
        userId: 'test-user',
        validateData: true,
        chunkSize: 5000
      }
    );
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memória não deve aumentar mais que 100MB para processar 50000 linhas
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
  });
  
  async function generateTestFiles(sizes: Array<{name: string, rows: number}>): Promise<string[]> {
    const files: string[] = [];
    
    for (const size of sizes) {
      const filePath = path.join(__dirname, `${size.name}_test.xlsx`);
      
      // Gerar dados de teste
      const data = [];
      const startDate = new Date('2024-01-01');
      
      for (let i = 0; i < size.rows; i++) {
        const timestamp = new Date(startDate.getTime() + i * 60000); // Adicionar 1 minuto
        data.push({
          timestamp: timestamp.toISOString(),
          temperature: 20 + Math.random() * 10, // Temperatura entre 20-30°C
          humidity: 50 + Math.random() * 30, // Umidade entre 50-80%
          sensor_id: `sensor_${i % 5 + 1}` // 5 sensores diferentes
        });
      }
      
      // Criar arquivo Excel com dados
      const XLSX = require('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
      XLSX.writeFile(workbook, filePath);
      
      files.push(filePath);
    }
    
    return files;
  }
});
```

### 7.2 Teste de Qualidade de PDF Gerado
```typescript
// backend/tests/integration/pdfGeneration.test.ts
import { describe, it, expect, beforeAll } from '@jest/globals';
import { pdfService } from '../../src/services/pdfGenerationService';
import pdfParse from 'pdf-parse';

describe('PDF Generation Integration Tests', () => {
  beforeAll(async () => {
    await pdfService.initialize();
  });
  
  it('should generate PDF with correct structure', async () => {
    const template = `
      <div class="report">
        <h1>Laudo de Validação</h1>
        <p>Cliente: {{client.name}}</p>
        <p>Período: {{validation.startDate}} a {{validation.endDate}}</p>
        <table class="table">
          <thead>
            <tr>
              <th>Sensor</th>
              <th>Temperatura Média</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {{#each sensors}}
            <tr>
              <td>{{serialNumber}}</td>
              <td>{{formatTemperature averageTemperature}}</td>
              <td>{{status}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>
      </div>
    `;
    
    const data = {
      client: {
        name: 'Empresa Teste Ltda',
        cnpj: '12.345.678/0001-90'
      },
      validation: {
        startDate: '01/01/2024',
        endDate: '03/01/2024'
      },
      sensors: [
        { serialNumber: 'S001', averageTemperature: 22.5, status: 'Aprovado' },
        { serialNumber: 'S002', averageTemperature: 23.1, status: 'Aprovado' },
        { serialNumber: 'S003', averageTemperature: 24.8, status: 'Reprovado' }
      ]
    };
    
    const pdfBuffer = await pdfService.generatePDF(template, data, {
      format: 'A4',
      orientation: 'portrait',
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm'
      }
    });
    
    // Verificar que PDF foi gerado
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    
    // Parsear PDF para verificar conteúdo
    const pdfData = await pdfParse(pdfBuffer);
    
    // Verificar que conteúdo esperado está presente
    expect(pdfData.text).toContain('Laudo de Validação');
    expect(pdfData.text).toContain('Empresa Teste Ltda');
    expect(pdfData.text).toContain('S001');
    expect(pdfData.text).toContain('22.5 °C');
    
    // Verificar número de páginas
    expect(pdfData.numpages).toBeGreaterThanOrEqual(1);
  });
  
  it('should handle complex templates with charts', async () => {
    const template = `
      <div class="report">
        <h1>Relatório Completo</h1>
        
        <h2>Dados Estatísticos</h2>
        <ul>
          <li>Temperatura Média: {{statistics.temperature.average}} °C</li>
          <li>Temperatura Mínima: {{statistics.temperature.min}} °C</li>
          <li>Temperatura Máxima: {{statistics.temperature.max}} °C</li>
          <li>Desvio Padrão: {{statistics.temperature.standardDeviation}} °C</li>
        </ul>
        
        <h2>Análise de Tendências</h2>
        <div class="chart-placeholder">
          <p>[Gráfico de temperatura será inserido aqui]</p>
        </div>
        
        <h2>Conclusão</h2>
        {{#if validation.isApproved}}
        <p style="color: green;">✓ A validação foi APROVADA conforme os critérios estabelecidos.</p>
        {{else}}
        <p style="color: red;">✗ A validação foi REPROVADA devido a desvios fora dos limites aceitáveis.</p>
        {{/if}}
      </div>
    `;
    
    const data = {
      statistics: {
        temperature: {
          average: 22.8,
          min: 20.1,
          max: 25.3,
          standardDeviation: 1.2
        }
      },
      validation: {
        isApproved: true
      }
    };
    
    const pdfBuffer = await pdfService.generatePDF(template, data);
    const pdfData = await pdfParse(pdfBuffer);
    
    // Verificar conteúdo complexo
    expect(pdfData.text).toContain('22.8 °C');
    expect(pdfData.text).toContain('20.1 °C');
    expect(pdfData.text).toContain('25.3 °C');
    expect(pdfData.text).toContain('APROVADA');
  });
  
  it('should generate PDF within acceptable time limit', async () => {
    const startTime = Date.now();
    
    const template = '<div><h1>Test Performance</h1><p>{{content}}</p></div>';
    const data = { content: 'Conteúdo de teste para verificar performance' };
    
    await pdfService.generatePDF(template, data);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // PDF simples deve ser gerado em menos de 5 segundos
    expect(duration).toBeLessThan(5000);
  });
});
```

---

**Notas de Implementação:**

1. **Performance**: Os exemplos incluem otimizações como cache de templates, processamento em chunks e uso de índices de banco de dados
2. **Segurança**: Implementações incluem validação de dados, sanitização e princípios de segurança
3. **Escalabilidade**: Código preparado para grandes volumes de dados com processamento assíncrono e filas
4. **Manutenibilidade**: Código bem documentado com tipos TypeScript e separação de responsabilidades
5. **Testes**: Exemplos de testes incluem performance, integração e casos de uso reais

Estes exemplos servem como base para implementação e podem ser adaptados conforme necessário para atender requisitos específicos do projeto.