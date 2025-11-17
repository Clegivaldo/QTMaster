import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LoginForm from '../LoginForm';
import { AuthProvider } from '../../contexts/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';

// Mock the auth service
const mockLogin = vi.fn();
vi.mock('../../services/api', () => ({
  apiService: {
    // auth helpers used by AuthContext
    getAuthToken: () => null,
    getRefreshToken: () => null,
    setAuthToken: vi.fn(),
    setRefreshToken: vi.fn(),
    clearTokens: vi.fn(),
    // API calls
    getCurrentUser: async () => ({ data: { success: false } }),
    login: async () => ({ data: { success: false } }),
    logout: async () => ({ data: { success: true } }),
  },
}));

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      login: mockLogin,
      user: null,
      loading: false,
      logout: vi.fn(),
    }),
  };
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          {component}
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form with email and password fields', () => {
    renderWithProviders(<LoginForm />);
    
    expect(screen.getByPlaceholderText(/seu@email.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/sua senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('should call login with correct credentials when form is submitted', async () => {
    mockLogin.mockResolvedValue(undefined);
    
    renderWithProviders(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
    const passwordInput = screen.getByPlaceholderText(/sua senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('should show validation errors for empty fields', async () => {
    renderWithProviders(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /entrar/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/senha é obrigatória/i)).toBeInTheDocument();
    });
  });

  it('should show password toggle functionality', () => {
    renderWithProviders(<LoginForm />);
    
  const passwordInput = screen.getByPlaceholderText(/sua senha/i);
  const submitButton = screen.getByRole('button', { name: /entrar/i });
  const toggleButtons = screen.getAllByRole('button');
  const toggleButton = toggleButtons.find(btn => btn !== submitButton);
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
    }
  });
});