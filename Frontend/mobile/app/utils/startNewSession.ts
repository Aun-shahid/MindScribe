// app/utils/startNewSession.ts
import { NewPatientFormFields, StartNewSessionPatient } from '../types/therapist';

export const validateNewPatientForm = (formData: NewPatientFormFields): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!formData.first_name.trim()) {
    errors.push('First Name is required');
  }

  if (!formData.last_name.trim()) {
    errors.push('Last Name is required');
  }

  if (!formData.phone_number.trim()) {
    errors.push('Phone Number is required');
  }

  // Email validation (if provided)
  if (formData.email && formData.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      errors.push('Please enter a valid email address');
    }
  }

  // Date validation (if provided)
  if (formData.date_of_birth && formData.date_of_birth.trim()) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formData.date_of_birth)) {
      errors.push('Date of birth must be in YYYY-MM-DD format');
    } else {
      const date = new Date(formData.date_of_birth);
      if (isNaN(date.getTime()) || date > new Date()) {
        errors.push('Please enter a valid date of birth');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizePatientData = (formData: NewPatientFormFields) => {
  return {
    first_name: formData.first_name.trim(),
    last_name: formData.last_name.trim(),
    email: formData.email.trim().toLowerCase() || '',
    phone_number: formData.phone_number.trim(),
    date_of_birth: formData.date_of_birth || '',
    gender: formData.gender,
    primary_concern: formData.primary_concern.trim() || '',
    therapy_start_date: formData.therapy_start_date,
    session_frequency: formData.session_frequency,
    preferred_session_days: formData.preferred_session_days,
    emergency_contact_name: formData.emergency_contact_name.trim() || '',
    emergency_contact_phone: formData.emergency_contact_phone.trim() || '',
    address: formData.address.trim() || '',
    medical_history: formData.medical_history.trim() || '',
    current_medications: formData.current_medications.trim() || '',
    preferred_language: formData.preferred_language
  };
};

export const cleanPatientData = (patientData: any): StartNewSessionPatient => {
  return {
    id: patientData.id?.toString() || '',
    full_name: typeof patientData.full_name === 'string' ? patientData.full_name : 'Unknown Patient',
    email: typeof patientData.email === 'string' ? patientData.email : '',
    phone_number: typeof patientData.phone_number === 'string' ? patientData.phone_number : '',
    date_of_birth: typeof patientData.date_of_birth === 'string' ? patientData.date_of_birth : '',
    gender: typeof patientData.gender === 'string' ? patientData.gender : '',
    patient_profile: patientData.patient_profile && typeof patientData.patient_profile === 'object' ? {
      patient_id: patientData.patient_profile.patient_id?.toString() || '',
      primary_concern: typeof patientData.patient_profile.primary_concern === 'string' 
        ? patientData.patient_profile.primary_concern 
        : 'General therapy',
      therapy_start_date: typeof patientData.patient_profile.therapy_start_date === 'string' 
        ? patientData.patient_profile.therapy_start_date 
        : '',
      session_frequency: typeof patientData.patient_profile.session_frequency === 'string' 
        ? patientData.patient_profile.session_frequency 
        : '',
      preferred_session_days: Array.isArray(patientData.patient_profile.preferred_session_days) 
        ? patientData.patient_profile.preferred_session_days 
        : [],
      emergency_contact_name: typeof patientData.patient_profile.emergency_contact_name === 'string' 
        ? patientData.patient_profile.emergency_contact_name 
        : '',
      emergency_contact_phone: typeof patientData.patient_profile.emergency_contact_phone === 'string' 
        ? patientData.patient_profile.emergency_contact_phone 
        : '',
      preferred_language: typeof patientData.patient_profile.preferred_language === 'string' 
        ? patientData.patient_profile.preferred_language 
        : '',
      connected_at: typeof patientData.patient_profile.connected_at === 'string' 
        ? patientData.patient_profile.connected_at 
        : ''
    } : null,
    last_session: typeof patientData.last_session === 'string' ? patientData.last_session : null,
    next_session: typeof patientData.next_session === 'string' ? patientData.next_session : null,
    total_sessions: patientData.total_sessions?.toString() || '0',
    created_at: typeof patientData.created_at === 'string' ? patientData.created_at : ''
  };
};

export const filterPatients = (patients: StartNewSessionPatient[], searchQuery: string): StartNewSessionPatient[] => {
  return patients.filter(patient => 
    patient.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
};

export const getInitialNewPatientForm = (): NewPatientFormFields => {
  return {
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    gender: 'male',
    primary_concern: '',
    therapy_start_date: new Date().toISOString().split('T')[0],
    session_frequency: 'weekly',
    preferred_session_days: [],
    emergency_contact_name: '',
    emergency_contact_phone: '',
    address: '',
    medical_history: '',
    current_medications: '',
    preferred_language: 'en'
  };
};

export const formatPatientDisplayInfo = (patient: StartNewSessionPatient) => {
  return {
    primaryText: patient.full_name,
    secondaryText: patient.patient_profile?.primary_concern || 'General therapy',
    id: patient.id
  };
};

export default function StartNewSessionUtilsRoute() {
  return null;
}
