import React, { useRef, useCallback, useState, useEffect } from 'react';
import { CanvasProps, Position } from '../../../../types/editor';
import { A4_SIZE, DEFAULT_MARGINS } from '../../../../types/editor-constants';
import { sortElementsByZIndex } from '../../../../types/editor-utils';
import { CanvasElement } from '.';

const Canvas: React.FC<CanvasProps> = ({
  elements,
  selectedElementIds,
  zoom,
  panOffset,
  onElementSelect,
  onElementMove,
  onElementResize,
  onElementEdit
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

  // Calcular tamanho do canvas baseado no zoom
  const canvasWidth = A4_SIZE.portrait.width * zoom;
  const canvasHeight = A4_SIZE.portrait.height * zoom;

  // Ordenar elementos por z-index para renderização correta
  const sortedElements = sortElementsByZIndex(elements);

  // Converter coordenadas do mouse para coordenadas do canvas
  const getCanvasCoordinates = useCallback((clientX: number, clientY: number): Position => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - canvasRect.left) / zoom;
    const y = (clientY - canvasRect.top) / zoom;

    return { x, y };
  }, [zoom]);

  // Handler para clique no canvas (deselecionar elementos)
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Verificar se o clique foi diretamente no canvas, não em um elemento
    if (e.target === canvasRef.current) {
      onElementSelect?.('', false); // Deselecionar todos
    }
  }, [onElementSelect]);

  // Handler para seleção de elemento com suporte a grupos
  const handleElementSelect = useCallback((elementId: string, multiSelect: boolean = false) => {
    const element = elements.find(el => el.id === elementId);
    
    if (!element) {
      onElementSelect?.(elementId, multiSelect);
      return;
    }

    // Se o elemento faz parte de um grupo, selecionar todo o grupo
    if (element.groupId && !multiSelect) {
      const groupElements = elements.filter(el => el.groupId === element.groupId);
      const groupElementIds = groupElements.map(el => el.id);
      
      // Se todos os elementos do grupo já estão selecionados, manter seleção normal
      const allGroupSelected = groupElementIds.every(id => selectedElementIds.includes(id));
      
      if (!allGroupSelected) {
        // Selecionar todos os elementos do grupo
        groupElementIds.forEach((id, index) => {
          onElementSelect?.(id, index > 0); // Primeiro elemento sem multiSelect, resto com multiSelect
        });
        return;
      }
    }

    // Seleção normal
    onElementSelect?.(elementId, multiSelect);
  }, [elements, selectedElementIds, onElementSelect]);

  // Handler para início de drag no canvas (pan)
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== canvasRef.current) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    e.preventDefault();
  }, [panOffset]);

  // Handler para movimento do mouse (pan do canvas)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const newOffset = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };

    setDragOffset(newOffset);
  }, [isDragging, dragStart]);

  // Handler para fim do drag
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // Aplicar o offset final se houver movimento
      if (dragOffset.x !== 0 || dragOffset.y !== 0) {
        // Se houver callback para pan, usar aqui
        // onPanChange?.(dragOffset);
      }
      setDragOffset({ x: 0, y: 0 });
    }
  }, [isDragging, dragOffset, onElementMove]);

  // Adicionar listeners globais para mouse
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handler para adicionar elemento via drop
  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const elementType = e.dataTransfer.getData('text/plain');
    if (elementType) {
      getCanvasCoordinates(e.clientX, e.clientY);
      // TODO: Implementar adição de elemento via drop
      // onAddElement?.(elementType as ElementType, canvasCoords);
    }
  }, [getCanvasCoordinates]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Renderizar margens da página
  const renderMargins = () => {
    const margins = DEFAULT_MARGINS;
    return (
      <div className="absolute inset-0 pointer-events-none">
        {/* Margem superior */}
        <div 
          className="absolute top-0 left-0 right-0 border-b border-blue-200 border-dashed opacity-50"
          style={{ height: margins.top * zoom }}
        />
        {/* Margem inferior */}
        <div 
          className="absolute bottom-0 left-0 right-0 border-t border-blue-200 border-dashed opacity-50"
          style={{ height: margins.bottom * zoom }}
        />
        {/* Margem esquerda */}
        <div 
          className="absolute top-0 left-0 bottom-0 border-r border-blue-200 border-dashed opacity-50"
          style={{ width: margins.left * zoom }}
        />
        {/* Margem direita */}
        <div 
          className="absolute top-0 right-0 bottom-0 border-l border-blue-200 border-dashed opacity-50"
          style={{ width: margins.right * zoom }}
        />
      </div>
    );
  };

  // Renderizar grid
  const renderGrid = () => {
    const gridSize = 20; // pixels
    const scaledGridSize = gridSize * zoom;
    
    if (scaledGridSize < 5) return null; // Não mostrar grid muito pequeno

    // Grid pattern será renderizado via SVG

    return (
      <div className="absolute inset-0 pointer-events-none">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <pattern id="grid" width={scaledGridSize} height={scaledGridSize} patternUnits="userSpaceOnUse">
              <path 
                d={`M ${scaledGridSize} 0 L 0 0 0 ${scaledGridSize}`} 
                fill="none" 
                stroke="#e5e7eb" 
                strokeWidth="0.5" 
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
    );
  };

  // Handler para wheel (zoom)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    // Implementar zoom com wheel se necessário
    // Por enquanto, deixamos o zoom ser controlado pelos controles
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-gray-100 relative"
      style={{ cursor: isDragging ? 'grabbing' : 'default' }}
      onWheel={handleWheel}
    >
      {/* Canvas principal */}
      <div className="w-full h-full flex items-center justify-center">
        <div
          ref={canvasRef}
          className="bg-white shadow-xl border border-gray-300 relative overflow-hidden"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `translate(${panOffset.x + dragOffset.x}px, ${panOffset.y + dragOffset.y}px)`,
            transformOrigin: 'center center',
            cursor: 'grab'
          }}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
        >
          {/* Grid de fundo */}
          {renderGrid()}

          {/* Margens da página */}
          {renderMargins()}

          {/* Elementos do template */}
          <div className="absolute inset-0">
            {sortedElements.map((element) => (
              <CanvasElement
                key={element.id}
                element={element}
                isSelected={selectedElementIds.includes(element.id)}
                zoom={zoom}
                onSelect={handleElementSelect}
                onMove={onElementMove}
                onResize={onElementResize}
                onEdit={onElementEdit}
              />
            ))}
          </div>

          {/* Overlay para elementos vazios */}
          {elements.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">🎨</div>
                <div className="text-xl font-medium mb-3 text-gray-600">Bem-vindo ao Editor Profissional!</div>
                <div className="text-sm text-gray-500 space-y-2">
                  <div>✨ Arraste elementos da <strong>paleta à esquerda</strong></div>
                  <div>🎯 Ou clique nos elementos para adicionar ao centro</div>
                  <div>🔍 Use <strong>Ctrl + / Ctrl -</strong> para zoom</div>
                  <div>⌨️ Pressione <strong>Ctrl + S</strong> para salvar</div>
                </div>
                <div className="mt-4 text-xs text-gray-400">
                  Dica: Comece com um elemento de texto ou título
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Informações de debug (removível em produção) */}
      {import.meta.env?.DEV && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded pointer-events-none">
          <div>Zoom: {Math.round(zoom * 100)}%</div>
          <div>Pan: {Math.round(panOffset.x)}, {Math.round(panOffset.y)}</div>
          <div>Elementos: {elements.length}</div>
          <div>Selecionados: {selectedElementIds.length}</div>
        </div>
      )}
    </div>
  );
};

export default Canvas;