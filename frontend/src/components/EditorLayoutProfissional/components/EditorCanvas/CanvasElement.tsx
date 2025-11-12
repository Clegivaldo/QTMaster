import React, { useCallback, useState, useRef } from 'react';
import { TemplateElement, Position, Size, ImageElement as ImageElementType, TableElement as TableElementType, LineData, ShapeData } from '../../../../types/editor';
import SelectionHandles from './SelectionHandles';
import ImageElement from '../Elements/ImageElement';
import TableElement from '../Elements/TableElement';
import LineElement from '../Elements/LineElement';
import ShapeElement from '../Elements/ShapeElement';

interface CanvasElementProps {
  element: TemplateElement;
  isSelected: boolean;
  zoom: number;
  onSelect?: (elementId: string, multiSelect?: boolean) => void;
  onMove?: (elementId: string, newPosition: Position) => void;
  onResize?: (elementId: string, newSize: Size) => void;
  onEdit?: (elementId: string, newContent: any) => void;
  snapToGrid?: (position: Position) => Position;
}

const CanvasElement: React.FC<CanvasElementProps> = ({
  element,
  isSelected,
  zoom,
  onSelect,
  onMove,
  onResize,
  onEdit,
  snapToGrid
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

  // Calcular estilos do elemento
  const getElementStyles = useCallback(() => {
    const { styles } = element;
    
    return {
      position: 'absolute' as const,
      left: element.position.x * zoom,
      top: element.position.y * zoom,
      width: element.size.width * zoom,
      height: element.size.height * zoom,
      zIndex: element.zIndex,
      
      // Estilos de texto
      fontSize: styles.fontSize ? `${styles.fontSize * zoom}px` : undefined,
      fontFamily: styles.fontFamily,
      fontWeight: styles.fontWeight,
      fontStyle: styles.fontStyle,
      textDecoration: styles.textDecoration,
      color: styles.color,
      textAlign: styles.textAlign,
      lineHeight: styles.lineHeight,

      // Vertical alignment for text/heading elements
      // map our logical verticalAlign ('top'|'middle'|'bottom') to CSS flex alignItems
      ...(element.type === 'text' || element.type === 'heading'
        ? {
            display: 'flex' as const,
            flexDirection: 'column' as const,
            justifyContent:
              styles.verticalAlign === 'middle'
                ? 'center'
                : styles.verticalAlign === 'bottom'
                ? 'flex-end'
                : 'flex-start',
            alignItems: 'stretch'
          }
        : {}),
      
      // Estilos de layout
      backgroundColor: styles.backgroundColor,
      borderRadius: styles.borderRadius ? `${styles.borderRadius * zoom}px` : undefined,
      opacity: styles.opacity,
      
      // Bordas
      border: styles.border ? 
        `${styles.border.width * zoom}px ${styles.border.style} ${styles.border.color}` : 
        undefined,
      
      // Padding e margin (escalados com zoom)
      padding: styles.padding ? 
        `${(styles.padding.top || 0) * zoom}px ${(styles.padding.right || 0) * zoom}px ${(styles.padding.bottom || 0) * zoom}px ${(styles.padding.left || 0) * zoom}px` : 
        undefined,
      
      // Cursor
      cursor: isDragging ? 'grabbing' : 'grab',
      
      // Seleção visual
      outline: isSelected ? `2px solid #3b82f6` : 'none',
      outlineOffset: isSelected ? '2px' : '0',
    };
  }, [element, zoom, isSelected, isDragging]);

  // Handler para clique no elemento
  const handleElementClick = useCallback((e: React.MouseEvent) => {
    // Perform selection on click, honoring multi-select (Ctrl/Cmd)
    try {
      // debug log to help trace clicks reaching the element in the browser
  if (typeof window !== 'undefined' && (import.meta as any).env?.MODE !== 'test') {
        // eslint-disable-next-line no-console
        console.debug('[CanvasElement] click', { id: element.id, multi: e.ctrlKey || e.metaKey });
      }
    } catch (err) {
      // ignore
    }

    onSelect?.(element.id, e.ctrlKey || e.metaKey);
    e.stopPropagation();
  }, [element.id, onSelect]);

  // Handler para início do drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Avoid starting a drag on a double click (detail > 1)
    if (e.detail > 1) return;

    // If element is locked, allow selection but do not start dragging or editing
    if (element.locked) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Ensure element is selected when user begins interacting (prevents mousedown stopping
    // the subsequent click from selecting in some browsers/contexts).
    // This also makes header/footer child elements reliably selectable when dragging starts.
    try {
      // debug log to help trace mousedown events in browser console
  if (typeof window !== 'undefined' && (import.meta as any).env?.MODE !== 'test') {
        // eslint-disable-next-line no-console
        console.debug('[CanvasElement] mousedown', { id: element.id, clientX: e.clientX, clientY: e.clientY });
      }
      onSelect?.(element.id, e.ctrlKey || e.metaKey);
    } catch (err) {
      // ignore
    }

    setIsDragging(true);
    setDragStart({
      x: e.clientX - element.position.x * zoom,
      y: e.clientY - element.position.y * zoom
    });
    
    e.preventDefault();
    e.stopPropagation();
  }, [element.id, element.position, zoom, isSelected, onSelect]);

  // Handler para movimento do mouse durante drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    let newPosition = {
      x: (e.clientX - dragStart.x) / zoom,
      y: (e.clientY - dragStart.y) / zoom
    };

    // Aplicar snap to grid se disponível
    if (snapToGrid) {
      newPosition = snapToGrid(newPosition);
    }

    // Limitar posição para não sair do canvas
    const constrainedPosition = {
      x: Math.max(0, Math.min(newPosition.x, (794 - element.size.width))), // A4 width
      y: Math.max(0, Math.min(newPosition.y, (1123 - element.size.height))) // A4 height
    };

    setDragOffset({
      x: constrainedPosition.x - element.position.x,
      y: constrainedPosition.y - element.position.y
    });
  }, [isDragging, dragStart, zoom, element.position, element.size, snapToGrid]);

  // Handler para fim do drag
  const handleMouseUp = useCallback(() => {
    if (isDragging && (dragOffset.x !== 0 || dragOffset.y !== 0)) {
      const newPosition = {
        x: element.position.x + dragOffset.x,
        y: element.position.y + dragOffset.y
      };
      
      onMove?.(element.id, newPosition);
    }

    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, [isDragging, dragOffset, element.id, element.position, onMove]);

  // Adicionar listeners globais para drag
  React.useEffect(() => {
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

  // Renderizar conteúdo baseado no tipo do elemento
  const renderContent = () => {
    switch (element.type) {
      case 'text':
      case 'heading':
        return (
          <div
            className="w-full h-full outline-none overflow-hidden"
            style={{ 
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
              flex: 1
            }}
            onDoubleClick={(e) => {
              // enable editing on double click
              const el = e.currentTarget as HTMLDivElement;
              el.contentEditable = 'true';
              el.focus();
            }}
            contentEditable={false}
            suppressContentEditableWarning
            onBlur={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.contentEditable = 'false';
              if (el.textContent !== element.content) {
                onEdit?.(element.id, el.textContent || '');
              }
            }}
          >
            {typeof element.content === 'string' ? element.content : 'Texto'}
          </div>
        );

      case 'image':
        return (
          <ImageElement
            element={element as ImageElementType}
            isSelected={isSelected}
            zoom={zoom}
            onEdit={onEdit}
          />
        );

      case 'table':
        return (
          <TableElement
            element={element as TableElementType}
            isSelected={isSelected}
            zoom={zoom}
            onEdit={onEdit}
          />
        );

      case 'line':
        return (
          <LineElement
            element={element as TemplateElement & { content: LineData }}
            isSelected={isSelected}
            zoom={zoom}
            onEdit={onEdit}
          />
        );

      case 'rectangle':
      case 'circle':
        return (
          <ShapeElement
            element={element as TemplateElement & { content: ShapeData }}
            isSelected={isSelected}
            zoom={zoom}
            onEdit={onEdit}
          />
        );

      case 'signature':
        return (
          <div className="w-full h-full flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-400">
            <div className="text-center">
              <div className="text-sm">✍️</div>
              <div className="text-xs">Assinatura</div>
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-xs">{element.type}</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      ref={elementRef}
      style={{
        ...getElementStyles(),
        transform: isDragging ? 
          `translate(${dragOffset.x * zoom}px, ${dragOffset.y * zoom}px)` : 
          undefined
      }}
      onClick={handleElementClick}
      onMouseDown={handleMouseDown}
      className={`
        select-none
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
        ${element.visible ? '' : 'opacity-50'}
        ${element.locked ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''}
      `}
    >
      {renderContent()}
      
      {/* Alças de redimensionamento */}
      {isSelected && onResize && onMove && !element.locked && (
        <SelectionHandles
          element={element}
          zoom={zoom}
          onResize={onResize}
          onMove={onMove}
        />
      )}
    </div>
  );
};

export default CanvasElement;