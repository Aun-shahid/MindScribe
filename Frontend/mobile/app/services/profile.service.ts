// app/services/profile.service.ts
import api from '../utils/api';
import { User, AuthError } from '../types/auth';

class ProfileService {
  /**
   * Fetch user profile
   */
  async getProfile(): Promise<User> {
    try {
      const response = await api.get<User>('/authenticator/profile/');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData: Partial<User>): Promise<User> {
    try {
      const response = await api.patch<User>('/authenticator/profile/', profileData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
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

export default new ProfileService();
