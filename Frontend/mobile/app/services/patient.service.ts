// app/services/patient.service.ts
import api from '../utils/api';
import { BASE_URL } from '../config';

// Ensure media URLs returned by backend are absolute. If backend returns a
// relative path like '/media/sounds/file.mp3', prefix with `BASE_URL` so
// Expo's audio player can load the file over the network.
function normalizeMediaUrl(u?: string): string {
  if (!u) return '';
  const s = String(u).trim();
  try {
    // If backend returned an absolute URL but with a different host (old IP),
    // prefer serving it from the current `BASE_URL` host so emulator/device can reach it.
    if (s.startsWith('http://') || s.startsWith('https://')) {
      const parsed = new URL(s);
      const base = new URL(BASE_URL);
      // If path looks like media and host differs, rebuild URL to use BASE_URL
      if (parsed.pathname && parsed.pathname.startsWith('/media') && parsed.hostname !== base.hostname) {
        return `${BASE_URL}${parsed.pathname}`;
      }
      return s;
    }
  } catch (e) {
    // fall back to string handling below
    console.warn('[normalizeMediaUrl] failed to parse url', u, e);
  }
  if (s.startsWith('//')) return `https:${s}`;
  if (s.startsWith('/')) return `${BASE_URL}${s}`;
  // If it's a relative path without leading slash, also prefix
  if (!s.includes('://')) return `${BASE_URL}/${s}`;
  return s;
}

export interface MoodEntry {
  [key: string]: string;
}

export interface MoodIntensities {
  [key: string]: number;
}

export interface CreateMoodEntryData {
  mood_intensities: MoodIntensities;
  notes: string;
  triggers: string;
  triggers_list: string[];
  activities: string;
  mood_date: string;
}

export interface MoodEntryResponse {
  id: string;
  patient?: string;
  patient_name?: string;
  mood_intensities: MoodIntensities;
  moods_list: string[];
  dominant_mood: string;
  average_intensity: number;
  triggers: string;
  triggers_list: string[];
  notes: string;
  activities: string;
  mood_date: string;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  entry_type: 'daily' | 'gratitude' | 'reflection' | 'dream' | 'therapy' | 'milestone' | 'challenge' | 'free_form';
  privacy_level: 'private' | 'therapist' | 'anonymous';
  mood_before: number;
  mood_after: number;
  mood_improvement: number;
  tags: string;
  tags_list: string[];
  word_count: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionInfo {
  [key: string]: string;
}

export interface DailyInspiration {
  id: string;
  quote: string;
  author: string;
  category: 'motivation' | 'mindfulness' | 'gratitude' | 'self_care' | 'resilience';
  category_display: string;
  reflection_prompt: string;
  is_active: boolean;
  featured: boolean;
  created_at: string;
}

export interface EmotionalInsight {
  id: string;
  patient: string;
  patient_name: string;
  primary_emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'anxiety' | 'love' | 'guilt' | 'shame' | 'pride' | 'hope' | 'gratitude' | 'confusion';
  emotion_display: string;
  intensity: number;
  what_happened: string;
  body_sensations: string;
  thoughts: string;
  behaviors: string;
  insights_learned: string;
  coping_strategies: string;
  is_resolved: boolean;
  helpfulness_rating: number;
  created_at: string;
  updated_at: string;
}

export interface EmotionalInsightsFilters {
  emotion?: string;
  ordering?: string;
  resolved?: boolean;
}

export interface CreateEmotionalInsightData {
  primary_emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'anxiety' | 'love' | 'guilt' | 'shame' | 'pride' | 'hope' | 'gratitude' | 'confusion';
  intensity: number;
  what_happened: string;
  body_sensations?: string;
  thoughts?: string;
  behaviors?: string;
  insights_learned?: string;
  coping_strategies?: string;
  is_resolved?: boolean;
  helpfulness_rating?: number;
}

export interface EmotionalInsightsAnalytics {
  total_insights: number;
  resolved_count: number;
  most_explored_emotion: string;
  emotion_distribution: Record<string, number>;
  average_helpfulness: number;
  top_coping_strategies: string[];
}

export interface CreateJournalEntryData {
  prompt?: string;
  title: string;
  content: string;
  mood_tags?: string;
  mood_tags_list?: string[];
  is_private?: boolean;
  is_favorite?: boolean;
  entry_date?: string; // YYYY-MM-DD format
}

export interface JournalFilters {
  end_date?: string;
  favorite?: string; // 'true' or 'false'
  ordering?: string;
  search?: string;
  start_date?: string;
}

export interface JournalPrompt {
  id: string;
  prompt: string;
  category: 'feelings' | 'gratitude' | 'reflection' | 'goals' | 'mindfulness' | 'relationships' | 'growth' | 'challenges' | 'creativity' | 'self_care';
  category_display: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JournalAnalytics {
  total_entries: number;
  entries_this_month: number;
  longest_streak: number;
  current_streak: number;
  favorite_count: number;
  common_tags: { tag: string; count: number }[];
}

export interface RelaxationContent {
  id: string;
  title: string;
  description: string;
  content_type: 'audio';
  content_type_display: string;
  category: 'rain' | 'ocean' | 'forest' | 'birds' | 'fire' | 'thunder' | 'wind' | 'river' | 'meditation' | 'breathing';
  category_display: string;
  audio_url: string;
  thumbnail_url: string;
  duration_seconds: number;
  duration_formatted: string;
  instructions: string;
  is_premium: boolean;
  is_active: boolean;
  play_count: number;
  average_rating: string;
  created_at: string;
  updated_at: string;
}

export interface RelaxationFilters {
  category?: string;
  type?: 'nature' | 'meditation' | 'breathing' | 'audio' | 'music' | 'ambient';
  ordering?: string;
}

export interface WeeklyMoodDay {
  day: string;
  date: string;
  mood: string | null;
  mood_label: string;
  intensity: number;
  avg_intensity: number;
  all_moods: string[];
  entry_count: number;
  triggers: string[];
  mood_breakdown?: Record<string, { avg_intensity: number; frequency: number }>;
}

export interface WeeklyMoodTrendResponse {
  weekly_moods: WeeklyMoodDay[];
  pattern_insight: string;
}

export interface DashboardData {
  mood_today: MoodEntry | null;
  journal_count_this_month: number;
  next_session: SessionInfo | null;
  active_goals_count: number;
  completed_goals_count: number;
  mood_trend: MoodEntry[];
  recent_journal_entries: JournalEntry[];
  upcoming_sessions: SessionInfo[];
  daily_inspiration: DailyInspiration | null;
  relaxation_minutes_this_week: number;
  emotional_insights_count: number;
}

export interface PatientGoal {
  id: string;
  patient: string;
  patient_name?: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  status_display?: string;
  priority: 'low' | 'medium' | 'high';
  priority_display?: string;
  target_date?: string | null;
  completed_date?: string | null;
  progress_percentage: number;
  milestones?: string | null;
  created_by_therapist?: boolean;
  therapist_notes?: string | null;
  days_remaining?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePatientGoalData {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  target_date?: string; // YYYY-MM-DD
  progress_percentage?: number;
  milestones?: string;
}

export interface UpdatePatientGoalData {
  title?: string;
  description?: string;
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  priority?: 'low' | 'medium' | 'high';
  target_date?: string | null;
  completed_date?: string | null;
  progress_percentage?: number;
  milestones?: string | null;
  therapist_notes?: string | null;
}

class PatientService {
  /**
   * Create a new mood entry for today
   */
  async createMoodEntry(data: CreateMoodEntryData): Promise<MoodEntryResponse> {
    const response = await api.post<MoodEntryResponse>('/patients/mood/', data);
    return response.data;
  }

  /**
   * Fetch patient dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    const response = await api.get<DashboardData>('/patients/dashboard/');
    return response.data;
  }

  /**
   * Fetch weekly mood trend used by the Weekly Trend screen
   */
  async getWeeklyMoodTrend(): Promise<WeeklyMoodTrendResponse> {
    const response = await api.get<WeeklyMoodTrendResponse>('/patients/mood/weekly-trend/');
    return response.data;
  }

  /**
   * Fetch patient profile (includes therapist connection info)
   */
  async getPatientProfile(): Promise<any> {
    const response = await api.get<any>('/users/patient-profile/');
    return response.data;
  }

  /**
   * Fetch emotional insights with optional filters
   */
  async getEmotionalInsights(filters?: EmotionalInsightsFilters): Promise<EmotionalInsight[]> {
    const params: Record<string, string> = {};
    
    if (filters?.emotion) {
      params.emotion = filters.emotion;
    }
    if (filters?.ordering) {
      params.ordering = filters.ordering;
    }
    if (filters?.resolved !== undefined) {
      params.resolved = filters.resolved.toString();
    }

    const response = await api.get<EmotionalInsight[]>('/patients/emotions/', { params });
    return response.data;
  }

  /**
   * Get sessions for the current user (patient) — uses therapist/patient unified endpoint
   */
  async getMySessions(filter: 'upcoming' | 'past' = 'upcoming', limit = 50, offset = 0): Promise<any> {
    const params: Record<string, any> = { filter, limit, offset };
    const response = await api.get<any>('/therapy_sessions/sessions/my/', { params });
    return response.data;
  }

  /**
   * Get a single session detail (includes session summary for patients)
   */
  async getSession(sessionId: string): Promise<any> {
    const response = await api.get<any>(`/therapy_sessions/sessions/${sessionId}/`);
    return response.data;
  }

  /**
   * Create a new emotional insight
   */
  async createEmotionalInsight(data: CreateEmotionalInsightData): Promise<EmotionalInsight> {
    const response = await api.post<EmotionalInsight>('/patients/emotions/', data);
    return response.data;
  }

  /**
   * Get a specific emotional insight by ID
   */
  async getEmotionalInsight(id: string): Promise<EmotionalInsight> {
    const response = await api.get<EmotionalInsight>(`/patients/emotions/${id}/`);
    return response.data;
  }

  /**
   * Update an emotional insight (full update)
   */
  async updateEmotionalInsight(id: string, data: CreateEmotionalInsightData): Promise<EmotionalInsight> {
    const response = await api.put<EmotionalInsight>(`/patients/emotions/${id}/`, data);
    return response.data;
  }

  /**
   * Partially update an emotional insight (PATCH)
   */
  async partialUpdateEmotionalInsight(id: string, data: Partial<CreateEmotionalInsightData>): Promise<EmotionalInsight> {
    const response = await api.patch<EmotionalInsight>(`/patients/emotions/${id}/`, data);
    return response.data;
  }

  /**
   * Get emotional insights analytics
   */
  async getEmotionalInsightsAnalytics(): Promise<EmotionalInsightsAnalytics> {
    const response = await api.get<EmotionalInsightsAnalytics>('/patients/emotions/analytics/');
    return response.data;
  }

  /**
   * Delete an emotional insight
   */
  async deleteEmotionalInsight(id: string): Promise<void> {
    await api.delete(`/patients/emotions/${id}/`);
  }

  /**
   * Get today's journal prompt
   */
  async getTodayPrompt(): Promise<JournalPrompt> {
    const response = await api.get<JournalPrompt>('/patients/journal/prompt/today/');
    return response.data;
  }

  /**
   * Create a new journal entry
   */
  async createJournalEntry(data: CreateJournalEntryData): Promise<JournalEntry> {
    const response = await api.post<JournalEntry>('/patients/journal/', data);
    return response.data;
  }

  /**
   * Get all journal entries with optional filters
   */
  async getJournalEntries(filters?: JournalFilters): Promise<JournalEntry[]> {
    try {
      const response = await api.get<JournalEntry[]>('/patients/journal/', { params: filters });
      console.log('[PatientService] Journal entries response:', response.data);
      // Handle both array and paginated response
      if (Array.isArray(response.data)) {
        return response.data;
      }
      // If paginated, extract results
      if (response.data && typeof response.data === 'object' && 'results' in response.data) {
        return (response.data as any).results || [];
      }
      console.warn('[PatientService] Unexpected response format:', response.data);
      return [];
    } catch (error) {
      console.error('[PatientService] Error fetching journal entries:', error);
      throw error;
    }
  }

  /**
   * Get a specific journal entry by ID
   */
  async getJournalEntry(id: string): Promise<JournalEntry> {
    const response = await api.get<JournalEntry>(`/patients/journal/${id}/`);
    return response.data;
  }

  /**
   * Update an existing journal entry
   */
  async updateJournalEntry(id: string, data: CreateJournalEntryData): Promise<JournalEntry> {
    const response = await api.put<JournalEntry>(`/patients/journal/${id}/`, data);
    return response.data;
  }

  /**
   * Delete a journal entry
   */
  async deleteJournalEntry(id: string): Promise<void> {
    await api.delete(`/patients/journal/${id}/`);
  }

  /**
   * Get journal analytics including counts, streaks, and common tags
   */
  async getJournalAnalytics(): Promise<JournalAnalytics> {
    const response = await api.get<JournalAnalytics>('/patients/journal/analytics/');
    return response.data;
  }

  /**
   * Get all relaxation content with optional filters
   */
  async getRelaxationContent(filters?: RelaxationFilters): Promise<RelaxationContent[]> {
    const response = await api.get<RelaxationContent[]>('/patients/relaxation/content/', { params: filters });
    const data = response.data || [];
    // Normalize audio_url to a full URL if backend sent a relative path
    return data.map((item: any) => ({
      ...item,
      audio_url: normalizeMediaUrl(item.audio_url),
    }));
  }

  /**
   * Get a specific relaxation content item by ID
   */
  async getRelaxationContentDetail(id: string): Promise<RelaxationContent> {
    const response = await api.get<RelaxationContent>(`/patients/relaxation/content/${id}/`);
    const item = response.data;
    if (item) item.audio_url = normalizeMediaUrl(item.audio_url);
    return item;
  }

