import React from 'react';
import { X } from 'lucide-react';
import TemplateVisualRenderer from '../TemplatePreview/TemplateVisualRenderer';
import { EditorTemplate } from '../../types/editor';
import ResponsiveModal from '../ResponsiveModal';

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
  if (!template) return null;

  return (
    <ResponsiveModal isOpen={isOpen} onClose={onClose} size="full">
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{template.name}</h2>
            {template.description && (
              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - Visual Renderer */}
        <div className="flex-1 overflow-hidden">
          <TemplateVisualRenderer
            template={template}
            onExport={(status, message) => {
              if (status === 'success') {
                console.log('✅', message);
              } else {
                console.error('❌', message);
              }
            }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
};

export default TemplatePreviewModal;
