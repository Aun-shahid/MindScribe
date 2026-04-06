import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  User,
} from 'lucide-react';
import notificationService from '../services/notification.service';
import {
  getNotificationActionLabel,
  resolveNotificationActionUrl,
} from '../utils/notificationNavigation';
import { emitNotificationEvent } from '../utils/events';
import type {
  TherapistNotification,
  TherapistNotificationSummary,
} from '../types/notification';
import { THERAPIST_PAGE_CANVAS } from '../constants/pageShell';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_LABEL: Record<string, string> = {
  'mood.streak.bad3': '3 Consecutive Bad Moods',
  'mood.trend.downward': 'Downward Mood Trend',
};

const getCardAccent = (notification: TherapistNotification) => {
  const url = notification.action_url ?? '';
  if (url.includes('three_bad_moods')) return 'red';
  if (notification.title.toLowerCase().includes('urgent')) return 'red';
  if (notification.title.toLowerCase().includes('trend')) return 'orange';
  return 'purple';
};

const ACCENT = {
  red: {
    border: 'border-l-red-500',
    badge: 'bg-red-100 text-red-700',
    icon: <AlertTriangle size={16} className="text-red-500" />,
    dot: 'bg-red-500',
  },
  orange: {
    border: 'border-l-orange-400',
    badge: 'bg-orange-100 text-orange-700',
    icon: <TrendingDown size={16} className="text-orange-500" />,
    dot: 'bg-orange-400',
  },
  purple: {
    border: 'border-l-purple-500',
    badge: 'bg-purple-100 text-purple-700',
    icon: <Bell size={16} className="text-purple-500" />,
    dot: 'bg-purple-500',
  },
} as const;

type AccentKey = keyof typeof ACCENT;

// ── Component ─────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'unread' | 'read';
type CategoryTab = 'session' | 'mood' | 'all';

const parseCategoryParam = (value: string | null): CategoryTab => {
  if (value === 'session' || value === 'mood') return value;
  return 'all';
};

