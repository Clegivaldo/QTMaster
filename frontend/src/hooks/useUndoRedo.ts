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
    
    setHistory(prev => {
      // Remove any entries after current index (when undoing and then making new changes)
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Add new entry
      newHistory.push(entry);
      
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => {
      const newIndex = Math.min(prev + 1, maxHistorySize - 1);
      return newIndex;
    });
    
    lastActionRef.current = action || '';
  }, [currentIndex, maxHistorySize]);
  
  // Undo - go back in history
  const undo = useCallback((): EditorTemplate | null => {
    if (currentIndex <= 0) {
      return null;
    }
    
    const previousIndex = currentIndex - 1;
    const previousEntry = history[previousIndex];
    
    if (!previousEntry) {
      return null;
    }
    
    setCurrentIndex(previousIndex);
    return JSON.parse(JSON.stringify(previousEntry.template)); // Deep clone
  }, [currentIndex, history]);
  
  // Redo - go forward in history
  const redo = useCallback((): EditorTemplate | null => {
    if (currentIndex >= history.length - 1) {
      return null;
    }
    
    const nextIndex = currentIndex + 1;
    const nextEntry = history[nextIndex];
    
    if (!nextEntry) {
      return null;
    }
    
    setCurrentIndex(nextIndex);
    return JSON.parse(JSON.stringify(nextEntry.template)); // Deep clone
  }, [currentIndex, history]);
  
  // Clear all history
  const clearHistory = useCallback(() => {
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