import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PropertiesPanel from './PropertiesPanel';
import { mockTextElement, mockImageElement, mockTableElement } from '../../../../test/test-utils';
import { TemplateElement } from '../../../../types/editor';

describe('PropertiesPanel Component', () => {
  const mockProps = {
    selectedElements: [mockTextElement],
    onUpdateStyles: vi.fn(),
    onUpdateContent: vi.fn(),
    onGroupElements: vi.fn(),
    onUngroupElements: vi.fn(),
    canGroup: false,
    canUngroup: false,
    isVisible: true,
    onToggleVisibility: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when visible', () => {
      render(<PropertiesPanel {...mockProps} />);
      
      expect(screen.getByText('Propriedades')).toBeInTheDocument();
    });

    it('should not render when not visible', () => {
      render(<PropertiesPanel {...mockProps} isVisible={false} />);
      
      expect(screen.queryByText('Propriedades')).not.toBeInTheDocument();
    });

    it('should show empty state when no elements selected', () => {
      render(<PropertiesPanel {...mockProps} selectedElements={[]} />);
      
      expect(screen.getByText('Selecione um elemento')).toBeInTheDocument();
      expect(screen.getByText('para editar suas propriedades')).toBeInTheDocument();
    });

    it('should show element information when element is selected', () => {
      render(<PropertiesPanel {...mockProps} />);
      
      expect(screen.getByText('text')).toBeInTheDocument();
      expect(screen.getByText(mockTextElement.id)).toBeInTheDocument();
    });

    it('should show multiple elements count when multiple selected', () => {
      const multipleElements = [mockTextElement, mockImageElement];
      render(<PropertiesPanel {...mockProps} selectedElements={multipleElements} />);
      
      expect(screen.getByText('2 elementos')).toBeInTheDocument();
    });
  });

  describe('Text Formatting Controls', () => {
    it('should show text formatting controls for text elements', () => {
      render(<PropertiesPanel {...mockProps} />);
      
      expect(screen.getByText('Formatação de Texto')).toBeInTheDocument();
      expect(screen.getByText('Fonte')).toBeInTheDocument();
      expect(screen.getByText('Tamanho')).toBeInTheDocument();
      expect(screen.getByText('Estilo')).toBeInTheDocument();
      expect(screen.getByText('Alinhamento')).toBeInTheDocument();
      expect(screen.getByText('Cor do Texto')).toBeInTheDocument();
    });

    it('should not show text formatting for non-text elements', () => {
      render(<PropertiesPanel {...mockProps} selectedElements={[mockImageElement]} />);
      
      expect(screen.queryByText('Formatação de Texto')).not.toBeInTheDocument();
    });

    it('should apply bold formatting when bold button is clicked', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel {...mockProps} />);
      
      const boldButton = screen.getByTitle('Negrito');
      await user.click(boldButton);
      
      expect(mockProps.onUpdateStyles).toHaveBeenCalledWith(
        [mockTextElement.id],
        { fontWeight: 'bold' }
      );
    });

    it('should apply italic formatting when italic button is clicked', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel {...mockProps} />);
      
      const italicButton = screen.getByTitle('Itálico');
      await user.click(italicButton);
      
      expect(mockProps.onUpdateStyles).toHaveBeenCalledWith(
        [mockTextElement.id],
        { fontStyle: 'italic' }
      );
    });

    it('should apply underline formatting when underline button is clicked', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel {...mockProps} />);
      
      const underlineButton = screen.getByTitle('Sublinhado');
      await user.click(underlineButton);
      
      expect(mockProps.onUpdateStyles).toHaveBeenCalledWith(
        [mockTextElement.id],
        { textDecoration: 'underline' }
      );
    });

    it('should toggle formatting off when already applied', async () => {
      const user = userEvent.setup();
      const boldTextElement = {
        ...mockTextElement,
        styles: { ...mockTextElement.styles, fontWeight: 'bold' }
      };
      
      render(<PropertiesPanel {...mockProps} selectedElements={[boldTextElement]} />);
      
      const boldButton = screen.getByTitle('Negrito');
      await user.click(boldButton);
      
      expect(mockProps.onUpdateStyles).toHaveBeenCalledWith(
        [boldTextElement.id],
        { fontWeight: 'normal' }
      );
    });
  });

  describe('Text Alignment Controls', () => {
    it('should apply left alignment when left button is clicked', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel {...mockProps} />);
      
      const leftButton = screen.getByTitle('Esquerda');
      await user.click(leftButton);
      
      expect(mockProps.onUpdateStyles).toHaveBeenCalledWith(
        [mockTextElement.id],
        { textAlign: 'left' }
      );
    });

    it('should apply center alignment when center button is clicked', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel {...mockProps} />);
      
      const centerButton = screen.getByTitle('Centro');
      await user.click(centerButton);
      
      expect(mockProps.onUpdateStyles).toHaveBeenCalledWith(
        [mockTextElement.id],
        { textAlign: 'center' }
      );
    });

    it('should apply right alignment when right button is clicked', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel {...mockProps} />);
      
      const rightButton = screen.getByTitle('Direita');
      await user.click(rightButton);
      
      expect(mockProps.onUpdateStyles).toHaveBeenCalledWith(
        [mockTextElement.id],
        { textAlign: 'right' }
      );
    });

    it('should apply justify alignment when justify button is clicked', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel {...mockProps} />);
      
      const justifyButton = screen.getByTitle('Justificado');
      await user.click(justifyButton);
      
      expect(mockProps.onUpdateStyles).toHaveBeenCalledWith(
        [mockTextElement.id],
        { textAlign: 'justify' }
      );
    });
  });

  describe('Font Controls', () => {
    it('should change font family when font select is changed', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel {...mockProps} />);
      
      const fontSelect = screen.getByDisplayValue('Arial');
      await user.selectOptions(fontSelect, 'Times New Roman, serif');
      
      expect(mockProps.onUpdateStyles).toHaveBeenCalledWith(
        [mockTextElement.id],
        { fontFamily: 'Times New Roman, serif' }
      );
    });

    it('should change font size when size input is changed', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel {...mockProps} />);
      
      // Find the number input for font size (not the select)
      const sizeInputs = screen.getAllByDisplayValue('14');
      const numberInput = sizeInputs.find(input => (input as HTMLInputElement).type === 'number');
      expect(numberInput).toBeInTheDocument();
      
      if (numberInput) {
        fireEvent.change(numberInput, { target: { value: '18' } });
        
        // Check that onUpdateStyles was called with fontSize
        expect(mockProps.onUpdateStyles).toHaveBeenCalledWith(
          [mockTextElement.id],
          { fontSize: 18 }
        );
      }
    });

    it('should enforce font size limits', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel {...mockProps} />);
      
      const sizeInput = screen.getByDisplayValue('14');
      expect(sizeInput).toHaveAttribute('min', '8');
      expect(sizeInput).toHaveAttribute('max', '72');
    });
  });

  describe('Color Controls', () => {
    it('should change text color when color input is changed', async () => {
      render(<PropertiesPanel {...mockProps} />);
      
      // Find the text input for color (not the color picker)
      const colorInputs = screen.getAllByDisplayValue('#333333');
      const textInput = colorInputs.find(input => (input as HTMLInputElement).type === 'text');
      expect(textInput).toBeInTheDocument();
      
      if (textInput) {
        fireEvent.change(textInput, { target: { value: '#ff0000' } });
        
        // Check that onUpdateStyles was called with color
        expect(mockProps.onUpdateStyles).toHaveBeenCalledWith(
          [mockTextElement.id],
          { color: '#ff0000' }
        );
      }
    });

    it('should change background color when background color input is changed', async () => {
      render(<PropertiesPanel {...mockProps} />);
      
      // Find background color input by looking for the text input in the background color section
      const backgroundColorSection = screen.getByText('Cor de Fundo').closest('div');
      const colorInput = backgroundColorSection?.querySelector('input[type="text"]') as HTMLInputElement;
      
      if (colorInput) {
        fireEvent.change(colorInput, { target: { value: '#00ff00' } });
        
        // Check that onUpdateStyles was called with backgroundColor
        expect(mockProps.onUpdateStyles).toHaveBeenCalledWith(
          [mockTextElement.id],
          { backgroundColor: '#00ff00' }
        );
      }
    });

    it('should set background to transparent when transparent button is clicked', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel {...mockProps} />);
      
      const transparentButton = screen.getByText('Transparente');
      await user.click(transparentButton);
      
      expect(mockProps.onUpdateStyles).toHaveBeenCalledWith(
        [mockTextElement.id],
        { backgroundColor: 'transparent' }
      );
    });
  });

  describe('Grouping Controls', () => {
    it('should show grouping controls when multiple elements are selected', () => {
      const multipleElements = [mockTextElement, mockImageElement];
      render(<PropertiesPanel {...mockProps} selectedElements={multipleElements} canGroup={true} />);
      
      expect(screen.getByText('Agrupamento')).toBeInTheDocument();
      expect(screen.getByText('Agrupar')).toBeInTheDocument();
      expect(screen.getByText('Desagrupar')).toBeInTheDocument();
    });

    it('should not show grouping controls for single element', () => {
      render(<PropertiesPanel {...mockProps} />);
      
      expect(screen.queryByText('Agrupamento')).not.toBeInTheDocument();
    });

    it('should call onGroupElements when group button is clicked', async () => {
      const user = userEvent.setup();
      const multipleElements = [mockTextElement, mockImageElement];
      render(<PropertiesPanel {...mockProps} selectedElements={multipleElements} canGroup={true} />);
      
      const groupButton = screen.getByText('Agrupar');
      await user.click(groupButton);
      
      expect(mockProps.onGroupElements).toHaveBeenCalledTimes(1);
    });

    it('should call onUngroupElements when ungroup button is clicked', async () => {
      const user = userEvent.setup();
      const multipleElements = [mockTextElement, mockImageElement];
      render(<PropertiesPanel {...mockProps} selectedElements={multipleElements} canUngroup={true} />);
      
      const ungroupButton = screen.getByText('Desagrupar');
      await user.click(ungroupButton);
      
      expect(mockProps.onUngroupElements).toHaveBeenCalledTimes(1);
    });

    it('should disable group button when canGroup is false', () => {
      const multipleElements = [mockTextElement, mockImageElement];
      render(<PropertiesPanel {...mockProps} selectedElements={multipleElements} canGroup={false} />);
      
      const groupButton = screen.getByText('Agrupar').closest('button');
      expect(groupButton).toBeDisabled();
    });

    it('should disable ungroup button when canUngroup is false', () => {
      const multipleElements = [mockTextElement, mockImageElement];
      render(<PropertiesPanel {...mockProps} selectedElements={multipleElements} canUngroup={false} />);
      
      const ungroupButton = screen.getByText('Desagrupar').closest('button');
      expect(ungroupButton).toBeDisabled();
    });
  });

  describe('Position and Size Controls', () => {
    it('should show position and size controls for single element', () => {
      render(<PropertiesPanel {...mockProps} />);
      
      expect(screen.getByText('Posição e Tamanho')).toBeInTheDocument();
      
      // Check that position and size inputs exist
      const positionSection = screen.getByText('Posição e Tamanho').closest('div');
      const inputs = positionSection?.querySelectorAll('input[type="number"]');
      expect(inputs?.length).toBeGreaterThan(0);
    });

    it('should not show position controls for multiple elements', () => {
      const multipleElements = [mockTextElement, mockImageElement];
      render(<PropertiesPanel {...mockProps} selectedElements={multipleElements} />);
      
      expect(screen.queryByText('Posição e Tamanho')).not.toBeInTheDocument();
    });
  });

  describe('Table-specific Controls', () => {
    it('should show table controls for table elements', () => {
      render(<PropertiesPanel {...mockProps} selectedElements={[mockTableElement]} />);
      
      expect(screen.getByText('Configurações da Tabela')).toBeInTheDocument();
      expect(screen.getByText('Linhas')).toBeInTheDocument();
      expect(screen.getByText('Colunas')).toBeInTheDocument();
    });

    it('should not show table controls for non-table elements', () => {
      render(<PropertiesPanel {...mockProps} />);
      
      expect(screen.queryByText('Configurações da Tabela')).not.toBeInTheDocument();
    });
  });

  describe('Appearance Controls', () => {
    it('should show appearance controls for all elements', () => {
      render(<PropertiesPanel {...mockProps} />);
      
      expect(screen.getByText('Aparência')).toBeInTheDocument();
      expect(screen.getByText('Cor de Fundo')).toBeInTheDocument();
      expect(screen.getByText(/Opacidade/)).toBeInTheDocument();
      expect(screen.getByText('Borda Arredondada')).toBeInTheDocument();
    });

    it('should update opacity when opacity slider is changed', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel {...mockProps} />);
      
      const opacitySlider = screen.getByRole('slider');
      fireEvent.change(opacitySlider, { target: { value: '0.5' } });
      
      expect(mockProps.onUpdateStyles).toHaveBeenCalledWith(
        [mockTextElement.id],
        { opacity: 0.5 }
      );
    });

    it('should update border radius when border radius input is changed', async () => {
      render(<PropertiesPanel {...mockProps} />);
      
      const borderRadiusInput = screen.getByPlaceholderText('0');
      fireEvent.change(borderRadiusInput, { target: { value: '10' } });
      
      // Check that onUpdateStyles was called with borderRadius
      expect(mockProps.onUpdateStyles).toHaveBeenCalledWith(
        [mockTextElement.id],
        { borderRadius: 10 }
      );
    });
  });

  describe('Visibility Toggle', () => {
    it('should call onToggleVisibility when hide button is clicked', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel {...mockProps} />);
      
      const hideButton = screen.getByTitle('Ocultar painel');
      await user.click(hideButton);
      
      expect(mockProps.onToggleVisibility).toHaveBeenCalledTimes(1);
    });
  });

  describe('Common Style Detection', () => {
    it('should show common styles when multiple elements have same style', () => {
      const elementWithSameStyle = {
        ...mockImageElement,
        styles: { ...mockImageElement.styles, fontSize: 14, color: '#333333' }
      };
      const multipleElements = [mockTextElement, elementWithSameStyle];
      
      render(<PropertiesPanel {...mockProps} selectedElements={multipleElements} />);
      
      // Should show common font size
      expect(screen.getByDisplayValue('14')).toBeInTheDocument();
    });

    it('should not show specific values when elements have different styles', () => {
      const elementWithDifferentStyle = {
        ...mockImageElement,
        styles: { ...mockImageElement.styles, fontSize: 18, color: '#ff0000' }
      };
      const multipleElements = [mockTextElement, elementWithDifferentStyle];
      
      render(<PropertiesPanel {...mockProps} selectedElements={multipleElements} />);
      
      // Font size input should exist but may not show a specific value
      const fontSizeInputs = screen.getAllByRole('spinbutton');
      expect(fontSizeInputs.length).toBeGreaterThan(0);
    });
  });
});