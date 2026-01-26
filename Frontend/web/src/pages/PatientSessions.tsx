import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import therapistService from '../services/therapist.service';
import type { SessionType, PatientSessionFilter } from '../types/therapist';

const PatientSessions = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  
  const [sessions, setSessions] = useState<SessionType[]>([]);
  const [patientName, setPatientName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState<PatientSessionFilter>({
    include_past: true,
    include_upcoming: true,
    limit: 50,
    offset: 0,
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  useEffect(() => {
    if (patientId) {
      fetchPatientSessions();
    }
  }, [patientId, filters]);

  const fetchPatientSessions = async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching sessions for patient ID:', patientId);
      console.log('With filters:', filters);
      
      const response = await therapistService.getPatientSessions(patientId, filters);
      
      console.log('Patient sessions response:', response);
      console.log('Sessions count:', response.sessions?.length);
      
      // Ensure sessions is always an array
      const sessionsArray = Array.isArray(response.sessions) 
        ? response.sessions 
        : Array.isArray(response) 
        ? response 
        : [];
      
      setSessions(sessionsArray);
      setPatientName(response.patient_name || '');
    } catch (err: any) {
      console.error('Error fetching patient sessions:', err);
      setError(err.message || 'Failed to load sessions');
      setSessions([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    if (status === 'ALL') {
      setFilters({ ...filters, status: undefined });
    } else {
      setFilters({ 
        ...filters, 
        status: status as PatientSessionFilter['status']
      });
    }
  };

  const handleIncludePastChange = (include: boolean) => {
    setFilters({ ...filters, include_past: include });
  };

  const handleIncludeUpcomingChange = (include: boolean) => {
    setFilters({ ...filters, include_upcoming: include });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'UPCOMING':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'NO_SHOW':
        return 'bg-gray-100 text-gray-800';
      case 'RESCHEDULED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/patients')}
          className="text-blue-600 hover:text-blue-800 flex items-center mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Patients
        </button>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Sessions with {patientName || 'Patient'}
            </h1>
            <p className="text-gray-600 mt-1">
              View all therapy sessions for this patient
            </p>
          </div>
          <Link
            to={`/patients/${patientId}`}
            className="btn-secondary"
          >
            View Patient Details
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          <p className="font-medium">Error loading sessions</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No Show</option>
              <option value="RESCHEDULED">Rescheduled</option>
            </select>
          </div>

          {/* Include Past Sessions */}
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={filters.include_past}
                onChange={(e) => handleIncludePastChange(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Include Past Sessions
              </span>
            </label>
          </div>

          {/* Include Upcoming Sessions */}
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={filters.include_upcoming}
                onChange={(e) => handleIncludeUpcomingChange(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Include Upcoming Sessions
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Sessions ({sessions.length})
          </h2>
        </div>

        {sessions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No sessions match your current filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        Session #{session.id?.substring(0, 8)}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                          session.status
                        )}`}
                      >
                        {session.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Date:</span>{' '}
                        {formatDate(session.session_date)}
                      </div>
                      <div>
                        <span className="font-medium">Time:</span>{' '}
                        {formatTime(session.session_date)}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span>{' '}
                        {formatDuration(session.duration_minutes)}
                      </div>
                    </div>

                    {session.session_type && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Type:</span> {session.session_type}
                      </div>
                    )}

                    {session.location && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Location:</span>{' '}
                        <span className="text-gray-500">{session.location}</span>
                        {session.is_online && <span className="ml-2 text-blue-600">(Online)</span>}
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <Link
                      to={`/sessions/${session.id}/view`}
                      className="btn-primary text-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientSessions;
