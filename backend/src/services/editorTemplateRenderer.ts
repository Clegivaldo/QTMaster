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
    minTemperature?: number;
    maxTemperature?: number;
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
    chartConfig?: any;
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
  type: 'text' | 'image' | 'chart' | 'table' | 'rectangle' | 'circle' | 'line' | 'heading';
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

      // IMPORTANT: The root-level 'elements' array is the source of truth for element content.
      // The 'pages[].elements' may contain stale copies without updated variables/content.
      // We use root 'elements' for content but respect page structure for multi-page layouts.
      const pages = (template.pages as unknown as any[]) || [];
      const rootElements = (template.elements as unknown as EditorElement[]) || [];
      let bodyHTML = '';

      logger.info('Rendering template', {
        templateId,
        pagesCount: pages.length,
        rootElementsCount: rootElements.length,
        pageSettings: template.pageSettings
      });

      // Build a map of element IDs to their updated content from root elements
      const elementMap = new Map<string, EditorElement>();
      for (const el of rootElements) {
        if (el && el.id) {
          elementMap.set(el.id, el);
        }
      }

      if (rootElements.length > 0) {
        // Use root elements as the source of truth (they have the most up-to-date content)
        // If pages exist, we still render one page per page in pages array for multi-page support
        const numPages = Math.max(pages.length, 1);

        for (let i = 0; i < numPages; i++) {
          const page = pages[i] || { elements: [] };

          // For single-page or legacy templates, render all root elements in the first page
          // For multi-page templates, we would need a way to know which elements go on which page
          // For now, put all root elements on page 1 (most common case)
          const elementsToRender = i === 0 ? rootElements : (page.elements as EditorElement[]) || [];

          logger.debug(`Rendering page ${i + 1}`, {
            elementsCount: elementsToRender.length,
            usingRootElements: i === 0
          });

          const elementsHTMLArray = await Promise.all(
            elementsToRender.map(el => this.convertElementToHTML(el, data))
          );

          const pageContent = elementsHTMLArray.join('');
          const isLastPage = i === numPages - 1;
          const backgroundImage = (page as any).backgroundImage;

          bodyHTML += await this.renderPageContainer(pageContent, template.pageSettings, template.globalStyles, !isLastPage, backgroundImage);
        }
      } else if (pages.length > 0) {
        // Multi-page template without root elements - use page elements directly
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const elements = (page.elements as EditorElement[]) || [];

          logger.debug(`Rendering page ${i + 1}`, { elementsCount: elements.length });

          const elementsHTMLArray = await Promise.all(
            elements.map(el => this.convertElementToHTML(el, data))
          );

          const pageContent = elementsHTMLArray.join('');
          const isLastPage = i === pages.length - 1;
          const backgroundImage = page.backgroundImage;

          bodyHTML += await this.renderPageContainer(pageContent, template.pageSettings, template.globalStyles, !isLastPage, backgroundImage);
        }
      } else {
        // Empty template
        logger.warn('Template has no elements', { templateId });
        bodyHTML = await this.renderPageContainer('', template.pageSettings, template.globalStyles, false);
      }

      // Build complete HTML document
      const html = this.buildHTMLDocument(bodyHTML, template.pageSettings, template.globalStyles);

      logger.info('Template rendered successfully', {
        templateId,
        pages: pages.length || 1,
        htmlLength: html.length
      });
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
        return await this.renderTextElement(element, data, combinedStyles);

      case 'image':
        return await this.renderImageElement(element, combinedStyles);

      case 'chart':
        return this.renderChartElement(element, data, combinedStyles);

      case 'table':
        return this.renderTableElement(element, data, combinedStyles);

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
  private async renderTextElement(element: EditorElement, data: TemplateData, styles: string): Promise<string> {
    let content = element.content || '';

    // Process dynamic text if enabled
    if (element.properties?.isDynamic) {
      try {
        content = await this.processDynamicText(content, data);
      } catch (error) {
        logger.warn('Error processing dynamic text', { error, content });
      }
    }

    const tag = element.type === 'heading' ? 'h1' : 'div';
    return `<${tag} class="editor-element editor-text" style="${styles}">${this.escapeHTML(content)}</${tag}>`;
  }

  /**
   * Process dynamic text - replace {{variables}} or [[variables]] with actual data
   * Supports two formatter syntaxes:
   * 1. {{variable | formatter}} - pipe syntax
   * 2. {{formatter variable}} - function syntax
   */
  private async processDynamicText(text: string, data: TemplateData): Promise<string> {
    // Match {{variable}} or [[variable]] or {{variable | formatter}} or [[variable | formatter]]
    const variablePattern = /\{\{([^}|]+)(?:\|([^}]+))?\}\}|\[\[([^}|]+)(?:\|([^\]]+))?\]\]/g;
    const functionPattern = /\{\{(formatDate|formatDateTime|formatCurrency|formatTemperature|formatHumidity|uppercase)\s+([^}]+)\}\}|\[\[(formatDate|formatDateTime|formatCurrency|formatTemperature|formatHumidity|uppercase)\s+([^\]]+)\]\]/g;

    // We need to use replaceAll or split/join because replace with async callback is not supported directly
    // So we find all matches first
    const matches = Array.from(text.matchAll(variablePattern));

    if (matches.length === 0 && !functionPattern.test(text)) return text;

    let result = text;

    // Process snippets first (if any)
    // We do this by checking if any variable starts with 'snippet.'
    const snippetMatches = matches.filter(m => {
      const content = m[1] || m[3]; // Group 1 for {{}}, Group 3 for [[]]
      return content && content.trim().startsWith('snippet.');
    });

    if (snippetMatches.length > 0) {
      try {
        const { textSnippetService } = await import('./textSnippetService.js');
        const snippets = await textSnippetService.getAllActive();
        const snippetMap = new Map(snippets.map(s => [s.code, s.content]));

        for (const match of snippetMatches) {
          const fullMatch = match[0];
          const content = match[1] || match[3];
          const path = content?.trim() || '';
          const snippetCode = path.replace('snippet.', '');

          if (snippetMap.has(snippetCode)) {
            result = result.replace(fullMatch, snippetMap.get(snippetCode)!);
          }
        }
      } catch (error) {
        logger.warn('Error processing snippets', { error });
      }
    }

    // Process function-style formatters first: {{formatDate variable}}
    result = result.replace(functionPattern, (match, f1, v1, f2, v2) => {
      const formatter = f1 || f2;
      const variablePath = v1 || v2;
      const trimmedPath = variablePath.trim();
      const value = this.resolveDataPath(trimmedPath, data);

      logger.debug('Processing function-style formatter', { match, formatter, path: trimmedPath, value });

      if (value === undefined || value === null) {
        return '';
      }

      return this.applyFormatter(value, formatter);
    });

    // Re-match for remaining variables (data variables with pipe syntax)
    return result.replace(variablePattern, (match, p1, f1, p2, f2) => {
      const path = p1 || p2;
      const formatter = f1 || f2;
      const trimmedPath = path.trim();

      // Skip already processed snippets
      if (trimmedPath.startsWith('snippet.')) return match;

      // Skip if it's a function-style formatter (already processed)
      if (['formatDate', 'formatDateTime', 'formatCurrency', 'formatTemperature', 'formatHumidity', 'uppercase'].includes(trimmedPath)) {
        return match;
      }

      const trimmedFormatter = formatter ? formatter.trim() : undefined;
      const value = this.resolveDataPath(trimmedPath, data);

      logger.debug('Processing variable', { match, path: trimmedPath, formatter: trimmedFormatter, value, valueType: typeof value });

      if (value === undefined || value === null) {
        // If value is missing, return empty string (or maybe a placeholder for debugging?)
        // For now, empty string is standard behavior, but let's log it
        logger.warn(`Variable not found: ${trimmedPath}`);
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
   * Convert local images to base64 data URLs for Puppeteer rendering
   */
  private async renderImageElement(element: EditorElement, styles: string): Promise<string> {
    let src = element.content?.src || element.content || '';
    const alt = element.content?.alt || 'Image';

    // Convert relative paths to base64 data URLs for Puppeteer
    if (src && !src.startsWith('data:') && !src.startsWith('http')) {
      // Handle relative paths like /uploads/images/...
      if (src.startsWith('/')) {
        try {
          const fs = await import('fs');
          const path = await import('path');

          // Get absolute path in container
          const absolutePath = path.default.join(process.cwd(), src);

          if (fs.default.existsSync(absolutePath)) {
            const imageBuffer = fs.default.readFileSync(absolutePath);
            const ext = path.default.extname(absolutePath).toLowerCase().replace('.', '');
            const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
            const base64 = imageBuffer.toString('base64');
            src = `data:${mimeType};base64,${base64}`;
            logger.debug('Converted image to base64', { originalSrc: element.content?.src, size: imageBuffer.length });
          } else {
            logger.warn('Image file not found', { path: absolutePath });
          }
        } catch (error) {
          logger.error('Error converting image to base64', { error, src });
        }
      }
    }

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
      const chartElement = element as any;
      const chartConfig = chartElement.content || {};

      // Prepare chart data
      const chartData = this.prepareChartDataFromSource(chartConfig, data);

      // If the chart uses sensor data, prefer a line chart for series visibility
      // unless explicitly configured otherwise in the template.
      try {
        const dataSource = chartConfig.dataSource || {};
        const isSensorSource = dataSource.type === 'sensorData' || dataSource.type === 'validation' || (chartData && Array.isArray(chartData.datasets) && chartData.datasets.length > 0);
        if (isSensorSource) {
          // Ensure both properties are set so dumps and renderer see 'line'
          chartConfig.chartType = chartConfig.chartType || 'line';
          chartConfig.type = chartConfig.type || 'line';
        }
      } catch (err) {
        logger.warn('Failed to enforce line chart for sensor data', { error: err, elementId: element.id });
      }

      // Extract annotations if present (added by prepareSensorDataChartData)
      const annotations = (chartData as any).annotations;

      // Prepare options with annotations
      const options = chartConfig.options || {};
      if (annotations) {
        if (!options.plugins) options.plugins = {};
        if (!options.plugins.annotation) options.plugins.annotation = {};
        options.plugins.annotation.annotations = {
          ...options.plugins.annotation.annotations,
          ...annotations
        };
      }

      logger.debug('Rendering chart element', {
        elementId: element.id,
        chartType: chartConfig.chartType,
        dataSource: chartConfig.dataSource,
        hasLabels: chartData?.labels?.length > 0,
        hasDatasets: chartData?.datasets?.length > 0,
        hasAnnotations: !!annotations,
        elementSize: element.size
      });

      // Element sizes are already in pixels from the editor
      // Use them directly, with a minimum size fallback
      const width = Math.max(element.size?.width || 400, 100);
      const height = Math.max(element.size?.height || 200, 100);

      // Apply axis limits from validation config if available
      const validationChartConfig = (data.validation as any).chartConfig;
      if (validationChartConfig?.yAxisConfig) {
        const dataSource = chartConfig.dataSource || {};
        const field = dataSource.field || 'temperature';
        const { yAxisConfig } = validationChartConfig;

        if (!options.scales) options.scales = {};
        if (!options.scales.y) options.scales.y = {};

        if (field === 'temperature') {
          if (yAxisConfig.tempMin !== undefined) options.scales.y.min = Number(yAxisConfig.tempMin);
          if (yAxisConfig.tempMax !== undefined) options.scales.y.max = Number(yAxisConfig.tempMax);
          if (yAxisConfig.tempTick) {
            options.scales.y.ticks = { ...options.scales.y.ticks, stepSize: Number(yAxisConfig.tempTick) };
          }
        } else if (field === 'humidity') {
          if (yAxisConfig.humMin !== undefined) options.scales.y.min = Number(yAxisConfig.humMin);
          if (yAxisConfig.humMax !== undefined) options.scales.y.max = Number(yAxisConfig.humMax);
          if (yAxisConfig.humTick) {
            options.scales.y.ticks = { ...options.scales.y.ticks, stepSize: Number(yAxisConfig.humTick) };
          }
        }
      }

      // Debug: optionally dump the final chart config/data/options to disk
      try {
        const shouldDump = process.env.DEBUG_DUMP_CHARTS === '1' || (data?.validation?.id === 'cmj2spg2t0003oc4ie4hsb7t1');
        if (shouldDump) {
          const fs = await import('fs');
          const path = await import('path');
          // Before dumping, reduce final borderWidth by half to make lines thinner in PDF
          try {
            if (chartData && Array.isArray(chartData.datasets)) {
              chartData.datasets = chartData.datasets.map((ds: any) => ({
                ...ds,
                borderWidth: Math.max(0.5, (typeof ds.borderWidth === 'number' && ds.borderWidth > 0) ? ds.borderWidth / 2 : 1)
              }));
            }
          } catch (e) {
            // ignore
          }

          const dump = {
            elementId: element.id,
            chartConfig,
            chartData,
            options
          };
          const uploadsDir = path.default.join(process.cwd(), 'uploads');
          if (!fs.default.existsSync(uploadsDir)) fs.default.mkdirSync(uploadsDir, { recursive: true });
          const fname = path.default.join(uploadsDir, `debug-chart-${data?.validation?.id || 'unknown'}-${element.id}.json`);
          try {
            fs.default.writeFileSync(fname, JSON.stringify(dump, null, 2), { encoding: 'utf8' });
            logger.info('Wrote debug chart dump', { fname });
          } catch (err) {
            logger.error('Error writing debug chart dump', { error: err, fname });
          }
        }
      } catch (err) {
        logger.warn('Failed to create debug chart dump', { error: err });
      }

      // Render chart to base64 image
      const chartImage = await chartRenderService.renderChartToBase64({
        type: chartConfig.chartType || 'line',
        data: chartData,
        options: options,
        width: Math.round(width),
        height: Math.round(height)
      });

      logger.debug('Chart rendered successfully', {
        elementId: element.id,
        imageLength: chartImage.length,
        width,
        height
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
    const dataSource = chartConfig.dataSource || {};

    logger.debug('prepareChartDataFromSource called', {
      dataSourceType: dataSource?.type || 'undefined',
      hasSensorData: !!data.sensorData,
      sensorDataLength: data.sensorData?.length || 0,
      hasSensors: !!data.sensors,
      sensorsLength: data.sensors?.length || 0,
      chartConfigKeys: Object.keys(chartConfig)
    });

    // ALWAYS use sensor data when available - this is the primary use case for validation reports
    // The chart in a validation report should show the real sensor readings
    if (data.sensorData && data.sensorData.length > 0) {
      logger.debug('Using sensor data for chart (sensorData available)', { count: data.sensorData.length });
      return this.prepareSensorDataChartData(dataSource, data);
    }

    // Explicit dataSource configuration check
    if (dataSource.type === 'validation' || dataSource.type === 'sensorData') {
      logger.warn('dataSource type is validation/sensorData but no sensorData available');
      return { labels: [], datasets: [] };
    }

    // Check if chartConfig.data exists and has content
    if (chartConfig.data && chartConfig.data.labels && chartConfig.data.datasets) {
      logger.debug('Using provided chart data');
      return chartConfig.data;
    }

    // Default/Custom data - only when truly no data available
    logger.warn('Using default sample data for chart (no sensor data found)');
    return {
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
    // Normalize field names so templates using Portuguese or short names still work
    const rawField = (dataSource.field || 'temperature') as string;
    const fieldKey = String(rawField).toLowerCase();
    const tempKeys = ['temperature', 'temp', 'temperatura', 't'];
    const humKeys = ['humidity', 'hum', 'umidade', 'u'];
    const field = tempKeys.includes(fieldKey) ? 'temperature' : (humKeys.includes(fieldKey) ? 'humidity' : 'temperature');
    const sensorIds = dataSource.sensorIds || [];

    logger.debug('prepareSensorDataChartData called', {
      field,
      sensorIds,
      hasSensorData: !!data.sensorData,
      sensorDataCount: data.sensorData?.length || 0
    });

    // Safety check for sensorData
    if (!data.sensorData || !Array.isArray(data.sensorData) || data.sensorData.length === 0) {
      logger.warn('No sensor data available for chart');
      return { labels: [], datasets: [] };
    }

    // Filter data
    let filteredData = data.sensorData.slice();
    if (sensorIds.length > 0) {
      filteredData = filteredData.filter(d => sensorIds.includes(d.sensorId));
    }

    // Filter by date range if configured in validation chartConfig
    const chartConfig = data.validation?.chartConfig;
    if (chartConfig?.dateRange?.start && chartConfig?.dateRange?.end) {
      const startTime = new Date(chartConfig.dateRange.start).getTime();
      const endTime = new Date(chartConfig.dateRange.end).getTime();

      if (!isNaN(startTime) && !isNaN(endTime)) {
        filteredData = filteredData.filter((d: any) => {
          const time = new Date(d.timestamp).getTime();
          return time >= startTime && time <= endTime;
        });
      }
    }

    logger.debug('Filtered sensor data', { filteredCount: filteredData.length });

    if (filteredData.length === 0) {
      logger.warn('No sensor data after filtering');
      return { labels: [], datasets: [] };
    }

    // Normalize timestamps and sort all data by timestamp ascending
    filteredData.forEach((d: any) => {
      d._ts = new Date(d.timestamp).getTime();
    });
    filteredData.sort((a: any, b: any) => a._ts - b._ts);

    // Group by sensor id
    const sensorGroups = new Map<string, any[]>();
    filteredData.forEach(item => {
      const sId = item.sensorId || 'unknown';
      if (!sensorGroups.has(sId)) sensorGroups.set(sId, []);
      sensorGroups.get(sId)!.push(item);
    });

    logger.debug('Sensor groups formed', { groupCount: sensorGroups.size });

    // Build a sorted union of all timestamps across sensors
    const tsSet = new Set<number>();
    for (const items of sensorGroups.values()) {
      for (const it of items) tsSet.add(it._ts);
    }
    const allTimestamps = Array.from(tsSet).sort((a, b) => a - b);

    // Format labels from timestamps
    const labels = allTimestamps.map(ts => {
      try {
        const date = new Date(ts);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      } catch {
        return '';
      }
    });

    // Generate datasets aligned to labels
    const datasets = Array.from(sensorGroups.entries()).map(([sensorId, items], index) => {
      const sensor = data.sensors?.find(s => s.id === sensorId);

      // Create a map from timestamp -> value for quick lookup
      const valueMap = new Map<number, any>();
      for (const it of items) {
        const ts = it._ts;
        const val = field === 'temperature' ? it.temperature : it.humidity;
        valueMap.set(ts, val !== undefined ? val : null);
      }

      // Build data array aligned with allTimestamps (use null for missing values)
      const alignedData = allTimestamps.map(ts => (valueMap.has(ts) ? valueMap.get(ts) : null));

      // Generate distinct colors using golden angle approximation
      const hue = (index * 137.508) % 360;
      const color = `hsl(${hue}, 70%, 50%)`;
      const safeColor = color;
      const backgroundColor = `hsla(${hue}, 70%, 50%, 0.1)`;

      return {
        label: `${sensor?.serialNumber || sensorId} (${field === 'temperature' ? '°C' : '%'})`,
        data: alignedData,
        borderColor: safeColor,
        backgroundColor: backgroundColor,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      };
    });

    logger.debug('Chart data prepared', { labelsCount: labels.length, datasetsCount: datasets.length });

    // Add annotations for limits if available
    const annotations: any = {};

    // Add annotations according to the field (temperature or humidity)
    if (field === 'temperature') {
      if (data.validation?.minTemperature !== undefined) {
        annotations.minLine = {
          type: 'line',
          yMin: data.validation.minTemperature,
          yMax: data.validation.minTemperature,
          borderColor: '#000000',
          borderWidth: 1,
          borderDash: [5, 5],
        };
      }

      if (data.validation?.maxTemperature !== undefined) {
        annotations.maxLine = {
          type: 'line',
          yMin: data.validation.maxTemperature,
          yMax: data.validation.maxTemperature,
          borderColor: '#000000',
          borderWidth: 1,
          borderDash: [5, 5],
        };
      }
    } else if (field === 'humidity') {
      const yAxisCfg = data.validation?.chartConfig?.yAxisConfig;
      const minHum = data.validation?.minHumidity ?? yAxisCfg?.humMin;
      const maxHum = data.validation?.maxHumidity ?? yAxisCfg?.humMax;

      if (minHum !== undefined) {
        annotations.minLine = {
          type: 'line',
          yMin: minHum,
          yMax: minHum,
          borderColor: '#000000',
          borderWidth: 1,
          borderDash: [5, 5],
        };
      }

      if (maxHum !== undefined) {
        annotations.maxLine = {
          type: 'line',
          yMin: maxHum,
          yMax: maxHum,
          borderColor: '#000000',
          borderWidth: 1,
          borderDash: [5, 5],
        };
      }
    }

    // Ensure datasets have sensible defaults for rendering
    // Adjust line thickness (75% of original) and ensure point visibility
    const normalizedDatasets = datasets.map(ds => {
      const originalBW = (typeof ds.borderWidth === 'number' && ds.borderWidth > 0) ? ds.borderWidth : 2;
      const borderWidth = Math.max(0.75, originalBW * 0.75);
      // Force line rendering: hide points (pointRadius = 0) but ensure line is shown
      const pointRadius = (typeof ds.pointRadius === 'number') ? ds.pointRadius : 0;
      const showLine = ds.showLine !== undefined ? ds.showLine : true;
      const spanGaps = ds.spanGaps !== undefined ? ds.spanGaps : true;
      return {
        ...ds,
        borderWidth,
        pointRadius,
        showLine,
        spanGaps,
        fill: ds.fill ?? false,
      };
    });

    return {
      labels,
      datasets: normalizedDatasets,
      annotations,
    };
  }

  /**
   * Render table element with dynamic data
   */
  private renderTableElement(element: EditorElement, data: TemplateData, styles: string): string {
    const tableElement = element as any; // Cast to TableElement
    const tableConfig = tableElement.content || {};
    const dataSource = (typeof tableConfig.dataSource === 'string' && tableConfig.dataSource)
      ? tableConfig.dataSource
      : 'sensorData';

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
    // Ensure columns is an array. If not (e.g. from bad state or legacy), use defaults.
    const rawColumns = tableConfig.columns;
    const columns = Array.isArray(rawColumns) ? rawColumns : [
      { header: 'Column 1', field: 'col1' },
      { header: 'Column 2', field: 'col2' }
    ];

    // tableConfig.styles is an object describing table appearance
    const tableStylesObj: any = tableConfig.styles || {};

    const headerStyle = `
      background-color: ${tableStylesObj.headerBackground || '#f3f4f6'};
      color: ${tableStylesObj.headerColor || '#374151'};
      font-weight: 600;
      padding: 8px 12px;
      border: 1px solid ${tableStylesObj.borderColor || '#d1d5db'};
      text-align: left;
    `;

    const cellStyle = `
      font-size: ${tableStylesObj.fontSize || 12}px;
      border: 1px solid ${tableStylesObj.borderColor || '#d1d5db'};
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
      const rowStyle = tableStylesObj.alternateRows && index % 2 === 1
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

    // Build wrapper style string combining element styles (passed via `element.styles` => styles param
    // from caller) and table-specific inline styles
    const wrapperStyle = `${element.styles ? this.applyStyles(element.styles) : ''}; overflow: hidden; background-color: ${tableStylesObj.backgroundColor || 'transparent'};`;

    return `
      <div class="editor-element editor-table" style="${wrapperStyle}">
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
   * Convert from pixels (editor units) to mm (PDF units)
   * Standard screen resolution: 96 DPI, 1 inch = 25.4mm
   * So: 1px = 25.4 / 96 ≈ 0.2646mm
   */
  private getPositionStyles(position: { x: number; y: number }, size: { width: number; height: number }): string {
    // Conversion factor: pixels to mm
    // 96 DPI means 1 inch = 96 pixels, and 1 inch = 25.4mm
    const pxToMm = 25.4 / 96;

    // Provide default values if position or size are undefined
    const xPx = position?.x ?? 0;
    const yPx = position?.y ?? 0;
    const widthPx = size?.width ?? 100;
    const heightPx = size?.height ?? 50;

    // Convert to mm
    const xMm = xPx * pxToMm;
    const yMm = yPx * pxToMm;
    const widthMm = widthPx * pxToMm;
    const heightMm = heightPx * pxToMm;

    return `
      position: absolute;
      left: ${xMm.toFixed(2)}mm;
      top: ${yMm.toFixed(2)}mm;
      width: ${widthMm.toFixed(2)}mm;
      height: ${heightMm.toFixed(2)}mm;
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

    // Extract margins from globalStyles (in mm)
    const marginTop = globalStyles?.marginTop ?? 20;
    const marginRight = globalStyles?.marginRight ?? 20;
    const marginBottom = globalStyles?.marginBottom ?? 20;
    const marginLeft = globalStyles?.marginLeft ?? 20;

    // Extract typography from globalStyles
    const fontFamily = globalStyles?.fontFamily || "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const bodySize = globalStyles?.bodySize || 14;
    const lineHeight = globalStyles?.lineHeight || 1.6;
    const textColor = globalStyles?.textColor || '#374151';

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

    // Calculate content area dimensions
    const contentWidth = pageWidth - marginLeft - marginRight;
    const contentHeight = pageHeight - marginTop - marginBottom;

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
              font-family: ${fontFamily};
              font-size: ${bodySize}px;
              line-height: ${lineHeight};
              color: ${textColor};
              background: #f3f4f6; /* Light gray background for preview */
            }
            
            .page-container {
              position: relative;
              width: ${pageWidth}mm;
              min-height: ${pageHeight}mm;
              margin: 0 auto;
              background: white;
              overflow: hidden; /* Ensure elements don't bleed out */
              /* No padding - elements are positioned in absolute page coordinates (matching editor) */
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              margin-bottom: 20px;
            }

            .content-area {
              position: relative;
              width: 100%;
              min-height: ${contentHeight}mm;
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
              margin: 0; /* We handle margins in the container padding */
            }

            @media print {
              body {
                background: white;
              }
              .page-container {
                box-shadow: none;
                margin: 0;
                page-break-after: always;
              }
              .page-container:last-child {
                page-break-after: auto;
              }
            }
          </style>
        </head>
        <body>
          ${elementsHTML}
        </body>
      </html>
    `;
  }

  /**
   * Convert a local image URL to base64 data URL
   */
  private async convertImageToBase64(src: string): Promise<string> {
    if (!src || src.startsWith('data:') || src.startsWith('http')) {
      return src;
    }

    if (src.startsWith('/')) {
      try {
        const fs = await import('fs');
        const path = await import('path');

        const absolutePath = path.default.join(process.cwd(), src);

        if (fs.default.existsSync(absolutePath)) {
          const imageBuffer = fs.default.readFileSync(absolutePath);
          const ext = path.default.extname(absolutePath).toLowerCase().replace('.', '');
          const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
          const base64 = imageBuffer.toString('base64');
          return `data:${mimeType};base64,${base64}`;
        } else {
          logger.warn('Background image file not found', { path: absolutePath });
        }
      } catch (error) {
        logger.error('Error converting background image to base64', { error, src });
      }
    }
    return src;
  }

  /**
   * Render a page container with content
   */
  private async renderPageContainer(content: string, pageSettings: any, globalStyles: any, addPageBreak: boolean, backgroundImage?: any): Promise<string> {
    const pageWidth = pageSettings?.width || 210;
    const pageHeight = pageSettings?.height || 297;

    // Extract margins from globalStyles (in mm)
    const marginTop = globalStyles?.marginTop ?? 20;
    const marginRight = globalStyles?.marginRight ?? 20;
    const marginBottom = globalStyles?.marginBottom ?? 20;
    const marginLeft = globalStyles?.marginLeft ?? 20;

    // Handle background image
    let backgroundStyle = '';
    if (backgroundImage && backgroundImage.url) {
      const bgUrl = await this.convertImageToBase64(backgroundImage.url);
      const repeat = backgroundImage.repeat || 'no-repeat';
      const position = backgroundImage.position || 'center';
      const size = backgroundImage.size || 'cover';
      const opacity = backgroundImage.opacity ?? 1;

      backgroundStyle = `
        background-image: url('${bgUrl}');
        background-repeat: ${repeat};
        background-position: ${position};
        background-size: ${size};
        opacity: ${opacity};
      `;
    }

    // Watermark CSS
    const watermarkHTML = pageSettings?.watermark?.text ? `
      <div class="watermark" style="
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
      ">${this.escapeHTML(pageSettings.watermark.text)}</div>
    ` : '';

    const style = addPageBreak ? 'page-break-after: always;' : '';

    return `
      <div class="page-container" style="${style} ${backgroundStyle}">
        ${watermarkHTML}
        <div class="content-area">
          ${content}
        </div>
      </div>
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
