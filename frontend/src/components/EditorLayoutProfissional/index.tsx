import React, { useEffect, useCallback, useState } from 'react';
import { X, Save, Eye, Grid, Ruler, Download, FolderOpen } from 'lucide-react';
import { useTemplateEditor } from '../../hooks/useTemplateEditor';
import { useCanvasOperations } from '../../hooks/useCanvasOperations';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { EditorProps } from '../../types/editor';
import { KEYBOARD_SHORTCUTS } from '../../types/editor-constants';
import './EditorLayout.css';

// Componentes que serão implementados nas próximas tarefas
import { Canvas } from './components/EditorCanvas';
import { ElementPalette, PropertiesPanel } from './components/Toolbars';
import { ZoomControls, UndoRedoControls } from './components/Utils';

// Modais de gerenciamento de templates
import SaveTemplateModal from './components/Modals/SaveTemplateModal';
import LoadTemplateModal from './components/Modals/LoadTemplateModal';
import ExportModal from './components/Modals/ExportModal';

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

  // Estado para controlar visibilidade das sidebars
  const [showElementPalette, setShowElementPalette] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  
  // Estado para responsividade
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [forceShowSidebars, setForceShowSidebars] = useState(false);
  

  
  // Estados dos modais
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Handlers para ações principais
  const handleSave = useCallback(() => {
    setShowSaveModal(true);
  }, []);

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
    // TODO: Implementar preview
    console.log('Preview do template:', editor.template);
  }, [editor.template]);

  // Atalhos de teclado usando hook dedicado
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
    // TODO: Implementar copy/paste/cut
    onCopy: () => console.log('Copy - TODO'),
    onPaste: () => console.log('Paste - TODO'),
    onCut: () => console.log('Cut - TODO')
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
            break;
          case '2':
            e.preventDefault();
            // Toggle Properties Panel
            const newShowProperties = !showPropertiesPanel;
            setShowPropertiesPanel(newShowProperties);
            if (isTablet || isMobile) {
              setForceShowSidebars(newShowProperties || showElementPalette);
            }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex">
      <div className="bg-white w-full h-full flex flex-col">
        {/* Header - Barra de ferramentas principal */}
        <div className="bg-gray-900 text-white p-3 flex items-center justify-between border-b border-gray-700 min-h-[60px]">
          {/* Lado esquerdo - Título e nome do template */}
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <h1 className="text-sm md:text-lg font-semibold truncate">Editor de Layout</h1>
            <div className="text-xs md:text-sm text-gray-300 truncate hidden sm:block">
              {editor.template.name}
            </div>
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
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Mostrar/ocultar grade (em desenvolvimento)"
            >
              <Grid className="h-4 w-4" />
            </button>

            <button
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Mostrar/ocultar réguas (em desenvolvimento)"
            >
              <Ruler className="h-4 w-4" />
            </button>

            <div className="w-px h-6 bg-gray-600 mx-1 md:mx-2 hidden lg:block" />

            {/* Controles de sidebars */}
            <div className="hidden lg:flex items-center gap-1">
              <button
                onClick={() => {
                  const newShow = !showElementPalette;
                  setShowElementPalette(newShow);
                  if (isTablet || isMobile) {
                    setForceShowSidebars(newShow || showPropertiesPanel);
                  }
                }}
                className={`p-2 rounded transition-colors ${
                  showElementPalette 
                    ? 'text-white bg-gray-700' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
                title="Mostrar/ocultar paleta de elementos (Ctrl+1)"
              >
                <span className="text-xs font-medium">Elementos</span>
              </button>

              <button
                onClick={() => {
                  const newShow = !showPropertiesPanel;
                  setShowPropertiesPanel(newShow);
                  if (isTablet || isMobile) {
                    setForceShowSidebars(newShow || showElementPalette);
                  }
                }}
                className={`p-2 rounded transition-colors ${
                  showPropertiesPanel 
                    ? 'text-white bg-gray-700' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
                title="Mostrar/ocultar painel de propriedades (Ctrl+2)"
              >
                <span className="text-xs font-medium">Propriedades</span>
              </button>
            </div>

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
              className="bg-blue-600 hover:bg-blue-700 px-2 md:px-4 py-2 rounded flex items-center gap-1 md:gap-2 transition-colors"
              title={`Carregar Template (Ctrl+O)`}
            >
              <FolderOpen className="h-4 w-4" />
              <span className="hidden md:inline">Carregar</span>
            </button>

            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 px-2 md:px-4 py-2 rounded flex items-center gap-1 md:gap-2 transition-colors"
              title={`Salvar (${KEYBOARD_SHORTCUTS.SAVE})`}
            >
              <Save className="h-4 w-4" />
              <span className="hidden md:inline">Salvar</span>
            </button>

            <button
              onClick={handlePreview}
              className="bg-indigo-600 hover:bg-indigo-700 px-2 md:px-4 py-2 rounded flex items-center gap-1 md:gap-2 transition-colors hidden sm:flex"
              title="Visualizar template"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden lg:inline">Preview</span>
            </button>

            <button
              onClick={handleExport}
              className="bg-purple-600 hover:bg-purple-700 px-2 md:px-4 py-2 rounded flex items-center gap-1 md:gap-2 transition-colors"
              title="Exportar template"
            >
              <Download className="h-4 w-4" />
              <span className="hidden md:inline">Exportar</span>
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
          <div className="bg-gray-100 relative overflow-hidden editor-canvas-area">
            <Canvas
              elements={editor.template.elements}
              selectedElementIds={editor.selectedElementIds}
              zoom={canvas.zoom}
              panOffset={canvas.panOffset}
              onElementSelect={editor.selectElement}
              onElementMove={editor.moveElement}
              onElementResize={editor.resizeElement}
              onElementEdit={editor.updateElementContent}
            />
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
                onGroupElements={editor.groupSelectedElements}
                onUngroupElements={editor.ungroupSelectedElements}
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
            <span className="hidden md:inline">Página: {editor.template.pageSettings.size}</span>
            <span className="hidden lg:inline">Orientação: {editor.template.pageSettings.orientation}</span>
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
    </div>
  );
};

export default EditorLayoutProfissional;
export { EditorLayoutProfissional };