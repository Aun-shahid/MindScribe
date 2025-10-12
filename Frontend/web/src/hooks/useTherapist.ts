// src/hooks/useTherapist.ts
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import therapistService from '../services/therapist.service';
import { listenToAppEvent, emitAppEvent } from '../utils/events';
import type {
  SessionType,
  SessionDetail,
  Patient,
  DashboardResponse,
  SessionFilter,
  PatientFilter,
  SessionFormData,
  PatientFormData,
  TherapistError,
  CalendarSession,
  SessionNotes,
  SessionUpdate,
  PatientDetailsType,
  PatientDetailsState,
  PatientDetailsActions,
  EndSessionState,
  EndSessionActions,
  EndSessionParams,
  EndSessionFormData,
  SessionConsentData,
  SessionConsentParams,
  QRCodeState,
  TherapistQRInfo,
} from '../types/therapist';

interface UseTherapistQRCodeActions {
  fetchTherapistInfo: () => Promise<void>;
  handleShare: () => Promise<void>;
  handleRefresh: () => void;
}

// Dashboard Hook
export const useTherapistDashboard = () => {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TherapistError | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await therapistService.getDashboardData();
      setDashboard(data);
    } catch (err) {
      setError(err as TherapistError);
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    
    // Listen for patient-related events to auto-refresh dashboard
    const cleanupCreated = listenToAppEvent('patient-created', () => {
      console.log('Patient created, refreshing dashboard...');
      fetchDashboard();
    });
    
    const cleanupUpdated = listenToAppEvent('patient-updated', () => {
      console.log('Patient updated, refreshing dashboard...');
      fetchDashboard();
    });
    
    const cleanupDeleted = listenToAppEvent('patient-deleted', () => {
      console.log('Patient deleted, refreshing dashboard...');
      fetchDashboard();
    });
    
    // Return cleanup function for all listeners
    return () => {
      cleanupCreated();
      cleanupUpdated();
      cleanupDeleted();
    };
  }, [fetchDashboard]);

  const refreshDashboard = useCallback(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    dashboard,
    loading,
    error,
    fetchDashboard,
    refreshDashboard,
    clearError,
  };
};

