import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { EditorTemplate, ExportFormat, ExportOptions } from '../types/editor';

interface TemplateStorageError {
  type: 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'SERVER_ERROR' | 'NOT_FOUND';
  message: string;
  details?: any;
}

interface SaveTemplateData {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
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

interface TemplateListResponse {
  templates: TemplateListItem[];
  total: number;
  page: number;
  limit: number;
}

interface ExportResponse {
  url: string;
  filename: string;
  format: ExportFormat;
}

interface UseTemplateStorageReturn {
  // Estado
  isLoading: boolean;
  error: TemplateStorageError | null;
  
  // Operações de template
  saveTemplate: (template: EditorTemplate, metadata?: SaveTemplateData) => Promise<EditorTemplate>;
  loadTemplate: (templateId: string) => Promise<EditorTemplate>;
  deleteTemplate: (templateId: string) => Promise<void>;
  duplicateTemplate: (templateId: string, newName?: string) => Promise<EditorTemplate>;
  
  // Listagem de templates
  getTemplates: (filters?: TemplateFilters) => Promise<TemplateListResponse>;
  searchTemplates: (query: string) => Promise<TemplateListItem[]>;
  
  // Exportação
  exportTemplate: (template: EditorTemplate, options: ExportOptions) => Promise<ExportResponse>;
  
  // Utilitários
  clearError: () => void;
  validateTemplate: (template: EditorTemplate) => Promise<boolean>;
}

interface TemplateFilters {
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  createdBy?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export const useTemplateStorage = (): UseTemplateStorageReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<TemplateStorageError | null>(null);
  
  const handleError = useCallback((error: any, type: TemplateStorageError['type'] = 'SERVER_ERROR') => {
    console.error('Template storage error:', error);
    
    let message = 'Erro desconhecido';
    let details = error;
    
    if (error.response) {
      // Erro da API
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 400:
          message = data.message || 'Dados inválidos';
          type = 'VALIDATION_ERROR';
          break;
        case 404:
          message = 'Template não encontrado';
          type = 'NOT_FOUND';
          break;
        case 500:
          message = 'Erro interno do servidor';
          type = 'SERVER_ERROR';
          break;
        default:
          message = data.message || `Erro HTTP ${status}`;
      }
      
      details = data;
    } else if (error.request) {
      // Erro de rede
      message = 'Erro de conexão com o servidor';
      type = 'NETWORK_ERROR';
    } else {
      // Outro tipo de erro
      message = error.message || 'Erro desconhecido';
    }
    
    setError({ type, message, details });
  }, []);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  const saveTemplate = useCallback(async (
    template: EditorTemplate, 
    metadata?: SaveTemplateData
  ): Promise<EditorTemplate> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Preparar dados para envio
      const templateData = {
        ...template,
        name: metadata?.name || template.name,
        description: metadata?.description || template.description,
        category: metadata?.category || template.category,
        tags: metadata?.tags || template.tags,
        isPublic: metadata?.isPublic ?? template.isPublic,
        updatedAt: new Date().toISOString()
      };
      
      let response;
      
      if (template.id && template.id.startsWith('template_')) {
        // Template existente - atualizar
        response = await apiService.api.put(`/editor-templates/${template.id}`, templateData);
      } else {
        // Novo template - criar
        const newTemplateData = {
          ...templateData,
          id: undefined, // Deixar o backend gerar o ID
          createdAt: new Date().toISOString(),
          version: 1
        };
        response = await apiService.api.post('/editor-templates', newTemplateData);
      }
      
      const savedTemplate = response.data.data.template;
      return savedTemplate;
      
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);
  
  const loadTemplate = useCallback(async (templateId: string): Promise<EditorTemplate> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.api.get(`/editor-templates/${templateId}`);
      const template = response.data.data.template;
      
      // Converter datas de string para Date
      return {
        ...template,
        createdAt: new Date(template.createdAt),
        updatedAt: new Date(template.updatedAt)
      };
      
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);
  
  const deleteTemplate = useCallback(async (templateId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await apiService.api.delete(`/editor-templates/${templateId}`);
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);
  
  const duplicateTemplate = useCallback(async (
    templateId: string, 
    newName?: string
  ): Promise<EditorTemplate> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.api.post(`/editor-templates/${templateId}/duplicate`, {
        name: newName
      });
      
      const duplicatedTemplate = response.data.data.template;
      
      return {
        ...duplicatedTemplate,
        createdAt: new Date(duplicatedTemplate.createdAt),
        updatedAt: new Date(duplicatedTemplate.updatedAt)
      };
      
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);
  
  const getTemplates = useCallback(async (filters?: TemplateFilters): Promise<TemplateListResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (filters?.category) params.append('category', filters.category);
      if (filters?.tags?.length) params.append('tags', filters.tags.join(','));
      if (filters?.isPublic !== undefined) params.append('isPublic', filters.isPublic.toString());
      if (filters?.createdBy) params.append('createdBy', filters.createdBy);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      
      const response = await apiService.api.get(`/editor-templates?${params.toString()}`);
      return response.data.data;
      
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);
  
  const searchTemplates = useCallback(async (query: string): Promise<TemplateListItem[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.api.get(`/editor-templates/search?q=${encodeURIComponent(query)}`);
      return response.data.data.templates;
      
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);
  
  const exportTemplate = useCallback(async (
    template: EditorTemplate, 
    options: ExportOptions
  ): Promise<ExportResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.api.post(`/editor-templates/${template.id}/export`, {
        format: options.format,
        quality: options.quality,
        dpi: options.dpi,
        includeMetadata: options.includeMetadata
      });
      
      return response.data.data;
      
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);
  
  const validateTemplate = useCallback(async (template: EditorTemplate): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.api.post('/editor-templates/validate', template);
      return response.data.data.isValid;
      
    } catch (error) {
      handleError(error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);
  
  return {
    // Estado
    isLoading,
    error,
    
    // Operações de template
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    duplicateTemplate,
    
    // Listagem de templates
    getTemplates,
    searchTemplates,
    
    // Exportação
    exportTemplate,
    
    // Utilitários
    clearError,
    validateTemplate
  };
};