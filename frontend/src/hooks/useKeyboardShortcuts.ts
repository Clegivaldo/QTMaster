import { useEffect, useCallback } from 'react';

interface KeyboardShortcutHandlers {
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onLoad?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  onSelectAll?: () => void;
  onDelete?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomFit?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onEscape?: () => void;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
}

export const useKeyboardShortcuts = (
  handlers: KeyboardShortcutHandlers,
  options: UseKeyboardShortcutsOptions = {}
) => {
  const { enabled = true, preventDefault = true } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Check if we're in an input field or contentEditable element
    const target = event.target as HTMLElement;
    const isEditingText = 
      target.contentEditable === 'true' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT';

    // For text editing contexts, only allow certain shortcuts
    if (isEditingText) {
      // Allow basic text editing shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+A, etc.)
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'z':
            if (preventDefault) event.preventDefault();
            if (event.shiftKey && handlers.onRedo) {
              handlers.onRedo();
            } else if (handlers.onUndo) {
              handlers.onUndo();
            }
            return;
          case 'y':
            if (preventDefault) event.preventDefault();
            if (handlers.onRedo) {
              handlers.onRedo();
            }
            return;
          case 's':
            if (preventDefault) event.preventDefault();
            if (handlers.onSave) {
              handlers.onSave();
            }
            return;
        }
      }
      return; // Don't handle other shortcuts when editing text
    }

    // Handle shortcuts with Ctrl/Cmd modifier
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'z':
          if (preventDefault) event.preventDefault();
          if (event.shiftKey && handlers.onRedo) {
            handlers.onRedo();
          } else if (handlers.onUndo) {
            handlers.onUndo();
          }
          break;

        case 'y':
          if (preventDefault) event.preventDefault();
          if (handlers.onRedo) {
            handlers.onRedo();
          }
          break;

        case 's':
          if (preventDefault) event.preventDefault();
          if (handlers.onSave) {
            handlers.onSave();
          }
          break;

        case 'o':
          if (preventDefault) event.preventDefault();
          if (handlers.onLoad) {
            handlers.onLoad();
          }
          break;

        case 'c':
          if (preventDefault) event.preventDefault();
          if (handlers.onCopy) {
            handlers.onCopy();
          }
          break;

        case 'v':
          if (preventDefault) event.preventDefault();
          if (handlers.onPaste) {
            handlers.onPaste();
          }
          break;

        case 'x':
          if (preventDefault) event.preventDefault();
          if (handlers.onCut) {
            handlers.onCut();
          }
          break;

        case 'a':
          if (preventDefault) event.preventDefault();
          if (handlers.onSelectAll) {
            handlers.onSelectAll();
          }
          break;

        case 'g':
          if (preventDefault) event.preventDefault();
          if (event.shiftKey && handlers.onUngroup) {
            handlers.onUngroup();
          } else if (handlers.onGroup) {
            handlers.onGroup();
          }
          break;

        case '=':
        case '+':
          if (preventDefault) event.preventDefault();
          if (handlers.onZoomIn) {
            handlers.onZoomIn();
          }
          break;

        case '-':
          if (preventDefault) event.preventDefault();
          if (handlers.onZoomOut) {
            handlers.onZoomOut();
          }
          break;

        case '0':
          if (preventDefault) event.preventDefault();
          if (handlers.onZoomFit) {
            handlers.onZoomFit();
          }
          break;
      }
    } else {
      // Handle shortcuts without modifiers
      switch (event.key) {
        case 'Delete':
        case 'Backspace':
          if (preventDefault) event.preventDefault();
          if (handlers.onDelete) {
            handlers.onDelete();
          }
          break;

        case 'Escape':
          if (preventDefault) event.preventDefault();
          if (handlers.onEscape) {
            handlers.onEscape();
          }
          break;
      }
    }
  }, [enabled, preventDefault, handlers]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    handleKeyDown
  };
};