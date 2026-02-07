// src/types/session.ts
// Session-specific types for the sessions module

export interface SessionTranscriptionSegment {
  id: string;
  speaker: string;
  text: string;
  start_time: number;
  end_time: number;
  confidence: number;
  emotion?: string;
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
  subjective: { content: string };
  objective: { content: string };
  assessment: { content: string };
  plan: { content: string };
  key_themes?: string[];
  generated_at?: string;
}

export interface AIAnalysisStatus {
  status: 'triggered' | 'skipped' | 'completed' | 'failed';
  message: string;
  ai_service_url?: string;
}

export interface StartSessionResponse {
  detail: string;
  session: SessionDetailData;
  ai_service_token?: string;
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

export interface SessionDetailData {
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
  summary_written_at: string | null;
  patient_mood_before: number | null;
  patient_mood_after: number | null;
  mood_improvement: number | null;
  therapist_observations: string | null;
  session_effectiveness: number | null;
  consent_recording: boolean;
  consent_ai_analysis: boolean;
  fee_charged: string | null;
  payment_status: string;
  is_overdue: boolean;
  is_recurring: boolean;
  recurring_weeks: number | null;
  is_emergency: boolean;
  websocket_room_id: string;
  websocket_active: boolean;
  websocket_url: string | null;
  can_start_websocket: boolean;
  recurrence_info: {
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

export type SessionStatus =
  | 'REQUESTED'
  | 'EMERGENCY_REQUESTED'
  | 'UPCOMING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'NO_SHOW'
  | 'NEEDS_RESCHEDULING';

export type SessionTypeLabel =
  | 'individual'
  | 'group'
  | 'family'
  | 'couples'
  | 'assessment'
  | 'follow_up'
  | 'emergency';
