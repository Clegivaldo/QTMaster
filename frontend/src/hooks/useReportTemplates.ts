import { useState, useCallback, useEffect } from 'react';
import { ReportTemplate, TemplateVariable, TemplateSection, TemplateStyle } from '../types/report';
import { api } from '../services/api';

export const useReportTemplates = () => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<ReportTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Carregar templates
  const loadTemplates = useCallback(async (filters?: {
    clientId?: string;
    type?: string;
    category?: string;
    isActive?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getReportTemplates(filters);
      setTemplates(response.data);
    } catch (err) {
      setError('Erro ao carregar templates');
      console.error('Erro ao carregar templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar template por ID
  const loadTemplateById = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getReportTemplateById(id);
      setCurrentTemplate(response.data);
      return response.data;
    } catch (err) {
      setError('Erro ao carregar template');
      console.error('Erro ao carregar template:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Criar novo template
  const createTemplate = useCallback(async (
    template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    setSaving(true);
    setError(null);
    try {
      const response = await api.createReportTemplate(template);
      
      // Atualizar lista de templates
      setTemplates(prev => [...prev, response.data]);
      setCurrentTemplate(response.data);
      
      return response.data;
    } catch (err) {
      setError('Erro ao criar template');
      console.error('Erro ao criar template:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  // Atualizar template
  const updateTemplate = useCallback(async (
    id: string,
    template: Partial<ReportTemplate>
  ) => {
    setSaving(true);
    setError(null);
    try {
      const response = await api.updateReportTemplate(id, template);
      
      // Atualizar lista de templates
      setTemplates(prev => prev.map(t =>
        t.id === id ? { ...t, ...response.data } : t
      ));
      
      // Atualizar template atual se for o mesmo
      if (currentTemplate?.id === id) {
        setCurrentTemplate(prev => prev ? { ...prev, ...response.data } : null);
      }
      
      return response.data;
    } catch (err) {
      setError('Erro ao atualizar template');
      console.error('Erro ao atualizar template:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [currentTemplate]);

  // Excluir template
  const deleteTemplate = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.deleteReportTemplate(id);
      
      // Remover da lista
      setTemplates(prev => prev.filter(t => t.id !== id));
      
      // Limpar template atual se for o mesmo
      if (currentTemplate?.id === id) {
        setCurrentTemplate(null);
      }
    } catch (err) {
      setError('Erro ao excluir template');
      console.error('Erro ao excluir template:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentTemplate]);

  // Duplicar template
  const duplicateTemplate = useCallback(async (id: string, newName?: string) => {
    setSaving(true);
    setError(null);
    try {
      const response = await api.duplicateReportTemplate(id, newName);
      
      // Adicionar à lista
      setTemplates(prev => [...prev, response.data]);
      
      return response.data;
    } catch (err) {
      setError('Erro ao duplicar template');
      console.error('Erro ao duplicar template:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  // Atualizar seções do template
  const updateTemplateSections = useCallback(async (
    id: string,
    sections: TemplateSection[]
  ) => {
    setSaving(true);
    setError(null);
    try {
      const response = await api.updateTemplateSections(id, sections);
      
      // Atualizar template atual
      if (currentTemplate?.id === id) {
        setCurrentTemplate(prev => prev ? { ...prev, sections } : null);
      }
      
      return response.data;
    } catch (err) {
      setError('Erro ao atualizar seções do template');
      console.error('Erro ao atualizar seções do template:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [currentTemplate]);

  // Atualizar variáveis do template
  const updateTemplateVariables = useCallback(async (
    id: string,
    variables: TemplateVariable[]
  ) => {
    setSaving(true);
    setError(null);
    try {
      const response = await api.updateTemplateVariables(id, variables);
      
      // Atualizar template atual
      if (currentTemplate?.id === id) {
        setCurrentTemplate(prev => prev ? { ...prev, variables } : null);
      }
      
      return response.data;
    } catch (err) {
      setError('Erro ao atualizar variáveis do template');
      console.error('Erro ao atualizar variáveis do template:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [currentTemplate]);

  // Atualizar estilos do template
  const updateTemplateStyles = useCallback(async (
    id: string,
    styles: TemplateStyle
  ) => {
    setSaving(true);
    setError(null);
    try {
      const response = await api.updateTemplateStyles(id, styles);
      
      // Atualizar template atual
      if (currentTemplate?.id === id) {
        setCurrentTemplate(prev => prev ? { ...prev, styles } : null);
      }
      
      return response.data;
    } catch (err) {
      setError('Erro ao atualizar estilos do template');
      console.error('Erro ao atualizar estilos do template:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [currentTemplate]);

  // Validar template
  const validateTemplate = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.validateReportTemplate(id);
      return response.data;
    } catch (err) {
      setError('Erro ao validar template');
      console.error('Erro ao validar template:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Obter preview do template
  const getTemplatePreview = useCallback(async (
    id: string,
    dataId?: string,
    sampleData?: any
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getTemplatePreview(id, dataId, sampleData);
      return response.data;
    } catch (err) {
      setError('Erro ao obter preview do template');
      console.error('Erro ao obter preview do template:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Exportar template
  const exportTemplate = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.exportReportTemplate(id);
      
      // Criar link de download
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json',
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `template_${id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return response.data;
    } catch (err) {
      setError('Erro ao exportar template');
      console.error('Erro ao exportar template:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Importar template
  const importTemplate = useCallback(async (file: File) => {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.importReportTemplate(formData);
      
      // Adicionar à lista
      setTemplates(prev => [...prev, response.data]);
      
      return response.data;
    } catch (err) {
      setError('Erro ao importar template');
      console.error('Erro ao importar template:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  // Obter categorias de template
  const getTemplateCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getTemplateCategories();
      return response.data;
    } catch (err) {
      setError('Erro ao obter categorias de template');
      console.error('Erro ao obter categorias de template:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar templates iniciais
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    currentTemplate,
    isLoading,
    error,
    saving,
    
    // Ações principais
    loadTemplates,
    loadTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    
    // Manipulação de templates
    updateTemplateSections,
    updateTemplateVariables,
    updateTemplateStyles,
    validateTemplate,
    getTemplatePreview,
    
    // Importação/Exportação
    exportTemplate,
    importTemplate,
    getTemplateCategories,
  };
};
