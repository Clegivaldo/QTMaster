import { EditorTemplate, TemplateElement } from '../types/editor';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationOptions {
  requireElements?: boolean;
  requireName?: boolean;
  requireId?: boolean;
  checkElementBounds?: boolean;
  maxElements?: number;
}

/**
 * Valida um template antes da exportação ou salvamento
 */
export const validateTemplate = (
  template: EditorTemplate,
  options: ValidationOptions = {}
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const {
    requireElements = false,
    requireName = true,
    requireId = false,
    checkElementBounds = true,
    maxElements = 1000
  } = options;

  // Validações básicas
  if (!template) {
    errors.push('Template é obrigatório');
    return { isValid: false, errors, warnings };
  }

  // Validar nome
  if (requireName && (!template.name || template.name.trim() === '')) {
    errors.push('Nome do template é obrigatório');
  }

  // Validar ID
  if (requireId && (!template.id || template.id.trim() === '')) {
    errors.push('ID do template é obrigatório');
  }

  // Validar elementos
  // Support both legacy flat `elements` and new per-page `pages` model.
  let allElements: TemplateElement[] = [];

  if (template.pages && Array.isArray(template.pages) && template.pages.length > 0) {
    // Validate pages and collect elements from pages
    template.pages.forEach((page, pageIndex) => {
      if (!page || !Array.isArray(page.elements)) {
        // allow empty pages but normalize later
        return;
      }

      // Validate quantity per page
      if (page.elements.length > maxElements) {
        errors.push(`Página ${pageIndex + 1} possui muitos elementos (${page.elements.length}). Máximo permitido: ${maxElements}`);
      }

      page.elements.forEach((element, idx) => {
        const elementErrors = validateElement(element, idx);
        errors.push(...elementErrors);
      });

      allElements = allElements.concat(page.elements);
    });
  } else {
    // Legacy single-page template
    if (!template.elements) {
      template.elements = [];
      warnings.push('Template não possui elementos - array vazio foi criado');
    } else if (!Array.isArray(template.elements)) {
      errors.push('Elementos do template devem ser um array');
    } else {
      // Validar quantidade de elementos
      if (template.elements.length === 0 && requireElements) {
        errors.push('Template deve conter pelo menos um elemento');
      }

      if (template.elements.length > maxElements) {
        errors.push(`Template possui muitos elementos (${template.elements.length}). Máximo permitido: ${maxElements}`);
      }

      // Validar cada elemento
      template.elements.forEach((element, index) => {
        const elementErrors = validateElement(element, index);
        errors.push(...elementErrors);
      });

      allElements = allElements.concat(template.elements);
    }
  }

  // Validar configurações de página
  if (template.pages && Array.isArray(template.pages) && template.pages.length > 0) {
    template.pages.forEach((page, idx) => {
      if (!page || !page.pageSettings) {
        warnings.push(`Página ${idx + 1} sem configuração - usando padrões`);
        return;
      }
      const pageErrors = validatePageSettings(page.pageSettings);
      errors.push(...pageErrors);
    });
  } else {
    // legacy pageSettings at root
    const legacyPageSettings = (template as any).pageSettings;
    if (!legacyPageSettings) {
      warnings.push('Configurações de página não definidas - usando padrões');
      (template as any).pageSettings = {
        size: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        backgroundColor: '#ffffff',
        showMargins: false
      };
    } else {
      const pageErrors = validatePageSettings(legacyPageSettings);
      errors.push(...pageErrors);
    }
  }

  // Validar estilos globais
  if (!template.globalStyles) {
    warnings.push('Estilos globais não definidos - usando padrões');
    template.globalStyles = {
      fontFamily: 'Arial',
      fontSize: 12,
      color: '#000000',
      backgroundColor: '#ffffff',
      lineHeight: 1.4
    };
  }

  // Validar limites dos elementos (se solicitado)
  if (checkElementBounds) {
    if (template.pages && Array.isArray(template.pages) && template.pages.length > 0) {
      template.pages.forEach((page) => {
        if (Array.isArray(page.elements) && page.pageSettings) {
          const boundsErrors = validateElementBounds(page.elements, page.pageSettings);
          warnings.push(...boundsErrors);
        }
      });
    } else if ((template as any).pageSettings && Array.isArray(allElements)) {
      const boundsErrors = validateElementBounds(allElements, (template as any).pageSettings);
      warnings.push(...boundsErrors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Valida variáveis dinâmicas no conteúdo
 */
const validateDynamicVariables = (content: string): string[] => {
  const errors: string[] = [];

  // Check for unclosed brackets
  const openBrackets = (content.match(/\{\{/g) || []).length;
  const closeBrackets = (content.match(/\}\}/g) || []).length;

  if (openBrackets !== closeBrackets) {
    errors.push(`Desbalanço de chaves em variáveis dinâmicas: ${openBrackets} abertas vs ${closeBrackets} fechadas`);
  }

  // Check variable format - support BOTH syntaxes
  const regex = /\{\{([^}]+)\}\}/g;
  const validFormatters = ['formatDate', 'formatDateTime', 'formatCurrency', 'formatTemperature', 'formatHumidity', 'uppercase'];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const fullContent = match[1].trim();
    if (!fullContent) {
      errors.push(`Variável vazia encontrada: {{}}`);
      continue;
    }

    // Check if function-style: {{formatDate variable}}
    const functionMatch = fullContent.match(/^(formatDate|formatDateTime|formatCurrency|formatTemperature|formatHumidity|uppercase)\s+(.+)$/);
    if (functionMatch) {
      // Validate variable path in function syntax
      const variablePath = functionMatch[2].trim();
      if (!/^[a-zA-Z0-9_.]+$/.test(variablePath)) {
        errors.push(`Variável com formato inválido: {{${fullContent}}}`);
      }
      continue;
    }

    // Check if pipe-style: {{variable}} or {{variable|formatter}}
    const pipeMatch = fullContent.match(/^([^|]+)(?:\|(.+))?$/);
    if (pipeMatch) {
      const variablePath = pipeMatch[1].trim();

      // Validate variable path - allow dots for nested paths
      if (!/^[a-zA-Z0-9_.]+$/.test(variablePath)) {
        errors.push(`Variável com formato inválido: {{${fullContent}}}`);
      }
    }
  }

  return errors;
};
/**
 * Valida um elemento individual
 */
const validateElement = (element: TemplateElement, index: number): string[] => {
  const errors: string[] = [];

  if (!element) {
    errors.push(`Elemento ${index} é nulo ou indefinido`);
    return errors;
  }

  // Validar ID
  if (!element.id || element.id.trim() === '') {
    errors.push(`Elemento ${index} não possui ID válido`);
  }

  // Validar tipo
  const validTypes = ['text', 'heading', 'image', 'table', 'chart', 'line', 'rectangle', 'circle', 'signature', 'barcode', 'qrcode'];
  if (!element.type || !validTypes.includes(element.type)) {
    errors.push(`Elemento ${index} possui tipo inválido: ${element.type}`);
  }

  // Validar posição
  if (!element.position || typeof element.position.x !== 'number' || typeof element.position.y !== 'number') {
    errors.push(`Elemento ${index} possui posição inválida`);
  } else {
    if (element.position.x < 0 || element.position.y < 0) {
      errors.push(`Elemento ${index} possui posição negativa`);
    }
  }

  // Validar tamanho
  if (!element.size || typeof element.size.width !== 'number' || typeof element.size.height !== 'number') {
    errors.push(`Elemento ${index} possui tamanho inválido`);
  } else {
    if (element.size.width <= 0 || element.size.height <= 0) {
      errors.push(`Elemento ${index} possui tamanho inválido (deve ser maior que zero)`);
    }
  }

  // Validar conteúdo baseado no tipo
  if (element.type === 'text' || element.type === 'heading') {
    if (typeof element.content !== 'string') {
      errors.push(`Elemento ${index} de texto deve ter conteúdo string`);
    } else {
      // Validar variáveis dinâmicas
      const variableErrors = validateDynamicVariables(element.content);
      if (variableErrors.length > 0) {
        variableErrors.forEach(err => errors.push(`Elemento ${index}: ${err}`));
      }
    }
  } else if (element.type === 'image') {
    const imageContent = element.content as any;
    if (!imageContent || (!imageContent.src && !imageContent.url)) {
      errors.push(`Elemento ${index} de imagem deve ter URL válida`);
    }
  }

  // Validar estilos
  if (!element.styles) {
    element.styles = {};
  }

  return errors;
};

/**
 * Valida configurações de página
 */
const validatePageSettings = (pageSettings: any): string[] => {
  const errors: string[] = [];

  if (!pageSettings.size) {
    errors.push('Tamanho da página não definido');
  }

  if (!pageSettings.orientation) {
    errors.push('Orientação da página não definida');
  }

  if (!pageSettings.margins) {
    errors.push('Margens da página não definidas');
  } else {
    const { top, right, bottom, left } = pageSettings.margins;
    if (typeof top !== 'number' || typeof right !== 'number' ||
      typeof bottom !== 'number' || typeof left !== 'number') {
      errors.push('Margens da página devem ser números');
    } else if (top < 0 || right < 0 || bottom < 0 || left < 0) {
      errors.push('Margens da página não podem ser negativas');
    }
  }

  return errors;
};

/**
 * Valida se elementos estão dentro dos limites da página
 */
const validateElementBounds = (elements: TemplateElement[], pageSettings: any): string[] => {
  const warnings: string[] = [];

  // Calcular tamanho da página
  const pageSizes = {
    A4: { width: 210, height: 297 },
    A3: { width: 297, height: 420 },
    Letter: { width: 216, height: 279 },
    Legal: { width: 216, height: 356 }
  };

  let pageSize = pageSizes.A4;
  if (pageSettings.size === 'Custom' && pageSettings.customSize) {
    pageSize = pageSettings.customSize;
  } else if (pageSettings.size !== 'Custom') {
    pageSize = pageSizes[pageSettings.size as keyof typeof pageSizes] || pageSizes.A4;
  }

  if (pageSettings.orientation === 'landscape') {
    pageSize = { width: pageSize.height, height: pageSize.width };
  }

  // Considerar margens
  const margins = pageSettings.margins || { top: 0, right: 0, bottom: 0, left: 0 };

  elements.forEach((element, index) => {
    if (!element.position || !element.size) return;

    const elementRight = element.position.x + element.size.width;
    const elementBottom = element.position.y + element.size.height;

    // Verificar se elemento ultrapassa os limites
    if (element.position.x < margins.left) {
      warnings.push(`Elemento ${index} ultrapassa margem esquerda`);
    }
    if (element.position.y < margins.top) {
      warnings.push(`Elemento ${index} ultrapassa margem superior`);
    }
    if (elementRight > pageSize.width - margins.right) {
      warnings.push(`Elemento ${index} ultrapassa margem direita`);
    }
    if (elementBottom > pageSize.height - margins.bottom) {
      warnings.push(`Elemento ${index} ultrapassa margem inferior`);
    }
  });

  return warnings;
};

/**
 * Corrige problemas comuns em templates
 */
export const sanitizeTemplate = (template: EditorTemplate): EditorTemplate => {
  const sanitized = { ...template };

  // Garantir que elementos existe
  if (!sanitized.elements || !Array.isArray(sanitized.elements)) {
    sanitized.elements = [];
  }

  // Sanitizar elementos
  sanitized.elements = sanitized.elements.map((element, index) => {
    const sanitizedElement = { ...element };

    // Garantir ID
    if (!sanitizedElement.id) {
      sanitizedElement.id = `element_${Date.now()}_${index}`;
    }

    // Garantir posição válida
    if (!sanitizedElement.position || typeof sanitizedElement.position.x !== 'number' || typeof sanitizedElement.position.y !== 'number') {
      sanitizedElement.position = { x: 0, y: 0 };
    } else {
      sanitizedElement.position.x = Math.max(0, sanitizedElement.position.x);
      sanitizedElement.position.y = Math.max(0, sanitizedElement.position.y);
    }

    // Garantir tamanho válido
    if (!sanitizedElement.size || typeof sanitizedElement.size.width !== 'number' || typeof sanitizedElement.size.height !== 'number') {
      sanitizedElement.size = { width: 100, height: 50 };
    } else {
      sanitizedElement.size.width = Math.max(1, sanitizedElement.size.width);
      sanitizedElement.size.height = Math.max(1, sanitizedElement.size.height);
    }

    // Garantir estilos
    if (!sanitizedElement.styles) {
      sanitizedElement.styles = {};
    }

    // Especificidades por tipo de elemento: garantir propriedades importantes
    if (sanitizedElement.type === 'table') {
      const props = (sanitizedElement as any).properties || {};
      (sanitizedElement as any).properties = {
        dataSource: props.dataSource || '{{sensorData}}',
        columns: Array.isArray(props.columns) ? props.columns : [],
        showHeader: typeof props.showHeader === 'boolean' ? props.showHeader : true,
        headerStyle: props.headerStyle || {},
        rowStyle: props.rowStyle || {},
        alternatingRowColors: typeof props.alternatingRowColors === 'boolean' ? props.alternatingRowColors : false,
        borderStyle: props.borderStyle || 'grid',
        fontSize: typeof props.fontSize === 'number' ? props.fontSize : 12,
        fontFamily: props.fontFamily || 'Arial',
        maxRows: typeof props.maxRows === 'number' ? props.maxRows : 50,
        pageBreak: typeof props.pageBreak === 'boolean' ? props.pageBreak : false
      };
    }

    if (sanitizedElement.type === 'chart') {
      const props = (sanitizedElement as any).properties || {};
      (sanitizedElement as any).properties = {
        chartType: props.chartType || 'line',
        dataSource: props.dataSource || '{{sensorData}}',
        xAxis: props.xAxis || 'timestamp',
        yAxis: props.yAxis || 'temperature',
        title: props.title || '',
        width: props.width || '100%',
        height: props.height || '200px',
        colors: Array.isArray(props.colors) ? props.colors : ['#4bc0c0'],
        showLegend: typeof props.showLegend === 'boolean' ? props.showLegend : true,
        showGrid: typeof props.showGrid === 'boolean' ? props.showGrid : true,
        showLabels: typeof props.showLabels === 'boolean' ? props.showLabels : true,
        responsive: typeof props.responsive === 'boolean' ? props.responsive : false,
        animation: typeof props.animation === 'boolean' ? props.animation : false,
        legendPosition: props.legendPosition || 'top'
      };
    }

    // Garantir propriedades básicas
    if (typeof sanitizedElement.visible !== 'boolean') {
      sanitizedElement.visible = true;
    }
    if (typeof sanitizedElement.locked !== 'boolean') {
      sanitizedElement.locked = false;
    }
    if (typeof sanitizedElement.zIndex !== 'number') {
      sanitizedElement.zIndex = 1;
    }

    return sanitizedElement;
  });

  // Garantir páginas (novo modelo) ou pageSettings legado
  if (!sanitized.pages || !Array.isArray(sanitized.pages) || sanitized.pages.length === 0) {
    // Migrate legacy elements/pageSettings into a single default page
    const defaultPage = {
      id: `page_${Date.now()}`,
      name: 'Página 1',
      elements: Array.isArray(sanitized.elements) ? sanitized.elements : [],
      pageSettings: (sanitized as any).pageSettings || {
        size: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        backgroundColor: '#ffffff',
        showMargins: false
      },
      backgroundImage: sanitized.backgroundImage || null,
      header: null,
      footer: null
    };

    sanitized.pages = [defaultPage];
  } else {
    // IMPORTANT: Sync template.elements (with pageId) into each page.elements array
    // The frontend stores elements in template.elements with pageId for multi-page support
    // The backend expects elements in page.elements when rendering
    sanitized.pages = sanitized.pages.map((p) => {
      const pageElements = (sanitized.elements || []).filter(el => el.pageId === p.id);
      return {
        ...p,
        elements: pageElements.length > 0 ? pageElements : (Array.isArray(p.elements) ? p.elements : [])
      };
    });
  }

  // Garantir estilos globais
  if (!sanitized.globalStyles) {
    sanitized.globalStyles = {
      fontFamily: 'Arial',
      fontSize: 12,
      color: '#000000',
      backgroundColor: '#ffffff',
      lineHeight: 1.4
    };
  }

  // Garantir metadados básicos
  if (!sanitized.name) {
    sanitized.name = 'Template sem nome';
  }
  if (!sanitized.category) {
    sanitized.category = 'default';
  }
  if (!sanitized.tags || !Array.isArray(sanitized.tags)) {
    sanitized.tags = [];
  }
  if (typeof sanitized.isPublic !== 'boolean') {
    sanitized.isPublic = false;
  }

  return sanitized;
};
