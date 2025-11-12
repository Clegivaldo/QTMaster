import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { EditorLayoutProfissional } from '../index';
import { useTemplateEditor } from '../../../hooks/useTemplateEditor';

// Mock do hook useTemplateEditor
vi.mock('../../../hooks/useTemplateEditor', () => ({
  useTemplateEditor: vi.fn()
}));

// Mock do hook useErrorHandler para testar as notificações
vi.mock('../../../hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    errors: [
      {
        id: 'error-1',
        type: 'EXPORT_FAILED',
        message: 'Erro ao exportar template',
        recoverable: true,
        timestamp: new Date(),
        details: { templateId: 'test-123' }
      }
    ],
    dismissError: vi.fn(),
    getErrorTitle: vi.fn((type) => {
      switch (type) {
        case 'EXPORT_FAILED':
          return 'Erro na Exportação';
        case 'TEMPLATE_NOT_FOUND':
          return 'Template Não Encontrado';
        default:
          return 'Erro';
      }
    })
  }),
  EditorErrorType: {
    TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
    NETWORK_ERROR: 'NETWORK_ERROR',
    EXPORT_FAILED: 'EXPORT_FAILED',
    VALIDATION_ERROR: 'VALIDATION_ERROR'
  }
}));

describe('Error Notification System', () => {
  const mockTemplateEditor = {
    template: { id: 'test', name: 'Test', elements: [], pages: [] },
    selectedElementIds: [],
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    isDragging: false,
    isResizing: false,
    canUndo: false,
    canRedo: false,
    historySize: 0,
    currentHistoryIndex: 0,
    createNewTemplate: vi.fn(),
    loadTemplate: vi.fn(),
    saveTemplate: vi.fn(),
    exportTemplate: vi.fn(),
    addElement: vi.fn(),
    removeElement: vi.fn(),
    removeSelectedElements: vi.fn(),
    duplicateElement: vi.fn(),
    duplicateSelectedElements: vi.fn(),
    copySelection: vi.fn(),
    pasteClipboard: vi.fn(),
    selectElement: vi.fn(),
    selectElements: vi.fn(),
    selectAll: vi.fn(),
    clearSelection: vi.fn(),
    moveElement: vi.fn(),
    resizeElement: vi.fn(),
    updateElementContent: vi.fn(),
    updateElementStyles: vi.fn(),
    updateElements: vi.fn(),
    bringToFront: vi.fn(),
    sendToBack: vi.fn(),
    bringForward: vi.fn(),
    sendBackward: vi.fn(),
    setZoom: vi.fn(),
    setPanOffset: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    zoomToFit: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    clearHistory: vi.fn(),
    setDragging: vi.fn(),
    setResizing: vi.fn(),
    validateTemplate: vi.fn(),
    updatePageSettings: vi.fn(),
    updateBackgroundImage: vi.fn(),
    updatePageRegions: vi.fn(),
    addPage: vi.fn(),
    removeCurrentPage: vi.fn(),
    goToPage: vi.fn(),
    getCurrentPageElements: vi.fn(() => []),
    getCurrentPageId: vi.fn(() => 'page-1'),
    groupSelectedElements: vi.fn(),
    ungroupSelectedElements: vi.fn(),
    canGroupSelection: vi.fn(() => false),
    canUngroupSelection: vi.fn(() => false),
    getSelectedElements: vi.fn(() => []),
    getElementById: vi.fn(),
    canvas: {
      zoom: 1,
      panOffset: { x: 0, y: 0 },
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      zoomToFit: vi.fn()
    },
    operations: {
      addElement: vi.fn(),
      updateElement: vi.fn(),
      deleteElement: vi.fn(),
      selectElement: vi.fn(),
      duplicateElement: vi.fn(),
      groupElements: vi.fn(),
      ungroupElements: vi.fn()
    },
    history: {
      undo: vi.fn(),
      redo: vi.fn(),
      canUndo: false,
      canRedo: false
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useTemplateEditor as any).mockReturnValue(mockTemplateEditor);
  });

  it('should display error notifications', async () => {
    render(<EditorLayoutProfissional isOpen={true} onClose={vi.fn()} />);

    // Verificar se a notificação de erro é exibida
    await waitFor(() => {
      expect(screen.getByText('Erro na Exportação')).toBeInTheDocument();
      expect(screen.getByText('Erro ao exportar template')).toBeInTheDocument();
    });
  });

  it('should allow dismissing error notifications', async () => {
    const user = userEvent.setup();

    render(<EditorLayoutProfissional isOpen={true} onClose={vi.fn()} />);

    // Aguardar a notificação aparecer
    await waitFor(() => {
      expect(screen.getByText('Erro na Exportação')).toBeInTheDocument();
    });

    // Clicar no botão de fechar
    const closeButton = screen.getByTitle('Fechar notificação');
    await user.click(closeButton);

    // Verificar se a notificação desaparece (simulando dismiss)
    await waitFor(() => {
      expect(screen.queryByText('Erro na Exportação')).not.toBeInTheDocument();
    });
  });

  it('should show error details when available', async () => {
    render(<EditorLayoutProfissional isOpen={true} onClose={vi.fn()} />);

    // Verificar se o link de detalhes está presente
    await waitFor(() => {
      expect(screen.getByText('Detalhes técnicos')).toBeInTheDocument();
    });

    // Clicar para expandir detalhes
    const detailsButton = screen.getByText('Detalhes técnicos');
    fireEvent.click(detailsButton);

    // Verificar se os detalhes são mostrados
    await waitFor(() => {
      expect(screen.getByText(/templateId/)).toBeInTheDocument();
    });
  });
});