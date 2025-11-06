import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  EditorTemplate, 
  TemplateElement, 
  ElementType, 
  Position, 
  Size, 
  ElementStyles,
  ValidationResult
} from '../types/editor';
import { 
  DEFAULT_GLOBAL_STYLES, 
  DEFAULT_PAGE_SETTINGS, 
  DEFAULT_ZOOM,
  MAX_HISTORY_SIZE 
} from '../types/editor-constants';
import { 
  createDefaultElement, 
  generateId, 
  validateTemplate,
  getNextZIndex,
  cloneElement,
  mergeStyles,
  groupElements,
  ungroupElements,
  areElementsGrouped,
  canElementBeGrouped
} from '../types/editor-utils';
import { useUndoRedo } from './useUndoRedo';

interface UseTemplateEditorOptions {
  templateId?: string;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

interface UseTemplateEditorReturn {
  // Estado atual
  template: EditorTemplate;
  selectedElementIds: string[];
  zoom: number;
  panOffset: Position;
  isDragging: boolean;
  isResizing: boolean;
  
  // Histórico
  canUndo: boolean;
  canRedo: boolean;
  historySize: number;
  currentHistoryIndex: number;
  
  // Ações de template
  createNewTemplate: (name?: string) => void;
  loadTemplate: (template: EditorTemplate) => void;
  saveTemplate: () => Promise<void>;
  exportTemplate: (format: string) => Promise<void>;
  
  // Ações de elementos
  addElement: (type: ElementType, position?: Position) => string;
  removeElement: (elementId: string) => void;
  removeSelectedElements: () => void;
  duplicateElement: (elementId: string) => string;
  duplicateSelectedElements: () => void;
  
  // Seleção
  selectElement: (elementId: string, multiSelect?: boolean) => void;
  selectElements: (elementIds: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  
  // Manipulação de elementos
  moveElement: (elementId: string, newPosition: Position) => void;
  resizeElement: (elementId: string, newSize: Size) => void;
  updateElementContent: (elementId: string, content: any) => void;
  updateElementStyles: (elementIds: string[], styles: Partial<ElementStyles>) => void;
  
  // Ordenação (z-index)
  bringToFront: (elementId: string) => void;
  sendToBack: (elementId: string) => void;
  bringForward: (elementId: string) => void;
  sendBackward: (elementId: string) => void;
  
  // Canvas
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Position) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  
  // Histórico
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  
  // Estado de drag/resize
  setDragging: (isDragging: boolean) => void;
  setResizing: (isResizing: boolean) => void;
  
  // Validação
  validateTemplate: () => ValidationResult;
  
  // Agrupamento
  groupSelectedElements: () => string | null;
  ungroupSelectedElements: () => void;
  canGroupSelection: () => boolean;
  canUngroupSelection: () => boolean;
  
