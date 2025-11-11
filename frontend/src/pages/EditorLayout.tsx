import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTemplateEditor } from '../hooks/useTemplateEditor';
import { useCanvasOperations } from '../hooks/useCanvasOperations';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { usePageSettings } from '../hooks/usePageSettings';
import { useToast } from '../hooks/useToast';
import { useTemplateStorage } from '../hooks/useTemplateStorage';
import { X, Save, Eye, Grid, Ruler, Download, FolderOpen, Settings, Minus, Plus, FileImage, ChevronLeft, ChevronRight } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '../types/editor-constants';
import { Canvas } from '../components/EditorLayoutProfissional/components/EditorCanvas';
import ImageGalleryModal from '../components/EditorLayoutProfissional/components/Modals/ImageGalleryModal';
import { useGridSnap } from '../hooks/useGridSnap';
import { ElementPalette, PropertiesPanel } from '../components/EditorLayoutProfissional/components/Toolbars';
import { ZoomControls, UndoRedoControls } from '../components/EditorLayoutProfissional/components/Utils';
import ErrorNotification from '../components/EditorLayoutProfissional/components/Utils/ErrorNotification';
import SaveTemplateModal from '../components/EditorLayoutProfissional/components/Modals/SaveTemplateModal';
import LoadTemplateModal from '../components/EditorLayoutProfissional/components/Modals/LoadTemplateModal';
import ExportModal from '../components/EditorLayoutProfissional/components/Modals/ExportModal';
import PreviewModal from '../components/EditorLayoutProfissional/components/Modals/PreviewModal';
import PageSettingsModal from '../components/EditorLayoutProfissional/components/Modals/PageSettingsModal';
import ToastContainer from '../components/Toast/ToastContainer';
import '../components/EditorLayoutProfissional/EditorLayout.css';

