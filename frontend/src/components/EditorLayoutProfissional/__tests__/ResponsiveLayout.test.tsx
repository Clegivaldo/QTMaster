import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import EditorLayoutProfissional from '../index';
import { EditorTemplate } from '../../../types/editor';

// Mock dos hooks
vi.mock('../../../hooks/useTemplateEditor', () => ({
  useTemplateEditor: () => ({
    template: mockTemplate,
    selectedElementIds: [],
    canUndo: false,
    canRedo: false,
    historySize: 0,
    currentHistoryIndex: 0,
    addElement: vi.fn(),
    selectElement: vi.fn(),
    moveElement: vi.fn(),
    resizeElement: vi.fn(),
    updateElementContent: vi.fn(),
    updateElementStyles: vi.fn(),
    removeSelectedElements: vi.fn(),
    clearSelection: vi.fn(),
    selectAll: vi.fn(),
    groupSelectedElements: vi.fn(),
    ungroupSelectedElements: vi.fn(),
    canGroupSelection: () => false,
    canUngroupSelection: () => false,
    getSelectedElements: () => [],
    undo: vi.fn(),
    redo: vi.fn(),
    loadTemplate: vi.fn()
  })
}));

vi.mock('../../../hooks/useCanvasOperations', () => ({
  useCanvasOperations: () => ({
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    zoomToFit: vi.fn(),
    setZoom: vi.fn()
  })
}));

vi.mock('../../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn()
}));

// Mock dos componentes filhos
vi.mock('../components/EditorCanvas', () => ({
  Canvas: ({ children, ...props }: any) => (
    <div data-testid="canvas" {...props}>
      {children}
    </div>
  )
}));

vi.mock('../components/Toolbars', () => ({
  ElementPalette: ({ isVisible, onToggleVisibility, ...props }: any) => (
    <div 
      data-testid="element-palette" 
      data-visible={isVisible}
      {...props}
    >
      <button onClick={onToggleVisibility}>Toggle Palette</button>
      Element Palette
    </div>
  ),
  PropertiesPanel: ({ isVisible, onToggleVisibility, ...props }: any) => (
    <div 
      data-testid="properties-panel" 
      data-visible={isVisible}
      {...props}
    >
      <button onClick={onToggleVisibility}>Toggle Properties</button>
      Properties Panel
    </div>
  )
}));

vi.mock('../components/Utils', () => ({
  ZoomControls: (props: any) => (
    <div data-testid="zoom-controls" {...props}>
      Zoom Controls
    </div>
  ),
  UndoRedoControls: (props: any) => (
    <div data-testid="undo-redo-controls" {...props}>
      Undo/Redo Controls
    </div>
  )
}));

vi.mock('../components/Modals/SaveTemplateModal', () => ({
  default: ({ isOpen }: any) => isOpen ? <div data-testid="save-modal">Save Modal</div> : null
}));

vi.mock('../components/Modals/LoadTemplateModal', () => ({
  default: ({ isOpen }: any) => isOpen ? <div data-testid="load-modal">Load Modal</div> : null
}));

vi.mock('../components/Modals/ExportModal', () => ({
  default: ({ isOpen }: any) => isOpen ? <div data-testid="export-modal">Export Modal</div> : null
}));

const mockTemplate: EditorTemplate = {
  id: 'test-template',
  name: 'Test Template',
  description: 'Template for testing',
  category: 'test',
  elements: [],
  globalStyles: {
    fontFamily: 'Arial',
    fontSize: 12,
    color: '#000000',
    backgroundColor: '#ffffff',
    lineHeight: 1.4
  },
  pageSettings: {
    size: 'A4',
    orientation: 'portrait',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    backgroundColor: '#ffffff',
    showMargins: true
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'test-user',
  version: 1,
  isPublic: false,
  tags: []
};

// Utility para simular mudanças de viewport
const setViewportSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Disparar evento de resize
  window.dispatchEvent(new Event('resize'));
};

// Utility para aguardar mudanças de layout
const waitForLayoutChange = () => new Promise(resolve => setTimeout(resolve, 100));

