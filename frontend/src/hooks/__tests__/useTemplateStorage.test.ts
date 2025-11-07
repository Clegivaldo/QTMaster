import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useTemplateStorage } from '../useTemplateStorage';
import { apiService } from '../../services/api';
import { EditorTemplate, ExportFormat } from '../../types/editor';

// Mock do apiService
vi.mock('../../services/api', () => ({
  apiService: {
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    }
  }
}));

// Mock template para testes
const mockTemplate: EditorTemplate = {
  id: 'template_123',
  name: 'Template de Teste',
  description: 'Template para testes unitários',
  category: 'test',
  elements: [
    {
      id: 'element_1',
      type: 'text',
      content: 'Texto de teste',
      position: { x: 100, y: 100 },
      size: { width: 200, height: 50 },
      styles: {
        fontSize: 14,
        color: '#333333'
      },
      locked: false,
      visible: true,
      zIndex: 1
    }
  ],
  globalStyles: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 12,
    color: '#000000',
    backgroundColor: '#ffffff',
    lineHeight: 1.4
  },
  pageSettings: {
    size: 'A4',
    orientation: 'portrait',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    backgroundColor: '#ffffff',
    showMargins: true
  },
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
  createdBy: 'user_123',
  version: 1,
  isPublic: false,
  tags: ['test', 'exemplo']
};

const mockApiResponse = {
  data: {
    data: {
      template: mockTemplate
    }
  }
};

const mockListResponse = {
  data: {
    data: {
      templates: [
        {
          id: 'template_1',
          name: 'Template 1',
          category: 'test',
          tags: ['tag1'],
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z',
          createdBy: 'user_123',
          isPublic: false
        }
      ],
      total: 1,
      page: 1,
      limit: 10
    }
  }
};

const mockExportResponse = {
  data: {
    data: {
      url: 'https://example.com/export/template_123.pdf',
      filename: 'template_123.pdf',
      format: 'pdf' as ExportFormat
    }
  }
};

