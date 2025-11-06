import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock axios
const mockAxiosInstance = {
  defaults: { 
    headers: { 
      common: {} as Record<string, string>
    } 
  },
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should create axios instance with correct configuration', async () => {
    const { apiService } = await import('../api');
    
    expect(apiService.api).toBeDefined();
    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
  });

  it('should set auth token in localStorage', async () => {
    const { apiService } = await import('../api');
    const mockToken = 'test-token';
    
    apiService.setAuthToken(mockToken);
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', mockToken);
  });

  it('should clear tokens from localStorage', async () => {
    const { apiService } = await import('../api');
    
    apiService.clearTokens();
    
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
  });

  it('should handle localStorage operations', async () => {
    localStorageMock.getItem.mockReturnValue('stored-token');
    
    const { apiService } = await import('../api');
    
    // Test that the service can be imported and used
    expect(apiService).toBeDefined();
    expect(apiService.api).toBeDefined();
    
    // Test localStorage interaction
    expect(localStorageMock.getItem).toHaveBeenCalled();
  });

  it('should handle axios instance creation', async () => {
    const { apiService } = await import('../api');
    
    expect(apiService.api).toBeDefined();
    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
  });
});