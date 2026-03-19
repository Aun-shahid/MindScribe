// src/pages/ActiveSession.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { SessionDetail } from '../types/session';
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
import sessionsService from '../services/sessions.service';

const EMOTION_UI_CONFIG: Record<
  string,
  { label: string; emoji: string; colorClass: string }
> = {
  joy: { label: 'Joy', emoji: '😊', colorClass: 'bg-emerald-500' },
  sadness: { label: 'Sadness', emoji: '😢', colorClass: 'bg-blue-500' },
  anger: { label: 'Anger', emoji: '😠', colorClass: 'bg-red-500' },
  neutral: { label: 'Neutral', emoji: '😐', colorClass: 'bg-gray-500' },
  disgust: { label: 'Disgust', emoji: '🤢', colorClass: 'bg-lime-600' },
  fear: { label: 'Fear', emoji: '😨', colorClass: 'bg-amber-500' },
  surprise: { label: 'Surprise', emoji: '😮', colorClass: 'bg-fuchsia-500' },
};

const EMOTION_ORDER = ['joy', 'sadness', 'anger', 'neutral', 'disgust', 'fear', 'surprise'];

const ActiveSession: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Session state
  const [isRecording, setIsRecording] = useState(false);
  const [sessionDuration, setSessionDuration] = useState('00:00');
  const [sessionStartTime] = useState(new Date());
  const [sessionStarted, setSessionStarted] = useState(false);
  const [aiServiceToken, setAiServiceToken] = useState<string | null>(null);
  // const [websocketRoomId, setWebsocketRoomId] = useState<string | null>(null);
  
  const location = useLocation();
  const initialSession = (location.state as { session?: SessionDetail })?.session;
  
  // Use session hooks
  // const { session, loading, error } = useSessionDetail(id!);
  const { session, loading, error, fetchSession } = useSessionDetail(id!);
  const { startSession, loading: startingSession, error: startError } = useStartSession();
  const { analysis } = useSessionAnalysis(sessionStarted ? id! : '');
  // Note: transcription from analysis endpoint is loaded after session completes
  // We use AI Service WebSocket for live transcription instead
  const websocketRoomId = session?.websocket_room_id ?? null;
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
    sendAudioChunk,
  } = useAIServiceWebSocket(
    sessionStarted ? id! : null,
    aiServiceToken,
    { autoConnect: false }
  );

  const toDisplaySpeaker = useCallback((speaker: string) => {
    if (!speaker) return 'Speaker';
    if (speaker.startsWith('SPEAKER_')) {
      const suffix = speaker.replace('SPEAKER_', '');
      const index = Number.parseInt(suffix, 10);
      if (!Number.isNaN(index)) {
        return `Speaker ${index + 1}`;
      }
    }
    return speaker;
  }, []);

  const getEmotionKey = useCallback((emotion: unknown): string => {
    if (!emotion) return '';
    if (typeof emotion === 'string') return emotion.toLowerCase();
    if (
      typeof emotion === 'object' &&
      emotion !== null &&
      'final_emotion' in emotion &&
      typeof (emotion as { final_emotion?: string }).final_emotion === 'string'
    ) {
      return (emotion as { final_emotion: string }).final_emotion.toLowerCase();
    }
    return '';
  }, []);

  const toEmotionLabel = useCallback((emotion: unknown): string => {
    const key = getEmotionKey(emotion);
    if (!key) return '';
    return EMOTION_UI_CONFIG[key]?.label || `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  }, [getEmotionKey]);

  // Use live transcription from AI Service WebSocket if available
  const transcript = aiTranscriptionSegments.length > 0
    ? aiTranscriptionSegments.map((seg) => ({
      speaker: toDisplaySpeaker(seg.speaker),
      text: seg.text_english || seg.text || seg.text_urdu || '',
      time: `${Math.floor(seg.start_time / 60)}:${String(Math.floor(seg.start_time % 60)).padStart(2, '0')}`,
      emotion: toEmotionLabel(seg.emotion),
    }))
    : [];

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const pendingSamplesRef = useRef<number[]>([]);
  const chunkSamplesRef = useRef<number>(160000); // 2s @ 16kHz

  const encodeInt16ToBase64 = (samples: Int16Array): string => {
    const bytes = new Uint8Array(samples.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const downsampleTo16k = (input: Float32Array, inputRate: number): Int16Array => {
    if (inputRate === 16000) {
      const output = new Int16Array(input.length);
      for (let i = 0; i < input.length; i += 1) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return output;
    }

    const ratio = inputRate / 16000;
    const outputLength = Math.max(1, Math.floor(input.length / ratio));
    const output = new Int16Array(outputLength);
    let inputOffset = 0;

    for (let i = 0; i < outputLength; i += 1) {
      const nextOffset = Math.min(input.length, Math.floor((i + 1) * ratio));
      let total = 0;
      let count = 0;

      for (let j = inputOffset; j < nextOffset; j += 1) {
        total += input[j];
        count += 1;
      }

      const avg = count > 0 ? total / count : input[Math.min(inputOffset, input.length - 1)] || 0;
      const s = Math.max(-1, Math.min(1, avg));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      inputOffset = nextOffset;
    }

    return output;
  };

  const stopAudioCapture = useCallback(async () => {
    processorNodeRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    processorNodeRef.current = null;
    sourceNodeRef.current = null;
    pendingSamplesRef.current = [];
  }, []);

  const startAudioCapture = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
      video: false,
    });

    mediaStreamRef.current = stream;
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    const sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNodeRef.current = sourceNode;

    // ScriptProcessorNode is deprecated but still broadly supported and simple here.
    const processorNode = audioContext.createScriptProcessor(4096, 1, 1);
    processorNodeRef.current = processorNode;

    processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
      const input = event.inputBuffer.getChannelData(0);
      const pcm16 = downsampleTo16k(input, audioContext.sampleRate);

      const pending = pendingSamplesRef.current;
      for (let i = 0; i < pcm16.length; i += 1) {
        pending.push(pcm16[i]);
      }

      while (pending.length >= chunkSamplesRef.current) {
        const chunkSamples = pending.splice(0, chunkSamplesRef.current);
        const chunk = new Int16Array(chunkSamples);
        const base64 = encodeInt16ToBase64(chunk);
        sendAudioChunk(base64, 16000, 'pcm16');
      }
    };

    sourceNode.connect(processorNode);
    processorNode.connect(audioContext.destination);
  }, [sendAudioChunk]);

  // Build emotion percentages strictly from backend emotion keys.
  // Prefer live WS segment emotions; fallback to analysis mood_distribution.
  const emotionDistribution = (() => {
    const liveCounts = EMOTION_ORDER.reduce<Record<string, number>>((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});

    aiTranscriptionSegments.forEach((seg) => {
      const key = getEmotionKey(seg.emotion);
      if (key in liveCounts) {
        liveCounts[key] += 1;
      }
    });

    const liveTotal = Object.values(liveCounts).reduce((sum, n) => sum + n, 0);
    if (liveTotal > 0) {
      return EMOTION_ORDER.map((key) => ({
        key,
        percentage: Math.min(100, Math.max(0, Math.round((liveCounts[key] / liveTotal) * 100))),
      }));
    }

    const fallback = analysis?.mood_distribution || {};
    const fallbackCounts = EMOTION_ORDER.reduce<Record<string, number>>((acc, key) => {
      acc[key] = Number(fallback[key] || 0);
      return acc;
    }, {});

    const fallbackTotal = Object.values(fallbackCounts).reduce((sum, n) => sum + n, 0);
    if (fallbackTotal <= 0) {
      return EMOTION_ORDER.map((key) => ({ key, percentage: 0 }));
    }

    return EMOTION_ORDER.map((key) => ({
      key,
      percentage: Math.min(100, Math.max(0, Math.round((fallbackCounts[key] / fallbackTotal) * 100))),
    }));
  })();

  // Check if session is already completed and redirect to detail page
  useEffect(() => {
  if (session && session.status === 'COMPLETED' && !startingSession) {
    console.log('⚠️ Session is already completed, redirecting to detail page');
    alert('This session has already been completed. You will be redirected to the session details page.');
    navigate(`/sessions/${id}`);
  }
}, [session, id, navigate, startingSession]);

  // Start session or initialize from passed state
  const isInitializing = useRef(false);

  useEffect(() => {
  const initializeSession = async () => {
    if (!id || sessionStarted || startingSession || isInitializing.current) return;

    const currentSession = session || initialSession;
    if (!currentSession) return;

    isInitializing.current = true;

    try {
      if (currentSession.status === 'COMPLETED') return;

      if (currentSession.status === 'IN_PROGRESS') {
        console.log('ℹ️ Session already in progress, reconnecting...');
        setSessionStarted(true);
        const storedToken = localStorage.getItem('ai_service_token');
        if (storedToken) setAiServiceToken(storedToken);
        return;
      }

      if (['UPCOMING', 'RESCHEDULED', 'REQUESTED'].includes(currentSession.status)) {
        // Always re-fetch latest status before calling /start/
        const latest = await sessionsService.getSessionDetail(id);

        if (latest.status === 'IN_PROGRESS') {
          console.warn('ℹ️ Session already IN_PROGRESS server-side, skipping /start/');
          setSessionStarted(true);
          const storedToken = localStorage.getItem('ai_service_token');
          if (storedToken) setAiServiceToken(storedToken);
          return;
        }

        if (!['UPCOMING', 'RESCHEDULED', 'REQUESTED'].includes(latest.status)) {
          alert(`Session cannot be started. Status is: ${latest.status}`);
          navigate('/sessions');
          return;
        }

        const result = await startSession(id);
        console.log('🎯 startSession result:', JSON.stringify(result, null, 2));
        if (result) {
          setSessionStarted(true);
          if (result.ai_service_token) setAiServiceToken(result.ai_service_token);
          // Re-fetch so session.websocket_room_id is up to date
          await fetchSession();
        } else {
          alert(`Failed to start session: ${startError?.message}`);
          navigate('/sessions');
        }
      }
    } finally {
      isInitializing.current = false;
    }
  };

  initializeSession();
}, [id, session]); 
  // Connect Django session-control WebSocket when room ID becomes available.
  useEffect(() => {
    if (sessionStarted && websocketRoomId && !wsConnected) {
      console.log('🔌 Connecting Django WS with roomId:', websocketRoomId);
      console.log('🔌 session.websocket_room_id:', session?.websocket_room_id);
      connectWebSocket();
    }
  }, [sessionStarted, websocketRoomId, wsConnected, connectWebSocket, session]);

  // Auto-connect to AI Service WebSocket when token becomes available
  useEffect(() => {
    if (sessionStarted && aiServiceToken && id && !aiConnected) {
      console.log('🔌 AI Service token available, connecting WebSocket...');
      setTimeout(() => connectAIService(), 500);
    }
  }, [sessionStarted, aiServiceToken, id, aiConnected, connectAIService]);

  // Cleanup WebSockets on unmount
  useEffect(() => {
    return () => {
      stopAudioCapture();
      disconnectWebSocket();
      disconnectAIService();
    };
  }, [disconnectWebSocket, disconnectAIService, stopAudioCapture]);

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

  const handleStartRecording = useCallback(async () => {
    

    setIsRecording(true);
    // Send control message to Django WebSocket
    if (wsConnected) {
      sendControl('start_session');
    }

    try {
      await startAudioCapture();
      console.log('🎤 Recording started - audio streaming to AI Service');
    } catch (captureError) {
      console.error('❌ Failed to access microphone:', captureError);
      setIsRecording(false);
      alert('Unable to access microphone. Please allow microphone access and try again.');
    }
  }, [ wsConnected, sendControl, startAudioCapture]);

  const handleStopRecording = useCallback(async () => {
    setIsRecording(false);
    // Send pause control to Django WebSocket
    if (wsConnected) {
      sendControl('pause_session');
    }
    await stopAudioCapture();
    console.log('🎤 Recording stopped');
  }, [wsConnected, sendControl, stopAudioCapture]);

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
            {/* Django WebSocket Status - only show if websocket_room_id exists */}
            {websocketRoomId && (
              <div className={`px-4 py-3 rounded-lg border flex items-center justify-between ${wsConnected
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`}></div>
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
            )}

            {/* AI Service WebSocket Status - show when we have the token */}
            {aiServiceToken && (
              <div className={`px-4 py-3 rounded-lg border flex items-center justify-between ${aiConnected
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${aiConnected ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`}></div>
                  <p className="font-medium">
                    {aiConnected ? '🤖 AI Transcription Service Connected' : '🟡 Connecting to AI transcription service...'}
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
                {emotionDistribution.map(({ key, percentage }) => {
                  const config = EMOTION_UI_CONFIG[key];
                  if (!config) return null;

                  return (
                    <div key={key} className="flex items-center space-x-4">
                      <span className="text-2xl">{config.emoji}</span>
                      <span className="font-medium text-gray-900 w-20">{config.label}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`${config.colorClass} h-3 rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-purple-600 font-bold w-12">{percentage}%</span>
                    </div>
                  );
                })}
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
                      {item.emotion && (
                        <p className={`text-xs mt-2 ${item.speaker === 'Therapist' ? 'text-purple-200' : 'text-gray-500'}`}>
                          Emotion: {item.emotion}
                        </p>
                      )}
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