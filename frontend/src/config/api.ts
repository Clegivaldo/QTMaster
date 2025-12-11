// API Configuration
export const API_CONFIG = {
  // Normalize baseURL: use env value or default to full URL for local dev.
  baseURL: (() => {
    const raw = import.meta.env.VITE_API_URL as string | undefined;
    const fallback = 'http://localhost:3000/api';
    if (!raw) return fallback;
    // Trim trailing slashes
    return raw.replace(/\/+$/g, '') || fallback;
  })(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  if (!endpoint) return API_CONFIG.baseURL;

  // Ensure endpoint starts with a single slash
  const e = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If baseURL is absolute origin + path (e.g. http://host/api) we join without duplicating slashes
  return API_CONFIG.baseURL.endsWith('/')
    ? `${API_CONFIG.baseURL.replace(/\/+$/g, '')}${e}`
    : `${API_CONFIG.baseURL}${e}`;
};