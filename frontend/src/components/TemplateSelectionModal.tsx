import React, { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { X, FileText, Loader2 } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description?: string;
  category: string;
  thumbnail?: string;
  createdAt: string;
}

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
  isLoading: boolean;
}

const TemplateSelectionModal: React.FC<TemplateSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  isLoading
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.api.get('/editor-templates');
      setTemplates(response.data.data?.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    onSelectTemplate(templateId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Selecionar Template para o Laudo
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-600" />
              <p className="mt-4 text-gray-600">Carregando templates...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">
                <X className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-900 font-medium">Erro ao carregar templates</p>
              <p className="text-gray-600 mt-1">{error}</p>
              <button
                onClick={fetchTemplates}
                className="mt-4 btn-secondary"
              >
                Tentar novamente
              </button>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-900 font-medium">Nenhum template encontrado</p>
              <p className="text-gray-600 mt-1">
                Crie um template no Editor de Templates primeiro.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleSelectTemplate(template.id)}
                >
                  <div className="aspect-video bg-gray-100 rounded mb-3 flex items-center justify-center">
                    {template.thumbnail ? (
                      <img
                        src={template.thumbnail}
                        alt={template.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <FileText className="h-8 w-8 text-gray-400" />
                    )}
                  </div>

                  <h4 className="font-medium text-gray-900 mb-1">
                    {template.name}
                  </h4>

                  {template.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="capitalize">{template.category}</span>
                    <span>
                      {new Date(template.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelectionModal;