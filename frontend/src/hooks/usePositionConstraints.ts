import { useCallback } from 'react';
import { PageSettings } from '../components/EditorLayoutProfissional/components/Modals/PageSettingsModal';

interface TemplateElement {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface PageBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface UsePositionConstraintsReturn {
  validateElementPosition: (
    element: TemplateElement,
    newPosition: { x: number; y: number },
    newSize?: { width: number; height: number }
  ) => { x: number; y: number };
  validateElementSize: (
    element: TemplateElement,
    newSize: { width: number; height: number }
  ) => { width: number; height: number };
  isPositionValid: (
    position: { x: number; y: number },
    size: { width: number; height: number }
  ) => boolean;
  getPageBounds: () => PageBounds;
  snapToMargins: (
    position: { x: number; y: number },
    size: { width: number; height: number },
    tolerance?: number
  ) => { x: number; y: number };
}

const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
  Legal: { width: 216, height: 356 }
};

export const usePositionConstraints = (
  pageSettings: PageSettings,
  respectMargins: boolean = true
): UsePositionConstraintsReturn => {

  const getPageSize = useCallback((): { width: number; height: number } => {
    let size;
    
    if (pageSettings.size === 'Custom' && pageSettings.customSize) {
      size = pageSettings.customSize;
    } else {
      size = PAGE_SIZES[pageSettings.size as keyof typeof PAGE_SIZES] || PAGE_SIZES.A4;
    }
    
    // Aplicar orientação
    if (pageSettings.orientation === 'landscape') {
      return { width: size.height, height: size.width };
    }
    
    return size;
  }, [pageSettings]);

  const getPageBounds = useCallback((): PageBounds => {
    const pageSize = getPageSize();
    
    if (!respectMargins) {
      return {
        minX: 0,
        maxX: pageSize.width,
        minY: 0,
        maxY: pageSize.height
      };
    }
    
    const margins = pageSettings.margins;
    
    return {
      minX: margins.left,
      maxX: pageSize.width - margins.right,
      minY: margins.top,
      maxY: pageSize.height - margins.bottom
    };
  }, [pageSettings, respectMargins, getPageSize]);

  const validateElementPosition = useCallback((
    element: TemplateElement,
    newPosition: { x: number; y: number },
    newSize?: { width: number; height: number }
  ): { x: number; y: number } => {
    const bounds = getPageBounds();
    const size = newSize || element.size;
    
    let { x, y } = newPosition;
    
    // Validar limites horizontais
    if (x < bounds.minX) {
      x = bounds.minX;
    } else if (x + size.width > bounds.maxX) {
      x = bounds.maxX - size.width;
    }
    
    // Validar limites verticais
    if (y < bounds.minY) {
      y = bounds.minY;
    } else if (y + size.height > bounds.maxY) {
      y = bounds.maxY - size.height;
    }
    
    return { x, y };
  }, [getPageBounds]);

  const validateElementSize = useCallback((
    element: TemplateElement,
    newSize: { width: number; height: number }
  ): { width: number; height: number } => {
    const bounds = getPageBounds();
    
    // Calcular tamanho máximo baseado na posição atual
    const maxWidth = bounds.maxX - element.position.x;
    const maxHeight = bounds.maxY - element.position.y;
    
    // Garantir tamanho mínimo
    const minWidth = 10; // 10mm mínimo
    const minHeight = 10; // 10mm mínimo
    
    return {
      width: Math.max(minWidth, Math.min(newSize.width, maxWidth)),
      height: Math.max(minHeight, Math.min(newSize.height, maxHeight))
    };
  }, [getPageBounds]);

  const isPositionValid = useCallback((
    position: { x: number; y: number },
    size: { width: number; height: number }
  ): boolean => {
    const bounds = getPageBounds();
    
    return (
      position.x >= bounds.minX &&
      position.y >= bounds.minY &&
      position.x + size.width <= bounds.maxX &&
      position.y + size.height <= bounds.maxY
    );
  }, [getPageBounds]);

  const snapToMargins = useCallback((
    position: { x: number; y: number },
    size: { width: number; height: number },
    tolerance: number = 5 // 5mm de tolerância
  ): { x: number; y: number } => {
    const bounds = getPageBounds();
    let { x, y } = position;
    
    // Snap horizontal
    if (Math.abs(x - bounds.minX) <= tolerance) {
      x = bounds.minX;
    } else if (Math.abs((x + size.width) - bounds.maxX) <= tolerance) {
      x = bounds.maxX - size.width;
    }
    
    // Snap vertical
    if (Math.abs(y - bounds.minY) <= tolerance) {
      y = bounds.minY;
    } else if (Math.abs((y + size.height) - bounds.maxY) <= tolerance) {
      y = bounds.maxY - size.height;
    }
    
    return { x, y };
  }, [getPageBounds]);

  return {
    validateElementPosition,
    validateElementSize,
    isPositionValid,
    getPageBounds,
    snapToMargins
  };
};