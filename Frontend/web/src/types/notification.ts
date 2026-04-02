// Matches the backend NotificationSerializer response shape
export interface TherapistNotification {
  id: string;
  patient: string;             // user_id of the patient (or therapist when stored as recipient)
  patient_name: string;
  category: 'session' | 'mood' | 'other';
  notification_type:
    | 'session_reminder'
    | 'session_summary'
    | 'session_ai_ready'
    | 'session_approved'
    | 'session_cancelled'
    | 'goal_reminder'
    | 'mood_reminder'
    | 'journal_reminder'
    | 'therapist_message'
    | 'general';
  title: string;
  message: string;
  session_id: string | null;
  goal_id: string | null;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  sent_at: string;
  time_ago: string;             // e.g. "3 hours ago"
  delivery_status?: string;
  delivery_attempts?: number;
  last_delivery_attempt_at?: string | null;
  next_retry_at?: string | null;
  delivered_at?: string | null;
  delivery_error?: string | null;
}

// Backend unread-count response
export interface UnreadCountResponse {
  unread_count: number;
}

// Backend mark-all-read response
export interface MarkAllReadResponse {
  marked_count: number;
}

export interface TherapistNotificationSummary {
  total_notifications: number;
  unread_notifications: number;
  session_notifications: number;
  session_unread_notifications: number;
  mood_notifications: number;
  mood_unread_notifications: number;
  mood_alert_patients: number;
  other_notifications: number;
  tabs: {
    session: { category: 'session' };
    mood: { category: 'mood' };
  };
  navigation?: {
    notifications_page: string;
    mood_tab_query: string;
    session_tab_query: string;
  };
}

// ── WebSocket payload shapes ──────────────────────────────────────────────────

// Metadata embedded inside mood alert notifications
export interface MoodStreakMetadata {
  patient_id: string;
  patient_name: string;
  streak_size?: number;
  streak_days?: Array<{
    date: string;
    dominant_mood: string;
    avg_intensity: number;
  }>;
  rule?: string;                // "three_consecutive_bad_moods"
  drop_value?: number;
  recent_window?: Array<{
    date: string;
    avg_intensity: number;
    dominant_mood: string;
  }>;
}

// The `notification` block inside the WS payload
export interface WSNotificationBlock {
  id: string | null;
  notification_type: string;
  type: 'info' | 'alert';
  title: string;
  message: string;
  session_id: string | null;
  goal_id: string | null;
  relatedEntityId: string | null;
  action_url: string | null;
  read: boolean;
  priority: 'normal' | 'high';
  source_event: string;         // e.g. "mood.streak.bad3" | "mood.trend.downward"
  metadata: MoodStreakMetadata | Record<string, unknown>;
  db_record?: TherapistNotification;
}

// Top-level WebSocket message received by the client
export interface WSNotificationPayload {
  event: 'notification.created' | 'notification.socket.connected' | 'pong';
  event_id?: string;
  created_at?: string;
  createdAt?: string;
  recipientId?: string;
  recipient?: {
    id: string;
    name: string;
    user_type: string;
  };
  notification?: WSNotificationBlock;
  user_id?: string;             // present on 'notification.socket.connected'
}

// Internal toast entry managed by the hook
export interface NotificationToastEntry {
  id: string;
  title: string;
  message: string;
  priority: 'normal' | 'high';
  source_event: string;
  action_url: string | null;
  patient_name: string;
  created_at: string;
}