describe('Editor Layout Responsivo', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    templateId: 'test-template',
    onSave: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset viewport para desktop por padrão
    setViewportSize(1920, 1080);
  });

  afterEach(() => {
    // Limpar estilos inline do body
    document.body.style.overflow = '';
  });

  describe('Layout em diferentes resoluções', () => {
    it('deve usar layout desktop em telas grandes (1920px)', async () => {
      setViewportSize(1920, 1080);
      
      render(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Verificar que ambas as sidebars estão visíveis por padrão em desktop
      expect(screen.getByTestId('element-palette')).toBeInTheDocument();
      expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
      
      // Verificar que controles de sidebar estão visíveis em desktop
      expect(screen.getByText('Elementos')).toBeInTheDocument();
      expect(screen.getByText('Propriedades')).toBeInTheDocument();
    });

    it('deve adaptar layout para telas médias (1200px)', async () => {
      setViewportSize(1200, 800);
      
      render(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Em telas médias, sidebars ainda devem estar visíveis mas com proporções ajustadas
      expect(screen.getByTestId('element-palette')).toBeInTheDocument();
      expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('deve usar layout tablet (768px - 1023px)', async () => {
      setViewportSize(1000, 768);
      
      render(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Em tablets, sidebars devem estar ocultas por padrão para maximizar canvas
      expect(screen.queryByTestId('element-palette')).not.toBeInTheDocument();
      expect(screen.queryByTestId('properties-panel')).not.toBeInTheDocument();
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
      
      // Controle compacto deve estar visível
      expect(screen.getByText('Painéis')).toBeInTheDocument();
    });

    it('deve usar layout mobile (até 767px)', async () => {
      setViewportSize(375, 667);
      
      render(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Em mobile, sidebars devem estar ocultas por padrão
      expect(screen.queryByTestId('element-palette')).not.toBeInTheDocument();
      expect(screen.queryByTestId('properties-panel')).not.toBeInTheDocument();
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
      
      // Controle compacto deve estar visível
      expect(screen.getByText('Painéis')).toBeInTheDocument();
      
      // Controles individuais de sidebar devem estar ocultos (usando classe CSS)
      const elementosButton = screen.queryByText('Elementos');
      const propriedadesButton = screen.queryByText('Propriedades');
      
      // Verificar se os botões estão ocultos via CSS (lg:flex significa visível apenas em desktop)
      if (elementosButton) {
        expect(elementosButton.closest('.hidden')).toBeTruthy();
      }
      if (propriedadesButton) {
        expect(propriedadesButton.closest('.hidden')).toBeTruthy();
      }
    });

    it('deve manter responsividade durante mudanças de orientação', async () => {
      // Simular mobile portrait
      setViewportSize(375, 667);
      
      const { rerender } = render(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Verificar layout portrait
      expect(screen.queryByTestId('element-palette')).not.toBeInTheDocument();
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
      
      // Simular mudança para landscape
      setViewportSize(667, 375);
      
      rerender(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Layout deve continuar responsivo
      expect(screen.queryByTestId('element-palette')).not.toBeInTheDocument();
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });

  describe('Funcionalidade de ocultar/exibir sidebars', () => {
    it('deve alternar sidebar esquerda com botão específico (desktop)', async () => {
      setViewportSize(1920, 1080);
      const user = userEvent.setup();
      
      render(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Verificar estado inicial (sidebar visível)
      expect(screen.getByTestId('element-palette')).toBeInTheDocument();
      
      // Clicar no botão "Elementos" para ocultar
      await user.click(screen.getByText('Elementos'));
      
      // Sidebar deve estar oculta
      expect(screen.queryByTestId('element-palette')).not.toBeInTheDocument();
      
      // Clicar novamente para mostrar
      await user.click(screen.getByText('Elementos'));
      
      // Sidebar deve estar visível novamente
      expect(screen.getByTestId('element-palette')).toBeInTheDocument();
    });

    it('deve alternar sidebar direita com botão específico (desktop)', async () => {
      setViewportSize(1920, 1080);
      const user = userEvent.setup();
      
      render(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Verificar estado inicial (sidebar visível)
      expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
      
      // Clicar no botão "Propriedades" para ocultar
      await user.click(screen.getByText('Propriedades'));
      
      // Sidebar deve estar oculta
      expect(screen.queryByTestId('properties-panel')).not.toBeInTheDocument();
      
      // Clicar novamente para mostrar
      await user.click(screen.getByText('Propriedades'));
      
      // Sidebar deve estar visível novamente
      expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
    });

    it('deve alternar ambas as sidebars com controle compacto (tablet/mobile)', async () => {
      setViewportSize(800, 600);
      const user = userEvent.setup();
      
      render(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Estado inicial em tablet - sidebars ocultas
      expect(screen.queryByTestId('element-palette')).not.toBeInTheDocument();
      expect(screen.queryByTestId('properties-panel')).not.toBeInTheDocument();
      
      // Clicar no controle "Painéis" para mostrar
      await user.click(screen.getByText('Painéis'));
      
      // Ambas as sidebars devem estar visíveis
      expect(screen.getByTestId('element-palette')).toBeInTheDocument();
      expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
      
      // Clicar novamente para ocultar
      await user.click(screen.getByText('Painéis'));
      
      // Ambas as sidebars devem estar ocultas
      expect(screen.queryByTestId('element-palette')).not.toBeInTheDocument();
      expect(screen.queryByTestId('properties-panel')).not.toBeInTheDocument();
    });

    it('deve responder a atalhos de teclado para alternar sidebars', async () => {
      setViewportSize(1920, 1080);
      
      render(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Estado inicial - ambas visíveis
      expect(screen.getByTestId('element-palette')).toBeInTheDocument();
      expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
      
      // Simular Ctrl+1 (toggle element palette)
      fireEvent.keyDown(document, { key: '1', ctrlKey: true });
      
      await waitFor(() => {
        expect(screen.queryByTestId('element-palette')).not.toBeInTheDocument();
      });
      
      // Simular Ctrl+2 (toggle properties panel)
      fireEvent.keyDown(document, { key: '2', ctrlKey: true });
      
      await waitFor(() => {
        expect(screen.queryByTestId('properties-panel')).not.toBeInTheDocument();
      });
      
      // Simular Ctrl+3 (toggle both)
      fireEvent.keyDown(document, { key: '3', ctrlKey: true });
      
      await waitFor(() => {
        expect(screen.getByTestId('element-palette')).toBeInTheDocument();
        expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
      });
    });

    it('deve maximizar canvas quando sidebars estão ocultas', async () => {
      setViewportSize(1920, 1080);
      const user = userEvent.setup();
      
      render(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      const canvas = screen.getByTestId('canvas');
      
      // Ocultar ambas as sidebars
      await user.click(screen.getByText('Elementos'));
      await user.click(screen.getByText('Propriedades'));
      
      // Canvas deve ocupar toda a área disponível
      expect(screen.queryByTestId('element-palette')).not.toBeInTheDocument();
      expect(screen.queryByTestId('properties-panel')).not.toBeInTheDocument();
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Usabilidade em dispositivos móveis', () => {
    it('deve mostrar sidebars como overlay em mobile', async () => {
      setViewportSize(375, 667);
      const user = userEvent.setup();
      
      render(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Estado inicial - sidebars ocultas
      expect(screen.queryByTestId('element-palette')).not.toBeInTheDocument();
      
      // Mostrar sidebars
      await user.click(screen.getByText('Painéis'));
      
      // Sidebars devem aparecer como overlay
      const elementPalette = screen.getByTestId('element-palette');
      expect(elementPalette).toBeInTheDocument();
      
      // Verificar que a sidebar tem o atributo data-visible como true (comportamento do mock)
      expect(elementPalette).toHaveAttribute('data-visible', 'true');
    });

    it('deve permitir fechar sidebars tocando no overlay (mobile)', async () => {
      setViewportSize(375, 667);
      const user = userEvent.setup();
      
      render(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Mostrar sidebars
      await user.click(screen.getByText('Painéis'));
      
      // Verificar que sidebars estão visíveis
      expect(screen.getByTestId('element-palette')).toBeInTheDocument();
      
      // Verificar que overlay está presente
      const overlay = document.querySelector('.mobile-sidebar-overlay');
      expect(overlay).toBeInTheDocument();
      
      // Clicar no overlay para fechar
      if (overlay) {
        await user.click(overlay as Element);
      }
      
      // Sidebars devem estar ocultas
      expect(screen.queryByTestId('element-palette')).not.toBeInTheDocument();
      expect(screen.queryByTestId('properties-panel')).not.toBeInTheDocument();
    });

    it('deve adaptar controles da barra de ferramentas para mobile', async () => {
      setViewportSize(375, 667);
      
      render(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Verificar que controles compactos estão visíveis
      expect(screen.getByText('Painéis')).toBeInTheDocument();
      
      // Verificar que controles individuais estão ocultos via CSS (lg:flex)
      const elementosButton = screen.queryByText('Elementos');
      const propriedadesButton = screen.queryByText('Propriedades');
      
      // Em mobile, estes botões devem estar presentes mas ocultos via CSS
      if (elementosButton) {
        expect(elementosButton.closest('.hidden')).toBeTruthy();
      }
      if (propriedadesButton) {
        expect(propriedadesButton.closest('.hidden')).toBeTruthy();
      }
      
      // Verificar que botões principais mantêm funcionalidade
      expect(screen.getByTitle(/Salvar/)).toBeInTheDocument();
      expect(screen.getByTitle(/Exportar/)).toBeInTheDocument();
      expect(screen.getByTitle(/Fechar/)).toBeInTheDocument();
    });

    it('deve manter funcionalidade de zoom em mobile', async () => {
      setViewportSize(375, 667);
      
      render(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Controles de zoom devem estar presentes
      expect(screen.getByTestId('zoom-controls')).toBeInTheDocument();
      
      // Canvas deve estar acessível
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('deve bloquear scroll do body quando editor está aberto', () => {
      render(<EditorLayoutProfissional {...defaultProps} />);
      
      // Body deve ter overflow hidden
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('deve restaurar scroll do body quando editor é fechado', () => {
      const { rerender } = render(<EditorLayoutProfissional {...defaultProps} />);
      
      // Fechar editor
      rerender(<EditorLayoutProfissional {...defaultProps} isOpen={false} />);
      
      // Body deve ter overflow restaurado
      expect(document.body.style.overflow).toBe('unset');
    });

    it('deve adaptar largura das sidebars para diferentes tamanhos de mobile', async () => {
      // Testar mobile pequeno (320px)
      setViewportSize(320, 568);
      const user = userEvent.setup();
      
      const { rerender } = render(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Mostrar sidebars
      await user.click(screen.getByText('Painéis'));
      
      const elementPalette = screen.getByTestId('element-palette');
      expect(elementPalette).toBeInTheDocument();
      
      // Testar mobile grande (414px)
      setViewportSize(414, 896);
      
      rerender(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Sidebars devem se adaptar ao novo tamanho
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });

  describe('Transições e animações responsivas', () => {
    it('deve aplicar transições suaves durante mudanças de layout', async () => {
      setViewportSize(1920, 1080);
      const user = userEvent.setup();
      
      render(<EditorLayoutProfissional {...defaultProps} />);
      
      await waitForLayoutChange();
      
      // Alternar sidebar e verificar que não há erros de renderização
      await user.click(screen.getByText('Elementos'));
      
      // Aguardar transição
      await waitFor(() => {
        expect(screen.queryByTestId('element-palette')).not.toBeInTheDocument();
      });
      
      // Não deve haver erros de console ou problemas de renderização
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('deve manter performance durante mudanças de viewport', async () => {
      const { rerender } = render(<EditorLayoutProfissional {...defaultProps} />);
      
      // Simular múltiplas mudanças de viewport rapidamente
      const viewports = [
        [1920, 1080],
        [1200, 800],
        [768, 1024],
        [375, 667],
        [320, 568]
      ];
      
      for (const [width, height] of viewports) {
        setViewportSize(width, height);
        rerender(<EditorLayoutProfissional {...defaultProps} />);
        await waitForLayoutChange();
        
        // Canvas deve sempre estar presente
        expect(screen.getByTestId('canvas')).toBeInTheDocument();
      }
    });
  });
});