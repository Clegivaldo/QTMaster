import React, { useCallback, useState } from 'react';
import { TemplateElement, Position, Size } from '../../../../types/editor';

interface SelectionHandlesProps {
  element: TemplateElement;
  zoom: number;
  onResize: (elementId: string, newSize: Size) => void;
  onMove: (elementId: string, newPosition: Position) => void;
}

type ResizeHandle = 
  | 'nw' | 'n' | 'ne' 
  | 'w' | 'e' 
  | 'sw' | 's' | 'se';

const SelectionHandles: React.FC<SelectionHandlesProps> = ({
  element,
  zoom,
  onResize,
  onMove
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [resizeStart, setResizeStart] = useState<{
    mouse: Position;
    element: { position: Position; size: Size };
  } | null>(null);

  // Tamanho das alças de redimensionamento
  const handleSize = Math.max(8, Math.min(12, 8 / zoom));
  const handleOffset = handleSize / 2;

  // Posições das alças de redimensionamento
  const handles: Array<{ type: ResizeHandle; style: React.CSSProperties; cursor: string }> = [
    // Cantos
    {
      type: 'nw',
      style: {
        top: -handleOffset,
        left: -handleOffset,
        width: handleSize,
        height: handleSize,
      },
      cursor: 'nw-resize'
    },
    {
      type: 'ne',
      style: {
        top: -handleOffset,
        right: -handleOffset,
        width: handleSize,
        height: handleSize,
      },
      cursor: 'ne-resize'
    },
    {
      type: 'sw',
      style: {
        bottom: -handleOffset,
        left: -handleOffset,
        width: handleSize,
        height: handleSize,
      },
      cursor: 'sw-resize'
    },
    {
      type: 'se',
      style: {
        bottom: -handleOffset,
        right: -handleOffset,
        width: handleSize,
        height: handleSize,
      },
      cursor: 'se-resize'
    },
    // Bordas
    {
      type: 'n',
      style: {
        top: -handleOffset,
        left: '50%',
        transform: 'translateX(-50%)',
        width: handleSize,
        height: handleSize,
      },
      cursor: 'n-resize'
    },
    {
      type: 's',
      style: {
        bottom: -handleOffset,
        left: '50%',
        transform: 'translateX(-50%)',
        width: handleSize,
        height: handleSize,
      },
      cursor: 's-resize'
    },
    {
      type: 'w',
      style: {
        top: '50%',
        left: -handleOffset,
        transform: 'translateY(-50%)',
        width: handleSize,
        height: handleSize,
      },
      cursor: 'w-resize'
    },
    {
      type: 'e',
      style: {
        top: '50%',
        right: -handleOffset,
        transform: 'translateY(-50%)',
        width: handleSize,
        height: handleSize,
      },
      cursor: 'e-resize'
    }
  ];

  // Calcular novo tamanho e posição baseado no handle e movimento do mouse
  const calculateResize = useCallback((
    handle: ResizeHandle,
    mousePos: Position,
    startMouse: Position,
    startElement: { position: Position; size: Size }
  ): { position: Position; size: Size } => {
    const deltaX = mousePos.x - startMouse.x;
    const deltaY = mousePos.y - startMouse.y;

    let newPosition = { ...startElement.position };
    let newSize = { ...startElement.size };

    // Tamanho mínimo
    const minSize = { width: 20, height: 20 };

    switch (handle) {
      case 'nw':
        newPosition.x = startElement.position.x + deltaX;
        newPosition.y = startElement.position.y + deltaY;
        newSize.width = Math.max(minSize.width, startElement.size.width - deltaX);
        newSize.height = Math.max(minSize.height, startElement.size.height - deltaY);
        
        // Ajustar posição se o tamanho atingiu o mínimo
        if (newSize.width === minSize.width) {
          newPosition.x = startElement.position.x + startElement.size.width - minSize.width;
        }
        if (newSize.height === minSize.height) {
          newPosition.y = startElement.position.y + startElement.size.height - minSize.height;
        }
        break;

      case 'ne':
        newPosition.y = startElement.position.y + deltaY;
        newSize.width = Math.max(minSize.width, startElement.size.width + deltaX);
        newSize.height = Math.max(minSize.height, startElement.size.height - deltaY);
        
        if (newSize.height === minSize.height) {
          newPosition.y = startElement.position.y + startElement.size.height - minSize.height;
        }
        break;

      case 'sw':
        newPosition.x = startElement.position.x + deltaX;
        newSize.width = Math.max(minSize.width, startElement.size.width - deltaX);
        newSize.height = Math.max(minSize.height, startElement.size.height + deltaY);
        
        if (newSize.width === minSize.width) {
          newPosition.x = startElement.position.x + startElement.size.width - minSize.width;
        }
        break;

      case 'se':
        newSize.width = Math.max(minSize.width, startElement.size.width + deltaX);
        newSize.height = Math.max(minSize.height, startElement.size.height + deltaY);
        break;

      case 'n':
        newPosition.y = startElement.position.y + deltaY;
        newSize.height = Math.max(minSize.height, startElement.size.height - deltaY);
        
        if (newSize.height === minSize.height) {
          newPosition.y = startElement.position.y + startElement.size.height - minSize.height;
        }
        break;

      case 's':
        newSize.height = Math.max(minSize.height, startElement.size.height + deltaY);
        break;

      case 'w':
        newPosition.x = startElement.position.x + deltaX;
        newSize.width = Math.max(minSize.width, startElement.size.width - deltaX);
        
        if (newSize.width === minSize.width) {
          newPosition.x = startElement.position.x + startElement.size.width - minSize.width;
        }
        break;

      case 'e':
        newSize.width = Math.max(minSize.width, startElement.size.width + deltaX);
        break;
    }

    // Garantir que o elemento não saia do canvas (A4)
    const maxX = 794 - newSize.width;
    const maxY = 1123 - newSize.height;
    
    newPosition.x = Math.max(0, Math.min(maxX, newPosition.x));
    newPosition.y = Math.max(0, Math.min(maxY, newPosition.y));

    return { position: newPosition, size: newSize };
  }, []);

  // Handler para início do redimensionamento
  const handleMouseDown = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStart({
      mouse: { x: e.clientX, y: e.clientY },
      element: {
        position: { ...element.position },
        size: { ...element.size }
      }
    });

    document.body.style.cursor = handles.find(h => h.type === handle)?.cursor || 'default';
  }, [element.position, element.size, handles]);

  // Handler para movimento durante redimensionamento
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeHandle || !resizeStart) return;

    const currentMouse = { x: e.clientX, y: e.clientY };
    const scaledMouse = {
      x: currentMouse.x / zoom,
      y: currentMouse.y / zoom
    };
    const scaledStartMouse = {
      x: resizeStart.mouse.x / zoom,
      y: resizeStart.mouse.y / zoom
    };

    const result = calculateResize(
      resizeHandle,
      scaledMouse,
      scaledStartMouse,
      resizeStart.element
    );

    // Aplicar mudanças temporariamente (preview)
    // Em uma implementação mais avançada, poderíamos mostrar um preview
    // Por enquanto, aplicamos diretamente
    if (result.position.x !== element.position.x || result.position.y !== element.position.y) {
      onMove(element.id, result.position);
    }
    if (result.size.width !== element.size.width || result.size.height !== element.size.height) {
      onResize(element.id, result.size);
    }
  }, [
    isResizing,
    resizeHandle,
    resizeStart,
    zoom,
    calculateResize,
    element.id,
    element.position,
    element.size,
    onMove,
    onResize
  ]);

  // Handler para fim do redimensionamento
  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setResizeStart(null);
      document.body.style.cursor = 'default';
    }
  }, [isResizing]);

  // Adicionar listeners globais
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Borda de seleção */}
      <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />

      {/* Alças de redimensionamento */}
      {handles.map((handle) => (
        <div
          key={handle.type}
          className="absolute bg-blue-500 border border-white shadow-sm pointer-events-auto hover:bg-blue-600 transition-colors"
          style={{
            ...handle.style,
            cursor: handle.cursor,
            borderRadius: '2px'
          }}
          onMouseDown={(e) => handleMouseDown(e, handle.type)}
        />
      ))}
    </div>
  );
};

export default SelectionHandles;