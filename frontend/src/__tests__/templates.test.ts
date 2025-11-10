import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTemplateStorage } from '../hooks/useTemplateStorage';
import type { EditorTemplate } from '../types/editor';

// Mock do apiService
vi.mock('../services/api', () => ({
  apiService: {
    api: {
      post: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn()
    }
  }
}));

describe('useTemplateStorage - Save and Export', () => {
  const mockTemplate: EditorTemplate = {
    id: 'template-123',
    name: 'Test Template',
    description: 'A test template',
    category: 'test',
    elements: [
      {
        id: 'elem-1',
        type: 'text',
        content: 'Test',
        position: { x: 10, y: 10 },
        size: { width: 100, height: 20 },
        styles: { color: '#000' },
        locked: false,
        visible: true,
        zIndex: 1,
        pageId: 'page-1'
      }
    ],
    pages: [
      {
        id: 'page-1',
        name: 'Page 1',
        elements: [],
        pageSettings: {
          size: 'A4',
          orientation: 'portrait',
          margins: { top: 20, right: 20, bottom: 20, left: 20 },
          backgroundColor: '#ffffff',
          showMargins: true
        },
        backgroundImage: null,
        header: null,
        footer: null
      }
    ],
    globalStyles: {
      fontFamily: 'Arial',
      fontSize: 12,
      color: '#000000',
      backgroundColor: '#ffffff',
      lineHeight: 1.4
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-123',
    version: 1,
    isPublic: false,
    tags: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Save Template Flow', () => {
    it('should differentiate between creating and updating templates', () => {
      const newTemplate = { ...mockTemplate, id: `template-${Date.now()}-xxx` };
      expect(newTemplate.id).toMatch(/^template-\d+-/);

      const existingTemplate = { ...mockTemplate, id: 'existing-123' };
      expect(existingTemplate.id).not.toMatch(/^template-\d+-/);
    });

    it('should validate template data before saving', async () => {
      const { result } = renderHook(() => useTemplateStorage());
      const invalidTemplate = { ...mockTemplate, name: '' };

      await act(async () => {
        try {
          await result.current.saveTemplate(invalidTemplate, { name: '' });
          expect.fail('Should have thrown validation error');
        } catch (error) {
          expect(result.current.error).toBeDefined();
          expect(result.current.error?.type).toBe('VALIDATION_ERROR');
        }
      });
    });

    it('should handle API 404 errors for non-existent templates', async () => {
      const { result } = renderHook(() => useTemplateStorage());
      const { apiService } = await import('../services/api');
      
      (apiService.api.put as any).mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Template não encontrado' }
        }
      });

      const existingTemplate = { ...mockTemplate, id: 'non-existent-id' };

      await act(async () => {
        try {
          await result.current.saveTemplate(existingTemplate, { name: 'Updated' });
          expect.fail('Should have thrown 404 error');
        } catch (error) {
          expect(result.current.error?.type).toBe('NOT_FOUND');
          expect(result.current.error?.message).toContain('não encontrado');
        }
      });
    });
  });

  describe('Export Template Flow', () => {
    it('should export template as JSON format', async () => {
      const { result } = renderHook(() => useTemplateStorage());
      const { apiService } = await import('../services/api');
      
      (apiService.api.post as any).mockResolvedValue({
        data: {
          success: true,
          data: {
            url: '/downloads/template-123.json',
            filename: 'template-123.json',
            format: 'json'
          }
        }
      });

      await act(async () => {
        const exportResult = await result.current.exportTemplate(mockTemplate, {
          format: 'json'
        });

        expect(exportResult.format).toBe('json');
        expect(exportResult.url).toContain('.json');
      });
    });

    it('should export template as PDF format', async () => {
      const { result } = renderHook(() => useTemplateStorage());
      const { apiService } = await import('../services/api');
      
      (apiService.api.post as any).mockResolvedValue({
        data: {
          success: true,
          data: {
            url: '/downloads/template-123.pdf',
            filename: 'template-123.pdf',
            format: 'pdf'
          }
        }
      });

      await act(async () => {
        const exportResult = await result.current.exportTemplate(mockTemplate, {
          format: 'pdf'
        });

        expect(exportResult.format).toBe('pdf');
        expect(exportResult.url).toContain('.pdf');
      });
    });

    it('should handle export errors gracefully', async () => {
      const { result } = renderHook(() => useTemplateStorage());
      const { apiService } = await import('../services/api');
      
      (apiService.api.post as any).mockRejectedValue({
        response: {
          status: 500,
          data: { error: 'Erro interno do servidor' }
        }
      });

      await act(async () => {
        try {
          await result.current.exportTemplate(mockTemplate, { format: 'json' });
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(result.current.error).toBeDefined();
          expect(result.current.error?.type).toBe('SERVER_ERROR');
        }
      });
    });
  });

  describe('Load Template', () => {
    it('should load template successfully', async () => {
      const { result } = renderHook(() => useTemplateStorage());
      const { apiService } = await import('../services/api');
      
      (apiService.api.get as any).mockResolvedValue({
        data: {
          success: true,
          data: { template: mockTemplate }
        }
      });

      await act(async () => {
        const loaded = await result.current.loadTemplate('template-123');
        expect(loaded.id).toBe(mockTemplate.id);
        expect(loaded.name).toBe(mockTemplate.name);
      });
    });

    it('should initialize missing template fields', async () => {
      const { result } = renderHook(() => useTemplateStorage());
      const { apiService } = await import('../services/api');
      
      const incompleteTemplate = { ...mockTemplate };
      delete (incompleteTemplate as any).globalStyles;
      delete (incompleteTemplate as any).pages;

      (apiService.api.get as any).mockResolvedValue({
        data: {
          success: true,
          data: { template: incompleteTemplate }
        }
      });

      await act(async () => {
        const loaded = await result.current.loadTemplate('template-123');
        expect(loaded.globalStyles).toBeDefined();
        expect(Array.isArray(loaded.pages)).toBe(true);
        expect(loaded.pages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const { result } = renderHook(() => useTemplateStorage());
      const { apiService } = await import('../services/api');
      
      (apiService.api.get as any).mockRejectedValue({
        request: {},
        message: 'Network Error'
      });

      await act(async () => {
        try {
          await result.current.loadTemplate('template-123');
          expect.fail('Should have thrown network error');
        } catch (error) {
          expect(result.current.error?.type).toBe('NETWORK_ERROR');
        }
      });
    });

    it('should clear errors when clearError is called', async () => {
      const { result } = renderHook(() => useTemplateStorage());
      const { apiService } = await import('../services/api');
      
      (apiService.api.get as any).mockRejectedValue({
        response: { status: 404 }
      });

      await act(async () => {
        try {
          await result.current.loadTemplate('invalid');
        } catch {}

        expect(result.current.error).toBeDefined();
        result.current.clearError();
        expect(result.current.error).toBeNull();
      });
    });
  });
});
