
// app/hooks/useTherapist.ts
import { useState, useEffect, useCallback } from 'react';
import { Alert, Share } from 'react-native';
import { router } from 'expo-router';
import therapistService from '../services/therapist.service';
import api from '../utils/api';
import {
  SessionType,
  SessionDetail,
  Session,
  Patient,
  PatientWithSessions,
  DashboardResponse,
  SessionFilter,
  PatientFilter,
  SessionFormData,
  PatientFormData,
  TherapistError,
  CalendarSession,
  SessionNotes,
  SessionUpdate,
  SessionDetailsParams,
  StartNewSessionPatient,
  NewPatientFormFields,
  SessionTab,
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
} from '../types/therapist';
import {
  validateNewPatientForm,
  filterPatients,
  getInitialNewPatientForm
} from '../utils/startNewSession';
import { cleanPatientData, findPatientById } from '../utils/patientDetails';
import {
  getDefaultEndSessionForm,
  validateEndSessionForm,
  prepareEndSessionPayload,
  formatEndSessionError,
  logEndSessionError,
  logEndSessionRequest,
} from '../utils/endSession';
import {
  getInitialPatientFormData,
  validatePatientForm,
  preparePatientDataForAPI,
  updatePatientField,
  togglePreferredDay,
  formatAPIError
} from '../utils/addPatientForm';
import {
  getInitialConsentData,
  validateConsentData,
  prepareCreateSessionData,
  prepareStartSessionData,
  formatErrorMessage,
  updateConsentField,
  handleDurationInput,
  handleFeeInput
} from '../utils/sessionConsent';
import { validateTherapistInfo, getErrorMessage, generateShareMessage } from '../utils/therapistQRCode';
import { THERAPIST_MESSAGES, ADD_PATIENT_FORM_MESSAGES } from '../constants/messages';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  }, [fetchDashboard]);

  return {
    dashboard,
    loading,
    error,
    refetch: fetchDashboard,
  };
};

