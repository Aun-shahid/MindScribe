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
import { useSessionDetail } from '../hooks/useTherapist';

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
                <h1 className="text-2xl font-bold">Session #{session.session_number || session.id}</h1>
                <p className="text-purple-200">{session.patient?.full_name}</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleRefresh}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={20} />
              </button>
              <button
                onClick={() => navigate(`/sessions/${id}/edit`)}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                title="Edit Notes"
              >
                <Edit3 size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Session Overview */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Session Overview</h2>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(session.status)}`}>
                {session.status?.toUpperCase()}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <User className="text-purple-600 mr-3 mt-1" size={20} />
                <div>
                  <p className="font-medium text-gray-900">Patient:</p>
                  <p className="text-gray-700">{session.patient?.full_name}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <FileText className="text-purple-600 mr-3 mt-1" size={20} />
                <div>
                  <p className="font-medium text-gray-900">Type:</p>
                  <p className="text-gray-700">
                    {session.session_type} • {session.is_online ? 'Online' : session.location}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Calendar className="text-purple-600 mr-3 mt-1" size={20} />
                <div>
                  <p className="font-medium text-gray-900">Scheduled:</p>
                  <p className="text-gray-700">{formatDate(session.scheduled_date)}</p>
                </div>
              </div>
              
              {session.actual_duration_minutes && (
                <div className="flex items-start">
                  <Clock className="text-purple-600 mr-3 mt-1" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">Duration:</p>
                    <p className="text-gray-700">{session.actual_duration_minutes} minutes</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Session Goals */}
          {session.patient_goals && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <Target className="text-purple-600 mr-2" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">🎯 Session Goals</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">{session.patient_goals}</p>
            </div>
          )}

          {/* Session Notes */}
          {session.session_notes && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <FileText className="text-purple-600 mr-2" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">📝 Session Notes</h3>
              </div>
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {session.session_notes}
              </div>
            </div>
          )}

          {/* Therapist Observations */}
          {session.therapist_observations && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <Eye className="text-purple-600 mr-2" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">👁️ Therapist Observations</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">{session.therapist_observations}</p>
            </div>
          )}

          {/* Mood Analysis */}
          {(session.patient_mood_before || session.patient_mood_after || session.mood_improvement !== null) && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-6">
                <Heart className="text-purple-600 mr-2" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">😊 Mood Analysis</h3>
              </div>
              
              <div className="space-y-4">
                {session.patient_mood_before && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Before Session:</span>
                    <span className="text-lg font-bold text-gray-900">{session.patient_mood_before}/10</span>
                  </div>
                )}
                
                {session.patient_mood_after && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">After Session:</span>
                    <span className="text-lg font-bold text-gray-900">{session.patient_mood_after}/10</span>
                  </div>
                )}
                
                {session.mood_improvement !== null && session.mood_improvement !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Improvement:</span>
                    <div className="flex items-center">
                      <span className={`text-lg font-bold ${session.mood_improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {session.mood_improvement > 0 ? '+' : ''}{session.mood_improvement}
                      </span>
                      <TrendingUp 
                        className={`w-4 h-4 ml-1 ${session.mood_improvement >= 0 ? 'text-green-600' : 'text-red-600 rotate-180'}`} 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Homework & Next Steps */}
          {(session.homework_assigned || session.next_session_goals) && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-6">
                <BookOpen className="text-purple-600 mr-2" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">📚 Homework & Next Steps</h3>
              </div>
              
              <div className="space-y-4">
                {session.homework_assigned && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Homework Assigned:</h4>
                    <p className="text-gray-700 leading-relaxed">{session.homework_assigned}</p>
                  </div>
                )}
                
                {session.next_session_goals && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Next Session Goals:</h4>
                    <p className="text-gray-700 leading-relaxed">{session.next_session_goals}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session Effectiveness */}
          {session.session_effectiveness && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-6">
                <Star className="text-purple-600 mr-2" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">⭐ Session Effectiveness</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Therapist Rating:</span>
                  <span className="text-xl font-bold text-gray-900">{session.session_effectiveness}/10</span>
                </div>
                
                {/* Visual rating bar */}
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        session.session_effectiveness >= 8 ? 'bg-green-500' : 
                        session.session_effectiveness >= 6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(session.session_effectiveness / 10) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-center text-sm text-gray-600 font-medium">
                    {session.session_effectiveness >= 8 ? 'Highly Effective' :
                     session.session_effectiveness >= 6 ? 'Moderately Effective' : 'Needs Improvement'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionDetailView;