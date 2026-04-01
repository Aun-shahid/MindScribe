// src/pages/EndSession.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Heart, Target, TrendingUp, CheckCircle, Loader } from 'lucide-react';
import { useSessionDetail } from '../hooks/useSessions';
import { useEndSession } from '../hooks/useSessions';

const PIPELINE_STATUS_LABELS: Record<string, string> = {
  idle: '',
  stopping: 'Saving session...',
  processing: 'AI is processing the transcript (this may take up to 2 minutes)...',
  ready: 'Transcript ready! Opening SOAP notes...',
  timeout: 'Taking longer than expected — opening SOAP notes anyway...',
};

const EndSession: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Form state
  const [sessionNotes, setSessionNotes] = useState('');
  const [patientGoals, setPatientGoals] = useState('');
  const [patientMoodAfter, setPatientMoodAfter] = useState('7');
  const [homeworkAssigned, setHomeworkAssigned] = useState('');
  const [nextSessionGoals, setNextSessionGoals] = useState('');
  const [sessionEffectiveness, setSessionEffectiveness] = useState('8');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Use hooks
  const { session } = useSessionDetail(id!);
  const {
    endSession,
    endSessionAndGoToSOAP,
    pipelineStatus,
    loading,
    error: endSessionError,
  } = useEndSession();

  const handleCompleteSession = async (navigateToSOAP = false) => {
    if (!id) {
      alert('No session ID found');
      return;
    }

    if (session?.status === 'UPCOMING') {
      alert('This session has not been started yet. Please start the session first before completing it.');
      return;
    }

    if (session?.status !== 'IN_PROGRESS' && session?.status !== 'COMPLETED') {
      alert(`Session cannot be completed. Current status: ${session?.status}. Only IN_PROGRESS or COMPLETED sessions can be updated.`);
      return;
    }

    if (!sessionNotes.trim()) {
      alert('Please enter session notes before completing the session.');
      return;
    }

    if (!window.confirm('Are you sure you want to complete this session? This action cannot be undone.')) {
      return;
    }

    const sessionData = {
      session_notes: sessionNotes,
      patient_goals: patientGoals,
      patient_mood_after: parseInt(patientMoodAfter) || 7,
      homework_assigned: homeworkAssigned,
      next_session_goals: nextSessionGoals,
      session_effectiveness: parseInt(sessionEffectiveness) || 8,
    };

    if (navigateToSOAP) {
      // Use the pipeline-aware version that waits for AI to finish
      const { success } = await endSessionAndGoToSOAP(id, sessionData);
      if (success) {
        setSuccessMessage('Session completed! Redirecting to SOAP Notes...');
        setTimeout(() => navigate(`/sessions/${id}/soap`), 1000);
      } else if (endSessionError) {
        alert(endSessionError.message || 'Failed to complete session. Please try again.');
      }
    } else {
      // Normal complete without SOAP — no need to wait for pipeline
      const response = await endSession(id, sessionData);
      if (response) {
        setSuccessMessage('Session completed successfully!');
        setTimeout(() => navigate('/sessions'), 2200);
      } else if (endSessionError) {
        alert(endSessionError.message || 'Failed to complete session. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      navigate(-1);
    }
  };

  const isAlreadyCompleted = session?.status === 'COMPLETED';
  const isUpcoming = session?.status === 'UPCOMING';
  const canEndSession = session?.status === 'IN_PROGRESS' || session?.status === 'COMPLETED';

  // Show pipeline processing overlay when waiting for AI
  const isProcessingPipeline = loading && (pipelineStatus === 'processing' || pipelineStatus === 'stopping');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Pipeline processing overlay */}
      {isProcessingPipeline && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
            <Loader className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {pipelineStatus === 'stopping' ? 'Saving Session' : 'Processing Transcript'}
            </h3>
            <p className="text-gray-600 text-sm">
              {PIPELINE_STATUS_LABELS[pipelineStatus]}
            </p>
            {pipelineStatus === 'processing' && (
              <p className="text-gray-400 text-xs mt-3">
                Please keep this window open while the AI processes your session audio.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-purple-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={handleCancel}
                className="mr-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold">
                  {isAlreadyCompleted ? 'Update Session Notes' : 'Complete Session'}
                </h1>
                <p className="text-green-200">
                  {session?.patient.full_name || 'Session Summary'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Warning Message for upcoming sessions */}
          {isUpcoming && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Session Not Started</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    This session has not been started yet. You need to start the session before you can complete it.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info Message for already completed sessions */}
          {isAlreadyCompleted && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Session Already Completed</h3>
                  <p className="mt-1 text-sm text-blue-700">
                    This session has already been completed. You can update the session notes and details below.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-green-800 text-sm font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Session Notes */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <FileText className="text-purple-600 mr-3" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">Session Notes</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Document key observations, breakthroughs, and important points from this session
            </p>
            <textarea
              className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-700 focus:border-transparent resize-none"
              placeholder="Enter detailed notes about the session, patient's responses, therapeutic techniques used, and any significant observations..."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
            />
          </div>

          {/* Patient Goals */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <Target className="text-purple-600 mr-3" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">Patient Goals</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Document the patient's updated therapeutic goals discussed during this session
            </p>
            <textarea
              className="w-full h-28 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-700 focus:border-transparent resize-none"
              placeholder="Update the patient's therapeutic goals, personal objectives, and desired outcomes..."
              value={patientGoals}
              onChange={(e) => setPatientGoals(e.target.value)}
            />
          </div>

          {/* Patient Mood After Session */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <Heart className="text-purple-600 mr-3" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">Patient Mood After Session</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Rate the patient's mood at the end of the session (1-10 scale)
            </p>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min="1"
                max="10"
                className="w-20 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-700 focus:border-transparent text-center text-lg font-semibold"
                placeholder="7"
                value={patientMoodAfter}
                onChange={(e) => setPatientMoodAfter(e.target.value)}
              />
              <div className="flex-1">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Very Low</span>
                  <span>Neutral</span>
                  <span>Very High</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-purple-700 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(parseInt(patientMoodAfter) || 5) * 10}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Homework/Action Items */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <Target className="text-purple-600 mr-3" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">Homework & Action Items</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Assign specific tasks, exercises, or practices for the patient to work on
            </p>
            <textarea
              className="w-full h-28 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-700 focus:border-transparent resize-none"
              placeholder="List specific homework assignments, exercises, or practices..."
              value={homeworkAssigned}
              onChange={(e) => setHomeworkAssigned(e.target.value)}
            />
          </div>

          {/* Next Session Goals */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <Target className="text-purple-600 mr-3" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">Next Session Goals</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Define objectives and focus areas for the upcoming session
            </p>
            <textarea
              className="w-full h-28 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-700 focus:border-transparent resize-none"
              placeholder="Outline specific goals, topics to explore, or techniques to implement..."
              value={nextSessionGoals}
              onChange={(e) => setNextSessionGoals(e.target.value)}
            />
          </div>

          {/* Session Effectiveness */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <TrendingUp className="text-purple-600 mr-3" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">Session Effectiveness</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Rate how effective you felt this session was (1-10 scale)
            </p>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min="1"
                max="10"
                className="w-20 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-700 focus:border-transparent text-center text-lg font-semibold"
                placeholder="8"
                value={sessionEffectiveness}
                onChange={(e) => setSessionEffectiveness(e.target.value)}
              />
              <div className="flex-1">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Not Effective</span>
                  <span>Moderately Effective</span>
                  <span>Highly Effective</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-purple-700 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(parseInt(sessionEffectiveness) || 5) * 10}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              onClick={handleCancel}
              className="flex-1 bg-white text-gray-700 border border-gray-300 py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>

            <button
              onClick={() => handleCompleteSession(true)}
              className="flex-1 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !canEndSession}
            >
              {loading && pipelineStatus !== 'idle' ? (
                <Loader size={20} className="mr-2 animate-spin" />
              ) : (
                <FileText size={20} className="mr-2" />
              )}
              {loading && pipelineStatus !== 'idle'
                ? PIPELINE_STATUS_LABELS[pipelineStatus] || 'Processing...'
                : 'Complete & Open SOAP'}
            </button>

            <button
              onClick={() => handleCompleteSession(false)}
              className="flex-1 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !canEndSession}
            >
              {loading && pipelineStatus === 'idle' ? (
                <Loader size={20} className="mr-2 animate-spin" />
              ) : (
                <CheckCircle size={20} className="mr-2" />
              )}
              {loading && pipelineStatus === 'idle'
                ? 'Saving...'
                : isAlreadyCompleted ? 'Update Notes' : 'Complete Session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EndSession;