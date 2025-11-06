import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UndoRedoControls from './UndoRedoControls';
import { KEYBOARD_SHORTCUTS } from '../../../../types/editor-constants';

describe('UndoRedoControls', () => {
  const mockProps = {
    canUndo: true,
    canRedo: true,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    historySize: 5,
    currentIndex: 2,
    showHistoryInfo: false,
    compact: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Button Rendering', () => {
    it('should render undo and redo buttons', () => {
      render(<UndoRedoControls {...mockProps} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      const redoButton = screen.getByLabelText('Refazer ação');

      expect(undoButton).toBeInTheDocument();
      expect(redoButton).toBeInTheDocument();
    });

    it('should show correct tooltips with keyboard shortcuts', () => {
      render(<UndoRedoControls {...mockProps} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      const redoButton = screen.getByLabelText('Refazer ação');

      expect(undoButton).toHaveAttribute('title', `Desfazer (${KEYBOARD_SHORTCUTS.UNDO})`);
      expect(redoButton).toHaveAttribute('title', `Refazer (${KEYBOARD_SHORTCUTS.REDO})`);
    });

    it('should render in compact mode', () => {
      render(<UndoRedoControls {...mockProps} compact={true} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      const redoButton = screen.getByLabelText('Refazer ação');

      // In compact mode, buttons should have smaller padding classes
      expect(undoButton).toHaveClass('p-1');
      expect(redoButton).toHaveClass('p-1');
    });

    it('should render in normal mode', () => {
      render(<UndoRedoControls {...mockProps} compact={false} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      const redoButton = screen.getByLabelText('Refazer ação');

      // In normal mode, buttons should have regular padding classes
      expect(undoButton).toHaveClass('p-2');
      expect(redoButton).toHaveClass('p-2');
    });
  });

  describe('Button States', () => {
    it('should enable buttons when actions are available', () => {
      render(<UndoRedoControls {...mockProps} canUndo={true} canRedo={true} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      const redoButton = screen.getByLabelText('Refazer ação');

      expect(undoButton).not.toBeDisabled();
      expect(redoButton).not.toBeDisabled();
      expect(undoButton).toHaveClass('text-gray-300', 'hover:text-white', 'hover:bg-gray-700');
      expect(redoButton).toHaveClass('text-gray-300', 'hover:text-white', 'hover:bg-gray-700');
    });

    it('should disable undo button when canUndo is false', () => {
      render(<UndoRedoControls {...mockProps} canUndo={false} canRedo={true} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      const redoButton = screen.getByLabelText('Refazer ação');

      expect(undoButton).toBeDisabled();
      expect(redoButton).not.toBeDisabled();
      expect(undoButton).toHaveClass('text-gray-500', 'cursor-not-allowed', 'opacity-50');
    });

    it('should disable redo button when canRedo is false', () => {
      render(<UndoRedoControls {...mockProps} canUndo={true} canRedo={false} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      const redoButton = screen.getByLabelText('Refazer ação');

      expect(undoButton).not.toBeDisabled();
      expect(redoButton).toBeDisabled();
      expect(redoButton).toHaveClass('text-gray-500', 'cursor-not-allowed', 'opacity-50');
    });

    it('should disable both buttons when no actions are available', () => {
      render(<UndoRedoControls {...mockProps} canUndo={false} canRedo={false} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      const redoButton = screen.getByLabelText('Refazer ação');

      expect(undoButton).toBeDisabled();
      expect(redoButton).toBeDisabled();
    });

    it('should show appropriate tooltips when buttons are disabled', () => {
      render(<UndoRedoControls {...mockProps} canUndo={false} canRedo={false} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      const redoButton = screen.getByLabelText('Refazer ação');

      expect(undoButton).toHaveAttribute('title', `Desfazer (${KEYBOARD_SHORTCUTS.UNDO}) - Nenhuma ação para desfazer`);
      expect(redoButton).toHaveAttribute('title', `Refazer (${KEYBOARD_SHORTCUTS.REDO}) - Nenhuma ação para refazer`);
    });
  });

  describe('Button Interactions', () => {
    it('should call onUndo when undo button is clicked', async () => {
      const user = userEvent.setup();
      render(<UndoRedoControls {...mockProps} canUndo={true} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      await user.click(undoButton);

      expect(mockProps.onUndo).toHaveBeenCalledTimes(1);
    });

    it('should call onRedo when redo button is clicked', async () => {
      const user = userEvent.setup();
      render(<UndoRedoControls {...mockProps} canRedo={true} />);

      const redoButton = screen.getByLabelText('Refazer ação');
      await user.click(redoButton);

      expect(mockProps.onRedo).toHaveBeenCalledTimes(1);
    });

    it('should not call onUndo when undo button is disabled and clicked', async () => {
      const user = userEvent.setup();
      render(<UndoRedoControls {...mockProps} canUndo={false} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      await user.click(undoButton);

      expect(mockProps.onUndo).not.toHaveBeenCalled();
    });

    it('should not call onRedo when redo button is disabled and clicked', async () => {
      const user = userEvent.setup();
      render(<UndoRedoControls {...mockProps} canRedo={false} />);

      const redoButton = screen.getByLabelText('Refazer ação');
      await user.click(redoButton);

      expect(mockProps.onRedo).not.toHaveBeenCalled();
    });

    it('should prevent default and stop propagation on button clicks', () => {
      render(<UndoRedoControls {...mockProps} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      const redoButton = screen.getByLabelText('Refazer ação');

      const undoEvent = new MouseEvent('click', { bubbles: true });
      const redoEvent = new MouseEvent('click', { bubbles: true });

      const preventDefaultSpy = vi.spyOn(undoEvent, 'preventDefault');
      const stopPropagationSpy = vi.spyOn(undoEvent, 'stopPropagation');

      fireEvent(undoButton, undoEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('History Information Display', () => {
    it('should show history info when showHistoryInfo is true', () => {
      render(<UndoRedoControls {...mockProps} showHistoryInfo={true} historySize={5} currentIndex={2} />);

      expect(screen.getByText('3/5')).toBeInTheDocument();
    });

    it('should not show history info when showHistoryInfo is false', () => {
      render(<UndoRedoControls {...mockProps} showHistoryInfo={false} historySize={5} currentIndex={2} />);

      expect(screen.queryByText('3/5')).not.toBeInTheDocument();
    });

    it('should not show history info when historySize is 0', () => {
      render(<UndoRedoControls {...mockProps} showHistoryInfo={true} historySize={0} currentIndex={-1} />);

      expect(screen.queryByText('0/0')).not.toBeInTheDocument();
    });

    it('should display correct history position', () => {
      const { rerender } = render(
        <UndoRedoControls {...mockProps} showHistoryInfo={true} historySize={10} currentIndex={0} />
      );

      expect(screen.getByText('1/10')).toBeInTheDocument();

      rerender(
        <UndoRedoControls {...mockProps} showHistoryInfo={true} historySize={10} currentIndex={5} />
      );

      expect(screen.getByText('6/10')).toBeInTheDocument();

      rerender(
        <UndoRedoControls {...mockProps} showHistoryInfo={true} historySize={10} currentIndex={9} />
      );

      expect(screen.getByText('10/10')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<UndoRedoControls {...mockProps} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      const redoButton = screen.getByLabelText('Refazer ação');

      expect(undoButton).toHaveAttribute('aria-label', 'Desfazer última ação');
      expect(redoButton).toHaveAttribute('aria-label', 'Refazer ação');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<UndoRedoControls {...mockProps} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      const redoButton = screen.getByLabelText('Refazer ação');

      // Tab to undo button and press Enter
      await user.tab();
      expect(undoButton).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(mockProps.onUndo).toHaveBeenCalledTimes(1);

      // Tab to redo button and press Space
      await user.tab();
      expect(redoButton).toHaveFocus();
      await user.keyboard(' ');
      expect(mockProps.onRedo).toHaveBeenCalledTimes(1);
    });

    it('should skip disabled buttons in tab order', async () => {
      const user = userEvent.setup();
      render(<UndoRedoControls {...mockProps} canUndo={false} canRedo={true} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      const redoButton = screen.getByLabelText('Refazer ação');

      // Disabled button should not be focusable
      expect(undoButton).toBeDisabled();
      expect(redoButton).not.toBeDisabled();

      await user.tab();
      expect(redoButton).toHaveFocus();
    });
  });

  describe('Visual Feedback', () => {
    it('should show hover effects on enabled buttons', () => {
      render(<UndoRedoControls {...mockProps} canUndo={true} canRedo={true} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      const redoButton = screen.getByLabelText('Refazer ação');

      expect(undoButton).toHaveClass('hover:text-white', 'hover:bg-gray-700');
      expect(redoButton).toHaveClass('hover:text-white', 'hover:bg-gray-700');
    });

    it('should not show hover effects on disabled buttons', () => {
      render(<UndoRedoControls {...mockProps} canUndo={false} canRedo={false} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      const redoButton = screen.getByLabelText('Refazer ação');

      expect(undoButton).not.toHaveClass('hover:text-white', 'hover:bg-gray-700');
      expect(redoButton).not.toHaveClass('hover:text-white', 'hover:bg-gray-700');
      expect(undoButton).toHaveClass('cursor-not-allowed', 'opacity-50');
      expect(redoButton).toHaveClass('cursor-not-allowed', 'opacity-50');
    });

    it('should have proper transition classes', () => {
      render(<UndoRedoControls {...mockProps} />);

      const undoButton = screen.getByLabelText('Desfazer última ação');
      const redoButton = screen.getByLabelText('Refazer ação');

      expect(undoButton).toHaveClass('transition-colors');
      expect(redoButton).toHaveClass('transition-colors');
    });
  });

  describe('Icon Rendering', () => {
    it('should render undo and redo icons', () => {
      render(<UndoRedoControls {...mockProps} />);

      // Icons are rendered as SVG elements with specific classes
      const undoIcon = screen.getByLabelText('Desfazer última ação').querySelector('svg');
      const redoIcon = screen.getByLabelText('Refazer ação').querySelector('svg');

      expect(undoIcon).toBeInTheDocument();
      expect(redoIcon).toBeInTheDocument();
    });

    it('should render icons with correct size in compact mode', () => {
      render(<UndoRedoControls {...mockProps} compact={true} />);

      const undoIcon = screen.getByLabelText('Desfazer última ação').querySelector('svg');
      const redoIcon = screen.getByLabelText('Refazer ação').querySelector('svg');

      expect(undoIcon).toHaveClass('h-3', 'w-3');
      expect(redoIcon).toHaveClass('h-3', 'w-3');
    });

    it('should render icons with correct size in normal mode', () => {
      render(<UndoRedoControls {...mockProps} compact={false} />);

      const undoIcon = screen.getByLabelText('Desfazer última ação').querySelector('svg');
      const redoIcon = screen.getByLabelText('Refazer ação').querySelector('svg');

      expect(undoIcon).toHaveClass('h-4', 'w-4');
      expect(redoIcon).toHaveClass('h-4', 'w-4');
    });

    it('should render history icon when showing history info', () => {
      render(<UndoRedoControls {...mockProps} showHistoryInfo={true} historySize={5} />);

      const historyIcon = screen.getByText('3/5').parentElement?.querySelector('svg');
      expect(historyIcon).toBeInTheDocument();
      expect(historyIcon).toHaveClass('h-3', 'w-3');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined optional props gracefully', () => {
      const minimalProps = {
        canUndo: true,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn()
      };

      expect(() => {
        render(<UndoRedoControls {...minimalProps} />);
      }).not.toThrow();

      expect(screen.getByLabelText('Desfazer última ação')).toBeInTheDocument();
      expect(screen.getByLabelText('Refazer ação')).toBeInTheDocument();
    });

    it('should handle zero history size correctly', () => {
      render(<UndoRedoControls {...mockProps} historySize={0} currentIndex={-1} showHistoryInfo={true} />);

      // Should not show history info when historySize is 0
      expect(screen.queryByText('0/0')).not.toBeInTheDocument();
    });

    it('should handle negative currentIndex correctly', () => {
      render(<UndoRedoControls {...mockProps} currentIndex={-1} historySize={5} showHistoryInfo={true} />);

      // Should show 0/5 when currentIndex is -1
      expect(screen.getByText('0/5')).toBeInTheDocument();
    });

    it('should handle currentIndex greater than historySize', () => {
      render(<UndoRedoControls {...mockProps} currentIndex={10} historySize={5} showHistoryInfo={true} />);

      // Should show 11/5 (currentIndex + 1)
      expect(screen.getByText('11/5')).toBeInTheDocument();
    });
  });
});