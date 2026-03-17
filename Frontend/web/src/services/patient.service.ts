// src/services/patient.service.ts
import api from '../utils/api';

/**
 * Patient Service
 * Handles all patient-related API calls for mood tracking, journal, relaxation, etc.
 */

export const patientService = {
  // Dashboard
  getDashboard: async () => {
    const response = await api.get('/patients/dashboard/');
    return response.data;
  },

  // Mood tracking
  getMoods: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const response = await api.get(`/patients/mood/?${params}`);
    return response.data;
  },

  getMoodById: async (id: number) => {
    const response = await api.get(`/patients/mood/${id}/`);
    return response.data;
  },

  createMood: async (moodData: {
    mood_intensities: Record<string, number>;
    notes?: string;
    triggers?: string;
    triggers_list?: string[];
    activities?: string;
    mood_date?: string;
  }) => {
    const response = await api.post('/patients/mood/', moodData);
    return response.data;
  },

  updateMood: async (id: number, moodData: any) => {
    const response = await api.put(`/patients/mood/${id}/`, moodData);
    return response.data;
  },

  deleteMood: async (id: number) => {
    await api.delete(`/patients/mood/${id}/`);
  },

  // Journal entries
  getJournalEntries: async () => {
    const response = await api.get('/patients/journal/');
    return response.data;
  },

  getJournalEntryById: async (id: number) => {
    const response = await api.get(`/patients/journal/${id}/`);
    return response.data;
  },

  createJournalEntry: async (entryData: {
    title?: string;
    content: string;
    mood?: string;
    tags?: string[];
  }) => {
    const response = await api.post('/patients/journal/', entryData);
    return response.data;
  },

  updateJournalEntry: async (id: number, entryData: any) => {
    const response = await api.put(`/patients/journal/${id}/`, entryData);
    return response.data;
  },

  deleteJournalEntry: async (id: number) => {
    await api.delete(`/patients/journal/${id}/`);
  },

  // Relaxation content
  getRelaxationContent: async () => {
    const response = await api.get('/patients/relaxation/content/');
    return response.data;
  },

  getRelaxationContentById: async (id: number) => {
    const response = await api.get(`/patients/relaxation/content/${id}/`);
    return response.data;
  },

  getRelaxationTips: async () => {
    const response = await api.get('/patients/relaxation/tips/');
    return response.data;
  },

  // Goals
  getGoals: async () => {
    const response = await api.get('/patients/goals/');
    return response.data;
  },

  getGoalById: async (id: number) => {
    const response = await api.get(`/patients/goals/${id}/`);
    return response.data;
  },

  createGoal: async (goalData: {
    title: string;
    description?: string;
    target_date?: string;
    category?: string;
  }) => {
    const response = await api.post('/patients/goals/', goalData);
    return response.data;
  },

  updateGoal: async (id: number, goalData: any) => {
    const response = await api.put(`/patients/goals/${id}/`, goalData);
    return response.data;
  },

  deleteGoal: async (id: number) => {
    await api.delete(`/patients/goals/${id}/`);
  },

  markGoalComplete: async (id: number) => {
    const response = await api.post(`/patients/goals/${id}/complete/`);
    return response.data;
  },

  // Notifications
  getNotifications: async () => {
    const response = await api.get('/patients/notifications/');
    return response.data;
  },

  markNotificationRead: async (id: number) => {
    const response = await api.post(`/patients/notifications/${id}/mark_read/`);
    return response.data;
  },

  markAllNotificationsRead: async () => {
    const response = await api.post('/patients/notifications/mark_all_read/');
    return response.data;
  },

  // Notification preferences
  getNotificationPreferences: async () => {
    const response = await api.get('/patients/notifications/preferences/');
    return response.data;
  },

  updateNotificationPreferences: async (preferences: any) => {
    const response = await api.put('/patients/notifications/preferences/', preferences);
    return response.data;
  },

  // Emotional insights (AI-powered)
  getEmotionalInsights: async () => {
    const response = await api.get('/patients/emotional-insights/');
    return response.data;
  },

  // Inspiration
  getDailyInspiration: async () => {
    const response = await api.get('/patients/inspiration/daily/');
    return response.data;
  },

  getRandomInspiration: async () => {
    const response = await api.get('/patients/inspiration/random/');
    return response.data;
  },

  // Added from Therapist Service
  getPatients: async (filter: any = {}) => {
    let endpoint = '/therapy_sessions/patients/';
    const params = new URLSearchParams();

    if (filter.search) {
      params.append('search', filter.search);
    }
    
    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    const response = await api.get(endpoint);
    
    let patientsData = [];
    if (response.data && Array.isArray(response.data.patients)) {
      patientsData = response.data.patients;
    } else if (Array.isArray(response.data)) {
      patientsData = response.data;
    } else if (response.data && Array.isArray(response.data.results)) {
      patientsData = response.data.results;
    }
    
    return patientsData.map((patient: any) => ({
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
        last_session: typeof patient.last_session === 'string'
          ? patient.last_session
          : (typeof patient.last_session?.date === 'string' ? patient.last_session.date : null),
        next_session: typeof patient.next_session === 'string'
          ? patient.next_session
          : (typeof patient.next_session?.date === 'string' ? patient.next_session.date : null),
        total_sessions: patient.total_sessions?.toString() || '0',
        created_at: typeof patient.created_at === 'string' ? patient.created_at : ''
      }));
  },

  getPatientDetail: async (patientId: string) => {
    const response = await api.get(`/therapy_sessions/patients/${patientId}/`);
    return response.data;
  },

  getPatientDetails: async () => {
    const response = await api.get('/therapy_sessions/patients/');
    return response.data || [];
  },

  getTherapistPatients: async () => {
    try {
      const response = await api.get('/users/patients/');
      return response.data.patients || [];
    } catch {
      return [];
    }
  },

  createPatient: async (patientData: any) => {
    const response = await api.post('/therapy_sessions/patients/create/', patientData);
    return response.data.patient || response.data;
  },

  updatePatient: async (patientId: string, patientData: any) => {
    const response = await api.patch(`/therapy_sessions/patients/${patientId}/`, patientData);
    return response.data;
  },

  deletePatient: async (patientId: string) => {
    await api.delete(`/therapy_sessions/patients/${patientId}/`);
  },

  getMoodTrend: async (patientId: string) => {
    const params = new URLSearchParams();
    params.append('patient_id', patientId);
    const response = await api.get(`/therapy_sessions/mood-trend/?${params.toString()}`);
    return response.data;
  }
};

export default patientService;
