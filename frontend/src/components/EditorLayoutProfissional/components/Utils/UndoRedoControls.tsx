import React, { useCallback } from 'react';
import { Undo, Redo, History } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '../../../../types/editor-constants';

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  historySize?: number;
  currentIndex?: number;
  showHistoryInfo?: boolean;
  compact?: boolean;
}

const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  historySize = 0,
  currentIndex = -1,
  showHistoryInfo = false,
  compact = false
}) => {
  const handleUndo = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canUndo) {
      onUndo();
    }
  }, [canUndo, onUndo]);

  const handleRedo = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canRedo) {
      onRedo();
    }
  }, [canRedo, onRedo]);

  const getUndoTooltip = () => {
    if (!canUndo) return `Desfazer (${KEYBOARD_SHORTCUTS.UNDO}) - Nenhuma ação para desfazer`;
    return `Desfazer (${KEYBOARD_SHORTCUTS.UNDO})`;
  };

  const getRedoTooltip = () => {
    if (!canRedo) return `Refazer (${KEYBOARD_SHORTCUTS.REDO}) - Nenhuma ação para refazer`;
    return `Refazer (${KEYBOARD_SHORTCUTS.REDO})`;
  };

  return (
    <div className="flex items-center gap-1">
      {/* Undo Button */}
      <button
        onClick={handleUndo}
        disabled={!canUndo}
        className={`
          p-2 rounded transition-colors
          ${canUndo 
            ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
            : 'text-gray-500 cursor-not-allowed opacity-50'
          }
          ${compact ? 'p-1' : 'p-2'}
        `}
        title={getUndoTooltip()}
        aria-label="Desfazer última ação"
      >
        <Undo className={compact ? "h-3 w-3" : "h-4 w-4"} />
      </button>

      {/* History Info (optional) */}
      {showHistoryInfo && historySize > 0 && (
        <div className="flex items-center gap-1 px-2 text-xs text-gray-400">
          <History className="h-3 w-3" />
          <span>{currentIndex + 1}/{historySize}</span>
        </div>
      )}

      {/* Redo Button */}
      <button
        onClick={handleRedo}
        disabled={!canRedo}
        className={`
          p-2 rounded transition-colors
          ${canRedo 
            ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
            : 'text-gray-500 cursor-not-allowed opacity-50'
          }
          ${compact ? 'p-1' : 'p-2'}
        `}
        title={getRedoTooltip()}
        aria-label="Refazer ação"
      >
        <Redo className={compact ? "h-3 w-3" : "h-4 w-4"} />
      </button>
    </div>
  );
};

export default UndoRedoControls;