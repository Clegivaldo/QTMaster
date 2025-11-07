import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Copy,
  MoreHorizontal,
  FileText,
  
} from 'lucide-react';

interface PageNavigationProps {
  currentPageIndex: number;
  totalPages: number;
  onPageChange: (index: number) => void;
  onAddPage: () => void;
  onRemovePage: (index: number) => void;
  onDuplicatePage: (index: number) => void;
  onPageRename?: (index: number, name: string) => void;
  pageNames?: string[];
  className?: string;
}

const PageNavigation: React.FC<PageNavigationProps> = ({
  currentPageIndex,
  totalPages,
  onPageChange,
  onAddPage,
  onRemovePage,
  onDuplicatePage,
  onPageRename,
  pageNames = [],
  className = ''
}) => {
  const [showPageMenu, setShowPageMenu] = useState(false);
  const [editingPageName, setEditingPageName] = useState<number | null>(null);
  const [tempPageName, setTempPageName] = useState('');

  const handlePageNameEdit = (pageIndex: number) => {
    const currentName = pageNames[pageIndex] || `Página ${pageIndex + 1}`;
    setTempPageName(currentName);
    setEditingPageName(pageIndex);
  };

  const handlePageNameSave = () => {
    if (editingPageName !== null && onPageRename) {
      onPageRename(editingPageName, tempPageName.trim() || `Página ${editingPageName + 1}`);
    }
    setEditingPageName(null);
    setTempPageName('');
  };

  const handlePageNameCancel = () => {
    setEditingPageName(null);
    setTempPageName('');
  };

  const canRemovePage = totalPages > 1;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Navegação básica */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(0, currentPageIndex - 1))}
          disabled={currentPageIndex === 0}
          className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Indicador de página atual */}
        <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded text-sm">
          <FileText className="h-3 w-3 text-gray-500" />
          
          {editingPageName === currentPageIndex ? (
            <input
              type="text"
              value={tempPageName}
              onChange={(e) => setTempPageName(e.target.value)}
              onBlur={handlePageNameSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePageNameSave();
                } else if (e.key === 'Escape') {
                  handlePageNameCancel();
                }
              }}
              className="w-20 px-1 py-0 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <span 
              className="cursor-pointer hover:text-blue-600"
              onClick={() => handlePageNameEdit(currentPageIndex)}
              title="Clique para renomear"
            >
              {pageNames[currentPageIndex] || `Página ${currentPageIndex + 1}`}
            </span>
          )}
          
          <span className="text-gray-400">
            ({currentPageIndex + 1}/{totalPages})
          </span>
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages - 1, currentPageIndex + 1))}
          disabled={currentPageIndex === totalPages - 1}
          className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Ações de página */}
      <div className="flex items-center gap-1 border-l border-gray-300 pl-2">
        <button
          onClick={onAddPage}
          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
          title="Adicionar nova página"
        >
          <Plus className="h-4 w-4" />
        </button>

        <button
          onClick={() => onDuplicatePage(currentPageIndex)}
          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
          title="Duplicar página atual"
        >
          <Copy className="h-4 w-4" />
        </button>

        <button
          onClick={() => onRemovePage(currentPageIndex)}
          disabled={!canRemovePage}
          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          title={canRemovePage ? "Remover página atual" : "Não é possível remover a última página"}
        >
          <Trash2 className="h-4 w-4" />
        </button>

        {/* Menu de páginas (para muitas páginas) */}
        {totalPages > 5 && (
          <div className="relative">
            <button
              onClick={() => setShowPageMenu(!showPageMenu)}
              className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              title="Ver todas as páginas"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {showPageMenu && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48 max-h-64 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 mb-2">Todas as Páginas</div>
                  {Array.from({ length: totalPages }, (_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        onPageChange(index);
                        setShowPageMenu(false);
                      }}
                      className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 flex items-center justify-between ${
                        index === currentPageIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <span>{pageNames[index] || `Página ${index + 1}`}</span>
                      <span className="text-xs text-gray-400">{index + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fechar menu ao clicar fora */}
      {showPageMenu && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => setShowPageMenu(false)}
        />
      )}
    </div>
  );
};

export default PageNavigation;