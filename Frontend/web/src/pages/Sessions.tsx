// src/pages/Sessions.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelRight, UserRound } from 'lucide-react';
import { THERAPIST_PAGE_SHELL } from '../constants/pageShell';
import { SessionsListSkeleton } from '../components/pageSkeletons/MainPageSkeletons';
import { TherapistPageBanner, TherapistPageSimpleHero } from '../components/TherapistPageBanner';
import { useSessions } from '../hooks/useSessions';
import sessionsService from '../services/sessions.service';
import { emitAppEvent } from '../utils/events';
import type { SessionFilter } from '../types/session';

const Sessions = () => {
  const [activeFilter, setActiveFilter] = useState<SessionFilter>({});
  const {
    sessions,
    loading,
    pagination,
    page,
    totalPages,
    goToPage,
    error,
    updateFilter,
    clearError,
  } = useSessions(activeFilter);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'cancel' | 'reschedule' | 'update' | ''>('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkReason, setBulkReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [bulkResult, setBulkResult] = useState<any>(null);

  // API returns newest first (scheduled_date desc, then created_at desc)
  const displaySessions = sessions;

  const showItemRange = displaySessions.length > 0 && pagination.total_count > 0;
  const rangeStart = showItemRange ? pagination.offset + 1 : 0;
  const rangeEnd = showItemRange ? pagination.offset + displaySessions.length : 0;

  const handlePageChange = (nextPage: number) => {
    goToPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        // Priority: location > duration (if multiple fields filled, use first one)
        if (newLocation) {
          actualAction = 'update_location';
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
      }

      const result = await sessionsService.bulkUpdateSessions(data);

      setBulkResult(result);
      emitAppEvent('session-updated', {
        action: actualAction,
        updatedSessions: result?.updated_sessions ?? selectedSessions.length,
      });
      setSelectedSessions([]);
      setBulkReason('');
      setNewDate('');
      setNewLocation('');
      setNewDuration('');

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

  return (
    <div className={`sessions-page ${THERAPIST_PAGE_SHELL}`}>
      <div className="mb-6">
        <TherapistPageBanner heightClassName="min-h-[10.5rem] sm:h-40">
          <TherapistPageSimpleHero
            title="Therapy Sessions"
            subtitle="Manage and organize your therapy appointments"
            actions={
              selectedSessions.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleBulkAction('cancel')}
                    className="flex min-w-[140px] flex-1 items-center justify-center space-x-2 rounded-md bg-red-600/90 px-4 py-2 text-sm font-semibold text-white shadow-md backdrop-blur-sm transition-all hover:bg-red-700 hover:shadow-lg sm:flex-none"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Cancel ({selectedSessions.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkAction('reschedule')}
                    className="flex min-w-[140px] flex-1 items-center justify-center space-x-2 rounded-md bg-yellow-600/90 px-4 py-2 text-sm font-semibold text-white shadow-md backdrop-blur-sm transition-all hover:bg-yellow-700 hover:shadow-lg sm:flex-none"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Reschedule ({selectedSessions.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkAction('update')}
                    className="flex min-w-[140px] flex-1 items-center justify-center space-x-2 rounded-md bg-blue-600/90 px-4 py-2 text-sm font-semibold text-white shadow-md backdrop-blur-sm transition-all hover:bg-blue-700 hover:shadow-lg sm:flex-none"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Update ({selectedSessions.length})</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-col space-y-3 w-full sm:w-auto">
  <Link
    to="/sessions/calendar"
    className="inline-flex min-w-[170px] items-center justify-center space-x-2 rounded-md bg-white/20 px-6 py-3 text-base font-semibold text-white shadow-md backdrop-blur-sm transition-all hover:bg-white/30 hover:shadow-lg"
  >
    <svg className="h-6 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
    <span>Calendar View</span>
  </Link>

  <Link
    to="/sessions/new"
    className="inline-flex min-w-[170px] items-center justify-center rounded-md bg-white/90 px-6 py-3 text-base font-semibold text-purple-700 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:shadow-lg"
  >
    + New Session
  </Link>
</div>
                </>
              )
            }
          />
        </TherapistPageBanner>
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
      <div className="bg-white rounded-xl shadow-md p-4 border border-purple-100">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-1.5 rounded-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Filter Sessions</h2>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {Object.keys(activeFilter).length > 0 && (
              <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                {Object.keys(activeFilter).length} active
              </span>
            )}
            <button
              onClick={() => {
                setActiveFilter({});
                updateFilter({}, true); // Pass reset=true to fully clear filter
              }}
              className="flex items-center space-x-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Clear Filters</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label htmlFor="status" className="form-label text-xs">
              Status
            </label>
            <select
              id="status"
              className="form-input text-sm py-2"
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
            <label htmlFor="date" className="form-label text-xs">
              Date
            </label>
            <input
              id="date"
              type="date"
              className="form-input text-sm py-2"
              value={activeFilter.date || ''}
              onChange={(e) => handleFilterChange({ ...activeFilter, date: e.target.value || undefined })}
            />
          </div>

          <div>
            <label htmlFor="patient_name" className="form-label text-xs">
              Patient name
            </label>
            <input
              id="patient_name"
              type="search"
              placeholder="Search by first or last name"
              className="form-input text-sm py-2"
              value={activeFilter.patient_name || ''}
              onChange={(e) =>
                handleFilterChange({ ...activeFilter, patient_name: e.target.value || undefined })
              }
            />
          </div>
        </div>
      </div>

      {/* Enhanced Sessions List */}
      <div className="bg-white rounded-xl shadow-md p-4 border border-purple-100 mt-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-1.5 rounded-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              All Sessions
              <span className="ml-2 text-xs font-normal text-gray-500">
                ({pagination.total_count} total{pagination.total_count > 0 ? ' · newest first' : ''})
              </span>
            </h2>
          </div>
          {displaySessions.length > 0 && (
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedSessions.length === displaySessions.length && displaySessions.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded transition-all"
                />
                <span className="text-xs font-medium text-gray-700 group-hover:text-purple-600 transition-colors">
                  Select All
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="space-y-3 relative">
          {loading && displaySessions.length > 0 && (
            <div
              className="flex items-center gap-2 text-sm text-purple-700 py-2 px-1 rounded-lg bg-purple-50/90 border border-purple-100"
              role="status"
              aria-live="polite"
            >
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent shrink-0" />
              <span>Updating results…</span>
            </div>
          )}
          {loading && displaySessions.length === 0 ? (
            <SessionsListSkeleton rows={6} />
          ) : displaySessions.length > 0 ? (
            <>
            <div
              className={loading ? 'opacity-60 pointer-events-none transition-opacity' : ''}
              aria-busy={loading}
            >
            {displaySessions.map((session) => (
              <div key={session.id} className="group relative border border-gray-200 hover:border-purple-300 rounded-lg p-3.5 hover:bg-gradient-to-r hover:from-purple-50/40 hover:to-pink-50/40 transition-all duration-200 hover:shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedSessions.includes(session.id)}
                      onChange={() => toggleSessionSelection(session.id)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded transition-all"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start space-x-3">
                        {/* Session Icon */}
                        <div className="rounded-lg border border-purple-200/55 bg-white/50 p-2 shadow-sm backdrop-blur-sm ring-1 ring-white/40 transition-shadow group-hover:border-purple-300/60 group-hover:bg-white/65">
                          <UserRound className="h-4 w-4 text-purple-700" strokeWidth={2} aria-hidden />
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-700 transition-colors break-words">
                            {session.patient_name || (session as any).patient?.full_name || 'Unknown Patient'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <div className="flex items-center text-xs text-gray-600">
                              <svg className="w-4 h-4 mr-1.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="font-medium">{new Date((session as any).scheduled_date || session.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <span className="text-gray-300">•</span>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[11px] font-semibold uppercase">
                              {session.session_type}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-500">
                            <div className="flex items-center">
                              <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{session.duration_minutes} min</span>
                            </div>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center">
                              <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="break-all">{session.location}</span>
                              {session.is_online && <span className="ml-1 text-green-600 font-medium">(Online)</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full lg:w-auto items-center justify-between sm:justify-end gap-2.5 pl-7 sm:pl-0">
                    <span className={`px-3 py-1 text-[11px] font-semibold rounded-full shadow-sm whitespace-nowrap ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                    
                    <Link
                      to={`/sessions/${session.id}?tab=overview`}
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-purple-300/45 bg-white/50 px-4 py-2 text-sm font-semibold text-purple-900 shadow-sm backdrop-blur-md ring-1 ring-white/50 transition-all hover:border-purple-400/55 hover:bg-white/75 hover:shadow-md"
                    >
                      <span>View Details</span>
                      <PanelRight className="h-4 w-4 shrink-0 text-purple-800/90" strokeWidth={2} aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            </div>
            {pagination.total_count > 0 && (
              <div
                className={`flex flex-col sm:flex-row sm:items-center gap-3 pt-4 mt-1 border-t border-gray-100 ${
                  showItemRange && totalPages > 1 ? 'sm:justify-between' : 'justify-center'
                }`}
              >
                {showItemRange && (
                  <p className="text-sm text-gray-600">
                    Showing{' '}
                    <span className="font-medium text-gray-900">
                      {rangeStart}–{rangeEnd}
                    </span>{' '}
                    of <span className="font-medium text-gray-900">{pagination.total_count}</span>
                  </p>
                )}
                {totalPages > 1 && (
                  <nav
                    className="flex flex-wrap items-center justify-center gap-2"
                    aria-label="Session list pagination"
                  >
                    <button
                      type="button"
                      onClick={() => handlePageChange(1)}
                      disabled={page <= 1 || loading}
                      className="px-3 py-1.5 rounded-md text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      First
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1 || loading}
                      className="px-3 py-1.5 rounded-md text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-2 text-sm text-gray-600 tabular-nums">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages || loading}
                      className="px-3 py-1.5 rounded-md text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={page >= totalPages || loading}
                      className="px-3 py-1.5 rounded-md text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Last
                    </button>
                  </nav>
                )}
              </div>
            )}
            </>
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
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
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

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowBulkModal(false);
                      setBulkAction('');
                      setBulkReason('');
                      setNewDate('');
                      setNewLocation('');
                      setNewDuration('');
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 w-full sm:w-auto"
                    disabled={bulkLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeBulkAction}
                    disabled={
                      bulkLoading ||
                      (bulkAction === 'reschedule' && !newDate) ||
                      (bulkAction === 'update' && !newLocation && !newDuration)
                    }
                    className={`px-4 py-2 text-white rounded-lg w-full sm:w-auto ${bulkAction === 'cancel'
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