describe('useTemplateStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure server-validation flag is reset between tests; tests can opt-in by setting it
    (apiService.api as any).__useServerValidation = false;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('saveTemplate', () => {
    it('deve salvar um novo template corretamente', async () => {
      const newTemplate = { ...mockTemplate, id: '' };
      const savedTemplate = { ...mockTemplate, id: 'template_new_123' };
      // Mock implementation: when validation endpoint is called, return valid; otherwise return created template
      (apiService.api.post as any).mockImplementation((url: string, _body?: any) => {
        if (typeof url === 'string' && url.endsWith('/validate')) {
          return Promise.resolve({ data: { data: { isValid: true } } });
        }
        return Promise.resolve({ data: { data: { template: savedTemplate } } });
      });

      const { result } = renderHook(() => useTemplateStorage());

      let savedResult: EditorTemplate | undefined;
      
      await act(async () => {
        savedResult = await result.current.saveTemplate(newTemplate, {
          name: 'Novo Template',
          description: 'Descrição do novo template'
        });
      });

      expect(apiService.api.post).toHaveBeenCalledWith('/editor-templates', expect.objectContaining({
        name: 'Novo Template',
        description: 'Descrição do novo template',
        elements: newTemplate.elements,
        globalStyles: newTemplate.globalStyles,
        pageSettings: newTemplate.pageSettings
      }));

      expect(savedResult).toEqual(savedTemplate);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('deve atualizar um template existente corretamente', async () => {
      const updatedTemplate = { ...mockTemplate, name: 'Template Atualizado' };
      
      (apiService.api.put as any).mockResolvedValue({
        data: { data: { template: updatedTemplate } }
      });

      const { result } = renderHook(() => useTemplateStorage());

      let savedResult: EditorTemplate | undefined;
      
      await act(async () => {
        savedResult = await result.current.saveTemplate(mockTemplate, {
          name: 'Template Atualizado'
        });
      });

      expect(apiService.api.put).toHaveBeenCalledWith(
        `/editor-templates/${mockTemplate.id}`,
        expect.objectContaining({
          name: 'Template Atualizado'
        })
      );

      expect(savedResult).toEqual(updatedTemplate);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('deve tratar erros de validação ao salvar', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            message: 'Dados inválidos',
            details: { field: 'name', error: 'Nome é obrigatório' }
          }
        }
      };

      (apiService.api.post as any).mockRejectedValue(errorResponse);

      const { result } = renderHook(() => useTemplateStorage());

      await act(async () => {
        try {
          await result.current.saveTemplate({ ...mockTemplate, id: '' });
        } catch (error) {
          // Erro esperado
        }
      });

      expect(result.current.error).toEqual({
        type: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: errorResponse.response.data
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('deve tratar erros de rede ao salvar', async () => {
      const networkError = { request: {} };
      (apiService.api.post as any).mockRejectedValue(networkError);

      const { result } = renderHook(() => useTemplateStorage());

      await act(async () => {
        try {
          await result.current.saveTemplate({ ...mockTemplate, id: '' });
        } catch (error) {
          // Erro esperado
        }
      });

      expect(result.current.error).toEqual({
        type: 'NETWORK_ERROR',
        message: 'Erro de conexão com o servidor',
        details: networkError
      });
    });
  });

  describe('loadTemplate', () => {
    it('deve carregar um template corretamente', async () => {
      (apiService.api.get as any).mockResolvedValue(mockApiResponse);

      const { result } = renderHook(() => useTemplateStorage());

      let loadedTemplate: EditorTemplate | undefined;
      
      await act(async () => {
        loadedTemplate = await result.current.loadTemplate('template_123');
      });

      expect(apiService.api.get).toHaveBeenCalledWith('/editor-templates/template_123');
      expect(loadedTemplate).toEqual(expect.objectContaining({
        id: mockTemplate.id,
        name: mockTemplate.name,
        elements: mockTemplate.elements
      }));
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('deve tratar erro 404 ao carregar template inexistente', async () => {
      const notFoundError = {
        response: {
          status: 404,
          data: { message: 'Template não encontrado' }
        }
      };

      (apiService.api.get as any).mockRejectedValue(notFoundError);

      const { result } = renderHook(() => useTemplateStorage());

      await act(async () => {
        try {
          await result.current.loadTemplate('template_inexistente');
        } catch (error) {
          // Erro esperado
        }
      });

      expect(result.current.error).toEqual({
        type: 'NOT_FOUND',
        message: 'Template não encontrado',
        details: notFoundError.response.data
      });
    });

    it('deve converter datas corretamente ao carregar template', async () => {
      const templateWithStringDates = {
        ...mockTemplate,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-02T15:30:00Z'
      };

      (apiService.api.get as any).mockResolvedValue({
        data: { data: { template: templateWithStringDates } }
      });

      const { result } = renderHook(() => useTemplateStorage());

      let loadedTemplate: EditorTemplate | undefined;
      
      await act(async () => {
        loadedTemplate = await result.current.loadTemplate('template_123');
      });

      expect(loadedTemplate?.createdAt).toBeInstanceOf(Date);
      expect(loadedTemplate?.updatedAt).toBeInstanceOf(Date);
      expect(loadedTemplate?.createdAt.toISOString()).toBe('2024-01-01T10:00:00.000Z');
      expect(loadedTemplate?.updatedAt.toISOString()).toBe('2024-01-02T15:30:00.000Z');
    });
  });

  describe('deleteTemplate', () => {
    it('deve deletar um template corretamente', async () => {
      (apiService.api.delete as any).mockResolvedValue({});

      const { result } = renderHook(() => useTemplateStorage());

      await act(async () => {
        await result.current.deleteTemplate('template_123');
      });

      expect(apiService.api.delete).toHaveBeenCalledWith('/editor-templates/template_123');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('deve tratar erro ao deletar template', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { message: 'Erro interno do servidor' }
        }
      };

      (apiService.api.delete as any).mockRejectedValue(serverError);

      const { result } = renderHook(() => useTemplateStorage());

      await act(async () => {
        try {
          await result.current.deleteTemplate('template_123');
        } catch (error) {
          // Erro esperado
        }
      });

      expect(result.current.error).toEqual({
        type: 'SERVER_ERROR',
        message: 'Erro interno do servidor',
        details: serverError.response.data
      });
    });
  });

  describe('getTemplates', () => {
    it('deve listar templates corretamente', async () => {
      (apiService.api.get as any).mockResolvedValue(mockListResponse);

      const { result } = renderHook(() => useTemplateStorage());

      let templateList;
      
      await act(async () => {
        templateList = await result.current.getTemplates();
      });

      expect(apiService.api.get).toHaveBeenCalledWith('/editor-templates?');
      expect(templateList).toEqual(mockListResponse.data.data);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('deve aplicar filtros corretamente na listagem', async () => {
      (apiService.api.get as any).mockResolvedValue(mockListResponse);

      const { result } = renderHook(() => useTemplateStorage());

      const filters = {
        category: 'test',
        tags: ['tag1', 'tag2'],
        isPublic: true,
        page: 2,
        limit: 20,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const
      };
      
      await act(async () => {
        await result.current.getTemplates(filters);
      });

      expect(apiService.api.get).toHaveBeenCalledWith(
        '/editor-templates?category=test&tags=tag1%2Ctag2&isPublic=true&page=2&limit=20&sortBy=name&sortOrder=asc'
      );
    });
  });

  describe('exportTemplate', () => {
    it('deve exportar template em PDF corretamente', async () => {
      // Route validate and export endpoints separately
      (apiService.api.post as any).mockImplementation((url: string, _body?: any) => {
        if (typeof url === 'string' && url.endsWith('/validate')) {
          return Promise.resolve({ data: { data: { isValid: true } } });
        }
        if (typeof url === 'string' && url.includes('/export')) {
          return Promise.resolve(mockExportResponse);
        }
        return Promise.resolve({});
      });

      const { result } = renderHook(() => useTemplateStorage());

      const exportOptions = {
        format: 'pdf' as ExportFormat,
        quality: 100,
        dpi: 300,
        includeMetadata: true
      };

  let exportResult: any;
      
      await act(async () => {
        exportResult = await result.current.exportTemplate(mockTemplate, exportOptions);
      });

      expect(apiService.api.post).toHaveBeenCalledWith(
        `/editor-templates/${mockTemplate.id}/export`,
        exportOptions
      );

      expect(exportResult).toEqual(mockExportResponse.data.data);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('deve exportar template em PNG corretamente', async () => {
      const pngExportResponse = {
        data: {
          data: {
            url: 'https://example.com/export/template_123.png',
            filename: 'template_123.png',
            format: 'png' as ExportFormat
          }
        }
      };

      (apiService.api.post as any).mockImplementation((url: string, _body?: any) => {
        if (typeof url === 'string' && url.endsWith('/validate')) {
          return Promise.resolve({ data: { data: { isValid: true } } });
        }
        if (typeof url === 'string' && url.includes('/export')) {
          return Promise.resolve(pngExportResponse);
        }
        return Promise.resolve({});
      });

      const { result } = renderHook(() => useTemplateStorage());

      const exportOptions = {
        format: 'png' as ExportFormat,
        quality: 90,
        dpi: 150
      };

  let exportResult: any;
      
      await act(async () => {
        exportResult = await result.current.exportTemplate(mockTemplate, exportOptions);
      });

      expect(exportResult?.format).toBe('png');
      expect(exportResult?.url).toContain('.png');
    });

    it('deve tratar erro na exportação', async () => {
      const exportError = {
        response: {
          status: 500,
          data: { message: 'Erro ao gerar exportação' }
        }
      };

      // Ensure validation returns true, but export endpoint fails
      (apiService.api.post as any).mockImplementation((url: string, _body?: any) => {
        if (typeof url === 'string' && url.endsWith('/validate')) {
          return Promise.resolve({ data: { data: { isValid: true } } });
        }
        if (typeof url === 'string' && url.includes('/export')) {
          return Promise.reject(exportError);
        }
        return Promise.resolve({});
      });

      const { result } = renderHook(() => useTemplateStorage());

      const exportOptions = {
        format: 'pdf' as ExportFormat
      };

      await act(async () => {
        try {
          await result.current.exportTemplate(mockTemplate, exportOptions);
        } catch (error) {
          // Erro esperado
        }
      });

      expect(result.current.error).toEqual({
        type: 'SERVER_ERROR',
        message: 'Erro interno do servidor',
        details: exportError.response.data
      });
    });
  });

  describe('validateTemplate', () => {
    it('deve validar template corretamente', async () => {
      const { result } = renderHook(() => useTemplateStorage());

      let isValid;
      
      await act(async () => {
        isValid = await result.current.validateTemplate(mockTemplate);
      });

      // By default validation runs locally and should succeed for the mock template
      expect(isValid).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('deve retornar false quando template é inválido', async () => {
      // Use an obviously invalid template (missing name) to test local validation
      const invalid = { ...mockTemplate, name: '' } as any;

      const { result } = renderHook(() => useTemplateStorage());

      let isValid;
      
      await act(async () => {
        isValid = await result.current.validateTemplate(invalid);
      });

      expect(isValid).toBe(false);
    });

    it('deve retornar false em caso de erro na validação', async () => {
      // When server validation fails, fallback runs local validation. To test a failing case,
      // provide an invalid template (missing required name) and make the API reject.
      (apiService.api.post as any).mockRejectedValue(new Error('Erro de validação'));

      const invalidTemplate = { ...mockTemplate, name: '' } as any;

      const { result } = renderHook(() => useTemplateStorage());

      let isValid;

      await act(async () => {
        isValid = await result.current.validateTemplate(invalidTemplate);
      });

      expect(isValid).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('duplicateTemplate', () => {
    it('deve duplicar template corretamente', async () => {
      const duplicatedTemplate = {
        ...mockTemplate,
        id: 'template_duplicated_123',
        name: 'Template de Teste (Cópia)',
        createdAt: '2024-01-02T10:00:00Z',
        updatedAt: '2024-01-02T10:00:00Z'
      };

      (apiService.api.post as any).mockResolvedValue({
        data: { data: { template: duplicatedTemplate } }
      });

      const { result } = renderHook(() => useTemplateStorage());

  let duplicatedResult: any;
      
      await act(async () => {
        duplicatedResult = await result.current.duplicateTemplate('template_123', 'Template Duplicado');
      });

      expect(apiService.api.post).toHaveBeenCalledWith('/editor-templates/template_123/duplicate', {
        name: 'Template Duplicado'
      });

      expect(duplicatedResult).toEqual(expect.objectContaining({
        id: 'template_duplicated_123',
        name: 'Template de Teste (Cópia)'
      }));
      expect(duplicatedResult?.createdAt).toBeInstanceOf(Date);
      expect(duplicatedResult?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('searchTemplates', () => {
    it('deve buscar templates corretamente', async () => {
      const searchResults = [
        {
          id: 'template_1',
          name: 'Template Encontrado',
          category: 'test',
          tags: ['search'],
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z',
          createdBy: 'user_123',
          isPublic: false
        }
      ];

      (apiService.api.get as any).mockResolvedValue({
        data: { data: { templates: searchResults } }
      });

      const { result } = renderHook(() => useTemplateStorage());

      let searchResult;
      
      await act(async () => {
        searchResult = await result.current.searchTemplates('Template Encontrado');
      });

      expect(apiService.api.get).toHaveBeenCalledWith('/editor-templates/search?q=Template%20Encontrado');
      expect(searchResult).toEqual(searchResults);
    });
  });

  describe('clearError', () => {
    it('deve limpar erro corretamente', async () => {
      // Primeiro, gerar um erro
      (apiService.api.get as any).mockRejectedValue(new Error('Erro de teste'));

      const { result } = renderHook(() => useTemplateStorage());

      await act(async () => {
        try {
          await result.current.loadTemplate('template_inexistente');
        } catch (error) {
          // Erro esperado
        }
      });

      expect(result.current.error).toBeTruthy();

      // Agora limpar o erro
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('estado de loading', () => {
    it('deve gerenciar estado de loading corretamente durante operações', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (apiService.api.get as any).mockReturnValue(promise);

      const { result } = renderHook(() => useTemplateStorage());

      // Iniciar operação assíncrona
      act(() => {
        result.current.loadTemplate('template_123');
      });

      // Verificar que loading está ativo
      expect(result.current.isLoading).toBe(true);

      // Resolver a promise
      await act(async () => {
        resolvePromise!(mockApiResponse);
      });

      // Verificar que loading foi desativado
      expect(result.current.isLoading).toBe(false);
    });
  });
});