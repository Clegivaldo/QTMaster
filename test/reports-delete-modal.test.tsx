import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Plus: () => 'PlusIcon',
  Search: () => 'SearchIcon',
  Filter: () => 'FilterIcon',
  FileText: () => 'FileTextIcon',
  Eye: () => 'EyeIcon',
  Edit: () => 'EditIcon',
  Trash2: () => 'TrashIcon',
  Download: () => 'DownloadIcon',
  BarChart3: () => 'ChartIcon',
  FileText: () => 'DocumentIcon',
  Printer: () => 'PrinterIcon',
}));

// Mock hooks
const mockUseReports = vi.fn();
const mockUseDeleteReport = vi.fn();
const mockUseReportStatistics = vi.fn();
const mockUseClients = vi.fn();

vi.mock('../hooks/useReports', () => ({
  useReports: () => mockUseReports(),
  useDeleteReport: () => mockUseDeleteReport(),
  useReportStatistics: () => mockUseReportStatistics(),
  useGeneratePdf: () => mockUseReports(),
  usePreviewPdf: () => mockUseReports(),
  useDownloadReport: () => mockUseReports(),
}));

vi.mock('../hooks/useClients', () => ({
  useClients: () => mockUseClients(),
}));

// Mock components
vi.mock('../components/ReportForm', () => ({
  ReportForm: () => <div>ReportForm</div>,
}));

vi.mock('../components/ReportDetailsModal', () => ({
  ReportDetailsModal: ({ onClose }: { onClose: () => void }) => (
    <div>
      ReportDetailsModal
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('../components/ReportStatisticsCard', () => ({
  ReportStatisticsCard: () => <div>ReportStatisticsCard</div>,
}));

// Mock PageHeader
vi.mock('../components/Layout/PageHeader', () => ({
  default: ({ title }: { title: string }) => <div>PageHeader: {title}</div>,
}));

describe('Reports Page - Delete Modal Functionality', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset mocks
    vi.clearAllMocks();

    // Setup default mock returns
    mockUseReports.mockReturnValue({
      data: {
        reports: [
          {
            id: '1',
            name: 'Test Report',
            status: 'DRAFT',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      },
      isLoading: false,
      error: null,
    });

    mockUseDeleteReport.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isLoading: false,
    });

    mockUseReportStatistics.mockReturnValue({
      data: null,
      isLoading: false,
    });

    mockUseClients.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  const renderReportsPage = () => {
    // Import the component dynamically to avoid hoisting issues
    const { default: Reports } = require('../pages/Reports');

    return render(
      <QueryClientProvider client={queryClient}>
        <Reports />
      </QueryClientProvider>
    );
  };

  it('should show delete modal when delete button is clicked', async () => {
    const user = userEvent.setup();
    renderReportsPage();

    // Find and click delete button
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Check if modal is shown
    expect(screen.getByText('Confirmar Exclusão')).toBeInTheDocument();
    expect(screen.getByText('Tem certeza que deseja excluir o relatório "Test Report"?')).toBeInTheDocument();
  });

  it('should close modal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderReportsPage();

    // Open modal
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    await user.click(cancelButton);

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByText('Confirmar Exclusão')).not.toBeInTheDocument();
    });
  });

  it('should call delete mutation when confirm button is clicked', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    mockUseDeleteReport.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
    });

    const user = userEvent.setup();
    renderReportsPage();

    // Open modal
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Click confirm
    const confirmButton = screen.getByRole('button', { name: /excluir/i });
    await user.click(confirmButton);

    // Should call delete mutation
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('1');
    });

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByText('Confirmar Exclusão')).not.toBeInTheDocument();
    });
  });

  it('should show loading state during deletion', async () => {
    mockUseDeleteReport.mockReturnValue({
      mutateAsync: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
      isLoading: true,
    });

    const user = userEvent.setup();
    renderReportsPage();

    // Open modal
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Confirm button should show loading text
    expect(screen.getByRole('button', { name: /excluindo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /excluindo/i })).toBeDisabled();
  });
});