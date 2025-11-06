// Editor Layout Profissional - Utilitários e Helpers

import { 
  TemplateElement, 
  ElementType, 
  Position, 
  Size, 
  ValidationResult,
  EditorTemplate,
  ElementStyles
} from './editor';
import { 
  MIN_ELEMENT_SIZE, 
  ELEMENT_DEFAULTS,
  A4_SIZE 
} from './editor-constants';

// Função para gerar ID único
export const generateId = (prefix: string = 'element'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Função para criar elemento padrão
export const createDefaultElement = (
  type: ElementType, 
  position: Position = { x: 50, y: 50 }
): TemplateElement => {
  const defaults = (ELEMENT_DEFAULTS as any)[type] || ELEMENT_DEFAULTS.text;
  
  return {
    id: generateId(type),
    type,
    content: defaults.content,
    position,
    size: defaults.size,
    styles: defaults.styles,
    locked: false,
    visible: true,
    zIndex: 1
  };
};

// Função para validar posição
export const validatePosition = (position: Position): Position => {
  return {
    x: Math.max(0, Math.round(position.x)),
    y: Math.max(0, Math.round(position.y))
  };
};

// Função para validar tamanho
export const validateSize = (size: Size): Size => {
  return {
    width: Math.max(MIN_ELEMENT_SIZE.width, Math.round(size.width)),
    height: Math.max(MIN_ELEMENT_SIZE.height, Math.round(size.height))
  };
};

// Função para verificar se elemento está dentro do canvas
export const isElementInCanvas = (
  element: TemplateElement, 
  canvasSize: Size
): boolean => {
  const { position, size } = element;
  return (
    position.x >= 0 &&
    position.y >= 0 &&
    position.x + size.width <= canvasSize.width &&
    position.y + size.height <= canvasSize.height
  );
};

// Função para calcular bounds de um elemento
export const getElementBounds = (element: TemplateElement) => {
  return {
    left: element.position.x,
    top: element.position.y,
    right: element.position.x + element.size.width,
    bottom: element.position.y + element.size.height,
    centerX: element.position.x + element.size.width / 2,
    centerY: element.position.y + element.size.height / 2
  };
};

// Função para verificar colisão entre elementos
export const elementsCollide = (
  element1: TemplateElement, 
  element2: TemplateElement
): boolean => {
  const bounds1 = getElementBounds(element1);
  const bounds2 = getElementBounds(element2);
  
  return !(
    bounds1.right < bounds2.left ||
    bounds1.left > bounds2.right ||
    bounds1.bottom < bounds2.top ||
    bounds1.top > bounds2.bottom
  );
};

// Função para snap to grid
export const snapToGrid = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

// Função para snap position to grid
export const snapPositionToGrid = (
  position: Position, 
  gridSize: number
): Position => {
  return {
    x: snapToGrid(position.x, gridSize),
    y: snapToGrid(position.y, gridSize)
  };
};

// Função para calcular distância entre dois pontos
export const calculateDistance = (point1: Position, point2: Position): number => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Função para encontrar elemento mais próximo
export const findNearestElement = (
  position: Position,
  elements: TemplateElement[],
  excludeId?: string
): TemplateElement | null => {
  let nearest: TemplateElement | null = null;
  let minDistance = Infinity;
  
  elements.forEach(element => {
    if (element.id === excludeId) return;
    
    const elementCenter = {
      x: element.position.x + element.size.width / 2,
      y: element.position.y + element.size.height / 2
    };
    
    const distance = calculateDistance(position, elementCenter);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = element;
    }
  });
  
  return nearest;
};

