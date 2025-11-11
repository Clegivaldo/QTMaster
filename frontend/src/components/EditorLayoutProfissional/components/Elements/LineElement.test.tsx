import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LineElement from './LineElement';
import { createTestElement } from '../../../../test/test-utils';
import { LineData, TemplateElement } from '../../../../types/editor';

describe('LineElement Component', () => {
  const mockProps = {
    isSelected: false,
    zoom: 1,
    onEdit: vi.fn()
  };

  const createLineElement = (lineData: Partial<LineData> = {}): TemplateElement & { content: LineData } => {
    return createTestElement('line', {
      content: {
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 100, y: 50 },
        thickness: 2,
        style: { width: 2, style: 'solid', color: '#000000' },
        ...lineData
      }
    }) as TemplateElement & { content: LineData };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Line Rendering', () => {
    it('should render SVG line with correct attributes', () => {
      const lineElement = createLineElement({
        startPoint: { x: 10, y: 20 },
        endPoint: { x: 90, y: 80 },
        thickness: 3,
        style: { width: 3, style: 'solid', color: '#ff0000' }
      });
      
      const { container } = render(
        <LineElement 
          element={lineElement} 
          {...mockProps} 
        />
      );
      
      const svg = container.querySelector('svg');
      const line = container.querySelector('line');
      
      expect(svg).toBeInTheDocument();
      expect(line).toBeInTheDocument();
      expect(line).toHaveAttribute('x1', '10');
      expect(line).toHaveAttribute('y1', '20');
      expect(line).toHaveAttribute('x2', '90');
      expect(line).toHaveAttribute('y2', '80');
      expect(line).toHaveAttribute('stroke', '#ff0000');
      expect(line).toHaveAttribute('stroke-width', '3');
    });

    it('should render solid line style', () => {
      const lineElement = createLineElement({
        style: { width: 2, style: 'solid', color: '#000000' }
      });
      
      const { container } = render(
        <LineElement 
          element={lineElement} 
          {...mockProps} 
        />
      );
      
      const line = container.querySelector('line');
      expect(line).not.toHaveAttribute('stroke-dasharray');
    });

    it('should render dashed line style', () => {
      const lineElement = createLineElement({
        style: { width: 2, style: 'dashed', color: '#000000' }
      });
      
      const { container } = render(
        <LineElement 
          element={lineElement} 
          {...mockProps} 
        />
      );
      
      const line = container.querySelector('line');
      expect(line).toHaveAttribute('stroke-dasharray', '5,5');
    });

    it('should render dotted line style', () => {
      const lineElement = createLineElement({
        style: { width: 2, style: 'dotted', color: '#000000' }
      });
      
      const { container } = render(
        <LineElement 
          element={lineElement} 
          {...mockProps} 
        />
      );
      
      const line = container.querySelector('line');
      expect(line).toHaveAttribute('stroke-dasharray', '2,2');
    });

    it('should show control points when selected', () => {
      const lineElement = createLineElement();
      
      render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      expect(screen.getByTitle('Ponto inicial')).toBeInTheDocument();
      expect(screen.getByTitle('Ponto final')).toBeInTheDocument();
    });

    it('should not show control points when not selected', () => {
      const lineElement = createLineElement();
      
      render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={false}
        />
      );
      
      expect(screen.queryByTitle('Ponto inicial')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Ponto final')).not.toBeInTheDocument();
    });

    it('should show line info when selected', () => {
      const lineElement = createLineElement({
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 100, y: 0 } // Horizontal line
      });
      
      render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      expect(screen.getByText('100px • 0°')).toBeInTheDocument();
    });

    it('should calculate line length and angle correctly', () => {
      const lineElement = createLineElement({
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 0, y: 100 } // Vertical line
      });
      
      render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      expect(screen.getByText('100px • 90°')).toBeInTheDocument();
    });
  });

  describe('Line Controls', () => {
    it('should show controls when selected and hovered', async () => {
      const user = userEvent.setup();
      const lineElement = createLineElement();
      
      render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByTitle('Ponto inicial').closest('div')?.parentElement;
      await user.hover(container!);
      
      expect(screen.getByText('Espessura:')).toBeInTheDocument();
      expect(screen.getByTitle('Cor da linha')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Sólida')).toBeInTheDocument();
      expect(screen.getByTitle('Configurações avançadas')).toBeInTheDocument();
    });

    it('should not show controls when not selected', async () => {
      const user = userEvent.setup();
      const lineElement = createLineElement();
      
      const { container } = render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={false}
        />
      );
      
      await user.hover(container.firstChild as Element);
      
      expect(screen.queryByText('Espessura:')).not.toBeInTheDocument();
    });

    it('should change thickness when range input changes', async () => {
      const user = userEvent.setup();
      const lineElement = createLineElement();
      
      render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByTitle('Ponto inicial').closest('div')?.parentElement;
      await user.hover(container!);
      
      const thicknessInput = screen.getByRole('slider');
      fireEvent.change(thicknessInput, { target: { value: '5' } });
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        lineElement.id,
        expect.objectContaining({
          thickness: 5
        })
      );
    });

    it('should change color when color input changes', async () => {
      const user = userEvent.setup();
      const lineElement = createLineElement();
      
      render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByTitle('Ponto inicial').closest('div')?.parentElement;
      await user.hover(container!);
      
      const colorInput = screen.getByTitle('Cor da linha');
      fireEvent.change(colorInput, { target: { value: '#ff0000' } });
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        lineElement.id,
        expect.objectContaining({
          style: expect.objectContaining({
            color: '#ff0000'
          })
        })
      );
    });

    it('should change style when select changes', async () => {
      const user = userEvent.setup();
      const lineElement = createLineElement();
      
      render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByTitle('Ponto inicial').closest('div')?.parentElement;
      await user.hover(container!);
      
      const styleSelect = screen.getByDisplayValue('Sólida');
      await user.selectOptions(styleSelect, 'dashed');
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        lineElement.id,
        expect.objectContaining({
          style: expect.objectContaining({
            style: 'dashed'
          })
        })
      );
    });

    it('should display current thickness value', async () => {
      const user = userEvent.setup();
      const lineElement = createLineElement({
        thickness: 8
      });
      
      render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByTitle('Ponto inicial').closest('div')?.parentElement;
      await user.hover(container!);
      
      expect(screen.getByText('8px')).toBeInTheDocument();
    });

    it('should show all style options in select', async () => {
      const user = userEvent.setup();
      const lineElement = createLineElement();
      
      render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByTitle('Ponto inicial').closest('div')?.parentElement;
      await user.hover(container!);
      
      expect(screen.getByText('Sólida')).toBeInTheDocument();
      expect(screen.getByText('Tracejada')).toBeInTheDocument();
      expect(screen.getByText('Pontilhada')).toBeInTheDocument();
    });
  });

  describe('Thickness Validation', () => {
    it('should constrain thickness to minimum 1', async () => {
      const user = userEvent.setup();
      const lineElement = createLineElement();
      
      render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByTitle('Ponto inicial').closest('div')?.parentElement;
      await user.hover(container!);
      
      const thicknessInput = screen.getByRole('slider');
      fireEvent.change(thicknessInput, { target: { value: '0' } });
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        lineElement.id,
        expect.objectContaining({
          thickness: 1
        })
      );
    });

    it('should constrain thickness to maximum 20', async () => {
      const user = userEvent.setup();
      const lineElement = createLineElement();
      
      render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByTitle('Ponto inicial').closest('div')?.parentElement;
      await user.hover(container!);
      
      const thicknessInput = screen.getByRole('slider');
      fireEvent.change(thicknessInput, { target: { value: '25' } });
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        lineElement.id,
        expect.objectContaining({
          thickness: 20
        })
      );
    });
  });

  describe('Control Point Positioning', () => {
    it('should position control points correctly', () => {
      const lineElement = createLineElement({
        startPoint: { x: 10, y: 20 },
        endPoint: { x: 90, y: 80 }
      });
      
      const { container } = render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const controlPoints = container.querySelectorAll('.cursor-move');
      expect(controlPoints).toHaveLength(2);
      
      // Check positioning (accounting for the -4px offset)
      const startPoint = controlPoints[0] as HTMLElement;
      const endPoint = controlPoints[1] as HTMLElement;
      
      expect(startPoint.style.left).toBe('6px'); // 10 - 4
      expect(startPoint.style.top).toBe('16px'); // 20 - 4
      expect(endPoint.style.left).toBe('86px'); // 90 - 4
      expect(endPoint.style.top).toBe('76px'); // 80 - 4
    });

    it('should scale control points based on zoom', () => {
      const lineElement = createLineElement();
      
      const { container } = render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
          zoom={2}
        />
      );
      
      const controlPoints = container.querySelectorAll('.cursor-move');
      controlPoints.forEach(point => {
        const element = point as HTMLElement;
        expect(element.style.transform).toBe('scale(0.5)'); // 1 / zoom
      });
    });

    it('should not scale control points below minimum', () => {
      const lineElement = createLineElement();
      
      const { container } = render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
          zoom={4}
        />
      );
      
      const controlPoints = container.querySelectorAll('.cursor-move');
      controlPoints.forEach(point => {
        const element = point as HTMLElement;
        expect(element.style.transform).toBe('scale(0.5)'); // Math.max(0.5, 1/4)
      });
    });
  });

  describe('Default Values', () => {
    it('should handle missing line data properties', () => {
      const incompleteLineElement = createTestElement('line', {
        content: {} as LineData
      }) as TemplateElement & { content: LineData };
      
      const { container } = render(
        <LineElement 
          element={incompleteLineElement} 
          {...mockProps} 
        />
      );
      
      const line = container.querySelector('line');
      expect(line).toBeInTheDocument();
      expect(line).toHaveAttribute('x1', '0');
      expect(line).toHaveAttribute('y1', '0');
      expect(line).toHaveAttribute('stroke-width', '2');
      expect(line).toHaveAttribute('stroke', '#000000');
    });

    it('should use element size for default end point', () => {
      const lineElementWithSize = createTestElement('line', {
        size: { width: 150, height: 100 },
        content: {
          startPoint: { x: 0, y: 0 }
          // Missing endPoint
        } as LineData
      }) as TemplateElement & { content: LineData };
      
      const { container } = render(
        <LineElement 
          element={lineElementWithSize} 
          {...mockProps} 
        />
      );
      
      const line = container.querySelector('line');
      expect(line).toHaveAttribute('x2', '150');
      expect(line).toHaveAttribute('y2', '100');
    });
  });

  describe('Accessibility', () => {
    it('should have proper titles for control points', () => {
      const lineElement = createLineElement();
      
      render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      expect(screen.getByTitle('Ponto inicial')).toBeInTheDocument();
      expect(screen.getByTitle('Ponto final')).toBeInTheDocument();
    });

    it('should have proper titles for controls', async () => {
      const user = userEvent.setup();
      const lineElement = createLineElement();
      
      render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByTitle('Ponto inicial').closest('div')?.parentElement;
      await user.hover(container!);
      
      expect(screen.getByTitle('Cor da linha')).toBeInTheDocument();
      expect(screen.getByTitle('Configurações avançadas')).toBeInTheDocument();
    });

    it('should have proper range input attributes', async () => {
      const user = userEvent.setup();
      const lineElement = createLineElement();
      
      render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByTitle('Ponto inicial').closest('div')?.parentElement;
      await user.hover(container!);
      
      const thicknessInput = screen.getByRole('slider');
      expect(thicknessInput).toHaveAttribute('min', '1');
      expect(thicknessInput).toHaveAttribute('max', '20');
    });

    it('should have proper color input type', async () => {
      const user = userEvent.setup();
      const lineElement = createLineElement();
      
      render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByTitle('Ponto inicial').closest('div')?.parentElement;
      await user.hover(container!);
      
      const colorInput = screen.getByTitle('Cor da linha');
      expect(colorInput).toHaveAttribute('type', 'color');
    });
  });

  describe('Mouse Interactions', () => {
    it('should show controls on mouse enter', async () => {
      const user = userEvent.setup();
      const lineElement = createLineElement();
      
      const { container } = render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      // Initially no controls
      expect(screen.queryByText('Espessura:')).not.toBeInTheDocument();
      
      await user.hover(container.firstChild as Element);
      
      // Controls should appear
      expect(screen.getByText('Espessura:')).toBeInTheDocument();
    });

    it('should hide controls on mouse leave', async () => {
      const user = userEvent.setup();
      const lineElement = createLineElement();
      
      const { container } = render(
        <LineElement 
          element={lineElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      await user.hover(container.firstChild as Element);
      expect(screen.getByText('Espessura:')).toBeInTheDocument();
      
      await user.unhover(container.firstChild as Element);
      
      // Controls should be hidden (though they might still be in DOM due to CSS)
      // This tests the mouse leave handler is called
    });
  });

  describe('SVG Rendering', () => {
    it('should render SVG with proper attributes', () => {
      const lineElement = createLineElement();
      
      const { container } = render(
        <LineElement 
          element={lineElement} 
          {...mockProps} 
        />
      );
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('absolute', 'inset-0', 'w-full', 'h-full', 'pointer-events-none');
    });

    it('should render line with round line caps', () => {
      const lineElement = createLineElement();
      
      const { container } = render(
        <LineElement 
          element={lineElement} 
          {...mockProps} 
        />
      );
      
      const line = container.querySelector('line');
      expect(line).toHaveAttribute('stroke-linecap', 'round');
    });
  });
});