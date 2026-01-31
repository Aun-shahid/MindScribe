// src/pages/Dashboard.tsx
import { useTherapistDashboard } from '../hooks/useTherapist';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import therapistService from '../services/therapist.service';

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

const Dashboard = () => {
  const { dashboard, loading, error, refreshDashboard } = useTherapistDashboard();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsDays, setStatsDays] = useState(30);

  // Load session statistics
  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const stats = await therapistService.getSessionStats(statsDays);
        setSessionStats(stats);
      } catch (err) {
        console.error('Failed to load session stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, [statsDays]);

  // Check for success message from navigation
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
      // Clear the location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>Error loading dashboard: {error.message}</p>
        <button 
          onClick={refreshDashboard}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={refreshDashboard}
          className="btn-secondary text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <p className="text-2xl font-bold text-gray-900">{dashboard?.stats?.total_patients || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Upcoming Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{dashboard?.stats?.upcoming_sessions || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{dashboard?.stats?.completed_sessions || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Cancelled Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{dashboard?.stats?.cancelled_sessions || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Upcoming Sessions</h2>
          <Link to="/sessions" className="text-blue-600 hover:text-blue-500 text-sm font-medium">
            View all sessions
          </Link>
        </div>
        
        {dashboard?.upcoming_sessions && dashboard.upcoming_sessions.length > 0 ? (
          <div className="space-y-3">
            {dashboard.upcoming_sessions
              .filter((session: any) => {
                const sessionDate = new Date(session.session_date || session.scheduled_date);
                const now = new Date();
                // Show if status is UPCOMING, IN_PROGRESS, or RESCHEDULED and date is in the future
                return (
                  ["UPCOMING", "IN_PROGRESS", "RESCHEDULED"].includes(session.status) &&
                  sessionDate > now
                );
              })
              .sort((a: any, b: any) => {
                // Sort by soonest date
                const dateA = new Date(a.session_date || a.scheduled_date).getTime();
                const dateB = new Date(b.session_date || b.scheduled_date).getTime();
                return dateA - dateB;
              })
              .slice(0, 5)
              .map((session: any) => {
                const sessionDate = session.session_date || session.scheduled_date;
                const formattedDate = sessionDate 
                  ? new Date(sessionDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Date not set';
                const patientName = session.patient_name || session.patient?.full_name || 'Unknown Patient';
                return (
                  <Link
                    key={session.id}
                    to={`/sessions/${session.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{patientName}</p>
                        <p className="text-xs text-gray-500">
                          {formattedDate} - {session.session_type}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full uppercase ${
                      session.status === 'COMPLETED' 
                        ? 'bg-green-100 text-green-800' 
                        : session.status === 'IN_PROGRESS'
                        ? 'bg-yellow-100 text-yellow-800'
                        : session.status === 'UPCOMING'
                        ? 'bg-blue-100 text-blue-800'
                        : session.status === 'RESCHEDULED'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {session.status}
                    </span>
                  </Link>
                );
              })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No upcoming sessions</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/sessions/new"
            className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-blue-900">New Session</p>
              <p className="text-sm text-blue-600">Start a therapy session</p>
            </div>
          </Link>

          <Link
            to="/patients"
            className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-green-900">Manage Patients</p>
              <p className="text-sm text-green-600">View and edit patients</p>
            </div>
          </Link>

          <Link
            to="/qr-code"
            className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-purple-900">QR Code</p>
              <p className="text-sm text-purple-600">Patient connection</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Session Statistics */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">📊 Session Statistics</h2>
          <select
            value={statsDays}
            onChange={(e) => setStatsDays(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>

        {statsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-500">Loading statistics...</span>
          </div>
        ) : sessionStats ? (
          <div className="space-y-6">
            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{sessionStats.total_sessions || 0}</p>
                <p className="text-sm text-blue-600">Total Sessions</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{sessionStats.completed_sessions || 0}</p>
                <p className="text-sm text-green-600">Completed</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-700">{sessionStats.upcoming_sessions || 0}</p>
                <p className="text-sm text-yellow-600">Upcoming</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-700">{sessionStats.average_duration || 0}</p>
                <p className="text-sm text-purple-600">Avg. Duration (min)</p>
              </div>
            </div>

            {/* Breakdown by Type */}
            {sessionStats.by_type && Object.keys(sessionStats.by_type).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Sessions by Type</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(sessionStats.by_type).map(([type, count]) => (
                    <span
                      key={type}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {type}: <strong>{count}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Breakdown by Status */}
            {sessionStats.by_status && Object.keys(sessionStats.by_status).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Sessions by Status</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(sessionStats.by_status).map(([status, count]) => {
                    const colors: Record<string, string> = {
                      'COMPLETED': 'bg-green-100 text-green-700',
                      'SCHEDULED': 'bg-blue-100 text-blue-700',
                      'IN_PROGRESS': 'bg-yellow-100 text-yellow-700',
                      'CANCELLED': 'bg-red-100 text-red-700',
                    };
                    return (
                      <span
                        key={status}
                        className={`px-3 py-1.5 rounded-full text-sm ${colors[status] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {status}: <strong>{count}</strong>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">No statistics available</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;