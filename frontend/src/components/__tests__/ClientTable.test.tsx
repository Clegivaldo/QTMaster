import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ClientTable from '../ClientTable';
import { Client, ClientFilters } from '@/types/client';

const mockClients: Client[] = [
  {
    id: '1',
    name: 'Client One',
    email: 'client1@example.com',
    phone: '(11) 99999-9999',
    address: 'Address 1',
    cnpj: '12.345.678/0001-90',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    _count: { reports: 2, validations: 1 },
  },
  {
    id: '2',
    name: 'Client Two',
    email: 'client2@example.com',
    phone: '(11) 88888-8888',
    address: 'Address 2',
    cnpj: '98.765.432/0001-10',
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    _count: { reports: 0, validations: 3 },
  },
  {
    id: '3',
    name: 'Client Three',
    email: null,
    phone: null,
    address: null,
    cnpj: null,
    createdAt: '2024-01-03T00:00:00.000Z',
    updatedAt: '2024-01-03T00:00:00.000Z',
    _count: { reports: 1, validations: 0 },
  },
];

const mockPagination = {
  page: 1,
  limit: 10,
  total: 3,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

const mockFilters: ClientFilters = {
  search: '',
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 10,
};

const mockOnFiltersChange = vi.fn();
const mockOnEdit = vi.fn();
const mockOnDelete = vi.fn();

describe('ClientTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render clients in desktop table view', () => {
    render(
      <ClientTable
        clients={mockClients}
        pagination={mockPagination}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

  // Check if client names are displayed (desktop + mobile may render duplicates)
  expect(screen.getAllByText('Client One').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Client Two').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Client Three').length).toBeGreaterThan(0);

  // Check if emails are displayed (may render multiple times for mobile/desktop)
  expect(screen.getAllByText('client1@example.com').length).toBeGreaterThan(0);
  expect(screen.getAllByText('client2@example.com').length).toBeGreaterThan(0);

  // Check if phone numbers are displayed (may render multiple times)
  expect(screen.getAllByText('(11) 99999-9999').length).toBeGreaterThan(0);
  expect(screen.getAllByText('(11) 88888-8888').length).toBeGreaterThan(0);

    // Check if CNPJ is displayed
    expect(screen.getByText('12.345.678/0001-90')).toBeInTheDocument();
    expect(screen.getByText('98.765.432/0001-10')).toBeInTheDocument();
  });

  it('should display empty state when no clients', () => {
    render(
      <ClientTable
        clients={[]}
        pagination={{ ...mockPagination, total: 0 }}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

  expect(screen.getAllByText('Nenhum cliente encontrado').length).toBeGreaterThan(0);
  });

  it('should display loading state', () => {
    render(
      <ClientTable
        clients={[]}
        pagination={mockPagination}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isLoading={true}
      />
    );

    // Check for loading skeleton
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('should handle sorting by name', () => {
    render(
      <ClientTable
        clients={mockClients}
        pagination={mockPagination}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const nameHeader = screen.getByText('Nome').closest('th');
    fireEvent.click(nameHeader!);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      sortBy: 'name',
      sortOrder: 'desc', // Should toggle to desc since current is asc
    });
  });

  it('should handle sorting by email', () => {
    render(
      <ClientTable
        clients={mockClients}
        pagination={mockPagination}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const emailHeader = screen.getByText('Email').closest('th');
    fireEvent.click(emailHeader!);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      sortBy: 'email',
      sortOrder: 'asc', // Should be asc since it's a different field
    });
  });

  it('should handle sorting by creation date', () => {
    render(
      <ClientTable
        clients={mockClients}
        pagination={mockPagination}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const createdAtHeader = screen.getByText('Criado em').closest('th');
    fireEvent.click(createdAtHeader!);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });
  });

  it('should call onEdit when edit button is clicked', () => {
    render(
      <ClientTable
        clients={mockClients}
        pagination={mockPagination}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

  const editButtons = screen.getAllByTitle('Editar cliente');
  fireEvent.click(editButtons[0]);

  expect(mockOnEdit).toHaveBeenCalled();
  });

  it('should call onDelete when delete button is clicked', () => {
    // Use a dataset where one client can be deleted (no reports/validations)
    const deletableClients = [
      ...mockClients,
      {
        id: '4',
        name: 'Client Four',
        email: 'client4@example.com',
        phone: '(11) 77777-7777',
        address: 'Address 4',
        cnpj: '00.000.000/0000-00',
        createdAt: '2024-01-04T00:00:00.000Z',
        updatedAt: '2024-01-04T00:00:00.000Z',
        _count: { reports: 0, validations: 0 },
      },
    ];

    render(
      <ClientTable
        clients={deletableClients}
        pagination={mockPagination}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const deleteButtons = screen.getAllByTitle('Excluir cliente');
    // Click the first enabled delete button (components may render mobile+desktop)
    const enabled = deleteButtons.find((b: any) => !b.disabled);
    expect(enabled).toBeTruthy();
    if (enabled) fireEvent.click(enabled);

    expect(mockOnDelete).toHaveBeenCalled();
  });

  it('should disable delete button for clients with reports or validations', () => {
    render(
      <ClientTable
        clients={mockClients}
        pagination={mockPagination}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const deleteButtons = screen.getAllByTitle('Excluir cliente');
    
    // First client has reports, should be disabled
    expect(deleteButtons[0]).toBeDisabled();
    
    // Second client has validations, should be disabled
    expect(deleteButtons[1]).toBeDisabled();
    
    // Third client has reports but we need to check the actual count
    // Client Three has 1 report, so should be disabled
    expect(deleteButtons[2]).toBeDisabled();
  });

  it('should display report and validation counts', () => {
    render(
      <ClientTable
        clients={mockClients}
        pagination={mockPagination}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

  // Check report counts (may be rendered multiple times - just ensure presence)
  expect(screen.getAllByText('2 relatórios').length).toBeGreaterThan(0);
  expect(screen.getAllByText('0 relatórios').length).toBeGreaterThan(0);
  expect(screen.getAllByText('1 relatórios').length).toBeGreaterThan(0);

  // Check validation counts
  expect(screen.getAllByText('1 validações').length).toBeGreaterThan(0);
  expect(screen.getAllByText('3 validações').length).toBeGreaterThan(0);
  expect(screen.getAllByText('0 validações').length).toBeGreaterThan(0);
  });

  it('should display pagination when multiple pages exist', () => {
    const multiPagePagination = {
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    };

    // Render once and normalize container text (safer when text nodes are split)
    const { container } = render(
      <ClientTable
        clients={mockClients}
        pagination={multiPagePagination}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const normalized = (container.textContent || '').replace(/\s+/g, ' ').trim();
    // Be tolerant: ensure pagination block is present and references the total
    expect(normalized.includes('Mostrando')).toBe(true);
    expect(normalized.includes('de 25')).toBe(true);
    expect(normalized.includes('11')).toBe(true);

    // Check page buttons
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should handle page navigation', () => {
    const multiPagePagination = {
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    };

    render(
      <ClientTable
        clients={mockClients}
        pagination={multiPagePagination}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Click next page
    const nextButton = screen.getByText('2');
    fireEvent.click(nextButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      page: 2,
    });
  });

  it('should format dates correctly', () => {
    // Render once and check that there are date-like occurrences in the rendered text.
    const { container: dateContainer } = render(
      <ClientTable
        clients={mockClients}
        pagination={mockPagination}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const text = (dateContainer.textContent || '').replace(/\s+/g, ' ').trim();
    const dateMatches = text.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
    // Expect at least one date per client rendered (mobile + desktop may duplicate)
    expect(dateMatches.length).toBeGreaterThanOrEqual(3);
  });

  it('should display placeholder for missing optional fields', () => {
    render(
      <ClientTable
        clients={mockClients}
        pagination={mockPagination}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Client Three has null email and phone, should show placeholders
    const placeholders = screen.getAllByText('-');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('should display client initials in avatar', () => {
    render(
      <ClientTable
        clients={mockClients}
        pagination={mockPagination}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

  // Check if first letters of client names are displayed
  expect(screen.getAllByText('C').length).toBeGreaterThan(0); // Client One -> C
  });

  it('should not display pagination for single page', () => {
    render(
      <ClientTable
        clients={mockClients}
        pagination={mockPagination}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Should not show pagination controls
    expect(screen.queryByText('Anterior')).not.toBeInTheDocument();
    expect(screen.queryByText('Próximo')).not.toBeInTheDocument();
  });
});