import { useState, useCallback, useRef } from 'react';
import { EditorTemplate } from '../types/editor';
import { MAX_HISTORY_SIZE } from '../types/editor-constants';

interface HistoryEntry {
  template: EditorTemplate;
  timestamp: number;
  action?: string; // Optional description of the action
}

interface UseUndoRedoOptions {
  maxHistorySize?: number;
  debounceMs?: number; // Debounce time to avoid too many history entries
}

interface UseUndoRedoReturn {
  // State
  canUndo: boolean;
  canRedo: boolean;
  historySize: number;
  currentIndex: number;
  
  // Actions
  addToHistory: (template: EditorTemplate, action?: string) => void;
  undo: () => EditorTemplate | null;
  redo: () => EditorTemplate | null;
  clearHistory: () => void;
  
  // Utilities
  getHistoryEntry: (index: number) => HistoryEntry | null;
  getCurrentEntry: () => HistoryEntry | null;
}

export const useUndoRedo = (
  options: UseUndoRedoOptions = {}
): UseUndoRedoReturn => {
  const { 
    maxHistorySize = MAX_HISTORY_SIZE, 
    debounceMs = 500 
  } = options;
  
  // History stack - array of template states
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  // Current position in history (-1 means no history)
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // Refs to keep latest values for callback-based updates
  const historyRef = useRef<HistoryEntry[]>([]);
  const currentIndexRef = useRef<number>(-1);
  
  // Debounce timer ref
  const debounceTimerRef = useRef<number>();
  const lastActionRef = useRef<string>('');
  
  // Add template state to history
  const addToHistory = useCallback((template: EditorTemplate, action?: string) => {
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // If this is the same action type within debounce period, debounce it
    if (action && action === lastActionRef.current && debounceMs > 0) {
      debounceTimerRef.current = window.setTimeout(() => {
        addToHistoryImmediate(template, action);
      }, debounceMs);
      return;
    }
    
    // Add immediately for different actions or when debounce is disabled
    addToHistoryImmediate(template, action);
  }, [debounceMs]);
  
  const addToHistoryImmediate = useCallback((template: EditorTemplate, action?: string) => {
    const entry: HistoryEntry = {
      template: JSON.parse(JSON.stringify(template)), // Deep clone
      timestamp: Date.now(),
      action
    };
    // Update refs and state atomically
    const prev = historyRef.current;
    const prevIndex = currentIndexRef.current;

    // Cut history after current index to support branching after undo
    const base = prev.slice(0, prevIndex + 1);
    base.push(entry);

    // Trim to max size
    const trimmed = base.length > maxHistorySize ? base.slice(base.length - maxHistorySize) : base;

    historyRef.current = trimmed;
    const newIndex = trimmed.length - 1;
    currentIndexRef.current = newIndex;

    setHistory(trimmed);
    setCurrentIndex(newIndex);
    
    lastActionRef.current = action || '';
  }, [currentIndex, maxHistorySize]);
  
  // Undo - go back in history
  const undo = useCallback((): EditorTemplate | null => {
    if (currentIndexRef.current <= 0) {
      return null;
    }

    const previousIndex = currentIndexRef.current - 1;
    const previousEntry = historyRef.current[previousIndex];
    if (!previousEntry) return null;

    currentIndexRef.current = previousIndex;
    setCurrentIndex(previousIndex);
    return JSON.parse(JSON.stringify(previousEntry.template)); // Deep clone
  }, [currentIndex, history]);
  
  // Redo - go forward in history
  const redo = useCallback((): EditorTemplate | null => {
    if (currentIndexRef.current >= historyRef.current.length - 1) return null;

    const nextIndex = currentIndexRef.current + 1;
    const nextEntry = historyRef.current[nextIndex];
    if (!nextEntry) return null;

    currentIndexRef.current = nextIndex;
    setCurrentIndex(nextIndex);
    return JSON.parse(JSON.stringify(nextEntry.template));
  }, [currentIndex, history]);
  
  // Clear all history
  const clearHistory = useCallback(() => {
    historyRef.current = [];
    currentIndexRef.current = -1;
    setHistory([]);
    setCurrentIndex(-1);
    lastActionRef.current = '';

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);
  
  // Get specific history entry
  const getHistoryEntry = useCallback((index: number): HistoryEntry | null => {
    if (index < 0 || index >= history.length) {
      return null;
    }
    return history[index];
  }, [history]);
  
  // Get current history entry
  const getCurrentEntry = useCallback((): HistoryEntry | null => {
    return getHistoryEntry(currentIndex);
  }, [currentIndex, getHistoryEntry]);
  
  // Computed values
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;
  const historySize = history.length;
  
  return {
    // State
    canUndo,
    canRedo,
    historySize,
    currentIndex,
    
    // Actions
    addToHistory,
    undo,
    redo,
    clearHistory,
    
    // Utilities
    getHistoryEntry,
    getCurrentEntry
  };
};