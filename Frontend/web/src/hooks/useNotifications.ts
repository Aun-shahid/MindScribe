import { useState, useEffect, useRef, useCallback } from 'react';
import { backendUrl } from '../config';
import notificationService from '../services/notification.service';
import type {
  TherapistNotification,
  WSNotificationPayload,
  NotificationToastEntry,
} from '../types/notification';

const HEARTBEAT_INTERVAL_MS = 30_000;

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
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => {
        const wasUnread = notifications.find((n) => n.id === id && !n.is_read);
        return wasUnread ? Math.max(0, prev - 1) : prev;
      });
    } catch {
      // no-op
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

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

          // Guard: only process notifications explicitly addressed to therapists.
          // Accept if the db_record has notification_type='therapist_message',
          // OR if the source_event is a known therapist mood alert event.
          // This prevents any patient-type notification that somehow reaches this
          // WebSocket channel from being displayed in the therapist UI.
          const THERAPIST_NOTIFICATION_TYPE = 'therapist_message';
          const THERAPIST_SOURCE_EVENTS = ['mood.streak.bad3', 'mood.trend.downward'];

          const isTherapistNotificationType =
            notif.db_record?.notification_type === THERAPIST_NOTIFICATION_TYPE;
          const isTherapistSourceEvent = THERAPIST_SOURCE_EVENTS.includes(notif.source_event);

          if (!isTherapistNotificationType && !isTherapistSourceEvent) {
            // Not a therapist notification — discard silently
            return;
          }

          // Prepend the new notification into the local list if it has a db_record
          if (notif.db_record) {
            setNotifications((prev) => [notif.db_record!, ...prev]);
            if (!notif.db_record.is_read) {
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