// Sessions Hook
export const useTherapistSessions = (initialFilter: SessionFilter = {}) => {
  const [sessions, setSessions] = useState<SessionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TherapistError | null>(null);
  const [filter, setFilter] = useState<SessionFilter>(initialFilter);

  const fetchSessions = useCallback(async (filterParams?: SessionFilter) => {
    try {
      setLoading(true);
      setError(null);
      const currentFilter = filterParams || filter;
      const data = await therapistService.getSessions(currentFilter);
      setSessions(data);
    } catch (err) {
      setError(err as TherapistError);
      console.error('Sessions fetch error:', err);
      Alert.alert('Error', 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const updateFilter = useCallback((newFilter: SessionFilter) => {
    setFilter(newFilter);
    fetchSessions(newFilter);
  }, [fetchSessions]);

  const createSession = useCallback(async (sessionData: SessionFormData) => {
    try {
      setError(null);
      const newSession = await therapistService.createSession(sessionData);
      setSessions(prev => [newSession, ...prev]);
      return newSession;
    } catch (err) {
      setError(err as TherapistError);
      throw err;
    }
  }, []);

  const updateSession = useCallback(async (sessionId: string, updateData: SessionUpdate) => {
    try {
      setError(null);
      const updatedSession = await therapistService.updateSession(sessionId, updateData);
      setSessions(prev => prev.map(session => 
        session.id === sessionId ? updatedSession : session
      ));
      return updatedSession;
    } catch (err) {
      setError(err as TherapistError);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    filter,
    updateFilter,
    createSession,
    updateSession,
    refetch: fetchSessions,
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
      const data = await therapistService.getSessionDetail(sessionId);
      setSession(data);
    } catch (err) {
      setError(err as TherapistError);
      console.error('Session detail fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const updateNotes = useCallback(async (notesData: SessionNotes) => {
    try {
      setError(null);
      await therapistService.updateSessionNotes(sessionId, notesData);
      // Refetch session data to get updated notes
      await fetchSessionDetail();
    } catch (err) {
      setError(err as TherapistError);
      throw err;
    }
  }, [sessionId, fetchSessionDetail]);

  useEffect(() => {
    fetchSessionDetail();
  }, [fetchSessionDetail]);

  return {
    session,
    loading,
    error,
    updateNotes,
    refetch: fetchSessionDetail,
  };
};

// Calendar Hook
export const useSessionCalendar = () => {
  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TherapistError | null>(null);

  const fetchSessionsForDate = useCallback(async (date: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await therapistService.getCalendarSessions(date);
      setSessions(data);
    } catch (err) {
      setError(err as TherapistError);
      console.error('Calendar sessions fetch error:', err);
      Alert.alert('Error', 'Could not load sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sessions,
    loading,
    error,
    fetchSessionsForDate,
  };
};

// Patients Hook
export const useTherapistPatients = (initialFilter: PatientFilter = {}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TherapistError | null>(null);
  const [filter, setFilter] = useState<PatientFilter>(initialFilter);

  const getPatients = useCallback(async (filterParams?: PatientFilter) => {
    try {
      setLoading(true);
      setError(null);
      const currentFilter = filterParams || filter;
      const data = await therapistService.getPatients(currentFilter);
      setPatients(data);
      setAllPatients(data);
    } catch (err) {
      setError(err as TherapistError);
      console.error('Patients fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const updateFilter = useCallback((newFilter: PatientFilter) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const addPatient = useCallback(async (patientData: PatientFormData) => {
    try {
      setError(null);
      const newPatient = await therapistService.addPatient(patientData);
      setPatients(prev => [...prev, newPatient]);
      setAllPatients(prev => [...prev, newPatient]);
      return newPatient;
    } catch (err) {
      setError(err as TherapistError);
      throw err;
    }
  }, []);

  const updatePatient = useCallback(async (patientId: string, patientData: Partial<Patient>) => {
    try {
      setError(null);
      const updatedPatient = await therapistService.updatePatient(patientId, patientData);
      setPatients(prev => 
        prev.map(p => p.id === patientId ? { ...p, ...updatedPatient } : p)
      );
      setAllPatients(prev => 
        prev.map(p => p.id === patientId ? { ...p, ...updatedPatient } : p)
      );
      return updatedPatient;
    } catch (err) {
      setError(err as TherapistError);
      throw err;
    }
  }, []);

  const deletePatient = useCallback(async (patientId: string) => {
    try {
      setError(null);
      await therapistService.deletePatient(patientId);
      setPatients(prev => prev.filter(p => p.id !== patientId));
      setAllPatients(prev => prev.filter(p => p.id !== patientId));
    } catch (err) {
      setError(err as TherapistError);
      throw err;
    }
  }, []);

  useEffect(() => {
    getPatients();
  }, [getPatients]);

  return {
    patients,
    allPatients,
    loading,
    error,
    filter,
    updateFilter,
    addPatient,
    updatePatient,
    deletePatient,
    refetch: getPatients,
  };
};

// Patient Detail Hook
export const usePatientDetail = (patientId: string) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TherapistError | null>(null);

  const fetchPatientDetail = useCallback(async () => {
    if (!patientId) {
      setError({ message: 'Invalid patient ID', code: 'INVALID_ID' });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await therapistService.getPatientDetail(patientId);
      setPatient(data);
    } catch (err) {
      setError(err as TherapistError);
      console.error('Patient detail fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatientDetail();
  }, [fetchPatientDetail]);

  return {
    patient,
    loading,
    error,
    refetch: fetchPatientDetail,
  };
};

// Consent Hook
export const useSessionConsent = (params: SessionConsentParams) => {
  const { patientId, patientName, isNewPatient } = params;
  
  const [submitting, setSubmitting] = useState(false);
  const [consentData, setConsentData] = useState<SessionConsentData>(getInitialConsentData());

  // Clear form data when component mounts, patientId changes, or when it's a new patient
  useEffect(() => {
    console.log('Clearing form data for patient:', patientName, 'isNewPatient:', isNewPatient);
    setConsentData(getInitialConsentData());
  }, [patientId, patientName, isNewPatient]);

  const updateField = <K extends keyof SessionConsentData>(
    field: K,
    value: SessionConsentData[K]
  ) => {
    setConsentData(prev => updateConsentField(prev, field, value));
  };

  const handleDurationChange = (text: string) => {
    setConsentData(prev => handleDurationInput(text, prev));
  };

  const handleFeeChange = (text: string) => {
    setConsentData(prev => handleFeeInput(text, prev));
  };

  const toggleCheckbox = (field: 'is_online' | 'consent_recording' | 'consent_ai_analysis') => {
    setConsentData(prev => updateConsentField(prev, field, !prev[field]));
  };

  const handleConsentAndStartSession = async () => {
    try {
      setSubmitting(true);

      // Validation
      const validationError = validateConsentData(consentData);
      if (validationError) {
        Alert.alert('Error', validationError);
        return;
      }

      // Step 1: Create a new session
      const createSessionData = prepareCreateSessionData(patientId, consentData);
      
      console.log('Creating session with data:', createSessionData);
      const createResponse = await api.post('/therapy_sessions/sessions/create/', createSessionData);
      
      if (!createResponse.data?.id) {
        throw new Error('Session creation failed - no session ID returned');
      }
      
      const sessionId = createResponse.data.id;
      console.log('Session created successfully with ID:', sessionId);
      
      // Step 2: Start the session
      const startSessionData = prepareStartSessionData();
      
      console.log('Starting session with ID:', sessionId);
      const startResponse = await api.post(`/therapy_sessions/sessions/${sessionId}/start/`, startSessionData);
      
      console.log('Session started successfully:', startResponse.data);
      
      // Step 3: Navigate to the session UI
      console.log('🚀 Navigating to start-session with params:');
      console.log('   patientId:', patientId);
      console.log('   sessionId:', sessionId);
      console.log('   sessionStarted: true');
      
      router.push({
        pathname: './start-session',
        params: { 
          patientId: patientId,
          sessionId: sessionId,
          sessionStarted: 'true'
        }
      });

    } catch (error: any) {
      console.error('❌ Failed to create session:', error);
      
      const errorMessage = formatErrorMessage(error);
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return {
    // State
    submitting,
    consentData,
    patientName: patientName || 'Unknown Patient',
    
    // Actions
    updateField,
    handleDurationChange,
    handleFeeChange,
    toggleCheckbox,
    handleConsentAndStartSession,
    handleBack,
  };
};

// QR Code Hook
export const useTherapistQRCode = (): QRCodeState & UseTherapistQRCodeActions => {
  const [state, setState] = useState<QRCodeState>({
    loading: true,
    error: null,
    therapistInfo: null
  });

  const updateState = useCallback((updates: Partial<QRCodeState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const fetchTherapistInfo = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });
      
      const data = await therapistService.getTherapistQRInfo();
      const validatedInfo = validateTherapistInfo(data);
      
      if (validatedInfo) {
        updateState({ therapistInfo: validatedInfo });
        console.log('Therapist QR Code Data:', {
          pin: validatedInfo.therapist_pin,
          name: validatedInfo.therapist_name,
          specialization: validatedInfo.specialization,
          clinic: validatedInfo.clinic_name,
          patients: validatedInfo.patient_count
        });
      } else {
        throw new Error('No therapist PIN received from server');
      }
    } catch (error: any) {
      console.error('Failed to fetch therapist info:', error);
      
      const errorMessage = getErrorMessage(error);
      updateState({ error: errorMessage });
      Alert.alert('Error', errorMessage);
    } finally {
      updateState({ loading: false });
    }
  }, [updateState]);

  const handleShare = useCallback(async () => {
    if (!state.therapistInfo) return;

    try {
      const shareMessage = generateShareMessage(state.therapistInfo);
      
      await Share.share({
        message: shareMessage,
        title: 'Connect to Your Therapist'
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share QR code. Please try again.');
    }
  }, [state.therapistInfo]);

  const handleRefresh = useCallback(() => {
    fetchTherapistInfo();
  }, [fetchTherapistInfo]);

  useEffect(() => {
    fetchTherapistInfo();
  }, [fetchTherapistInfo]);

  return {
    ...state,
    fetchTherapistInfo,
    handleShare,
    handleRefresh
  };
};

// Legacy QR Code Hook (kept for backward compatibility)
export const useQRCode = () => {
  const [qrData, setQrData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TherapistError | null>(null);

  const generateQRCode = useCallback(async (therapistId: string, sessionId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await therapistService.generateQRCode(therapistId, sessionId);
      setQrData(data);
      return data;
    } catch (err) {
      setError(err as TherapistError);
      // Fallback QR data
      const fallbackData = JSON.stringify({ therapist_id: therapistId, session_id: sessionId });
      setQrData(fallbackData);
      return fallbackData;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    qrData,
    loading,
    error,
    generateQRCode,
  };
};

// Session Management Hook
export const useSessionManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TherapistError | null>(null);

  const startSession = useCallback(async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);
      const session = await therapistService.startSession(sessionId);
      return session;
    } catch (err) {
      setError(err as TherapistError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const endSession = useCallback(async (sessionId: string, sessionData: EndSessionFormData) => {
    try {
      setLoading(true);
      setError(null);
      const session = await therapistService.endSession(sessionId, sessionData);
      return session;
    } catch (err) {
      setError(err as TherapistError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    startSession,
    endSession,
  };
};

// Therapist Profile Hook
export const useTherapistProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TherapistError | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await therapistService.getTherapistProfile();
      setProfile(data);
    } catch (err) {
      setError(err as TherapistError);
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (profileData: any) => {
    try {
      setError(null);
      const updatedProfile = await therapistService.updateTherapistProfile(profileData);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      setError(err as TherapistError);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile,
  };
};

// Patient Sessions Hook
export const usePatientSessions = (patientId: string | null) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patient, setPatient] = useState<PatientWithSessions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TherapistError | null>(null);

  const fetchPatientSessions = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching sessions for patient:', patientId);

      // Try to get sessions directly first
      try {
        const sessionsData = await therapistService.getPatientSessions(patientId);
        console.log('🔍 Direct sessions response:', sessionsData);
        if (sessionsData && Array.isArray(sessionsData) && sessionsData.length > 0) {
          console.log('✅ Found sessions directly:', sessionsData);
          setSessions(sessionsData);
          return;
        } else {
          console.log('📝 Direct sessions empty or invalid, trying patient data approach');
        }
      } catch (error) {
        console.log('📝 Direct session fetch failed with error:', error);
        console.log('📝 Trying patient data approach');
      }

      // Fallback: Use the working endpoint from patients
      const patientsData = await therapistService.getPatients();
      
      if (patientsData && Array.isArray(patientsData)) {
        // Find the specific patient
        const foundPatient = patientsData.find((p: PatientWithSessions) => p.id === patientId);
        
        if (foundPatient) {
          console.log('✅ Found patient:', foundPatient.full_name);
          console.log('📊 Patient sessions data:', {
            last_session: foundPatient.last_session,
            next_session: foundPatient.next_session,
            total_sessions: foundPatient.total_sessions
          });
          setPatient(foundPatient);
          
          // Extract sessions from patient data
          const extractedSessions: Session[] = [];
          
          // Check if last_session contains session data
          if (foundPatient.last_session) {
            console.log('🔍 Processing last_session:', foundPatient.last_session);
            let lastSessionData;
            
            if (typeof foundPatient.last_session === 'string') {
              try {
                lastSessionData = JSON.parse(foundPatient.last_session);
              } catch {
                lastSessionData = {
                  id: `last-${foundPatient.id}`,
                  session_notes: foundPatient.last_session,
                  session_type: 'individual',
                  status: 'completed'
                };
              }
            } else {
              lastSessionData = foundPatient.last_session;
            }
            
            if (lastSessionData) {
              console.log('✅ Adding last session to extracted sessions');
              extractedSessions.push({
                id: lastSessionData.id || `last-${foundPatient.id}`,
                session_number: lastSessionData.session_number || 1,
                session_type: lastSessionData.session_type || 'individual',
                status: lastSessionData.status || 'completed',
                scheduled_date: lastSessionData.scheduled_date || lastSessionData.date,
                location: lastSessionData.location || 'Office',
                is_online: lastSessionData.is_online || false,
                session_notes: lastSessionData.session_notes || lastSessionData.notes,
                patient_goals: lastSessionData.patient_goals,
                homework_assigned: lastSessionData.homework_assigned,
                next_session_goals: lastSessionData.next_session_goals,
                patient_mood_before: lastSessionData.patient_mood_before,
                patient_mood_after: lastSessionData.patient_mood_after,
                mood_improvement: lastSessionData.mood_improvement,
                session_effectiveness: lastSessionData.session_effectiveness,
                actual_duration_minutes: lastSessionData.actual_duration_minutes || lastSessionData.duration,
                created_at: lastSessionData.created_at,
                updated_at: lastSessionData.updated_at
              });
            }
          }
          
          // Check if next_session contains session data
          if (foundPatient.next_session) {
            let nextSessionData;
            
            if (typeof foundPatient.next_session === 'string') {
              try {
                nextSessionData = JSON.parse(foundPatient.next_session);
              } catch {
                nextSessionData = {
                  id: `next-${foundPatient.id}`,
                  session_notes: foundPatient.next_session,
                  session_type: 'individual',
                  status: 'scheduled'
                };
              }
            } else {
              nextSessionData = foundPatient.next_session;
            }
            
            if (nextSessionData) {
              console.log('✅ Adding next session to extracted sessions');
              extractedSessions.push({
                id: nextSessionData.id || `next-${foundPatient.id}`,
                session_number: nextSessionData.session_number || 2,
                session_type: nextSessionData.session_type || 'individual',
                status: nextSessionData.status || 'scheduled',
                scheduled_date: nextSessionData.scheduled_date || nextSessionData.date,
                location: nextSessionData.location || 'Office',
                is_online: nextSessionData.is_online || false,
                session_notes: nextSessionData.session_notes || nextSessionData.notes,
                patient_goals: nextSessionData.patient_goals,
                homework_assigned: nextSessionData.homework_assigned,
                next_session_goals: nextSessionData.next_session_goals,
                patient_mood_before: nextSessionData.patient_mood_before,
                patient_mood_after: nextSessionData.patient_mood_after,
                mood_improvement: nextSessionData.mood_improvement,
                session_effectiveness: nextSessionData.session_effectiveness,
                actual_duration_minutes: nextSessionData.actual_duration_minutes || nextSessionData.duration,
                created_at: nextSessionData.created_at,
                updated_at: nextSessionData.updated_at
              });
            }
          }
          
          console.log('📋 Final extracted sessions:', extractedSessions);
          console.log('📋 Setting sessions state with:', extractedSessions.length, 'sessions');
          
          // Note: If no sessions are extracted but patient has total_sessions > 0,
          // it means the patient has sessions but they're not in last_session/next_session fields
          // We should not create fake sessions as they will cause 404 errors when clicked
          
          setSessions(extractedSessions);
          
        } else {
          console.log('❌ Patient not found');
          setSessions([]);
        }
      }
    } catch (err) {
      console.error('❌ Failed to fetch patient sessions:', err);
      setError(err as TherapistError);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  const refreshSessions = useCallback(async () => {
    await fetchPatientSessions();
  }, [fetchPatientSessions]);

  useEffect(() => {
    fetchPatientSessions();
  }, [fetchPatientSessions]);

  return {
    sessions,
    patient,
    loading,
    error,
    refetch: refreshSessions,
  };
};

// Session Details Hook - extends usePatientSessions with navigation handlers
export const useSessionDetails = (params: SessionDetailsParams) => {
  const { patientId, patientName } = params;
  
  // Use the existing patient sessions hook
  const {
    sessions,
    patient,
    loading,
    error,
    refetch,
  } = usePatientSessions(patientId);

  // Add refreshing state for pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  // Enhanced refresh with refreshing state
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Navigation handlers
  const handleSessionPress = (session: Session) => {
    console.log('📋 Opening session details for:', session.id);
    console.log('📋 Session data being passed:', session);
    
    // Check if this is a valid session ID (not a fallback)
    if (session.id.startsWith('fallback-')) {
      Alert.alert(
        'Session Not Available',
        'This session\'s detailed information is not currently available. Please try creating a new session or contact support.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Always navigate to session-detail-view, passing the session ID
    router.push({
      pathname: './session-detail-view',
      params: {
        sessionId: session.id,
        patientName: patientName || patient?.full_name,
        patientId: patientId
      }
    });
  };

  const handleBack = () => {
    router.back();
  };

  const handleCreateNewSession = () => {
    router.push({
      pathname: './sessionformconsent',
      params: { 
        patientId: patientId,
        patientName: patientName || patient?.full_name || 'Patient'
      }
    });
  };

  const handleCreateFirstSession = () => {
    router.push({
      pathname: './start-session',
      params: { patientId: patientId }
    });
  };

  return {
    // State
    sessions,
    patient,
    loading,
    refreshing,
    error,
    patientDisplayName: patientName || patient?.full_name || 'Patient',
    
    // Actions
    onRefresh,
    handleSessionPress,
    handleBack,
    handleCreateNewSession,
    handleCreateFirstSession,
  };
};

// Start New Session Hook
export const useStartNewSession = () => {
  const [state, setState] = useState({
    activeTab: 'existing' as SessionTab,
    patients: [] as StartNewSessionPatient[],
    loading: true,
    selectedPatient: null as StartNewSessionPatient | null,
    searchQuery: '',
    therapistPin: null as string | null,
    qrLoading: false,
    qrError: null as string | null,
    newPatient: getInitialNewPatientForm(),
  });

  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const fetchTherapistPin = useCallback(async () => {
    try {
      updateState({ qrLoading: true, qrError: null });
      
      const pinData = await therapistService.getTherapistPin();
      
      if (pinData && pinData.therapist_pin) {
        updateState({ therapistPin: pinData.therapist_pin });
        console.log('Therapist PIN retrieved:', pinData.therapist_pin);
        console.log('Therapist Info:', {
          name: pinData.therapist_name,
          specialization: pinData.specialization,
          clinic: pinData.clinic_name,
          patients: pinData.patient_count
        });
      } else {
        throw new Error('No PIN received from server');
      }
    } catch (error: any) {
      console.error('Failed to fetch therapist PIN:', error);
      updateState({ qrError: 'Failed to generate QR code. Please try again.' });
      
      if (error.response?.status === 403) {
        Alert.alert('Error', 'Only therapists can access this feature.');
      } else if (error.response?.status === 404) {
        Alert.alert('Error', 'Therapist profile not found. Please contact support.');
      } else {
        Alert.alert('Error', 'Failed to load QR code. Please check your connection and try again.');
      }
    } finally {
      updateState({ qrLoading: false });
    }
  }, [updateState]);

  const fetchPatients = useCallback(async () => {
    try {
      updateState({ loading: true });
      const patientsData = await therapistService.fetchSessionPatients();
      
      if (patientsData?.length > 0) {
        // For StartNewSessionPatient, we don't need to sanitize - they're already in the right format
        updateState({ patients: patientsData });
        console.log('✅ Patients loaded:', patientsData.length);
      } else {
        updateState({ patients: [] });
        console.log('📭 No patients found');
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch patients:', error);
      Alert.alert('Error', 'Failed to load patients. Please try again.');
      updateState({ patients: [] });
    } finally {
      updateState({ loading: false });
    }
  }, [updateState]);

  useEffect(() => {
    fetchPatients();
    fetchTherapistPin();
  }, [fetchPatients, fetchTherapistPin]);

  const setActiveTab = useCallback((tab: SessionTab) => {
    updateState({ activeTab: tab });
  }, [updateState]);

  const setSelectedPatient = useCallback((patient: StartNewSessionPatient | null) => {
    updateState({ selectedPatient: patient });
  }, [updateState]);

  const setSearchQuery = useCallback((query: string) => {
    updateState({ searchQuery: query });
  }, [updateState]);

  const updateNewPatient = useCallback((field: keyof NewPatientFormFields, value: any) => {
    updateState({
      newPatient: { ...state.newPatient, [field]: value }
    });
  }, [updateState, state.newPatient]);

  const handlePatientSelect = useCallback((patient: StartNewSessionPatient) => {
    setSelectedPatient(patient);
  }, [setSelectedPatient]);

  const handleStartSession = useCallback(() => {
    if (!state.selectedPatient) {
      Alert.alert('Error', 'Please select a patient first.');
      return;
    }

    console.log('🚀 Starting session for patient:', state.selectedPatient.full_name);
    
    router.push({
      pathname: './sessionformconsent',
      params: {
        patientId: state.selectedPatient.id,
        patientName: state.selectedPatient.full_name,
        isNewPatient: 'false'
      }
    });
  }, [state.selectedPatient]);

  const handleCreatePatientAndStartSession = useCallback(async () => {
    try {
      const validation = validateNewPatientForm(state.newPatient);
      if (!validation.isValid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }

      console.log('Creating patient with data:', state.newPatient);
      
      const createdPatient = await therapistService.createNewPatient(state.newPatient);
      
      if (createdPatient?.id) {
        console.log('✅ Patient created successfully:', createdPatient);
        
        router.push({
          pathname: './sessionformconsent',
          params: {
            patientId: createdPatient.id,
            patientName: createdPatient.full_name,
            isNewPatient: 'true'
          }
        });
        
        Alert.alert('Success', `Patient ${createdPatient.full_name} created successfully!`);
      }
    } catch (error: any) {
      console.error('Error creating patient:', error);
      
      // Show the specific error message from the server
      const errorMessage = error?.message || 'Failed to create patient. Please try again.';
      const errorDetails = error?.details ? JSON.stringify(error.details, null, 2) : '';
      
      if (errorDetails) {
        console.error('Error details:', errorDetails);
        Alert.alert('Validation Error', `${errorMessage}\n\nDetails: ${errorDetails}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  }, [state.newPatient]);

  const retryFetchTherapistPin = useCallback(() => {
    fetchTherapistPin();
  }, [fetchTherapistPin]);

  const filteredPatients = filterPatients(state.patients, state.searchQuery);

  return {
    ...state,
    filteredPatients,
    setActiveTab,
    setSelectedPatient,
    setSearchQuery,
    updateNewPatient,
    handlePatientSelect,
    handleStartSession,
    handleCreatePatientAndStartSession,
    retryFetchTherapistPin,
  };
};

// Patient Details Hook
export const usePatientDetails = (patientId: string | string[]): PatientDetailsState & PatientDetailsActions => {
  const [patient, setPatient] = useState<PatientDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatientDetails = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch patient details
      const patientsData = await therapistService.getPatientDetails();
      
      if (patientsData && Array.isArray(patientsData)) {
        // Find the patient by ID from the list
        const foundPatient = findPatientById(patientsData, id);
        
        if (foundPatient) {
          console.log('Found patient data:', JSON.stringify(foundPatient, null, 2));
          
          // Clean the patient data to ensure safe rendering
          const cleanedPatient = cleanPatientData(foundPatient);
          setPatient(cleanedPatient);
        } else {
          setError('Patient not found');
          Alert.alert('Error', 'Patient not found');
          router.push('./patients');
        }
      } else {
        setError('Patient not found');
        Alert.alert('Error', 'Patient not found');
        router.push('./patients');
      }
    } catch (err) {
      console.error('Failed to fetch patient details:', err);
      const errorMessage = 'Failed to load patient details';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      router.push('./patients');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleStartSession = useCallback(() => {
    if (patient?.id) {
      router.push({
        pathname: './start-session',
        params: { patientId: patient.id }
      });
    }
  }, [patient?.id]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    const id = Array.isArray(patientId) ? patientId[0] : patientId;
    if (id) {
      fetchPatientDetails(id);
    }
  }, [patientId, fetchPatientDetails]);

  return {
    patient,
    loading,
    error,
    fetchPatientDetails,
    handleStartSession,
    clearError,
  };
};

// End Session Hook
export const useEndSession = (params: EndSessionParams): EndSessionState & EndSessionActions => {
  const [loading, setLoading] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [patientMoodAfter, setPatientMoodAfter] = useState('7');
  const [homeworkAssigned, setHomeworkAssigned] = useState('');
  const [nextSessionGoals, setNextSessionGoals] = useState('');
  const [sessionEffectiveness, setSessionEffectiveness] = useState('8');

  const resetForm = useCallback(() => {
    const defaultForm = getDefaultEndSessionForm();
    setSessionNotes(defaultForm.sessionNotes);
    setPatientMoodAfter(defaultForm.patientMoodAfter);
    setHomeworkAssigned(defaultForm.homeworkAssigned);
    setNextSessionGoals(defaultForm.nextSessionGoals);
    setSessionEffectiveness(defaultForm.sessionEffectiveness);
  }, []);

  const handleCompleteSession = useCallback(async () => {
    const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
    
    if (!sessionId) {
      Alert.alert('Error', 'No session ID found');
      return;
    }

    // Validate form data
    const validation = validateEndSessionForm({
      sessionNotes,
      patientMoodAfter,
      sessionEffectiveness,
    });

    if (!validation.isValid) {
      Alert.alert('Error', validation.error!);
      return;
    }

    // Prepare payload
    const payload = prepareEndSessionPayload({
      sessionNotes,
      patientMoodAfter,
      homeworkAssigned,
      nextSessionGoals,
      sessionEffectiveness,
    });

    try {
      setLoading(true);
      
      // Check authentication token
      const token = await AsyncStorage.getItem('access_token');
      
      // Log request details
      logEndSessionRequest(payload, sessionId, token, api.defaults.baseURL || '');
      
      const response = await therapistService.endSession(sessionId, payload);

      console.log('✅ Session ended:', response);

      // Reset form after successful completion
      resetForm();

      Alert.alert('Success', 'Session successfully completed.', [
        {
          text: 'OK',
          onPress: () => router.push('./patients'),
        }
      ]);
    } catch (error: any) {
      logEndSessionError(error, sessionId);
      const errorMessage = formatEndSessionError(error, sessionId);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    params.sessionId,
    sessionNotes,
    patientMoodAfter,
    homeworkAssigned,
    nextSessionGoals,
    sessionEffectiveness,
    resetForm,
  ]);

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

// Profile Hook
export const useProfile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Logout logic will be handled by AuthContext
      // This hook just provides a consistent interface
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(err.message || 'Failed to logout');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleThemeToggle = useCallback(() => {
    // Theme toggle logic will be handled by ThemeContext
    // This hook just provides a consistent interface
  }, []);

  const refetchProfile = useCallback(() => {
    // Profile refetch logic will be handled by AuthContext
    // This hook just provides a consistent interface
  }, []);

  return {
    loading,
    error,
    handleLogout,
    handleThemeToggle,
    refetchProfile,
  };
};

// Add Patient Form Hook
export const useAddPatientForm = () => {
  const [submitting, setSubmitting] = useState(false);
  const [therapistPin, setTherapistPin] = useState<string>('');
  const [therapistInfo, setTherapistInfo] = useState<any>(null);
  const [loadingPin, setLoadingPin] = useState(true);
  const [newPatient, setNewPatient] = useState(getInitialPatientFormData());

  // Fetch therapist PIN for QR code
  useEffect(() => {
    const fetchTherapistPin = async () => {
      try {
        setLoadingPin(true);
        const response = await therapistService.getTherapistPin();
        setTherapistPin(response.therapist_pin);
        setTherapistInfo(response);
      } catch (error) {
        console.error('Error fetching therapist PIN:', error);
        Alert.alert(THERAPIST_MESSAGES.ERROR, THERAPIST_MESSAGES.QR_CODE_LOAD_FAILED);
      } finally {
        setLoadingPin(false);
      }
    };

    fetchTherapistPin();
  }, []);

  const updatePatient = useCallback((field: keyof typeof newPatient, value: any) => {
    setNewPatient(current => updatePatientField(current, field, value));
  }, []);

  const toggleDay = useCallback((day: string) => {
    setNewPatient(current => togglePreferredDay(current, day));
  }, []);

  const validateForm = useCallback(() => {
    return validatePatientForm(newPatient);
  }, [newPatient]);

  const handleCreatePatient = useCallback(async () => {
    // Validation
    const validation = validateForm();
    if (!validation.isValid) {
      Alert.alert(THERAPIST_MESSAGES.VALIDATION_ERROR_TITLE, validation.errors.join('\n'));
      return;
    }

    try {
      setSubmitting(true);
      
      // Prepare data for API
      const patientData: any = preparePatientDataForAPI(newPatient);
      
      console.log('Creating patient with data:', patientData);
      
      const response = await therapistService.createSessionPatient(patientData);
      
      console.log('Patient creation response:', response);
      
      Alert.alert(THERAPIST_MESSAGES.SUCCESS, ADD_PATIENT_FORM_MESSAGES.CREATE_SUCCESS, [
        {
          text: 'OK',
          onPress: () => {
            router.back();
          }
        }
      ]);
      
    } catch (error: any) {
      console.error('Failed to create patient:', error);
      const errorMessage = formatAPIError(error);
      Alert.alert(THERAPIST_MESSAGES.ERROR, errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [newPatient, validateForm]);

  return {
    // State
    submitting,
    therapistPin,
    therapistInfo,
    loadingPin,
    newPatient,
    
    // Actions
    setNewPatient,
    updatePatient,
    toggleDay,
    handleCreatePatient,
    validateForm,
  };
};
