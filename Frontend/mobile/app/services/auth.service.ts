// app/services/auth.service.ts
import api from '../utils/api';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  PasswordResetRequest,
  EmailVerificationRequest,
  PasswordResetConfirm,
  AuthError,
} from '../types/auth';

class AuthService {
  /**
   * User login
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('[AuthService] POST /authenticator/login/', credentials);
      const response = await api.post<LoginResponse>('/authenticator/login/', credentials);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * User registration
   */
  async register(userData: RegisterRequest): Promise<void> {
    try {
      console.log('[AuthService] POST /authenticator/register/', userData);
      await api.post('/authenticator/register/', userData);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
    try {
      console.log('[AuthService] POST /authenticator/password-reset/', data);
      await api.post('/authenticator/password-reset/', data);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(data: PasswordResetConfirm): Promise<void> {
    try {
      console.log('[AuthService] POST /authenticator/password-reset-confirm/', data);
      await api.post('/authenticator/password-reset-confirm/', {
        token: data.token,
        new_password: data.new_password,
      });
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(data: EmailVerificationRequest): Promise<void> {
    try {
      console.log('[AuthService] POST /authenticator/verify-email/', data);
      await api.post('/authenticator/verify-email/', data);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Logout user (clear tokens)
   */
  async logout(): Promise<void> {
    try {
      // Optional: Call logout endpoint if backend requires it
       console.log('[AuthService] POST /authenticator/logout/');
       await api.post('/authenticator/logout/');
    } catch (error) {
      // Ignore errors during logout
    }
  }

  /**
   * Handle API errors and transform them into AuthError
   */
  private handleError(error: any): AuthError {
    if (error.response?.data) {
      const { data } = error.response;
      
      // Handle validation errors
      if (data.detail) {
        return {
          message: data.detail,
          code: error.response.status?.toString(),
        };
      }
      
      // Handle non_field_errors (common in Django)
      if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
        return {
          message: data.non_field_errors.join(', '),
          code: error.response.status?.toString(),
        };
      }
      
      // Handle field validation errors
      if (typeof data === 'object' && !data.message) {
        const fieldErrors = Object.entries(data)
          .filter(([key]) => key !== 'non_field_errors')
          .map(([field, errors]: [string, any]) => {
            const errorMsg = Array.isArray(errors) ? errors.join(', ') : errors;
            return `${field}: ${errorMsg}`;
          })
          .join('; ');
        
        return {
          message: fieldErrors || 'Validation failed',
          code: error.response.status?.toString(),
          details: data,
        };
      }
      
      return {
        message: data.message || 'An error occurred',
        code: error.response.status?.toString(),
      };
    }
    
    if (error.message) {
      return {
        message: error.message,
        code: 'NETWORK_ERROR',
      };
    }
    
    return {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }
}

export default new AuthService();