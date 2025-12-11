import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTemplateStorage } from '../hooks/useTemplateStorage';

// Mock apiService
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

describe('Table persistence end-to-end (mocked API)', () => {
  const tableElement = {
    id: 'el-table-1',
    type: 'table',
    position: { x: 10, y: 20 },
    size: { width: 400, height: 200 },
    rotation: 0,
    zIndex: 1,
    locked: false,
    visible: true,
    properties: {
      dataSource: '{{sensorData}}',
      columns: [
        { field: 'timestamp', header: 'Data/Hora', width: 150, align: 'left', format: 'date' },
        { field: 'temperature', header: 'Temperatura (°C)', width: 120, align: 'right', format: 'temperature', decimalPlaces: 2 }
      ],
      showHeader: true,
      alternatingRowColors: true,
      borderStyle: 'grid',
      fontSize: 10,
      fontFamily: 'Arial',
      maxRows: 20,
      pageBreak: false
    }
  } as any;

  const template = {
    id: 'existing-123',
    name: 'Template with table',
    elements: [tableElement],
    pages: [],
    globalStyles: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
    version: 1,
    isPublic: false,
    tags: []
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves and loads a template with table properties preserved', async () => {
    const { result } = renderHook(() => useTemplateStorage());
    const { apiService } = await import('../services/api');

    // Mock PUT (update) response
    (apiService.api.put as any).mockResolvedValue({ data: { data: { template } } });

    // Call saveTemplate (will call api.put because id doesn't start with 'template-')
    await act(async () => {
      const saved = await result.current.saveTemplate(template, { name: template.name });
      expect(saved.id).toBe(template.id);
    });

    // Now mock GET to return the same template
    (apiService.api.get as any).mockResolvedValue({ data: { data: { template } } });

    await act(async () => {
      const loaded = await result.current.loadTemplate(template.id);
      expect(loaded).toBeDefined();
      expect(Array.isArray(loaded.elements)).toBe(true);
      const el = loaded.elements.find((e: any) => e.id === tableElement.id);
      expect(el).toBeDefined();
      expect(el.properties).toBeDefined();
      expect(el.properties.columns).toHaveLength(2);
      expect(el.properties.showHeader).toBe(true);
      expect(el.properties.maxRows).toBe(20);
    });
  });
});
