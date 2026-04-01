// src/types/session.ts
// Session-specific types for the sessions module

export interface SessionTranscriptionSegment {
  id: string;
  speaker: string;
  speaker_type?: string;
  speaker_id?: string;
  text: string;
  text_english?: string;
  text_urdu?: string;
  start_time: number;
  end_time: number;
  confidence: number;
  emotion?: AIEmotionPayload;
}

export type AIEmotionLabel =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'neutral'
  | 'disgust'
  | 'fear'
  | 'surprise'
  | 'unknown';

export interface AIEmotionResult {
  primary_emotion: AIEmotionLabel;
  confidence: number;
  all_scores: Record<string, number>;
}
export interface AISegmentEmotionResult {
  // Flat strings — what AI Service actually returns
  audio_emotion: AIEmotionLabel | null;
  audio_confidence: number;
  text_emotion: AIEmotionLabel | null;
  text_confidence: number;
  final_emotion: AIEmotionLabel;
  final_confidence: number;
  agreement: boolean | null;
  analysis_type: 'combined' | 'text_only' | 'audio_only';
}

export interface AICombinedEmotionResult {
  audio_emotion: AIEmotionResult;
  text_emotion: AIEmotionResult;
  final_emotion: AIEmotionLabel;
  final_confidence: number;
  agreement: boolean;
}

export interface AIBackendEmotionPayload {
  primary_emotion?: string;
  valence?: number;
  arousal?: number;
  confidence?: number;
  emotion_scores?: Record<string, number>;
}

export type AIEmotionPayload = 
  | AISegmentEmotionResult      // AI Service flat format (new)
  | AICombinedEmotionResult     // legacy nested format
  | AIBackendEmotionPayload     // Django backend format
  | string;   

export interface AILiveTranscriptionSegment {
  id: string;
  speaker: string;
  start_time: number;
  end_time: number;
  duration?: number;
  text?: string;
  text_urdu?: string;
  text_english?: string;
  emotion?: AIEmotionPayload;
}

export interface SessionTranscription {
  session_id: string;
  segments: SessionTranscriptionSegment[];
  total_duration: number;
  speaker_count: number;
  is_mock_data?: boolean;
}

export interface EmotionData {
  emotion: string;
  confidence: number;
  timestamp: number;
}

export interface SessionEmotionalAnalysis {
  session_id: string;
  overall_mood: string;
  mood_score: number;
  emotional_timeline: EmotionData[];
  mood_distribution: Record<string, number>;
  key_moments: {
    timestamp: number;
    emotion: string;
    text: string;
  }[];
  is_mock_data?: boolean;
}

export interface SOAPNote {
  session_id?: string;
  subjective: { content: string };
  objective: { content: string };
  assessment: { content: string };
  plan: { content: string };
  emotional_summary?: string | null;
  model_version?: string;
  key_themes?: string[];
  generated_at?: string;
}

export interface SOAPGenerateResponse {
  soap_note: SOAPNote;
  processing_time_ms: number;
  message: string;
}

export interface AIAnalysisStatus {
  status: 'triggered' | 'skipped' | 'completed' | 'failed';
  message: string;
  ai_service_url?: string;
}

export interface StartSessionResponse {
  detail: string;
  session: SessionDetailData;
  session_id?: string; // From AI Service
  status?: string; // From AI Service
  websocket_token?: string; // From AI Service
  message?: string; // From AI Service
  ai_service_token?: string; // Bearer token for AI REST endpoints
  ai_websocket_token?: string; // Token dedicated for AI WebSocket connection
  ai_service_url?: string;
  token_info?: {
    expires_in_hours: number;
    usage: string;
  };
  ai_service_info?: string;
}

export interface EndSessionResponse {
  detail: string;
  session: SessionDetailData;
  ai_analysis?: AIAnalysisStatus;
}

