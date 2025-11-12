import React, { useState } from 'react';
// header close icon removed
import TemplateVisualRenderer from '../TemplatePreview/TemplateVisualRenderer';
import { EditorTemplate } from '../../types/editor';
import ResponsiveModal from '../ResponsiveModal';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface TemplatePreviewModalProps {
  isOpen: boolean;
  template: EditorTemplate | null;
  onClose: () => void;
}

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  isOpen,
  template,
  onClose
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  if (!template) return null;

  const pages = template.pages && template.pages.length > 0 ? template.pages : [{ id: 'p-1', elements: template.elements || [], pageSettings: null, header: null, footer: null } as any];
  const totalPages = pages.length;

  const handlePrevPage = () => {
    setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
  };

  const handleNextPage = () => {
    setCurrentPageIndex(Math.min(totalPages - 1, currentPageIndex + 1));
  };

  return (
    <ResponsiveModal isOpen={isOpen} onClose={onClose} size="full" showCloseButton={false}>
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          {/* Título à esquerda */}
          <div className="flex items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{template.name}</h2>
              {template.description && (
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
              )}
            </div>
          </div>
          
          {/* Navegação de páginas centralizada */}
          <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
            <button 
              onClick={handlePrevPage} 
              disabled={currentPageIndex === 0}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-600 min-w-[80px] text-center">
              Página {currentPageIndex + 1} / {totalPages}
            </span>
            <button 
              onClick={handleNextPage} 
              disabled={currentPageIndex === totalPages - 1}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          
          {/* Botão de fechar à direita */}
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content - Visual Renderer */}
        <div className="flex-1 overflow-hidden">
          <TemplateVisualRenderer 
            template={template} 
            showControls={false}
            currentPageIndex={currentPageIndex}
            onPageChange={setCurrentPageIndex}
          />
        </div>
      </div>
    </ResponsiveModal>
  );
};

export default TemplatePreviewModal;
