import { useEffect, useMemo, useRef, useState } from 'react';
import { backendUrl } from '../config';

interface LiveNotification {
  id: string;
  title: string;
  message: string;
}

const MAX_TOASTS = 4;
const AUTO_DISMISS_MS = 6000;

const InAppNotificationToasts = () => {
  const [toasts, setToasts] = useState<LiveNotification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const wsUrl = useMemo(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return null;
    }

    const base = backendUrl.replace(/^http/i, 'ws');
    return `${base}/ws/notifications/?token=${encodeURIComponent(token)}`;
  }, []);

  useEffect(() => {
    if (!wsUrl) {
      return;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.event !== 'notification.created' || !payload?.notification) {
          return;
        }

        const notificationId = String(payload.notification.id || '');
        const nextToast: LiveNotification = {
          id: notificationId || `${Date.now()}`,
          title: String(payload.notification.title || 'Notification'),
          message: String(payload.notification.message || ''),
        };

        setToasts((previous) => [nextToast, ...previous].slice(0, MAX_TOASTS));

        if (notificationId && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              event: 'notification.delivered',
              notification_id: notificationId,
            })
          );
        }
      } catch {
        // Ignore malformed websocket payloads.
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [wsUrl]);

  useEffect(() => {
    if (!toasts.length) {
      return;
    }

    const timeout = setTimeout(() => {
      setToasts((previous) => previous.slice(0, -1));
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timeout);
  }, [toasts]);

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
          <p className="mt-1 text-sm text-gray-700">{toast.message}</p>
        </div>
      ))}
    </div>
  );
};

export default InAppNotificationToasts;