const Notifications = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [notifications, setNotifications] = useState<TherapistNotification[]>([]);
  const [summary, setSummary] = useState<TherapistNotificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryTab>(parseCategoryParam(searchParams.get('category')));
  const [filter, setFilter] = useState<FilterTab>('all');
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const loadSummary = useCallback(async () => {
    try {
      const data = await notificationService.getTherapistNotificationSummary();
      setSummary(data);
    } catch {
      // no-op
    }
  }, []);

  const load = useCallback(async (selectedCategory: CategoryTab, tab: FilterTab) => {
    setLoading(true);
    setError(null);
    try {
      const isRead = tab === 'all' ? undefined : tab === 'read';
      let data: TherapistNotification[];

      if (selectedCategory === 'all') {
        // Keep "All" focused on the two supported therapist groups only.
        const [sessionData, moodData] = await Promise.all([
          notificationService.getTherapistNotifications({ isRead, category: 'session' }),
          notificationService.getTherapistNotifications({ isRead, category: 'mood' }),
        ]);

        const deduped = new Map<string, TherapistNotification>();
        [...sessionData, ...moodData].forEach((item) => {
          deduped.set(item.id, item);
        });
        data = Array.from(deduped.values()).sort(
          (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
        );
      } else {
        data = await notificationService.getTherapistNotifications({
          isRead,
          category: selectedCategory,
        });
      }

      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(category, filter);
    loadSummary();
  }, [category, filter, load, loadSummary]);

  useEffect(() => {
    const paramCategory = parseCategoryParam(searchParams.get('category'));
    if (paramCategory !== category) {
      setCategory(paramCategory);
    }
  }, [searchParams, category]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleCategoryTabChange = (tab: CategoryTab) => {
    setCategory(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'all') {
        next.delete('category');
      } else {
        next.set('category', tab);
      }
      return next;
    }, { replace: true });
  };

  const handleMarkRead = async (id: string) => {
    try {
      const updated = await notificationService.markTherapistNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)));
      loadSummary();
      emitNotificationEvent('notifications-updated', { reason: 'mark-read', id });
    } catch {
      // no-op
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllTherapistNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      loadSummary();
      emitNotificationEvent('notifications-updated', { reason: 'mark-all-read' });
    } catch {
      // no-op
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await notificationService.deleteTherapistNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      loadSummary();
      emitNotificationEvent('notifications-updated', { reason: 'delete', id });
    } catch {
      // no-op
    } finally {
      setDeletingId(null);
    }
  };

  const handleNavigate = (notification: TherapistNotification) => {
    if (!notification.is_read) handleMarkRead(notification.id);
    const target = resolveNotificationActionUrl(notification);
    if (!target) return;
    navigate(target);
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const categoryCounts = {
    session: summary?.session_notifications ?? 0,
    mood: summary?.mood_notifications ?? 0,
    all:
      (summary?.session_notifications ?? 0) +
      (summary?.mood_notifications ?? 0) ||
      notifications.length,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={THERAPIST_PAGE_CANVAS}>
      <div className="max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell size={24} className="text-purple-600" />
            Notifications
          </h1>
          {summary && (
            <p className="text-sm text-gray-500 mt-0.5">
              Total {summary.total_notifications} | Unread {summary.unread_notifications}
            </p>
          )}
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              load(category, filter);
              loadSummary();
            }}
            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCheck size={16} />
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 bg-purple-50 border border-purple-100 rounded-xl p-1 mb-3 w-fit">
        {(
          [
            { key: 'session', label: 'Sessions' },
            { key: 'mood', label: 'Mood' },
            { key: 'all', label: 'All' },
          ] as Array<{ key: CategoryTab; label: string }>
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleCategoryTabChange(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              category === tab.key
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-purple-500 hover:text-purple-700'
            }`}
          >
            {tab.label} ({categoryCounts[tab.key]})
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {(['all', 'unread', 'read'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
              filter === tab
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* States */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => load(category, filter)}
            className="mt-3 text-sm text-red-500 underline"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <BellOff size={48} className="mb-3 opacity-40" />
          <p className="text-lg font-medium">No notifications</p>
          <p className="text-sm mt-1">
            {filter === 'unread'
              ? 'All caught up — no unread notifications.'
              : category === 'session'
              ? 'Session-related therapist notifications will appear here.'
              : category === 'mood'
              ? 'Mood-related therapist notifications will appear here.'
              : 'Therapist notifications will appear here.'}
          </p>
        </div>
      )}

      {!loading && !error && notifications.length > 0 && (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => {
            const accentKey = getCardAccent(notification) as AccentKey;
            const style = ACCENT[accentKey];
            const url = notification.action_url ?? '';
            const sourceKey = url.includes('three_bad_moods')
              ? 'mood.streak.bad3'
              : notification.title.toLowerCase().includes('trend')
              ? 'mood.trend.downward'
              : '';

            return (
              <div
                key={notification.id}
                className={`relative rounded-xl border border-gray-200 border-l-4 ${style.border} shadow-sm transition-all hover:shadow-md ${
                  notification.is_read
                    ? 'bg-gray-50/90 opacity-[0.88]'
                    : `bg-white ring-1 ring-purple-100`
                }`}
              >
                {/* Unread dot */}
                {!notification.is_read && (
                  <span
                    className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${style.dot}`}
                  />
                )}

                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{style.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`font-semibold text-sm ${
                            notification.is_read ? 'text-gray-500' : 'text-gray-900'
                          }`}
                        >
                          {notification.title}
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 uppercase">
                          {notification.category}
                        </span>
                        {sourceKey && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                            {SOURCE_LABEL[sourceKey]}
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-sm leading-snug ${
                          notification.is_read ? 'text-gray-500' : 'text-gray-600'
                        }`}
                      >
                        {notification.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <User size={12} />
                          <span>{notification.patient_name}</span>
                        </div>
                        <span className="text-xs text-gray-400">{notification.time_ago}</span>
                        {notification.is_read ? (
                          <span className="text-xs text-gray-400">Read</span>
                        ) : (
                          <span className="text-xs text-purple-500 font-medium">Unread</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    {notification.action_url && (
                      <button
                        onClick={() => handleNavigate(notification)}
                        className="text-xs font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {getNotificationActionLabel(notification.title, notification.action_url)}
                      </button>
                    )}
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkRead(notification.id)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <CheckCheck size={12} />
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      disabled={deletingId === notification.id}
                      className="ml-auto text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40"
                    >
                      <Trash2 size={12} />
                      {deletingId === notification.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};

export default Notifications;
