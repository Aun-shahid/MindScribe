// app/services/therapist.service.ts
import api from '../utils/api';
import {
  SessionType,
  SessionDetail,
  Patient,
  DashboardResponse,
  SessionFormData,
  PatientFormData,
  SessionFilter,
  PatientFilter,
  TherapistError,
  CalendarSession,
  SessionNotes,
  SessionUpdate,
  ConsentData,
  NewPatientFormData,
  StartNewSessionPatient,
  NewPatientFormFields,
  TherapistPinResponse,
  CreatePatientResponse,
  TherapistQRInfo,
  CreateSessionData,
  StartSessionData,
  PatientDetailsType,
  EndSessionFormData,
} from '../types/therapist';

class TherapistService {
  /**
   * Dashboard API calls
   */
  async getDashboardData(): Promise<DashboardResponse> {
    try {
      console.log('[TherapistService] GET /therapy_sessions/dashboard/');
      const response = await api.get<DashboardResponse>('/therapy_sessions/dashboard/');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Sessions API calls
   */
  async getSessions(filter: SessionFilter = {}): Promise<SessionType[]> {
    try {
      let endpoint = '/therapy_sessions/sessions/';
      const params = new URLSearchParams();
      
      if (filter.date) {
        params.append('date', filter.date);
      }
      if (filter.status && filter.status !== 'ALL') {
        params.append('status', filter.status);
      }
      if (filter.patient_id) {
        params.append('patient_id', filter.patient_id);
      }
      if (filter.session_type) {
        params.append('session_type', filter.session_type);
      }
      
      const queryString = params.toString();
      if (queryString) {
        endpoint += `?${queryString}&limit=50`;
      } else {
        endpoint += '?limit=50';
      }

      console.log('[TherapistService] GET', endpoint);
      const response = await api.get(endpoint);
      
      // Handle different response structures
      let sessionsData = [];
      if (response.data) {
        if (Array.isArray(response.data.sessions)) {
          sessionsData = response.data.sessions;
        } else if (Array.isArray(response.data)) {
          sessionsData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          sessionsData = response.data.results;
        }
      }
      
      return sessionsData;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getSessionDetail(sessionId: string): Promise<SessionDetail> {
    try {
      console.log('[TherapistService] GET /therapy_sessions/sessions/', sessionId);
      const response = await api.get<SessionDetail>(`/therapy_sessions/sessions/${sessionId}/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async createSession(sessionData: SessionFormData): Promise<SessionType> {
    try {
      console.log('[TherapistService] POST /therapy_sessions/sessions/', sessionData);
      const response = await api.post<SessionType>('/therapy_sessions/sessions/', sessionData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateSession(sessionId: string, updateData: SessionUpdate): Promise<SessionType> {
    try {
      console.log('[TherapistService] PATCH /therapy_sessions/sessions/', sessionId, updateData);
      const response = await api.patch<SessionType>(`/therapy_sessions/sessions/${sessionId}/`, updateData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateSessionNotes(sessionId: string, notesData: SessionNotes): Promise<void> {
    try {
      console.log('[TherapistService] PATCH /therapy_sessions/sessions/', sessionId, '/', notesData);
      const response = await api.patch(`/therapy_sessions/sessions/${sessionId}/`, notesData);
      console.log('[TherapistService] Session notes update response:', response.data);
    } catch (error: any) {
      console.error('[TherapistService] Session notes update failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Calendar API calls
   */
  async getCalendarSessions(date: string): Promise<CalendarSession[]> {
    try {
      console.log('[TherapistService] GET /therapy_sessions/sessions/?date=', date);
      const response = await api.get(`/therapy_sessions/sessions/?date=${date}&limit=50`);
      
      let sessionsData = [];
      if (response.data && Array.isArray(response.data.sessions)) {
        sessionsData = response.data.sessions.map((s: any) => ({
          id: s.id,
          patient_name: s.patient_name || 'Unknown',
          session_date: s.session_date || 'Unknown',
          status: s.status || 'UNKNOWN',
          session_type: s.session_type || 'General',
          location: s.location || 'Unknown',
          duration_minutes: s.duration_minutes || 0,
        }));
      }
      
      return sessionsData;
    } catch (error: any) {
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
      
      if (filter.search_query) {
        params.append('search', filter.search_query);
      }
      if (filter.gender) {
        params.append('gender', filter.gender);
      }
      if (filter.therapy_status) {
        params.append('therapy_status', filter.therapy_status);
      }
      
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
      const cleanedPatients = patientsData.map((patient: any) => ({
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
    } catch (error: any) {
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

  async getPatientSessions(patientId: string): Promise<any[]> {
    try {
      console.log('[TherapistService] GET /therapy_sessions/sessions/?patient=', patientId);
      const response = await api.get(`/therapy_sessions/sessions/?patient=${patientId}`);
      return response.data || [];
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
  async getTherapistPatients(): Promise<any[]> {
    try {
      console.log('[TherapistService] GET /users/patients/');
      const response = await api.get('/users/patients/');
      return response.data.patients || [];
    } catch (error: any) {
      console.warn('[TherapistService] No patients data available:', error.message);
      return [];
    }
  }

  async getTherapistSessions(): Promise<any[]> {
    try {
      console.log('[TherapistService] GET /therapy_sessions/sessions/');
      const response = await api.get('/therapy_sessions/sessions/');
      return response.data.sessions || response.data || [];
    } catch (error: any) {
      console.warn('[TherapistService] No sessions data available:', error.message);
      return [];
    }
  }

  async addPatient(patientData: PatientFormData): Promise<Patient> {
    try {
      console.log('[TherapistService] POST /therapy_sessions/patients/create/', patientData);
      const response = await api.post<{message: string, patient: Patient}>('/therapy_sessions/patients/create/', patientData);
      return response.data.patient || response.data as unknown as Patient; // backend returns {"message":..., "patient":...} or similar
    } catch (error: any) {
      throw this.handleError(error);
    }
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

  async getConsentStatus(patientId: string, therapistId: string): Promise<any> {
    try {
      console.log('[TherapistService] GET /therapy_sessions/consent/status/', { patientId, therapistId });
      const response = await api.get(`/therapy_sessions/consent/status/?patient_id=${patientId}&therapist_id=${therapistId}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * QR Code and session management
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

  async startSession(sessionId: string): Promise<SessionType> {
    try {
      console.log('[TherapistService] POST /therapy_sessions/sessions/', sessionId, '/start/');
      const response = await api.post<SessionType>(`/therapy_sessions/sessions/${sessionId}/start/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async endSession(sessionId: string, sessionData: EndSessionFormData): Promise<any> {
    try {
      console.log('[TherapistService] POST /therapy_sessions/sessions/', sessionId, '/end/', sessionData);
      const response = await api.post(`/therapy_sessions/sessions/${sessionId}/end/`, sessionData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Profile and tools
   */
  async getTherapistProfile(): Promise<any> {
    try {
      console.log('[TherapistService] GET /users/profile/');
      const response = await api.get('/users/profile/');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateTherapistProfile(profileData: any): Promise<any> {
    try {
      console.log('[TherapistService] PATCH /users/profile/', profileData);
      const response = await api.patch('/users/profile/', profileData);
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

  async createSessionPatient(patientData: NewPatientFormFields): Promise<CreatePatientResponse> {
    try {
      console.log('[TherapistService] POST /therapy_sessions/patients/create/', patientData);
      const response = await api.post<CreatePatientResponse>('/therapy_sessions/patients/create/', patientData);
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

  /**
   * Therapist notifications
   */
  async getTherapistNotifications(params?: { is_read?: boolean; category?: 'session' | 'mood' | 'other' }): Promise<any[]> {
    try {
      const query: Record<string, string> = {};
      if (typeof params?.is_read === 'boolean') {
        query.is_read = params.is_read ? 'true' : 'false';
      }
      if (params?.category) {
        query.category = params.category;
      }

      const response = await api.get('/patients/therapist/notifications/', { params: query });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getTherapistUnreadNotificationCount(): Promise<number> {
    try {
      const response = await api.get<{ unread_count: number }>('/patients/therapist/notifications/unread-count/');
      return Number(response.data?.unread_count || 0);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async markTherapistNotificationRead(notificationId: string): Promise<any> {
    try {
      const response = await api.post(`/patients/therapist/notifications/${notificationId}/read/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async markAllTherapistNotificationsRead(): Promise<number> {
    try {
      const response = await api.post<{ marked_count: number }>('/patients/therapist/notifications/mark-all-read/');
      return Number(response.data?.marked_count || 0);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async deleteTherapistNotification(notificationId: string): Promise<void> {
    try {
      await api.delete(`/patients/therapist/notifications/${notificationId}/`);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors and transform them into TherapistError
   */
  private handleError(error: any): TherapistError {
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

  /**
   * Session Consent API calls
   */
  static async createSession(sessionData: CreateSessionData): Promise<{ id: string }> {
    try {
      const response = await api.post('/therapy_sessions/sessions/create/', sessionData);
      return response.data;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  static async startSession(sessionId: string, startData: StartSessionData): Promise<any> {
    try {
      const response = await api.post(`/therapy_sessions/sessions/${sessionId}/start/`, startData);
      return response.data;
    } catch (error) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }

  /**
   * Session Details API calls
   */
  static async fetchPatientSessions(patientId: string): Promise<any[]> {
    try {
      const response = await api.get(`/therapy_sessions/sessions/?patient=${patientId}`);
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch patient sessions directly:', error);
      throw error;
    }
  }

  static async fetchPatientsData(): Promise<any[]> {
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
}

export default new TherapistService();
