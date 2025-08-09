// app/services/therapist.service.ts
import api from '../utils/api';
import {
  SessionType,
  SessionDetail,
  Patient,
  DashboardResponse,
  SessionsResponse,
  PatientsResponse,
  SessionFormData,
  PatientFormData,
  SessionFilter,
  PatientFilter,
  TherapistError,
  CalendarSession,
  SessionNotes,
  SessionUpdate,
  ConsentData,
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
      console.log('[TherapistService] PATCH /therapy_sessions/sessions/', sessionId, '/notes/', notesData);
      await api.patch(`/therapy_sessions/sessions/${sessionId}/`, notesData);
    } catch (error: any) {
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
      let endpoint = '/users/patients/';
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
      
      // Handle different response structures
      if (response.data && Array.isArray(response.data.patients)) {
        return response.data.patients;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      
      return [];
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getPatientDetail(patientId: string): Promise<Patient> {
    try {
      console.log('[TherapistService] GET /users/patients/', patientId);
      const response = await api.get<Patient>(`/users/patients/${patientId}/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async addPatient(patientData: PatientFormData): Promise<Patient> {
    try {
      console.log('[TherapistService] POST /users/patients/', patientData);
      const response = await api.post<Patient>('/users/patients/', patientData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updatePatient(patientId: string, patientData: Partial<PatientFormData>): Promise<Patient> {
    try {
      console.log('[TherapistService] PATCH /users/patients/', patientId, patientData);
      const response = await api.patch<Patient>(`/users/patients/${patientId}/`, patientData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async deletePatient(patientId: string): Promise<void> {
    try {
      console.log('[TherapistService] DELETE /users/patients/', patientId);
      await api.delete(`/users/patients/${patientId}/`);
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
    } catch (error: any) {
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

  async endSession(sessionId: string, sessionData: Partial<SessionUpdate>): Promise<SessionType> {
    try {
      console.log('[TherapistService] POST /therapy_sessions/sessions/', sessionId, '/end/', sessionData);
      const response = await api.post<SessionType>(`/therapy_sessions/sessions/${sessionId}/end/`, sessionData);
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
}

export default new TherapistService();
