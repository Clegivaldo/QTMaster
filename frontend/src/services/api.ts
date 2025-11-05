import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { LoginCredentials, LoginResponse, User, ApiResponse } from '@/types/auth';

class ApiService {
  public api: AxiosInstance;
  public baseURL: string;

  constructor() {
    this.baseURL = 'http://localhost:5000';
    this.api = axios.create({
      baseURL: `${this.baseURL}/api`,
      timeout: 30000, // Aumentar timeout para 30 segundos
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken);
              if (response.data.data?.accessToken) {
                localStorage.setItem('accessToken', response.data.data.accessToken);
                
                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${response.data.data.accessToken}`;
                return this.api(originalRequest);
              }
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.clearTokens();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(credentials: LoginCredentials): Promise<AxiosResponse<ApiResponse<LoginResponse>>> {
    return this.api.post('/auth/login', credentials);
  }

  async refreshToken(refreshToken: string): Promise<AxiosResponse<ApiResponse<{ accessToken: string }>>> {
    return this.api.post('/auth/refresh', { refreshToken });
  }

  async logout(): Promise<AxiosResponse<ApiResponse>> {
    return this.api.post('/auth/logout');
  }

  async getCurrentUser(): Promise<AxiosResponse<ApiResponse<{ user: User }>>> {
    return this.api.get('/auth/me');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<AxiosResponse<ApiResponse>> {
    return this.api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  // Utility methods
  setAuthToken(token: string) {
    localStorage.setItem('accessToken', token);
  }

  setRefreshToken(token: string) {
    localStorage.setItem('refreshToken', token);
  }

  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  getAuthToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  // Health check
  async healthCheck(): Promise<AxiosResponse> {
    return this.api.get('/health');
  }
}

export const apiService = new ApiService();