  // Utilitários
  getSelectedElements: () => TemplateElement[];
  getElementById: (id: string) => TemplateElement | undefined;
}

export const useTemplateEditor = (
  options: UseTemplateEditorOptions = {}
): UseTemplateEditorReturn => {
  const { templateId, autoSave = false, autoSaveInterval = 30000 } = options;
  
  // Estado principal do template
  const [template, setTemplate] = useState<EditorTemplate>(() => ({
    id: generateId('template'),
    name: 'Novo Template',
    description: '',
    category: 'default',
    elements: [],
    globalStyles: DEFAULT_GLOBAL_STYLES,
    pageSettings: DEFAULT_PAGE_SETTINGS,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'current-user', // TODO: pegar do contexto de auth
    version: 1,
    isPublic: false,
    tags: []
  }));
  
  // Estado do editor
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [zoom, setZoomState] = useState<number>(DEFAULT_ZOOM);
  const [panOffset, setPanOffsetState] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  
  // Histórico com hook dedicado
  const undoRedo = useUndoRedo({
    maxHistorySize: MAX_HISTORY_SIZE,
    debounceMs: 300 // Debounce para evitar muitas entradas no histórico
  });
  
  // Refs para auto-save
  const autoSaveTimeoutRef = useRef<number>();
  const lastSavedRef = useRef<string>('');
  
  // Função para atualizar template e adicionar ao histórico
  const updateTemplate = useCallback((
    updater: (prev: EditorTemplate) => EditorTemplate, 
    action?: string
  ) => {
    setTemplate(prev => {
      const newTemplate = updater(prev);
      undoRedo.addToHistory(newTemplate, action);
      return newTemplate;
    });
  }, [undoRedo]);
  
  // Criar novo template
  const createNewTemplate = useCallback((name: string = 'Novo Template') => {
    const newTemplate: EditorTemplate = {
      id: generateId('template'),
      name,
      description: '',
      category: 'default',
      elements: [],
      globalStyles: DEFAULT_GLOBAL_STYLES,
      pageSettings: DEFAULT_PAGE_SETTINGS,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'current-user',
      version: 1,
      isPublic: false,
      tags: []
    };
    
    setTemplate(newTemplate);
    setSelectedElementIds([]);
    undoRedo.clearHistory();
    undoRedo.addToHistory(newTemplate, 'Criar novo template');
  }, [undoRedo]);
  
  // Carregar template
  const loadTemplate = useCallback((newTemplate: EditorTemplate) => {
    setTemplate(newTemplate);
    setSelectedElementIds([]);
    undoRedo.clearHistory();
    undoRedo.addToHistory(newTemplate, 'Carregar template');
  }, [undoRedo]);
  
  // Salvar template - integrado com useTemplateStorage
  const saveTemplate = useCallback(async () => {
    try {
      // Esta função será chamada pelos modais que têm acesso ao useTemplateStorage
      // O hook useTemplateEditor não precisa conhecer os detalhes da API
      console.log('Template pronto para salvar:', template);
      lastSavedRef.current = JSON.stringify(template);
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      throw error;
    }
  }, [template]);
  
  // Exportar template - integrado com useTemplateStorage
  const exportTemplate = useCallback(async (format: string) => {
    try {
      // Esta função será chamada pelos modais que têm acesso ao useTemplateStorage
      // O hook useTemplateEditor não precisa conhecer os detalhes da API
      console.log('Template pronto para exportar:', template, 'formato:', format);
    } catch (error) {
      console.error('Erro ao exportar template:', error);
      throw error;
    }
  }, [template]);
  
  // Adicionar elemento
  const addElement = useCallback((type: ElementType, position?: Position): string => {
    const newElement = createDefaultElement(type, position);
    newElement.zIndex = getNextZIndex(template.elements);
    
    updateTemplate(prev => ({
      ...prev,
      elements: [...prev.elements, newElement],
      updatedAt: new Date()
    }), `Adicionar elemento ${type}`);
    
    // Selecionar o novo elemento
    setSelectedElementIds([newElement.id]);
    
    return newElement.id;
  }, [template.elements, updateTemplate]);
  
  // Remover elemento
  const removeElement = useCallback((elementId: string) => {
    updateTemplate(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== elementId),
      updatedAt: new Date()
    }), 'Remover elemento');
    