const EditorLayout: React.FC = () => {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId?: string }>();
  const [searchParams] = useSearchParams();
  
  // Hook para toast notifications
  const { toasts, removeToast, success: showSuccessToast } = useToast();
  
  // Hook principal do editor
  const editor = useTemplateEditor({ 
    templateId: templateId || searchParams.get('templateId') || undefined,
    autoSave: false
  });

  // Hook para operações de canvas (zoom, pan)
  const canvas = useCanvasOperations({
    initialZoom: 1,
    containerSize: { width: 800, height: 600 }
  });

  // Hook para tratamento de erros
  const { errors, dismissError, getErrorTitle } = useErrorHandler();

  // Estado para controlar visibilidade das sidebars
  const [showElementPalette, setShowElementPalette] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  
  // Estado para responsividade
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [forceShowSidebars, setForceShowSidebars] = useState(false);
  
  // Grid / snap
  const [showGrid, setShowGrid] = useState<boolean>(() => {
    try { return localStorage.getItem('editor.showGrid') === 'true'; } catch { return false; }
  });
  const [snapToGrid, setSnapToGrid] = useState<boolean>(() => {
    try { const val = localStorage.getItem('editor.snapToGrid'); return val === null ? true : val === 'true'; } catch { return true; }
  });
  const [showRuler, setShowRuler] = useState<boolean>(() => {
    try { return localStorage.getItem('editor.showRuler') === 'true'; } catch { return false; }
  });
  const [gridSize, setGridSize] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('editor.gridSize') || '20'); } catch { return 20; }
  });
  const { snap } = useGridSnap({ gridSize, enabled: snapToGrid });
  
  // Estados dos modais
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPageSettingsModal, setShowPageSettingsModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<'element' | 'background'>('element');
  const [activeRegion, setActiveRegion] = useState<'header' | 'footer' | null>(null);

  // Hook para configurações de página
  const currentPageId = editor.getCurrentPageId ? editor.getCurrentPageId() : '';
  const currentPageMeta = editor.template.pages?.find(p => p.id === currentPageId) || editor.template.pages?.[0] || null;
  const pageSettings = usePageSettings(
    currentPageMeta?.pageSettings || editor.template.pages?.[0]?.pageSettings,
    currentPageMeta?.backgroundImage || editor.template.backgroundImage
  );

  const pageIndex = editor.template.pages.findIndex(p => p.id === currentPageId);
  const currentPageIndex = pageIndex >= 0 ? pageIndex : 0;
  const totalPages = editor.template.pages.length;

  // Debug: log when current page header/footer change to help trace resize persistence
  useEffect(() => {
    try {
      console.log('[EditorLayout] currentPageMeta header/footer:', { header: currentPageMeta?.header ? { height: currentPageMeta.header.height } : null, footer: currentPageMeta?.footer ? { height: currentPageMeta.footer.height } : null });
    } catch (err) {
      // ignore
    }
  }, [currentPageMeta?.header?.height, currentPageMeta?.footer?.height]);

  // Sincronizar mudanças nas configurações da página quando o template é atualizado
  useEffect(() => {
    if (currentPageMeta?.pageSettings) {
      pageSettings.updatePageSettings(currentPageMeta.pageSettings);
    }
    if (currentPageMeta?.backgroundImage) {
      pageSettings.updateBackgroundImage(currentPageMeta.backgroundImage);
    }
  }, [currentPageMeta?.pageSettings, currentPageMeta?.backgroundImage]);

  // Ref para a área do canvas
  const canvasAreaRef = React.useRef<HTMLDivElement | null>(null);

  // Ref para controlar se já mostrou toast (evitar múltiplos)
  const lastSaveTimeRef = React.useRef<number>(0);

  // Atualizar container size do hook de canvas ao redimensionar a área
  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      if (typeof canvas.setContainerSize === 'function') {
        canvas.setContainerSize({ width: Math.max(100, Math.round(rect.width)), height: Math.max(100, Math.round(rect.height)) });
      }
      // Recentralizar horizontalmente quando o container redimensiona
      if (typeof (canvas as any).centerCanvasHorizontally === 'function') {
        setTimeout(() => (canvas as any).centerCanvasHorizontally(), 0);
      }
    });

    ro.observe(el);
    const rect = el.getBoundingClientRect();
    if (typeof canvas.setContainerSize === 'function') {
      canvas.setContainerSize({ width: Math.max(100, Math.round(rect.width)), height: Math.max(100, Math.round(rect.height)) });
    }
    
    // Centralizar horizontalmente após medir a área inicial
    if (typeof (canvas as any).centerCanvasHorizontally === 'function') {
      setTimeout(() => (canvas as any).centerCanvasHorizontally(), 0);
    }

    return () => {
      ro.disconnect();
    };
  }, [canvas.setContainerSize]);

  // Hook para salvar templates (persistidos vs novos)
  const { saveTemplate } = useTemplateStorage();

  // Handlers para ações principais
  const handleSave = useCallback(async () => {
    try {
      const tpl = editor.template;
      const isNew = tpl.id && tpl.id.startsWith('template-');

      if (!isNew && tpl.id) {
        // Persisted template: save immediately and show toast
        const saved = await saveTemplate(tpl);
        editor.loadTemplate(saved);
        showSuccessToast('Template salvo com sucesso!', 'Salvo', 3000);
        // If saved template got new id, update URL
        if (saved.id && !saved.id.startsWith('template-')) {
          navigate(`/editor-layout/${saved.id}`, { replace: true });
        }
        return;
      }

      // New template: open save modal
      setShowSaveModal(true);
    } catch (err) {
      console.error('Erro ao salvar template:', err);
    }
  }, [editor, saveTemplate, showSuccessToast, navigate]);

  const handleLoad = useCallback(() => {
    setShowLoadModal(true);
  }, []);

  const handleExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const handleSaveComplete = useCallback((savedTemplate: any) => {
    // Evitar múltiplos toasts (apenas 1 a cada 1 segundo)
    const now = Date.now();
    if (now - lastSaveTimeRef.current < 1000) {
      console.log('Salvamento duplicado detectado, ignorando toast');
      return;
    }
    lastSaveTimeRef.current = now;

    // Garantir que savedTemplate tem dados completos
    if (!savedTemplate || !savedTemplate.elements) {
      console.warn('savedTemplate incompleto, não atualizando');
      return;
    }

    // Atualizar o template no editor com dados completos
    editor.loadTemplate(savedTemplate);
    
    // Mostrar mensagem de sucesso
    showSuccessToast('Template salvo com sucesso!', 'Salvo', 3000);
    
    // Se o template recebeu um novo ID do backend, atualizar a URL
    if (savedTemplate.id && !savedTemplate.id.startsWith('template-')) {
      // Agora é um template persistido, atualizar URL
      navigate(`/editor-layout/${savedTemplate.id}`, { replace: true });
    }
  }, [editor, navigate, showSuccessToast]);

  const handleLoadComplete = useCallback((loadedTemplate: any) => {
    editor.loadTemplate(loadedTemplate);
  }, [editor]);

  const handlePreview = useCallback(() => {
    setShowPreviewModal(true);
  }, []);

  const handleClose = useCallback(() => {
    navigate('/templates');
  }, [navigate]);

  // Atalhos de teclado
  useKeyboardShortcuts({
    onUndo: editor.undo,
    onRedo: editor.redo,
    onSave: handleSave,
    onLoad: handleLoad,
    onSelectAll: editor.selectAll,
    onDelete: editor.removeSelectedElements,
    onEscape: editor.clearSelection,
    onGroup: editor.groupSelectedElements,
    onUngroup: editor.ungroupSelectedElements,
    onZoomIn: canvas.zoomIn,
    onZoomOut: canvas.zoomOut,
    onZoomFit: canvas.zoomToFit,
    onCopy: editor.copySelection,
    onPaste: editor.pasteClipboard,
    onCut: () => {}
  }, { enabled: true });

  // Atalhos adicionais específicos do editor
  useEffect(() => {
    const handleAdditionalKeyDown = (e: KeyboardEvent) => {
      const isEditingText = (e.target as HTMLElement)?.contentEditable === 'true' ||
                           (e.target as HTMLElement)?.tagName === 'INPUT' ||
                           (e.target as HTMLElement)?.tagName === 'TEXTAREA';

      if (isEditingText) return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            const newShowPalette = !showElementPalette;
            setShowElementPalette(newShowPalette);
            if (isTablet || isMobile) {
              setForceShowSidebars(newShowPalette || showPropertiesPanel);
            }
            setTimeout(() => canvas.centerCanvasHorizontally(), 50);
            break;
          case '2':
            e.preventDefault();
            const newShowProperties = !showPropertiesPanel;
            setShowPropertiesPanel(newShowProperties);
            if (isTablet || isMobile) {
              setForceShowSidebars(newShowProperties || showElementPalette);
            }
            setTimeout(() => canvas.centerCanvasHorizontally(), 50);
            break;
          case '3':
            e.preventDefault();
            const bothVisible = showElementPalette && showPropertiesPanel;
            const newState = !bothVisible;
            setShowElementPalette(newState);
            setShowPropertiesPanel(newState);
            if (isTablet || isMobile) {
              setForceShowSidebars(newState);
            }
            setTimeout(() => canvas.centerCanvasHorizontally(), 50);
            break;
          case 'r':
            e.preventDefault();
            setShowRuler(s => {
              try { localStorage.setItem('editor.showRuler', String(!s)); } catch {}
              return !s;
            });
            break;
        }
      }
    };

    document.addEventListener('keydown', handleAdditionalKeyDown);
    return () => document.removeEventListener('keydown', handleAdditionalKeyDown);
  }, [showElementPalette, showPropertiesPanel, isTablet, isMobile]);

  // Detecção de responsividade
  useEffect(() => {
    const checkResponsive = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };

    checkResponsive();
    window.addEventListener('resize', checkResponsive);
    return () => window.removeEventListener('resize', checkResponsive);
  }, []);

  useEffect(() => {
    if (isMobile || isTablet) {
      setShowElementPalette(false);
      setShowPropertiesPanel(false);
    } else {
      if (!forceShowSidebars) {
        setShowElementPalette(true);
        setShowPropertiesPanel(true);
      }
    }
  }, [forceShowSidebars]);

  return (
    <div className="flex flex-col h-screen w-screen bg-white">
      {/* Header - Barra de ferramentas principal */}
      <div 
        className="bg-gray-900 text-white p-3 flex items-center justify-between border-b border-gray-700 min-h-[60px]"
      >
        {/* Lado esquerdo - Título e nome do template */}
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm md:text-lg font-semibold truncate">Editor de Layout</h1>
          <div className="text-xs text-gray-400 truncate">
            {editor.template?.name || ''}
          </div>
        </div>

        {/* Centro - Controles principais */}
        <div className="flex items-center gap-1 md:gap-2 flex-1 justify-center max-w-2xl mx-4">
          <UndoRedoControls
            canUndo={editor.canUndo}
            canRedo={editor.canRedo}
            onUndo={editor.undo}
            onRedo={editor.redo}
            historySize={editor.historySize}
            currentIndex={editor.currentHistoryIndex}
            showHistoryInfo={false}
            compact={isMobile}
          />

          <div className="w-px h-6 bg-gray-600 mx-1 md:mx-2 hidden sm:block" />

          <ZoomControls
            zoom={canvas.zoom}
            onZoomIn={canvas.zoomIn}
            onZoomOut={canvas.zoomOut}
            onZoomToFit={canvas.zoomToFit}
            onZoomChange={canvas.setZoom}
          />

          <div className="w-px h-6 bg-gray-600 mx-1 md:mx-2 hidden sm:block" />

          <button
            onClick={() => { 
              setShowGrid(s => {
                try { localStorage.setItem('editor.showGrid', String(!s)); } catch {}
                return !s;
              });
              setSnapToGrid(s => {
                try { localStorage.setItem('editor.snapToGrid', String(!s)); } catch {}
                return !s;
              });
            }}
            className={`p-2 rounded transition-colors ${showGrid ? 'text-white bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
            title="Mostrar/ocultar grade"
          >
            <Grid className="h-4 w-4" />
          </button>

          <button
            onClick={() => setShowRuler(s => {
              try { localStorage.setItem('editor.showRuler', String(!s)); } catch {}
              return !s;
            })}
            className={`p-2 rounded transition-colors ${showRuler ? 'text-white bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
            title="Mostrar/ocultar réguas (Ctrl+R)"
          >
            <Ruler className="h-4 w-4" />
          </button>

          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={() => setGridSize(s => {
                const newSize = Math.max(5, s - 5);
                try { localStorage.setItem('editor.gridSize', String(newSize)); } catch {}
                return newSize;
              })}
              className="p-1 rounded text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              title="Diminuir tamanho da grade"
              disabled={gridSize <= 5}
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="text-xs text-gray-300 min-w-[24px] text-center">{gridSize}px</span>
            <button
              onClick={() => setGridSize(s => {
                const newSize = Math.min(100, s + 5);
                try { localStorage.setItem('editor.gridSize', String(newSize)); } catch {}
                return newSize;
              })}
              className="p-1 rounded text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              title="Aumentar tamanho da grade"
              disabled={gridSize >= 100}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <button
            onClick={() => setShowPageSettingsModal(true)}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Configurações da página"
          >
            <Settings className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => editor.goToPage && editor.goToPage(Math.max(0, currentPageIndex - 1))}
              className="p-2 rounded text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              title="Página anterior"
              disabled={currentPageIndex <= 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => editor.addPage && editor.addPage()}
              className="p-2 rounded text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              title="Adicionar página"
            >
              <Plus className="h-4 w-4" />
            </button>

            <button
              onClick={() => editor.removeCurrentPage && editor.removeCurrentPage()}
              className="p-2 rounded text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              title="Remover página atual"
              disabled={editor.template.pages && editor.template.pages.length <= 1}
            >
              <Minus className="h-4 w-4" />
            </button>

            <div className="text-xs text-gray-300 ml-2">
              Página: {currentPageIndex + 1} / {totalPages}
            </div>

            <button
              onClick={() => editor.goToPage && editor.goToPage(Math.min(totalPages - 1, currentPageIndex + 1))}
              className="p-2 rounded text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              title="Próxima página"
              disabled={currentPageIndex >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-600 mx-1 md:mx-2 hidden lg:block" />

          <button
            onClick={() => {
              const bothVisible = showElementPalette && showPropertiesPanel;
              const newState = !bothVisible;
              setShowElementPalette(newState);
              setShowPropertiesPanel(newState);
              if (isTablet || isMobile) {
                setForceShowSidebars(newState);
              }
            }}
            className={`lg:hidden p-2 rounded transition-colors ${
              (showElementPalette || showPropertiesPanel)
                ? 'text-white bg-gray-700' 
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
            title="Alternar painéis (Ctrl+3)"
          >
            <span className="text-xs font-medium">Painéis</span>
          </button>

          {/* Setas para expandir/retrair sidebars (Desktop) */}
          <button
            onClick={() => setShowElementPalette(!showElementPalette)}
            className="hidden lg:flex p-2 rounded text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            title="Expandir/Retrair Paleta de Elementos"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${showElementPalette ? '' : 'rotate-180'}`} />
          </button>

          <button
            onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
            className="hidden lg:flex p-2 rounded text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            title="Expandir/Retrair Painel de Propriedades"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${showPropertiesPanel ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {/* Lado direito - Ações principais */}
        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={handleLoad}
            className="bg-blue-600 hover:bg-blue-700 p-2 rounded-full flex items-center justify-center transition-colors"
            title={`Carregar Template (Ctrl+O)`}
          >
            <FolderOpen className="h-4 w-4" />
          </button>

          <button
            onClick={() => setShowGalleryModal(true)}
            className="bg-blue-600 hover:bg-blue-700 p-2 rounded-full flex items-center justify-center transition-colors"
            title="Galeria de Imagens"
          >
            <FileImage className="h-4 w-4" />
          </button>

          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 p-2 rounded-full flex items-center justify-center transition-colors"
            title={`Salvar (${KEYBOARD_SHORTCUTS.SAVE})`}
          >
            <Save className="h-4 w-4" />
          </button>

          <button
            onClick={handlePreview}
            className="bg-indigo-600 hover:bg-indigo-700 p-2 rounded-full flex items-center justify-center transition-colors hidden sm:flex"
            title="Visualizar template"
          >
            <Eye className="h-4 w-4" />
          </button>

          <button
            onClick={handleExport}
            className="bg-purple-600 hover:bg-purple-700 p-2 rounded-full flex items-center justify-center transition-colors"
            title="Exportar template"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            onClick={() => setShowPageSettingsModal(true)}
            className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full flex items-center justify-center transition-colors"
            title="Configurações da página"
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            onClick={handleClose}
            className="bg-red-600 hover:bg-red-700 p-2 rounded transition-colors"
            title="Fechar editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Conteúdo principal - Layout otimizado com CSS Grid */}
      <div className={`flex-1 overflow-hidden grid editor-layout-grid ${
        (isTablet && forceShowSidebars) ? 'force-show-sidebars' : ''
      }`}>
        {/* Sidebar esquerda - Paleta de elementos */}
        {showElementPalette && (
          <div className={`bg-gray-50 border-r border-gray-200 overflow-y-auto editor-sidebar-left ${
            isMobile ? 'mobile-visible' : ''
          }`}>
            <ElementPalette
              onAddElement={editor.addElement}
              isVisible={showElementPalette}
              onToggleVisibility={() => setShowElementPalette(false)}
            />
          </div>
        )}

        {/* Área central - Canvas */}
        <div
          ref={canvasAreaRef}
          className="relative overflow-auto editor-canvas-area flex flex-col"
          onClick={(e) => {
            const target = e.target as Node;
            const canvasEl = canvasAreaRef.current?.querySelector('.shadow-xl');

            if (e.target === canvasAreaRef.current || (canvasEl && !canvasEl.contains(target))) {
              editor.clearSelection();
            }
          }}
        >
          <div className="bg-gray-100 relative w-full h-full flex-1">
            <Canvas
              elements={editor.getCurrentPageElements ? editor.getCurrentPageElements() : editor.template.elements}
              selectedElementIds={editor.selectedElementIds}
              zoom={canvas.zoom}
              panOffset={canvas.panOffset}
              onPanChange={canvas.setPanOffset}
              onWheel={canvas.handleWheel}
              onAddElement={editor.addElement}
              showRuler={showRuler}
              onElementSelect={editor.selectElement}
              onRegionSelect={setActiveRegion}
              onElementMove={(id, newPos) => {
                const bounds = pageSettings.getPageBounds();
                const mmToPx = (mm: number) => (mm * 96) / 25.4;
                const pageSize = pageSettings.getPageSize();
                const pageHeightPx = pageSize ? mmToPx(pageSize.height) : mmToPx(bounds.maxX);
                const minX = mmToPx(bounds.minX);
                const maxX = mmToPx(bounds.maxX);
                // Allow placing into header region: if current page has header, allow minY = 0
                const minY = currentPageMeta?.header ? 0 : mmToPx(bounds.minY);
                const maxY = currentPageMeta?.footer ? pageHeightPx : mmToPx(bounds.maxY);

                const el = editor.getElementById(id);
                const elW = el?.size.width || 0;
                const elH = el?.size.height || 0;

                const clampedX = Math.max(minX, Math.min(newPos.x, Math.max(minX, maxX - elW)));
                const clampedY = Math.max(minY, Math.min(newPos.y, Math.max(minY, maxY - elH)));

                editor.moveElement(id, { x: clampedX, y: clampedY });
              }}
              onElementResize={(id, size) => {
                const bounds = pageSettings.getPageBounds();
                const mmToPx = (mm: number) => (mm * 96) / 25.4;
                const maxX = mmToPx(bounds.maxX);
                const maxY = mmToPx(bounds.maxY);

                const el = editor.getElementById(id);
                const posX = el?.position.x || 0;
                const posY = el?.position.y || 0;

                const maxAllowedW = Math.max(1, maxX - posX);
                const maxAllowedH = Math.max(1, maxY - posY);

                let newW = size.width;
                let newH = size.height;

                if (showGrid && snapToGrid) {
                  newW = Math.round(newW / gridSize) * gridSize;
                  newH = Math.round(newH / gridSize) * gridSize;
                }

                newW = Math.max(1, Math.min(newW, maxAllowedW));
                newH = Math.max(1, Math.min(newH, maxAllowedH));

                editor.resizeElement(id, { width: newW, height: newH });
              }}
              onElementEdit={editor.updateElementContent}
              showGrid={showGrid}
              gridSize={gridSize}
              snapToGrid={snapToGrid ? snap : undefined}
              pageSettings={pageSettings}
              backgroundImage={pageSettings.backgroundImage}
              pageRegions={{ header: currentPageMeta?.header, footer: currentPageMeta?.footer, pageNumberInfo: { current: currentPageIndex + 1, total: totalPages } }}
              onUpdatePageRegions={editor.updatePageRegions}
            />
          </div>
        </div>

        {/* Sidebar direita - Painel de propriedades */}
        {showPropertiesPanel && (
          <div className={`bg-gray-50 border-l border-gray-200 overflow-y-auto editor-sidebar-right ${
            isMobile ? 'mobile-visible' : ''
          }`}>
            <PropertiesPanel
              selectedElements={editor.getSelectedElements()}
              onUpdateStyles={editor.updateElementStyles}
              onUpdateContent={editor.updateElementContent}
              onUpdateElements={editor.updateElements}
              region={activeRegion ? { type: activeRegion, data: activeRegion === 'header' ? currentPageMeta?.header : currentPageMeta?.footer, onUpdate: (updates: any) => {
                const newHeader = activeRegion === 'header' ? { ...(currentPageMeta?.header || {}), ...updates } : currentPageMeta?.header || null;
                const newFooter = activeRegion === 'footer' ? { ...(currentPageMeta?.footer || {}), ...updates } : currentPageMeta?.footer || null;
                editor.updatePageRegions && editor.updatePageRegions(newHeader as any, newFooter as any);
              } } : undefined}
              onGroupElements={editor.groupSelectedElements}
              onUngroupElements={editor.ungroupSelectedElements}
              onBringToFront={editor.bringToFront}
              onSendToBack={editor.sendToBack}
              canGroup={editor.canGroupSelection()}
              canUngroup={editor.canUngroupSelection()}
              isVisible={showPropertiesPanel}
              onToggleVisibility={() => setShowPropertiesPanel(false)}
            />
          </div>
        )}
      </div>

      {/* Mobile overlay para fechar sidebars */}
      {isMobile && (showElementPalette || showPropertiesPanel) && (
        <div 
          className="mobile-sidebar-overlay"
          onClick={() => {
            setShowElementPalette(false);
            setShowPropertiesPanel(false);
          }}
        />
      )}

      {/* Status bar */}
      <div className="bg-gray-100 border-t border-gray-200 px-2 md:px-4 py-2 flex items-center justify-between text-xs md:text-sm text-gray-600">
        <div className="flex items-center gap-2 md:gap-4">
          <span>Elementos: {editor.template.elements.length}</span>
          <span className="hidden sm:inline">Selecionados: {editor.selectedElementIds.length}</span>
          <span>Zoom: {Math.round(canvas.zoom * 100)}%</span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => editor.goToPage(Math.max(0, currentPageIndex - 1))}
              disabled={currentPageIndex <= 0}
              className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
            >‹</button>
            <div className="text-sm">Página {currentPageIndex + 1} / {totalPages}</div>
            <button
              onClick={() => editor.goToPage(Math.min(totalPages - 1, currentPageIndex + 1))}
              disabled={currentPageIndex >= totalPages - 1}
              className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
            >›</button>
          </div>
          <span className="hidden lg:inline">Orientação: { (currentPageMeta?.pageSettings?.orientation || editor.template.pages?.[0]?.pageSettings?.orientation) === 'portrait' ? 'Retrato' : 'Paisagem' }</span>
        </div>
      </div>

      {/* Modais de gerenciamento de templates */}
      <SaveTemplateModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        template={editor.template}
        onSave={handleSaveComplete}
        isNewTemplate={editor.template.id?.startsWith('template-') || false}
      />

      <LoadTemplateModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onLoad={handleLoadComplete}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        template={editor.template}
      />

      <PageSettingsModal
        isOpen={showPageSettingsModal}
        onClose={() => setShowPageSettingsModal(false)}
        pageSettings={pageSettings.pageSettings}
        backgroundImage={pageSettings.backgroundImage}
        initialHeader={currentPageMeta?.header}
        initialFooter={currentPageMeta?.footer}
        onUpdatePageSettings={(settings) => {
          pageSettings.updatePageSettings(settings);
          editor.updatePageSettings(settings);
        }}
        onUpdateBackgroundImage={(image) => {
          pageSettings.updateBackgroundImage(image);
          editor.updateBackgroundImage(image);
        }}
        onUpdateHeaderFooter={(header, footer) => {
          editor.updatePageRegions && editor.updatePageRegions(header, footer);
        }}
        onOpenGallery={() => { setGalleryTarget('background'); setShowGalleryModal(true); }}
      />

      <ImageGalleryModal
        isOpen={showGalleryModal}
        onClose={() => setShowGalleryModal(false)}
        onSelectImage={(img) => {
          if (galleryTarget === 'background') {
            // set as page background
            pageSettings.updateBackgroundImage({ url: img.src, repeat: 'no-repeat', opacity: 1, position: 'center' });
            editor.updateBackgroundImage && editor.updateBackgroundImage({ url: img.src, repeat: 'no-repeat', opacity: 1, position: 'center' });
            setShowGalleryModal(false);
            // keep galleryTarget default
            setGalleryTarget('element');
            return;
          }

          // default behavior: add image element to canvas
          const id = editor.addElement('image', { x: 20, y: 20 });
          editor.updateElementContent(id, {
            src: img.src,
            alt: img.alt,
            originalSize: img.originalSize,
            aspectRatio: img.aspectRatio
          });
          setShowGalleryModal(false);
        }}
      />

      <PreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        template={editor.template}
        pageSettings={pageSettings.pageSettings}
        backgroundImage={pageSettings.backgroundImage}
        onExport={() => {
          setShowPreviewModal(false);
          setShowExportModal(true);
        }}
      />

      {/* Sistema de notificações de erro */}
      <ErrorNotification
        errors={errors}
        onDismiss={dismissError}
        getErrorTitle={getErrorTitle}
      />

      {/* Sistema de notificações de sucesso */}
      <ToastContainer
        toasts={toasts}
        onClose={removeToast}
      />
    </div>
  );
};

export default EditorLayout;
