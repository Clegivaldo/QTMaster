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

      // Convert elements to HTML
      const elements = (template.elements as unknown as EditorElement[]) || [];
      const elementsHTML = elements.map(el => this.convertElementToHTML(el, data)).join('');

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
  private convertElementToHTML(element: EditorElement, data: TemplateData): string {
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
        return this.renderChartPlaceholder(element, combinedStyles);

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
   */
  private processDynamicText(text: string, data: TemplateData): string {
    // Match all {{variable}} patterns
    const variablePattern = /\{\{([^}]+)\}\}/g;

    return text.replace(variablePattern, (match, path) => {
      const trimmedPath = path.trim();
      const value = this.resolveDataPath(trimmedPath, data);

      if (value === undefined || value === null) {
        return '';
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

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
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
   * Render chart placeholder (charts will be generated separately)
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
    return `
      position: absolute;
      left: ${position.x}mm;
      top: ${position.y}mm;
      width: ${size.width}mm;
      height: ${size.height}mm;
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
          </style>
        </head>
        <body>
          <div class="page-container">
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
