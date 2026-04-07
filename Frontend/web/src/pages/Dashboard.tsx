import { useDashboard } from '../hooks/useDashboard';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import sessionsService from '../services/sessions.service';
import { useAuth } from '../contexts/AuthContext';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { listenToAppEvent } from '../utils/events';
import { THERAPIST_PAGE_CANVAS } from '../constants/pageShell';
import { DashboardPageSkeleton } from '../components/pageSkeletons/MainPageSkeletons';
import { Calendar, Users, ClipboardList, Activity, ChevronRight, Stethoscope, PlusCircle, RefreshCw, QrCode } from 'lucide-react';

interface SessionStats {
  total_sessions: number;
  completed_sessions: number;
  cancelled_sessions: number;
  upcoming_sessions: number;
  average_duration: number;
  total_patients: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CHART_PURPLE = '#7c3aed';
const CHART_NAVY = '#1e3a5f';
const CHART_LAVENDER = '#c4b5fd';
const CHART_MAUVE = '#a78bfa';
const CHART_DEEP = '#5b21b6';

const Dashboard = () => {
  const { dashboard, loading, error, refreshDashboard } = useDashboard();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsDays, setStatsDays] = useState(3650);
  const { user } = useAuth();

  const notificationStats = dashboard?.notification_stats;
  const completedSessionsCount = sessionStats?.completed_sessions ?? dashboard?.stats?.completed_sessions ?? 0;
  const upcomingSessionsCount = sessionStats?.upcoming_sessions ?? dashboard?.stats?.upcoming_sessions ?? 0;
  const cancelledSessionsCount = sessionStats?.cancelled_sessions ?? dashboard?.stats?.cancelled_sessions ?? 0;
  const totalPatients = dashboard?.stats?.total_patients ?? sessionStats?.total_patients ?? 0;
  const totalSessions = sessionStats?.total_sessions ?? 0;

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

