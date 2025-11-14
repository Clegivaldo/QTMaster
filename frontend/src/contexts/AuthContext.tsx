import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginCredentials } from '@/types/auth';
import { apiService } from '@/services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();

  const isAuthenticated = !!user;

  // On mount, try to load tokens from localStorage and fetch current user
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const accessToken = apiService.getAuthToken();
        if (accessToken) {
          apiService.setAuthToken(accessToken);
          // Try to fetch current user
          const resp = await apiService.getCurrentUser();
          if (mounted && resp?.data?.success && resp.data.data?.user) {
            const u = resp.data.data.user;
            setUser({ id: u.id, name: u.name, email: u.email, role: u.role });
          }
        }
      } catch (e) {
        // ignore - user will remain null
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();

    return () => { mounted = false; };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      // Use centralized ApiService which handles tokens and interceptors
      const resp = await apiService.login(credentials);
      const responseData = resp.data;

      if (!responseData || !responseData.success) {
        throw new Error(responseData?.error || 'Credenciais inválidas');
      }

      const payload = responseData.data;
      if (!payload || !payload.user) {
        throw new Error('Resposta inválida do servidor');
      }

      // Store tokens so axios interceptor will include Authorization header
      if (payload.tokens?.accessToken) {
        apiService.setAuthToken(payload.tokens.accessToken);
      }
      if (payload.tokens?.refreshToken) {
        apiService.setRefreshToken(payload.tokens.refreshToken);
      }

      setUser({
        id: payload.user.id,
        name: payload.user.name,
        email: payload.user.email,
        role: payload.user.role,
      });
      // Navigate to dashboard after successful login
      try {
        navigate('/');
      } catch (e) {
        // ignore navigation errors
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    apiService.clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};