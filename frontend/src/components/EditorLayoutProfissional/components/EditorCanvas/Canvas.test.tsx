import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import Canvas from './Canvas';

// Mock the index export so Canvas's `import { CanvasElement } from '.'` uses this mock
vi.mock('./', () => ({
  CanvasElement: ({ element, onSelect }: any) => (
    // simple DOM representation for testing selection
    (<div data-testid={`canvas-element-${element.id}`} onClick={(e: any) => onSelect?.(element.id, !!(e.ctrlKey || e.metaKey))}>{typeof element.content === 'string' ? element.content : element.type}</div>)
  )
}));

// Minimal mock props matching CanvasProps shape for selection tests
const mockProps: any = {
  elements: [
    {
      id: 'text-1',
      type: 'text' as const,
      position: { x: 10, y: 10 },
      size: { width: 100, height: 20 },
      styles: {},
      content: 'Test Text',
      zIndex: 1,
      visible: true,
      locked: false
    }
  ],
  selectedElementIds: [],
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  onElementSelect: vi.fn(),
  onElementMove: vi.fn(),
  onElementResize: vi.fn(),
  onElementEdit: vi.fn(),
  showGrid: false,
  gridSize: 20,
  snapToGrid: undefined,
  pageSettings: {
    getPageSize: () => ({ width: 210, height: 297 }),
    getPageBounds: () => ({ minX: 20, maxX: 190, minY: 20, maxY: 277 }),
    pageSettings: { orientation: 'portrait' as const, margins: { top: 20, bottom: 20, left: 20, right: 20 } }
  },
  backgroundImage: null,
  onAddElement: vi.fn(),
  showRuler: false,
  onPanChange: vi.fn(),
  onWheel: vi.fn(),
  pageRegions: undefined,
  onUpdatePageRegions: vi.fn(),
  onRegionSelect: vi.fn()
};

describe('Canvas Component - Element Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onElementSelect when element is clicked', () => {
    render(<Canvas {...mockProps} />);

    const textElement = screen.getByTestId('canvas-element-text-1');
    fireEvent.click(textElement);

    expect(mockProps.onElementSelect).toHaveBeenCalledWith('text-1', false);
  });

  it('should select header elements', () => {
    const propsWithHeader = {
      ...mockProps,
      pageRegions: {
        header: {
          height: 20,
          replicateAcrossPages: false,
          elements: [
            {
              id: 'header-element-1',
              type: 'text' as const,
              position: { x: 10, y: 5 },
              size: { width: 100, height: 20 },
              styles: {},
              content: 'Header Text',
              zIndex: 1,
              visible: true,
              locked: false
            }
          ]
        },
        footer: null,
        pageNumberInfo: { current: 1, total: 1 }
      }
    };

    render(<Canvas {...propsWithHeader} />);

    const headerElement = screen.getByTestId('canvas-element-header-element-1');
    fireEvent.click(headerElement);

    expect(mockProps.onElementSelect).toHaveBeenCalledWith('header-element-1', false);
  });
});