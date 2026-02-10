// src/pages/ActiveSession.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Mic,
  Play,
  Square,
  User,
  Clock,
  Activity,
  FileText,
  StopCircle
} from 'lucide-react';
import { useSessionDetail } from '../hooks/useSessions';
import { useStartSession, useLiveSession, useSessionAnalysis, useAIServiceWebSocket } from '../hooks/useSessions';

const ActiveSession: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Session state
  const [isRecording, setIsRecording] = useState(false);
  const [sessionDuration, setSessionDuration] = useState('00:00');
  const [sessionStartTime] = useState(new Date());
  const [sessionStarted, setSessionStarted] = useState(false);
  const [aiServiceToken, setAiServiceToken] = useState<string | null>(null);
  const [websocketRoomId, setWebsocketRoomId] = useState<string | null>(null);

  // Use session hooks
  const { session, loading, error } = useSessionDetail(id!);
  const { startSession, loading: startingSession, error: startError } = useStartSession();
  const { analysis } = useSessionAnalysis(sessionStarted ? id! : '');
  // Note: transcription from analysis endpoint is loaded after session completes
  // We use AI Service WebSocket for live transcription instead

  // Django WebSocket connection for session control (start/stop/pause)
  const {
    connected: wsConnected,
    sessionStatus: wsSessionStatus,
    participants,
    error: wsError,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    sendControl,
  } = useLiveSession(websocketRoomId, {
    autoConnect: false,
    heartbeatIntervalMs: 30000,
  });

  // AI Service WebSocket connection for real-time transcription
  // aiServiceUrl is imported from config.ts in the service layer
  const {
    connected: aiConnected,
    transcriptionSegments: aiTranscriptionSegments,
    error: aiError,
    connect: connectAIService,
    disconnect: disconnectAIService,
    sendAudioChunk: _sendAudioChunk, // TODO: Wire to MediaRecorder API
  } = useAIServiceWebSocket(
    sessionStarted ? id! : null,
    aiServiceToken,
    { autoConnect: false }
  );

  // Use live transcription from AI Service WebSocket if available
  const transcript = aiTranscriptionSegments.length > 0
    ? aiTranscriptionSegments.map((seg) => ({
      speaker: seg.speaker,
      text: seg.text,
      time: `${Math.floor(seg.start_time / 60)}:${String(Math.floor(seg.start_time % 60)).padStart(2, '0')}`,
      emotion: seg.emotion,
    }))
    : [];

  // Use analysis data if available
  // For now, emotion data is mock until we aggregate from transcription segments
  const emotionData = analysis?.mood_distribution || {
    calm: transcript.filter(t => t.emotion?.toLowerCase().includes('calm')).length * 10,
    anxious: transcript.filter(t => t.emotion?.toLowerCase().includes('anxious')).length * 10,
    angry: transcript.filter(t => t.emotion?.toLowerCase().includes('angry')).length * 10,
  };

  // Check if session is already completed and redirect to detail page
  useEffect(() => {
    if (session && session.status === 'COMPLETED') {
      console.log('⚠️ Session is already completed, redirecting to detail page');
      alert('This session has already been completed. You will be redirected to the session details page.');
      navigate(`/sessions/${id}`);
    }
  }, [session, id, navigate]);

  // Start session when component mounts
  useEffect(() => {
    const handleStartSession = async () => {
      if (!id || sessionStarted || startingSession) return;

      // Don't try to start if session is already completed
      if (session?.status === 'COMPLETED') {
        return;
      }

      console.log('🚀 Starting session:', id);
      const result = await startSession(id);

      if (result) {
        console.log('✅ Session started successfully');
        console.log('   AI Service Token:', result.ai_service_token ? 'Received' : 'Not provided');
        console.log('   AI Service URL:', result.ai_service_url || 'Using config default');
        console.log('   WebSocket Room:', result.session.websocket_room_id);
        setSessionStarted(true);

        // Store WebSocket room ID and AI service token
        setWebsocketRoomId(result.session.websocket_room_id || null);
        if (result.ai_service_token) {
          setAiServiceToken(result.ai_service_token);
          console.log('💾 Stored AI Service token');
        }

        // Connect to Django WebSocket for session control
        if (result.session.websocket_room_id) {
          console.log('🔌 Connecting to Django WebSocket...');
          setTimeout(() => connectWebSocket(), 500);
        }

        // Connect to AI Service WebSocket for transcription
        if (result.ai_service_token) {
          console.log('🔌 Connecting to AI Service WebSocket...');
          setTimeout(() => connectAIService(), 1000);
        }
      } else if (startError) {
        console.error('❌ Failed to start session:', startError);
        // Only show error if session is not already in progress or completed
        const errorMsg = startError.message || '';
        if (!errorMsg.includes('IN_PROGRESS') && !errorMsg.includes('COMPLETED')) {
          alert(`Failed to start session: ${errorMsg || 'Unknown error'}`);
          navigate('/sessions');
        } else {
          // Session already in progress, just mark as started
          setSessionStarted(true);
        }
      }
    };

    handleStartSession();
  }, [id, sessionStarted, startingSession, session, startSession, startError, navigate, connectWebSocket]);

  // Cleanup WebSockets on unmount
  useEffect(() => {
    return () => {
      if (wsConnected) {
        console.log('🔌 Disconnecting Django WebSocket on unmount');
        disconnectWebSocket();
      }
      if (aiConnected) {
        console.log('🔌 Disconnecting AI Service WebSocket on unmount');
        disconnectAIService();
      }
    };
  }, [wsConnected, aiConnected, disconnectWebSocket, disconnectAIService]);

  // Timer effect
  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        setSessionDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, sessionStartTime]);

  const handleStartRecording = useCallback(() => {
    setIsRecording(true);
    // Send control message to Django WebSocket
    if (wsConnected) {
      sendControl('start_session');
    }
    // TODO: Start capturing audio from microphone and send to AI Service
    // For now, this is a placeholder - actual audio capture requires MediaRecorder API
    console.log('🎤 Recording started - audio streaming to AI Service');
  }, [wsConnected, sendControl]);

  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
    // Send pause control to Django WebSocket
    if (wsConnected) {
      sendControl('pause_session');
    }
    console.log('🎤 Recording stopped');
  }, [wsConnected, sendControl]);

  const handleEndSession = useCallback(() => {
    if (window.confirm('Are you sure you want to end this session? You will be taken to the completion form.')) {
      // Navigate to end session form
      navigate(`/sessions/${id}/end`);
    }
  }, [id, navigate]);

  if (loading || startingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">{startingSession ? 'Starting session...' : 'Loading session...'}</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load session</p>
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

  // Generate animated waveform bars
  const waveformBars = Array.from({ length: 20 }, (_, index) => (
    <div
      key={index}
      className={`w-1 rounded-full transition-all duration-200 ${isRecording
        ? 'bg-purple-600 animate-pulse'
        : 'bg-gray-300'
        }`}
      style={{
        height: isRecording ? `${Math.random() * 40 + 10}px` : '10px',
        animationDelay: `${index * 50}ms`
      }}
    />
  ));

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
                <h1 className="text-2xl font-bold">Active Session</h1>
                <p className="text-purple-200">{session.patient.full_name}</p>
              </div>
            </div>

            <button
              onClick={handleEndSession}
              className="flex items-center bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              <StopCircle size={20} className="mr-2" />
              End Session
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* WebSocket Connection Status */}
        {(wsError || aiError) && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {wsError && <p className="font-medium">Django WebSocket Error: {wsError}</p>}
            {aiError && <p className="font-medium">AI Service Error: {aiError}</p>}
          </div>
        )}
        {sessionStarted && (
          <div className="mb-4 space-y-2">
            {/* Django WebSocket Status */}
            <div className={`px-4 py-3 rounded-lg border flex items-center justify-between ${wsConnected
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                <p className="font-medium">
                  {wsConnected ? '🟢 Session Control Connected' : '🟡 Connecting to session control...'}
                </p>
                {participants.length > 0 && (
                  <span className="ml-4 text-sm">
                    👥 {participants.length} participant{participants.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {wsSessionStatus && (
                <span className="text-sm font-medium">Status: {wsSessionStatus}</span>
              )}
            </div>

            {/* AI Service WebSocket Status */}
            {aiServiceToken && (
              <div className={`px-4 py-3 rounded-lg border flex items-center justify-between ${aiConnected
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${aiConnected ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                  <p className="font-medium">
                    {aiConnected ? '🤖 AI Transcription Service Connected' : '🟡 Connecting to AI service...'}
                  </p>
                </div>
                <span className="text-sm font-medium">
                  {aiTranscriptionSegments.length} segments
                </span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Session Timer */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Clock className="text-purple-600 mr-2" size={24} />
                  <h2 className="text-xl font-semibold text-gray-900">Session in Progress</h2>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  Duration: {sessionDuration}
                </div>
              </div>
            </div>

            {/* Audio Recording */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <Mic className="text-purple-600 mr-2" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Audio Recording</h2>
              </div>

              <div className="text-center mb-6">
                <p className="text-gray-600 mb-4">
                  Status: <span className={`font-semibold ${isRecording ? 'text-red-600' : 'text-gray-500'}`}>
                    {isRecording ? 'Recording' : 'Paused'}
                  </span>
                </p>

                {/* Waveform Visualization */}
                <div className="flex items-end justify-center h-20 space-x-1 bg-gray-50 rounded-lg p-4 mb-6">
                  {waveformBars}
                </div>

                {/* Recording Controls */}
                <div className="flex justify-center space-x-4">
                  {!isRecording ? (
                    <button
                      onClick={handleStartRecording}
                      className="flex items-center bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
                    >
                      <Play size={20} className="mr-2" />
                      Start Recording
                    </button>
                  ) : (
                    <button
                      onClick={handleStopRecording}
                      className="flex items-center bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors"
                    >
                      <Square size={20} className="mr-2" />
                      Stop Recording
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Real-time Emotion Analysis */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <Activity className="text-purple-600 mr-2" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Real-time Emotion Analysis</h2>
              </div>
              <p className="text-gray-600 text-sm mb-6">Analyzing emotional trends during session</p>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">😌</span>
                  <span className="font-medium text-gray-900 w-16">Calm</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${emotionData.calm}%` }}
                    />
                  </div>
                  <span className="text-purple-600 font-bold w-12">{emotionData.calm}%</span>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-2xl">😰</span>
                  <span className="font-medium text-gray-900 w-16">Anxious</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-orange-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${emotionData.anxious}%` }}
                    />
                  </div>
                  <span className="text-purple-600 font-bold w-12">{emotionData.anxious}%</span>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-2xl">😠</span>
                  <span className="font-medium text-gray-900 w-16">Angry</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-red-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${emotionData.angry}%` }}
                    />
                  </div>
                  <span className="text-purple-600 font-bold w-12">{emotionData.angry}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Live Transcript */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <FileText className="text-purple-600 mr-2" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Live Transcript</h2>
              </div>
              <p className="text-gray-600 text-sm mb-6">Real-time conversation transcription</p>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {transcript.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <FileText size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Waiting for transcription...</p>
                    <p className="text-sm mt-1">Start recording to see live transcript</p>
                    {!aiConnected && aiServiceToken && (
                      <p className="text-xs mt-2 text-yellow-600">Connecting to AI service...</p>
                    )}
                  </div>
                )}
                {transcript.map((item, index) => (
                  <div key={index} className="flex flex-col">
                    <div
                      className={`p-4 rounded-lg max-w-[85%] ${item.speaker === 'Therapist'
                        ? 'bg-purple-600 text-white self-end ml-8'
                        : 'bg-gray-100 text-gray-900 self-start mr-8'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold uppercase tracking-wide ${item.speaker === 'Therapist' ? 'text-purple-200' : 'text-gray-600'
                          }`}>
                          {item.speaker}
                        </span>
                        <span className={`text-xs ${item.speaker === 'Therapist' ? 'text-purple-200' : 'text-gray-500'
                          }`}>
                          {item.time}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Session Notes
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <FileText className="text-purple-600 mr-2" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Session Notes & Observations</h2>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Record your observations and insights during the session
              </p>

              <textarea
                className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                placeholder="Write any additional observations, key insights, or important details to remember for the next session..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div> */}

            {/* Patient Info Card */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <User className="text-purple-600 mr-2" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Patient Information</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-900">Name</p>
                  <p className="text-gray-600">{session.patient.full_name}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Session Type</p>
                  <p className="text-gray-600">{session.session_type}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Location</p>
                  <p className="text-gray-600">{session.location || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveSession;