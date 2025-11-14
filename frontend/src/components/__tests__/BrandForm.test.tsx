import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrandForm from '../BrandForm';
import { Brand } from '../../../types/equipment';

describe('BrandForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar formulário de criação de marca', () => {
    render(
      <BrandForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar marca/i })).toBeInTheDocument();
  });

  it('deve renderizar formulário de edição de marca', () => {
    const existingBrand: Brand = {
      id: '1',
      name: 'Thermo King',
      description: 'Fabricante de equipamentos de refrigeração',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    render(
      <BrandForm
        brand={existingBrand}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/nome/i)).toHaveValue('Thermo King');
    expect(screen.getByLabelText(/descrição/i)).toHaveValue('Fabricante de equipamentos de refrigeração');
    expect(screen.getByRole('button', { name: /atualizar marca/i })).toBeInTheDocument();
  });

  it('deve validar campo obrigatório nome', async () => {
    render(
      <BrandForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /criar marca/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument();
    });
  });

  it('deve validar comprimento máximo do nome', async () => {
    render(
      <BrandForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const longString = 'A'.repeat(101);
    await userEvent.type(screen.getByLabelText(/nome/i), longString);

    const submitButton = screen.getByRole('button', { name: /criar marca/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/nome muito longo/i)).toBeInTheDocument();
    });
  });

  it('deve submeter formulário com dados válidos', async () => {
    render(
      <BrandForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await userEvent.type(screen.getByLabelText(/nome/i), 'Carrier');
    await userEvent.type(screen.getByLabelText(/descrição/i), 'Fabricante de equipamentos HVAC');

    const submitButton = screen.getByRole('button', { name: /criar marca/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Carrier',
        description: 'Fabricante de equipamentos HVAC',
      });
    });
  });

  it('deve submeter formulário de edição com dados atualizados', async () => {
    const existingBrand: Brand = {
      id: '1',
      name: 'Thermo King',
      description: 'Descrição original',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    render(
      <BrandForm
        brand={existingBrand}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText(/nome/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Thermo King Updated');

    const submitButton = screen.getByRole('button', { name: /atualizar marca/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Thermo King Updated',
        description: 'Descrição original',
      });
    });
  });

  it('deve chamar onCancel quando botão cancelar é clicado', async () => {
    render(
      <BrandForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    await userEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('deve desabilitar botões quando isLoading é true', () => {
    render(
      <BrandForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    const submitButton = screen.getByRole('button', { name: /criar marca/i });
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('deve aceitar descrição vazia', async () => {
    render(
      <BrandForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await userEvent.type(screen.getByLabelText(/nome/i), 'Nova Marca');
    // Não preenche a descrição

    const submitButton = screen.getByRole('button', { name: /criar marca/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Nova Marca',
        description: '',
      });
    });
  });

  it('deve renderizar modal com título correto para criação', () => {
    render(
      <BrandForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Nova Marca')).toBeInTheDocument();
  });

  it('deve renderizar modal com título correto para edição', () => {
    const existingBrand: Brand = {
      id: '1',
      name: 'Thermo King',
      description: 'Fabricante de equipamentos',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    render(
      <BrandForm
        brand={existingBrand}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Editar Marca')).toBeInTheDocument();
  });
});