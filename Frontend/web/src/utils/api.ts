import axios from 'axios';
import { backendUrl, aiServiceUrl } from '../config';

const AI_API_TIMEOUT_MS = 300000;

const AUTH_ENDPOINT_PREFIXES = [
  '/authenticator/login/',
  '/authenticator/register/',
  '/authenticator/token/refresh/',
  '/authenticator/password-reset/',
  '/authenticator/password-reset-confirm/',
  '/authenticator/verify-email/',
];

const isAuthEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return AUTH_ENDPOINT_PREFIXES.some((prefix) => url.includes(prefix));
};

const getApiBaseUrl = (): string => {
  const trimmed = backendUrl.replace(/\/$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const apiBaseUrl = getApiBaseUrl();

const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const response = await axios.post(
    `${apiBaseUrl}/authenticator/token/refresh/`,
    { refresh: refreshToken }
  );

  const { access } = response.data;
  localStorage.setItem('access_token', access);
  return access;
};

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (isAuthEndpoint(config.url)) {
      return config;
    }

    const token = localStorage.getItem('access_token');
    if (token) {
      console.log('[API] Adding token to request:', config.url);
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('[API] No access token found for request:', config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const authEndpoint = isAuthEndpoint(originalRequest?.url);

    if (error.response?.status === 401 && !originalRequest?._retry && !authEndpoint) {
      originalRequest._retry = true;

      console.warn('[API] 401 Unauthorized - Attempting token refresh');

      try {
        console.log('[API] Refreshing access token...');
        const access = await refreshAccessToken();
        console.log('[API] Token refreshed successfully');

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('[API] Token refresh failed:', refreshError);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// AI Service API instance
export const aiApi = axios.create({
  baseURL: `${aiServiceUrl}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: AI_API_TIMEOUT_MS,
});

// Request interceptor for AI Service to handle dynamic tokens
aiApi.interceptors.request.use(
  (config) => {
    // Note: ai_service_token can be retrieved from localStorage
    const token = localStorage.getItem('ai_service_token');
    // Do not override an explicit Authorization header set by the caller.
    if (token && !config.headers?.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// AI response errors are handled at feature/service level (token fallback per session).
aiApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      return Promise.reject(
        new Error('AI request timed out. Please try again in a moment.')
      );
    }
    return Promise.reject(error);
  }
);

export default api;
