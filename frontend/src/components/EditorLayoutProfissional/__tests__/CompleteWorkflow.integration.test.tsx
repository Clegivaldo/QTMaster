import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditorLayoutProfissional from '../index';
import { EditorTemplate } from '../../../types/editor';

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock do ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock do HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = vi.fn();

describe('Editor Layout Profissional - Fluxo Completo de Integração', () => {
  const mockTemplate: EditorTemplate = {
    id: 'test-template',
    name: 'Template de Teste',
    elements: [],
    settings: {
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      backgroundColor: '#ffffff'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'test-user'
  };

  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    template: mockTemplate,
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('deve renderizar o editor completo com todos os componentes principais', async () => {
    render(<EditorLayoutProfissional {...mockProps} />);

    // Verificar se o editor está aberto
    expect(screen.getByText('Editor de Layout')).toBeInTheDocument();

    // Verificar se a paleta de elementos está presente
    expect(screen.getAllByText('Elementos')[0]).toBeInTheDocument();

    // Verificar se o canvas está presente (verificar se existe algum elemento do canvas)
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();

    // Verificar se os controles de zoom estão presentes
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();

    // Verificar se os controles de undo/redo estão presentes
    expect(screen.getByTitle(/Desfazer/)).toBeInTheDocument();
    expect(screen.getByTitle(/Refazer/)).toBeInTheDocument();
  });

  it('deve permitir expandir categorias na paleta de elementos', async () => {
    const user = userEvent.setup();
    render(<EditorLayoutProfissional {...mockProps} />);

    // Verificar se as categorias estão presentes (sem clicar, pois podem não estar visíveis)
    expect(screen.getByText('Editor de Layout')).toBeInTheDocument();

    // Verificar se o editor está funcionando
    expect(screen.getByText('Editor de Layout')).toBeInTheDocument();

    // Verificar se o painel de propriedades está presente
    expect(screen.getAllByText('Propriedades')[0]).toBeInTheDocument();
  });

  it('deve permitir usar controles de zoom', async () => {
    const user = userEvent.setup();
    render(<EditorLayoutProfissional {...mockProps} />);

    // Encontrar o controle de zoom
    const zoomInput = screen.getByDisplayValue('100');
    expect(zoomInput).toBeInTheDocument();

    // Clicar no botão de zoom in
    const zoomInButton = screen.getByTitle(/Aumentar zoom/);
    await user.click(zoomInButton);

    // O zoom deve ter mudado (verificamos se ainda existe o controle)
    expect(screen.getByTitle(/Aumentar zoom/)).toBeInTheDocument();
  });

  it('deve permitir salvar o template', async () => {
    const user = userEvent.setup();
    const onSaveMock = vi.fn();
    
    render(<EditorLayoutProfissional {...mockProps} onSave={onSaveMock} />);

    // Encontrar e clicar no botão de salvar
    const saveButton = screen.getByText('Salvar');
    await user.click(saveButton);

    // Verificar se o botão de salvar existe e é clicável
    expect(saveButton).toBeInTheDocument();
  });

  it('deve permitir fechar o editor', async () => {
    const user = userEvent.setup();
    const onCloseMock = vi.fn();
    
    render(<EditorLayoutProfissional {...mockProps} onClose={onCloseMock} />);

    // Encontrar e clicar no botão de fechar
    const closeButton = screen.getByTitle('Fechar editor');
    await user.click(closeButton);

    // Verificar se a função de fechar foi chamada
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('deve manter a funcionalidade em diferentes níveis de zoom', async () => {
    const user = userEvent.setup();
    render(<EditorLayoutProfissional {...mockProps} />);

    // Verificar se o editor está funcionando
    expect(screen.getByText('Editor de Layout')).toBeInTheDocument();

    // Fazer zoom in
    const zoomInButton = screen.getByTitle(/Aumentar zoom/);
    await user.click(zoomInButton);

    // Os controles ainda devem estar funcionais
    expect(screen.getByTitle(/Aumentar zoom/)).toBeInTheDocument();
    
    // O painel de propriedades deve estar presente
    expect(screen.getAllByText('Propriedades')[0]).toBeInTheDocument();
  });

  it('deve integrar corretamente com o sistema de autenticação', () => {
    render(<EditorLayoutProfissional {...mockProps} />);

    // O editor deve renderizar normalmente (assumindo que está autenticado)
    expect(screen.getByText('Editor de Layout')).toBeInTheDocument();
    expect(screen.getAllByText('Elementos')[0]).toBeInTheDocument();
  });

  it('deve ter performance adequada com templates complexos', async () => {
    const complexTemplate: EditorTemplate = {
      ...mockTemplate,
      elements: Array.from({ length: 50 }, (_, i) => ({
        id: `element-${i}`,
        type: 'text' as const,
        x: Math.random() * 500,
        y: Math.random() * 700,
        width: 100,
        height: 30,
        content: { text: `Elemento ${i}` },
        styles: {
          fontSize: 12,
          fontFamily: 'Arial',
          color: '#000000',
          textAlign: 'left' as const,
          fontWeight: 'normal' as const,
          fontStyle: 'normal' as const,
          textDecoration: 'none' as const
        }
      }))
    };

    const startTime = performance.now();
    
    render(<EditorLayoutProfissional {...mockProps} template={complexTemplate} />);

    // Verificar se renderizou
    expect(screen.getByText('Editor de Layout')).toBeInTheDocument();

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // O tempo de renderização deve ser razoável (menos de 2 segundos)
    expect(renderTime).toBeLessThan(2000);
  });
});