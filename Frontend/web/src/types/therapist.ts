// src/types/therapist.ts

// Import necessary types
import type { Session as ImportedSession } from "../models/session";
import type { Patient as ImportedPatient } from "../models/patient";
import type { SOAPNote } from "../models/soapNote";
import type { MoodAlert as ExternalMoodAlert } from "../models/moodAlert";

// Update and fix type definitions
export type SessionType = 'individual' | 'group';

export interface MoodAlert {
  alerts: Array<{ id: string; message: string; timestamp: string }>; // Example structure
  summary: { [key: string]: string }; // Replace with specific fields if known
  recent_mood_entries: Array<{ mood: string; timestamp: string }>; // Example structure
}

// Update SessionType to avoid conflicts
export type SessionCategory = 'individual' | 'group';

// Type for Session
export interface Session {
    id: number;
    therapistId: number;
    patientId: number;
    startTime: string; // ISO 8601 format
    endTime: string; // ISO 8601 format
    location: string; // Consistent type
    durationMinutes: number; // Consistent type
    isOnline: boolean; // Consistent type
    sessionType: SessionCategory; // Union of string literals for session type
    notes?: string; // Optional field for session notes
    session_number: number;
    status: string; // e.g., 'scheduled', 'completed', etc.
    consent_recording: boolean;
    consent_ai_analysis: boolean;
    fee_charged: number;
}

// Resolve property declaration conflicts and undefined types

// Define MoodAlert type
export interface ImportedMoodAlert {
    id: number;
    patientId: number;
    moodRating: string; // Assuming mood rating is a string (e.g., "Happy", "Sad")
    timestamp: string; // ISO 8601 format
    description?: string; // Optional field for additional details
}

// Update LocalSession to ensure consistent property declarations
export interface LocalSession {
    id: string;
    therapist_name: string;
    patient_name: string;
    session_date: string;
    location: string; // Consistent type
    status: string;
    session_type: string;
    duration_minutes: number; // Consistent type
    is_online: boolean; // Consistent type
}

// Update TherapistDashboard to replace any types
export interface TherapistDashboard {
    todaySessions: Session[];
    upcomingSessions: Session[];
    recentPatients: Patient[];
    moodAlerts: MoodAlert[];
    soapNotes?: SOAPNote[]; // Optional list of SOAP notes
    patientMoods?: MoodAlert[]; // Optional list of patient moods
}

// Session-related types
export interface LocalSessionType {
  session_date: string;
  session_type: string;
}

// Patient-related types
export interface LocalPatientWithSessions {
  patient_name: string;
  patient_goals: string;
}

export interface TherapistDashboardData {
  last_session: ImportedSession | null; // Replacing 'any' with ImportedSession
  next_session: ImportedSession | null; // Replacing 'any' with ImportedSession
  today_sessions?: ImportedSession[]; // Replacing 'any[]' with ImportedSession[]
  upcoming_sessions?: ImportedSession[]; // Replacing 'any[]' with ImportedSession[]
  recent_patients?: ImportedPatient[]; // Replacing 'any[]' with ImportedPatient[]
  mood_alerts?: ImportedMoodAlert[]; // Replacing 'any[]' with ImportedMoodAlert[]
  soap_notes?: SOAPNote[]; // Replacing 'any[]' with SOAPNote[]
}

export interface PatientMoodsData {
  patient_moods: { mood: string; timestamp: string }[]; // Assuming structure for patient_moods
}

export interface UpdatePatientField {
  updatePatientField: (field: keyof NewPatientFormData, value: string | number | boolean | null) => void;
}

// Patient-related types
export interface Patient {
  id: string;
  full_name: string;
  patient_id: string;
  email?: string;
  phone_number?: string;
  date_of_birth?: string;
  gender?: string;
  patient_profile?: {
    patient_id?: string;
    primary_concern?: string;
    therapy_start_date?: string;
    session_frequency?: string;
    preferred_session_days?: string[];
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    preferred_language?: string;
    connected_at?: string;
  };
  last_session?: string;
  next_session?: string;
  total_sessions?: string;
  created_at?: string;
  patient_moods: ExternalMoodAlert[];
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
export interface PatientDetailsType extends Patient {
  updatePatientField: (field: keyof NewPatientFormData, value: string | number | boolean | null | undefined) => void;
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
  today_sessions?: Session[];
  upcoming_sessions?: Session[];
  patient_stats?: Record<string, string>;
  session_stats?: Record<string, string>;
  recent_patients?: Patient[];
  mood_alerts?: MoodAlert[];
  soap_notes?: SOAPNote[];
  session_hours?: {
    total: number;
    today: number;
    thisWeek: number;
  };
  progress_data?: {
    soap_progress: number;
    patient_moods: ExternalMoodAlert[];
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
  age: number;
  gender: string;
  contact_info: string;
}

// Consent and QR Code types
export interface ConsentData {
  consent_recording: boolean;
  consent_ai_analysis: boolean;
}

export interface QRCodeData {
  therapist_id: string;
  session_id?: string;
  generated_at: string;
  expires_at: string;
}

// Filter and search types
export interface SessionFilter {
  date?: string;
  status?: string;
  patient_id?: string;
  session_type?: string;
  search?: string;
}

export interface PatientFilter {
  search?: string;
}

// Error types
export interface TherapistError {
  code: string;
  message: string;
}

// API Response types
export interface SessionsResponse {
  sessions: SessionType[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface PatientsResponse {
  patients: Patient[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface DashboardResponse {
  today_sessions: Session[];
  upcoming_sessions: Session[];
  recent_patients: ImportedPatient[];
  mood_alerts: MoodAlert[];
  stats?: { [key: string]: number }; // Example structure for stats
  recent_activities?: string[];
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
  session_id?: string;  // Optional - already in URL path
  status?: string;
  scheduled_date?: string;
  duration_minutes?: number;
  location?: string;
  session_type?: 'individual' | 'group' | 'family' | 'couples';
  is_online?: boolean;
  actual_duration_minutes?: number;
  session_notes?: string;
  session_summary?: string;
  patient_goals?: string;
  homework_assigned?: string;
  next_session_goals?: string;
  patient_mood_before?: number;
  patient_mood_after?: number;
  therapist_observations?: string;
  session_effectiveness?: number;
  consent_recording?: boolean;
  consent_ai_analysis?: boolean;
  fee_charged?: number;
  payment_status?: string;
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
  full_name: string;
  age: number;
  gender: string;
  contact_info: string;
  email?: string;
  primary_concern?: string;
  address?: string;
  medical_history?: string;
  current_medications?: string;
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
  patient_id: string;
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
  pin: string;
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
  updatePatientField: (field: keyof NewPatientFormData, value: string | number | boolean | null | undefined) => void;
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

export interface Therapist {
  last_session: Session | null;
  next_session: Session | null;
  today_sessions?: Session[];
  upcoming_sessions?: Session[];
  recent_patients?: Patient[];
  mood_alerts?: MoodAlert[];
  soap_notes?: SOAPNote[];
  patient_moods: string[];
  updatePatientField: (field: keyof NewPatientFormData, value: any) => void;
}

// Add type guard for error handling
function isErrorWithMessage(error: unknown): error is { message: string } {
  return typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string';
}