  /**
   * Create a new relaxation session record (start/complete session)
   */
  async createRelaxationSession(data: {
    content: string;
    duration_listened_seconds: number;
    completed?: boolean;
    rating?: number | null;
    mood_before?: string | null;
    mood_after?: string | null;
    notes?: string | null;
  }): Promise<any> {
    const response = await api.post<any>('/patients/relaxation/sessions/', data);
    return response.data;
  }

  /**
   * Update an existing relaxation session (PATCH)
   */
  async updateRelaxationSession(id: string, data: Partial<{
    duration_listened_seconds: number;
    completed: boolean;
    rating: number | null;
    mood_before: string | null;
    mood_after: string | null;
    notes: string | null;
  }>): Promise<any> {
    const response = await api.patch<any>(`/patients/relaxation/sessions/${id}/`, data);
    return response.data;
  }

  /* Goals API */
  async getGoals(status?: string): Promise<PatientGoal[]> {
    const params: Record<string, any> = {};
    if (status) params.status = status;
    const response = await api.get<PatientGoal[]>('/patients/goals/', { params });
    return response.data;
  }

  async createGoal(data: CreatePatientGoalData): Promise<PatientGoal> {
    const response = await api.post<PatientGoal>('/patients/goals/', data);
    return response.data;
  }

  async updateGoal(id: string, data: UpdatePatientGoalData): Promise<PatientGoal> {
    const response = await api.put<PatientGoal>(`/patients/goals/${id}/`, data);
    return response.data;
  }

  async partialUpdateGoal(id: string, data: Partial<UpdatePatientGoalData>): Promise<PatientGoal> {
    const response = await api.patch<PatientGoal>(`/patients/goals/${id}/`, data);
    return response.data;
  }

  async deleteGoal(id: string): Promise<void> {
    await api.delete(`/patients/goals/${id}/`);
  }

  /* Notifications API - patient side */
  async getNotificationPreferences(): Promise<any> {
    const response = await api.get('/patients/notifications/preferences/');
    return response.data;
  }

  async updateNotificationPreferences(data: any): Promise<any> {
    const response = await api.put('/patients/notifications/preferences/', data);
    return response.data;
  }

  async registerDevicePushToken(data: { push_token: string; device_id?: string; platform?: 'ios' | 'android' | 'unknown' }): Promise<any> {
    const response = await api.post('/patients/notifications/device-token/', data);
    return response.data;
  }

  async unregisterDevicePushToken(data?: { push_token?: string; device_id?: string }): Promise<any> {
    const response = await api.delete('/patients/notifications/device-token/', { data });
    return response.data;
  }

  async runPushDiagnostics(): Promise<any> {
    const response = await api.post('/patients/notifications/push-diagnostics/');
    return response.data;
  }

  async getNotifications(params?: Record<string, any>): Promise<any[]> {
    const response = await api.get<any[]>('/patients/notifications/', { params });
    return response.data;
  }

  async getUnreadNotificationCount(): Promise<number> {
    const response = await api.get<{ unread_count: number }>('/patients/notifications/unread-count/');
    return response.data?.unread_count ?? 0;
  }

  async markNotificationRead(notificationId: string): Promise<any> {
    const response = await api.post(`/patients/notifications/${notificationId}/read/`);
    return response.data;
  }

  async markAllNotificationsRead(): Promise<any> {
    const response = await api.post('/patients/notifications/mark-all-read/');
    return response.data;
  }

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/patients/notifications/${id}/`);
  }

  /**
   * Send connection request to a therapist using their PIN
   */
  async connectTherapist(therapist_pin: string, message?: string): Promise<any> {
    // sanitize therapist_pin: remove surrounding quotes and whitespace
    let sanitizedPin = therapist_pin?.toString() ?? '';
    sanitizedPin = sanitizedPin.trim();
    // strip surrounding double or single quotes that sometimes appear when copying
    sanitizedPin = sanitizedPin.replace(/^['"]+|['"]+$/g, '');
    const body = { therapist_pin: sanitizedPin, message };
    const response = await api.post('/users/connect-therapist/', body);
    return response.data;
  }

  /**
   * Disconnect from current therapist
   */
  async disconnectTherapist(): Promise<any> {
    try {
      console.log('[PatientService] disconnectTherapist request');
      const response = await api.post('/users/disconnect-therapist/');
      console.log('[PatientService] disconnectTherapist response:', response.status, response.data);
      return response.data;
    } catch (err: any) {
      console.error('[PatientService] disconnectTherapist error:', err?.response?.status, err?.response?.data || err.message);
      throw err;
    }
  }
}

export default new PatientService();

