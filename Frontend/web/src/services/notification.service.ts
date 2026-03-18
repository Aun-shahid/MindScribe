import api from '../utils/api';
import type {
  TherapistNotification,
  UnreadCountResponse,
  MarkAllReadResponse,
  TherapistNotificationSummary,
} from '../types/notification';

type TherapistNotificationCategory = 'session' | 'mood' | 'other';
type TherapistNotificationQuery = {
  isRead?: boolean;
  category?: TherapistNotificationCategory;
};

class NotificationService {
  // ── Therapist notification endpoints ──────────────────────────────────────
  // All backed by /api/patients/therapist/notifications/ (IsTherapist permission)
  // Auth token is attached automatically by the api axios interceptor.

  async getTherapistNotifications(
    query?: boolean | TherapistNotificationQuery
  ): Promise<TherapistNotification[]> {
    try {
      const params: Record<string, string> = {};

      if (typeof query === 'boolean') {
        params.is_read = query ? 'true' : 'false';
      } else {
        if (query?.isRead !== undefined) {
          params.is_read = query.isRead ? 'true' : 'false';
        }
        if (query?.category) {
          params.category = query.category;
        }
      }

      const response = await api.get<TherapistNotification[]>(
        '/patients/therapist/notifications/',
        { params }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTherapistUnreadCount(): Promise<number> {
    try {
      const response = await api.get<UnreadCountResponse>(
        '/patients/therapist/notifications/unread-count/'
      );
      return response.data.unread_count;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTherapistNotificationSummary(): Promise<TherapistNotificationSummary> {
    try {
      const response = await api.get<TherapistNotificationSummary>(
        '/patients/therapist/notifications/summary/'
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async markTherapistNotificationRead(notificationId: string): Promise<TherapistNotification> {
    try {
      const response = await api.post<TherapistNotification>(
        `/patients/therapist/notifications/${notificationId}/read/`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async markAllTherapistNotificationsRead(): Promise<number> {
    try {
      const response = await api.post<MarkAllReadResponse>(
        '/patients/therapist/notifications/mark-all-read/'
      );
      return response.data.marked_count;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteTherapistNotification(notificationId: string): Promise<void> {
    try {
      await api.delete(`/patients/therapist/notifications/${notificationId}/`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ── Error normaliser (matches pattern used across all other services) ──────
  private handleError(error: unknown): Error {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { detail?: string; message?: string } } };
      const detail =
        axiosError.response?.data?.detail ||
        axiosError.response?.data?.message ||
        'An error occurred';
      return new Error(detail);
    }
    if (error instanceof Error) return error;
    return new Error('An unexpected error occurred');
  }
}

export default new NotificationService();
