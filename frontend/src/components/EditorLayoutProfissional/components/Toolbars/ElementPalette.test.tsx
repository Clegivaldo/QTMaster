import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ElementPalette from './ElementPalette';
import { ElementType } from '../../../../types/editor';

describe('ElementPalette Component', () => {
  const mockProps = {
    onAddElement: vi.fn(),
    isVisible: true,
    onToggleVisibility: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when visible', () => {
      render(<ElementPalette {...mockProps} />);
      
      expect(screen.getByText('Elementos')).toBeInTheDocument();
      expect(screen.getByText('Clique ou arraste para adicionar')).toBeInTheDocument();
    });

    it('should not render when not visible', () => {
      render(<ElementPalette {...mockProps} isVisible={false} />);
      
      expect(screen.queryByText('Elementos')).not.toBeInTheDocument();
    });

    it('should render all element categories', () => {
      render(<ElementPalette {...mockProps} />);
      
      expect(screen.getAllByText('Texto').length).toBeGreaterThan(0);
      expect(screen.getByText('Mídia')).toBeInTheDocument();
      expect(screen.getByText('Layout')).toBeInTheDocument();
      expect(screen.getByText('Formulários')).toBeInTheDocument();
    });

    it('should render element items in expanded categories', () => {
      render(<ElementPalette {...mockProps} />);
      
      // Check for element descriptions which are unique
      expect(screen.getByText('Parágrafo de texto editável')).toBeInTheDocument();
      expect(screen.getByText('Cabeçalho ou título')).toBeInTheDocument();
      expect(screen.getByText('Inserir imagem ou logo')).toBeInTheDocument();
      expect(screen.getByText('Tabela de dados')).toBeInTheDocument();
    });

    it('should show hide button', () => {
      render(<ElementPalette {...mockProps} />);
      
      const hideButton = screen.getByTitle('Ocultar paleta');
      expect(hideButton).toBeInTheDocument();
    });
  });

  describe('Category Expansion', () => {
    it('should toggle category expansion when header is clicked', async () => {
      const user = userEvent.setup();
      render(<ElementPalette {...mockProps} />);
      
      // Forms category is collapsed by default
      expect(screen.queryByText('Área para assinatura')).not.toBeInTheDocument();
      
      // Click to expand Forms category
      const formsHeader = screen.getByText('Formulários');
      await user.click(formsHeader);
      
      // Should now show form elements
      expect(screen.getByText('Área para assinatura')).toBeInTheDocument();
      expect(screen.getByText('Código de barras')).toBeInTheDocument();
      expect(screen.getByText('Código QR')).toBeInTheDocument();
    });

    it('should show expanded categories by default', () => {
      render(<ElementPalette {...mockProps} />);
      
      // Text category should be expanded by default
      expect(screen.getByText('Parágrafo de texto editável')).toBeInTheDocument();
      expect(screen.getByText('Cabeçalho ou título')).toBeInTheDocument();
    });
  });

  describe('Element Addition via Click', () => {
    it('should add elements when clicked', async () => {
      const user = userEvent.setup();
      render(<ElementPalette {...mockProps} />);
      
      // Find draggable elements by their unique descriptions
      const textElement = screen.getByText('Parágrafo de texto editável').closest('[draggable="true"]');
      const imageElement = screen.getByText('Inserir imagem ou logo').closest('[draggable="true"]');
      const tableElement = screen.getByText('Tabela de dados').closest('[draggable="true"]');
      
      expect(textElement).toBeInTheDocument();
      expect(imageElement).toBeInTheDocument();
      expect(tableElement).toBeInTheDocument();
      
      // Test clicking on elements
      if (textElement) {
        await user.click(textElement);
        expect(mockProps.onAddElement).toHaveBeenCalledWith('text', { x: 100, y: 100 });
      }
      
      if (imageElement) {
        await user.click(imageElement);
        expect(mockProps.onAddElement).toHaveBeenCalledWith('image', { x: 100, y: 100 });
      }
      
      if (tableElement) {
        await user.click(tableElement);
        expect(mockProps.onAddElement).toHaveBeenCalledWith('table', { x: 100, y: 100 });
      }
    });
  });

  describe('Drag and Drop', () => {
    it('should have draggable elements', () => {
      render(<ElementPalette {...mockProps} />);
      
      // Find draggable elements
      const draggableElements = screen.getAllByRole('generic').filter(el => 
        el.getAttribute('draggable') === 'true'
      );
      
      expect(draggableElements.length).toBeGreaterThan(0);
    });
  });

  describe('Visibility Toggle', () => {
    it('should call onToggleVisibility when hide button is clicked', async () => {
      const user = userEvent.setup();
      render(<ElementPalette {...mockProps} />);
      
      const hideButton = screen.getByTitle('Ocultar paleta');
      await user.click(hideButton);
      
      expect(mockProps.onToggleVisibility).toHaveBeenCalledTimes(1);
    });
  });

  describe('Element Categories', () => {
    it('should show correct element counts in category headers', () => {
      render(<ElementPalette {...mockProps} />);
      
      // Should show multiple category counts
      const countElements = screen.getAllByText(/\(\d+\)/);
      expect(countElements.length).toBeGreaterThan(0);
      
      // Text category should show (2) elements
      expect(countElements.some(el => el.textContent === '(2)')).toBe(true);
    });

    it('should display element descriptions', () => {
      render(<ElementPalette {...mockProps} />);
      
      expect(screen.getByText('Parágrafo de texto editável')).toBeInTheDocument();
      expect(screen.getByText('Cabeçalho ou título')).toBeInTheDocument();
      expect(screen.getByText('Inserir imagem ou logo')).toBeInTheDocument();
      expect(screen.getByText('Tabela de dados')).toBeInTheDocument();
    });
  });

  describe('Footer Tips', () => {
    it('should display usage tips in footer', () => {
      render(<ElementPalette {...mockProps} />);
      
      expect(screen.getByText('Clique para adicionar no centro')).toBeInTheDocument();
      expect(screen.getByText('Arraste para posicionar')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper titles for elements', () => {
      render(<ElementPalette {...mockProps} />);
      
      // Find elements with titles
      const elementsWithTitles = screen.getAllByRole('generic').filter(el => 
        el.hasAttribute('title')
      );
      
      expect(elementsWithTitles.length).toBeGreaterThan(0);
    });

    it('should be keyboard accessible', () => {
      render(<ElementPalette {...mockProps} />);
      
      // Hide button should be focusable
      const hideButton = screen.getByTitle('Ocultar paleta');
      expect(hideButton).toBeInTheDocument();
      expect(hideButton.tagName).toBe('BUTTON');
    });
  });
});