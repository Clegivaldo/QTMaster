import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

interface TemplateData {
  client: {
    name: string;
    document?: string;
    email?: string;
    phone?: string;
  };
  validation: {
    id: string;
    startDate: Date;
    endDate: Date;
    temperatureStats: {
      min: number;
      max: number;
      avg: number;
    };
    humidityStats?: {
      min: number;
      max: number;
      avg: number;
    };
  };
  sensors: Array<{
    id: string;
    name?: string;
    serialNumber: string;
    model: string;
  }>;
  sensorData: Array<{
    timestamp: Date;
    temperature: number;
    humidity?: number;
    sensorId: string;
  }>;
  report: {
    generatedAt: Date;
    generatedBy: string;
  };
}

interface EditorElement {
  id: string;
  type: 'text' | 'image' | 'chart' | 'rectangle' | 'circle' | 'line' | 'heading';
  position: { x: number; y: number };
  size: { width: number; height: number };
  content?: any;
  styles: any;
  properties?: any;
}

export class EditorTemplateRenderer {
  /**
   * Render an EditorTemplate to HTML
   */
  async renderToHTML(templateId: string, data: TemplateData): Promise<string> {
    try {
      // Fetch template
      const template = await prisma.editorTemplate.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Convert elements to HTML asynchronously
      const elements = (template.elements as unknown as EditorElement[]) || [];
      const elementsHTMLArray = await Promise.all(
        elements.map(el => this.convertElementToHTML(el, data))
      );
      const elementsHTML = elementsHTMLArray.join('');

      // Build complete HTML document
      const html = this.buildHTMLDocument(elementsHTML, template.pageSettings, template.globalStyles);

      logger.info('Template rendered successfully', { templateId });
      return html;
    } catch (error) {
      logger.error('Error rendering template to HTML', { error, templateId });
      throw error;
    }
  }

  /**
   * Convert a single element to HTML
   */
  private async convertElementToHTML(element: EditorElement, data: TemplateData): Promise<string> {
    const { type, position, size, content, styles, properties } = element;

    // Apply positioning
    const positionStyles = this.getPositionStyles(position, size);
    const elementStyles = this.applyStyles(styles);
    const combinedStyles = `${positionStyles} ${elementStyles}`;

    switch (type) {
      case 'text':
      case 'heading':
        return this.renderTextElement(element, data, combinedStyles);

      case 'image':
        return this.renderImageElement(element, combinedStyles);

      case 'chart':
        return this.renderChartElement(element, data, combinedStyles);

      case 'rectangle':
        return this.renderRectangle(element, combinedStyles);

      case 'circle':
        return this.renderCircle(element, combinedStyles);

      case 'line':
        return this.renderLine(element, combinedStyles);

      default:
        logger.warn(`Unknown element type: ${type}`);
        return '';
    }
  }

  /**
   * Render text element with dynamic content support
   */
  private renderTextElement(element: EditorElement, data: TemplateData, styles: string): string {
    let content = element.content || '';

    // Process dynamic text if enabled
    if (element.properties?.isDynamic) {
      try {
        content = this.processDynamicText(content, data);
      } catch (error) {
        logger.warn('Error processing dynamic text', { error, content });
      }
    }

    const tag = element.type === 'heading' ? 'h1' : 'div';
    return `<${tag} class="editor-element editor-text" style="${styles}">${this.escapeHTML(content)}</${tag}>`;
  }

