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
import { useSessionDetail } from '../hooks/useTherapist';
import therapistService from '../services/therapist.service';

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
      await therapistService.updateSession(id, {
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
      await therapistService.updateSessionSummary(id, summaryData);
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
        await therapistService.deleteSession(id);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Session Details</h1>
                <p className="text-purple-200">View and manage session information</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleDeleteSession}
                className="p-2 bg-red-600/80 rounded-full hover:bg-red-700 transition-colors"
                title="Delete session"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Session Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Session Overview */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {session.patient.full_name}
                  </h2>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(session.status)}`}>
                    {session.status?.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!isEditingDetails ? (
                    <button
                      onClick={() => setIsEditingDetails(true)}
                      className="flex items-center text-purple-600 hover:text-purple-700 text-sm"
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
                        className="flex items-center bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
                      >
                        <Save size={14} className="mr-1" />
                        {savingDetails ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setIsEditingDetails(false)}
                        className="flex items-center text-gray-600 hover:text-gray-700 text-sm"
                      >
                        <X size={14} className="mr-1" />
                        Cancel
                      </button>
                    </div>
                  )}
                  <div className="text-right text-sm text-gray-500">
                    Session #{session.id}
                  </div>
                </div>
              </div>

              {isEditingDetails ? (
                /* Edit Mode */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Date & Time</label>
                    <input
                      type="datetime-local"
                      value={detailsData.scheduled_date}
                      onChange={(e) => setDetailsData({ ...detailsData, scheduled_date: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Duration (minutes)</label>
                    <select
                      value={detailsData.duration_minutes}
                      onChange={(e) => setDetailsData({ ...detailsData, duration_minutes: parseInt(e.target.value) })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Session Type</label>
                    <select
                      value={detailsData.session_type}
                      onChange={(e) => setDetailsData({ ...detailsData, session_type: e.target.value as 'individual' | 'group' | 'family' | 'couples' })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-900">Online Session</span>
                    </label>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start">
                    <Calendar className="text-purple-600 mr-3 mt-1" size={20} />
                    <div>
                      <p className="font-semibold text-gray-900">Date</p>
                      <p className="text-gray-600">{sessionDateTime.date}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Clock className="text-purple-600 mr-3 mt-1" size={20} />
                    <div>
                      <p className="font-semibold text-gray-900">Time</p>
                      <p className="text-gray-600">{sessionDateTime.time}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <MapPin className="text-purple-600 mr-3 mt-1" size={20} />
                    <div>
                      <p className="font-semibold text-gray-900">Location</p>
                      <p className="text-gray-600">{session.location || 'Not specified'} {session.is_online && '(Online)'}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Clock className="text-purple-600 mr-3 mt-1" size={20} />
                    <div>
                      <p className="font-semibold text-gray-900">Duration</p>
                      <p className="text-gray-600">{session.duration_minutes || session.actual_duration_minutes || 60} minutes</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Session Notes */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center">
                  <FileText className="text-purple-600 mr-2" size={20} />
                  <h3 className="text-lg font-semibold text-gray-900">Session Notes</h3>
                </div>
                {!isEditingNotes ? (
                  <button
                    onClick={() => setIsEditingNotes(true)}
                    className="flex items-center text-purple-600 hover:text-purple-700"
                  >
                    <Edit3 size={16} className="mr-1" />
                    Edit
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveNotes}
                      className="flex items-center bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700"
                    >
                      <Save size={16} className="mr-1" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingNotes(false);
                        setNoteText(session.session_notes || '');
                      }}
                      className="flex items-center text-gray-600 hover:text-gray-700"
                    >
                      <X size={16} className="mr-1" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              
              <div className="p-6">
                {isEditingNotes ? (
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="Enter your session notes here..."
                  />
                ) : (
                  <div className="min-h-[12rem]">
                    {session.session_notes ? (
                      <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                        {session.session_notes}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <FileText size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No notes have been added for this session yet.</p>
                        <button
                          onClick={() => setIsEditingNotes(true)}
                          className="mt-2 text-purple-600 hover:text-purple-700"
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
              <div className="bg-white rounded-lg shadow-sm border mt-6">
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center">
                    <FileText className="text-purple-600 mr-2" size={20} />
                    <h3 className="text-lg font-semibold text-gray-900">Session Summary</h3>
                  </div>
                  {!isEditingSummary ? (
                    <button
                      onClick={() => setIsEditingSummary(true)}
                      className="flex items-center text-purple-600 hover:text-purple-700"
                    >
                      <Edit size={16} className="mr-1" />
                      Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveSummary}
                        disabled={savingSummary}
                        className="flex items-center text-green-600 hover:text-green-700 disabled:opacity-50"
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
                        className="flex items-center text-gray-600 hover:text-gray-700"
                      >
                        <X size={16} className="mr-1" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="p-6 space-y-6">
                  {isEditingSummary ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Session Summary
                        </label>
                        <textarea
                          value={summaryData.session_summary}
                          onChange={(e) => setSummaryData({ ...summaryData, session_summary: e.target.value })}
                          className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                          placeholder="Summarize what was discussed in this session..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Patient Goals
                        </label>
                        <textarea
                          value={summaryData.patient_goals}
                          onChange={(e) => setSummaryData({ ...summaryData, patient_goals: e.target.value })}
                          className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                          placeholder="What goals were discussed for the patient..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Homework Assigned
                        </label>
                        <textarea
                          value={summaryData.homework_assigned}
                          onChange={(e) => setSummaryData({ ...summaryData, homework_assigned: e.target.value })}
                          className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                          placeholder="Any homework or exercises assigned to the patient..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Goals for Next Session
                        </label>
                        <textarea
                          value={summaryData.next_session_goals}
                          onChange={(e) => setSummaryData({ ...summaryData, next_session_goals: e.target.value })}
                          className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                          placeholder="What to focus on in the next session..."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="font-semibold text-gray-900 mb-2">Session Summary</p>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {session.session_summary || <span className="text-gray-400 italic">Not provided</span>}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 mb-2">Patient Goals</p>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {session.patient_goals || <span className="text-gray-400 italic">Not provided</span>}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 mb-2">Homework Assigned</p>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {session.homework_assigned || <span className="text-gray-400 italic">Not provided</span>}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 mb-2">Goals for Next Session</p>
                        <p className="text-gray-700 whitespace-pre-wrap">
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
              <div className="bg-white rounded-lg shadow-sm border mt-6">
                <div className="flex items-center p-4 border-b">
                  <Activity className="text-purple-600 mr-2" size={20} />
                  <h3 className="text-lg font-semibold text-gray-900">Session Metrics</h3>
                </div>
                <div className="p-6 space-y-6">
                  {/* Patient Mood Before */}
                  {session.patient_mood_before !== null && (
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">Patient Mood (Before)</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-blue-500 h-3 rounded-full transition-all"
                            style={{ width: `${(session.patient_mood_before / 10) * 100}%` }}
                          />
                        </div>
                        <span className="font-semibold text-blue-600 min-w-[3rem] text-right">
                          {session.patient_mood_before}/10
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Patient Mood After */}
                  {session.patient_mood_after !== null && (
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">Patient Mood (After)</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-green-500 h-3 rounded-full transition-all"
                            style={{ width: `${(session.patient_mood_after / 10) * 100}%` }}
                          />
                        </div>
                        <span className="font-semibold text-green-600 min-w-[3rem] text-right">
                          {session.patient_mood_after}/10
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Mood Improvement */}
                  {session.mood_improvement !== null && session.mood_improvement !== 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-semibold text-gray-900 mb-1">Mood Change</p>
                      <p className={`text-2xl font-bold ${session.mood_improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {session.mood_improvement > 0 ? '+' : ''}{session.mood_improvement} points
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {session.mood_improvement > 0 ? '↑ Improved' : '↓ Decreased'}
                      </p>
                    </div>
                  )}

                  {/* Session Effectiveness */}
                  {session.session_effectiveness !== null && (
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">Session Effectiveness</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-purple-600 h-3 rounded-full transition-all"
                            style={{ width: `${(session.session_effectiveness / 10) * 100}%` }}
                          />
                        </div>
                        <span className="font-semibold text-purple-600 min-w-[3rem] text-right">
                          {session.session_effectiveness}/10
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Therapist's rating of session effectiveness
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
          </div>

          {/* Sidebar - Patient Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-6">
                <User className="text-purple-600 mr-2" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">Patient Information</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Name</p>
                  <p className="text-gray-600">{session.patient.full_name}</p>
                </div>

                {session.patient.email && (
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Email</p>
                    <div className="flex items-center">
                      <Mail size={16} className="text-gray-400 mr-2" />
                      <a 
                        href={`mailto:${session.patient.email}`}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        {session.patient.email}
                      </a>
                    </div>
                  </div>
                )}

                {session.patient.phone_number && (
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Phone</p>
                    <div className="flex items-center">
                      <Phone size={16} className="text-gray-400 mr-2" />
                      <a 
                        href={`tel:${session.patient.phone_number}`}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        {session.patient.phone_number}
                      </a>
                    </div>
                  </div>
                )}

                <div>
                  <p className="font-semibold text-gray-900 mb-1">Session Type</p>
                  <p className="text-gray-600">{session.session_type}</p>
                </div>

                <div>
                  <p className="font-semibold text-gray-900 mb-1">Created</p>
                  <p className="text-gray-600">
                    {new Date(session.scheduled_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 space-y-3">
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
                  
                  return (
                    <button 
                      onClick={() => navigate(`/sessions/${id}/active`)}
                      className={`w-full py-2 px-4 rounded-lg transition-colors ${
                        isDisabled 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                      disabled={isDisabled}
                    >
                      {buttonText}
                    </button>
                  );
                })()}
                
                <button 
                  onClick={() => navigate(`/patients/${session.patient.id}`)}
                  className="w-full bg-white text-purple-600 border border-purple-600 py-2 px-4 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  View Patient Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDetailPage;