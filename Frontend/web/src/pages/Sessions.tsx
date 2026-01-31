// src/pages/Sessions.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTherapistSessions } from '../hooks/useTherapist';
import therapistService from '../services/therapist.service';
import type { SessionFilter } from '../types/therapist';

const Sessions = () => {
  const [activeFilter, setActiveFilter] = useState<SessionFilter>({});
  const { sessions, loading, error, updateFilter, clearError } = useTherapistSessions(activeFilter);
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

      const result = await therapistService.bulkUpdateSessions(data);
      
      // Workaround: After rescheduling, update status back to UPCOMING
      // Backend sets status to RESCHEDULED which hides sessions from upcoming list
      if (bulkAction === 'reschedule' && result.updated_sessions > 0) {
        console.log('Updating rescheduled sessions status back to UPCOMING...');
        for (const sessionId of selectedSessions) {
          try {
            await therapistService.updateSession(sessionId, { status: 'UPCOMING' });
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
        <div className="flex space-x-3">
          {selectedSessions.length > 0 && (
            <>
              <button
                onClick={() => handleBulkAction('cancel')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel ({selectedSessions.length})
              </button>
              <button
                onClick={() => handleBulkAction('reschedule')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Reschedule ({selectedSessions.length})
              </button>
              <button
                onClick={() => handleBulkAction('update')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Update ({selectedSessions.length})
              </button>
            </>
          )}
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

        <div className="mt-4">
          <button
            onClick={() => {
              setActiveFilter({});
              updateFilter({}, true); // Pass reset=true to fully clear filter
            }}
            className="btn-secondary text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Sessions List */}
      <div className="card">
        {displaySessions.length > 0 && (
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              checked={selectedSessions.length === displaySessions.length && displaySessions.length > 0}
              onChange={toggleSelectAll}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              Select All ({displaySessions.length} sessions)
            </label>
          </div>
        )}
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-500">Loading sessions...</span>
            </div>
          ) : displaySessions.length > 0 ? (
            displaySessions.map((session) => (
              <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedSessions.includes(session.id)}
                      onChange={() => toggleSessionSelection(session.id)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {session.patient_name || (session as any).patient?.full_name || 'Unknown Patient'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {new Date((session as any).scheduled_date || session.session_date).toLocaleDateString()} • {session.session_type}
                          </p>
                          <p className="text-sm text-gray-500">
                            {session.duration_minutes} minutes • {session.location}
                            {session.is_online && ' (Online)'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                    <Link
                      to={`/sessions/${session.id}`}
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No sessions found
              </h3>
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
                    className={`px-4 py-2 text-white rounded-lg ${
                      bulkAction === 'cancel' 
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