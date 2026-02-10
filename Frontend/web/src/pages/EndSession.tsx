// src/pages/EndSession.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Heart, Target, TrendingUp, CheckCircle } from 'lucide-react';
import { useSessionDetail } from '../hooks/useSessions';
import { useEndSession } from '../hooks/useSessions';

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

  // Use hooks
  const { session } = useSessionDetail(id!);
  const { endSession, loading, error: endSessionError } = useEndSession();

  const handleCompleteSession = async () => {
    if (!id) {
      alert('No session ID found');
      return;
    }

    // Basic validation
    if (!sessionNotes.trim()) {
      alert('Please enter session notes before completing the session.');
      return;
    }

    if (window.confirm('Are you sure you want to complete this session? This action cannot be undone.')) {
      // Prepare the session data - only send fields backend accepts
      const sessionData = {
        session_notes: sessionNotes,
        patient_goals: patientGoals,
        patient_mood_after: parseInt(patientMoodAfter) || 7,
        homework_assigned: homeworkAssigned,
        next_session_goals: nextSessionGoals,
        session_effectiveness: parseInt(sessionEffectiveness) || 8,
      };

      console.log('🚀 [EndSession] Starting to complete session');
      console.log('   Session ID:', id);
      console.log('   Session Data:', JSON.stringify(sessionData, null, 2));

      // Use the endSession hook
      const response = await endSession(id, sessionData);

      if (response) {
        console.log('✅ [EndSession] Session completed successfully');
        console.log('   Result:', response);
        console.log('   AI Analysis:', response.ai_analysis);

        // Navigate to the session detail view to see the completed data
        navigate(`/sessions/${id}`);
      } else if (endSessionError) {
        console.error('❌ [EndSession] Failed to complete session');
        console.error('   Error:', endSessionError);

        const errorMessage = endSessionError.message || 'Failed to complete session. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      navigate(-1);
    }
  };

  // Check if session is already completed
  const isAlreadyCompleted = session?.status === 'COMPLETED';

  return (
    <div className="min-h-screen bg-gray-50">
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
          {/* Info Message for already completed sessions */}
          {isAlreadyCompleted && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Session Already Completed
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    This session has already been completed. You can update the session notes and details below.
                  </p>
                </div>
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
              placeholder="Update the patient's therapeutic goals, personal objectives, and desired outcomes discussed in this session..."
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
              placeholder="List specific homework assignments, exercises, or practices for the patient to complete before the next session..."
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
              placeholder="Outline specific goals, topics to explore, or therapeutic techniques to implement in the next session..."
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
              onClick={handleCompleteSession}
              className="flex-1 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              ) : (
                <CheckCircle size={20} className="mr-2" />
              )}
              {loading
                ? (isAlreadyCompleted ? 'Updating Notes...' : 'Completing Session...')
                : (isAlreadyCompleted ? 'Update Notes' : 'Complete Session')
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EndSession;