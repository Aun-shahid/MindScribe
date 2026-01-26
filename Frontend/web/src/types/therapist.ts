// src/types/therapist.ts

// Session-related types
export interface SessionType {
  id: string;
  therapist_name: string;
  patient_name: string;
  session_date: string;
  location: string;
  status: string;
  session_type: string;
  duration_minutes: number;
  is_online: boolean;
}

// Session Consent types
export interface SessionConsentData {
  session_type: string;
  duration_minutes: number | string;
  location: string;
  patient_goals: string;
  fee_charged: number;
  is_online: boolean;
  consent_recording: boolean;
  consent_ai_analysis: boolean;
}

export interface SessionConsentParams {
  patientId: string;
  patientName: string;
  isNewPatient: string;
}

export interface CreateSessionData {
  patient_id: string;
  session_type: string;
  scheduled_date: string;
  duration_minutes: number;
  location: string;
  is_online: boolean;
  patient_goals: string;
  fee_charged: number;
  consent_recording: boolean;
  consent_ai_analysis: boolean;
}

export interface StartSessionData {
  detail: string;
  session: {
    status: string;
    actual_start_time: string;
  };
}

// Session Details types
export interface SessionDetailsParams {
  patientId: string;
  patientName: string;
}

export interface SessionDetailsData {
  sessions: Session[];
  patient: PatientWithSessions | null;
  loading: boolean;
  refreshing: boolean;
}

export interface SessionCardInfo {
  hasNotes: boolean;
  hasGoals: boolean;
  statusColor: string;
}

export interface SessionNavigationParams {
  sessionId: string;
  patientName?: string;
  patientId: string;
}

export interface Session {
  id: string;
  session_number?: number;
  session_type: string;
  status: string;
  scheduled_date?: string;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  duration_minutes?: number;
  actual_duration_minutes?: number | null;
  location?: string;
  is_online?: boolean;
  session_notes?: string;
  patient_goals?: string;
  homework_assigned?: string;
  next_session_goals?: string;
  patient_mood_before?: number | null;
  patient_mood_after?: number | null;
  mood_improvement?: number | null;
  session_effectiveness?: number | null;
  created_at?: string;
  updated_at?: string;
  // Additional fields that might come from API
  date?: string;
  time?: string;
  duration?: number;
  notes?: string;
}

export interface SessionDetail {
  id: string;
  patient: {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    patient_id: string;
  };
  therapist: {
    id: string;
    full_name: string;
    email: string;
    specialization: string;
  };
  session_number: number;
  session_type: string;
  status: string;
  location: string;
  is_online: boolean;
  scheduled_date: string;
  actual_duration_minutes: number;
  session_notes: string;
  patient_goals: string;
  homework_assigned: string;
  next_session_goals: string;
  patient_mood_before: number | null;
  patient_mood_after: number | null;
  mood_improvement: number | null;
  therapist_observations: string | null;
  session_effectiveness: number | null;
}

export interface PatientWithSessions {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  last_session: any;
  next_session: any;
  total_sessions: string;
  created_at: string;
}

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

// End Session types
export interface EndSessionFormData {
  session_notes: string;
  patient_mood_after: number;
  homework_assigned: string;
  next_session_goals: string;
  session_effectiveness: number;
}

export interface EndSessionState {
  loading: boolean;
  sessionNotes: string;
  patientMoodAfter: string;
  homeworkAssigned: string;
  nextSessionGoals: string;
  sessionEffectiveness: string;
}

export interface EndSessionActions {
  handleCompleteSession: () => Promise<void>;
  setSessionNotes: (notes: string) => void;
  setPatientMoodAfter: (mood: string) => void;
  setHomeworkAssigned: (homework: string) => void;
  setNextSessionGoals: (goals: string) => void;
  setSessionEffectiveness: (effectiveness: string) => void;
  resetForm: () => void;
}

export interface EndSessionParams {
  sessionId: string | string[];
  patientId: string | string[];
}

// Dashboard types
export interface DashboardData {
  therapist_info?: Record<string, string>;
  today_sessions?: any[];
  upcoming_sessions?: any[];
  patient_stats?: Record<string, string>;
  session_stats?: Record<string, string>;
  recent_patients?: any[];
  mood_alerts?: any[];
  soap_notes?: any[];
  session_hours?: {
    total: number;
    today: number;
    thisWeek: number;
  };
  progress_data?: {
    soap_progress: number;
    patient_moods: any[];
  };
}

export interface DashboardState {
  dashboardData: DashboardData | null;
  loading: boolean;
  error: string | null;
}

export interface DashboardActions {
  fetchDashboard: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
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

// Dashboard-related types
export interface DashboardStats {
  total_patients: number;
  upcoming_sessions: number;
  completed_sessions: number;
  cancelled_sessions: number;
}

export interface UpcomingSession {
  id: string;
  patient_name: string;
  session_date: string;
  session_type: string;
  location: string;
  is_online: boolean;
}

export interface RecentActivity {
  id: string;
  type: 'session_completed' | 'patient_added' | 'notes_updated';
  description: string;
  timestamp: string;
  patient_name?: string;
}

// Form-related types
export interface SessionFormData {
  patient_id: string;
  scheduled_date: string; // Changed from session_date to scheduled_date
  duration_minutes: number;
  session_type: string;
  location: string;
  is_online: boolean;
  patient_goals?: string;
  fee_charged?: number;
}

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
export interface SessionFilter {
  status?: 'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'CANCELLED' | 'SCHEDULED';
  date?: string;
  patient_id?: string;
  session_type?: string;
}

export interface PatientFilter {
  search_query?: string;
  gender?: string;
  therapy_status?: 'active' | 'inactive' | 'completed';
}

export interface PatientSessionFilter {
  include_past?: boolean;
  include_upcoming?: boolean;
  limit?: number;
  offset?: number;
  status?: 'CANCELLED' | 'COMPLETED' | 'IN_PROGRESS' | 'NO_SHOW' | 'REQUESTED' | 'RESCHEDULED' | 'UPCOMING';
}

// Error types
export interface TherapistError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

// API Response types
export interface SessionsResponse {
  sessions: SessionType[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface PatientSessionsResponse {
  sessions: SessionType[];
  total_count: number;
  patient_name: string;
  therapist_name: string;
}

export interface PatientsResponse {
  patients: Patient[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  upcoming_sessions: UpcomingSession[];
  recent_activities: RecentActivity[];
}

// Calendar types
export interface CalendarSession {
  id: string;
  patient_name: string;
  session_date: string;
  status: string;
  session_type: string;
  location: string;
  duration_minutes: number;
}

export interface CalendarData {
  [date: string]: CalendarSession[];
}

// Notes and session management types
export interface SessionNotes {
  session_notes?: string;
  patient_mood_before?: number;
  patient_mood_after?: number;
  homework_assigned?: string;
  next_session_goals?: string;
  session_effectiveness?: number;
  therapist_observations?: string;
}

export interface SessionUpdate {
  session_id: string;
  status?: string;
  actual_duration_minutes?: number;
  session_notes?: string;
  patient_mood_after?: number;
  session_effectiveness?: number;
}

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

export interface SessionFormParams {
  patientId: string;
  patientName: string;
  isNewPatient: string;
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

export type SessionTab = 'existing' | 'new';

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

export interface TherapistProfileResponse {
  license_number: string;
  specialization: string;
  years_of_experience: number;
  education: string;
  certifications: string;
  clinic_name: string;
  clinic_address: string;
  therapist_pin: string;
  user_info: {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string;
    user_type: string;
    [key: string]: any;
  };
  patient_count: number;
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