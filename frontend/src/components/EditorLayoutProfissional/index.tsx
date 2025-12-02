import React, { useEffect, useCallback, useState } from 'react';
import { X, Save, Eye, Grid, Ruler, Download, FolderOpen, Settings, Minus, Plus, FileImage, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTemplateEditor } from '../../hooks/useTemplateEditor';
import { useCanvasOperations } from '../../hooks/useCanvasOperations';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useToast } from '../../hooks/useToast';
import { useTemplateStorage } from '../../hooks/useTemplateStorage';
import { usePageSettings } from '../../hooks/usePageSettings';
import { EditorProps } from '../../types/editor';
import { KEYBOARD_SHORTCUTS } from '../../types/editor-constants';
import './EditorLayout.css';

// Componentes que serão implementados nas próximas tarefas
import { Canvas } from './components/EditorCanvas';
import ImageGalleryModal from './components/Modals/ImageGalleryModal';
// Grid and Ruler are rendered inside the Canvas component for correct alignment
import { useGridSnap } from '../../hooks/useGridSnap';
import { ElementPalette, PropertiesPanel } from './components/Toolbars';
import { ZoomControls, UndoRedoControls } from './components/Utils';
import ErrorNotification from './components/Utils/ErrorNotification';

// Modais de gerenciamento de templates
import SaveTemplateModal from './components/Modals/SaveTemplateModal';
import LoadTemplateModal from './components/Modals/LoadTemplateModal';
import ExportModal from './components/Modals/ExportModal';
import PreviewModal from './components/Modals/PreviewModal';
import PageSettingsModal from './components/Modals/PageSettingsModal';
import ValidationResultModal from './components/Modals/ValidationResultModal';
import PDFPreviewModal from './components/Modals/PDFPreviewModal';
import ValidationSelectorModal from './components/Modals/ValidationSelectorModal';
import { validateTemplate } from '../../utils/templateValidation';
import type { ValidationResult } from '../../utils/templateValidation';
import LoadingButton from '../common/LoadingButton';
import { FileCheck, FileSearch } from 'lucide-react';