// Sessions Hook
export const useTherapistSessions = (initialFilter: SessionFilter = {}) => {
  const [sessions, setSessions] = useState<SessionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TherapistError | null>(null);
  const [filter, setFilter] = useState<SessionFilter>(initialFilter);

  const fetchSessions = useCallback(async (filterOverride?: SessionFilter) => {
    try {
      setLoading(true);
      setError(null);
      const currentFilter = filterOverride || filter;
      const data = await therapistService.getSessions(currentFilter);
      setSessions(data);
    } catch (err) {
      setError(err as TherapistError);
      console.error('Sessions fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const updateFilter = useCallback((newFilter: SessionFilter) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const createSession = useCallback(async (sessionData: SessionFormData): Promise<SessionType | null> => {
    try {
      setError(null);
      const newSession = await therapistService.createSession(sessionData);
      await fetchSessions(); // Refresh list
      return newSession;
    } catch (err) {
      setError(err as TherapistError);
      console.error('Session creation error:', err);
      return null;
    }
  }, [fetchSessions]);

  const updateSession = useCallback(async (sessionId: string, updateData: SessionUpdate): Promise<boolean> => {
    try {
      setError(null);
      await therapistService.updateSession(sessionId, updateData);
      await fetchSessions(); // Refresh list
      return true;
    } catch (err) {
      setError(err as TherapistError);
      console.error('Session update error:', err);
      return false;
    }
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    filter,
    updateFilter,
    fetchSessions,
    createSession,
    updateSession,
    clearError: () => setError(null),
  };
};

// Session Detail Hook
export const useSessionDetail = (sessionId: string) => {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TherapistError | null>(null);

  const fetchSessionDetail = useCallback(async () => {
    if (!sessionId || sessionId === 'undefined' || sessionId === 'null') {
      setError({ message: 'Invalid session ID', code: 'INVALID_ID' });
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      console.log('[useSessionDetail] Fetching session detail for:', sessionId);
      const data = await therapistService.getSessionDetail(sessionId);
      console.log('[useSessionDetail] Session detail fetched:', data);
      setSession(data);
    } catch (err) {
      setError(err as TherapistError);
      console.error('Session detail fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSessionDetail();
  }, [fetchSessionDetail]);

  const updateNotes = useCallback(async (notesData: SessionNotes) => {
    try {
      setError(null);
      console.log('[useSessionDetail] Updating notes for session:', sessionId, notesData);
      await therapistService.updateSessionNotes(sessionId, notesData);
      console.log('[useSessionDetail] Notes updated successfully, refetching session data...');
      // Refetch session data to get updated notes
      await fetchSessionDetail();
      console.log('[useSessionDetail] Session data refetched successfully');
    } catch (err) {
      console.error('[useSessionDetail] Failed to update notes:', err);
      setError(err as TherapistError);
      throw err;
    }
  }, [sessionId, fetchSessionDetail]);

  return {
    session,
    loading,
    error,
    fetchSession: fetchSessionDetail,
    updateSessionNotes: updateNotes,
    startSession: () => Promise.resolve(), // Placeholder
    clearError: () => setError(null),
  };
};

// Calendar Hook
export const useSessionCalendar = () => {
  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TherapistError | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const fetchCalendarSessions = useCallback(async (date: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await therapistService.getCalendarSessions(date);
      setSessions(data);
    } catch (err) {
      setError(err as TherapistError);
      console.error('Calendar sessions fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarSessions(selectedDate);
  }, [selectedDate, fetchCalendarSessions]);

  const changeDate = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  return {
    sessions,
    loading,
    error,
    selectedDate,
    changeDate,
    fetchCalendarSessions,
    clearError: () => setError(null),
  };
};

// Patients Hook
export const useTherapistPatients = (initialFilter: PatientFilter = {}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TherapistError | null>(null);
  const [filter, setFilter] = useState<PatientFilter>(initialFilter);

  const fetchPatients = useCallback(async (filterOverride?: PatientFilter) => {
    try {
      setLoading(true);
      setError(null);
      const currentFilter = filterOverride || filter;
      const data = await therapistService.getPatients(currentFilter);
      setPatients(data);
    } catch (err) {
      setError(err as TherapistError);
      console.error('Patients fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const updateFilter = useCallback((newFilter: PatientFilter) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const addPatient = useCallback(async (patientData: PatientFormData): Promise<Patient | null> => {
    try {
      setError(null);
      const newPatient = await therapistService.addPatient(patientData);
      await fetchPatients(); // Refresh list
      
      // Emit patient creation event to refresh dashboard
      emitAppEvent('patient-created', newPatient);
      
      return newPatient;
    } catch (err) {
      setError(err as TherapistError);
      console.error('Patient creation error:', err);
      return null;
    }
  }, [fetchPatients]);

  const updatePatient = useCallback(async (patientId: string, patientData: Partial<PatientFormData>): Promise<boolean> => {
    try {
      setError(null);
      await therapistService.updatePatient(patientId, patientData);
      await fetchPatients(); // Refresh list
      
      // Emit patient update event to refresh dashboard
      emitAppEvent('patient-updated', { patientId, patientData });
      
      return true;
    } catch (err) {
      setError(err as TherapistError);
      console.error('Patient update error:', err);
      return false;
    }
  }, [fetchPatients]);

  const deletePatient = useCallback(async (patientId: string): Promise<boolean> => {
    try {
      setError(null);
      await therapistService.deletePatient(patientId);
      await fetchPatients(); // Refresh list
      
      // Emit patient deletion event to refresh dashboard
      emitAppEvent('patient-deleted', { patientId });
      
      return true;
    } catch (err) {
      setError(err as TherapistError);
      console.error('Patient deletion error:', err);
      return false;
    }
  }, [fetchPatients]);

  return {
    patients,
    loading,
    error,
    filter,
    updateFilter,
    fetchPatients,
    addPatient,
    updatePatient,
    deletePatient,
    clearError: () => setError(null),
  };
};

// Patient Detail Hook
export const usePatientDetail = (patientId: string): PatientDetailsState & PatientDetailsActions => {
  const [patient, setPatient] = useState<PatientDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchPatientDetails = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all patients and find the specific one
      const patientsData = await therapistService.getPatientDetails();

      if (patientsData && Array.isArray(patientsData)) {
        // Find the patient by ID from the list
        const foundPatient = patientsData.find((patient) => patient.id === id);

        if (foundPatient) {
          console.log('Found patient data:', JSON.stringify(foundPatient, null, 2));
          setPatient(foundPatient);
        } else {
          setError('Patient not found');
          console.error('Patient not found with ID:', id);
        }
      } else {
        setError('Failed to fetch patient data');
        console.error('Invalid patients data received:', patientsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch patient details');
      console.error('Patient detail fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (patientId) {
      fetchPatientDetails(patientId);
    }
  }, [patientId, fetchPatientDetails]);

  const handleStartSession = useCallback(() => {
    if (patient) {
      navigate(`/sessions/new?patientId=${patient.id}&patientName=${encodeURIComponent(patient.full_name)}`);
    }
  }, [patient, navigate]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    patient,
    loading,
    error,
    fetchPatientDetails,
    handleStartSession,
    clearError,
  };
};

// Session Consent Hook
export const useSessionConsent = (params: SessionConsentParams) => {
  const [formData, setFormData] = useState<SessionConsentData>({
    session_type: 'individual',
    duration_minutes: 60,
    location: '',
    patient_goals: '',
    fee_charged: 0,
    is_online: false,
    consent_recording: false,
    consent_ai_analysis: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const updateField = useCallback((field: keyof SessionConsentData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Create session with correct data structure for /therapy_sessions/schedule/
      const now = new Date();
      // Add 1 minute to ensure it's in the future (backend validation requirement)
      const scheduledDate = new Date(now.getTime() + 60000); // Add 1 minute
      
      const sessionData: SessionFormData = {
        patient_id: params.patientId,
        scheduled_date: scheduledDate.toISOString(), // Must be in the future
        duration_minutes: Number(formData.duration_minutes),
        session_type: formData.session_type,
        location: formData.location || 'Office',
        is_online: formData.is_online,
        patient_goals: formData.patient_goals || '',
        fee_charged: formData.fee_charged || 0,
      };

      console.log('Creating session with data:', sessionData);
      const session = await therapistService.createSession(sessionData);
      
      if (session) {
        // Start the session
        await therapistService.startSession(session.id);
        navigate(`/sessions/${session.id}`);
      }
    } catch (err: any) {
      console.error('Session consent error:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.detail || err.response?.data || err.message || 'Failed to create session';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [formData, params, navigate]);

  return {
    formData,
    loading,
    error,
    updateField,
    handleSubmit,
    clearError: () => setError(null),
  };
};

// QR Code Hook
export const useTherapistQRCode = (): QRCodeState & UseTherapistQRCodeActions => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [therapistInfo, setTherapistInfo] = useState<TherapistQRInfo | null>(null);

  const fetchTherapistInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await therapistService.getTherapistQRInfo();
      setTherapistInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch therapist info');
      console.error('QR code fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTherapistInfo();
  }, [fetchTherapistInfo]);

  const handleShare = useCallback(async () => {
    if (therapistInfo && navigator.share) {
      try {
        await navigator.share({
          title: 'MindScribe - Connect with your Therapist',
          text: `Use this PIN to connect: ${(therapistInfo as any).therapist_pin}`,
          url: window.location.origin,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback to clipboard
      if (therapistInfo) {
        navigator.clipboard.writeText(`MindScribe PIN: ${(therapistInfo as any).therapist_pin}`);
        alert('PIN copied to clipboard!');
      }
    }
  }, [therapistInfo]);

  const handleRefresh = useCallback(() => {
    fetchTherapistInfo();
  }, [fetchTherapistInfo]);

  return {
    loading,
    error,
    therapistInfo,
    fetchTherapistInfo,
    handleShare,
    handleRefresh,
  };
};

// Profile Hook
export const useTherapistProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await therapistService.getTherapistProfile();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch profile if we have an access token (user is authenticated)
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
      setError('User not authenticated');
    }
  }, [fetchProfile]);

  const updateProfile = useCallback(async (profileData: any): Promise<boolean> => {
    try {
      setError(null);
      const updatedProfile = await therapistService.updateTherapistProfile(profileData);
      setProfile(updatedProfile);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      console.error('Profile update error:', err);
      return false;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      // Clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      // Redirect to login
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, [navigate]);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    handleLogout,
    clearError: () => setError(null),
  };
};

// End Session Hook
export const useEndSession = (params: EndSessionParams): EndSessionState & EndSessionActions => {
  const [loading, setLoading] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [patientMoodAfter, setPatientMoodAfter] = useState('');
  const [homeworkAssigned, setHomeworkAssigned] = useState('');
  const [nextSessionGoals, setNextSessionGoals] = useState('');
  const [sessionEffectiveness, setSessionEffectiveness] = useState('');
  const navigate = useNavigate();

  const handleCompleteSession = useCallback(async () => {
    try {
      setLoading(true);
      
      const sessionData: EndSessionFormData = {
        session_notes: sessionNotes,
        patient_mood_after: parseInt(patientMoodAfter) || 5,
        homework_assigned: homeworkAssigned,
        next_session_goals: nextSessionGoals,
        session_effectiveness: parseInt(sessionEffectiveness) || 5,
      };

      await therapistService.endSession(params.sessionId as string, sessionData);
      navigate('/sessions');
    } catch (err) {
      console.error('End session error:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionNotes, patientMoodAfter, homeworkAssigned, nextSessionGoals, sessionEffectiveness, params.sessionId, navigate]);

  const resetForm = useCallback(() => {
    setSessionNotes('');
    setPatientMoodAfter('');
    setHomeworkAssigned('');
    setNextSessionGoals('');
    setSessionEffectiveness('');
  }, []);

  return {
    loading,
    sessionNotes,
    patientMoodAfter,
    homeworkAssigned,
    nextSessionGoals,
    sessionEffectiveness,
    handleCompleteSession,
    setSessionNotes,
    setPatientMoodAfter,
    setHomeworkAssigned,
    setNextSessionGoals,
    setSessionEffectiveness,
    resetForm,
  };
};

// Create Patient Hook
export const useCreatePatient = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TherapistError | null>(null);

  const createPatient = useCallback(async (patientData: any) => {
    try {
      setLoading(true);
      setError(null);
      
      // Map frontend day names to backend format (lowercase)
      const mapDayToBackendFormat = (day: string) => {
        return day.toLowerCase();
      };

      // Map frontend language to backend format
      const mapLanguageToBackendFormat = (lang: string) => {
        const langMap: { [key: string]: string } = {
          'english': 'en',
          'urdu': 'ur',
          'spanish': 'en', // Fallback to English
          'french': 'en',  // Fallback to English
          'other': 'en'    // Fallback to English
        };
        return langMap[lang] || 'en';
      };

      // Sanitize and map data to backend requirements
      const sanitizedData = {
        first_name: patientData.first_name,
        last_name: patientData.last_name,
        email: patientData.email || '', // Backend expects empty string, not undefined
        phone_number: patientData.phone_number,
        date_of_birth: patientData.date_of_birth || null,
        gender: patientData.gender || '',
        primary_concern: patientData.primary_concern || '',
        therapy_start_date: patientData.therapy_start_date || null,
        session_frequency: patientData.session_frequency || 'weekly',
        preferred_session_days: patientData.preferred_session_days?.map(mapDayToBackendFormat) || [],
        emergency_contact_name: patientData.emergency_contact_name || '',
        emergency_contact_phone: patientData.emergency_contact_phone || '',
        address: patientData.address || '',
        medical_history: patientData.medical_history || '',
        current_medications: patientData.current_medications || '',
        preferred_language: mapLanguageToBackendFormat(patientData.preferred_language || 'english'),
      };
      
      // Use the correct endpoint for patient creation
      const response = await therapistService.createSessionPatient(sanitizedData);
      
      // Emit patient creation event to refresh dashboard
      emitAppEvent('patient-created', response);
      
      return response;
    } catch (err) {
      const error = err as TherapistError;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createPatient,
    loading,
    error,
  };
};