// app/services/patient.service.ts
import api from '../utils/api';

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
  mood: string;
  mood_score: number;
  energy_level: number;
  sleep_quality: number;
  anxiety_level: number;
  stress_level: number;
  triggers: string;
  triggers_list: string[];
  location: string;
  weather: string;
  notes: string;
  coping_strategies_used: string;
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
  common_tags: Array<{ tag: string; count: number }>;
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
    const response = await api.get<JournalEntry[]>('/patients/journal/', { params: filters });
    return response.data;
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
    return response.data;
  }

  /**
   * Get a specific relaxation content item by ID
   */
  async getRelaxationContentDetail(id: string): Promise<RelaxationContent> {
    const response = await api.get<RelaxationContent>(`/patients/relaxation/content/${id}/`);
    return response.data;
  }
}

export default new PatientService();
