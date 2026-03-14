// src/services/dashboard.service.ts
import api from '../utils/api';
import type { DashboardResponse } from '../types/dashboard';

class DashboardService {
  /**
   * Fetch therapist dashboard data
   */
  async getDashboardData(): Promise<DashboardResponse> {
    try {
      console.log('[DashboardService] GET /therapy_sessions/dashboard/therapist/');
      const response = await api.get('/therapy_sessions/dashboard/therapist/');

      // Transform backend response to match frontend expectations
      const backendData = response.data;
      const transformedData: DashboardResponse = {
        stats: {
          total_patients: backendData.patient_stats?.total_patients || 0,
          upcoming_sessions: backendData.session_stats?.upcoming_sessions || 0,
          completed_sessions: backendData.session_stats?.completed_sessions_30_days || 0,
          cancelled_sessions: backendData.session_stats?.cancelled_sessions_30_days || 0,
        },
        upcoming_sessions: backendData.upcoming_sessions || [],
        recent_activities: backendData.recent_activities || [],
      };

      console.log('[DashboardService] Transformed dashboard data:', transformedData);
      console.log('[DashboardService] Upcoming sessions sample:', transformedData.upcoming_sessions[0]);
      return transformedData;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response?: { data?: any; status?: number } };
        throw {
          message: err.response?.data?.detail || 'Failed to load dashboard',
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