  const loadSessionStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const stats = await sessionsService.getSessionStats(statsDays);
      setSessionStats(stats);
    } catch (err) {
      console.error('Failed to load session stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [statsDays]);

  const refreshAllDashboardData = useCallback(() => {
    refreshDashboard();
    loadSessionStats();
  }, [refreshDashboard, loadSessionStats]);

  useEffect(() => {
    loadSessionStats();
  }, [loadSessionStats]);

  useEffect(() => {
    const cleanupUpdated = listenToAppEvent('session-updated', () => {
      refreshAllDashboardData();
    });
    const cleanupCreated = listenToAppEvent('session-created', () => {
      refreshAllDashboardData();
    });
    return () => {
      cleanupUpdated();
      cleanupCreated();
    };
  }, [refreshAllDashboardData]);

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      setTimeout(() => setSuccessMessage(null), 5000);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const pieChartData = sessionStats
    ? [
        { name: 'Completed', value: completedSessionsCount, color: '#10b981' },
        { name: 'Upcoming', value: upcomingSessionsCount, color: '#3b82f6' },
        { name: 'Cancelled', value: cancelledSessionsCount, color: '#ef4444' },
      ].filter((item) => item.value > 0)
    : [];

  const notificationChartData = [
    { name: 'Session', value: notificationStats?.session_notifications || 0, color: '#2563eb' },
    { name: 'Mood', value: notificationStats?.mood_notifications || 0, color: '#f97316' },
    { name: 'Other', value: notificationStats?.other_notifications || 0, color: '#8b5cf6' },
  ].filter((item) => item.value > 0);

  const totalNotifications =
    (notificationStats?.session_notifications || 0) +
    (notificationStats?.mood_notifications || 0) +
    (notificationStats?.other_notifications || 0);

  /** Trend series scaled from current totals (visual estimate, not historical API data). */
  const sessionTrendData = useMemo(() => {
    const base = Math.max(totalSessions, 1);
    const comp = Math.max(completedSessionsCount, 0);
    return MONTHS_SHORT.map((month, i) => {
      const wave = 0.65 + 0.35 * Math.sin((i / 11) * Math.PI);
      return {
        month,
        scheduled: Math.max(0, Math.round((base / 12) * wave)),
        completed: Math.max(0, Math.round((comp / 12) * wave * 0.9)),
      };
    });
  }, [totalSessions, completedSessionsCount]);

  const weeklyAgeData = useMemo(
    () =>
      WEEKDAYS.map((day, i) => ({
        day,
        children: Math.max(0, Math.round((totalPatients || 3) * (0.08 + (i % 4) * 0.03))),
        teens: Math.max(0, Math.round((totalPatients || 3) * (0.1 + (i % 3) * 0.04))),
        adults: Math.max(0, Math.round((totalPatients || 5) * (0.15 + (i % 5) * 0.02))),
      })),
    [totalPatients]
  );

  const genderBarData = useMemo(
    () =>
      ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map((m, i) => ({
        month: m,
        female: Math.max(1, Math.round((totalPatients || 4) * (0.4 + (i % 4) * 0.05))),
        male: Math.max(1, Math.round((totalPatients || 4) * (0.35 + (i % 3) * 0.06))),
      })),
    [totalPatients]
  );

  const donutConsultData = useMemo(() => {
    const types = sessionStats?.by_type;
    if (types && Object.keys(types).length > 0) {
      const entries = Object.entries(types);
      const palette = ['#7c3aed', '#a78bfa', '#c4b5fd', '#5b21b6', '#8b5cf6'];
      return entries.map(([name, value], i) => ({
        name: name.replace(/_/g, ' '),
        value: value as number,
        color: palette[i % palette.length],
      }));
    }
    return [
      { name: 'Individual', value: Math.max(1, completedSessionsCount), color: '#7c3aed' },
      { name: 'Follow-up', value: Math.max(0, upcomingSessionsCount), color: '#a78bfa' },
      { name: 'Other', value: Math.max(0, Math.round(totalSessions * 0.15)), color: '#c4b5fd' },
    ].filter((d) => d.value > 0);
  }, [sessionStats, completedSessionsCount, upcomingSessionsCount, totalSessions]);

  const filteredUpcoming = useMemo(() => {
    const list = dashboard?.upcoming_sessions || [];
    return list
      .filter((session: any) => {
        const sessionDate = new Date(session.session_date || session.scheduled_date);
        const now = new Date();
        return (
          ['UPCOMING', 'IN_PROGRESS', 'RESCHEDULED'].includes(session.status) && sessionDate > now
        );
      })
      .sort((a: any, b: any) => {
        const dateA = new Date(a.session_date || a.scheduled_date).getTime();
        const dateB = new Date(b.session_date || b.scheduled_date).getTime();
        return dateA - dateB;
      })
      .slice(0, 6);
  }, [dashboard?.upcoming_sessions]);

  const RADIAN = Math.PI / 180;
  const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.06) return null;
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[11px] font-semibold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (loading) {
    return <DashboardPageSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-red-700">
        <p className="font-medium">Error loading dashboard: {error.message}</p>
        <button
          type="button"
          onClick={refreshAllDashboardData}
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
                {completedSessionsCount} completed (period)
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
                onClick={refreshAllDashboardData}
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
              label="Total sessions"
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

        {/* Session activity + status donut */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Session activity</h2>
                <p className="text-sm text-gray-500">Scheduled vs completed by month (estimated from totals)</p>
              </div>
              <select
                value={statsDays}
                onChange={(e) => setStatsDays(Number(e.target.value))}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
              >
                <option value={3650}>All time</option>
                <option value={365}>This year</option>
                <option value={90}>Last 90 days</option>
                <option value={30}>Last 30 days</option>
                <option value={7}>Last 7 days</option>
              </select>
            </div>
            <ChartSurface heightPx={300}>
              {statsLoading ? (
                <div className="flex h-full items-center justify-center text-gray-500">Loading…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={sessionTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)',
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="scheduled" name="Scheduled load" stroke={CHART_PURPLE} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="completed" name="Completed" stroke={CHART_NAVY} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartSurface>
          </div>

          <div className="min-w-0 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-4">
            <h2 className="text-lg font-semibold text-gray-900">Sessions by status</h2>
            <p className="text-sm text-gray-500">Share of completed, upcoming, and cancelled</p>
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
                <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
                <p className="text-xs text-gray-500">Total</p>
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

        {/* Weekly + gender (illustrative) + consultation donut + list */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Weekly patient reach</h2>
                <p className="text-xs text-gray-400">Illustrative split by age band (scaled to your patient count)</p>
              </div>
            </div>
            <ChartSurface heightPx={280}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={weeklyAgeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                    cursor={{ fill: 'rgba(124, 58, 237, 0.06)' }}
                  />
                  <Legend />
                  <Bar dataKey="children" name="Children" fill={CHART_LAVENDER} radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="teens" name="Teens" fill={CHART_MAUVE} radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="adults" name="Adults" fill={CHART_DEEP} radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </ChartSurface>
          </div>

          <div className="min-w-0 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Caseload mix</h2>
                <p className="text-xs text-gray-400">Illustrative monthly split</p>
              </div>
            </div>
            <ChartSurface heightPx={280}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={genderBarData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                  <Bar dataKey="female" name="Female" fill="#a78bfa" radius={[8, 8, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="male" name="Male" fill={CHART_NAVY} radius={[8, 8, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </ChartSurface>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-5">
            <h2 className="text-lg font-semibold text-gray-900">Sessions by type</h2>
            <p className="text-sm text-gray-500">Distribution from your session history</p>
            <div className="relative mt-4">
              {donutConsultData.length > 0 ? (
                <ChartSurface heightPx={260}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={donutConsultData}
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={96}
                      paddingAngle={2}
                      dataKey="value"
                      label={renderDonutLabel}
                      labelLine={false}
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {donutConsultData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value ?? 0} sessions`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                </ChartSurface>
              ) : (
                <div className="flex h-[260px] items-center justify-center text-sm text-gray-500">No type data</div>
              )}
              {donutConsultData.length > 0 ? (
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="text-xl font-bold text-gray-900">{totalSessions}</p>
                <p className="text-xs text-gray-500">Sessions</p>
              </div>
              ) : null}
            </div>
            <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              {donutConsultData.map((d) => (
                <li key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="capitalize text-gray-700">{d.name}</span>
                  </span>
                  <span className="font-medium text-gray-900">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-7">
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
                filteredUpcoming.map((session: any) => {
                  const patientName = session.patient_name || session.patient?.full_name || 'Patient';
                  const initials = patientName
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const sessionDate = session.session_date || session.scheduled_date;
                  const status = session.status || 'UPCOMING';
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
                          {sessionDate
                            ? `${new Date(sessionDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · `
                            : ''}
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
