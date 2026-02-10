// src/pages/Sessions.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSessions } from '../hooks/useSessions';
import sessionsService from '../services/sessions.service';
import type { SessionFilter } from '../types/session';

const Sessions = () => {
  const [activeFilter, setActiveFilter] = useState<SessionFilter>({});
  const { sessions, loading, error, updateFilter, clearError } = useSessions(activeFilter);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'cancel' | 'reschedule' | 'update' | ''>('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkReason, setBulkReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newSessionType, setNewSessionType] = useState('');
  const [bulkResult, setBulkResult] = useState<any>(null);

  // Sort sessions in ascending order by scheduled/session date
  const displaySessions = [...sessions].sort((a, b) => {
    const dateA = new Date((a as any).scheduled_date || a.session_date).getTime();
    const dateB = new Date((b as any).scheduled_date || b.session_date).getTime();
    return dateA - dateB;
  });

  const handleFilterChange = (newFilter: SessionFilter) => {
    setActiveFilter(newFilter);
    updateFilter(newFilter);
  };

  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessions(prev =>
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSessions.length === displaySessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(displaySessions.map(s => s.id));
    }
  };

  const handleBulkAction = (action: 'cancel' | 'reschedule' | 'update') => {
    if (selectedSessions.length === 0) {
      alert('Please select at least one session');
      return;
    }
    setBulkAction(action);
    setShowBulkModal(true);
  };

  const executeBulkAction = async () => {
    if (!bulkAction) return;

    setBulkLoading(true);
    setBulkResult(null);

    try {
      // For 'update' action, determine the specific backend action based on filled fields
      let actualAction: string = bulkAction;

      if (bulkAction === 'update') {
        // Priority: location > type > duration (if multiple fields filled, use first one)
        if (newLocation) {
          actualAction = 'update_location';
        } else if (newSessionType) {
          actualAction = 'update_type';
        } else if (newDuration) {
          actualAction = 'update_duration';
        } else {
          setBulkResult({ error: 'Please fill in at least one field to update' });
          setBulkLoading(false);
          return;
        }
      }

      const data: any = {
        session_ids: selectedSessions,
        action: actualAction,
        reason: bulkReason
      };

      if (bulkAction === 'reschedule' && newDate) {
        // datetime-local gives "YYYY-MM-DDTHH:mm" format
        // Append seconds and send as-is to preserve the exact time user selected
        data.new_date = newDate + ':00';
      }

      if (bulkAction === 'update') {
        if (newLocation) data.new_location = newLocation;
        if (newDuration) data.new_duration = parseInt(newDuration);
        if (newSessionType) data.new_session_type = newSessionType;
      }

      const result = await sessionsService.bulkUpdateSessions(data);

      // Workaround: After rescheduling, update status back to UPCOMING
      // Backend sets status to RESCHEDULED which hides sessions from upcoming list
      if (bulkAction === 'reschedule' && result.updated_sessions > 0) {
        console.log('Updating rescheduled sessions status back to UPCOMING...');
        for (const sessionId of selectedSessions) {
          try {
            await sessionsService.updateSession(sessionId, { status: 'UPCOMING' });
          } catch (err) {
            console.warn(`Failed to update status for session ${sessionId}:`, err);
          }
        }
      }

      setBulkResult(result);
      setSelectedSessions([]);
      setBulkReason('');
      setNewDate('');
      setNewLocation('');
      setNewDuration('');
      setNewSessionType('');

      // Refresh sessions list
      updateFilter(activeFilter);

      setTimeout(() => {
        setShowBulkModal(false);
        setBulkResult(null);
      }, 3000);
    } catch (err) {
      console.error('Bulk update failed:', err);
      setBulkResult({ error: 'Failed to update sessions' });
    } finally {
      setBulkLoading(false);
    }
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

  if (loading && displaySessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="sessions-page bg-gradient-to-br from-gray-50 to-purple-50 min-h-screen -mt-6 -mx-8 px-8 pt-6">
      {/* Purple Gradient Header with Image */}
      <div className="relative w-full h-56 bg-gradient-to-r from-purple-700 via-purple-600 to-pink-600 rounded-2xl shadow-xl overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-pink-900/30"></div>
        <div className="absolute inset-0 backdrop-blur-[2px]">
          <div className="absolute inset-0 bg-[url('/images/heroo.png')] bg-cover bg-center opacity-20"></div>
        </div>

        {/* Header Content */}
        <div className="relative h-full flex items-center justify-between px-8">
          <div className="text-white">
            <h1 className="text-4xl font-bold mb-2 drop-shadow-lg">Therapy Sessions</h1>
            <p className="text-lg text-purple-100 drop-shadow-md">Manage and organize all your therapy appointments</p>
          </div>

          {/* Action Buttons on Header */}
          <div className="flex space-x-3">
            {selectedSessions.length > 0 ? (
              <>
                <button
                  onClick={() => handleBulkAction('cancel')}
                  className="bg-red-600/90 backdrop-blur-sm hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Cancel ({selectedSessions.length})</span>
                </button>
                <button
                  onClick={() => handleBulkAction('reschedule')}
                  className="bg-yellow-600/90 backdrop-blur-sm hover:bg-yellow-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Reschedule ({selectedSessions.length})</span>
                </button>
                <button
                  onClick={() => handleBulkAction('update')}
                  className="bg-blue-600/90 backdrop-blur-sm hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Update ({selectedSessions.length})</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/sessions/calendar"
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Calendar View</span>
                </Link>
                <Link
                  to="/sessions/new"
                  className="bg-white/90 backdrop-blur-sm hover:bg-white text-purple-700 px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl"
                >
                  + New Session
                </Link>
              </>
            )}
          </div>
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

      {/* Enhanced Filters Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Filter Sessions</h2>
          </div>
          {Object.keys(activeFilter).length > 0 && (
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
              {Object.keys(activeFilter).length} filter{Object.keys(activeFilter).length > 1 ? 's' : ''} active
            </span>
          )}
        </div>
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
              <option value="UPCOMING">Upcoming</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="RESCHEDULED">Rescheduled</option>
              <option value="NO_SHOW">No Show</option>
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

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              setActiveFilter({});
              updateFilter({}, true); // Pass reset=true to fully clear filter
            }}
            className="flex items-center space-x-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Clear All Filters</span>
          </button>
        </div>
      </div>

      {/* Enhanced Sessions List */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              All Sessions
              <span className="ml-3 text-sm font-normal text-gray-500">({displaySessions.length} total)</span>
            </h2>
          </div>
          {displaySessions.length > 0 && (
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedSessions.length === displaySessions.length && displaySessions.length > 0}
                  onChange={toggleSelectAll}
                  className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded transition-all"
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-purple-600 transition-colors">
                  Select All
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-500">Loading sessions...</span>
            </div>
          ) : displaySessions.length > 0 ? (
            displaySessions.map((session) => (
              <div key={session.id} className="group relative border-2 border-gray-200 hover:border-purple-300 rounded-xl p-5 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/50 transition-all duration-200 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedSessions.includes(session.id)}
                      onChange={() => toggleSessionSelection(session.id)}
                      className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded transition-all"
                    />
                    <div className="flex-1">
                      <div className="flex items-start space-x-4">
                        {/* Session Icon */}
                        <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                            {session.patient_name || (session as any).patient?.full_name || 'Unknown Patient'}
                          </h3>
                          <div className="flex items-center space-x-3 mt-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-1.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="font-medium">{new Date((session as any).scheduled_date || session.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <span className="text-gray-300">•</span>
                            <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold uppercase">
                              {session.session_type}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3 mt-2 text-sm text-gray-500">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{session.duration_minutes} min</span>
                            </div>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{session.location}</span>
                              {session.is_online && <span className="ml-1 text-green-600 font-medium">(Online)</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-4 py-1.5 text-xs font-bold rounded-full shadow-sm ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                    <Link
                      to={`/sessions/${session.id}`}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center space-x-2"
                    >
                      <span>View Details</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-dashed border-purple-200">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No sessions found
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {Object.keys(activeFilter).length > 0
                  ? 'Try adjusting your filters or create a new session.'
                  : 'Get started by creating your first therapy session.'
                }
              </p>
              <div className="flex justify-center space-x-3">
                {Object.keys(activeFilter).length > 0 && (
                  <button
                    onClick={() => {
                      setActiveFilter({});
                      updateFilter({}, true);
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                  >
                    Clear Filters
                  </button>
                )}
                <Link
                  to="/sessions/new"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-md hover:shadow-lg inline-flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create New Session</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Action Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {bulkAction === 'cancel' ? 'Cancel Sessions' : bulkAction === 'reschedule' ? 'Reschedule Sessions' : 'Update Sessions'}
            </h3>

            {bulkResult ? (
              <div className={`p-4 rounded-lg ${bulkResult.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                {bulkResult.error ? (
                  <p>{bulkResult.error}</p>
                ) : (
                  <div>
                    <p className="font-medium">✓ Success!</p>
                    <p className="text-sm mt-1">
                      {bulkResult.detail || `Updated: ${bulkResult.updated_sessions} session(s)`}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  You are about to {bulkAction === 'update' ? 'update' : bulkAction} {selectedSessions.length} session(s).
                  {bulkAction === 'update' && <span className="block mt-1 text-xs text-gray-500">Fill in at least one field below to apply changes.</span>}
                </p>

                {bulkAction === 'reschedule' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}

                {bulkAction === 'update' && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Location (optional)
                      </label>
                      <input
                        type="text"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="e.g., home, office, clinic"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Duration (minutes, optional)
                      </label>
                      <input
                        type="number"
                        value={newDuration}
                        onChange={(e) => setNewDuration(e.target.value)}
                        placeholder="e.g., 60"
                        min="15"
                        step="15"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Session Type (optional)
                      </label>
                      <select
                        value={newSessionType}
                        onChange={(e) => setNewSessionType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Keep current type</option>
                        <option value="individual">Individual</option>
                        <option value="group">Group</option>
                        <option value="family">Family</option>
                        <option value="couples">Couples</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason (optional)
                  </label>
                  <textarea
                    value={bulkReason}
                    onChange={(e) => setBulkReason(e.target.value)}
                    rows={3}
                    placeholder="Enter reason for this action..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowBulkModal(false);
                      setBulkAction('');
                      setBulkReason('');
                      setNewDate('');
                      setNewLocation('');
                      setNewDuration('');
                      setNewSessionType('');
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    disabled={bulkLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeBulkAction}
                    disabled={
                      bulkLoading ||
                      (bulkAction === 'reschedule' && !newDate) ||
                      (bulkAction === 'update' && !newLocation && !newDuration && !newSessionType)
                    }
                    className={`px-4 py-2 text-white rounded-lg ${bulkAction === 'cancel'
                      ? 'bg-red-600 hover:bg-red-700'
                      : bulkAction === 'reschedule'
                        ? 'bg-yellow-600 hover:bg-yellow-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {bulkLoading ? 'Processing...' : `Confirm ${bulkAction === 'cancel' ? 'Cancellation' : bulkAction === 'reschedule' ? 'Reschedule' : 'Update'}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sessions;