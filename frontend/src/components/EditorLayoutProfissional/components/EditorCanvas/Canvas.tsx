import React, { useRef, useCallback, useState, useEffect } from 'react';
import { CanvasProps, Position } from '../../../../types/editor';
import { A4_SIZE, DEFAULT_MARGINS } from '../../../../types/editor-constants';
import { sortElementsByZIndex } from '../../../../types/editor-utils';
import { CanvasElement } from '.';
import RulerOverlay from '../Utils/RulerOverlay';

const Canvas: React.FC<CanvasProps> = ({
  elements,
  selectedElementIds,
  zoom,
  panOffset,
  onElementSelect,
  onElementMove,
  onElementResize,
  onElementEdit,
  showGrid = true,
  gridSize = 20,
  snapToGrid,
  pageSettings,
  backgroundImage,
  onAddElement,
  showRuler = false,
  onPanChange,
  onWheel,
  pageRegions,
  onUpdatePageRegions
  , onRegionSelect
}) => {
  // showRuler optionally passed from parent
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

  // Calcular tamanho do canvas baseado nas configurações da página (em mm -> px)
  const pageMM = pageSettings && typeof pageSettings.getPageSize === 'function'
    ? pageSettings.getPageSize()
    : null;

  const mmToPx = (mm: number) => (mm * 96) / 25.4;

  const canvasWidth = pageMM ? mmToPx(pageMM.width) * zoom : A4_SIZE.portrait.width * zoom;
  const canvasHeight = pageMM ? mmToPx(pageMM.height) * zoom : A4_SIZE.portrait.height * zoom;

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

  const [isResizingHeader, setIsResizingHeader] = useState(false);
  const [isResizingFooter, setIsResizingFooter] = useState(false);
  const [previewHeaderHeightPx, setPreviewHeaderHeightPx] = useState<number | null>(null);
  const [previewFooterHeightPx, setPreviewFooterHeightPx] = useState<number | null>(null);
  // Refs to hold mutable values used by document-level handlers to avoid
  // stale closures and to prevent re-creating the effect on every preview update.
  const resizeStartYRef = useRef<number>(0);
  const resizeStartHeightPxRef = useRef<number>(0);
  const previewHeaderHeightRef = useRef<number | null>(null);
  const previewFooterHeightRef = useRef<number | null>(null);

  // Helpers para redimensionar header/footer
  // 1mm = 96/25.4 pixels (at 96 DPI)
  const mmToPxFactor = 96 / 25.4;
  const pxToMm = (px: number) => px / (mmToPxFactor * zoom);

  // Precompute header/footer pixel sizes for layout and interaction decisions
  const headerHeightPxComputed = pageRegions?.header ? (previewHeaderHeightPx !== null ? previewHeaderHeightPx : mmToPx(pageRegions.header.height) * zoom) : 0;
  const footerHeightPxComputed = pageRegions?.footer ? (previewFooterHeightPx !== null ? previewFooterHeightPx : mmToPx(pageRegions.footer.height) * zoom) : 0;

  // Determine if any normal page element currently sits inside header/footer areas
  const hasElementsInHeader = pageRegions?.header ? sortedElements.some(el => (el.position?.y || 0) * zoom < headerHeightPxComputed) : false;
  const hasElementsInFooter = pageRegions?.footer ? sortedElements.some(el => ((el.position?.y || 0) * zoom + (el.size?.height || 0) * zoom) > (canvasHeight - footerHeightPxComputed)) : false;

  // Log when pageRegions header/footer change so we can verify the prop flow
  useEffect(() => {
    try {
      const headerMm = pageRegions?.header?.height ?? null;
      const footerMm = pageRegions?.footer?.height ?? null;
      const headerPx = headerMm !== null ? mmToPx(headerMm) * zoom : null;
      const footerPx = footerMm !== null ? mmToPx(footerMm) * zoom : null;
      console.log('[Canvas] Received pageRegions header/footer:', { headerMm, headerPx, footerMm, footerPx, zoom });
    } catch (err) {
      // ignore
    }
  }, [pageRegions?.header?.height, pageRegions?.footer?.height, zoom]);

  // Add global listeners only when resizing starts. Avoid including preview/state
  // values in the dependency array because they are updated on every mouse move
  // and would cause this effect to re-run repeatedly (leading to infinite loops).
  useEffect(() => {
    if (!isResizingHeader && !isResizingFooter) return;

    const handleMouseMoveDoc = (e: MouseEvent) => {
      if (isResizingHeader) {
        const delta = e.clientY - resizeStartYRef.current;
        const newH = Math.max(0, resizeStartHeightPxRef.current + delta);
        previewHeaderHeightRef.current = newH;
        setPreviewHeaderHeightPx(newH);
        console.log('[Canvas] Header move - delta:', delta, 'newH:', newH);
      }
      if (isResizingFooter) {
        const delta = resizeStartYRef.current - e.clientY;
        const newH = Math.max(0, resizeStartHeightPxRef.current + delta);
        previewFooterHeightRef.current = newH;
        setPreviewFooterHeightPx(newH);
        console.log('[Canvas] Footer move - delta:', delta, 'newH:', newH);
      }
    };

    const handleMouseUpDoc = () => {
      if (isResizingHeader) {
        const finalPx = previewHeaderHeightRef.current ?? resizeStartHeightPxRef.current;
        const finalMm = pxToMm(finalPx);
        console.log('Header resize - finalPx:', finalPx, 'finalMm:', finalMm, 'zoom:', zoom, 'mmToPxFactor:', mmToPxFactor);
        try {
          const newHeader = { ...(pageRegions?.header || {}), height: Math.max(0, finalMm) };
          console.log('newHeader:', newHeader);
          console.log('[Canvas] Calling onUpdatePageRegions with newHeader');
          onUpdatePageRegions?.(newHeader, pageRegions?.footer ?? null);
        } catch (err) {
          console.error('Erro ao atualizar header height', err);
        }
      }
      if (isResizingFooter) {
        const finalPx = previewFooterHeightRef.current ?? resizeStartHeightPxRef.current;
        const finalMm = pxToMm(finalPx);
        console.log('Footer resize - finalPx:', finalPx, 'finalMm:', finalMm, 'zoom:', zoom, 'mmToPxFactor:', mmToPxFactor);
        try {
          const newFooter = { ...(pageRegions?.footer || {}), height: Math.max(0, finalMm) };
          console.log('newFooter:', newFooter);
          console.log('[Canvas] Calling onUpdatePageRegions with newFooter');
          onUpdatePageRegions?.(pageRegions?.header ?? null, newFooter);
        } catch (err) {
          console.error('Erro ao atualizar footer height', err);
        }
      }

  setIsResizingHeader(false);
  setIsResizingFooter(false);
  resizeStartYRef.current = 0;
  resizeStartHeightPxRef.current = 0;
      previewHeaderHeightRef.current = null;
      previewFooterHeightRef.current = null;
      setPreviewHeaderHeightPx(null);
      setPreviewFooterHeightPx(null);
    };

    document.addEventListener('mousemove', handleMouseMoveDoc);
    document.addEventListener('mouseup', handleMouseUpDoc);
    document.body.style.cursor = 'row-resize';
    console.log('[Canvas] Resize listeners added. isResizingHeader:', isResizingHeader, 'isResizingFooter:', isResizingFooter);

    return () => {
      document.removeEventListener('mousemove', handleMouseMoveDoc);
      document.removeEventListener('mouseup', handleMouseUpDoc);
      document.body.style.cursor = 'default';
    };
    // Intentionally only depend on the resize flags so this effect is added/removed
    // once per resize action. Including the preview/position state here causes
    // the effect to re-run on every mousemove, which results in repeated listener
    // registrations and can trigger maximum update depth errors.
  }, [isResizingHeader, isResizingFooter]);

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
    // clear region selection when a normal element is selected
    onRegionSelect?.(null as any);
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
        // Persist pan change to parent (panOffset is controlled by parent)
        onPanChange?.({ x: panOffset.x + dragOffset.x, y: panOffset.y + dragOffset.y });
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
  const handleCanvasDrop = useCallback((e: React.DragEvent, region?: 'header' | 'footer' | null) => {
    e.preventDefault();

    const elementType = e.dataTransfer.getData('text/plain');
    if (elementType && onAddElement) {
      const canvasCoords = getCanvasCoordinates(e.clientX, e.clientY);

      // Clamp position to page bounds (margins) if possible
      const pageBounds = pageSettings?.getPageBounds ? pageSettings.getPageBounds() : null;
      const mmToPxLocal = (mm: number) => (mm * 96) / 25.4;

      let finalPos = { x: canvasCoords.x, y: canvasCoords.y };

      if (pageBounds) {
        const minX = mmToPxLocal(pageBounds.minX);
        const minY = mmToPxLocal(pageBounds.minY);
        const maxX = mmToPxLocal(pageBounds.maxX);
        const maxY = mmToPxLocal(pageBounds.maxY);

        // leave small padding so element center doesn't go out of bounds
        finalPos.x = Math.max(minX, Math.min(finalPos.x, Math.max(minX, maxX - 10)));

        // If drop was explicitly over header/footer region, allow Y to be inside that region
        if (region === 'header') {
          // allow dropping anywhere above the top margin (including top of page)
          finalPos.y = Math.max(0, Math.min(finalPos.y, Math.max(0, maxY - 10)));
        } else if (region === 'footer') {
          // allow dropping in bottom region (below margins)
          // compute page height in px
          const pageSize = pageSettings?.getPageSize ? pageSettings.getPageSize() : null;
          const pageHeightPx = pageSize ? mmToPxLocal(pageSize.height) : maxY;
          finalPos.y = Math.max(minY, Math.min(finalPos.y, Math.max(minY, pageHeightPx - 10)));
        } else {
          finalPos.y = Math.max(minY, Math.min(finalPos.y, Math.max(minY, maxY - 10)));
        }
      }

      try {
        console.log('[Canvas] Dropping element', elementType, 'region:', region, 'finalPos:', finalPos);
        onAddElement(elementType as any, finalPos);
      } catch (err) {
        console.error('Erro ao adicionar elemento via drop:', err);
      }
    }
  }, [getCanvasCoordinates, onAddElement, pageSettings]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Renderizar margens da página (usar pageSettings.margins em mm quando disponível)
  const renderMargins = () => {
    const marginsMM = pageSettings?.pageSettings?.margins;
    const marginsPx = marginsMM ? {
      top: mmToPx(marginsMM.top),
      bottom: mmToPx(marginsMM.bottom),
      left: mmToPx(marginsMM.left),
      right: mmToPx(marginsMM.right)
    } : DEFAULT_MARGINS;

    return (
      <div className="absolute inset-0 pointer-events-none">
        {/* Margem superior */}
        <div 
          className="absolute top-0 left-0 right-0 border-b border-blue-200 border-dashed opacity-50"
          style={{ height: marginsPx.top * zoom }}
        />
        {/* Margem inferior */}
        <div 
          className="absolute bottom-0 left-0 right-0 border-t border-blue-200 border-dashed opacity-50"
          style={{ height: marginsPx.bottom * zoom }}
        />
        {/* Margem esquerda */}
        <div 
          className="absolute top-0 left-0 bottom-0 border-r border-blue-200 border-dashed opacity-50"
          style={{ width: marginsPx.left * zoom }}
        />
        {/* Margem direita */}
        <div 
          className="absolute top-0 right-0 bottom-0 border-l border-blue-200 border-dashed opacity-50"
          style={{ width: marginsPx.right * zoom }}
        />
      </div>
    );
  };

  // Renderizar grid
  const renderGrid = () => {
    if (!showGrid) return null;

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
                  stroke="#cbd5e1" 
                  strokeWidth="1" 
                  opacity="0.65"
                />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
    );
  };

    // Wheel delegated to parent hook (non-passive listener is handled there)
    const handleLocalWheel = useCallback((e: React.WheelEvent) => {
      // delegate native WheelEvent to parent handler if provided
      onWheel?.(e.nativeEvent);
    }, [onWheel]);

    // Add a native wheel listener with passive:false to ensure preventDefault works when needed
    React.useEffect(() => {
      const container = containerRef.current;
      if (!container || !onWheel) return;

      const nativeHandler = (ev: WheelEvent) => {
        // delegate to provided handler
        onWheel(ev);
      };

      container.addEventListener('wheel', nativeHandler, { passive: false });
      return () => container.removeEventListener('wheel', nativeHandler as EventListener);
    }, [onWheel]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-gray-100 relative"
      style={{ overflow: 'auto' }}
      onWheel={handleLocalWheel}
    >
      {/* Canvas principal */}
      <div className="w-full h-full relative">
        <div
          ref={canvasRef}
          className="shadow-xl border border-gray-300 relative overflow-hidden"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `translate(${panOffset.x + dragOffset.x}px, ${panOffset.y + dragOffset.y}px)`,
            transformOrigin: 'center center',
            cursor: isDragging ? 'grabbing' : 'grab',
            backgroundColor: pageSettings?.pageSettings?.backgroundColor || '#ffffff',
            backgroundImage: backgroundImage?.url ? `url(${backgroundImage.url})` : undefined,
            backgroundSize: backgroundImage ? 'cover' : undefined,
            backgroundPosition: backgroundImage ? 'center' : undefined,
            backgroundRepeat: backgroundImage ? 'no-repeat' : undefined
          }}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
        >
          {/* Grid de fundo */}
          {renderGrid()}

          {/* Réguas integradas ao canvas (alinhadas ao conteúdo) */}
          {showRuler && (
            <RulerOverlay
              show
              unit="cm"
              zoom={zoom}
              gridSize={gridSize}
              pageSize={{ width: canvasWidth, height: canvasHeight }}
              insideCanvas
              className="absolute inset-0 pointer-events-none"
            />
          )}

          {/* Margens da página */}
          {renderMargins()}

          {/* Header region (if any) */}
          {pageRegions?.header && (
            (() => {
              try {
                const header = pageRegions.header;
                // Usar previewHeaderHeightPx durante resize, caso contrário usar header.height
                const headerHeightPx = previewHeaderHeightPx !== null 
                  ? previewHeaderHeightPx 
                  : mmToPx(header.height) * zoom;
                return (
                          <div className="absolute left-0 right-0" style={{ top: 0, height: headerHeightPx, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {Array.isArray(header.elements) && (
                                      // Render region elements as interactive CanvasElement items so they can be selected/moved
                                      <div style={{ position: 'relative', zIndex: 45, width: '100%', height: '100%', pointerEvents: 'auto' }}>
                                        {header.elements.map((el: any) => (
                                          el ? (
                                            <CanvasElement
                                              key={el.id}
                                              element={el}
                                              isSelected={selectedElementIds.includes(el.id)}
                                              zoom={zoom}
                                              onSelect={handleElementSelect}
                                              onMove={onElementMove}
                                              onResize={onElementResize}
                                              onEdit={onElementEdit}
                                              snapToGrid={snapToGrid}
                                            />
                                          ) : null
                                        ))}
                                      </div>
                                    )}
                    {/* Drag handle at bottom edge of header */}
                    <div
                      data-testid="header-resize-handle"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        console.log('[Canvas] Header resize start - clientY:', e.clientY, 'headerHeightPx:', headerHeightPx);
                        setIsResizingHeader(true);
                        // update refs used by document handlers
                        resizeStartYRef.current = e.clientY;
                        resizeStartHeightPxRef.current = headerHeightPx;
                        previewHeaderHeightRef.current = headerHeightPx;
                        setPreviewHeaderHeightPx(headerHeightPx);
                      }}
                      className="absolute left-0 right-0 h-1 cursor-row-resize hover:bg-blue-600 transition-colors"
                      style={{ top: Math.max(0, headerHeightPx - 2), zIndex: 60, background: '#3b82f6', pointerEvents: 'auto' }}
                    />
                    {/* Click region to select header */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onRegionSelect?.('header');
                      }}
                      // Allow drag/drop over the header region: forward dragOver/drop to canvas handlers
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => { handleCanvasDrop(e as any, 'header'); }}
                      className="absolute left-0 right-0 top-0 bottom-0"
                      style={{ zIndex: 40, pointerEvents: hasElementsInHeader ? 'none' : 'auto', background: 'transparent' }}
                    />
                    {/* preview overlay */}
                    {isResizingHeader && previewHeaderHeightPx !== null && (
                      <>
                        <div className="absolute left-0 right-0 bg-blue-400 opacity-30" style={{ top: 0, height: previewHeaderHeightPx, pointerEvents: 'none', zIndex: 50 }} />
                        <div className="absolute left-0 right-0 border-b-2 border-blue-500" style={{ top: previewHeaderHeightPx - 1, pointerEvents: 'none', zIndex: 50 }} />
                      </>
                    )}
                  </div>
                );
              } catch (err) {
                return null;
              }
            })()
          )}
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
                snapToGrid={snapToGrid}
              />
            ))}
          </div>

          {/* Footer region (if any) */}
          {pageRegions?.footer && (
            (() => {
              try {
                const footer = pageRegions.footer;
                // Usar previewFooterHeightPx durante resize, caso contrário usar footer.height
                const footerHeightPx = previewFooterHeightPx !== null 
                  ? previewFooterHeightPx 
                  : mmToPx(footer.height) * zoom;
                return (
                  <div className="absolute left-0 right-0" style={{ bottom: 0, height: footerHeightPx, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {Array.isArray(footer.elements) && (
                      <div style={{ position: 'relative', zIndex: 45, width: '100%', height: '100%', pointerEvents: 'auto' }}>
                        {footer.elements.map((el: any) => (
                          el ? (
                            <CanvasElement
                              key={el.id}
                              element={el}
                              isSelected={selectedElementIds.includes(el.id)}
                              zoom={zoom}
                              onSelect={handleElementSelect}
                              onMove={onElementMove}
                              onResize={onElementResize}
                              onEdit={onElementEdit}
                              snapToGrid={snapToGrid}
                            />
                          ) : null
                        ))}
                      </div>
                    )}
                    {/* Drag handle at top edge of footer */}
                    <div
                      data-testid="footer-resize-handle"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setIsResizingFooter(true);
                        // update refs used by document handlers
                        resizeStartYRef.current = e.clientY;
                        resizeStartHeightPxRef.current = footerHeightPx;
                        previewFooterHeightRef.current = footerHeightPx;
                        setPreviewFooterHeightPx(footerHeightPx);
                      }}
                      className="absolute left-0 right-0 h-1 cursor-row-resize hover:bg-blue-600 transition-colors"
                      style={{ bottom: Math.max(0, footerHeightPx - 2), zIndex: 60, background: '#3b82f6', pointerEvents: 'auto' }}
                    />
                    {isResizingFooter && previewFooterHeightPx !== null && (
                      <>
                        <div className="absolute left-0 right-0 bg-blue-400 opacity-30" style={{ bottom: 0, height: previewFooterHeightPx, pointerEvents: 'none', zIndex: 50 }} />
                        <div className="absolute left-0 right-0 border-t-2 border-blue-500" style={{ bottom: previewFooterHeightPx - 1, pointerEvents: 'none', zIndex: 50 }} />
                      </>
                    )}
                    {/* Click region to select footer */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onRegionSelect?.('footer');
                      }}
                      // Allow drag/drop over the footer region
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => { handleCanvasDrop(e as any, 'footer'); }}
                      className="absolute left-0 right-0 top-0 bottom-0"
                      style={{ zIndex: 40, pointerEvents: hasElementsInFooter ? 'none' : 'auto', background: 'transparent' }}
                    />
                  </div>
                );
              } catch (err) {
                return null;
              }
            })()
          )}

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
    </div>
  );
};

export default Canvas;