// Função para validar template
export const validateTemplate = (template: EditorTemplate): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validar nome
  if (!template.name || template.name.trim().length === 0) {
    errors.push('Nome do template é obrigatório');
  }
  
  // Validar elementos
  if (template.elements.length === 0) {
    warnings.push('Template não possui elementos');
  }
  
  // Validar cada elemento
  template.elements.forEach((element, index) => {
    if (!element.id) {
      errors.push(`Elemento ${index + 1} não possui ID`);
    }
    
    if (!element.type) {
      errors.push(`Elemento ${index + 1} não possui tipo`);
    }
    
    if (element.size.width < MIN_ELEMENT_SIZE.width || 
        element.size.height < MIN_ELEMENT_SIZE.height) {
      warnings.push(`Elemento ${index + 1} é muito pequeno`);
    }
  });
  
  // Verificar IDs duplicados
  const ids = template.elements.map(el => el.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`IDs duplicados encontrados: ${duplicateIds.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Função para validar elemento
export const validateElement = (element: TemplateElement): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!element.id) {
    errors.push('Elemento deve ter um ID');
  }
  
  if (!element.type) {
    errors.push('Elemento deve ter um tipo');
  }
  
  if (element.size.width < MIN_ELEMENT_SIZE.width) {
    errors.push(`Largura mínima é ${MIN_ELEMENT_SIZE.width}px`);
  }
  
  if (element.size.height < MIN_ELEMENT_SIZE.height) {
    errors.push(`Altura mínima é ${MIN_ELEMENT_SIZE.height}px`);
  }
  
  if (element.position.x < 0 || element.position.y < 0) {
    errors.push('Posição não pode ser negativa');
  }
  
  // Validações específicas por tipo
  switch (element.type) {
    case 'text':
    case 'heading':
      if (typeof element.content !== 'string') {
        errors.push('Conteúdo de texto deve ser uma string');
      }
      break;
      
    case 'image':
      if (typeof element.content === 'object' && element.content !== null) {
        const imageContent = element.content as any;
        if (!imageContent.src) {
          warnings.push('Imagem não possui fonte (src)');
        }
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Função para converter pixels para mm (96 DPI)
export const pxToMm = (px: number): number => {
  return (px * 25.4) / 96;
};

// Função para converter mm para pixels (96 DPI)
export const mmToPx = (mm: number): number => {
  return (mm * 96) / 25.4;
};

// Função para converter template para JSON
export const templateToJSON = (template: EditorTemplate): string => {
  return JSON.stringify(template, null, 2);
};

// Função para converter JSON para template
export const JSONToTemplate = (json: string): EditorTemplate | null => {
  try {
    const parsed = JSON.parse(json);
    const validation = validateTemplate(parsed);
    
    if (!validation.isValid) {
      console.error('Template inválido:', validation.errors);
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.error('Erro ao parsear JSON:', error);
    return null;
  }
};

// Função para clonar elemento
export const cloneElement = (element: TemplateElement): TemplateElement => {
  return {
    ...element,
    id: generateId(element.type),
    position: {
      x: element.position.x + 20,
      y: element.position.y + 20
    }
  };
};

// Função para ordenar elementos por zIndex
export const sortElementsByZIndex = (elements: TemplateElement[]): TemplateElement[] => {
  return [...elements].sort((a, b) => a.zIndex - b.zIndex);
};

// Função para encontrar próximo zIndex disponível
export const getNextZIndex = (elements: TemplateElement[]): number => {
  const maxZ = Math.max(...elements.map(el => el.zIndex), 0);
  return maxZ + 1;
};

// Função para calcular tamanho do canvas baseado na página
export const getCanvasSize = (pageSettings: any): Size => {
  const { size, orientation } = pageSettings;
  
  let baseSize = A4_SIZE.portrait;
  
  if (size === 'A3') {
    baseSize = { width: 1123, height: 1587 };
  } else if (size === 'Letter') {
    baseSize = { width: 816, height: 1056 };
  } else if (size === 'Legal') {
    baseSize = { width: 816, height: 1344 };
  }
  
  if (orientation === 'landscape') {
    return {
      width: baseSize.height,
      height: baseSize.width
    };
  }
  
  return baseSize;
};

// Função para mesclar estilos
export const mergeStyles = (
  baseStyles: ElementStyles, 
  newStyles: Partial<ElementStyles>
): ElementStyles => {
  return {
    ...baseStyles,
    ...newStyles,
    // Mesclar objetos aninhados
    padding: newStyles.padding ? { ...baseStyles.padding, ...newStyles.padding } : baseStyles.padding,
    margin: newStyles.margin ? { ...baseStyles.margin, ...newStyles.margin } : baseStyles.margin,
    border: newStyles.border ? { ...baseStyles.border, ...newStyles.border } : baseStyles.border,
    shadow: newStyles.shadow ? { ...baseStyles.shadow, ...newStyles.shadow } : baseStyles.shadow
  };
};

// Função para formatar tamanho de arquivo
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Função para debounce
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
};

// Função para throttle
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      window.setTimeout(() => inThrottle = false, limit);
    }
  };
};

// ===== FUNÇÕES DE AGRUPAMENTO =====

// Função para gerar ID de grupo
export const generateGroupId = (): string => {
  return generateId('group');
};

// Função para agrupar elementos
export const groupElements = (
  elements: TemplateElement[],
  elementIds: string[]
): TemplateElement[] => {
  if (elementIds.length < 2) return elements;
  
  const groupId = generateGroupId();
  
  return elements.map(element => {
    if (elementIds.includes(element.id)) {
      return {
        ...element,
        groupId
      };
    }
    return element;
  });
};

// Função para desagrupar elementos
export const ungroupElements = (
  elements: TemplateElement[],
  groupId: string
): TemplateElement[] => {
  return elements.map(element => {
    if (element.groupId === groupId) {
      const { groupId: _, ...elementWithoutGroup } = element;
      return elementWithoutGroup;
    }
    return element;
  });
};

// Função para obter elementos de um grupo
export const getGroupElements = (
  elements: TemplateElement[],
  groupId: string
): TemplateElement[] => {
  return elements.filter(element => element.groupId === groupId);
};

// Função para obter todos os grupos
export const getAllGroups = (elements: TemplateElement[]): Record<string, TemplateElement[]> => {
  const groups: Record<string, TemplateElement[]> = {};
  
  elements.forEach(element => {
    if (element.groupId) {
      if (!groups[element.groupId]) {
        groups[element.groupId] = [];
      }
      groups[element.groupId].push(element);
    }
  });
  
  return groups;
};

// Função para verificar se elementos estão agrupados
export const areElementsGrouped = (
  elements: TemplateElement[],
  elementIds: string[]
): boolean => {
  if (elementIds.length < 2) return false;
  
  const firstElement = elements.find(el => el.id === elementIds[0]);
  if (!firstElement?.groupId) return false;
  
  return elementIds.every(id => {
    const element = elements.find(el => el.id === id);
    return element?.groupId === firstElement.groupId;
  });
};

// Função para obter bounds de um grupo
export const getGroupBounds = (groupElements: TemplateElement[]) => {
  if (groupElements.length === 0) return null;
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  groupElements.forEach(element => {
    const bounds = getElementBounds(element);
    minX = Math.min(minX, bounds.left);
    minY = Math.min(minY, bounds.top);
    maxX = Math.max(maxX, bounds.right);
    maxY = Math.max(maxY, bounds.bottom);
  });
  
  return {
    left: minX,
    top: minY,
    right: maxX,
    bottom: maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
};

// Função para mover grupo
export const moveGroup = (
  elements: TemplateElement[],
  groupId: string,
  deltaX: number,
  deltaY: number
): TemplateElement[] => {
  return elements.map(element => {
    if (element.groupId === groupId) {
      return {
        ...element,
        position: {
          x: element.position.x + deltaX,
          y: element.position.y + deltaY
        }
      };
    }
    return element;
  });
};

// Função para redimensionar grupo proporcionalmente
export const resizeGroup = (
  elements: TemplateElement[],
  groupId: string,
  scaleX: number,
  scaleY: number,
  originX: number,
  originY: number
): TemplateElement[] => {
  return elements.map(element => {
    if (element.groupId === groupId) {
      // Calcular nova posição relativa à origem
      const relativeX = element.position.x - originX;
      const relativeY = element.position.y - originY;
      
      const newX = originX + (relativeX * scaleX);
      const newY = originY + (relativeY * scaleY);
      
      return {
        ...element,
        position: {
          x: newX,
          y: newY
        },
        size: {
          width: element.size.width * scaleX,
          height: element.size.height * scaleY
        }
      };
    }
    return element;
  });
};

// Função para verificar se um elemento pode ser agrupado
export const canElementBeGrouped = (element: TemplateElement): boolean => {
  // Todos os elementos podem ser agrupados por padrão
  // Pode ser estendido para excluir tipos específicos se necessário
  return !element.locked;
};

// Função para obter elementos selecionáveis em um grupo
export const getSelectableGroupElements = (
  elements: TemplateElement[],
  groupId: string
): string[] => {
  return elements
    .filter(element => element.groupId === groupId && !element.locked)
    .map(element => element.id);
};