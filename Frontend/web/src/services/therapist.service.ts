// src/services/therapist.service.ts
import api from '../utils/api';
import type {
  Patient,
  PatientFormData,
  PatientFilter,
  TherapistError,
  ConsentData,
  NewPatientFormData,
  StartNewSessionPatient,
  TherapistPinResponse,
  TherapistQRInfo,
  PatientDetailsType,
  ConnectionRequest,
  AcceptConnectionRequest,
  CreatePatientResponse,
} from '../types/therapist';
import type {
  DashboardResponse,
} from '../types/session';

class TherapistService {
  /**
   * Dashboard API calls
   */
  async getDashboardData(): Promise<DashboardResponse> {
    try {
      console.log('[TherapistService] GET /therapy_sessions/dashboard/therapist/');
      const response = await api.get('/therapy_sessions/dashboard/therapist/');

      // Transform backend response to match frontend expectations
      const backendData = response.data;
      const transformedData: DashboardResponse = {
        stats: {
          total_patients: backendData.patient_stats?.total_patients || 0,
          upcoming_sessions: backendData.session_stats?.upcoming_sessions || 0,
          completed_sessions: backendData.session_stats?.completed_sessions_30_days || 0,
          cancelled_sessions: backendData.session_stats?.cancelled_sessions_30_days || 0,
        },
        upcoming_sessions: backendData.upcoming_sessions || [],
        recent_activities: backendData.recent_activities || [],
      };

      console.log('[TherapistService] Transformed dashboard data:', transformedData);
      console.log('[TherapistService] Upcoming sessions sample:', transformedData.upcoming_sessions[0]);
      return transformedData;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }



  /**
   * Patients API calls
   */
  async getPatients(filter: PatientFilter = {}): Promise<Patient[]> {
    try {
      let endpoint = '/therapy_sessions/patients/';
      const params = new URLSearchParams();

      if (filter.search) {
        params.append('search', filter.search);
      }
      // Only 'search' is supported by backend. Ignore gender and therapy_status.

      const queryString = params.toString();
      if (queryString) {
        endpoint += `?${queryString}`;
      }

      console.log('[TherapistService] GET', endpoint);
      const response = await api.get(endpoint);

      // Handle different response structures and clean the data
      let patientsData = [];
      if (response.data && Array.isArray(response.data.patients)) {
        patientsData = response.data.patients;
      } else if (Array.isArray(response.data)) {
        patientsData = response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        patientsData = response.data.results;
      }

      // Clean and validate patient data to prevent render errors
      const cleanedPatients = patientsData.map((patient: Patient) => ({
        id: patient.id?.toString() || '',
        full_name: typeof patient.full_name === 'string' ? patient.full_name : 'Unknown Patient',
        email: typeof patient.email === 'string' ? patient.email : '',
        phone_number: typeof patient.phone_number === 'string' ? patient.phone_number : '',
        date_of_birth: typeof patient.date_of_birth === 'string' ? patient.date_of_birth : '',
        gender: typeof patient.gender === 'string' ? patient.gender : '',
        patient_profile: patient.patient_profile && typeof patient.patient_profile === 'object' ? {
          patient_id: patient.patient_profile.patient_id?.toString() || '',
          primary_concern: typeof patient.patient_profile.primary_concern === 'string' ? patient.patient_profile.primary_concern : 'General therapy',
          therapy_start_date: typeof patient.patient_profile.therapy_start_date === 'string' ? patient.patient_profile.therapy_start_date : '',
          session_frequency: typeof patient.patient_profile.session_frequency === 'string' ? patient.patient_profile.session_frequency : '',
          preferred_session_days: Array.isArray(patient.patient_profile.preferred_session_days) ? patient.patient_profile.preferred_session_days : [],
          emergency_contact_name: typeof patient.patient_profile.emergency_contact_name === 'string' ? patient.patient_profile.emergency_contact_name : '',
          emergency_contact_phone: typeof patient.patient_profile.emergency_contact_phone === 'string' ? patient.patient_profile.emergency_contact_phone : '',
          preferred_language: typeof patient.patient_profile.preferred_language === 'string' ? patient.patient_profile.preferred_language : '',
          connected_at: typeof patient.patient_profile.connected_at === 'string' ? patient.patient_profile.connected_at : ''
        } : null,
        last_session: typeof patient.last_session === 'string' ? patient.last_session : null,
        next_session: typeof patient.next_session === 'string' ? patient.next_session : null,
        total_sessions: patient.total_sessions?.toString() || '0',
        created_at: typeof patient.created_at === 'string' ? patient.created_at : ''
      }));

      console.log('[TherapistService] Cleaned patients data:', cleanedPatients);
      return cleanedPatients;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async getPatientDetail(patientId: string): Promise<Patient> {
    try {
      console.log('[TherapistService] GET /therapy_sessions/patients/', patientId);
      const response = await api.get<Patient>(`/therapy_sessions/patients/${patientId}/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }



  async getPatientDetails(): Promise<PatientDetailsType[]> {
    try {
      console.log('[TherapistService] GET /therapy_sessions/patients/');
      const response = await api.get<PatientDetailsType[]>('/therapy_sessions/patients/');
      return response.data || [];
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Dashboard-specific API calls
   */
  async getTherapistPatients(): Promise<Patient[]> {
    try {
      console.log('[TherapistService] GET /users/patients/');
      const response = await api.get('/users/patients/');
      return response.data.patients || [];
    } catch (error: any) {
      console.warn('[TherapistService] No patients data available:', error.message);
      return [];
    }
  }



  async createPatient(patientData: PatientFormData): Promise<Patient> {
    try {
      console.log('[TherapistService] POST /therapy_sessions/patients/', patientData);
      const response = await api.post<Patient>('/therapy_sessions/patients/', patientData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Alias for backward compatibility with createSessionPatient
  async createSessionPatient(patientData: any): Promise<any> {
    return this.createPatient(patientData);
  }

  async updatePatient(patientId: string, patientData: Partial<PatientFormData>): Promise<Patient> {
    try {
      console.log('[TherapistService] PATCH /therapy_sessions/patients/', patientId, patientData);
      const response = await api.patch<Patient>(`/therapy_sessions/patients/${patientId}/`, patientData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async deletePatient(patientId: string): Promise<void> {
    try {
      console.log('[TherapistService] DELETE /therapy_sessions/patients/', patientId);
      await api.delete(`/therapy_sessions/patients/${patientId}/`);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

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

  async createNewPatient(patientData: NewPatientFormData): Promise<StartNewSessionPatient> {
    try {
      // Sanitize the data before sending
      const sanitizedData = {
        ...patientData,
        // Convert empty date strings to null
        date_of_birth: patientData.date_of_birth && patientData.date_of_birth.trim() ? patientData.date_of_birth : null,
        therapy_start_date: patientData.therapy_start_date && patientData.therapy_start_date.trim() ? patientData.therapy_start_date : null,
        // Ensure empty strings are properly handled
        email: patientData.email && patientData.email.trim() ? patientData.email.trim() : '',
        gender: patientData.gender || '',
        primary_concern: patientData.primary_concern || '',
        emergency_contact_name: patientData.emergency_contact_name || '',
        emergency_contact_phone: patientData.emergency_contact_phone || '',
        address: patientData.address || '',
        medical_history: patientData.medical_history || '',
        current_medications: patientData.current_medications || '',
        preferred_language: patientData.preferred_language || 'en',
        session_frequency: patientData.session_frequency || 'weekly',
        preferred_session_days: patientData.preferred_session_days || []
      };

      console.log('[TherapistService] POST /therapy_sessions/patients/create/', sanitizedData);
      const response = await api.post<CreatePatientResponse>('/therapy_sessions/patients/create/', sanitizedData);
      return response.data.patient;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getTherapistPin(): Promise<TherapistPinResponse> {
    try {
      console.log('[TherapistService] GET /users/therapist-pin/');
      const response = await api.get<TherapistPinResponse>('/users/therapist-pin/');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async fetchSessionPatients(): Promise<StartNewSessionPatient[]> {
    try {
      console.log('[TherapistService] GET /therapy_sessions/patients/');
      const response = await api.get('/therapy_sessions/patients/');
      return response.data || [];
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

  /**
   * Handle API errors and transform them into TherapistError
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





  static async fetchPatientsData(): Promise<Patient[]> {
    try {
      const response = await api.get('/therapy_sessions/patients/');
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch patients data:', error);
      throw error;
    }
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


  /**
   * Get 7-day mood trend for a patient
   */
  async getMoodTrend(patientId: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('patient_id', patientId);
      const response = await api.get(`/therapy_sessions/mood-trend/?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }
}

export default new TherapistService();