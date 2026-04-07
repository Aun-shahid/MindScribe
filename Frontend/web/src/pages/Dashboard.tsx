import { useDashboard } from '../hooks/useDashboard';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { TherapistDashboardUpcomingSession } from '../types/dashboard';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { listenToAppEvent } from '../utils/events';
import { THERAPIST_PAGE_CANVAS } from '../constants/pageShell';
import { DashboardPageSkeleton } from '../components/pageSkeletons/MainPageSkeletons';
import { Calendar, Users, ClipboardList, Activity, ChevronRight, Stethoscope, PlusCircle, RefreshCw, QrCode } from 'lucide-react';

const Dashboard = () => {
  const { dashboard, loading, error, refreshDashboard } = useDashboard();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { user } = useAuth();
  const locationStateMessage = (location.state as { message?: string } | null)?.message;

  const notificationStats = dashboard?.notification_stats;
  const completedSessionsCount = dashboard?.session_stats?.completed_sessions_30_days ?? 0;
  const upcomingSessionsCount = dashboard?.session_stats?.upcoming_sessions ?? 0;
  const cancelledSessionsCount = dashboard?.session_stats?.cancelled_sessions_30_days ?? 0;
  const totalPatients = dashboard?.stats?.total_patients ?? 0;
  const totalSessions = dashboard?.session_stats?.total_sessions_30_days ?? 0;

  const notificationsPage = notificationStats?.navigation?.notifications_page || '/notifications';
  const moodNotificationsHref = `${notificationsPage}${notificationStats?.navigation?.mood_tab_query || '?category=mood'}`;
  const sessionNotificationsHref = `${notificationsPage}${notificationStats?.navigation?.session_tab_query || '?category=session'}`;

  const displayName = useMemo(() => {
    const fn = user?.first_name?.trim();
    const ln = user?.last_name?.trim();
    if (fn || ln) return [fn, ln].filter(Boolean).join(' ');
    return user?.username || 'Therapist';
  }, [user]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  useEffect(() => {
    const cleanupUpdated = listenToAppEvent('session-updated', () => {
      refreshDashboard();
    });
    const cleanupCreated = listenToAppEvent('session-created', () => {
      refreshDashboard();
    });
    return () => {
      cleanupUpdated();
      cleanupCreated();
    };
  }, [refreshDashboard]);

  useEffect(() => {
    if (locationStateMessage) {
      setSuccessMessage(locationStateMessage);
      const timerId = window.setTimeout(() => setSuccessMessage(null), 5000);
      window.history.replaceState({}, document.title);
      return () => window.clearTimeout(timerId);
    }
    return undefined;
  }, [locationStateMessage]);

  const pieChartData = [
    { name: 'Completed', value: completedSessionsCount, color: '#10b981' },
    { name: 'Upcoming', value: upcomingSessionsCount, color: '#3b82f6' },
    { name: 'Cancelled', value: cancelledSessionsCount, color: '#ef4444' },
  ].filter((item) => item.value > 0);

  const pieStatusTotal = pieChartData.reduce((sum, item) => sum + item.value, 0);

  const notificationChartData = [
    { name: 'Session', value: notificationStats?.session_notifications || 0, color: '#2563eb' },
    { name: 'Mood', value: notificationStats?.mood_notifications || 0, color: '#f97316' },
    { name: 'Other', value: notificationStats?.other_notifications || 0, color: '#8b5cf6' },
  ].filter((item) => item.value > 0);

  const totalNotifications =
    (notificationStats?.session_notifications || 0) +
    (notificationStats?.mood_notifications || 0) +
    (notificationStats?.other_notifications || 0);

  const parseSessionDateMs = (session: TherapistDashboardUpcomingSession): number | null => {
    const sessionDateValue = session.scheduled_date || session.session_date;
    if (!sessionDateValue) {
      return null;
    }
    const parsed = new Date(sessionDateValue).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  };

  const filteredUpcoming = useMemo(() => {
    const list = dashboard?.upcoming_sessions || [];
    const now = Date.now();
    const allowedStatuses = new Set(['UPCOMING', 'IN_PROGRESS', 'RESCHEDULED']);

    return list
      .filter((session) => {
        const sessionDateMs = parseSessionDateMs(session);
        const status = String(session.status || 'UPCOMING').toUpperCase();
        return sessionDateMs !== null && sessionDateMs > now && allowedStatuses.has(status);
      })
      .sort((a, b) => {
        const dateA = parseSessionDateMs(a) ?? Number.MAX_SAFE_INTEGER;
        const dateB = parseSessionDateMs(b) ?? Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      })
      .slice(0, 6);
  }, [dashboard?.upcoming_sessions]);

  if (loading) {
    return <DashboardPageSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-red-700">
        <p className="font-medium">Error loading dashboard: {error.message}</p>
        <button
          type="button"
          onClick={refreshDashboard}
          className="mt-3 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-200"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={`${THERAPIST_PAGE_CANVAS} pb-12`}>
      <div className="mx-auto max-w-[1400px] space-y-6">
        {successMessage && (
          <div className="flex animate-fade-in items-center justify-between rounded-2xl border border-green-200 bg-green-50 px-6 py-4 text-green-800 shadow-sm">
            <span className="font-medium">{successMessage}</span>
            <button type="button" onClick={() => setSuccessMessage(null)} className="text-2xl leading-none text-green-600 hover:text-green-800">
              ×
            </button>
          </div>
        )}

        {/* Welcome + key metrics */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-7">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              {greeting}, {displayName.split(' ')[0]}! <span aria-hidden>👋</span>
            </h1>
            <p className="mt-2 text-sm text-gray-600">Here&apos;s a snapshot of your practice today.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#5c4092] px-4 py-2 text-xs font-semibold text-white shadow-sm">
                {upcomingSessionsCount} upcoming sessions
              </span>
              <span className="rounded-full bg-[#ede9fe] px-4 py-2 text-xs font-semibold text-[#5b21b6]">
                {completedSessionsCount} completed (30d)
              </span>
              <span className="rounded-full bg-[#ede9fe] px-4 py-2 text-xs font-semibold text-[#5b21b6]">
                {totalNotifications} notifications
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/sessions/new"
                className="inline-flex items-center gap-2 rounded-xl bg-[#5c4092] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#43275a]"
              >
                <PlusCircle className="h-4 w-4" strokeWidth={2.2} />
                New session
              </Link>
              <Link
                to="/patients"
                className="inline-flex items-center gap-2 rounded-xl border border-purple-200/70 bg-purple-50/70 px-4 py-2.5 text-sm font-semibold text-[#5c4092] transition hover:bg-purple-100/80"
              >
                <Users className="h-4 w-4" strokeWidth={2.2} />
                Patients
              </Link>
              <button
                type="button"
                onClick={refreshDashboard}
                className="inline-flex items-center gap-2 rounded-xl border border-purple-200/70 bg-purple-50/70 px-4 py-2.5 text-sm font-semibold text-[#5c4092] transition hover:bg-purple-100/80"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={2.2} />
                Refresh
              </button>
              <Link
                to="/qr-code"
                className="inline-flex items-center gap-2 rounded-xl border border-purple-200/70 bg-purple-50/70 px-4 py-2.5 text-sm font-semibold text-[#5c4092] transition hover:bg-purple-100/80"
              >
                <QrCode className="h-4 w-4" strokeWidth={2.2} />
                QR Pairing
              </Link>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-4 lg:col-span-5">
            <MetricMini
              icon={<Calendar className="h-5 w-5 text-white" strokeWidth={2} />}
              iconBg="bg-violet-500"
              label="Total sessions (30d)"
              value={totalSessions}
            />
            <MetricMini
              icon={<Users className="h-5 w-5 text-white" strokeWidth={2} />}
              iconBg="bg-fuchsia-500"
              label="Active patients"
              value={totalPatients}
            />
            <MetricMini
              icon={<ClipboardList className="h-5 w-5 text-white" strokeWidth={2} />}
              iconBg="bg-indigo-500"
              label="Upcoming"
              value={upcomingSessionsCount}
            />
            <MetricMini
              icon={<Activity className="h-5 w-5 text-white" strokeWidth={2} />}
              iconBg="bg-emerald-500"
              label="Completed"
              value={completedSessionsCount}
            />
          </div>
        </div>

        {/* Sessions by status (backend data) */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-12">
            <h2 className="text-lg font-semibold text-gray-900">Sessions by status</h2>
            <p className="text-sm text-gray-500">Values from therapist dashboard endpoint</p>
            <div className="relative mt-4">
              {pieChartData.length > 0 ? (
                <ChartSurface heightPx={240}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {pieChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value ?? 0} sessions`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                </ChartSurface>
              ) : (
                <div className="flex h-[240px] items-center justify-center text-sm text-gray-500">No session data yet</div>
              )}
              {pieChartData.length > 0 ? (
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="text-2xl font-bold text-gray-900">{pieStatusTotal}</p>
                <p className="text-xs text-gray-500">Status total</p>
              </div>
              ) : null}
            </div>
            <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              {pieChartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600">{item.name}</span>
                  </span>
                  <span className="font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-12">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-[#5c4092]" strokeWidth={2} />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Upcoming visits</h2>
                  <p className="text-sm text-gray-500">Next patients on your calendar</p>
                </div>
              </div>
              <Link to="/sessions" className="text-sm font-semibold text-[#5c4092] hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {filteredUpcoming.length > 0 ? (
                filteredUpcoming.map((session) => {
                  const patientName = session.patient_name || session.patient?.full_name || 'Patient';
                  const initials = patientName
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const sessionDateMs = parseSessionDateMs(session);
                  const status = String(session.status || 'UPCOMING').toUpperCase();
                  const sessionDateLabel =
                    sessionDateMs !== null
                      ? new Date(sessionDateMs).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';
                  const statusStyle =
                    status === 'IN_PROGRESS'
                      ? 'bg-emerald-50 text-emerald-700'
                      : status === 'RESCHEDULED'
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-sky-50 text-sky-700';

                  return (
                    <Link
                      key={session.id}
                      to={`/sessions/${session.id}`}
                      className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3 transition-colors hover:border-purple-200 hover:bg-white"
                    >
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] text-xs font-bold text-white">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900">{patientName}</p>
                        <p className="truncate text-xs text-gray-500">
                          {sessionDateLabel ? `${sessionDateLabel} · ` : ''}
                          {session.session_type || 'Therapy session'}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle}`}>{status.replace(/_/g, ' ')}</span>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500">
                  No upcoming sessions scheduled.
                  <div className="mt-4">
                    <Link to="/sessions/new" className="font-semibold text-[#5c4092] hover:underline">
                      Schedule a session
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notifications + quick actions */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            {notificationChartData.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to={sessionNotificationsHref}
                  className="flex flex-1 min-w-[140px] items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-100"
                >
                  Session
                  <span className="text-lg font-bold text-blue-700">{notificationStats?.session_notifications ?? 0}</span>
                </Link>
                <Link
                  to={moodNotificationsHref}
                  className="flex flex-1 min-w-[140px] items-center justify-between rounded-2xl border border-orange-100 bg-orange-50/80 px-4 py-3 text-sm font-medium text-orange-900 hover:bg-orange-100"
                >
                  Mood
                  <span className="text-lg font-bold text-orange-700">{notificationStats?.mood_notifications ?? 0}</span>
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">You&apos;re all caught up.</p>
            )}
          </div>
        </div>
      </div>

      <Link
        to="/sessions"
        className="fixed bottom-8 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#5c4092] text-white shadow-lg transition hover:bg-[#43275a] md:bottom-10"
        aria-label="Go to sessions"
      >
        <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
      </Link>
    </div>
  );
};

/** Recharts needs a parent with definite pixel dimensions; grid/flex items get min-width 0. */
function ChartSurface({ heightPx, children }: { heightPx: number; children: ReactNode }) {
  return (
    <div
      className="w-full min-w-0 shrink-0 overflow-hidden"
      style={{ height: heightPx, minHeight: heightPx }}
    >
      {children}
    </div>
  );
}

function MetricMini({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${iconBg} shadow-inner`}>{icon}</div>
      </div>
    </div>
  );
}

export default Dashboard;
