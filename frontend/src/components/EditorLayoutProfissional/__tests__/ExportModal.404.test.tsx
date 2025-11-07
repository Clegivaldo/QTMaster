// React import not required with new JSX transform
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, expect } from 'vitest';

// Mocks das dependências usadas pelo ExportModal
vi.mock('../../../../hooks/useTemplateStorage', () => ({
  useTemplateStorage: () => ({
    exportTemplate: vi.fn().mockRejectedValue({
      response: { status: 404 },
      message: 'Template não encontrado'
    }),
    isLoading: false,
    error: null,
    clearError: vi.fn()
  })
}));

const mockShowError = vi.fn();
vi.mock('../components/Utils/NotificationSystem', () => ({
  useNotifications: () => ({ showExportSuccess: () => {}, showError: mockShowError })
}));

vi.mock('../components/Utils/LoadingOverlay', () => ({
  useLoadingOverlay: () => ({ showExportLoading: () => {}, updateProgress: () => {}, hideLoading: () => {} })
}));

import ExportModal from '../components/Modals/ExportModal';

describe('ExportModal - 404 handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra mensagem amigável quando exportTemplate retorna 404', async () => {
    const template: any = {
      id: 'template_404',
      name: 'Template Teste 404',
      description: '',
      category: 'test',
      elements: [],
      globalStyles: { fontFamily: 'Arial', fontSize: 12, color: '#000', backgroundColor: '#fff', lineHeight: 1.4 },
      pageSettings: { size: 'A4', orientation: 'portrait', margins: { top: 20, right: 20, bottom: 20, left: 20 }, backgroundColor: '#fff', showMargins: true },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user',
      version: 1,
      isPublic: false,
      tags: []
    };

    render(<ExportModal isOpen={true} onClose={() => {}} template={template} />);

    const btn = screen.getByLabelText(/Exportar PDF/i);
    await userEvent.click(btn);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Template não encontrado', expect.any(String));
    });
  });
});
