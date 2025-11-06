import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useTemplateStorage } from '../../../hooks/useTemplateStorage';
import { apiService } from '../../../services/api';
import { EditorTemplate } from '../../../types/editor';

// Mock do apiService
vi.mock('../../../services/api', () => ({
  apiService: {
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    }
  }
}));

// Mock template completo para testes de integração
const mockCompleteTemplate: EditorTemplate = {
  id: 'template_integration_123',
  name: 'Template de Integração',
  description: 'Template para testes de integração completos',
  category: 'integration-test',
  elements: [
    {
      id: 'text_element_1',
      type: 'text',
      content: 'Título Principal',
      position: { x: 100, y: 50 },
      size: { width: 300, height: 40 },
      styles: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333333',
        textAlign: 'center'
      },
      locked: false,
      visible: true,
      zIndex: 1
    },
    {
      id: 'image_element_1',
      type: 'image',
      content: {
        src: 'https://example.com/test-image.jpg',
        alt: 'Imagem de teste',
        originalSize: { width: 400, height: 300 }
      },
      position: { x: 50, y: 120 },
      size: { width: 200, height: 150 },
      styles: {
        border: {
          width: 2,
          style: 'solid',
          color: '#cccccc'
        }
      },
      locked: false,
      visible: true,
      zIndex: 2
    },
    {
      id: 'table_element_1',
      type: 'table',
      content: {
        rows: 3,
        columns: 2,
        data: [
          ['Nome', 'Valor'],
          ['Item 1', 'R$ 100,00'],
          ['Item 2', 'R$ 200,00']
        ],
        headers: ['Nome', 'Valor']
      },
      position: { x: 300, y: 120 },
      size: { width: 250, height: 120 },
      styles: {
        fontSize: 12,
        border: {
          width: 1,
          style: 'solid',
          color: '#000000'
        }
      },
      locked: false,
      visible: true,
      zIndex: 3
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
  updatedAt: new Date('2024-01-01T12:00:00Z'),
  createdBy: 'user_123',
  version: 1,
  isPublic: false,
  tags: ['integration', 'test', 'complete']
};

const mockSaveResponse = {
  data: {
    data: {
      template: {
        ...mockCompleteTemplate,
        id: 'template_saved_456',
        updatedAt: new Date().toISOString()
      }
    }
  }
};

const mockExportResponse = {
  data: {
    data: {
      url: 'https://example.com/exports/template_integration_123.pdf',
      filename: 'template_integration_123.pdf',
      format: 'pdf'
    }
  }
};

describe('Template Persistence Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Fluxo completo de persistência de template', () => {
    it('deve realizar ciclo completo de salvar, carregar e exportar template', async () => {
      // Configurar mocks sequencialmente
      const mockApiPost = apiService.api.post as any;
      const mockApiGet = apiService.api.get as any;
      
      // Mock para salvar (novo template)
      mockApiPost.mockResolvedValueOnce(mockSaveResponse);
      
      // Mock para carregar
      mockApiGet.mockResolvedValueOnce({
        data: { data: { template: mockCompleteTemplate } }
      });
      
      // Mock para exportar
      mockApiPost.mockResolvedValueOnce(mockExportResponse);

      const { result } = renderHook(() => useTemplateStorage());

      // 1. Salvar template (novo)
      const newTemplate = { ...mockCompleteTemplate, id: '' };
      let savedTemplate: EditorTemplate | undefined;
      
      await act(async () => {
        savedTemplate = await result.current.saveTemplate(newTemplate, {
          name: 'Template Integração Completa',
          description: 'Template para teste de integração completo'
        });
      });

      expect(savedTemplate).toBeDefined();
      expect(mockApiPost).toHaveBeenCalledWith('/editor-templates', expect.objectContaining({
        name: 'Template Integração Completa',
        description: 'Template para teste de integração completo',
        elements: newTemplate.elements
      }));

      // 2. Carregar template salvo
      let loadedTemplate: EditorTemplate | undefined;
      await act(async () => {
        loadedTemplate = await result.current.loadTemplate('template_saved_456');
      });

      expect(loadedTemplate).toBeDefined();
      expect(loadedTemplate?.elements).toHaveLength(mockCompleteTemplate.elements.length);
      expect(mockApiGet).toHaveBeenCalledWith('/editor-templates/template_saved_456');

      // 3. Exportar template
      let exportResult;
      await act(async () => {
        exportResult = await result.current.exportTemplate(mockCompleteTemplate, {
          format: 'pdf',
          quality: 100,
          dpi: 300
        });
      });

      expect(exportResult).toBeDefined();
      expect(exportResult?.format).toBe('pdf');
      expect(mockApiPost).toHaveBeenCalledWith(
        `/editor-templates/${mockCompleteTemplate.id}/export`,
        expect.objectContaining({
          format: 'pdf',
          quality: 100,
          dpi: 300
        })
      );

      // Verificar que não há erros
      expect(result.current.error).toBeNull();
    });

    it('deve validar integridade dos dados durante persistência', async () => {
      const mockApiPost = apiService.api.post as any;
      const mockApiPut = apiService.api.put as any;
      
      // Mock para validação
      mockApiPost.mockResolvedValueOnce({ data: { data: { isValid: true } } });
      
      // Mock para salvamento (template existente - PUT)
      mockApiPut.mockResolvedValueOnce(mockSaveResponse);

      const { result } = renderHook(() => useTemplateStorage());

      // Validar template antes de salvar
      let isValid: boolean | undefined;
      await act(async () => {
        isValid = await result.current.validateTemplate(mockCompleteTemplate);
      });

      expect(isValid).toBe(true);
      expect(mockApiPost).toHaveBeenCalledWith('/editor-templates/validate', mockCompleteTemplate);

      // Salvar após validação (template existente - usar PUT)
      await act(async () => {
        await result.current.saveTemplate(mockCompleteTemplate);
      });

      expect(mockApiPut).toHaveBeenCalledWith(
        `/editor-templates/${mockCompleteTemplate.id}`,
        expect.objectContaining({
          elements: mockCompleteTemplate.elements,
          globalStyles: mockCompleteTemplate.globalStyles,
          pageSettings: mockCompleteTemplate.pageSettings
        })
      );
    });

    it('deve tratar erros de rede durante operações', async () => {
      const networkError = { request: {} };
      const mockApiPost = apiService.api.post as any;
      
      // Mock para erro de rede (novo template)
      mockApiPost.mockRejectedValue(networkError);

      const { result } = renderHook(() => useTemplateStorage());

      const newTemplate = { ...mockCompleteTemplate, id: '' };
      
      await act(async () => {
        try {
          await result.current.saveTemplate(newTemplate);
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

  describe('Integridade dos dados após persistência', () => {
    it('deve preservar estrutura completa do template após ciclo de persistência', async () => {
      const mockApiPut = apiService.api.put as any;
      const mockApiGet = apiService.api.get as any;
      
      // Mock para salvar (template existente - PUT)
      mockApiPut.mockResolvedValueOnce(mockSaveResponse);
      
      // Mock para carregar
      mockApiGet.mockResolvedValueOnce({
        data: { data: { template: mockCompleteTemplate } }
      });

      const { result } = renderHook(() => useTemplateStorage());

      // Salvar template existente
      let savedTemplate: EditorTemplate | undefined;
      await act(async () => {
        savedTemplate = await result.current.saveTemplate(mockCompleteTemplate, {
          name: 'Template Integridade'
        });
      });

      // Verificar dados salvos
      const saveCall = mockApiPut.mock.calls[0];
      const savedData = saveCall[1];
      
      expect(savedData.elements).toHaveLength(mockCompleteTemplate.elements.length);
      expect(savedData.globalStyles).toEqual(mockCompleteTemplate.globalStyles);
      expect(savedData.pageSettings).toEqual(mockCompleteTemplate.pageSettings);
      expect(savedData.name).toBe('Template Integridade');

      // Carregar template salvo
      let loadedTemplate: EditorTemplate | undefined;
      await act(async () => {
        loadedTemplate = await result.current.loadTemplate('template_saved_456');
      });

      // Verificar integridade dos dados carregados
      expect(loadedTemplate?.elements).toHaveLength(mockCompleteTemplate.elements.length);
      expect(loadedTemplate?.elements[0].content).toBe(mockCompleteTemplate.elements[0].content);
      expect(loadedTemplate?.elements[0].styles).toEqual(mockCompleteTemplate.elements[0].styles);
      expect(loadedTemplate?.globalStyles).toEqual(mockCompleteTemplate.globalStyles);
    });

    it('deve manter precisão de posicionamento e dimensões', async () => {
      const templateWithPrecisePositions = {
        ...mockCompleteTemplate,
        elements: [
          {
            ...mockCompleteTemplate.elements[0],
            position: { x: 123.456, y: 789.012 },
            size: { width: 234.567, height: 45.678 }
          }
        ]
      };

      const mockApiPut = apiService.api.put as any;
      const mockApiGet = apiService.api.get as any;
      
      // Mock para salvar (template existente)
      mockApiPut.mockResolvedValueOnce({
        data: { data: { template: templateWithPrecisePositions } }
      });
      
      // Mock para carregar
      mockApiGet.mockResolvedValueOnce({
        data: { data: { template: templateWithPrecisePositions } }
      });

      const { result } = renderHook(() => useTemplateStorage());

      // Salvar template com posições precisas
      await act(async () => {
        await result.current.saveTemplate(templateWithPrecisePositions);
      });

      // Carregar template
      let loadedTemplate: EditorTemplate | undefined;
      await act(async () => {
        loadedTemplate = await result.current.loadTemplate('template_123');
      });

      // Verificar precisão mantida
      expect(loadedTemplate?.elements[0].position.x).toBe(123.456);
      expect(loadedTemplate?.elements[0].position.y).toBe(789.012);
      expect(loadedTemplate?.elements[0].size.width).toBe(234.567);
      expect(loadedTemplate?.elements[0].size.height).toBe(45.678);
    });

    it('deve validar consistência de dados complexos', async () => {
      const complexTemplate = {
        ...mockCompleteTemplate,
        elements: [
          ...mockCompleteTemplate.elements,
          {
            id: 'complex_table',
            type: 'table' as const,
            content: {
              rows: 5,
              columns: 4,
              data: [
                ['Col1', 'Col2', 'Col3', 'Col4'],
                ['R1C1', 'R1C2', 'R1C3', 'R1C4'],
                ['R2C1', 'R2C2', 'R2C3', 'R2C4'],
                ['R3C1', 'R3C2', 'R3C3', 'R3C4'],
                ['R4C1', 'R4C2', 'R4C3', 'R4C4']
              ],
              headers: ['Col1', 'Col2', 'Col3', 'Col4']
            },
            position: { x: 400, y: 300 },
            size: { width: 300, height: 150 },
            styles: {
              fontSize: 10,
              border: { width: 1, style: 'solid', color: '#000000' }
            },
            locked: false,
            visible: true,
            zIndex: 4
          }
        ]
      };

      const mockApiPut = apiService.api.put as any;
      const mockApiGet = apiService.api.get as any;
      
      // Mock para salvar template complexo (existente)
      mockApiPut.mockResolvedValueOnce({
        data: { data: { template: complexTemplate } }
      });
      
      // Mock para carregar
      mockApiGet.mockResolvedValueOnce({
        data: { data: { template: complexTemplate } }
      });

      const { result } = renderHook(() => useTemplateStorage());

      // Salvar template complexo
      await act(async () => {
        await result.current.saveTemplate(complexTemplate);
      });

      // Carregar e verificar dados da tabela
      let loadedTemplate: EditorTemplate | undefined;
      await act(async () => {
        loadedTemplate = await result.current.loadTemplate('template_123');
      });

      const tableElement = loadedTemplate?.elements.find(el => el.id === 'complex_table');
      expect(tableElement).toBeDefined();
      expect(tableElement?.type).toBe('table');
      
      const tableContent = tableElement?.content as any;
      expect(tableContent.rows).toBe(5);
      expect(tableContent.columns).toBe(4);
      expect(tableContent.data).toHaveLength(5);
      expect(tableContent.data[0]).toEqual(['Col1', 'Col2', 'Col3', 'Col4']);
    });
  });
});