

export interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  patient_profile: {
    patient_id: string;
    primary_concern: string;
    therapy_start_date: string;
    session_frequency: string;
    preferred_session_days: string[];
    emergency_contact_name: string;
    emergency_contact_phone: string;
    address: string;
    medical_history: string;
    current_medications: string;
    preferred_language: string;
    connected_at: string;
  } | null;
  last_session: string | null;
  next_session: string | null;
  total_sessions: string;
  created_at: string;
}

export interface PatientProfile {
  patient_id: string;
  primary_concern: string;
  therapy_start_date: string;
  session_frequency: string;
  preferred_session_days: string[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  address: string;
  medical_history: string;
  current_medications: string;
  preferred_language: string;
  connected_at: string;
}

// Patient Details types
export interface PatientDetailsType {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  patient_profile: PatientProfile | null;
  last_session: string | null;
  next_session: string | null;
  total_sessions: string;
  created_at: string;
}

export interface PatientDetailsState {
  patient: PatientDetailsType | null;
  loading: boolean;
  error: string | null;
}

export interface PatientDetailsActions {
  fetchPatientDetails: (patientId: string) => Promise<void>;
  handleStartSession: () => void;
  clearError: () => void;
}



export interface MoodAlert {
  id: number;
  patient: string;
  mood: string;
  level: string;
  color: string;
}

export interface SoapNote {
  id: number;
  patient: string;
  status: string;
  count: number;
}

export interface PatientMood {
  name: string;
  count: number;
  color: string;
}

// Form-related types

export interface PatientProfileFormData {
  primary_concern: string;
  therapy_start_date: string;
  session_frequency: string;
  preferred_session_days: string[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  address?: string;
  medical_history?: string;
  current_medications?: string;
  preferred_language: string;
}

export interface PatientFormData {
  first_name: string;
  last_name: string;
  full_name?: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  patient_profile: PatientProfileFormData;
}

export interface PatientFilter {
  search?: string;
}

export interface PatientsResponse {
  patients: Patient[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface PatientProfileData {
  patient_id: string;
  primary_concern: string;
  therapy_start_date: string;
  session_frequency: string;
  preferred_session_days: string[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  preferred_language: string;
  connected_at: string;
}

export interface PatientData {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  patient_profile: PatientProfileData | null;
  last_session: string | null;
  next_session: string | null;
  total_sessions: string;
  created_at: string;
}

export interface NewPatientFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  primary_concern: string;
  therapy_start_date: string;
  session_frequency: string;
  preferred_session_days: string[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  address: string;
  medical_history: string;
  current_medications: string;
  preferred_language: string;
}

export interface StartNewSessionPatient {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  patient_profile: {
    patient_id: string;
    primary_concern: string;
    therapy_start_date: string;
    session_frequency: string;
    preferred_session_days: string[];
    emergency_contact_name: string;
    emergency_contact_phone: string;
    address: string;
    medical_history: string;
    current_medications: string;
    preferred_language: string;
    connected_at: string;
  } | null;
  last_session: string | null;
  next_session: string | null;
  total_sessions: string;
  created_at: string;
}

export interface NewPatientFormFields {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  primary_concern: string;
  therapy_start_date: string;
  session_frequency: string;
  preferred_session_days: string[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  address: string;
  medical_history: string;
  current_medications: string;
  preferred_language: string;
}

export interface CreatePatientResponse {
  patient: StartNewSessionPatient;
}

export interface CreatePatientData {
  first_name: string;
  last_name: string;
  email?: string;
  phone_number: string;
  date_of_birth?: string;
  gender: string;
  primary_concern?: string;
  therapy_start_date?: string;
  session_frequency: string;
  preferred_session_days: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address?: string;
  medical_history?: string;
  current_medications?: string;
  preferred_language?: string | null;
}

