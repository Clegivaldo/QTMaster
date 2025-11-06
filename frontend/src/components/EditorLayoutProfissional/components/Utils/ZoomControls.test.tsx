import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ZoomControls from './ZoomControls';
import { ZOOM_LEVELS, MIN_ZOOM, MAX_ZOOM } from '../../../../types/editor-constants';

describe('ZoomControls', () => {
  const mockProps = {
    zoom: 1,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onZoomToFit: vi.fn(),
    onZoomChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Different Zoom Levels', () => {
    it('should display current zoom percentage correctly', () => {
      render(<ZoomControls {...mockProps} zoom={0.5} />);
      
      const zoomInput = screen.getByDisplayValue('50');
      expect(zoomInput).toBeInTheDocument();
    });

    it('should display zoom percentage for different levels', () => {
      const { rerender } = render(<ZoomControls {...mockProps} zoom={0.25} />);
      expect(screen.getByDisplayValue('25')).toBeInTheDocument();

      rerender(<ZoomControls {...mockProps} zoom={1.5} />);
      expect(screen.getByDisplayValue('150')).toBeInTheDocument();

      rerender(<ZoomControls {...mockProps} zoom={4} />);
      expect(screen.getByDisplayValue('400')).toBeInTheDocument();
    });

    it('should allow typing in zoom input field', async () => {
      const user = userEvent.setup();
      render(<ZoomControls {...mockProps} />);
      
      const zoomInput = screen.getByDisplayValue('100');
      
      await user.type(zoomInput, '50');
      
      // Input should contain the typed value (may append to existing)
      expect(zoomInput.value).toContain('50');
    });

    it('should process zoom input on Enter key', async () => {
      const user = userEvent.setup();
      render(<ZoomControls {...mockProps} />);
      
      const zoomInput = screen.getByDisplayValue('100');
      
      // Clear mock calls first
      mockProps.onZoomChange.mockClear();
      
      await user.clear(zoomInput);
      await user.type(zoomInput, '200{enter}');
      
      // Should call onZoomChange when Enter is pressed
      expect(mockProps.onZoomChange).toHaveBeenCalled();
    });

    it('should handle zoom input validation on Enter', async () => {
      const user = userEvent.setup();
      render(<ZoomControls {...mockProps} />);
      
      const zoomInput = screen.getByDisplayValue('100');
      
      // Clear mock calls first
      mockProps.onZoomChange.mockClear();
      
      await user.clear(zoomInput);
      await user.type(zoomInput, '50{enter}');
      
      // Should call onZoomChange when Enter is pressed with valid input
      expect(mockProps.onZoomChange).toHaveBeenCalled();
    });

    it('should show zoom presets dropdown', async () => {
      const user = userEvent.setup();
      render(<ZoomControls {...mockProps} />);
      
      const dropdownButton = screen.getByTitle('Presets de zoom');
      await user.click(dropdownButton);
      
      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('200%')).toBeInTheDocument();
      expect(screen.getByText('400%')).toBeInTheDocument();
      expect(screen.getByText('Ajustar à tela')).toBeInTheDocument();
    });

    it('should call onZoomChange when preset is selected', async () => {
      const user = userEvent.setup();
      render(<ZoomControls {...mockProps} />);
      
      const dropdownButton = screen.getByTitle('Presets de zoom');
      await user.click(dropdownButton);
      
      const preset200 = screen.getByText('200%');
      await user.click(preset200);
      
      expect(mockProps.onZoomChange).toHaveBeenCalledWith(2);
    });

    it('should call onZoomToFit when fit preset is selected', async () => {
      const user = userEvent.setup();
      render(<ZoomControls {...mockProps} />);
      
      const dropdownButton = screen.getByTitle('Presets de zoom');
      await user.click(dropdownButton);
      
      const fitPreset = screen.getByText('Ajustar à tela');
      await user.click(fitPreset);
      
      expect(mockProps.onZoomToFit).toHaveBeenCalled();
    });
  });

  describe('Zoom Controls Buttons', () => {
    it('should call onZoomChange for zoom in button', async () => {
      const user = userEvent.setup();
      render(<ZoomControls {...mockProps} zoom={1} />);
      
      const zoomInButton = screen.getByTitle(/Aumentar zoom/);
      await user.click(zoomInButton);
      
      expect(mockProps.onZoomChange).toHaveBeenCalled();
    });

    it('should call onZoomChange for zoom out button', async () => {
      const user = userEvent.setup();
      render(<ZoomControls {...mockProps} zoom={1} />);
      
      const zoomOutButton = screen.getByTitle(/Diminuir zoom/);
      await user.click(zoomOutButton);
      
      expect(mockProps.onZoomChange).toHaveBeenCalled();
    });

    it('should call onZoomToFit for fit button', async () => {
      const user = userEvent.setup();
      render(<ZoomControls {...mockProps} />);
      
      const fitButton = screen.getByTitle(/Ajustar zoom à tela/);
      await user.click(fitButton);
      
      expect(mockProps.onZoomToFit).toHaveBeenCalled();
    });

    it('should disable zoom out button at minimum zoom', () => {
      render(<ZoomControls {...mockProps} zoom={MIN_ZOOM} />);
      
      const zoomOutButton = screen.getByTitle(/Diminuir zoom/);
      expect(zoomOutButton).toBeDisabled();
    });

    it('should disable zoom in button at maximum zoom', () => {
      render(<ZoomControls {...mockProps} zoom={MAX_ZOOM} />);
      
      const zoomInButton = screen.getByTitle(/Aumentar zoom/);
      expect(zoomInButton).toBeDisabled();
    });
  });

  describe('Zoom Level Navigation', () => {
    it('should navigate to next zoom level correctly', () => {
      const { rerender } = render(<ZoomControls {...mockProps} zoom={0.5} />);
      
      // At 50%, next level should be 75%
      const zoomInButton = screen.getByTitle(/Aumentar zoom/);
      expect(zoomInButton.title).toContain('75%');
      
      // At 100%, next level should be 125%
      rerender(<ZoomControls {...mockProps} zoom={1} />);
      expect(screen.getByTitle(/Aumentar zoom/).title).toContain('125%');
    });

    it('should navigate to previous zoom level correctly', () => {
      const { rerender } = render(<ZoomControls {...mockProps} zoom={1.5} />);
      
      // At 150%, previous level should be 125%
      const zoomOutButton = screen.getByTitle(/Diminuir zoom/);
      expect(zoomOutButton.title).toContain('125%');
      
      // At 75%, previous level should be 50%
      rerender(<ZoomControls {...mockProps} zoom={0.75} />);
      expect(screen.getByTitle(/Diminuir zoom/).title).toContain('50%');
    });
  });

  describe('Input Validation', () => {
    it('should accept text input in zoom field', async () => {
      const user = userEvent.setup();
      render(<ZoomControls {...mockProps} />);
      
      const zoomInput = screen.getByDisplayValue('100');
      
      await user.type(zoomInput, 'abc'); // Non-numeric input
      
      // Input should accept any text (validation happens on processing)
      expect(zoomInput.value).toContain('abc');
    });

    it('should handle escape key to cancel input', async () => {
      const user = userEvent.setup();
      render(<ZoomControls {...mockProps} />);
      
      const zoomInput = screen.getByDisplayValue('100');
      
      await user.clear(zoomInput);
      await user.type(zoomInput, '150');
      await user.keyboard('{Escape}');
      
      // Input should be cleared and focus lost
      expect(zoomInput).not.toHaveFocus();
    });
  });

  describe('Dropdown Behavior', () => {
    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <ZoomControls {...mockProps} />
          <div data-testid="outside">Outside element</div>
        </div>
      );
      
      // Open dropdown
      const dropdownButton = screen.getByTitle('Presets de zoom');
      await user.click(dropdownButton);
      
      expect(screen.getByText('25%')).toBeInTheDocument();
      
      // Click outside
      const outsideElement = screen.getByTestId('outside');
      await user.click(outsideElement);
      
      await waitFor(() => {
        expect(screen.queryByText('25%')).not.toBeInTheDocument();
      });
    });

    it('should highlight current zoom level in dropdown', async () => {
      const user = userEvent.setup();
      render(<ZoomControls {...mockProps} zoom={1.5} />);
      
      const dropdownButton = screen.getByTitle('Presets de zoom');
      await user.click(dropdownButton);
      
      const preset150 = screen.getByText('150%');
      expect(preset150).toHaveClass('bg-gray-700', 'text-blue-400');
    });
  });
});