// Session Status and Type Labels
export type SessionStatus =
  | 'REQUESTED'
  | 'EMERGENCY_REQUESTED'
  | 'UPCOMING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'NO_SHOW'
  | 'NEEDS_RESCHEDULING'
  | 'ALL'
  | 'SCHEDULED';

export type SessionTypeLabel =
  | 'individual'
  | 'group'
  | 'family'
  | 'couples'
  | 'assessment'
  | 'follow_up'
  | 'emergency';

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
  actual_start_time: string | null;
  actual_end_time: string | null;
  duration_minutes: number;
  actual_duration_minutes: number | null;
  session_notes: string | null;
  session_summary: string | null;
  patient_goals: string | null;
  homework_assigned: string | null;
  next_session_goals: string | null;
  summary_written_at?: string | null;
  patient_mood_before: number | null;
  patient_mood_after: number | null;
  mood_improvement: number | null;
  therapist_observations: string | null;
  session_effectiveness: number | null;
  websocket_room_id?: string;
  websocket_active?: boolean;
  websocket_url?: string | null;
  can_start_websocket?: boolean;
  consent_recording?: boolean;
  consent_ai_analysis?: boolean;
  fee_charged?: string | number | null;
  payment_status?: string;
  is_overdue?: boolean;
  is_recurring?: boolean;
  recurring_weeks?: number | null;
  is_emergency?: boolean;
  recurrence_info?: {
    is_parent: boolean;
    parent_id?: string;
    parent_date?: string;
    total_in_series?: number;
    recurring_weeks?: number;
    total_sessions_created?: number;
  } | null;
  created_at: string;
  updated_at: string;
}

// Deprecated alias for compatibility if needed elsewhere
export type SessionDetailData = SessionDetail;

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

export interface SessionDetailsParams {
  patientId: string;
  patientName: string;
}

export interface SessionDetailsData {
  sessions: Session[];
  patient: any | null; // Avoid circular dependency with Patient type in therapist.ts
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

export interface EndSessionFormData {
  session_notes: string;
  patient_goals?: string;
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

export interface UpcomingSession {
  id: string;
  patient_name: string;
  session_date: string;
  session_type: string;
  location: string;
  is_online: boolean;
}

export interface SessionFormData {
  patient_id: string;
  scheduled_date: string;
  duration_minutes: number;
  session_type: string;
  location: string;
  is_online: boolean;
  patient_goals?: string;
  fee_charged?: number;
  consent_recording?: boolean;
  consent_ai_analysis?: boolean;
}

export interface SessionFilter {
  status?: SessionStatus;
  date?: string;
  patient_id?: string;
  session_type?: string;
}

export interface SessionsResponse {
  sessions: SessionType[];
  total_count: number;
  page: number;
  page_size: number;
}

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
  session_id?: string;
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

export interface SessionFormParams {
  patientId: string;
  patientName: string;
  isNewPatient: string;
}

export type SessionTab = 'existing' | 'new';

// Dashboard and summary types related to sessions
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

export interface RecentActivity {
  id: string;
  type: 'session_completed' | 'patient_added' | 'notes_updated';
  description: string;
  timestamp: string;
  patient_name?: string;
}

export interface SessionInsight {
  id: string;
  overall_mood: string | null;
  mood_score: number | null;
  key_themes: string[];
  emotional_patterns: Record<string, unknown>;
  recommendations: string | null;
  generated_at: string;
}

export interface SessionSummaryUpdate {
  session_summary?: string;
  patient_goals?: string;
  homework_assigned?: string;
  next_session_goals?: string;
}

export interface BulkUpdateRequest {
  session_ids: string[];
  action: 'cancel' | 'reschedule' | 'update_location' | 'update_type' | 'update_duration';
  new_date?: string;
  new_location?: string;
  new_session_type?: string;
  new_duration?: number;
  reason?: string;
}

export interface BulkUpdateResponse {
  updated_sessions: number;
  failed_sessions: number;
  details: {
    session_id: string;
    status: 'success' | 'failed';
    error?: string;
  }[];
}

