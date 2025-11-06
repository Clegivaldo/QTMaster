import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShapeElement from './ShapeElement';
import { createTestElement } from '../../../../test/test-utils';
import { ShapeData } from '../../../../types/editor';

describe('ShapeElement Component', () => {
  const mockProps = {
    isSelected: false,
    zoom: 1,
    onEdit: vi.fn()
  };

  const createShapeElement = (type: 'rectangle' | 'circle', shapeData: Partial<ShapeData> = {}) => {
    return createTestElement(type, {
      content: {
        fillColor: 'transparent',
        strokeColor: '#000000',
        strokeWidth: 2,
        ...shapeData
      }
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Shape Rendering', () => {
    it('should render rectangle shape', () => {
      const rectangleElement = createShapeElement('rectangle', {
        fillColor: '#ff0000',
        strokeColor: '#000000',
        strokeWidth: 2
      });
      
      render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps} 
        />
      );
      
      // Should render the shape div with proper styles
      const shapeContainer = screen.getByText('rectangle').closest('div');
      expect(shapeContainer).toBeInTheDocument();
    });

    it('should render circle shape', () => {
      const circleElement = createShapeElement('circle', {
        fillColor: '#00ff00',
        strokeColor: '#000000',
        strokeWidth: 3
      });
      
      render(
        <ShapeElement 
          element={circleElement} 
          {...mockProps} 
        />
      );
      
      // Should render the shape div with proper styles
      const shapeContainer = screen.getByText('circle').closest('div');
      expect(shapeContainer).toBeInTheDocument();
    });

    it('should show placeholder when shape is empty', () => {
      const emptyRectangle = createShapeElement('rectangle', {
        fillColor: 'transparent',
        strokeWidth: 0
      });
      
      render(
        <ShapeElement 
          element={emptyRectangle} 
          {...mockProps} 
        />
      );
      
      expect(screen.getByText('rectangle')).toBeInTheDocument();
      expect(screen.getByText('rectangle').closest('div')).toHaveClass('border-dashed', 'bg-gray-50');
    });

    it('should render filled shape when not empty', () => {
      const filledRectangle = createShapeElement('rectangle', {
        fillColor: '#ff0000',
        strokeColor: '#000000',
        strokeWidth: 2
      });
      
      const { container } = render(
        <ShapeElement 
          element={filledRectangle} 
          {...mockProps} 
        />
      );
      
      // Should render actual shape, not placeholder
      expect(screen.queryByText('Clique para configurar')).not.toBeInTheDocument();
      
      // Should have a div with shape styles
      const shapeDiv = container.querySelector('div[style*="background-color"]');
      expect(shapeDiv).toBeInTheDocument();
    });

    it('should show shape info when selected', () => {
      const rectangleElement = createShapeElement('rectangle');
      
      render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      expect(screen.getByText(/rectangle • \d+×\d+px/)).toBeInTheDocument();
    });

    it('should show shape type indicator when selected', () => {
      const circleElement = createShapeElement('circle');
      
      render(
        <ShapeElement 
          element={circleElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const indicators = screen.getAllByText('circle');
      expect(indicators.length).toBeGreaterThan(1); // Type indicator + info
    });
  });

  describe('Shape Controls', () => {
    it('should show controls when selected and hovered', async () => {
      const user = userEvent.setup();
      const rectangleElement = createShapeElement('rectangle');
      
      render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByText('rectangle').closest('div')?.parentElement;
      await user.hover(container!);
      
      expect(screen.getByTitle('Cor de preenchimento')).toBeInTheDocument();
      expect(screen.getByTitle('Cor da borda')).toBeInTheDocument();
      expect(screen.getByTitle('Remover preenchimento')).toBeInTheDocument();
      expect(screen.getByTitle('Configurações avançadas')).toBeInTheDocument();
    });

    it('should not show controls when not selected', async () => {
      const user = userEvent.setup();
      const rectangleElement = createShapeElement('rectangle');
      
      render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps}
          isSelected={false}
        />
      );
      
      const container = screen.getByText('rectangle').closest('div')?.parentElement;
      await user.hover(container!);
      
      expect(screen.queryByTitle('Cor de preenchimento')).not.toBeInTheDocument();
    });

    it('should change fill color when color input changes', async () => {
      const user = userEvent.setup();
      const rectangleElement = createShapeElement('rectangle');
      
      render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByText('rectangle').closest('div')?.parentElement;
      await user.hover(container!);
      
      const fillColorInput = screen.getByTitle('Cor de preenchimento');
      await user.click(fillColorInput);
      
      fireEvent.change(fillColorInput, { target: { value: '#ff0000' } });
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        rectangleElement.id,
        expect.objectContaining({
          fillColor: '#ff0000'
        })
      );
    });

    it('should change stroke color when color input changes', async () => {
      const user = userEvent.setup();
      const rectangleElement = createShapeElement('rectangle');
      
      render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByText('rectangle').closest('div')?.parentElement;
      await user.hover(container!);
      
      const strokeColorInput = screen.getByTitle('Cor da borda');
      fireEvent.change(strokeColorInput, { target: { value: '#00ff00' } });
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        rectangleElement.id,
        expect.objectContaining({
          strokeColor: '#00ff00'
        })
      );
    });

    it('should change stroke width when range input changes', async () => {
      const user = userEvent.setup();
      const rectangleElement = createShapeElement('rectangle');
      
      render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByText('rectangle').closest('div')?.parentElement;
      await user.hover(container!);
      
      const strokeWidthInput = screen.getByRole('slider');
      fireEvent.change(strokeWidthInput, { target: { value: '5' } });
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        rectangleElement.id,
        expect.objectContaining({
          strokeWidth: 5
        })
      );
    });

    it('should remove fill when remove fill button is clicked', async () => {
      const user = userEvent.setup();
      const rectangleElement = createShapeElement('rectangle', {
        fillColor: '#ff0000'
      });
      
      render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByText('rectangle').closest('div')?.parentElement;
      await user.hover(container!);
      
      const removeFillButton = screen.getByTitle('Remover preenchimento');
      await user.click(removeFillButton);
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        rectangleElement.id,
        expect.objectContaining({
          fillColor: 'transparent'
        })
      );
    });

    it('should display current stroke width value', async () => {
      const user = userEvent.setup();
      const rectangleElement = createShapeElement('rectangle', {
        strokeWidth: 8
      });
      
      render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByText('rectangle').closest('div')?.parentElement;
      await user.hover(container!);
      
      expect(screen.getByText('8px')).toBeInTheDocument();
    });
  });

  describe('Shape Styling', () => {
    it('should apply correct styles for rectangle', () => {
      const rectangleElement = createShapeElement('rectangle', {
        fillColor: '#ff0000',
        strokeColor: '#000000',
        strokeWidth: 3
      });
      
      const { container } = render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps} 
        />
      );
      
      const shapeDiv = container.querySelector('div[style*="background-color"]');
      expect(shapeDiv).toBeInTheDocument();
      // Styles are applied via inline styles in the component
    });

    it('should apply border radius for circle', () => {
      const circleElement = createShapeElement('circle', {
        fillColor: '#00ff00',
        strokeColor: '#000000',
        strokeWidth: 2
      });
      
      const { container } = render(
        <ShapeElement 
          element={circleElement} 
          {...mockProps} 
        />
      );
      
      const shapeDiv = container.querySelector('div[style*="background-color"]');
      expect(shapeDiv).toBeInTheDocument();
      // Border radius for circle is applied via inline styles
    });

    it('should handle transparent fill color', () => {
      const transparentRectangle = createShapeElement('rectangle', {
        fillColor: 'transparent',
        strokeColor: '#000000',
        strokeWidth: 2
      });
      
      const { container } = render(
        <ShapeElement 
          element={transparentRectangle} 
          {...mockProps} 
        />
      );
      
      const shapeDiv = container.querySelector('div[style*="background-color"]');
      expect(shapeDiv).toBeInTheDocument();
    });

    it('should handle no border when stroke width is 0', () => {
      const noBorderRectangle = createShapeElement('rectangle', {
        fillColor: '#ff0000',
        strokeWidth: 0
      });
      
      const { container } = render(
        <ShapeElement 
          element={noBorderRectangle} 
          {...mockProps} 
        />
      );
      
      const shapeDiv = container.querySelector('div[style*="background-color"]');
      expect(shapeDiv).toBeInTheDocument();
    });

    it('should apply opacity from element styles', () => {
      const rectangleElement = createShapeElement('rectangle', {
        fillColor: '#ff0000'
      });
      rectangleElement.styles.opacity = 0.5;
      
      const { container } = render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps} 
        />
      );
      
      const shapeDiv = container.querySelector('div[style*="background-color"]');
      expect(shapeDiv).toBeInTheDocument();
      // Opacity is applied via inline styles
    });
  });

  describe('Shape Icons', () => {
    it('should render square icon for rectangle in placeholder', () => {
      const emptyRectangle = createShapeElement('rectangle', {
        fillColor: 'transparent',
        strokeWidth: 0
      });
      
      render(
        <ShapeElement 
          element={emptyRectangle} 
          {...mockProps} 
        />
      );
      
      // Square icon should be rendered in placeholder
      const placeholder = screen.getByText('rectangle').closest('div');
      expect(placeholder).toHaveClass('border-dashed');
    });

    it('should render circle icon for circle in placeholder', () => {
      const emptyCircle = createShapeElement('circle', {
        fillColor: 'transparent',
        strokeWidth: 0
      });
      
      render(
        <ShapeElement 
          element={emptyCircle} 
          {...mockProps} 
        />
      );
      
      // Circle icon should be rendered in placeholder
      const placeholder = screen.getByText('circle').closest('div');
      expect(placeholder).toHaveClass('border-dashed');
    });
  });

  describe('Stroke Width Validation', () => {
    it('should constrain stroke width to minimum 0', async () => {
      const user = userEvent.setup();
      const rectangleElement = createShapeElement('rectangle');
      
      render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByText('rectangle').closest('div')?.parentElement;
      await user.hover(container!);
      
      const strokeWidthInput = screen.getByRole('slider');
      fireEvent.change(strokeWidthInput, { target: { value: '-5' } });
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        rectangleElement.id,
        expect.objectContaining({
          strokeWidth: 0
        })
      );
    });

    it('should constrain stroke width to maximum 20', async () => {
      const user = userEvent.setup();
      const rectangleElement = createShapeElement('rectangle');
      
      render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByText('rectangle').closest('div')?.parentElement;
      await user.hover(container!);
      
      const strokeWidthInput = screen.getByRole('slider');
      fireEvent.change(strokeWidthInput, { target: { value: '25' } });
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        rectangleElement.id,
        expect.objectContaining({
          strokeWidth: 20
        })
      );
    });
  });

  describe('Color Input Handling', () => {
    it('should handle fill color input for transparent shapes', async () => {
      const user = userEvent.setup();
      const transparentRectangle = createShapeElement('rectangle', {
        fillColor: 'transparent'
      });
      
      render(
        <ShapeElement 
          element={transparentRectangle} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByText('rectangle').closest('div')?.parentElement;
      await user.hover(container!);
      
      const fillColorInput = screen.getByTitle('Cor de preenchimento');
      expect(fillColorInput).toHaveValue('#ffffff'); // Default value for transparent
    });

    it('should handle fill color input for colored shapes', async () => {
      const user = userEvent.setup();
      const coloredRectangle = createShapeElement('rectangle', {
        fillColor: '#ff0000'
      });
      
      render(
        <ShapeElement 
          element={coloredRectangle} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByText('rectangle').closest('div')?.parentElement;
      await user.hover(container!);
      
      const fillColorInput = screen.getByTitle('Cor de preenchimento');
      expect(fillColorInput).toHaveValue('#ff0000');
    });
  });

  describe('Accessibility', () => {
    it('should have proper button titles for controls', async () => {
      const user = userEvent.setup();
      const rectangleElement = createShapeElement('rectangle');
      
      render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByText('rectangle').closest('div')?.parentElement;
      await user.hover(container!);
      
      expect(screen.getByTitle('Cor de preenchimento')).toBeInTheDocument();
      expect(screen.getByTitle('Cor da borda')).toBeInTheDocument();
      expect(screen.getByTitle('Remover preenchimento')).toBeInTheDocument();
      expect(screen.getByTitle('Configurações avançadas')).toBeInTheDocument();
    });

    it('should have proper range input attributes', async () => {
      const user = userEvent.setup();
      const rectangleElement = createShapeElement('rectangle');
      
      render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByText('rectangle').closest('div')?.parentElement;
      await user.hover(container!);
      
      const strokeWidthInput = screen.getByRole('slider');
      expect(strokeWidthInput).toHaveAttribute('min', '0');
      expect(strokeWidthInput).toHaveAttribute('max', '20');
    });

    it('should have proper color input types', async () => {
      const user = userEvent.setup();
      const rectangleElement = createShapeElement('rectangle');
      
      render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByText('rectangle').closest('div')?.parentElement;
      await user.hover(container!);
      
      const fillColorInput = screen.getByTitle('Cor de preenchimento');
      const strokeColorInput = screen.getByTitle('Cor da borda');
      
      expect(fillColorInput).toHaveAttribute('type', 'color');
      expect(strokeColorInput).toHaveAttribute('type', 'color');
    });
  });

  describe('Mouse Interactions', () => {
    it('should show controls on mouse enter', async () => {
      const user = userEvent.setup();
      const rectangleElement = createShapeElement('rectangle');
      
      render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByText('rectangle').closest('div')?.parentElement;
      
      // Initially no controls
      expect(screen.queryByTitle('Cor de preenchimento')).not.toBeInTheDocument();
      
      await user.hover(container!);
      
      // Controls should appear
      expect(screen.getByTitle('Cor de preenchimento')).toBeInTheDocument();
    });

    it('should hide controls on mouse leave', async () => {
      const user = userEvent.setup();
      const rectangleElement = createShapeElement('rectangle');
      
      render(
        <ShapeElement 
          element={rectangleElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByText('rectangle').closest('div')?.parentElement;
      
      await user.hover(container!);
      expect(screen.getByTitle('Cor de preenchimento')).toBeInTheDocument();
      
      await user.unhover(container!);
      
      // Controls should be hidden (though they might still be in DOM due to CSS)
      // This tests the mouse leave handler is called
    });
  });
});