import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FolderOpen, 
  Tag, 
  Calendar, 
  User, 
  Download,
  Trash2,
  Copy,
  Globe,
  Lock,
  Filter
} from 'lucide-react';
import ResponsiveModal from '../../../ResponsiveModal';
import { EditorTemplate } from '../../../../types/editor';
import { useTemplateStorage } from '../../../../hooks/useTemplateStorage';

interface LoadTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (template: EditorTemplate) => void;
}

interface TemplateListItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isPublic: boolean;
}

interface Filters {
  category: string;
  tags: string[];
  isPublic?: boolean;
  sortBy: 'name' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

const CATEGORIES = [
  { value: '', label: 'Todas as categorias' },
  { value: 'default', label: 'Padrão' },
  { value: 'report', label: 'Relatório' },
  { value: 'invoice', label: 'Fatura' },
  { value: 'certificate', label: 'Certificado' },
  { value: 'letter', label: 'Carta' },
  { value: 'form', label: 'Formulário' },
  { value: 'other', label: 'Outro' }
];

const LoadTemplateModal: React.FC<LoadTemplateModalProps> = ({
  isOpen,
  onClose,
  onLoad
}) => {
  const { 
    getTemplates, 
    loadTemplate, 
    deleteTemplate, 
    duplicateTemplate,
    isLoading, 
    error, 
    clearError 
  } = useTemplateStorage();
  
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<TemplateListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<Filters>({
    category: '',
    tags: [],
    isPublic: undefined,
    sortBy: 'updatedAt',
    sortOrder: 'desc'
  });
  
  // Carregar templates quando modal abrir
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      clearError();
    }
  }, [isOpen]);
  
  // Aplicar filtros e busca
  useEffect(() => {
    let filtered = [...templates];
    
    // Filtro de busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Filtro de categoria
    if (filters.category) {
      filtered = filtered.filter(template => template.category === filters.category);
    }
    
    // Filtro de visibilidade
    if (filters.isPublic !== undefined) {
      filtered = filtered.filter(template => template.isPublic === filters.isPublic);
    }
    
    // Filtro de tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter(template => 
        filters.tags.every(tag => template.tags.includes(tag))
      );
    }
    
    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any = a[filters.sortBy];
      let bValue: any = b[filters.sortBy];
      
      if (filters.sortBy === 'name') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredTemplates(filtered);
  }, [templates, searchQuery, filters]);
  
  const loadTemplates = async () => {
    try {
      const response = await getTemplates({
        page: 1,
        limit: 100
      });
      setTemplates(response.templates);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  };
  
  const handleLoadTemplate = async (templateId: string) => {
    setLoadingTemplate(templateId);
    try {
      const template = await loadTemplate(templateId);
      onLoad(template);
      onClose();
    } catch (error) {
      console.error('Erro ao carregar template:', error);
    } finally {
      setLoadingTemplate(null);
    }
  };
  
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      await deleteTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (error) {
      console.error('Erro ao excluir template:', error);
    }
  };
  
  const handleDuplicateTemplate = async (templateId: string) => {
    try {
      await duplicateTemplate(templateId);
      loadTemplates(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao duplicar template:', error);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };
  
  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Carregar Template"
      size="xl"
    >
      <div className="p-6">
        {/* Barra de busca e filtros */}
        <div className="mb-6 space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar templates por nome, descrição ou tags..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Botão de filtros */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </button>
            
            <p className="text-sm text-gray-500">
              {filteredTemplates.length} de {templates.length} templates
            </p>
          </div>
          
          {/* Painel de filtros */}
          {showFilters && (
            <div className="p-4 bg-gray-50 rounded-md space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Categoria */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Visibilidade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibilidade
                  </label>
                  <select
                    value={filters.isPublic === undefined ? '' : filters.isPublic.toString()}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      isPublic: e.target.value === '' ? undefined : e.target.value === 'true'
                    }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    <option value="false">Privados</option>
                    <option value="true">Públicos</option>
                  </select>
                </div>
                
                {/* Ordenação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ordenar por
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        sortBy: e.target.value as 'name' | 'createdAt' | 'updatedAt'
                      }))}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="updatedAt">Modificação</option>
                      <option value="createdAt">Criação</option>
                      <option value="name">Nome</option>
                    </select>
                    <select
                      value={filters.sortOrder}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        sortOrder: e.target.value as 'asc' | 'desc'
                      }))}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="desc">Desc</option>
                      <option value="asc">Asc</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Lista de templates */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {templates.length === 0 ? (
                <p>Nenhum template encontrado. Crie seu primeiro template!</p>
              ) : (
                <p>Nenhum template corresponde aos filtros aplicados.</p>
              )}
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTemplate === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Nome e visibilidade */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {template.name}
                      </h3>
                      {template.isPublic ? (
                        <Globe className="h-4 w-4 text-green-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Descrição */}
                    {template.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    
                    {/* Metadados */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <FolderOpen className="h-3 w-3" />
                        {getCategoryLabel(template.category)}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(template.updatedAt)}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {template.createdBy}
                      </div>
                    </div>
                    
                    {/* Tags */}
                    {template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                        {template.tags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{template.tags.length - 3} mais
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Ações */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateTemplate(template.id);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                      title="Duplicar"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(template.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Erro da API */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error.message}</p>
          </div>
        )}
        
        {/* Botões */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => selectedTemplate && handleLoadTemplate(selectedTemplate)}
            disabled={!selectedTemplate || loadingTemplate !== null}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loadingTemplate ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Carregando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Carregar Template
              </>
            )}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
};

export default LoadTemplateModal;