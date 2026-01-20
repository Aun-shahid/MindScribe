// src/pages/Sessions.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTherapistSessions } from '../hooks/useTherapist';
import type { SessionFilter } from '../types/therapist';

const Sessions = () => {
  const [activeFilter, setActiveFilter] = useState<SessionFilter>({});
  const { sessions, loading, error, updateFilter, clearError } = useTherapistSessions(activeFilter);

  const handleFilterChange = (newFilter: SessionFilter) => {
    setActiveFilter(newFilter);
    updateFilter(newFilter);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
        <div className="flex space-x-3">
          <Link
            to="/sessions/calendar"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center"
          >
            📅 Calendar View
          </Link>
          <Link
            to="/sessions/new"
            className="btn-primary"
          >
            New Session
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error loading sessions: {error.message}</p>
          <button 
            onClick={clearError}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="status" className="form-label">
              Status
            </label>
            <select
              id="status"
              className="form-input"
              value={activeFilter.status || ''}
              onChange={(e) => handleFilterChange({ 
                ...activeFilter, 
                status: e.target.value ? e.target.value as any : undefined 
              })}
            >
              <option value="">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label htmlFor="session_type" className="form-label">
              Session Type
            </label>
            <select
              id="session_type"
              className="form-input"
              value={activeFilter.session_type || ''}
              onChange={(e) => handleFilterChange({ ...activeFilter, session_type: e.target.value || undefined })}
            >
              <option value="">All Types</option>
              <option value="individual">Individual</option>
              <option value="group">Group</option>
              <option value="family">Family</option>
              <option value="couples">Couples</option>
            </select>
          </div>

          <div>
            <label htmlFor="date" className="form-label">
              Date
            </label>
            <input
              id="date"
              type="date"
              className="form-input"
              value={activeFilter.date || ''}
              onChange={(e) => handleFilterChange({ ...activeFilter, date: e.target.value || undefined })}
            />
          </div>

          <div>
            <label htmlFor="patient_id" className="form-label">
              Patient ID
            </label>
            <input
              id="patient_id"
              type="text"
              placeholder="Enter patient ID"
              className="form-input"
              value={activeFilter.patient_id || ''}
              onChange={(e) => handleFilterChange({ ...activeFilter, patient_id: e.target.value || undefined })}
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => {
              setActiveFilter({});
              updateFilter({});
            }}
            className="btn-secondary text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Sessions List */}
      <div className="card">
        <div className="space-y-4">
          {sessions.length > 0 ? (
            sessions.map((session) => (
              <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {session.patient_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(session.session_date).toLocaleDateString()} • {session.session_type}
                        </p>
                        <p className="text-sm text-gray-500">
                          {session.duration_minutes} minutes • {session.location}
                          {session.is_online && ' (Online)'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                    <Link
                      to={`/sessions/${session.id}/view`}
                      className="btn-primary text-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {Object.keys(activeFilter).length > 0 
                  ? 'Try adjusting your filters or create a new session.'
                  : 'Get started by creating your first session.'
                }
              </p>
              <div className="mt-6">
                <Link
                  to="/sessions/new"
                  className="btn-primary"
                >
                  Create New Session
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sessions;