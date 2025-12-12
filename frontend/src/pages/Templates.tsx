import React, { useState, useEffect } from 'react';
import { formatBRShort } from '@/utils/parseDate';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, Eye, Palette, Copy, Trash2, Search } from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
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
  const [filters, setFilters] = useState({ search: '' });
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

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = String(formData.get('search') || '');
    setFilters({ ...filters, search });
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
      <PageHeader
        title="Templates de Relatórios"
        description="Gerencie e crie templates personalizados para seus laudos"
        actions={
          <button
            onClick={() => openTemplateEditor()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Palette className="h-5 w-5 mr-2" />
            Novo Template
          </button>
        }
      />

      {/* Templates Table */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              name="search"
              type="text"
              className="input w-full pl-10"
              placeholder="Buscar templates por nome ou tipo..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value || '' })}
            />
          </div>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modificado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamanho</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(!templates || templates.filter(t => {
                if (!filters.search) return true;
                const s = filters.search.toLowerCase();
                return (t.name || '').toLowerCase().includes(s) || (t.type || '').toLowerCase().includes(s) || (t.filename || '').toLowerCase().includes(s);
              }).length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Nenhum template encontrado</td>
                </tr>
              ) : (
                templates.filter(t => {
                  if (!filters.search) return true;
                  const s = filters.search.toLowerCase();
                  return (t.name || '').toLowerCase().includes(s) || (t.type || '').toLowerCase().includes(s) || (t.filename || '').toLowerCase().includes(s);
                }).map((template) => (
                  <tr key={template.id || Math.random().toString(36).slice(2)} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{template.name}</div>
                        <div className="text-sm text-gray-500">{template.filename}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{template.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{template.lastModified}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{template.size} KB</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => previewTemplate(template)} className="text-gray-700 p-1 rounded hover:bg-gray-100" title="Visualizar PDF"><Eye className="h-4 w-4"/></button>
                        <button onClick={() => openTemplateEditor(template.id)} className="text-blue-700 p-1 rounded hover:bg-blue-50" title="Editar no Editor"><Palette className="h-4 w-4"/></button>
                        <button onClick={() => duplicateTemplate(template)} className="text-purple-700 p-1 rounded hover:bg-purple-50" title="Duplicar template"><Copy className="h-4 w-4"/></button>
                        <button onClick={() => deleteTemplate(template)} className="text-red-700 p-1 rounded hover:bg-red-50" title="Deletar template"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="block md:hidden divide-y divide-gray-200">
          {templates.filter(t => {
            if (!filters.search) return true;
            const s = filters.search.toLowerCase();
            return (t.name || '').toLowerCase().includes(s) || (t.type || '').toLowerCase().includes(s) || (t.filename || '').toLowerCase().includes(s);
          }).map((template) => (
                <div key={template.id || Math.random().toString(36).slice(2)} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{template.name}</div>
                  <div className="text-sm text-gray-500">{template.type} • {template.size} KB</div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => previewTemplate(template)} className="text-gray-700 p-2 rounded hover:bg-gray-100" title="Visualizar PDF"><Eye className="h-4 w-4"/></button>
                  <button onClick={() => openTemplateEditor(template.id)} className="text-blue-700 p-2 rounded hover:bg-blue-50" title="Editar no Editor"><Palette className="h-4 w-4"/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
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