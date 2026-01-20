// src/pages/SessionDetail.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  FileText, 
  Edit3, 
  Save, 
  X,
  Trash2,
  Phone,
  Mail
} from 'lucide-react';
import { useSessionDetail } from '../hooks/useTherapist';

const SessionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [noteText, setNoteText] = useState('');

  const {
    session,
    loading,
    error,
    updateSessionNotes
  } = useSessionDetail(id!);

  React.useEffect(() => {
    if (session?.session_notes) {
      setNoteText(session.session_notes);
    }
  }, [session]);

  const handleSaveNotes = async () => {
    if (!id) return;
    
    try {
      await updateSessionNotes({ session_notes: noteText });
      setIsEditingNotes(false);
    } catch (error) {
      console.error('Failed to update notes:', error);
    }
  };

  const handleDeleteSession = async () => {
    if (!id) return;
    
    if (window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      try {
        // This would need a separate service method to delete
        console.log('Delete session functionality needs to be implemented');
        navigate('/sessions');
      } catch (error) {
        console.error('Failed to delete session:', error);
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
                onClick={() => navigate(`/sessions/${id}/edit`)}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              >
                <Edit3 size={20} />
              </button>
              <button
                onClick={handleDeleteSession}
                className="p-2 bg-red-600/80 rounded-full hover:bg-red-700 transition-colors"
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
                <div className="text-right text-sm text-gray-500">
                  Session #{session.id}
                </div>
              </div>

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
                    <p className="text-gray-600">{session.location || 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Clock className="text-purple-600 mr-3 mt-1" size={20} />
                  <div>
                    <p className="font-semibold text-gray-900">Duration</p>
                    <p className="text-gray-600">{session.actual_duration_minutes} minutes</p>
                  </div>
                </div>
              </div>
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
                <button 
                  onClick={() => navigate(`/sessions/${id}/active`)}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                  disabled={session.status === 'COMPLETED'}
                >
                  {session.status === 'COMPLETED' ? 'Session Completed' : 'Start Session'}
                </button>
                
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