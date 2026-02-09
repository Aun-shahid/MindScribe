

// Patient-related types
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

export interface PatientFormData {
  full_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  primary_concern: string;
  session_frequency: string;
  preferred_session_days: string[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  preferred_language: string;
}

// Consent and QR Code types
export interface ConsentData {
  patient_id: string;
  therapist_id: string;
  consent_given: boolean;
  consent_date: string;
  ip_address?: string;
}

export interface QRCodeData {
  therapist_id: string;
  session_id?: string;
  generated_at: string;
  expires_at: string;
}

// Filter and search types

export interface PatientFilter {
  search?: string;
}

// Error types
export interface TherapistError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

// API Response types

export interface PatientsResponse {
  patients: Patient[];
  total_count: number;
  page: number;
  page_size: number;
}


// Calendar types

// Notes and session management types


// Patient Management Types (for start-new-session)
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

export interface TherapistPinData {
  therapist_pin: string;
  therapist_name?: string;
  specialization?: string;
  clinic_name?: string;
  patient_count?: number;
}


// Start New Session specific types
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

export interface TherapistPinResponse {
  therapist_pin: string;
  therapist_name?: string;
  specialization?: string;
  clinic_name?: string;
  patient_count?: number;
}

export interface CreatePatientResponse {
  patient: StartNewSessionPatient;
}

// Add Patient Form types
export interface AddPatientFormState {
  submitting: boolean;
  therapistPin: string;
  therapistInfo: TherapistPinData | null;
  loadingPin: boolean;
  newPatient: NewPatientFormData;
}

export interface AddPatientFormActions {
  setNewPatient: (patient: NewPatientFormData) => void;
  updatePatientField: (field: keyof NewPatientFormData, value: any) => void;
  togglePreferredDay: (day: string) => void;
  handleCreatePatient: () => Promise<void>;
  validateForm: () => { isValid: boolean; errors: string[] };
}

export interface AddPatientFormValidation {
  isValid: boolean;
  errors: string[];
}

export interface CreatePatientData {
  first_name: string;
  last_name: string;
  email?: string;
  phone_number: string;
  date_of_birth?: string;
  gender: string;
  primary_concern?: string;
  therapy_start_date: string;
  session_frequency: string;
  preferred_session_days: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address?: string;
  medical_history?: string;
  current_medications?: string;
  preferred_language: string;
}


// QR Code related types
export interface TherapistQRInfo {
  therapist_pin: string;
  therapist_id: string;
  therapist_name: string;
  specialization: string;
  clinic_name: string;
  patient_count: number;
}

export interface QRCodeDisplayData {
  qrSize: number;
  shareMessage: string;
  instructions: QRInstruction[];
}

export interface QRInstruction {
  step: number;
  text: string;
  icon?: string;
}

export interface QRCodeState {
  loading: boolean;
  error: string | null;
  therapistInfo: TherapistQRInfo | null;
}

// Profile related types
export interface ProfileFieldData {
  label: string;
  value: string;
}

export interface TherapistProfileData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: string;
  email_verified?: boolean;
  is_verified?: boolean;
}

export interface ProfileState {
  profile: TherapistProfileData | null;
  loading: boolean;
  error: string | null;
}

export interface ProfileActions {
  handleLogout: () => Promise<void>;
  handleThemeToggle: () => void;
  refetchProfile: () => void;
}

// Connection Request types
export interface ConnectionRequest {
  id: string;
  patient_name: string;
  patient_email: string;
  phone_number?: string;
  requested_at: string;
  status: 'pending' | 'accepted' | 'merged' | 'rejected';
  patient_id?: string;
}

export interface ConnectionRequestResponse {
  id: string;
  patient_name: string;
  patient_email: string;
  phone_number?: string;
  requested_at: string;
  status: string;
  patient_id?: string;
}

export interface AcceptConnectionRequest {
  action: 'accept_new' | 'merge';
  merge_patient_id?: string;
}