    // Remover da seleção se estiver selecionado
    setSelectedElementIds(prev => prev.filter(id => id !== elementId));
  }, [updateTemplate]);
  
  // Remover elementos selecionados
  const removeSelectedElements = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    
    const count = selectedElementIds.length;
    updateTemplate(prev => ({
      ...prev,
      elements: prev.elements.filter(el => !selectedElementIds.includes(el.id)),
      updatedAt: new Date()
    }), `Remover ${count} elemento${count > 1 ? 's' : ''}`);
    
    setSelectedElementIds([]);
  }, [selectedElementIds, updateTemplate]);
  
  // Duplicar elemento
  const duplicateElement = useCallback((elementId: string): string => {
    const element = template.elements.find(el => el.id === elementId);
    if (!element) return '';
    
    const clonedElement = cloneElement(element);
    clonedElement.zIndex = getNextZIndex(template.elements);
    
    updateTemplate(prev => ({
      ...prev,
      elements: [...prev.elements, clonedElement],
      updatedAt: new Date()
    }), 'Duplicar elemento');
    
    return clonedElement.id;
  }, [template.elements, updateTemplate]);
  
  // Duplicar elementos selecionados
  const duplicateSelectedElements = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    
    const newElementIds: string[] = [];
    const count = selectedElementIds.length;
    
    updateTemplate(prev => {
      const newElements = selectedElementIds.map(id => {
        const element = prev.elements.find(el => el.id === id);
        if (!element) return null;
        
        const cloned = cloneElement(element);
        cloned.zIndex = getNextZIndex([...prev.elements, ...newElements.filter(Boolean)]);
        newElementIds.push(cloned.id);
        return cloned;
      }).filter(Boolean) as TemplateElement[];
      
      return {
        ...prev,
        elements: [...prev.elements, ...newElements],
        updatedAt: new Date()
      };
    }, `Duplicar ${count} elemento${count > 1 ? 's' : ''}`);
    
    // Selecionar os novos elementos
    setSelectedElementIds(newElementIds);
  }, [selectedElementIds, updateTemplate]);
  
  // Seleção de elementos
  const selectElement = useCallback((elementId: string, multiSelect: boolean = false) => {
    if (multiSelect) {
      setSelectedElementIds(prev => 
        prev.includes(elementId) 
          ? prev.filter(id => id !== elementId)
          : [...prev, elementId]
      );
    } else {
      setSelectedElementIds([elementId]);
    }
  }, []);
  
  const selectElements = useCallback((elementIds: string[]) => {
    setSelectedElementIds(elementIds);
  }, []);
  
  const selectAll = useCallback(() => {
    setSelectedElementIds(template.elements.map(el => el.id));
  }, [template.elements]);
  
  const clearSelection = useCallback(() => {
    setSelectedElementIds([]);
  }, []);
  
  // Mover elemento
  const moveElement = useCallback((elementId: string, newPosition: Position) => {
    const element = template.elements.find(el => el.id === elementId);
    if (!element) return;

    // Se o elemento faz parte de um grupo, mover todo o grupo
    if (element.groupId) {
      const deltaX = newPosition.x - element.position.x;
      const deltaY = newPosition.y - element.position.y;

      updateTemplate(prev => ({
        ...prev,
        elements: prev.elements.map(el => 
          el.groupId === element.groupId
            ? { 
                ...el, 
                position: {
                  x: el.position.x + deltaX,
                  y: el.position.y + deltaY
                }
              }
            : el
        ),
        updatedAt: new Date()
      }), 'Mover elemento');
    } else {
      // Mover apenas o elemento individual
      updateTemplate(prev => ({
        ...prev,
        elements: prev.elements.map(el => 
          el.id === elementId 
            ? { ...el, position: newPosition }
            : el
        ),
        updatedAt: new Date()
      }), 'Mover elemento');
    }
  }, [template.elements, updateTemplate]);
  
  // Redimensionar elemento
  const resizeElement = useCallback((elementId: string, newSize: Size) => {
    updateTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el => 
        el.id === elementId 
          ? { ...el, size: newSize }
          : el
      ),
      updatedAt: new Date()
    }), 'Redimensionar elemento');
  }, [updateTemplate]);
  
  // Atualizar conteúdo do elemento
  const updateElementContent = useCallback((elementId: string, content: any) => {
    updateTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el => 
        el.id === elementId 
          ? { ...el, content }
          : el
      ),
      updatedAt: new Date()
    }), 'Editar conteúdo');
  }, [updateTemplate]);
  
  // Atualizar estilos dos elementos
  const updateElementStyles = useCallback((elementIds: string[], styles: Partial<ElementStyles>) => {
    const count = elementIds.length;
    updateTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el => 
        elementIds.includes(el.id)
          ? { ...el, styles: mergeStyles(el.styles, styles) }
          : el
      ),
      updatedAt: new Date()
    }), `Alterar estilo${count > 1 ? 's' : ''}`);
  }, [updateTemplate]);
  
  // Controles de z-index
  const bringToFront = useCallback((elementId: string) => {
    const maxZ = Math.max(...template.elements.map(el => el.zIndex));
    updateTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el => 
        el.id === elementId 
          ? { ...el, zIndex: maxZ + 1 }
          : el
      ),
      updatedAt: new Date()
    }), 'Trazer para frente');
  }, [template.elements, updateTemplate]);
  
  const sendToBack = useCallback((elementId: string) => {
    const minZ = Math.min(...template.elements.map(el => el.zIndex));
    updateTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el => 
        el.id === elementId 
          ? { ...el, zIndex: minZ - 1 }
          : el
      ),
      updatedAt: new Date()
    }), 'Enviar para trás');
  }, [template.elements, updateTemplate]);
  
  const bringForward = useCallback((elementId: string) => {
    const element = template.elements.find(el => el.id === elementId);
    if (!element) return;
    
    const elementsAbove = template.elements.filter(el => el.zIndex > element.zIndex);
    if (elementsAbove.length === 0) return;
    
    const nextZ = Math.min(...elementsAbove.map(el => el.zIndex));
    
    updateTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el => {
        if (el.id === elementId) {
          return { ...el, zIndex: nextZ + 1 };
        }
        if (el.zIndex === nextZ) {
          return { ...el, zIndex: element.zIndex };
        }
        return el;
      }),
      updatedAt: new Date()
    }), 'Avançar camada');
  }, [template.elements, updateTemplate]);
  
  const sendBackward = useCallback((elementId: string) => {
    const element = template.elements.find(el => el.id === elementId);
    if (!element) return;
    
    const elementsBelow = template.elements.filter(el => el.zIndex < element.zIndex);
    if (elementsBelow.length === 0) return;
    
    const prevZ = Math.max(...elementsBelow.map(el => el.zIndex));
    
    updateTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el => {
        if (el.id === elementId) {
          return { ...el, zIndex: prevZ - 1 };
        }
        if (el.zIndex === prevZ) {
          return { ...el, zIndex: element.zIndex };
        }
        return el;
      }),
      updatedAt: new Date()
    }), 'Recuar camada');
  }, [template.elements, updateTemplate]);
  
  // Controles de zoom
  const setZoom = useCallback((newZoom: number) => {
    setZoomState(Math.max(0.25, Math.min(4, newZoom)));
  }, []);
  
  const setPanOffset = useCallback((offset: Position) => {
    setPanOffsetState(offset);
  }, []);
  
  const zoomIn = useCallback(() => {
    setZoom(zoom * 1.25);
  }, [zoom, setZoom]);
  
  const zoomOut = useCallback(() => {
    setZoom(zoom / 1.25);
  }, [zoom, setZoom]);
  
  const zoomToFit = useCallback(() => {
    // TODO: Implementar zoom to fit baseado no tamanho do canvas
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, [setZoom]);
  
  // Controles de histórico
  const undo = useCallback(() => {
    const previousTemplate = undoRedo.undo();
    if (previousTemplate) {
      setTemplate(previousTemplate);
      setSelectedElementIds([]);
    }
  }, [undoRedo]);
  
  const redo = useCallback(() => {
    const nextTemplate = undoRedo.redo();
    if (nextTemplate) {
      setTemplate(nextTemplate);
      setSelectedElementIds([]);
    }
  }, [undoRedo]);
  
  const clearHistory = useCallback(() => {
    undoRedo.clearHistory();
  }, [undoRedo]);
  
  // Estados de drag/resize
  const setDragging = useCallback((dragging: boolean) => {
    setIsDragging(dragging);
  }, []);
  
  const setResizing = useCallback((resizing: boolean) => {
    setIsResizing(resizing);
  }, []);
  
  // Validação
  const validateTemplateData = useCallback((): ValidationResult => {
    return validateTemplate(template);
  }, [template]);
  
  // Utilitários
  const getSelectedElements = useCallback((): TemplateElement[] => {
    return template.elements.filter(el => selectedElementIds.includes(el.id));
  }, [template.elements, selectedElementIds]);
  
  const getElementById = useCallback((id: string): TemplateElement | undefined => {
    return template.elements.find(el => el.id === id);
  }, [template.elements]);

  // Funções de agrupamento
  const groupSelectedElements = useCallback((): string | null => {
    if (selectedElementIds.length < 2) return null;
    
    // Verificar se todos os elementos podem ser agrupados
    const elementsToGroup = selectedElementIds
      .map(id => getElementById(id))
      .filter(Boolean) as TemplateElement[];
    
    if (!elementsToGroup.every(canElementBeGrouped)) {
      return null;
    }
    
    updateTemplate(prev => ({
      ...prev,
      elements: groupElements(prev.elements, selectedElementIds),
      updatedAt: new Date()
    }), `Agrupar ${selectedElementIds.length} elementos`);
    
    // Retornar o ID do grupo criado
    const groupedElements = groupElements(template.elements, selectedElementIds);
    const firstGroupedElement = groupedElements.find(el => selectedElementIds.includes(el.id));
    return firstGroupedElement?.groupId || null;
  }, [selectedElementIds, template.elements, getElementById, updateTemplate]);
  
  const ungroupSelectedElements = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    
    // Encontrar grupos dos elementos selecionados
    const groupIds = new Set<string>();
    selectedElementIds.forEach(id => {
      const element = getElementById(id);
      if (element?.groupId) {
        groupIds.add(element.groupId);
      }
    });
    
    if (groupIds.size === 0) return;
    
    updateTemplate(prev => {
      let updatedElements = prev.elements;
      
      groupIds.forEach(groupId => {
        updatedElements = ungroupElements(updatedElements, groupId);
      });
      
      return {
        ...prev,
        elements: updatedElements,
        updatedAt: new Date()
      };
    }, `Desagrupar elementos`);
  }, [selectedElementIds, getElementById, updateTemplate]);
  
  const canGroupSelection = useCallback((): boolean => {
    if (selectedElementIds.length < 2) return false;
    
    const elementsToGroup = selectedElementIds
      .map(id => getElementById(id))
      .filter(Boolean) as TemplateElement[];
    
    return elementsToGroup.every(canElementBeGrouped) && 
           !areElementsGrouped(template.elements, selectedElementIds);
  }, [selectedElementIds, template.elements, getElementById]);
  
  const canUngroupSelection = useCallback((): boolean => {
    if (selectedElementIds.length === 0) return false;
    
    return selectedElementIds.some(id => {
      const element = getElementById(id);
      return element?.groupId;
    });
  }, [selectedElementIds, getElementById]);
  
  // Auto-save
  useEffect(() => {
    if (!autoSave) return;
    
    const currentTemplateString = JSON.stringify(template);
    if (currentTemplateString === lastSavedRef.current) return;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = window.setTimeout(() => {
      saveTemplate().catch(console.error);
    }, autoSaveInterval);
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [template, autoSave, autoSaveInterval, saveTemplate]);
  
  // Carregar template inicial se templateId for fornecido
  useEffect(() => {
    if (templateId) {
      // TODO: Carregar template da API
      console.log('Carregando template:', templateId);
    }
  }, [templateId]);
  
  return {
    // Estado atual
    template,
    selectedElementIds,
    zoom,
    panOffset,
    isDragging,
    isResizing,
    
    // Histórico
    canUndo: undoRedo.canUndo,
    canRedo: undoRedo.canRedo,
    historySize: undoRedo.historySize,
    currentHistoryIndex: undoRedo.currentIndex,
    
    // Ações de template
    createNewTemplate,
    loadTemplate,
    saveTemplate,
    exportTemplate,
    
    // Ações de elementos
    addElement,
    removeElement,
    removeSelectedElements,
    duplicateElement,
    duplicateSelectedElements,
    
    // Seleção
    selectElement,
    selectElements,
    selectAll,
    clearSelection,
    
    // Manipulação de elementos
    moveElement,
    resizeElement,
    updateElementContent,
    updateElementStyles,
    
    // Ordenação
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    
    // Canvas
    setZoom,
    setPanOffset,
    zoomIn,
    zoomOut,
    zoomToFit,
    
    // Histórico
    undo,
    redo,
    clearHistory,
    
    // Estado de drag/resize
    setDragging,
    setResizing,
    
    // Validação
    validateTemplate: validateTemplateData,
    
    // Agrupamento
    groupSelectedElements,
    ungroupSelectedElements,
    canGroupSelection,
    canUngroupSelection,
    
    // Utilitários
    getSelectedElements,
    getElementById
  };
};