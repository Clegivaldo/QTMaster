import { useState, useCallback, useEffect } from 'react';
import { Template, TemplateSection, TemplateType, TemplateLayout } from '../types/editor';
import { useTemplateEngine } from './useTemplateEngine';
import { api } from '../services/api';

export const useTemplateManager = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { renderTemplate, validateVariables, extractVariables, getAllVariables } = useTemplateEngine();

  // Carregar templates do backend
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getTemplates();
      setTemplates(response.data);
    } catch (err) {
      setError('Erro ao carregar templates');
      console.error('Erro ao carregar templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Criar novo template
  const createTemplate = useCallback(async (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.createTemplate(template);
      const newTemplate = response.data;
      setTemplates(prev => [...prev, newTemplate]);
      return newTemplate;
    } catch (err) {
      setError('Erro ao criar template');
      console.error('Erro ao criar template:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Atualizar template existente
  const updateTemplate = useCallback(async (id: string, updates: Partial<Template>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.updateTemplate(id, updates);
      const updatedTemplate = response.data;
      setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t));
      if (currentTemplate?.id === id) {
        setCurrentTemplate(updatedTemplate);
      }
      return updatedTemplate;
    } catch (err) {
      setError('Erro ao atualizar template');
      console.error('Erro ao atualizar template:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentTemplate]);

  // Deletar template
  const deleteTemplate = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (currentTemplate?.id === id) {
        setCurrentTemplate(null);
      }
    } catch (err) {
      setError('Erro ao deletar template');
      console.error('Erro ao deletar template:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentTemplate]);

  // Duplicar template
  const duplicateTemplate = useCallback(async (id: string, newName: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const templateToDuplicate = templates.find(t => t.id === id);
      if (!templateToDuplicate) {
        throw new Error('Template não encontrado');
      }

      const duplicatedTemplate = await createTemplate({
        ...templateToDuplicate,
        name: newName,
        description: `${templateToDuplicate.description} (Cópia)`,
      });

      return duplicatedTemplate;
    } catch (err) {
      setError('Erro ao duplicar template');
      console.error('Erro ao duplicar template:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [templates, createTemplate]);

  // Renderizar template com dados
  const renderTemplateWithData = useCallback(async (templateId: string, data: any) => {
    const template = templates.find(t => t.id === templateId) || currentTemplate;
    if (!template) {
      throw new Error('Template não encontrado');
    }

    // Validar variáveis antes de renderizar
    const validation = validateVariables(template.content);
    if (validation.errors.length > 0) {
      throw new Error(`Erros de validação: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Renderizar cada seção do template
    const renderedSections: Record<string, string> = {};
    
    // Renderizar conteúdo principal
    renderedSections['content'] = renderTemplate(template.content, data);

    // Renderizar cabeçalho se existir
    if (template.header) {
      renderedSections['header'] = renderTemplate(template.header, data);
    }

    // Renderizar rodapé se existir
    if (template.footer) {
      renderedSections['footer'] = renderTemplate(template.footer, data);
    }

    // Renderizar seções adicionais
    if (template.sections) {
      template.sections.forEach(section => {
        renderedSections[section.id] = renderTemplate(section.content, data);
      });
    }

    return {
      template,
      renderedSections,
      data,
    };
  }, [templates, currentTemplate, renderTemplate, validateVariables]);

  // Gerar PDF a partir do template
  const generatePDF = useCallback(async (templateId: string, data: any, options?: { 
    format?: 'A4' | 'A3' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    margin?: { top: number; right: number; bottom: number; left: number };
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const rendered = await renderTemplateWithData(templateId, data);
      const response = await api.generatePDF({
        templateId,
        data,
        renderedContent: rendered.renderedSections,
        options: options || {
          format: 'A4',
          orientation: 'portrait',
          margin: { top: 20, right: 20, bottom: 20, left: 20 },
        },
      });
      return response.data;
    } catch (err) {
      setError('Erro ao gerar PDF');
      console.error('Erro ao gerar PDF:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [renderTemplateWithData]);

  // Exportar template
  const exportTemplate = useCallback((template: Template): string => {
    return JSON.stringify(template, null, 2);
  }, []);

  // Importar template
  const importTemplate = useCallback((templateJson: string): Template => {
    try {
      const imported = JSON.parse(templateJson) as Template;
      
      // Validar estrutura do template
      if (!imported.name || !imported.content || !imported.type) {
        throw new Error('Template inválido: campos obrigatórios faltando');
      }

      // Criar novo template com ID único
      const newTemplate: Template = {
        ...imported,
        id: `imported_${Date.now()}`,
        name: `${imported.name} (Importado)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return newTemplate;
    } catch (error) {
      throw new Error('Erro ao importar template: formato inválido');
    }
  }, []);

  // Buscar templates por tipo
  const getTemplatesByType = useCallback((type: TemplateType): Template[] => {
    return templates.filter(t => t.type === type);
  }, [templates]);

  // Buscar templates por nome
  const searchTemplates = useCallback((query: string): Template[] => {
    const lowerQuery = query.toLowerCase();
    return templates.filter(t => 
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery)
    );
  }, [templates]);

  // Obter preview do template
  const getTemplatePreview = useCallback((template: Template, sampleData?: any) => {
    try {
      const data = sampleData || getSampleDataForTemplate(template);
      const rendered = renderTemplate(template.content, data);
      return rendered;
    } catch (error) {
      return `<div style="color: red;">Erro ao gerar preview: ${error instanceof Error ? error.message : 'Erro desconhecido'}</div>`;
    }
  }, [renderTemplate]);

  // Obter dados de exemplo para o template
  const getSampleDataForTemplate = (template: Template): any => {
    const variables = extractVariables(template.content);
    const data: any = {};

    variables.forEach(variable => {
      const parts = variable.name.split('.');
      let current = data;
      
      // Criar estrutura aninhada
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }

      // Definir valor de exemplo baseado no tipo
      const lastPart = parts[parts.length - 1];
      switch (variable.type) {
        case 'string':
          current[lastPart] = `Exemplo de ${variable.name}`;
          break;
        case 'number':
          current[lastPart] = Math.floor(Math.random() * 100);
          break;
        case 'date':
          current[lastPart] = new Date().toISOString().split('T')[0];
          break;
        case 'datetime':
          current[lastPart] = new Date().toISOString();
          break;
        case 'boolean':
          current[lastPart] = Math.random() > 0.5;
          break;
        case 'array':
          current[lastPart] = [];
          break;
        default:
          current[lastPart] = `Valor de exemplo`;
      }
    });

    return data;
  };

  // Carregar templates na inicialização
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    currentTemplate,
    isLoading,
    error,
    
    // Ações
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    setCurrentTemplate,
    
    // Renderização
    renderTemplateWithData,
    generatePDF,
    getTemplatePreview,
    
    // Import/Export
    exportTemplate,
    importTemplate,
    
    // Busca
    getTemplatesByType,
    searchTemplates,
    
    // Variáveis disponíveis
    availableVariables: getAllVariables(),
  };
};
