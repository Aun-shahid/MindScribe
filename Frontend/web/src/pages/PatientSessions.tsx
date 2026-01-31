// src/pages/PatientSessions.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, MapPin, Video, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import therapistService from '../services/therapist.service';
import type { SessionType } from '../types/therapist';

const PatientSessions = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string>('');

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [includePast] = useState(true);
  const [includeUpcoming] = useState(true);

  useEffect(() => {
    fetchPatientSessions();
  }, [patientId, statusFilter, includePast, includeUpcoming]);

  const fetchPatientSessions = async () => {
    if (!patientId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await therapistService.getPatientSessions(patientId, {
        include_past: includePast,
        include_upcoming: includeUpcoming,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      
      console.log('[PatientSessions] API Response:', response);
      console.log('[PatientSessions] Response type:', typeof response);
      console.log('[PatientSessions] Is array:', Array.isArray(response));
      
      // Ensure response is an array
      let sessionsArray = Array.isArray(response) ? response : [];
      
      // Remove duplicates based on session ID
      const uniqueSessions = sessionsArray.reduce((acc: SessionType[], current: SessionType) => {
        const exists = acc.find(session => session.id === current.id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);
      
      console.log('[PatientSessions] Total sessions:', sessionsArray.length);
      console.log('[PatientSessions] Unique sessions:', uniqueSessions.length);
      setSessions(uniqueSessions);
      
      // Get patient name from first session
      if (sessionsArray.length > 0 && sessionsArray[0].patient_name) {
        setPatientName(sessionsArray[0].patient_name);
      }
    } catch (err: any) {
      console.error('[PatientSessions] Error fetching sessions:', err);
      setError(err.message || 'Failed to load patient sessions');
      setSessions([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      COMPLETED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Completed' },
      UPCOMING: { color: 'bg-blue-100 text-blue-800', icon: Calendar, label: 'Upcoming' },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, label: 'In Progress' },
      CANCELLED: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
      NO_SHOW: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'No Show' },
    };

    const config = statusConfig[status] || statusConfig.UPCOMING;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon size={16} className="mr-1" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'Date not set';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString: string | undefined | null) => {
    if (!dateString) return 'Time not set';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid time';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/patients')}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Back to Patients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/patients')}
                className="mr-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Patient Sessions</h1>
                {patientName && <p className="text-purple-200 mt-1">{patientName}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="ALL">All Statuses</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NO_SHOW">No Show</option>
              </select>
            </div>

            <div className="flex items-center space-x-4 md:col-span-2">
              {/* <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includePast}
                  onChange={(e) => setIncludePast(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Include Past Sessions</span>
              </label> */}

              {/* <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeUpcoming}
                  onChange={(e) => setIncludeUpcoming(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Include Upcoming Sessions</span>
              </label> */}
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Sessions ({sessions.length})
            </h2>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 text-lg">No sessions found</p>
              <p className="text-gray-500 text-sm mt-2">
                Try adjusting your filters or schedule a new session for this patient
              </p>
              <div className="mt-6">
                <Link
                  to={`/sessions/new?patientId=${patientId}`}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Schedule New Session
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {Array.isArray(sessions) && sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Session #{(session as any).session_number || 'N/A'}
                        </h3>
                        {getStatusBadge(session.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar size={16} className="mr-2 text-gray-400" />
                          {formatDate(session.session_date || (session as any).scheduled_date || (session as any).start_time)}
                        </div>

                        <div className="flex items-center">
                          <Clock size={16} className="mr-2 text-gray-400" />
                          {formatTime(session.session_date || (session as any).scheduled_date || (session as any).start_time)} 
                          {session.duration_minutes && ` (${session.duration_minutes} min)`}
                        </div>

                        <div className="flex items-center">
                          {session.is_online ? (
                            <>
                              <Video size={16} className="mr-2 text-gray-400" />
                              Online Session
                            </>
                          ) : (
                            <>
                              <MapPin size={16} className="mr-2 text-gray-400" />
                              {session.location || 'In-person'}
                            </>
                          )}
                        </div>

                        <div className="flex items-center">
                          <span className="text-gray-500">
                            Type: <span className="text-gray-900 font-medium capitalize">{session.session_type}</span>
                          </span>
                        </div>
                      </div>

                      {(session as any).notes && (
                        <div className="mt-3 text-sm text-gray-600">
                          <p className="font-medium text-gray-700">Notes:</p>
                          <p className="mt-1 line-clamp-2">{(session as any).notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      <Link
                        to={`/sessions/${session.id}`}
                        className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
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
    </div>
  );
};

export default PatientSessions;
