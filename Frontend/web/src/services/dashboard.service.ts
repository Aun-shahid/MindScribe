// src/services/dashboard.service.ts
import api from '../utils/api';
import type { DashboardResponse } from '../types/dashboard';

interface RawTherapistDashboardResponse {
  patient_stats?: {
    total_patients?: number | string;
  };
  session_stats?: {
    today_sessions?: number | string;
    upcoming_sessions?: number | string;
    total_sessions_30_days?: number | string;
    completed_sessions_30_days?: number | string;
    cancelled_sessions_30_days?: number | string;
  };
  notification_stats?: DashboardResponse['notification_stats'];
  upcoming_sessions?: DashboardResponse['upcoming_sessions'];
  recent_activities?: DashboardResponse['recent_activities'];
}

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getErrorMessage = (data: unknown): string => {
  if (typeof data === 'string' && data.trim()) {
    return data;
  }
  if (typeof data === 'object' && data !== null) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  }
  return 'Failed to load dashboard';
};

class DashboardService {
  /**
   * Fetch therapist dashboard data
   */
  async getDashboardData(): Promise<DashboardResponse> {
    try {
      const response = await api.get('/therapy_sessions/dashboard/therapist/');

      const backendData = (response.data || {}) as RawTherapistDashboardResponse;
      const transformedData: DashboardResponse = {
        stats: {
          total_patients: toNumber(backendData.patient_stats?.total_patients),
          upcoming_sessions: toNumber(backendData.session_stats?.upcoming_sessions),
          completed_sessions: toNumber(backendData.session_stats?.completed_sessions_30_days),
          cancelled_sessions: toNumber(backendData.session_stats?.cancelled_sessions_30_days),
        },
        session_stats: {
          today_sessions: toNumber(backendData.session_stats?.today_sessions),
          upcoming_sessions: toNumber(backendData.session_stats?.upcoming_sessions),
          total_sessions_30_days: toNumber(backendData.session_stats?.total_sessions_30_days),
          completed_sessions_30_days: toNumber(backendData.session_stats?.completed_sessions_30_days),
          cancelled_sessions_30_days: toNumber(backendData.session_stats?.cancelled_sessions_30_days),
        },
        notification_stats: backendData.notification_stats,
        upcoming_sessions: Array.isArray(backendData.upcoming_sessions) ? backendData.upcoming_sessions : [],
        recent_activities: Array.isArray(backendData.recent_activities) ? backendData.recent_activities : [],
      };

      return transformedData;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response?: { data?: unknown; status?: number } };
        throw {
          message: getErrorMessage(err.response?.data),
          code: err.response?.status?.toString(),
        };
      }
      if (typeof error === 'object' && error !== null && 'message' in error) {
        throw { message: (error as { message: string }).message, code: 'NETWORK_ERROR' };
      }
      throw { message: 'An unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }
}

export default new DashboardService();
