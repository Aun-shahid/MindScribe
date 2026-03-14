// src/types/dashboard.ts
// Dashboard-specific types

import type { UpcomingSession, RecentActivity } from './session';

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

export interface DashboardStats {
  total_patients: number;
  upcoming_sessions: number;
  completed_sessions: number;
  cancelled_sessions: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  upcoming_sessions: UpcomingSession[];
  recent_activities: RecentActivity[];
}
