import { useState, useCallback, useRef, useEffect } from 'react';
import { Position, Size } from '../types/editor';
import { 
  ZOOM_LEVELS, 
  MIN_ZOOM, 
  MAX_ZOOM, 
  DEFAULT_ZOOM,
  A4_SIZE 
} from '../types/editor-constants';

interface UseCanvasOperationsOptions {
  initialZoom?: number;
  initialPan?: Position;
  canvasSize?: Size;
  containerSize?: Size;
}

interface UseCanvasOperationsReturn {
  // Estado atual
  zoom: number;
  panOffset: Position;
  
  // Informações calculadas
  canvasSize: Size;
  isAtMinZoom: boolean;
  isAtMaxZoom: boolean;
  
  // Operações de zoom
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  zoomToActualSize: () => void;
  zoomToLevel: (level: number) => void;
  
  // Operações de pan
  setPanOffset: (offset: Position) => void;
  panBy: (delta: Position) => void;
  centerCanvas: () => void;
  resetView: () => void;
  setContainerSize: (size: Size) => void;
  
  // Conversões de coordenadas
  screenToCanvas: (screenPos: Position) => Position;
  canvasToScreen: (canvasPos: Position) => Position;
  
  // Utilitários
  getVisibleArea: () => { x: number; y: number; width: number; height: number };
  isPointVisible: (point: Position) => boolean;
  
  // Handlers para eventos
  handleWheel: (e: WheelEvent) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
}

