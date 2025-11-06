import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ClientForm from '../ClientForm';
import { Client } from '../../types/client';

const mockOnSubmit = vi.fn();

const mockClient: Client = {
  id: '1',
  name: 'Test Client',
  email: 'test@client.com',
  phone: '(11) 99999-9999',
  address: 'Test Address',
  cnpj: '12.345.678/0001-90',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ClientForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form with required fields', () => {
    render(<ClientForm onSubmit={mockOnSubmit} onCancel={vi.fn()} />);
    
    expect(screen.getByText(/nome/i)).toBeInTheDocument();
    expect(screen.getByText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar/i })).toBeInTheDocument();
  });

  it('should populate form when editing existing client', () => {
    render(<ClientForm client={mockClient} onSubmit={mockOnSubmit} onCancel={vi.fn()} />);
    
    expect(screen.getByDisplayValue('Test Client')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@client.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('(11) 99999-9999')).toBeInTheDocument();
  });

  it('should call onSubmit with form data when submitted', async () => {
    render(<ClientForm onSubmit={mockOnSubmit} onCancel={vi.fn()} />);
    
    const inputs = screen.getAllByRole('textbox');
    const nameInput = inputs.find(input => (input as HTMLInputElement).name === 'name');
    const emailInput = inputs.find(input => (input as HTMLInputElement).name === 'email');
    const submitButton = screen.getByRole('button', { name: /criar/i });
    
    if (nameInput && emailInput) {
      fireEvent.change(nameInput, { target: { value: 'New Client' } });
      fireEvent.change(emailInput, { target: { value: 'new@client.com' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Client',
            email: 'new@client.com',
          })
        );
      });
    }
  });

  it('should show validation error for required name field', async () => {
    render(<ClientForm onSubmit={mockOnSubmit} onCancel={vi.fn()} />);
    
    const submitButton = screen.getByRole('button', { name: /criar/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument();
    });
  });

  it('should handle form with existing client data', () => {
    render(<ClientForm client={mockClient} onSubmit={mockOnSubmit} onCancel={vi.fn()} />);
    
    const nameInput = screen.getByDisplayValue('Test Client') as HTMLInputElement;
    expect(nameInput.value).toBe('Test Client');
    
    // Change the value
    fireEvent.change(nameInput, { target: { value: 'Changed Name' } });
    expect(nameInput.value).toBe('Changed Name');
  });
});