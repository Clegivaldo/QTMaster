import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ClientForm from '../ClientForm';
import { Client } from '../../types/client';

const mockOnSubmit = vi.fn();
const mockOnCancel = vi.fn();

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
    render(<ClientForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    expect(screen.getByText(/nome/i)).toBeInTheDocument();
    expect(screen.getByText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('should populate form when editing existing client', () => {
    render(<ClientForm client={mockClient} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    expect(screen.getByDisplayValue('Test Client')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@client.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('(11) 99999-9999')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Address')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12.345.678/0001-90')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /atualizar/i })).toBeInTheDocument();
  });

  it('should call onSubmit with form data when submitted', async () => {
    render(<ClientForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const inputs = screen.getAllByRole('textbox');
    const nameInput = inputs.find(input => (input as HTMLInputElement).name === 'name');
    const emailInput = inputs.find(input => (input as HTMLInputElement).name === 'email');
    const phoneInput = inputs.find(input => (input as HTMLInputElement).name === 'phone');
    const addressInput = inputs.find(input => (input as HTMLInputElement).name === 'address');
    const cnpjInput = inputs.find(input => (input as HTMLInputElement).name === 'cnpj');
    const submitButton = screen.getByRole('button', { name: /criar/i });
    
    if (nameInput && emailInput && phoneInput && addressInput && cnpjInput) {
      fireEvent.change(nameInput, { target: { value: 'New Client' } });
      fireEvent.change(emailInput, { target: { value: 'new@client.com' } });
      fireEvent.change(phoneInput, { target: { value: '(11) 88888-8888' } });
      fireEvent.change(addressInput, { target: { value: 'New Address' } });
      fireEvent.change(cnpjInput, { target: { value: '98.765.432/0001-10' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Client',
            email: 'new@client.com',
            phone: '(11) 88888-8888',
            address: 'New Address',
            cnpj: '98.765.432/0001-10',
          }),
          expect.any(Object)
        );
      });
    }
  });

  it('should show validation error for required name field', async () => {
    render(<ClientForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const submitButton = screen.getByRole('button', { name: /criar/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getAllByText((content) => /nome é obrigatório/i.test(String(content).replace(/\s+/g, ' '))).length).toBeGreaterThan(0);
    });
  });

  it('should validate email format', async () => {
    render(<ClientForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const inputs = screen.getAllByRole('textbox');
    const nameInput = inputs.find(input => (input as HTMLInputElement).name === 'name');
    const emailInput = inputs.find(input => (input as HTMLInputElement).name === 'email');
    const submitButton = screen.getByRole('button', { name: /criar/i });
    
    if (nameInput && emailInput) {
  fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
  fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
  // Submit the form programmatically to ensure react-hook-form validation runs
  const form = document.querySelector('form');
  if (form) fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getAllByText((content) => /email inválido/i.test(String(content).replace(/\s+/g, ' '))).length).toBeGreaterThan(0);
      });
    }
  });

  it('should handle form with existing client data', () => {
    render(<ClientForm client={mockClient} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const nameInput = screen.getByDisplayValue('Test Client') as HTMLInputElement;
    expect(nameInput.value).toBe('Test Client');
    
    // Change the value
    fireEvent.change(nameInput, { target: { value: 'Changed Name' } });
    expect(nameInput.value).toBe('Changed Name');
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(<ClientForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should submit form with only name when other fields are empty', async () => {
    render(<ClientForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const inputs = screen.getAllByRole('textbox');
    const nameInput = inputs.find(input => (input as HTMLInputElement).name === 'name');
    const submitButton = screen.getByRole('button', { name: /criar/i });
    
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'Minimal Client' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Minimal Client',
          }),
          expect.any(Object)
        );
      });
    }
  });

  it('should update existing client when form is submitted in edit mode', async () => {
    render(<ClientForm client={mockClient} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const nameInput = screen.getByDisplayValue('Test Client') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /atualizar/i });
    
    fireEvent.change(nameInput, { target: { value: 'Updated Client Name' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Client Name',
          email: 'test@client.com',
          phone: '(11) 99999-9999',
          address: 'Test Address',
          cnpj: '12.345.678/0001-90',
        }),
        expect.any(Object)
      );
    });
  });

  it('should clear form validation errors when input is corrected', async () => {
    render(<ClientForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const submitButton = screen.getByRole('button', { name: /criar/i });
    
    // Submit empty form to trigger validation error
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getAllByText((content) => /nome é obrigatório/i.test(String(content).replace(/\s+/g, ' '))).length).toBeGreaterThan(0);
    });
    
    // Fix the validation error
    const inputs = screen.getAllByRole('textbox');
    const nameInput = inputs.find(input => (input as HTMLInputElement).name === 'name');
    
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
      
      await waitFor(() => {
        expect(screen.queryAllByText((content) => /nome é obrigatório/i.test(String(content).replace(/\s+/g, ' '))).length).toBe(0);
      });
    }
  });
});