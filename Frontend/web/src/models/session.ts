export interface Session {
  id: string;
  scheduled_date: string;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  therapist_id: string;
  patient_id: string;
  session_notes?: string;
  session_summary?: string;
  next_session_goals?: string;
}