export const useCanvasOperations = (
  options: UseCanvasOperationsOptions = {}
): UseCanvasOperationsReturn => {
  const {
    initialZoom = DEFAULT_ZOOM,
    initialPan = { x: 0, y: 0 },
    canvasSize = A4_SIZE.portrait,
    containerSize = { width: 800, height: 600 }
  } = options;

  // Estado do canvas
  const [zoom, setZoomState] = useState<number>(initialZoom);
  const [panOffset, setPanOffsetState] = useState<Position>(initialPan);
  // Allow container size to be updated dynamically (ResizeObserver in parent)
  const [containerSizeState, setContainerSizeState] = useState<Size>(containerSize);
  
  // Refs para evitar stale closures
  const zoomRef = useRef(zoom);
  const panRef = useRef(panOffset);
  
  // Atualizar refs quando estado muda
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  
  useEffect(() => {
    panRef.current = panOffset;
  }, [panOffset]);

  // Tamanho do canvas escalado
  const scaledCanvasSize: Size = {
    width: canvasSize.width * zoom,
    height: canvasSize.height * zoom
  };

  // Verificações de limites
  const isAtMinZoom = zoom <= MIN_ZOOM;
  const isAtMaxZoom = zoom >= MAX_ZOOM;

  // Encontrar o próximo nível de zoom válido
  const getNextZoomLevel = useCallback((direction: 'in' | 'out', currentZoom: number = zoom): number => {
    const sortedLevels = [...ZOOM_LEVELS].sort((a, b) => a - b);
    
    if (direction === 'in') {
      const nextLevel = sortedLevels.find(level => level > currentZoom);
      return nextLevel || MAX_ZOOM;
    } else {
      const prevLevel = [...sortedLevels].reverse().find(level => level < currentZoom);
      return prevLevel || MIN_ZOOM;
    }
  }, [zoom]);

  // Limitar zoom aos valores válidos
  const clampZoom = useCallback((newZoom: number): number => {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
  }, []);

  // Limitar pan para manter o canvas visível
  const clampPan = useCallback((newPan: Position, zoomLevel: number = zoom): Position => {
    const scaledWidth = canvasSize.width * zoomLevel;
    const scaledHeight = canvasSize.height * zoomLevel;
    
    // Calcular limites para manter pelo menos parte do canvas visível
  const minX = Math.min(0, containerSizeState.width - scaledWidth);
  const maxX = Math.max(0, containerSizeState.width - scaledWidth);
  const minY = Math.min(0, containerSizeState.height - scaledHeight);
  const maxY = Math.max(0, containerSizeState.height - scaledHeight);
    
    return {
      x: Math.max(minX, Math.min(maxX, newPan.x)),
      y: Math.max(minY, Math.min(maxY, newPan.y))
    };
  }, [canvasSize, containerSize, zoom]);

  // Definir zoom com validação
  const setZoom = useCallback((newZoom: number, centerPoint?: Position) => {
    const clampedZoom = clampZoom(newZoom);
    
    if (centerPoint) {
      // Zoom mantendo um ponto específico no centro
      const zoomRatio = clampedZoom / zoom;
      const newPan = {
        x: centerPoint.x - (centerPoint.x - panOffset.x) * zoomRatio,
        y: centerPoint.y - (centerPoint.y - panOffset.y) * zoomRatio
      };
      setPanOffsetState(clampPan(newPan, clampedZoom));
    } else {
      // Zoom mantendo o centro atual
  const centerX = containerSizeState.width / 2;
  const centerY = containerSizeState.height / 2;
      const zoomRatio = clampedZoom / zoom;
      
      const newPan = {
        x: centerX - (centerX - panOffset.x) * zoomRatio,
        y: centerY - (centerY - panOffset.y) * zoomRatio
      };
      setPanOffsetState(clampPan(newPan, clampedZoom));
    }
    
    setZoomState(clampedZoom);
  }, [zoom, panOffset, containerSizeState, clampZoom, clampPan]);

  // Zoom in para o próximo nível
  const zoomIn = useCallback(() => {
    const nextLevel = getNextZoomLevel('in');
    setZoom(nextLevel);
  }, [getNextZoomLevel, setZoom]);

  // Zoom out para o nível anterior
  const zoomOut = useCallback(() => {
    const nextLevel = getNextZoomLevel('out');
    setZoom(nextLevel);
  }, [getNextZoomLevel, setZoom]);

  // Zoom para ajustar o canvas na tela
  const zoomToFit = useCallback(() => {
  const scaleX = containerSizeState.width / canvasSize.width;
  const scaleY = containerSizeState.height / canvasSize.height;
    const fitZoom = Math.min(scaleX, scaleY) * 0.9; // 90% para deixar margem
    
    const clampedZoom = clampZoom(fitZoom);
    setZoomState(clampedZoom);
    
    // Centralizar o canvas
    const scaledWidth = canvasSize.width * clampedZoom;
    const scaledHeight = canvasSize.height * clampedZoom;
    
    setPanOffsetState({
      x: (containerSizeState.width - scaledWidth) / 2,
      y: (containerSizeState.height - scaledHeight) / 2
    });
  }, [containerSizeState, canvasSize, clampZoom]);

  // Zoom para tamanho real (100%)
  const zoomToActualSize = useCallback(() => {
    setZoom(1);
  }, [setZoom]);

  // Zoom para um nível específico dos presets
  const zoomToLevel = useCallback((level: number) => {
    if (ZOOM_LEVELS.includes(level)) {
      setZoom(level);
    }
  }, [setZoom]);

  // Definir pan offset com validação
  const setPanOffset = useCallback((newOffset: Position) => {
    setPanOffsetState(clampPan(newOffset));
  }, [clampPan]);

  // Pan relativo
  const panBy = useCallback((delta: Position) => {
    const newOffset = {
      x: panOffset.x + delta.x,
      y: panOffset.y + delta.y
    };
    setPanOffset(newOffset);
  }, [panOffset, setPanOffset]);

  // Centralizar canvas
  const centerCanvas = useCallback(() => {
    const scaledWidth = canvasSize.width * zoom;
    const scaledHeight = canvasSize.height * zoom;
    
    setPanOffsetState({
      x: (containerSizeState.width - scaledWidth) / 2,
      y: (containerSizeState.height - scaledHeight) / 2
    });
  }, [canvasSize, zoom, containerSizeState]);

  // Reset para estado inicial
  const resetView = useCallback(() => {
    setZoomState(DEFAULT_ZOOM);
    setPanOffsetState({ x: 0, y: 0 });
  }, []);

  // Conversão de coordenadas: tela para canvas
  const screenToCanvas = useCallback((screenPos: Position): Position => {
    return {
      x: (screenPos.x - panOffset.x) / zoom,
      y: (screenPos.y - panOffset.y) / zoom
    };
  }, [panOffset, zoom]);

  // Conversão de coordenadas: canvas para tela
  const canvasToScreen = useCallback((canvasPos: Position): Position => {
    return {
      x: canvasPos.x * zoom + panOffset.x,
      y: canvasPos.y * zoom + panOffset.y
    };
  }, [panOffset, zoom]);

  // Obter área visível do canvas
  const getVisibleArea = useCallback(() => {
    const topLeft = screenToCanvas({ x: 0, y: 0 });
    const bottomRight = screenToCanvas({ 
      x: containerSizeState.width, 
      y: containerSizeState.height 
    });
    
    return {
      x: Math.max(0, topLeft.x),
      y: Math.max(0, topLeft.y),
      width: Math.min(canvasSize.width, bottomRight.x) - Math.max(0, topLeft.x),
      height: Math.min(canvasSize.height, bottomRight.y) - Math.max(0, topLeft.y)
    };
  }, [screenToCanvas, containerSizeState, canvasSize]);

  // Verificar se um ponto está visível
  const isPointVisible = useCallback((point: Position): boolean => {
    const screenPos = canvasToScreen(point);
    return (
      screenPos.x >= 0 && 
      screenPos.x <= containerSizeState.width &&
      screenPos.y >= 0 && 
      screenPos.y <= containerSizeState.height
    );
  }, [canvasToScreen, containerSizeState]);

  // Expose method to update container size (parent can call via ResizeObserver)
  const setContainerSize = useCallback((size: Size) => {
    setContainerSizeState(size);
  }, []);

  // Handler para wheel (zoom com mouse)
  const handleWheel = useCallback((e: WheelEvent) => {
    // Only perform zoom when Ctrl/Cmd is pressed. Otherwise allow default scrolling/panning behavior.
    if (!(e.ctrlKey || e.metaKey)) {
      return;
    }

    e.preventDefault();

    const zoomFactor = 1.1;
    const rect = (e.target as Element).getBoundingClientRect();
    const centerPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    if (e.deltaY < 0) {
      // Zoom in
      const newZoom = Math.min(MAX_ZOOM, zoomRef.current * zoomFactor);
      setZoom(newZoom, centerPoint);
    } else {
      // Zoom out
      const newZoom = Math.max(MIN_ZOOM, zoomRef.current / zoomFactor);
      setZoom(newZoom, centerPoint);
    }
  }, [setZoom]);

  // Handler para atalhos de teclado
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case '=':
        case '+':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          e.preventDefault();
          zoomToFit();
          break;
        case '1':
          e.preventDefault();
          zoomToActualSize();
          break;
      }
    }
  }, [zoomIn, zoomOut, zoomToFit, zoomToActualSize]);

  return {
    // Estado atual
    zoom,
    panOffset,
    
    // Informações calculadas
    canvasSize: scaledCanvasSize,
    isAtMinZoom,
    isAtMaxZoom,
    
    // Operações de zoom
    setZoom,
    zoomIn,
    zoomOut,
    zoomToFit,
    zoomToActualSize,
    zoomToLevel,
    
    // Operações de pan
    setPanOffset,
    panBy,
    centerCanvas,
    resetView,
  // Container size helper
  setContainerSize,
    
    // Conversões de coordenadas
    screenToCanvas,
    canvasToScreen,
    
    // Utilitários
    getVisibleArea,
    isPointVisible,
    
    // Handlers para eventos
    handleWheel,
    handleKeyDown
  };
};