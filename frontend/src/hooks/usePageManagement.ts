import { useState, useCallback } from 'react';

export interface TemplatePage {
  id: string;
  elements: any[]; // TemplateElement[]
  pageNumber: number;
  name?: string;
}

interface UsePageManagementReturn {
  pages: TemplatePage[];
  currentPageIndex: number;
  currentPage: TemplatePage | null;
  totalPages: number;
  addPage: (afterIndex?: number, name?: string) => string;
  removePage: (pageIndex: number) => boolean;
  duplicatePage: (pageIndex: number) => string;
  setCurrentPageIndex: (index: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  updatePageName: (pageIndex: number, name: string) => void;
  moveElementToPage: (elementId: string, fromPageIndex: number, toPageIndex: number) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const usePageManagement = (initialPages?: TemplatePage[]): UsePageManagementReturn => {
  const [pages, setPages] = useState<TemplatePage[]>(() => {
    if (initialPages && initialPages.length > 0) {
      return initialPages;
    }
    
    // Criar primeira página padrão
    return [{
      id: generateId(),
      elements: [],
      pageNumber: 1,
      name: 'Página 1'
    }];
  });
  
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const addPage = useCallback((afterIndex?: number, name?: string): string => {
    const insertIndex = afterIndex !== undefined ? afterIndex + 1 : pages.length;
    const newPageNumber = insertIndex + 1;
    
    const newPage: TemplatePage = {
      id: generateId(),
      elements: [],
      pageNumber: newPageNumber,
      name: name || `Página ${newPageNumber}`
    };
    
    setPages(prev => {
      const newPages = [...prev];
      newPages.splice(insertIndex, 0, newPage);
      
      // Renumerar páginas subsequentes
      newPages.forEach((page, index) => {
        page.pageNumber = index + 1;
        if (!page.name || page.name.startsWith('Página ')) {
          page.name = `Página ${index + 1}`;
        }
      });
      
      return newPages;
    });
    
    // Navegar para a nova página
    setCurrentPageIndex(insertIndex);
    
    return newPage.id;
  }, [pages]);

  const removePage = useCallback((pageIndex: number): boolean => {
    if (pages.length <= 1) {
      console.warn('Não é possível remover a última página');
      return false; // Manter pelo menos uma página
    }
    
    if (pageIndex < 0 || pageIndex >= pages.length) {
      console.warn('Índice de página inválido');
      return false;
    }
    
    setPages(prev => {
      const newPages = prev.filter((_, index) => index !== pageIndex);
      
      // Renumerar páginas
      newPages.forEach((page, index) => {
        page.pageNumber = index + 1;
        if (!page.name || page.name.startsWith('Página ')) {
          page.name = `Página ${index + 1}`;
        }
      });
      
      return newPages;
    });
    
    // Ajustar página atual se necessário
    setCurrentPageIndex(prev => {
      if (prev >= pages.length - 1) {
        return Math.max(0, pages.length - 2);
      }
      return prev > pageIndex ? prev - 1 : prev;
    });
    
    return true;
  }, [pages]);

  const duplicatePage = useCallback((pageIndex: number): string => {
    if (pageIndex < 0 || pageIndex >= pages.length) {
      throw new Error('Índice de página inválido');
    }
    
    const originalPage = pages[pageIndex];
    const newPage: TemplatePage = {
      id: generateId(),
      elements: originalPage.elements.map(element => ({
        ...element,
        id: generateId() // Gerar novos IDs para os elementos
      })),
      pageNumber: pageIndex + 2,
      name: `${originalPage.name} (Cópia)`
    };
    
    setPages(prev => {
      const newPages = [...prev];
      newPages.splice(pageIndex + 1, 0, newPage);
      
      // Renumerar páginas subsequentes
      newPages.forEach((page, index) => {
        page.pageNumber = index + 1;
      });
      
      return newPages;
    });
    
    // Navegar para a página duplicada
    setCurrentPageIndex(pageIndex + 1);
    
    return newPage.id;
  }, [pages]);

  const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    setPages(prev => {
      const newPages = [...prev];
      const [movedPage] = newPages.splice(fromIndex, 1);
      newPages.splice(toIndex, 0, movedPage);
      
      // Renumerar todas as páginas
      newPages.forEach((page, index) => {
        page.pageNumber = index + 1;
        if (!page.name || page.name.startsWith('Página ')) {
          page.name = `Página ${index + 1}`;
        }
      });
      
      return newPages;
    });
    
    // Ajustar página atual
    if (currentPageIndex === fromIndex) {
      setCurrentPageIndex(toIndex);
    } else if (currentPageIndex > fromIndex && currentPageIndex <= toIndex) {
      setCurrentPageIndex(currentPageIndex - 1);
    } else if (currentPageIndex < fromIndex && currentPageIndex >= toIndex) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  }, [currentPageIndex]);

  const updatePageName = useCallback((pageIndex: number, name: string) => {
    setPages(prev => prev.map((page, index) => 
      index === pageIndex ? { ...page, name } : page
    ));
  }, []);

  const moveElementToPage = useCallback((elementId: string, fromPageIndex: number, toPageIndex: number) => {
    if (fromPageIndex === toPageIndex) return;
    
    setPages(prev => {
      const newPages = [...prev];
      
      // Encontrar e remover elemento da página origem
      const fromPage = newPages[fromPageIndex];
      const elementIndex = fromPage.elements.findIndex(el => el.id === elementId);
      
      if (elementIndex === -1) {
        console.warn('Elemento não encontrado na página origem');
        return prev;
      }
      
      const [element] = fromPage.elements.splice(elementIndex, 1);
      
      // Adicionar elemento à página destino
      const toPage = newPages[toPageIndex];
      toPage.elements.push(element);
      
      return newPages;
    });
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPageIndex(prev => Math.min(prev + 1, pages.length - 1));
  }, [pages.length]);

  const goToPreviousPage = useCallback(() => {
    setCurrentPageIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const goToFirstPage = useCallback(() => {
    setCurrentPageIndex(0);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPageIndex(pages.length - 1);
  }, [pages.length]);

  return {
    pages,
    currentPageIndex,
    currentPage: pages[currentPageIndex] || null,
    totalPages: pages.length,
    addPage,
    removePage,
    duplicatePage,
    setCurrentPageIndex,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    reorderPages,
    updatePageName,
    moveElementToPage
  };
};