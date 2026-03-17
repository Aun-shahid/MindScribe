// src/services/auth.service.ts
import api from '../utils/api';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  user_type: 'therapist' | 'patient';
  phone_number?: string;
  date_of_birth?: string;
}

interface AuthResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    username: string;
    email: string;
    user_type: string;
    email_verified: boolean;
  };
  therapist_pin?: string;
}

class AuthService {
  private createFieldError(field: string, message: string): Error {
    const customError = new Error(`${field}: ${message}`);
    (customError as any).details = { [field]: message };
    return customError;
  }

  private parseDuplicateConstraintError(rawText: string): Error | null {
    const duplicateMatch = rawText.match(/Key \(([^)]+)\)=\(([^)]*)\) already exists\./i);
    if (!duplicateMatch) {
      return null;
    }

    const field = duplicateMatch[1];
    const value = duplicateMatch[2];
    const message = value
      ? `${field.replace(/_/g, ' ')} already exists (${value}).`
      : `${field.replace(/_/g, ' ')} already exists.`;

    return this.createFieldError(field, message);
  }

  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/authenticator/login/', data);
      
      // Store tokens
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/authenticator/register/', data);
      
      // Store tokens if provided
      if (response.data.access && response.data.refresh) {
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/authenticator/logout/', { refresh: refreshToken });
      }
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }

  async refreshToken(): Promise<{ access: string; refresh: string }> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/authenticator/token/refresh/', { refresh: refreshToken });
      
      // Update stored tokens
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      
      return response.data;
    } catch (error: any) {
      // If refresh fails, clear tokens and redirect to login
      this.logout();
      throw this.handleError(error);
    }
  }

  async getProfile(): Promise<any> {
    try {
      const response = await api.get('/authenticator/profile/');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateProfile(data: any): Promise<any> {
    try {
      const response = await api.patch('/authenticator/profile/', data);
      
      // Update stored user data
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...user, ...response.data }));
      
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async changePassword(data: { old_password: string; new_password: string }): Promise<void> {
    try {
      await api.post('/authenticator/change-password/', data);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async requestPasswordReset(data: { email: string }): Promise<void> {
    try {
      console.log('[AuthService] POST /authenticator/password-reset/', data);
      await api.post('/authenticator/password-reset/', data);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async confirmPasswordReset(data: { token: string; new_password: string }): Promise<void> {
    try {
      console.log('[AuthService] POST /authenticator/password-reset-confirm/', data);
      await api.post('/authenticator/password-reset-confirm/', {
        token: data.token,
        password: data.new_password,
        password_confirm: data.new_password,
      });
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async verifyEmail(data: { code: string }): Promise<void> {
    try {
      console.log('[AuthService] POST /authenticator/verify-email/', data);
      await api.post('/authenticator/verify-email/', data);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getCurrentUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isTherapist(): boolean {
    const user = this.getCurrentUser();
    return user?.user_type === 'therapist';
  }

  isPatient(): boolean {
    const user = this.getCurrentUser();
    return user?.user_type === 'patient';
  }

  private handleError(error: any): Error {
    if (error.response?.data) {
      const { data } = error.response;

      if (typeof data === 'string') {
        const duplicateError = this.parseDuplicateConstraintError(data);
        if (duplicateError) {
          return duplicateError;
        }

        return new Error(data || `Request failed with status ${error.response?.status}`);
      }
      
      if (data.detail) {
        return new Error(data.detail);
      }
      
      if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
        return new Error(data.non_field_errors.join(', '));
      }
      
      if (typeof data === 'object') {
        if (typeof data.message === 'string' && data.message.trim()) {
          return new Error(data.message);
        }

        if (typeof data.error === 'string' && data.error.trim()) {
          return new Error(data.error);
        }

        // Check if this is field validation errors
        const hasFieldErrors = Object.keys(data).some(
          key => !['non_field_errors', 'message', 'error', 'detail'].includes(key)
        );
        
        if (hasFieldErrors) {
          // Create a custom error with field details attached
          const fieldErrors = Object.entries(data)
            .filter(([key]) => !['non_field_errors', 'message', 'error', 'detail'].includes(key))
            .reduce((acc, [field, errors]) => {
              const errorMsg = Array.isArray(errors) ? errors.join(', ') : String(errors);
              acc[field] = errorMsg;
              return acc;
            }, {} as Record<string, string>);
          
          const errorMessage = Object.entries(fieldErrors)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join('; ');
          
          const customError = new Error(errorMessage || 'Validation failed');
          (customError as any).details = fieldErrors;
          return customError;
        }
      }
      
      return new Error(`Request failed with status ${error.response?.status || 'unknown'}`);
    }
    
    if (error.message) {
      return new Error(error.message);
    }
    
    return new Error('An unexpected error occurred');
  }
}

export default new AuthService();