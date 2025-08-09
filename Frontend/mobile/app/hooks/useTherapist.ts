// app/hooks/useTherapist.ts
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import therapistService from '../services/therapist.service';
import {
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
  ConsentData,
} from '../types/therapist';

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
export const useSessionConsent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TherapistError | null>(null);

  const submitConsent = useCallback(async (consentData: ConsentData) => {
    try {
      setLoading(true);
      setError(null);
      await therapistService.submitConsent(consentData);
    } catch (err) {
      setError(err as TherapistError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getConsentStatus = useCallback(async (patientId: string, therapistId: string) => {
    try {
      setLoading(true);
      setError(null);
      const status = await therapistService.getConsentStatus(patientId, therapistId);
      return status;
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
    submitConsent,
    getConsentStatus,
  };
};

// QR Code Hook
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

  const endSession = useCallback(async (sessionId: string, sessionData: Partial<SessionUpdate>) => {
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