  /**
   * Process dynamic text - replace {{variables}} with actual data
   * Supports formatters: {{variable | formatter}}
   */
  private processDynamicText(text: string, data: TemplateData): string {
    // Match {{variable}} or {{variable | formatter}}
    const variablePattern = /\{\{([^}|]+)(?:\|([^}]+))?\}\}/g;

    return text.replace(variablePattern, (match, path, formatter) => {
      const trimmedPath = path.trim();
      const trimmedFormatter = formatter ? formatter.trim() : undefined;

      const value = this.resolveDataPath(trimmedPath, data);

      logger.debug('Processing dynamic text', { match, path: trimmedPath, formatter: trimmedFormatter, value, valueType: typeof value });

      if (value === undefined || value === null) {
        // Don't warn for optional variables or if we want to show empty string
        // logger.warn('Undefined value in dynamic text', { path: trimmedPath });
        return '';
      }

      if (trimmedFormatter) {
        return this.applyFormatter(value, trimmedFormatter);
      }

      return this.formatDataValue(value);
    });
  }

  /**
   * Resolve nested data path (e.g., "client.name", "validation.temperatureStats.avg")
   */
  private resolveDataPath(path: string, data: any): any {
    const parts = path.split('.');
    let current = data;

    logger.debug('Resolving data path', { path, parts, dataKeys: Object.keys(data || {}) });

    for (const part of parts) {
      if (current === null || current === undefined) {
        logger.warn('Path resolution failed', { path, part, current, currentType: typeof current });
        return undefined;
      }
      current = current[part];
      logger.debug('Path part resolved', { part, current, currentType: typeof current });
    }

    return current;
  }

  /**
   * Format data value for display
   */
  private formatDataValue(value: any): string {
    if (value instanceof Date) {
      // Format as dd/mm/yyyy
      const day = String(value.getDate()).padStart(2, '0');
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const year = value.getFullYear();
      return `${day}/${month}/${year}`;
    }

    if (typeof value === 'number') {
      return value.toFixed(2);
    }

    if (typeof value === 'boolean') {
      return value ? 'Sim' : 'Não';
    }

    return String(value);
  }

  /**
   * Render image element
   */
  private renderImageElement(element: EditorElement, styles: string): string {
    const src = element.content?.src || element.content || '';
    const alt = element.content?.alt || 'Image';

    return `<img class="editor-element editor-image" src="${this.escapeHTML(src)}" alt="${this.escapeHTML(alt)}" style="${styles}" />`;
  }

  /**
   * Render chart element using server-side rendering
   */
  private async renderChartElement(element: EditorElement, data: TemplateData, styles: string): Promise<string> {
    try {
      // Import dynamically to avoid circular dependencies if any
      const { chartRenderService } = await import('./chartRenderService.js');

      // Cast to ChartElement (assuming structure)
      const chartElement = element as any; // We'll define proper interface later or cast here
      const chartConfig = chartElement.content || {};

      // Prepare chart data
      const chartData = this.prepareChartDataFromSource(chartConfig, data);

      // Render chart to base64 image
      const chartImage = await chartRenderService.renderChartToBase64({
        type: chartConfig.chartType || 'line',
        data: chartData,
        options: chartConfig.options || {},
        width: Math.round((element.size.width || 100) * 3.78), // mm to px (approx 96 DPI)
        height: Math.round((element.size.height || 50) * 3.78)
      });

      return `<img class="editor-element editor-chart" src="${chartImage}" style="${styles}" alt="Chart" />`;
    } catch (error) {
      logger.error('Error rendering chart element', { error, elementId: element.id });
      // Fallback to placeholder on error
      return this.renderChartPlaceholder(element, styles);
    }
  }

  /**
   * Prepare chart data based on configuration source
   */
  private prepareChartDataFromSource(chartConfig: any, data: TemplateData): any {
    const dataSource = chartConfig.dataSource || { type: 'custom' };

    if (dataSource.type === 'validation' || dataSource.type === 'sensorData') {
      return this.prepareSensorDataChartData(dataSource, data);
    }

    // Default/Custom data
    return chartConfig.data || {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      datasets: [{
        label: 'Sample Data',
        data: [12, 19, 3, 5, 2],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }]
    };
  }

  /**
   * Prepare chart data from sensor data
   */
  private prepareSensorDataChartData(dataSource: any, data: TemplateData): any {
    const field = dataSource.field || 'temperature';
    const sensorIds = dataSource.sensorIds || [];

    // Filter data
    let filteredData = data.sensorData;
    if (sensorIds.length > 0) {
      filteredData = filteredData.filter(d => sensorIds.includes(d.sensorId));
    }

    // Group by sensor if multiple sensors
    const sensorGroups = new Map<string, any[]>();
    filteredData.forEach(item => {
      if (!sensorGroups.has(item.sensorId)) {
        sensorGroups.set(item.sensorId, []);
      }
      sensorGroups.get(item.sensorId)!.push(item);
    });

    // Generate labels from timestamps (using the first sensor's timestamps)
    // In a real scenario, we might need to align timestamps
    const firstGroup = Array.from(sensorGroups.values())[0] || [];
    const labels = firstGroup.map(d => {
      const date = new Date(d.timestamp);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    });

    // Generate datasets
    const datasets = Array.from(sensorGroups.entries()).map(([sensorId, items], index) => {
      const sensor = data.sensors.find(s => s.id === sensorId);
      const colors = [
        'rgb(239, 68, 68)',   // Red
        'rgb(59, 130, 246)',  // Blue
        'rgb(16, 185, 129)',  // Green
        'rgb(245, 158, 11)',  // Amber
        'rgb(139, 92, 246)'   // Violet
      ];
      const color = colors[index % colors.length];

      const safeColor = color || 'rgb(0,0,0)';
      return {
        label: `${sensor?.serialNumber || sensorId} (${field === 'temperature' ? '°C' : '%'})`,
        data: items.map(d => field === 'temperature' ? d.temperature : d.humidity),
        borderColor: safeColor,
        backgroundColor: safeColor.replace('rgb', 'rgba').replace(')', ', 0.1)'),
        tension: 0.4,
        pointRadius: 0, // Optimize for many points
        borderWidth: 2
      };
    });

    return { labels, datasets };
  }

  /**
   * Render table element with dynamic data
   */
  private renderTableElement(element: EditorElement, data: TemplateData, styles: string): string {
    const tableElement = element as any; // Cast to TableElement
    const tableConfig = tableElement.content || {};
    const dataSource = tableConfig.dataSource || 'sensorData';

    // Resolve data source
    let tableData = this.resolveDataPath(dataSource, data);

    // If data is not an array, try to wrap it or return empty
    if (!Array.isArray(tableData)) {
      if (tableData) {
        tableData = [tableData];
      } else {
        // Fallback for preview/empty state
        tableData = [
          { col1: 'Sample 1', col2: 'Sample 2' },
          { col1: 'Sample 3', col2: 'Sample 4' }
        ];
      }
    }

    // Pagination logic (simple version for now, just taking first N rows if pagination not fully implemented)
    // In a full implementation, this would handle page breaks
    const rowsPerPage = tableConfig.pagination?.rowsPerPage || 50;
    const pageData = tableData.slice(0, rowsPerPage);

    return this.renderTablePage(element, pageData, 1, Math.ceil(tableData.length / rowsPerPage));
  }

  /**
   * Render a single page of a table
   */
  private renderTablePage(
    element: EditorElement,
    data: any[],
    pageIndex: number,
    totalPages: number
  ): string {
    const tableElement = element as any;
    const tableConfig = tableElement.content || {};
    const columns = tableConfig.columns || [
      { header: 'Column 1', field: 'col1' },
      { header: 'Column 2', field: 'col2' }
    ];
    const styles = tableConfig.styles || {};

    const headerStyle = `
      background-color: ${styles.headerBackground || '#f3f4f6'};
      color: ${styles.headerColor || '#374151'};
      font-weight: 600;
      padding: 8px 12px;
      border: 1px solid ${styles.borderColor || '#d1d5db'};
      text-align: left;
    `;

    const cellStyle = `
      font-size: ${styles.fontSize || 12}px;
      border: 1px solid ${styles.borderColor || '#d1d5db'};
      padding: 8px 12px;
    `;

    // Render headers
    const headersHTML = columns.map((col: any) => `
      <th style="${headerStyle} ${col.width ? `width: ${col.width};` : ''} text-align: ${col.align || 'left'};">
        ${this.escapeHTML(col.header)}
      </th>
    `).join('');

    // Render rows
    const rowsHTML = data.map((row, index) => {
      const rowStyle = styles.alternateRows && index % 2 === 1
        ? 'background-color: #f9fafb;'
        : '';

      const cells = columns.map((col: any) => {
        // Resolve field value (support nested paths)
        const value = this.resolveDataPath(col.field, row);

        // Apply formatter
        const formattedValue = col.formatter
          ? this.applyFormatter(value, col.formatter)
          : this.formatDataValue(value);

        return `
          <td style="${cellStyle} ${rowStyle} text-align: ${col.align || 'left'};">
            ${this.escapeHTML(formattedValue)}
          </td>
        `;
      }).join('');

      return `<tr>${cells}</tr>`;
    }).join('');

    const pageInfo = tableConfig.pagination?.showPageNumbers
      ? `<div style="text-align: center; margin-top: 8px; font-size: 10px; color: #6b7280;">
           Página ${pageIndex} de ${totalPages}
         </div>`
      : '';

    // We wrap the table in a div that applies the element's position and size
    // Note: The element styles are already passed in 'styles' arg to renderTableElement, 
    // but here we are constructing the inner HTML. 
    // The caller (convertElementToHTML) wraps this return value in a div if needed, 
    // OR we return the full HTML.
    // Looking at other render methods, they return the inner content or the full element.
    // convertElementToHTML uses the return value as the content of the element div?
    // No, convertElementToHTML returns the FULL HTML string for the element.
    // So we need to wrap it.

    return `
      <div class="editor-element editor-table" style="${styles} overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; background-color: white;">
          <thead>
            <tr>${headersHTML}</tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
        ${pageInfo}
      </div>
    `;
  }

  /**
   * Apply specific formatter to value
   */
  private applyFormatter(value: any, formatter: string): string {
    if (value === null || value === undefined) return '';

    switch (formatter) {
      case 'formatDate':
        try {
          return new Date(value).toLocaleDateString('pt-BR');
        } catch { return String(value); }
      case 'formatDateTime':
        try {
          return new Date(value).toLocaleString('pt-BR');
        } catch { return String(value); }
      case 'formatTemperature':
        return `${Number(value).toFixed(1)} °C`;
      case 'formatHumidity':
        return `${Number(value).toFixed(1)} %`;
      case 'formatCurrency':
        try {
          return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
        } catch { return String(value); }
      case 'uppercase':
        return String(value).toUpperCase();
      default:
        return String(value);
    }
  }

  /**
   * Render chart placeholder (fallback)
   */
  private renderChartPlaceholder(element: EditorElement, styles: string): string {
    const chartType = element.content?.chartType || 'line';

    return `
      <div class="editor-element editor-chart" style="${styles}">
        <div class="chart-placeholder">
          <p>Gráfico ${chartType}</p>
          <p class="text-sm text-gray-500">Dados em tempo real</p>
        </div>
      </div>
    `;
  }

  /**
   * Render rectangle shape
   */
  private renderRectangle(element: EditorElement, styles: string): string {
    const fillColor = element.content?.fillColor || 'transparent';
    const strokeColor = element.content?.strokeColor || '#000000';
    const strokeWidth = element.content?.strokeWidth || 0;

    const shapeStyles = `
      background-color: ${fillColor};
      border: ${strokeWidth}px solid ${strokeColor};
      ${styles}
    `;

    return `<div class="editor-element editor-rectangle" style="${shapeStyles}"></div>`;
  }

  /**
   * Render circle shape
   */
  private renderCircle(element: EditorElement, styles: string): string {
    const fillColor = element.content?.fillColor || 'transparent';
    const strokeColor = element.content?.strokeColor || '#000000';
    const strokeWidth = element.content?.strokeWidth || 0;

    const shapeStyles = `
      background-color: ${fillColor};
      border: ${strokeWidth}px solid ${strokeColor};
      border-radius: 50%;
      ${styles}
    `;

    return `<div class="editor-element editor-circle" style="${shapeStyles}"></div>`;
  }

  /**
   * Render line element
   */
  private renderLine(element: EditorElement, styles: string): string {
    const color = element.content?.style?.color || '#000000';
    const thickness = element.content?.thickness || 2;
    const lineStyle = element.content?.style?.style || 'solid';

    const lineStyles = `
      border-bottom: ${thickness}px ${lineStyle} ${color};
      ${styles}
    `;

    return `<div class="editor-element editor-line" style="${lineStyles}"></div>`;
  }

  /**
   * Get position styles (absolute positioning)
   */
  private getPositionStyles(position: { x: number; y: number }, size: { width: number; height: number }): string {
    // Provide default values if position or size are undefined - FIXED FOR UNDEFINED VALUES
    const x = position?.x ?? 0;
    const y = position?.y ?? 0;
    const width = size?.width ?? 100;
    const height = size?.height ?? 50;

    return `
      position: absolute;
      left: ${x}mm;
      top: ${y}mm;
      width: ${width}mm;
      height: ${height}mm;
    `;
  }

  /**
   * Apply element styles
   */
  private applyStyles(styles: any): string {
    if (!styles) return '';

    const cssRules: string[] = [];

    // Font styles
    if (styles.fontFamily) cssRules.push(`font-family: ${styles.fontFamily}`);
    if (styles.fontSize) cssRules.push(`font-size: ${styles.fontSize}px`);
    if (styles.fontWeight) cssRules.push(`font-weight: ${styles.fontWeight}`);
    if (styles.fontStyle) cssRules.push(`font-style: ${styles.fontStyle}`);
    if (styles.textDecoration) cssRules.push(`text-decoration: ${styles.textDecoration}`);
    if (styles.textAlign) cssRules.push(`text-align: ${styles.textAlign}`);
    if (styles.verticalAlign) cssRules.push(`vertical-align: ${styles.verticalAlign}`);

    // Colors
    if (styles.color) cssRules.push(`color: ${styles.color}`);
    if (styles.backgroundColor) cssRules.push(`background-color: ${styles.backgroundColor}`);

    // Spacing
    if (styles.padding) cssRules.push(`padding: ${styles.padding}px`);
    if (styles.margin) cssRules.push(`margin: ${styles.margin}px`);

    // Border
    if (styles.border && styles.border.width > 0) {
      cssRules.push(`border: ${styles.border.width}px ${styles.border.style || 'solid'} ${styles.border.color || '#000'}`);
    }
    if (styles.borderRadius) cssRules.push(`border-radius: ${styles.borderRadius}px`);

    // Opacity
    if (styles.opacity !== undefined) cssRules.push(`opacity: ${styles.opacity}`);

    return cssRules.join('; ');
  }

  /**
   * Build complete HTML document
   */
  private buildHTMLDocument(elementsHTML: string, pageSettings: any, globalStyles: any): string {
    const pageWidth = pageSettings?.width || 210; // A4 width in mm
    const pageHeight = pageSettings?.height || 297; // A4 height in mm

    // Watermark CSS
    const watermarkCSS = pageSettings?.watermark ? `
      .watermark {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: ${pageSettings.watermark.size || 100}px;
        color: ${pageSettings.watermark.color || '#000000'};
        opacity: ${pageSettings.watermark.opacity || 0.1};
        pointer-events: none;
        z-index: 1000;
        white-space: nowrap;
        font-weight: bold;
        font-family: sans-serif;
      }
    ` : '';

    const watermarkHTML = pageSettings?.watermark?.text ? `
      <div class="watermark">${this.escapeHTML(pageSettings.watermark.text)}</div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Relatório</title>
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
            
            .page-container {
              position: relative;
              width: ${pageWidth}mm;
              min-height: ${pageHeight}mm;
              margin: 0 auto;
              background: white;
              overflow: visible;
            }
            
            .editor-element {
              box-sizing: border-box;
            }
            
            .editor-text, .editor-heading {
              overflow-wrap: break-word;
              word-wrap: break-word;
            }
            
            .chart-placeholder {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100%;
              border: 2px dashed #cbd5e0;
              border-radius: 8px;
              background: #f7fafc;
              padding: 20px;
              text-align: center;
            }
            
            .text-sm {
              font-size: 12px;
            }
            
            .text-gray-500 {
              color: #6b7280;
            }
            
            @page {
              size: ${pageWidth}mm ${pageHeight}mm;
              margin: 0;
            }
            
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              
              .page-container {
                page-break-after: always;
              }
            }

            ${watermarkCSS}
          </style>
        </head>
        <body>
          <div class="page-container">
            ${watermarkHTML}
            ${elementsHTML}
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHTML(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return String(text).replace(/[&<>"']/g, (char) => map[char] || char);
  }
}

export const editorTemplateRenderer = new EditorTemplateRenderer();
