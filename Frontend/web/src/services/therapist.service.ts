// src/services/therapist.service.ts
import api from '../utils/api';
import type {
  TherapistError,
  ConsentData,
  TherapistQRInfo,
  ConnectionRequest,
  AcceptConnectionRequest,
} from '../types/therapist';

class TherapistService {
  /**
   * Consent API calls
   */
  async submitConsent(consentData: ConsentData): Promise<void> {
    try {
      console.log('[TherapistService] POST /therapy_sessions/consent/', consentData);
      await api.post('/therapy_sessions/consent/', consentData);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getConsentStatus(patientId: string, therapistId: string): Promise<ConsentData> {
    try {
      console.log('[TherapistService] GET /therapy_sessions/consent/status/', { patientId, therapistId });
      const response = await api.get(`/therapy_sessions/consent/status/?patient_id=${patientId}&therapist_id=${therapistId}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * QR Code generation for therapist
   */
  async generateQRCode(therapistId: string, sessionId?: string): Promise<string> {
    try {
      const data = { therapist_id: therapistId, session_id: sessionId };
      console.log('[TherapistService] POST /therapy_sessions/qr-code/', data);
      const response = await api.post('/therapy_sessions/qr-code/', data);
      return response.data.qr_code_data || JSON.stringify(data);
    } catch {
      console.log('[TherapistService] QR Code generation failed, using fallback');
      return JSON.stringify({ therapist_id: therapistId, session_id: sessionId });
    }
  }

  /**
   * Profile and tools
   */
  async getTherapistProfile(): Promise<TherapistQRInfo> {
    try {
      console.log('[TherapistService] GET /users/therapist-profile/');
      const response = await api.get('/users/therapist-profile/');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateTherapistProfile(profileData: TherapistQRInfo): Promise<TherapistQRInfo> {
    try {
      console.log('[TherapistService] PATCH /users/therapist-profile/', profileData);
      const response = await api.patch('/users/therapist-profile/', profileData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /** Profile picture: max 5 MB, jpg/png/gif/webp (enforced on server). */
  async uploadTherapistAvatar(file: File): Promise<TherapistQRInfo> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await api.patch<TherapistQRInfo>('/users/therapist-profile/', formData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async clearTherapistAvatar(): Promise<TherapistQRInfo> {
    try {
      const response = await api.patch<TherapistQRInfo>('/users/therapist-profile/', {
        clear_avatar: true,
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getTherapistPin(): Promise<any> {
    try {
      console.log('[TherapistService] GET /users/therapist-pin/');
      const response = await api.get('/users/therapist-pin/');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getTherapistQRInfo(): Promise<TherapistQRInfo> {
    try {
      console.log('[TherapistService] GET /users/therapist-pin/');
      const response = await api.get<TherapistQRInfo>('/users/therapist-pin/');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async disconnectPatient(patientId: string): Promise<{ detail: string }> {
    try {
      console.log('[TherapistService] POST /users/disconnect-patient/', patientId);
      const response = await api.post<{ detail: string }>(`/users/disconnect-patient/${patientId}/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * QR Code generation for therapist
   */
  private handleError(error: unknown): TherapistError {
    // Type guard to check if error has a response property
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const err = error as { response?: { data?: any; status?: number } };

      if (err.response?.data) {
        const { data } = err.response;

        // Handle validation errors
        if (data.detail) {
          return {
            message: data.detail,
            code: err.response.status?.toString(),
          };
        }

        // Handle non_field_errors (common in Django)
        if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
          return {
            message: data.non_field_errors.join(', '),
            code: err.response.status?.toString(),
          };
        }

        // Handle field validation errors
        if (typeof data === 'object' && !data.message) {
          const fieldErrors = Object.entries(data)
            .filter(([key]) => key !== 'non_field_errors')
            .map(([field, errors]: [string, unknown]) => {
              let errorMsg: string;
              if (Array.isArray(errors)) {
                errorMsg = errors.join(', ');
              } else if (typeof errors === 'string') {
                errorMsg = errors;
              } else {
                errorMsg = JSON.stringify(errors);
              }
              return `${field}: ${errorMsg}`;
            })
            .join('; ');

          return {
            message: fieldErrors || 'Validation failed',
            code: err.response.status?.toString(),
            details: data,
          };
        }

        return {
          message: data.message || 'An error occurred',
          code: err.response.status?.toString(),
        };
      }
    }

    // Type guard for error with message property
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const err = error as { message: string };
      return {
        message: err.message,
        code: 'NETWORK_ERROR',
      };
    }

    return {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }





  /**
   * Connection Requests API calls
   */
  async getConnectionRequests(status?: string): Promise<ConnectionRequest[]> {
    try {
      let endpoint = '/users/connection-requests/';
      if (status) {
        endpoint += `?status=${status}`;
      }
      console.log('[TherapistService] GET', endpoint);
      const response = await api.get<{
        connection_requests: ConnectionRequest[];
        total_count: number;
        mergeable_patients: any[];
        filters_applied: any;
      }>(endpoint);

      console.log('[TherapistService] Connection requests response:', response.data);

      // Extract connection_requests array from response
      const requestsData = response.data?.connection_requests || [];

      console.log('[TherapistService] Extracted requests count:', requestsData.length);
      return requestsData;
    } catch (error: any) {
      console.error('[TherapistService] Error fetching connection requests:', error);
      throw this.handleError(error);
    }
  }

  async acceptConnectionRequest(requestId: string, data: AcceptConnectionRequest): Promise<any> {
    try {
      console.log('[TherapistService] POST /users/connection-requests/', requestId, data);
      const response = await api.post(`/users/connection-requests/${requestId}/`, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async rejectConnectionRequest(requestId: string): Promise<any> {
    try {
      console.log('[TherapistService] DELETE /users/connection-requests/', requestId);
      const response = await api.delete(`/users/connection-requests/${requestId}/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }
}

export default new TherapistService();