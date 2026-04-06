import { useState, useEffect, useRef, useCallback } from 'react';
import { backendUrl } from '../config';
import notificationService from '../services/notification.service';
import { listenToNotificationEvent } from '../utils/events';
import type {
  TherapistNotification,
  WSNotificationPayload,
  NotificationToastEntry,
} from '../types/notification';

const HEARTBEAT_INTERVAL_MS = 30_000;

const THERAPIST_NOTIFICATION_TYPES = new Set([
  'session_reminder',
  'session_summary',
  'session_ai_ready',
  'session_approved',
  'session_cancelled',
  'therapist_message',
  'general',
]);

const THERAPIST_SOURCE_EVENT_PREFIXES = [
  'mood.',
  'session.',
  'connection.request.',
];

const getCategoryFromNotification = (
  notificationType: string,
  actionUrl: string,
  title: string,
  message: string,
  sourceEvent: string
): TherapistNotification['category'] => {
  const type = (notificationType || '').toLowerCase();
  const action = (actionUrl || '').toLowerCase();
  const text = `${title || ''} ${message || ''}`.toLowerCase();
  const event = (sourceEvent || '').toLowerCase();

  if (
    type === 'mood_reminder' ||
    action.includes('/mood') ||
    event.startsWith('mood.') ||
    text.includes('mood')
  ) {
    return 'mood';
  }

  if (
    type.startsWith('session_') ||
    action.includes('/sessions') ||
    event.startsWith('session.') ||
    text.includes('session')
  ) {
    return 'session';
  }

  return 'other';
};

const normalizeWsDbRecord = (
  payload: WSNotificationPayload,
  existingRecord: Record<string, unknown>
): TherapistNotification => {
  const notificationBlock = payload.notification;
  const metadata = notificationBlock?.metadata as Record<string, unknown> | undefined;

  const title = String(existingRecord.title ?? notificationBlock?.title ?? 'Notification');
  const message = String(existingRecord.message ?? notificationBlock?.message ?? '');
  const actionUrl =
    (existingRecord.action_url as string | null | undefined) ?? notificationBlock?.action_url ?? null;
  const sourceEvent = notificationBlock?.source_event ?? '';
  const sentAt =
    (existingRecord.sent_at as string | undefined) ??
    payload.created_at ??
    payload.createdAt ??
    new Date().toISOString();
  const notificationType = String(
    existingRecord.notification_type ?? notificationBlock?.notification_type ?? 'general'
  );

  return {
    id: String(existingRecord.id ?? notificationBlock?.id ?? `ws-${Date.now()}`),
    patient: String(existingRecord.patient ?? payload.recipientId ?? ''),
    patient_name: String(existingRecord.patient_name ?? metadata?.patient_name ?? payload.recipient?.name ?? 'Patient'),
    category: getCategoryFromNotification(notificationType, actionUrl ?? '', title, message, sourceEvent),
    notification_type: notificationType as TherapistNotification['notification_type'],
    title,
    message,
    session_id: (existingRecord.session_id as string | null | undefined) ?? notificationBlock?.session_id ?? null,
    goal_id: (existingRecord.goal_id as string | null | undefined) ?? notificationBlock?.goal_id ?? null,
    action_url: actionUrl,
    is_read: Boolean(existingRecord.is_read ?? false),
    read_at: (existingRecord.read_at as string | null | undefined) ?? null,
    sent_at: sentAt,
    time_ago: String(existingRecord.time_ago ?? 'Just now'),
    delivery_status: (existingRecord.delivery_status as string | undefined) ?? undefined,
    delivery_attempts: (existingRecord.delivery_attempts as number | undefined) ?? undefined,
    last_delivery_attempt_at:
      (existingRecord.last_delivery_attempt_at as string | null | undefined) ?? undefined,
    next_retry_at: (existingRecord.next_retry_at as string | null | undefined) ?? undefined,
    delivered_at: (existingRecord.delivered_at as string | null | undefined) ?? undefined,
    delivery_error: (existingRecord.delivery_error as string | null | undefined) ?? undefined,
  };
};

export const useNotifications = () => {
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<TherapistNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<NotificationToastEntry[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // ── HTTP helpers ────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async (isRead?: boolean) => {
    try {
      const data = await notificationService.getTherapistNotifications(isRead);
      setNotifications(data);
    } catch {
      // silently ignore — page-level error handling handles display
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getTherapistUnreadCount();
      setUnreadCount(count);
    } catch {
      // no-op
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const updated = await notificationService.markTherapistNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? updated : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // no-op
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllTherapistNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // no-op
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationService.deleteTherapistNotification(id);
      setNotifications((prev) => {
        const wasUnread = prev.some((n) => n.id === id && !n.is_read);
        if (wasUnread) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return prev.filter((n) => n.id !== id);
      });
    } catch {
      // no-op
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── WebSocket ───────────────────────────────────────────────────────────────

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  const startHeartbeat = (ws: WebSocket) => {
    stopHeartbeat();
    heartbeatRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_INTERVAL_MS);
  };

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Derive ws(s):// from the backend http(s):// URL
    const protocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
    const host = backendUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${protocol}://${host}/ws/notifications/?token=${token}`;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttemptsRef.current = 0;
      startHeartbeat(ws);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const payload: WSNotificationPayload = JSON.parse(event.data as string);

        if (payload.event === 'notification.created' && payload.notification) {
          const notif = payload.notification;

          const dbRecord = (notif.db_record as Record<string, unknown> | undefined) ?? undefined;
          const rawType = (dbRecord?.notification_type ?? notif.notification_type ?? '').toString().toLowerCase();
          const sourceEvent = (notif.source_event ?? '').toLowerCase();
          const isTherapistRecipient = payload.recipient?.user_type === 'therapist';
          const isKnownTherapistType = THERAPIST_NOTIFICATION_TYPES.has(rawType);
          const isKnownTherapistSource = THERAPIST_SOURCE_EVENT_PREFIXES.some((prefix) =>
            sourceEvent.startsWith(prefix)
          );

          if (!isTherapistRecipient && !isKnownTherapistType && !isKnownTherapistSource) {
            return;
          }

          if (dbRecord) {
            const normalized = normalizeWsDbRecord(payload, dbRecord);
            setNotifications((prev) => [normalized, ...prev]);
            if (!normalized.is_read) {
              setUnreadCount((prev) => prev + 1);
            }
          }

          // Fire a real-time toast
          const metaAny = notif.metadata as Record<string, unknown>;
          const toastEntry: NotificationToastEntry = {
            id: notif.id ?? `toast-${Date.now()}`,
            title: notif.title,
            message: notif.message,
            priority: notif.priority,
            source_event: notif.source_event,
            action_url: notif.action_url,
            patient_name:
              (metaAny?.patient_name as string) ?? '',
            created_at:
              payload.created_at ?? payload.createdAt ?? new Date().toISOString(),
            is_read: dbRecord ? Boolean((dbRecord as { is_read?: boolean }).is_read) : false,
          };

          setToasts((prev) => [toastEntry, ...prev].slice(0, 5)); // keep max 5 toasts
        }
      } catch {
        // malformed frame — ignore
      }
    };

    ws.onclose = () => {
      setConnected(false);
      stopHeartbeat();
      wsRef.current = null;

      // Exponential back-off reconnect (max 30 s)
      const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30_000);
      reconnectAttemptsRef.current += 1;
      reconnectRef.current = setTimeout(() => {
        const stillAuthed = !!localStorage.getItem('access_token');
        if (stillAuthed) connect();
      }, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    stopHeartbeat();
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent auto-reconnect on manual disconnect
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  useEffect(() => {
    // Initial data load
    fetchUnreadCount();
    fetchNotifications();
    // Connect WebSocket
    connect();

    return () => {
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unlisten = listenToNotificationEvent('notifications-updated', () => {
      fetchUnreadCount();
      fetchNotifications();
    });

    return () => {
      unlisten();
    };
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    // State
    connected,
    notifications,
    unreadCount,
    toasts,
    // HTTP actions
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    // Toast actions
    dismissToast,
    // WS actions
    connect,
    disconnect,
  };
};
