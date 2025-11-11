import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import PreviewModal from '../components/Modals/PreviewModal';
import { EditorTemplate } from '../../../types/editor';

// Mock das dependências
vi.mock('../../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    showExportSuccess: vi.fn(),
    showError: vi.fn()
  })
}));

vi.mock('../../../services/api', () => ({
  apiService: {
    api: {
      post: vi.fn()
    }
  }
}));

describe('PreviewModal', () => {
  const mockTemplate: EditorTemplate = {
    id: 'test-template',
    name: 'Test Template',
    category: 'test',
    createdBy: 'test-user',
    version: 1,
    isPublic: false,
    tags: [],
  elements: [],
  pages: [],
    pageSettings: {
      size: 'A4',
      orientation: 'portrait',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      backgroundColor: '#ffffff',
      showMargins: true
    },
    globalStyles: {
      fontFamily: 'Arial',
      fontSize: 12,
      color: '#000000',
      backgroundColor: '#ffffff',
      lineHeight: 1.2
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    template: mockTemplate
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render preview modal when open', () => {
    render(<PreviewModal {...defaultProps} />);

    expect(screen.getByText('Preview - Test Template')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<PreviewModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Preview do Template')).not.toBeInTheDocument();
  });

  it('should have zoom controls', () => {
    render(<PreviewModal {...defaultProps} />);

    expect(screen.getByTitle('Aumentar zoom')).toBeInTheDocument();
    expect(screen.getByTitle('Diminuir zoom')).toBeInTheDocument();
    expect(screen.getByTitle('Ajustar à tela')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();

    render(<PreviewModal {...defaultProps} onClose={mockOnClose} />);

    const closeButton = screen.getByTitle('Fechar preview');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});