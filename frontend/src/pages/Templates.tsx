import React, { useState, useEffect } from 'react';
import { formatBRShort } from '@/utils/parseDate';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, Eye, Palette, Copy, Trash2 } from 'lucide-react';
import { apiService } from '../services/api';
import ConfirmationModal from '../components/Modals/ConfirmationModal';
import TemplatePreviewModal from '../components/Modals/TemplatePreviewModal';

interface Template {
  id?: string;
  name: string;
  filename?: string;
  type: string;
  lastModified: string;
  size: number;
}

const Templates: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para modais de confirmação
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; template: Template | null }>({
    isOpen: false,
    template: null
  });
  const [duplicateModal, setDuplicateModal] = useState<{ isOpen: boolean; template: Template | null }>({
    isOpen: false,
    template: null
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  
  // Estado para preview modal
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; template: any | null }>({
    isOpen: false,
    template: null
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  // Reload templates when route/location changes (e.g. returning from editor)
  const location = useLocation();
  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Reload when window gains focus (user returned to app)
  useEffect(() => {
    const onFocus = () => loadTemplates();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await apiService.api.get('/editor-templates');
      // API returns { success: true, data: { templates: [...], pagination: {...} } }
      const payload = response?.data;
      let items: any[] = [];

      // Normalize different response formats
      if (Array.isArray(payload)) {
        // Direct array response
        items = payload;
      } else if (payload?.data && Array.isArray(payload.data)) {
        // { data: [...] } format
        items = payload.data;
      } else if (payload?.data?.templates && Array.isArray(payload.data.templates)) {
        // { data: { templates: [...] } } format (current backend)
        items = payload.data.templates;
      } else if (payload?.templates && Array.isArray(payload.templates)) {
        // { templates: [...] } format
        items = payload.templates;
      }

      if (items.length > 0) {
        const templateData = items.map((template: any) => ({
          id: template.id,
          name: template.name || 'Template',
          filename: template.name ? `${template.name}.hbs` : 'template.hbs',
          type: 'Editor Template',
          lastModified: formatBRShort(template.updatedAt || new Date()),
          size: template.size || Math.floor(Math.random() * 50) + 10 // KB simulado
        }));
        setTemplates(templateData);
      } else {
        // Sem templates salvos
        setTemplates([]);
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const openTemplateEditor = (templateId?: string) => {
    // Navegar para a página de editor
    navigate(templateId ? `/editor-layout/${templateId}` : '/editor-layout');
  };

  const previewTemplate = async (template: Template) => {
    try {
      if (!template.id) {
        alert('Template não possui ID válido');
        return;
      }

      // Carregar dados completos do template antes de mostrar preview
      const response = await apiService.api.get(`/editor-templates/${template.id}`);
      const fullTemplate = response?.data?.data?.template;
      
      if (fullTemplate) {
        setPreviewModal({
          isOpen: true,
          template: fullTemplate
        });
      } else {
        alert('Erro ao carregar template');
      }
    } catch (error: any) {
      console.error('Erro ao visualizar template:', error);
      alert('Erro ao visualizar template: ' + (error?.response?.data?.error || error.message));
    }
  };

  const deleteTemplate = async (template: Template) => {
    if (!template.id) {
      alert('Template não possui ID válido');
      return;
    }

    // Abrir modal de confirmação ao invés de window.confirm
    setDeleteModal({ isOpen: true, template });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.template?.id) return;
    
    setIsDeleting(true);
    try {
      await apiService.api.delete(`/editor-templates/${deleteModal.template.id}`);
      setDeleteModal({ isOpen: false, template: null });
      loadTemplates(); // Recarregar lista
    } catch (error: any) {
      console.error('Erro ao deletar template:', error);
      alert('Erro ao deletar template: ' + (error?.response?.data?.error || error.message));
    } finally {
      setIsDeleting(false);
    }
  };

  const duplicateTemplate = async (template: Template) => {
    if (!template.id) {
      alert('Template não possui ID válido');
      return;
    }

    // Abrir modal de confirmação ao invés de apenas confirmar direto
    setDuplicateModal({ isOpen: true, template });
  };

  const handleConfirmDuplicate = async () => {
    if (!duplicateModal.template?.id) return;

    setIsDuplicating(true);
    try {
      const response = await apiService.api.post(`/editor-templates/${duplicateModal.template.id}/duplicate`);
      const newTemplate = response.data?.data?.template;
      
      if (newTemplate) {
        setDuplicateModal({ isOpen: false, template: null });
        loadTemplates(); // Recarregar lista
      } else {
        alert('Erro ao duplicar template');
      }
    } catch (error: any) {
      console.error('Erro ao duplicar template:', error);
      alert('Erro ao duplicar template: ' + (error?.response?.data?.error || error.message));
    } finally {
      setIsDuplicating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates de Relatórios</h1>
          <p className="text-gray-600 mt-1">
            Gerencie e crie templates personalizados para seus laudos
          </p>
        </div>
        <button
          onClick={() => openTemplateEditor()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Palette className="h-4 w-4" />
          Novo Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id || Math.random().toString(36).slice(2)}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            {/* Template Icon */}
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>

            {/* Template Info */}
            <div className="space-y-2 mb-4">
              <h3 className="font-semibold text-gray-900">{template.name}</h3>
              <p className="text-sm text-gray-500">{template.type}</p>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Modificado: {template.lastModified}</span>
                <span>{template.size} KB</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => previewTemplate(template)}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors shadow-sm hover:shadow-md"
                title="Visualizar PDF"
              >
                <Eye className="h-5 w-5" />
              </button>
              <button
                onClick={() => openTemplateEditor(template.id)}
                className="w-10 h-10 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center transition-colors shadow-sm hover:shadow-md"
                title="Editar no Editor"
              >
                <Palette className="h-5 w-5" />
              </button>
              <button
                onClick={() => duplicateTemplate(template)}
                className="w-10 h-10 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center justify-center transition-colors shadow-sm hover:shadow-md"
                title="Duplicar template"
              >
                <Copy className="h-5 w-5" />
              </button>
              <button
                onClick={() => deleteTemplate(template)}
                className="w-10 h-10 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center transition-colors shadow-sm hover:shadow-md"
                title="Deletar template"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {templates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum template encontrado
          </h3>
          <p className="text-gray-500 mb-4">
            Comece criando seu primeiro template personalizado
          </p>
          <button
            onClick={() => openTemplateEditor()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center gap-2 transition-colors"
          >
            <Palette className="h-4 w-4" />
            Criar Primeiro Template
          </button>
        </div>
      )}

      {/* Modal de Confirmação para Deletar */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        title="Deletar Template"
        message={`Tem certeza que deseja deletar o template "${deleteModal.template?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, template: null })}
        confirmText="Deletar"
        cancelText="Cancelar"
        isDangerous={true}
        isLoading={isDeleting}
      />

      {/* Modal de Confirmação para Duplicar */}
      <ConfirmationModal
        isOpen={duplicateModal.isOpen}
        title="Duplicar Template"
        message={`Tem certeza que deseja criar uma cópia do template "${duplicateModal.template?.name}"?`}
        onConfirm={handleConfirmDuplicate}
        onCancel={() => setDuplicateModal({ isOpen: false, template: null })}
        confirmText="Duplicar"
        cancelText="Cancelar"
        isDangerous={false}
        isLoading={isDuplicating}
      />

      {/* Modal de Preview Visual */}
      <TemplatePreviewModal
        isOpen={previewModal.isOpen}
        template={previewModal.template}
        onClose={() => setPreviewModal({ isOpen: false, template: null })}
      />
    </div>
  );
};

export default Templates;