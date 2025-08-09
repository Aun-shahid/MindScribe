// app/types/therapist.ts

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

// ...existing code...
interface PatientContextType {
  patients: Patient[];
  allPatients: Patient[];
  loading: boolean;
  error: TherapistError | null;
  filter: PatientFilter;
  updateFilter: (newFilter: PatientFilter) => void;
  addPatient: (patientData: PatientFormData) => Promise<void>;
  updatePatient: (patientId: string, patientData: Partial<Patient>) => Promise<void>;
  deletePatient: (patientId: string) => Promise<void>;
  fetchPatients: () => Promise<void>; // Add this line
}
// ...existing code...

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
  session_type: string;
  session_date: string;
  duration_minutes: number;
  location: string;
  is_online: boolean;
  session_notes?: string;
  patient_goals?: string;
  homework_assigned?: string;
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
  session_id: string;
  notes: string;
  patient_mood_before?: number;
  patient_mood_after?: number;
  therapist_observations?: string;
  homework_assigned?: string;
  next_session_goals?: string;
  session_effectiveness?: number;
}

export interface SessionUpdate {
  session_id: string;
  status?: string;
  actual_duration_minutes?: number;
  session_notes?: string;
  patient_mood_after?: number;
  session_effectiveness?: number;
}
