import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  category?: string;
  is_read: boolean;
  sent_at: string;
  time_ago?: string;
};

type TherapistNotificationSummary = {
  total_notifications: number;
  unread_notifications: number;
  session_notifications: number;
  session_unread_notifications: number;
  mood_notifications: number;
  mood_unread_notifications: number;
};

type TherapistNotificationTab = 'all' | 'session' | 'mood';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<TherapistNotificationTab>('all');
  const [summary, setSummary] = useState<TherapistNotificationSummary | null>(null);

  const isTherapist = useMemo(() => user?.user_type === 'therapist', [user?.user_type]);

  const listUrl = isTherapist
    ? '/patients/therapist/notifications/'
    : '/patients/notifications/';
  const markReadUrl = (id: string) =>
    isTherapist
      ? `/patients/therapist/notifications/${id}/read/`
      : `/patients/notifications/${id}/read/`;
  const markAllReadUrl = isTherapist
    ? '/patients/therapist/notifications/mark-all-read/'
    : '/patients/notifications/mark-all-read/';
  const summaryUrl = '/patients/therapist/notifications/summary/';

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params =
        isTherapist && activeTab !== 'all'
          ? { category: activeTab }
          : undefined;
      const requests = [
        api.get(listUrl, { params }),
      ];

      if (isTherapist) {
        requests.push(api.get(summaryUrl));
      }

      const [listResponse, summaryResponse] = await Promise.all(requests);
      const items = Array.isArray(listResponse.data) ? listResponse.data : [];
      setNotifications(items);
      setSummary(isTherapist ? (summaryResponse?.data as TherapistNotificationSummary) : null);
    } finally {
      setLoading(false);
    }
  }, [activeTab, isTherapist, listUrl, summaryUrl]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markRead = async (id: string) => {
    setBusyIds((previous) => ({ ...previous, [id]: true }));
    try {
      await api.post(markReadUrl(id));
      await loadNotifications();
    } finally {
      setBusyIds((previous) => ({ ...previous, [id]: false }));
    }
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      await api.post(markAllReadUrl);
      await loadNotifications();
    } finally {
      setLoading(false);
    }
  };

  const therapistTabs = [
    {
      key: 'all' as const,
      label: 'All',
      count: summary?.total_notifications ?? notifications.length,
      unread: summary?.unread_notifications ?? notifications.filter((item) => !item.is_read).length,
    },
    {
      key: 'session' as const,
      label: 'Sessions',
      count: summary?.session_notifications ?? 0,
      unread: summary?.session_unread_notifications ?? 0,
    },
    {
      key: 'mood' as const,
      label: 'Mood',
      count: summary?.mood_notifications ?? 0,
      unread: summary?.mood_unread_notifications ?? 0,
    },
  ];

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        <button
          onClick={markAllRead}
          className="rounded-md bg-purple-700 px-3 py-2 text-sm font-medium text-white hover:bg-purple-800"
          disabled={loading}
        >
          Mark all read
        </button>
      </div>

      {isTherapist && (
        <div className="mb-6 flex flex-wrap gap-3">
          {therapistTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'border-purple-700 bg-purple-700 text-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-white text-gray-700'}`}>
                  {tab.count}
                </span>
                {tab.unread > 0 && (
                  <span className={`ml-2 text-xs ${isActive ? 'text-purple-100' : 'text-purple-700'}`}>
                    {tab.unread} unread
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-gray-500">No notifications yet.</p>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg border p-4 ${item.is_read ? 'bg-white' : 'bg-purple-50'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{item.title}</p>
                  <p className="mt-1 text-sm text-gray-700">{item.message}</p>
                  <p className="mt-2 text-xs text-gray-500">{item.time_ago || item.sent_at}</p>
                </div>
                {!item.is_read && (
                  <button
                    onClick={() => markRead(item.id)}
                    className="rounded-md border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    disabled={!!busyIds[item.id]}
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
