import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { TemplateElement, ElementType, Position } from '../types/editor';
import { createDefaultElement } from '../types/editor-utils';
import { vi } from 'vitest';

// Mock data for testing
export const mockTextElement: TemplateElement = {
  id: 'text-1',
  type: 'text',
  content: 'Test Text Content',
  position: { x: 100, y: 100 },
  size: { width: 200, height: 50 },
  styles: {
    fontSize: 14,
    color: '#333333',
    fontFamily: 'Arial, sans-serif'
  },
  locked: false,
  visible: true,
  zIndex: 1
};

export const mockImageElement: TemplateElement = {
  id: 'image-1',
  type: 'image',
  content: {
    src: 'test-image.jpg',
    alt: 'Test Image',
    originalSize: { width: 300, height: 200 }
  },
  position: { x: 50, y: 200 },
  size: { width: 300, height: 200 },
  styles: {
    border: {
      width: 1,
      style: 'solid',
      color: '#cccccc'
    }
  },
  locked: false,
  visible: true,
  zIndex: 2
};

export const mockTableElement: TemplateElement = {
  id: 'table-1',
  type: 'table',
  content: {
    rows: 2,
    columns: 3,
    data: [
      ['Header 1', 'Header 2', 'Header 3'],
      ['Row 1 Col 1', 'Row 1 Col 2', 'Row 1 Col 3']
    ],
    headers: ['Header 1', 'Header 2', 'Header 3']
  },
  position: { x: 150, y: 300 },
  size: { width: 400, height: 100 },
  styles: {
    border: {
      width: 1,
      style: 'solid',
      color: '#000000'
    }
  },
  locked: false,
  visible: true,
  zIndex: 3
};

export const mockElements: TemplateElement[] = [
  mockTextElement,
  mockImageElement,
  mockTableElement
];

// Helper function to create test element
export const createTestElement = (
  type: ElementType,
  overrides: Partial<TemplateElement> = {}
): TemplateElement => {
  const defaultElement = createDefaultElement(type);
  return {
    ...defaultElement,
    ...overrides
  };
};

// Helper function to create mock canvas props
export const createMockCanvasProps = (overrides = {}) => ({
  elements: mockElements,
  selectedElementIds: [],
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  onElementSelect: vi.fn(),
  onElementMove: vi.fn(),
  onElementResize: vi.fn(),
  onElementEdit: vi.fn(),
  ...overrides
});

// Custom render function
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, options);

export * from '@testing-library/react';
export { customRender as render };

// Mouse event helpers
export const createMouseEvent = (type: string, clientX = 0, clientY = 0) => {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  });
};

// Drag event helpers
export const simulateDrag = (
  element: Element,
  from: Position,
  to: Position
) => {
  const mouseDown = createMouseEvent('mousedown', from.x, from.y);
  const mouseMove = createMouseEvent('mousemove', to.x, to.y);
  const mouseUp = createMouseEvent('mouseup', to.x, to.y);

  element.dispatchEvent(mouseDown);
  document.dispatchEvent(mouseMove);
  document.dispatchEvent(mouseUp);
};

// Resize event helpers
export const simulateResize = (
  element: Element,
  from: Position,
  to: Position
) => {
  const mouseDown = createMouseEvent('mousedown', from.x, from.y);
  const mouseMove = createMouseEvent('mousemove', to.x, to.y);
  const mouseUp = createMouseEvent('mouseup', to.x, to.y);

  element.dispatchEvent(mouseDown);
  document.dispatchEvent(mouseMove);
  document.dispatchEvent(mouseUp);
};