const EditorLayoutProfissional: React.FC<EditorProps> = ({
  isOpen,
  onClose,
  templateId,
  onSave
}) => {
  // Hook principal do editor
  const editor = useTemplateEditor({ 
    templateId,
    autoSave: false // Desabilitado por enquanto
  });

  // Hook para operações de canvas (zoom, pan)
  const canvas = useCanvasOperations({
    initialZoom: 1,
    containerSize: { width: 800, height: 600 } // Será calculado dinamicamente
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
  
  // Estado para região selecionada (header/footer)
  const [selectedRegion, setSelectedRegion] = useState<'header' | 'footer' | null>(null);
  
  // Handler para ESC - limpar seleção de elementos e regiões
  const handleEscape = useCallback(() => {
    editor.clearSelection();
    setSelectedRegion(null);
  }, [editor]);
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

  // Novos estados para valida��o e preview
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [showValidationSelector, setShowValidationSelector] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [selectedValidationId, setSelectedValidationId] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Hook para configurações de página
  // Use page-specific settings when available (multi-page support)
  const currentPageId = editor.getCurrentPageId ? editor.getCurrentPageId() : '';
  // Defensive: ensure we have a pages array to avoid runtime errors in tests or
  // during initial load when template may not be fully hydrated.
  const pages = editor.template?.pages ?? [];
  const currentPageMeta = pages.find(p => p.id === currentPageId) || pages[0] || null;
  const pageSettings = usePageSettings(
    currentPageMeta?.pageSettings || pages[0]?.pageSettings,
    currentPageMeta?.backgroundImage || editor.template?.backgroundImage
  );

  const pageIndex = pages.findIndex(p => p.id === currentPageId);
  const currentPageIndex = pageIndex >= 0 ? pageIndex : 0;
  const totalPages = pages.length;

  // Ref para a área do canvas para medir seu tamanho e informar o hook
  const canvasAreaRef = React.useRef<HTMLDivElement | null>(null);

  // Ref para o header interno do editor (faixa preta) para medir sua altura
  const editorHeaderRef = React.useRef<HTMLDivElement | null>(null);
  const [editorHeaderHeight, setEditorHeaderHeight] = useState<number>(0);

  // Medir a altura do header global da aplicação para posicionar o modal logo abaixo dele
  const [headerOffset, setHeaderOffset] = useState<number>(64); // fallback 64px (h-16)

  // Medir a posição da sidebar do sistema (quando visível) para posicionar o
  // editor modal de forma que comece ao lado da sidebar em vez de ficar por baixo.
  const [sidebarOffset, setSidebarOffset] = useState<number>(0);

  useEffect(() => {
    const measureSidebar = () => {
      // Tailwind desktop sidebar renders with classes like 'lg:fixed' and a fixed width (w-64)
      const sidebarEl = document.querySelector('.lg\\:fixed') as HTMLElement | null;
      if (sidebarEl) {
        const rect = sidebarEl.getBoundingClientRect();
        // Use rect.right as the left offset for the editor modal
        setSidebarOffset(Math.round(rect.right));
      } else {
        setSidebarOffset(0);
      }
    };

    measureSidebar();
    window.addEventListener('resize', measureSidebar);

    // MutationObserver to catch class changes or show/hide of the sidebar
    const mo = new MutationObserver(measureSidebar);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', measureSidebar);
      mo.disconnect();
    };
  }, []);

  useEffect(() => {
    const measure = () => {
      const appHeader = document.querySelector('header');
      if (appHeader) {
        const rect = appHeader.getBoundingClientRect();
        // Use rect.bottom so the modal top aligns with the bottom edge of the
        // header (removes any gap caused by borders/margins).
        setHeaderOffset(Math.round(rect.bottom));
      } else {
        setHeaderOffset(64);
      }
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Atualizar container size do hook de canvas ao redimensionar a área
  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      if (typeof canvas.setContainerSize === 'function') {
        canvas.setContainerSize({ width: Math.max(100, Math.round(rect.width)), height: Math.max(100, Math.round(rect.height)) });
      }
      // center canvas to keep consistent visual alignment
      if (typeof (canvas as any).centerCanvas === 'function') {
        (canvas as any).centerCanvas();
      }
    });

    ro.observe(el);
    // trigger initial measurement
    const rect = el.getBoundingClientRect();
    if (typeof canvas.setContainerSize === 'function') {
      canvas.setContainerSize({ width: Math.max(100, Math.round(rect.width)), height: Math.max(100, Math.round(rect.height)) });
    }
    if (typeof (canvas as any).centerCanvas === 'function') {
      (canvas as any).centerCanvas();
    }

    // measure editor header height initially
    const measureHeader = () => {
      const h = editorHeaderRef.current?.getBoundingClientRect().height || 0;
      setEditorHeaderHeight(Math.round(h));
    };
    measureHeader();
    window.addEventListener('resize', measureHeader);

    return () => ro.disconnect();
  }, [canvas.setContainerSize, canvas.centerCanvas]);

  // Calcular tamanho da página baseado nas configurações

  // Hook para salvar templates (persistidos vs novos)
  const { saveTemplate } = useTemplateStorage();
  const { success: showSuccessToast } = useToast();

  // Handlers para ações principais
  const handleSave = useCallback(async () => {
    try {
      const tpl = editor.template;
      const isNew = tpl.id && tpl.id.startsWith('template-');

      if (!isNew && tpl.id) {
        // Persisted template: save immediately and show toast
        const saved = await saveTemplate(tpl);
        // Update editor with returned data and notify parent if needed
        editor.loadTemplate(saved);
        showSuccessToast('Template salvo com sucesso!', 'Salvo', 3000);
        // If parent onSave exists, call it
        if (onSave) onSave(saved);
        return;
      }

      // New template: open save modal
      setShowSaveModal(true);
    } catch (err) {
      // useTemplateStorage handles errors; nothing else here
      console.error('Erro ao salvar template:', err);
    }
  }, [editor, saveTemplate, showSuccessToast, onSave]);

  const handleLoad = useCallback(() => {
    setShowLoadModal(true);
  }, []);

  const handleExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const handleSaveComplete = useCallback((savedTemplate: any) => {
    editor.loadTemplate(savedTemplate);
    if (onSave) {
      onSave(savedTemplate);
    }
  }, [editor, onSave]);

  const handleLoadComplete = useCallback((loadedTemplate: any) => {
    editor.loadTemplate(loadedTemplate);
  }, [editor]);

  const handlePreview = useCallback(() => {
    setShowPreviewModal(true);
  }, []);
  const handleValidateTemplate = useCallback(() => {
    if (!editor.template) return;
    const results = validateTemplate(editor.template);
    setValidationResults(results);
    setShowValidationModal(true);
  }, [editor.template]);

  const handleOpenPDFPreview = useCallback(() => {
    setShowValidationSelector(true);
  }, []);

  const handleValidationSelect = useCallback((validation: any) => {
    setSelectedValidationId(validation.id);
    setShowValidationSelector(false);
    setShowPDFPreview(true);
  }, []);

  const handleGeneratePDF = useCallback(async (validationId: string) => {
    setIsGeneratingPDF(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/editor-templates/${templateId}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ validationId })
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${templateId}_${Date.now()}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [templateId]);


  // Atalhos de teclado usando hook dedicado
  useKeyboardShortcuts({
    onUndo: editor.undo,
    onRedo: editor.redo,
    onSave: handleSave,
    onLoad: handleLoad,
    onSelectAll: editor.selectAll,
    onDelete: editor.removeSelectedElements,
    onEscape: handleEscape,
    onGroup: editor.groupSelectedElements,
    onUngroup: editor.ungroupSelectedElements,
    onZoomIn: canvas.zoomIn,
    onZoomOut: canvas.zoomOut,
    onZoomFit: canvas.zoomToFit,
  // TODO: Implementar copy/paste/cut
  onCopy: editor.copySelection,
    onPaste: editor.pasteClipboard,
    onCut: () => {}
  }, { enabled: isOpen });

  // Atalhos adicionais específicos do editor (toggle sidebars)
  useEffect(() => {
    if (!isOpen) return;

    const handleAdditionalKeyDown = (e: KeyboardEvent) => {
      // Verificar se não está editando texto
      const isEditingText = (e.target as HTMLElement)?.contentEditable === 'true' ||
                           (e.target as HTMLElement)?.tagName === 'INPUT' ||
                           (e.target as HTMLElement)?.tagName === 'TEXTAREA';

      if (isEditingText) return;

      // Atalhos específicos do editor
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            // Toggle Element Palette
            const newShowPalette = !showElementPalette;
            setShowElementPalette(newShowPalette);
            if (isTablet || isMobile) {
              setForceShowSidebars(newShowPalette || showPropertiesPanel);
            }
                        // Re-center canvas when sidebar changes
                        if (typeof (canvas as any).centerCanvas === 'function') setTimeout(() => (canvas as any).centerCanvas(), 50);
            break;
          case '2':
            e.preventDefault();
            // Toggle Properties Panel
            const newShowProperties = !showPropertiesPanel;
            setShowPropertiesPanel(newShowProperties);
            if (isTablet || isMobile) {
              setForceShowSidebars(newShowProperties || showElementPalette);
            }
            // Re-center canvas when sidebar changes
            setTimeout(() => canvas.centerCanvas(), 50);
            break;
          case '3':
            e.preventDefault();
            // Toggle both sidebars
            const bothVisible = showElementPalette && showPropertiesPanel;
            const newState = !bothVisible;
            setShowElementPalette(newState);
            setShowPropertiesPanel(newState);
            if (isTablet || isMobile) {
              setForceShowSidebars(newState);
            }
            // Re-center canvas when sidebars change
            setTimeout(() => canvas.centerCanvas(), 50);
            break;
          case 'r':
            e.preventDefault();
            // Toggle rulers (Ctrl+R)
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
  }, [isOpen, showElementPalette, showPropertiesPanel, isTablet, isMobile]);

  // Detecção de responsividade
  useEffect(() => {
    const checkResponsive = () => {
      const width = window.innerWidth;
      const newIsMobile = width <= 767;
      const newIsTablet = width >= 768 && width <= 1023;
      
      setIsMobile(newIsMobile);
      setIsTablet(newIsTablet);
      
      // Em mobile e tablet, ocultar sidebars por padrão para maximizar canvas
      if (newIsMobile || newIsTablet) {
        if (!forceShowSidebars) {
          setShowElementPalette(false);
          setShowPropertiesPanel(false);
        }
      } else {
        // Em desktop, mostrar sidebars por padrão
        if (!forceShowSidebars) {
          setShowElementPalette(true);
          setShowPropertiesPanel(true);
        }
      }
    };

    // Verificar no mount
    checkResponsive();

    // Adicionar listener para resize
    window.addEventListener('resize', checkResponsive);
    return () => window.removeEventListener('resize', checkResponsive);
  }, [forceShowSidebars]);

  // Bloquear scroll do body quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // Start the modal below the application's top header using the measured header height
    // so it doesn't float above the system header. We apply an inline top style
    // so responsive header height is respected.
    <div
      className="fixed right-0 bottom-0 bg-black bg-opacity-50 z-30 flex"
      style={{ top: `${headerOffset}px`, left: sidebarOffset ? `${sidebarOffset}px` : undefined }}
    >
      <div className="bg-white w-full h-full flex flex-col">
        {/* Header - Barra de ferramentas principal */}
    <div ref={editorHeaderRef} className="bg-gray-900 text-white p-3 flex items-center justify-between border-b border-gray-700 min-h-[60px] editor-header">
          {/* Lado esquerdo - botão para recolher sidebar, título e nome do template */}
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <button
              onClick={() => {
                const newShow = !showElementPalette;
                setShowElementPalette(newShow);
                // Re-center canvas when sidebar changes
                if (typeof (canvas as any).centerCanvas === 'function') setTimeout(() => (canvas as any).centerCanvas(), 50);
              }}
              className="p-1 rounded bg-transparent text-gray-200 hover:text-white hover:bg-gray-800 focus:outline-none"
              title={showElementPalette ? 'Recolher paleta' : 'Mostrar paleta'}
            >
              {showElementPalette ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>

            {/* Toggle global system sidebar (dispatch event to Layout) */}
            {/* main system sidebar toggle removed from editor header (moved to global Header) */}

            <div className="flex flex-col">
              <h1 className="text-sm md:text-lg font-semibold">Editor de Layout</h1>
              <div className="text-xs md:text-sm text-gray-300 truncate hidden sm:block">
                {editor.template?.name || ''}
              </div>
            </div>

            {/* Toggle rápido para a sidebar direita (painel de propriedades) */}
            <button
              onClick={() => {
                const newShow = !showPropertiesPanel;
                setShowPropertiesPanel(newShow);
                // Re-center canvas when sidebar changes
                if (typeof (canvas as any).centerCanvas === 'function') setTimeout(() => (canvas as any).centerCanvas(), 50);
              }}
              className="ml-2 p-1 rounded bg-transparent text-gray-200 hover:text-white hover:bg-gray-800 focus:outline-none"
              title={showPropertiesPanel ? 'Recolher painel de propriedades' : 'Mostrar painel de propriedades'}
            >
              {showPropertiesPanel ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Centro - Controles principais */}
          <div className="flex items-center gap-1 md:gap-2 flex-1 justify-center max-w-2xl mx-4">
            {/* Undo/Redo */}
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

            {/* Zoom Controls */}
            <ZoomControls
              zoom={canvas.zoom}
              onZoomIn={canvas.zoomIn}
              onZoomOut={canvas.zoomOut}
              onZoomToFit={canvas.zoomToFit}
              onZoomChange={canvas.setZoom}
            />

            <div className="w-px h-6 bg-gray-600 mx-1 md:mx-2 hidden sm:block" />

            {/* Controles de visualização */}
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
              title="Mostrar/ocultar grade (clicar alterna snap)"
            >
              <Grid className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowRuler(s => {
                try { localStorage.setItem('editor.showRuler', String(!s)); } catch {}
                return !s;
              })}
              className={`p-2 rounded transition-colors ${showRuler ? 'text-white bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
              title="Mostrar/ocultar réguas (Ctrl+R para atalho)"
            >
              <Ruler className="h-4 w-4" />
            </button>

            {/* Controles de tamanho da grade */}
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

            {/* Labels button removed - feature deprecated */}

            <button
              onClick={() => setShowPageSettingsModal(true)}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Configurações da página"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Page controls: add/remove and navigate */}
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
                disabled={editor.template?.pages && editor.template.pages.length <= 1}
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

            {/* Controle compacto para tablets e mobile */}
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
              onClick={() => { setGalleryTarget('element'); setShowGalleryModal(true); }}
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
              onClick={handleValidateTemplate}
              className="bg-yellow-600 hover:bg-yellow-700 p-2 rounded-full flex items-center justify-center transition-colors"
              title="Validar Template"
            >
              <FileCheck className="h-4 w-4" />
            </button>

            <button
              onClick={handleOpenPDFPreview}
              className="bg-orange-600 hover:bg-orange-700 p-2 rounded-full flex items-center justify-center transition-colors"
              title="Preview PDF"
            >
              <FileSearch className="h-4 w-4" />
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
              onClick={onClose}
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
          {/* Sidebar esquerda - Paleta de elementos (15% da largura) */}
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

          {/* Área central - Canvas (70% da largura quando ambas sidebars visíveis) */}
          <div
            ref={canvasAreaRef}
            className="relative overflow-auto editor-canvas-area flex flex-col"
            style={{}}
            onClick={(e) => {
              // If clicked on the canvas area outside the page itself, clear selection
              const target = e.target as Node;
              const canvasEl = canvasAreaRef.current?.querySelector('.shadow-xl');

              // If click is directly on the canvas area (background) or outside the inner canvas element, clear selection
              if (e.target === canvasAreaRef.current || (canvasEl && !canvasEl.contains(target))) {
                editor.clearSelection();
              }
            }}
          >
            {/* Spacer to push canvas below the editor header (avoids padding artifacts on zoom) */}
            <div style={{ height: editorHeaderHeight, flexShrink: 0 }} />

            <div className="bg-gray-100 relative w-full h-full flex-1">
              {/* Grid and ruler are rendered inside the Canvas to keep them aligned to the page */}
              <Canvas
                elements={editor.getCurrentPageElements ? editor.getCurrentPageElements() : editor.template?.elements || []}
                selectedElementIds={editor.selectedElementIds}
                zoom={canvas.zoom}
                panOffset={canvas.panOffset}
                onPanChange={canvas.setPanOffset}
                onWheel={canvas.handleWheel}
                onAddElement={editor.addElement}
                showRuler={showRuler}
                onElementSelect={editor.selectElement}
                onElementMove={(id, newPos) => {
                  // Constrain position to page bounds (margins) - pageSettings returns mm
                  const bounds = pageSettings.getPageBounds();
                  const mmToPx = (mm: number) => (mm * 96) / 25.4;
                  const minX = mmToPx(bounds.minX);
                  const maxX = mmToPx(bounds.maxX);
                  const minY = mmToPx(bounds.minY);
                  const maxY = mmToPx(bounds.maxY);

                  const el = editor.getElementById(id);
                  const elW = el?.size.width || 0;
                  const elH = el?.size.height || 0;

                  const clampedX = Math.max(minX, Math.min(newPos.x, Math.max(minX, maxX - elW)));
                  const clampedY = Math.max(minY, Math.min(newPos.y, Math.max(minY, maxY - elH)));

                  editor.moveElement(id, { x: clampedX, y: clampedY });
                }}
                onElementResize={(id, size) => {
                  // Constrain resize so element doesn't cross page margins
                  const bounds = pageSettings.getPageBounds();
                  const mmToPx = (mm: number) => (mm * 96) / 25.4;
                  const maxX = mmToPx(bounds.maxX);
                  const maxY = mmToPx(bounds.maxY);

                  const el = editor.getElementById(id);
                  const posX = el?.position.x || 0;
                  const posY = el?.position.y || 0;

                  // Width/height must keep element inside right/bottom margins
                  const maxAllowedW = Math.max(1, maxX - posX);
                  const maxAllowedH = Math.max(1, maxY - posY);

                  let newW = size.width;
                  let newH = size.height;

                  // Apply snapping if enabled
                  if (showGrid && snapToGrid) {
                    newW = Math.round(newW / gridSize) * gridSize;
                    newH = Math.round(newH / gridSize) * gridSize;
                  }

                  newW = Math.max(1, Math.min(newW, maxAllowedW));
                  newH = Math.max(1, Math.min(newH, maxAllowedH));

                  editor.resizeElement(id, { width: newW, height: newH });
                }}
                onElementEdit={editor.updateElementContent}
                showGrid={showGrid} // we manage grid overlay separately
                gridSize={gridSize}
                snapToGrid={snapToGrid ? snap : undefined}
                pageSettings={pageSettings}
                backgroundImage={pageSettings.backgroundImage}
                pageRegions={{ header: currentPageMeta?.header, footer: currentPageMeta?.footer, pageNumberInfo: { current: currentPageIndex + 1, total: totalPages } }}
                onUpdatePageRegions={editor.updatePageRegions}
                onRegionSelect={setSelectedRegion}
              />
            </div>
          </div>

          {/* Sidebar direita - Painel de propriedades (15% da largura) */}
          {showPropertiesPanel && (
            <div className={`bg-gray-50 border-l border-gray-200 overflow-y-auto editor-sidebar-right ${
              isMobile ? 'mobile-visible' : ''
            }`}>
              <PropertiesPanel
                selectedElements={editor.getSelectedElements()}
                onUpdateStyles={editor.updateElementStyles}
                onUpdateContent={editor.updateElementContent}
                onUpdateElements={editor.updateElements}
                onGroupElements={editor.groupSelectedElements}
                onUngroupElements={editor.ungroupSelectedElements}
                onBringToFront={editor.bringToFront}
                onSendToBack={editor.sendToBack}
                canGroup={editor.canGroupSelection()}
                canUngroup={editor.canUngroupSelection()}
                isVisible={showPropertiesPanel}
                onToggleVisibility={() => setShowPropertiesPanel(false)}
                region={selectedRegion ? {
                  type: selectedRegion,
                  data: currentPageMeta?.[selectedRegion] || {},
                  onUpdate: (updates: any) => {
                    // Update the region (header/footer) properties
                    const currentRegion = currentPageMeta?.[selectedRegion];
                    const updatedRegion = { ...(currentRegion || {}), ...updates };
                    
                    if (selectedRegion === 'header') {
                      editor.updatePageRegions(updatedRegion, currentPageMeta?.footer || null);
                    } else {
                      editor.updatePageRegions(currentPageMeta?.header || null, updatedRegion);
                    }
                  }
                } : undefined}
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
            <span className="hidden md:inline">Página: {currentPageMeta?.pageSettings?.size || editor.template.pages?.[0]?.pageSettings?.size}</span>
            <span className="hidden lg:inline">Orientação: { (currentPageMeta?.pageSettings?.orientation || editor.template.pages?.[0]?.pageSettings?.orientation) === 'portrait' ? 'Retrato' : 'Paisagem' }</span>
          </div>
        </div>
      </div>

      {/* Modais de gerenciamento de templates */}
      <SaveTemplateModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        template={editor.template}
        onSave={handleSaveComplete}
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
            pageSettings.updateBackgroundImage({ url: img.src, repeat: 'no-repeat', opacity: 1, position: 'center' });
            editor.updateBackgroundImage && editor.updateBackgroundImage({ url: img.src, repeat: 'no-repeat', opacity: 1, position: 'center' });
            setShowGalleryModal(false);
            setGalleryTarget('element');
            return;
          }

          // Insert image element and set its content
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

      <ValidationResultModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        result={validationResults}
      />

      <ValidationSelectorModal
        isOpen={showValidationSelector}
        onClose={() => setShowValidationSelector(false)}
        onSelect={handleValidationSelect}
        templateId={templateId}
        onGeneratePDF={handleGeneratePDF}
      />

      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={() => setShowPDFPreview(false)}
        templateId={templateId}
        validationId={selectedValidationId || ''}
        onGeneratePDF={handleGeneratePDF}
      />


      {/* Sistema de notificações de erro */}
      <ErrorNotification
        errors={errors}
        onDismiss={dismissError}
        getErrorTitle={getErrorTitle}
      />
    </div>
  );
};

export default EditorLayoutProfissional;
export { EditorLayoutProfissional };