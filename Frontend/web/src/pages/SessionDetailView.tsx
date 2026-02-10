// src/pages/SessionDetailView.tsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  User,
  Calendar,
  Clock,
  FileText,
  RefreshCw,
  Target,
  Eye,
  Heart,
  TrendingUp,
  BookOpen,
  Star,
  Edit3
} from 'lucide-react';
import { useSessionDetail } from '../hooks/useSessions';

const SessionDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    session,
    loading,
    error,
    fetchSession
  } = useSessionDetail(id!);

  const handleRefresh = () => {
    fetchSession();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
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
                  <p className="text-purple-200">Loading...</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading session details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
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
                  <p className="text-purple-200">Error</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Session Not Found
            </h3>
            <p className="text-gray-600 mb-6">
              The requested session could not be loaded.
            </p>
            <button
              onClick={() => navigate('/sessions')}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
            >
              Back to Sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                  <h1 className="text-3xl font-bold">Session #{session.session_number || session.id}</h1>
                  <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border-2 shadow-lg ${getStatusColor(session.status)}`}>
                    {session.status?.toUpperCase()}
                  </div>
                </div>
                <div className="flex items-center mt-2 text-purple-100">
                  <User size={16} className="mr-2" />
                  <p className="text-lg font-medium">{session.patient?.full_name}</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleRefresh}
                className="flex items-center space-x-2 px-4 py-2.5 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all duration-200 hover:scale-105"
                title="Refresh"
              >
                <RefreshCw size={18} />
                <span className="hidden sm:inline font-medium">Refresh</span>
              </button>
              <button
                onClick={() => navigate(`/sessions/${id}/edit`)}
                className="flex items-center space-x-2 px-4 py-2.5 bg-white text-purple-700 rounded-xl hover:bg-purple-50 transition-all duration-200 hover:scale-105 shadow-lg"
                title="Edit Notes"
              >
                <Edit3 size={18} />
                <span className="hidden sm:inline font-medium">Edit Session</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Primary Information (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Session Overview Card - Enhanced */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 px-6 py-4 border-b border-purple-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <FileText className="mr-2 text-purple-600" size={22} />
                  Session Overview
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <User className="text-purple-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Patient</p>
                      <p className="text-base font-semibold text-gray-900">{session.patient?.full_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Session Type</p>
                      <p className="text-base font-semibold text-gray-900">{session.session_type}</p>
                      <p className="text-sm text-gray-600">{session.is_online ? '🌐 Online' : `📍 ${session.location}`}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Calendar className="text-green-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Scheduled Date</p>
                      <p className="text-base font-semibold text-gray-900">{formatDate(session.scheduled_date)}</p>
                    </div>
                  </div>

                  {session.actual_duration_minutes && (
                    <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Clock className="text-orange-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Duration</p>
                        <p className="text-base font-semibold text-gray-900">{session.actual_duration_minutes} minutes</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Session Goals - Enhanced */}
            {session.patient_goals && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 px-6 py-4 border-b border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Target className="mr-2 text-blue-600" size={20} />
                    Session Goals
                  </h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 leading-relaxed text-base">{session.patient_goals}</p>
                </div>
              </div>
            )}

            {/* Session Notes - Enhanced */}
            {session.session_notes && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 px-6 py-4 border-b border-purple-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <FileText className="mr-2 text-purple-600" size={20} />
                    Session Notes
                  </h3>
                </div>
                <div className="p-6">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-base bg-gray-50 rounded-xl p-4">
                    {session.session_notes}
                  </div>
                </div>
              </div>
            )}

            {/* Therapist Observations - Enhanced */}
            {session.therapist_observations && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 px-6 py-4 border-b border-indigo-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Eye className="mr-2 text-indigo-600" size={20} />
                    Therapist Observations
                  </h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 leading-relaxed text-base">{session.therapist_observations}</p>
                </div>
              </div>
            )}

            {/* Homework & Next Steps - Enhanced */}
            {(session.homework_assigned || session.next_session_goals) && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 px-6 py-4 border-b border-amber-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <BookOpen className="mr-2 text-amber-600" size={20} />
                    Homework & Next Steps
                  </h3>
                </div>
                <div className="p-6 space-y-5">
                  {session.homework_assigned && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <span className="mr-2">📝</span> Homework Assigned
                      </h4>
                      <p className="text-gray-700 leading-relaxed">{session.homework_assigned}</p>
                    </div>
                  )}

                  {session.next_session_goals && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <span className="mr-2">🎯</span> Next Session Goals
                      </h4>
                      <p className="text-gray-700 leading-relaxed">{session.next_session_goals}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Metrics & Analytics (1/3 width) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Mood Analysis - Visual Dashboard */}
            {(session.patient_mood_before || session.patient_mood_after || session.mood_improvement !== null) && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden sticky top-6">
                <div className="bg-gradient-to-r from-pink-50 to-pink-100/50 px-6 py-4 border-b border-pink-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Heart className="mr-2 text-pink-600" size={20} />
                    Mood Analysis
                  </h3>
                </div>

                <div className="p-6 space-y-6">
                  {session.patient_mood_before && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Before Session</span>
                        <span className="text-2xl font-bold text-gray-900">{session.patient_mood_before}<span className="text-base text-gray-500">/10</span></span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-red-400 to-orange-400 transition-all duration-500"
                          style={{ width: `${(session.patient_mood_before / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {session.patient_mood_after && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">After Session</span>
                        <span className="text-2xl font-bold text-gray-900">{session.patient_mood_after}<span className="text-base text-gray-500">/10</span></span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                          style={{ width: `${(session.patient_mood_after / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {session.mood_improvement !== null && session.mood_improvement !== undefined && (
                    <div className={`rounded-xl p-4 ${session.mood_improvement >= 0 ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Improvement</span>
                        <div className="flex items-center space-x-2">
                          <span className={`text-3xl font-bold ${session.mood_improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {session.mood_improvement > 0 ? '+' : ''}{session.mood_improvement}
                          </span>
                          <TrendingUp
                            className={`w-6 h-6 ${session.mood_improvement >= 0 ? 'text-green-600' : 'text-red-600 rotate-180'}`}
                          />
                        </div>
                      </div>
                      <p className={`text-center text-sm font-semibold mt-3 ${session.mood_improvement >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {session.mood_improvement >= 3 ? '🎉 Significant Improvement' :
                          session.mood_improvement >= 1 ? '✅ Positive Progress' :
                            session.mood_improvement === 0 ? '➡️ Stable' : '⚠️ Needs Attention'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Session Effectiveness - Visual Card */}
            {session.session_effectiveness && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100/50 px-6 py-4 border-b border-yellow-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Star className="mr-2 text-yellow-600" size={20} />
                    Session Effectiveness
                  </h3>
                </div>

                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-gray-900 mb-2">
                      {session.session_effectiveness}<span className="text-2xl text-gray-500">/10</span>
                    </div>
                    <p className={`text-sm font-bold uppercase tracking-wider px-4 py-2 rounded-full inline-block ${session.session_effectiveness >= 8 ? 'bg-green-100 text-green-700' :
                        session.session_effectiveness >= 6 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                      {session.session_effectiveness >= 8 ? '⭐ Highly Effective' :
                        session.session_effectiveness >= 6 ? '👍 Moderately Effective' : '⚠️ Needs Improvement'}
                    </p>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                    <div
                      className={`h-4 rounded-full transition-all duration-500 ${session.session_effectiveness >= 8 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                          session.session_effectiveness >= 6 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-red-400 to-red-600'
                        }`}
                      style={{ width: `${(session.session_effectiveness / 10) * 100}%` }}
                    ></div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-medium text-gray-500">
                    <div>0</div>
                    <div>5</div>
                    <div>10</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDetailView;