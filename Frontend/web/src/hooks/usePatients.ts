import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import patientService from '../services/patient.service';
import { emitAppEvent } from '../utils/events';
import type {
  Patient,
  PatientFilter,
  PatientFormData,
  PatientDetailsType,
  PatientDetailsState,
  PatientDetailsActions,
} from '../types/patient';
import type { TherapistError } from '../types/therapist';

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
      const data = await patientService.getPatients(currentFilter);
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

  /**
   * Updates the patient filter. If reset=true, replaces filter entirely (for Clear Filters).
   */
  const updateFilter = useCallback((newFilter: PatientFilter, reset = false) => {
    if (reset) {
      setFilter({ ...newFilter });
    } else {
      setFilter(prev => ({ ...prev, ...newFilter }));
    }
  }, []);

  const addPatient = useCallback(async (patientData: PatientFormData): Promise<Patient | null> => {
    try {
      setError(null);
      const newPatient = await patientService.createPatient(patientData);
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
      await patientService.updatePatient(patientId, patientData);
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
      await patientService.deletePatient(patientId);
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
      const patientsData = await patientService.getPatientDetails();

      if (patientsData && Array.isArray(patientsData)) {
        // Find the patient by ID from the list
        const foundPatient = patientsData.find((p: any) => p.id === id);

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
      // PatientFormData requires full_name and nested patient_profile
      const sanitizedData: PatientFormData = {
        first_name: patientData.first_name,
        last_name: patientData.last_name,
        full_name: `${patientData.first_name} ${patientData.last_name}`,
        email: patientData.email || '',
        phone_number: patientData.phone_number || '',
        date_of_birth: patientData.date_of_birth || '',
        gender: patientData.gender || '',
        patient_profile: {
          primary_concern: patientData.primary_concern || '',
          therapy_start_date: patientData.therapy_start_date || '',
          session_frequency: patientData.session_frequency || 'weekly',
          preferred_session_days: patientData.preferred_session_days?.map(mapDayToBackendFormat) || [],
          emergency_contact_name: patientData.emergency_contact_name || '',
          emergency_contact_phone: patientData.emergency_contact_phone || '',
          preferred_language: mapLanguageToBackendFormat(patientData.preferred_language || 'english'),
        }
      };

      // Use the correct endpoint for patient creation
      const response = await patientService.createPatient(sanitizedData);

      // Emit patient creation event to refresh dashboard
      emitAppEvent('patient-created', response);

      // Return the created patient data with ID
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
