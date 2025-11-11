import React from 'react';
// header close icon removed
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
        </div>

        {/* Content - Visual Renderer */}
        <div className="flex-1 overflow-hidden">
          <TemplateVisualRenderer template={template} />
        </div>
      </div>
    </ResponsiveModal>
  );
};

export default TemplatePreviewModal;
