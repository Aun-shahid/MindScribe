// src/pages/SessionDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  User,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Edit3,
  Edit,
  Save,
  X,
  Trash2,
  Phone,
  Mail,
  Activity
} from 'lucide-react';
import { useSessionDetail, useSessionAnalysis, useSessionTranscription } from '../hooks/useSessions';
import sessionsService from '../services/sessions.service';


const SessionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Check if coming from "Start Right Now" flow
  const startImmediately = (location.state as { startImmediately?: boolean })?.startImmediately || false;

  // Session details editing states
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailsData, setDetailsData] = useState<{
    scheduled_date: string;
    duration_minutes: number;
    location: string;
    is_online: boolean;
    session_type: 'individual' | 'group' | 'family' | 'couples';
  }>({
    scheduled_date: '',
    duration_minutes: 60,
    location: '',
    is_online: false,
    session_type: 'individual',
  });
  const [savingDetails, setSavingDetails] = useState(false);

  // Summary states
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryData, setSummaryData] = useState({
    session_summary: '',
    patient_goals: '',
    homework_assigned: '',
    next_session_goals: '',
  });
  const [savingSummary, setSavingSummary] = useState(false);

  const {
    session,
    loading,
    error,
    updateSessionNotes,
    fetchSession
  } = useSessionDetail(id!);

  // Fetch AI analysis and transcription for completed sessions
  const {
    analysis,
    loading: analysisLoading,
    error: analysisError
  } = useSessionAnalysis(session?.status === 'COMPLETED' ? id! : '');

  const {
    transcription,
    loading: transcriptionLoading,
    error: transcriptionError
  } = useSessionTranscription(session?.status === 'COMPLETED' ? id! : '');

  // Auto-refresh current time every 30 seconds to check if session time is reached
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (session?.session_notes) {
      setNoteText(session.session_notes);
    }
    // Populate summary data from session
    if (session) {
      setSummaryData({
        session_summary: session.session_summary || '',
        patient_goals: session.patient_goals || '',
        homework_assigned: session.homework_assigned || '',
        next_session_goals: session.next_session_goals || '',
      });
      // Populate details data from session
      const scheduledDate = session.scheduled_date ? new Date(session.scheduled_date) : new Date();
      const formattedDate = scheduledDate.toISOString().slice(0, 16); // Format for datetime-local input
      setDetailsData({
        scheduled_date: formattedDate,
        duration_minutes: session.duration_minutes || session.actual_duration_minutes || 60,
        location: session.location || '',
        is_online: session.is_online || false,
        session_type: (session.session_type as 'individual' | 'group' | 'family' | 'couples') || 'individual',
      });
    }
  }, [session]);

  const handleSaveDetails = async () => {
    if (!id) return;

    setSavingDetails(true);
    try {
      // Convert datetime-local to ISO string with timezone
      const scheduledDate = new Date(detailsData.scheduled_date);
      await sessionsService.updateSession(id, {
        scheduled_date: scheduledDate.toISOString(),
        duration_minutes: detailsData.duration_minutes,
        location: detailsData.location,
        is_online: detailsData.is_online,
        session_type: detailsData.session_type,
      });
      await fetchSession();
      setIsEditingDetails(false);
    } catch (error) {
      console.error('Failed to save session details:', error);
      alert('Failed to save session details. Please try again.');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;

    try {
      await updateSessionNotes({ session_notes: noteText });
      setIsEditingNotes(false);
    } catch (error) {
      console.error('Failed to update notes:', error);
    }
  };

  const handleSaveSummary = async () => {
    if (!id) return;

    setSavingSummary(true);
    try {
      await sessionsService.updateSessionSummary(id, summaryData);
      // Refetch session to show updated data
      await fetchSession();
      setIsEditingSummary(false);
    } catch (error) {
      console.error('Failed to save summary:', error);
      alert('Failed to save summary. Please try again.');
    } finally {
      setSavingSummary(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!id) return;

    if (window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      try {
        await sessionsService.deleteSession(id);
        navigate('/sessions');
      } catch (error) {
        console.error('Failed to delete session:', error);
        alert('Failed to delete session. Please try again.');
      }
    }
  };



  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SCHEDULED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        date: date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        time: date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      };
    } catch {
      return { date: 'Invalid date', time: 'Invalid time' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load session details</p>
          <button
            onClick={() => navigate('/sessions')}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  const sessionDateTime = formatDateTime(session.scheduled_date);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50">
      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all duration-200 hover:scale-105"
              >
                <ChevronLeft size={24} />
              </button>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-bold">Session #{session.id}</h1>
                  <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border-2 shadow-lg ${getStatusColor(session.status)}`}>
                    {session.status?.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
                <div className="flex items-center mt-2 text-purple-100">
                  <User size={16} className="mr-2" />
                  <p className="text-lg font-medium">{session.patient.full_name}</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleDeleteSession}
                className="flex items-center space-x-2 px-4 py-2.5 bg-red-600/90 backdrop-blur-sm rounded-xl hover:bg-red-700 transition-all duration-200 hover:scale-105 shadow-lg"
                title="Delete session"
              >
                <Trash2 size={18} />
                <span className="hidden sm:inline font-medium">Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Session Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Session Overview */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 px-6 py-4 border-b border-purple-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <FileText className="mr-2 text-purple-600" size={22} />
                    Session Overview
                  </h2>
                  <div className="flex items-center gap-3">
                    {!isEditingDetails ? (
                      <button
                        onClick={() => setIsEditingDetails(true)}
                        className="flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                        title="Edit session details"
                      >
                        <Edit3 size={16} className="mr-1" />
                        Edit Details
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveDetails}
                          disabled={savingDetails}
                          className="flex items-center bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                        >
                          <Save size={14} className="mr-1" />
                          {savingDetails ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setIsEditingDetails(false)}
                          className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          <X size={14} className="mr-1" />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {isEditingDetails ? (
                  /* Edit Mode */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Date & Time</label>
                      <input
                        type="datetime-local"
                        value={detailsData.scheduled_date}
                        onChange={(e) => setDetailsData({ ...detailsData, scheduled_date: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Duration (minutes)</label>
                      <select
                        value={detailsData.duration_minutes}
                        onChange={(e) => setDetailsData({ ...detailsData, duration_minutes: parseInt(e.target.value) })}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                        <option value={90}>90 minutes</option>
                        <option value={120}>120 minutes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Location</label>
                      <input
                        type="text"
                        value={detailsData.location}
                        onChange={(e) => setDetailsData({ ...detailsData, location: e.target.value })}
                        placeholder="e.g., Clinic Room 1, Home, etc."
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Session Type</label>
                      <select
                        value={detailsData.session_type}
                        onChange={(e) => setDetailsData({ ...detailsData, session_type: e.target.value as 'individual' | 'group' | 'family' | 'couples' })}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="individual">Individual</option>
                        <option value="couples">Couples</option>
                        <option value="group">Group</option>
                        <option value="family">Family</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={detailsData.is_online}
                          onChange={(e) => setDetailsData({ ...detailsData, is_online: e.target.checked })}
                          className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm font-medium text-gray-900">Online Session</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Calendar className="text-green-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Date</p>
                        <p className="text-base font-semibold text-gray-900">{sessionDateTime.date}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Clock className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Time</p>
                        <p className="text-base font-semibold text-gray-900">{sessionDateTime.time}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <MapPin className="text-purple-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Location</p>
                        <p className="text-base font-semibold text-gray-900">{session.location || 'Not specified'} {session.is_online && '🌐'}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Clock className="text-orange-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Duration</p>
                        <p className="text-base font-semibold text-gray-900">{session.duration_minutes || session.actual_duration_minutes || 60} minutes</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Session Notes */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 px-6 py-4 border-b border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="text-blue-600 mr-2" size={20} />
                    <h3 className="text-lg font-bold text-gray-900">Session Notes</h3>
                  </div>
                  {!isEditingNotes ? (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                    >
                      <Edit3 size={16} className="mr-1" />
                      Edit
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveNotes}
                        className="flex items-center bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        <Save size={16} className="mr-1" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingNotes(false);
                          setNoteText(session.session_notes || '');
                        }}
                        className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        <X size={16} className="mr-1" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                {isEditingNotes ? (
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full h-48 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base"
                    placeholder="Enter your session notes here..."
                  />
                ) : (
                  <div className="min-h-[12rem]">
                    {session.session_notes ? (
                      <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-base bg-gray-50 rounded-xl p-4">
                        {session.session_notes}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <FileText size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No notes have been added for this session yet.</p>
                        <button
                          onClick={() => setIsEditingNotes(true)}
                          className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                        >
                          Add notes
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Session Summary Section - Only for COMPLETED or IN_PROGRESS sessions */}
            {(session.status === 'COMPLETED' || session.status === 'IN_PROGRESS') && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 px-6 py-4 border-b border-amber-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="text-amber-600 mr-2" size={20} />
                      <h3 className="text-lg font-bold text-gray-900">Session Summary</h3>
                    </div>
                    {!isEditingSummary ? (
                      <button
                        onClick={() => setIsEditingSummary(true)}
                        className="flex items-center px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
                      >
                        <Edit size={16} className="mr-1" />
                        Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleSaveSummary}
                          disabled={savingSummary}
                          className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                        >
                          <Save size={16} className="mr-1" />
                          {savingSummary ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingSummary(false);
                            setSummaryData({
                              session_summary: session.session_summary || '',
                              patient_goals: session.patient_goals || '',
                              homework_assigned: session.homework_assigned || '',
                              next_session_goals: session.next_session_goals || '',
                            });
                          }}
                          className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          <X size={16} className="mr-1" />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {isEditingSummary ? (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Session Summary
                        </label>
                        <textarea
                          value={summaryData.session_summary}
                          onChange={(e) => setSummaryData({ ...summaryData, session_summary: e.target.value })}
                          className="w-full h-32 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-base"
                          placeholder="Summarize what was discussed in this session..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Patient Goals
                        </label>
                        <textarea
                          value={summaryData.patient_goals}
                          onChange={(e) => setSummaryData({ ...summaryData, patient_goals: e.target.value })}
                          className="w-full h-24 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-base"
                          placeholder="What goals were discussed for the patient..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Homework Assigned
                        </label>
                        <textarea
                          value={summaryData.homework_assigned}
                          onChange={(e) => setSummaryData({ ...summaryData, homework_assigned: e.target.value })}
                          className="w-full h-24 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-base"
                          placeholder="Any homework or exercises assigned to the patient..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Goals for Next Session
                        </label>
                        <textarea
                          value={summaryData.next_session_goals}
                          onChange={(e) => setSummaryData({ ...summaryData, next_session_goals: e.target.value })}
                          className="w-full h-24 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-base"
                          placeholder="What to focus on in the next session..."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="font-semibold text-gray-900 mb-2 flex items-center">
                          <span className="mr-2">📋</span> Session Summary
                        </p>
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {session.session_summary || <span className="text-gray-400 italic">Not provided</span>}
                        </p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="font-semibold text-gray-900 mb-2 flex items-center">
                          <span className="mr-2">🎯</span> Patient Goals
                        </p>
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {session.patient_goals || <span className="text-gray-400 italic">Not provided</span>}
                        </p>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <p className="font-semibold text-gray-900 mb-2 flex items-center">
                          <span className="mr-2">📝</span> Homework Assigned
                        </p>
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {session.homework_assigned || <span className="text-gray-400 italic">Not provided</span>}
                        </p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="font-semibold text-gray-900 mb-2 flex items-center">
                          <span className="mr-2">🔮</span> Goals for Next Session
                        </p>
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {session.next_session_goals || <span className="text-gray-400 italic">Not provided</span>}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Mood & Effectiveness Section - Only for COMPLETED sessions */}
            {session.status === 'COMPLETED' && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-pink-50 to-pink-100/50 px-6 py-4 border-b border-pink-200">
                  <div className="flex items-center">
                    <Activity className="text-pink-600 mr-2" size={20} />
                    <h3 className="text-lg font-bold text-gray-900">Session Metrics</h3>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {/* Patient Mood Before */}
                  {session.patient_mood_before !== null && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Patient Mood (Before)</span>
                        <span className="text-2xl font-bold text-gray-900">{session.patient_mood_before}<span className="text-base text-gray-500">/10</span></span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-red-400 to-orange-400 transition-all duration-500"
                          style={{ width: `${(session.patient_mood_before / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Patient Mood After */}
                  {session.patient_mood_after !== null && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Patient Mood (After)</span>
                        <span className="text-2xl font-bold text-gray-900">{session.patient_mood_after}<span className="text-base text-gray-500">/10</span></span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                          style={{ width: `${(session.patient_mood_after / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Mood Improvement */}
                  {session.mood_improvement !== null && session.mood_improvement !== 0 && (
                    <div className={`rounded-xl p-4 ${session.mood_improvement > 0 ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                      <p className="text-sm font-semibold text-gray-700 mb-1 uppercase tracking-wide">Mood Change</p>
                      <p className={`text-3xl font-bold ${session.mood_improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {session.mood_improvement > 0 ? '+' : ''}{session.mood_improvement} points
                      </p>
                      <p className={`text-sm font-semibold mt-2 ${session.mood_improvement > 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {session.mood_improvement >= 3 ? '🎉 Significant Improvement' :
                          session.mood_improvement >= 1 ? '✅ Positive Progress' : '⚠️ Needs Attention'}
                      </p>
                    </div>
                  )}

                  {/* Session Effectiveness */}
                  {session.session_effectiveness !== null && (
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-xl p-5 border border-purple-200">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Session Effectiveness</span>
                        <span className="text-3xl font-bold text-purple-600">{session.session_effectiveness}<span className="text-lg text-gray-500">/10</span></span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                        <div
                          className={`h-4 rounded-full transition-all duration-500 ${session.session_effectiveness >= 8 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                            session.session_effectiveness >= 6 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-red-400 to-red-600'
                            }`}
                          style={{ width: `${(session.session_effectiveness / 10) * 100}%` }}
                        />
                      </div>
                      <p className={`text-center text-sm font-bold uppercase tracking-wider px-3 py-2 rounded-lg mt-3 inline-block ${session.session_effectiveness >= 8 ? 'bg-green-100 text-green-700' :
                        session.session_effectiveness >= 6 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {session.session_effectiveness >= 8 ? '⭐ Highly Effective' :
                          session.session_effectiveness >= 6 ? '👍 Moderately Effective' : '⚠️ Needs Improvement'}
                      </p>
                    </div>
                  )}

                  {/* Show message if no metrics available */}
                  {session.patient_mood_before === null &&
                    session.patient_mood_after === null &&
                    session.session_effectiveness === null && (
                      <div className="text-center py-4">
                        <p className="text-gray-400 italic">No session metrics recorded</p>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Emotional Analysis Section - Only for COMPLETED sessions */}
            {session.status === 'COMPLETED' && analysis && !analysisError && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 px-6 py-4 border-b border-blue-200">
                  <div className="flex items-center">
                    <Activity className="text-blue-600 mr-2" size={20} />
                    <h3 className="text-lg font-bold text-gray-900">Emotional Analysis</h3>
                    {analysis.is_mock_data && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Mock Data</span>
                    )}
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {/* Overall Mood */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Overall Mood</p>
                    <p className="text-2xl font-bold text-blue-600">{analysis.overall_mood}</p>
                    <p className="text-sm text-gray-600 mt-1">Mood Score: {analysis.mood_score}/10</p>
                  </div>

                  {/* Mood Distribution */}
                  {analysis.mood_distribution && Object.keys(analysis.mood_distribution).length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Mood Distribution</p>
                      <div className="space-y-2">
                        {Object.entries(analysis.mood_distribution).map(([emotion, percentage]) => (
                          <div key={emotion}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-gray-600 capitalize">{emotion}</span>
                              <span className="text-sm font-medium text-gray-900">{percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Moments */}
                  {analysis.key_moments && analysis.key_moments.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Key Emotional Moments</p>
                      <div className="space-y-3">
                        {analysis.key_moments.map((moment, index) => (
                          <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-blue-600 uppercase">{moment.emotion}</span>
                              <span className="text-xs text-gray-500">{Math.floor(moment.timestamp / 60)}:{String(Math.floor(moment.timestamp % 60)).padStart(2, '0')}</span>
                            </div>
                            <p className="text-sm text-gray-700">{moment.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transcription Section - Only for COMPLETED sessions */}
            {session.status === 'COMPLETED' && transcription && !transcriptionError && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-green-100/50 px-6 py-4 border-b border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="text-green-600 mr-2" size={20} />
                      <h3 className="text-lg font-bold text-gray-900">Session Transcription</h3>
                      {transcription.is_mock_data && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Mock Data</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Duration: {Math.floor(transcription.total_duration / 60)}:{String(Math.floor(transcription.total_duration % 60)).padStart(2, '0')}
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {transcription.segments.map((segment) => (
                      <div key={segment.id} className="flex gap-4">
                        <div className="flex-shrink-0 w-20 text-xs text-gray-500 pt-1">
                          {Math.floor(segment.start_time / 60)}:{String(Math.floor(segment.start_time % 60)).padStart(2, '0')}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-700 mb-1">{segment.speaker}</p>
                          <p className="text-sm text-gray-600 leading-relaxed">{segment.text}</p>
                          {segment.emotion && (
                            <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              {segment.emotion}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Loading states */}
            {session.status === 'COMPLETED' && (analysisLoading || transcriptionLoading) && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                <p className="text-gray-600 text-sm">Loading AI analysis and transcription...</p>
              </div>
            )}
          </div>

          {/* Sidebar - Patient Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Patient Information Card */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden sticky top-6">
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 px-6 py-4 border-b border-indigo-200">
                <div className="flex items-center">
                  <User className="text-indigo-600 mr-2" size={20} />
                  <h3 className="text-lg font-bold text-gray-900">Patient Information</h3>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">Patient Name</p>
                  <p className="text-lg font-bold text-gray-900">{session.patient.full_name}</p>
                </div>

                {session.patient.email && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-500 mb-2">Email</p>
                    <div className="flex items-center">
                      <Mail size={16} className="text-indigo-600 mr-2" />
                      <a
                        href={`mailto:${session.patient.email}`}
                        className="text-indigo-600 hover:text-indigo-700 font-medium break-all"
                      >
                        {session.patient.email}
                      </a>
                    </div>
                  </div>
                )}

                {session.patient.phone_number && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-500 mb-2">Phone</p>
                    <div className="flex items-center">
                      <Phone size={16} className="text-indigo-600 mr-2" />
                      <a
                        href={`tel:${session.patient.phone_number}`}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        {session.patient.phone_number}
                      </a>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-500 mb-1">Session Type</p>
                  <p className="text-base font-semibold text-gray-900 capitalize">{session.session_type}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-500 mb-1">Created</p>
                  <p className="text-base font-semibold text-gray-900">
                    {new Date(session.scheduled_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 space-y-3">
                  {(() => {
                    const sessionTime = new Date(session.scheduled_date);
                    const isSessionTimeReached = currentTime >= sessionTime;
                    const isCompleted = session.status === 'COMPLETED';
                    const isCancelled = session.status === 'CANCELLED';
                    // Allow immediate start if coming from "Start Right Now" flow
                    const canStart = startImmediately || isSessionTimeReached;
                    const isDisabled = isCompleted || isCancelled || !canStart;

                    let buttonText = 'Start Session';
                    if (isCompleted) buttonText = 'Session Completed';
                    else if (isCancelled) buttonText = 'Session Cancelled';
                    else if (!canStart) {
                      buttonText = `Available at ${sessionTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                    }

                    const handleStartSession = () => {
                      if (!id) return;
                      navigate(`/sessions/${id}/active`, { state: { session } });
                    };

                    return (
                      <button
                        onClick={handleStartSession}
                        className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${isDisabled
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl hover:scale-105'
                          }`}
                        disabled={isDisabled}
                      >
                        {buttonText}
                      </button>
                    );
                  })()}

                  <button
                    onClick={() => navigate(`/patients/${session.patient.id}`)}
                    className="w-full bg-white text-indigo-600 border-2 border-indigo-600 py-3 px-4 rounded-xl hover:bg-indigo-50 transition-all duration-200 font-semibold hover:scale-105"
                  >
                    View Patient Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDetailPage;