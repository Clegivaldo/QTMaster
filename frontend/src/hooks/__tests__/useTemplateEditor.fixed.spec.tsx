import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useTemplateEditor } from '../useTemplateEditor';

// A tiny harness component that exposes the hook for testing
const Harness: React.FC = () => {
  const editor = useTemplateEditor();

  return (
    <div>
      <div data-testid="header-height-page-0">
        {editor.template.pages?.[0]?.header ? String(editor.template.pages[0].header?.height) : 'null'}
      </div>
      <div data-testid="header-height-page-1">
        {editor.template.pages?.[1]?.header ? String(editor.template.pages[1].header?.height) : 'null'}
      </div>
      <div data-testid="pages-count">
        {editor.template.pages?.length || 0}
      </div>

      <button
        onClick={() => {
          editor.updatePageRegions({ height: 20, replicateAcrossPages: false, elements: [] }, null);
        }}
      >
        Set Header 20mm
      </button>

      <button
        onClick={() => {
          editor.updatePageRegions({ height: 10, replicateAcrossPages: true, elements: [] }, null);
        }}
      >
        Replicate Header 10mm
      </button>

      <button
        onClick={() => {
          editor.addPage();
        }}
      >
        Add Page
      </button>
    </div>
  );
};

describe('useTemplateEditor - updatePageRegions', () => {
  it('updates current page header height', async () => {
    render(<Harness />);

    // Initially header should be null
    expect(screen.getByTestId('header-height-page-0').textContent).toBe('null');

    // Click to set header to 20mm on current page
    fireEvent.click(screen.getByText('Set Header 20mm'));

    await waitFor(() => {
      expect(screen.getByTestId('header-height-page-0').textContent).toBe('20');
    });
  });

  it('replicates header across pages when requested', async () => {
    render(<Harness />);

    // Replicate header 10mm across pages
    fireEvent.click(screen.getByText('Replicate Header 10mm'));

    await waitFor(() => {
      expect(screen.getByTestId('header-height-page-0').textContent).toBe('10');
    });

    // Add a new page
    fireEvent.click(screen.getByText('Add Page'));

    await waitFor(() => {
      expect(screen.getByTestId('pages-count').textContent).toBe('2');
      expect(screen.getByTestId('header-height-page-1').textContent).toBe('10');
    });
  });
});
