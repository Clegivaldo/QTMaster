import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import SelectionHandles from './SelectionHandles';
import { mockTextElement } from '../../../../test/test-utils';

describe('SelectionHandles', () => {
  it('renders without crashing', () => {
    const props = {
      element: mockTextElement,
      zoom: 1,
      onResize: vi.fn(),
      onMove: vi.fn()
    };

    const { container } = render(<SelectionHandles {...props} />);
    expect(container).toBeInTheDocument();
  });
});