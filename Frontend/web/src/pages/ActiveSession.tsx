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
  FileText,
  StopCircle
} from 'lucide-react';
import { useSessionDetail } from '../hooks/useSessions';
import { useStartSession, useAIServiceWebSocket } from '../hooks/useSessions';
import sessionsService from '../services/sessions.service';
import { THERAPIST_PAGE_CANVAS } from '../constants/pageShell';
import { emitAppToast } from '../utils/events';

const ActiveSession: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Session state
  const [isRecording, setIsRecording] = useState(false);
  const [sessionDuration, setSessionDuration] = useState('00:00');
  const [sessionStartTime] = useState(new Date());
  const [sessionStarted, setSessionStarted] = useState(false);
  const [aiWebsocketToken, setAiWebsocketToken] = useState<string | null>(null);
  // const [websocketRoomId, setWebsocketRoomId] = useState<string | null>(null);
  
  const location = useLocation();
  const initialSession = (location.state as { session?: SessionDetail })?.session;
  
  // Use session hooks
  // const { session, loading, error } = useSessionDetail(id!);
  const { session, loading, error, fetchSession } = useSessionDetail(id!);
  const { startSession, loading: startingSession, error: startError } = useStartSession();
  // Note: transcription from analysis endpoint is loaded after session completes
  // We use AI Service WebSocket for live transcription instead

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
    aiWebsocketToken,
    { autoConnect: false }
  );

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const pendingSamplesRef = useRef<number[]>([]);
  const chunkSamplesRef = useRef<number>(32000); // 2s @ 16kHz
  const chunkQueueRef = useRef<Array<{ audioData: string | null; sampleRate: number; format: string; capturedAt: number }>>([]);
  const [uploadDelayMs, setUploadDelayMs] = useState(0);
  const [queuedChunkCount, setQueuedChunkCount] = useState(0);
  const [endSessionConfirmOpen, setEndSessionConfirmOpen] = useState(false);

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

  const flushQueuedAudioChunks = useCallback(() => {
    const queue = chunkQueueRef.current;
    while (queue.length > 0) {
      const packet = queue.shift();
      if (!packet) break;
      sendAudioChunk(packet.audioData, packet.sampleRate, packet.format);
    }

    setQueuedChunkCount(0);
  }, [sendAudioChunk]);

  const enqueuePendingAudioChunk = useCallback(() => {
    const pending = pendingSamplesRef.current;
    if (!pending.length) return;

    const chunk = new Int16Array(pending);
    const base64 = encodeInt16ToBase64(chunk);
    chunkQueueRef.current.push({
      audioData: base64,
      sampleRate: 16000,
      format: 'pcm16',
      capturedAt: Date.now(),
    });

    pendingSamplesRef.current = [];
    setQueuedChunkCount(chunkQueueRef.current.length);
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
    await audioContext.resume();

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

        // Always queue the actual audio chunk so the AI service receives usable PCM.
        // Silence can still be handled downstream by transcription/transcription cleanup.
        chunkQueueRef.current.push({
          audioData: base64,
          sampleRate: 16000,
          format: 'pcm16',
          capturedAt: Date.now(),
        });

        setQueuedChunkCount(chunkQueueRef.current.length);
      }
    };

    sourceNode.connect(processorNode);
    processorNode.connect(audioContext.destination);
  }, []);

  // Smoothly flush queued chunks to reduce burstiness when browser/network lags.
  useEffect(() => {
    if (!isRecording || !aiConnected) return;

    const interval = window.setInterval(() => {
      const queue = chunkQueueRef.current;
      if (!queue.length) return;

      // Adaptive burst: recover backlog faster if queue grows.
      const burst = queue.length > 8 ? 3 : queue.length > 4 ? 2 : 1;

      for (let i = 0; i < burst; i += 1) {
        const packet = queue.shift();
        if (!packet) break;

        const delay = Date.now() - packet.capturedAt;
        setUploadDelayMs((prev) => Math.round(prev * 0.75 + delay * 0.25));
        sendAudioChunk(packet.audioData, packet.sampleRate, packet.format);
      }

      setQueuedChunkCount(queue.length);
    }, 250);

    return () => window.clearInterval(interval);
  }, [isRecording, aiConnected, sendAudioChunk]);

  // Check if session is already completed and redirect to detail page
  useEffect(() => {
  if (session && session.status === 'COMPLETED' && !startingSession) {
    console.log('⚠️ Session is already completed, redirecting to detail page');
    emitAppToast({
      title: 'Session already completed',
      message: 'Redirecting to session details…',
      variant: 'info',
    });
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
        console.log('ℹ️ Session already IN_PROGRESS, re-initializing AI session...');
        const result = await startSession(id);
        if (result) {
          setSessionStarted(true);
          const wsToken = result.ai_websocket_token || result.websocket_token || null;
          if (wsToken) {
            setAiWebsocketToken(wsToken);
            localStorage.setItem('ai_websocket_token', wsToken);
          }
          await fetchSession();
        } else {
          emitAppToast({
            title: 'Could not resume session',
            message: startError?.message ?? 'Failed to re-initialize active session.',
            variant: 'error',
          });
          navigate('/sessions');
        }
        return;
      }

      if (['UPCOMING', 'RESCHEDULED', 'REQUESTED'].includes(currentSession.status)) {
        // Always re-fetch latest status before calling /start/
        const latest = await sessionsService.getSessionDetail(id);

        if (latest.status === 'IN_PROGRESS') {
          console.warn('ℹ️ Session already IN_PROGRESS server-side, skipping /start/');
          setSessionStarted(true);
          const storedWsToken = localStorage.getItem('ai_websocket_token');
          if (storedWsToken) setAiWebsocketToken(storedWsToken);
          return;
        }

        if (!['UPCOMING', 'RESCHEDULED', 'REQUESTED'].includes(latest.status)) {
          emitAppToast({
            title: 'Cannot start session',
            message: `Current status is: ${latest.status}`,
            variant: 'error',
          });
          navigate('/sessions');
          return;
        }

        const result = await startSession(id);
        console.log('🎯 startSession result:', JSON.stringify(result, null, 2));
        if (result) {
          setSessionStarted(true);
          const wsToken = result.ai_websocket_token || result.websocket_token || null;
          if (wsToken) {
            setAiWebsocketToken(wsToken);
            localStorage.setItem('ai_websocket_token', wsToken);
          }
          // Re-fetch so session.websocket_room_id is up to date
          await fetchSession();
        } else {
          emitAppToast({
            title: 'Could not start session',
            message: startError?.message ?? 'Please try again.',
            variant: 'error',
          });
          navigate('/sessions');
        }
      }
    } finally {
      isInitializing.current = false;
    }
  };

  initializeSession();
}, [id, session, sessionStarted, startingSession, startError?.message, startSession, navigate, fetchSession, initialSession]); 

  // Auto-connect to AI Service WebSocket when token becomes available
  useEffect(() => {
    if (sessionStarted && aiWebsocketToken && id && !aiConnected) {
      console.log('🔌 AI Service token available, connecting WebSocket...');
      setTimeout(() => connectAIService(), 500);
    }
  }, [sessionStarted, aiWebsocketToken, id, aiConnected, connectAIService]);

  // Cleanup WebSockets on unmount
  useEffect(() => {
    return () => {
      enqueuePendingAudioChunk();
      flushQueuedAudioChunks();
      stopAudioCapture();
      disconnectAIService();
    };
  }, [disconnectAIService, enqueuePendingAudioChunk, flushQueuedAudioChunks, stopAudioCapture]);

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

    try {
      await startAudioCapture();
      console.log('🎤 Recording started - audio streaming to AI Service');
    } catch (captureError) {
      console.error('❌ Failed to access microphone:', captureError);
      setIsRecording(false);
      emitAppToast({
        title: 'Microphone access needed',
        message: 'Please allow microphone access and try again.',
        variant: 'error',
      });
    }
  }, [startAudioCapture]);

  const handleStopRecording = useCallback(async () => {
    setIsRecording(false);
    enqueuePendingAudioChunk();
    flushQueuedAudioChunks();
    await stopAudioCapture();
    chunkQueueRef.current = [];
    setQueuedChunkCount(0);
    console.log('🎤 Recording stopped');
  }, [enqueuePendingAudioChunk, flushQueuedAudioChunks, stopAudioCapture]);

  const handleEndSessionConfirm = useCallback(async () => {
    setEndSessionConfirmOpen(false);
    if (isRecording) {
      setIsRecording(false);
      enqueuePendingAudioChunk();
      flushQueuedAudioChunks();
      await stopAudioCapture();
    }
    navigate(`/sessions/${id}/end`);
  }, [enqueuePendingAudioChunk, flushQueuedAudioChunks, id, isRecording, navigate, stopAudioCapture]);

  if (loading || startingSession) {
    return (
      <div className={`${THERAPIST_PAGE_CANVAS} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">{startingSession ? 'Starting session...' : 'Loading session...'}</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className={`${THERAPIST_PAGE_CANVAS} flex items-center justify-center`}>
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
    <div className={THERAPIST_PAGE_CANVAS}>
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-purple-300/35 bg-gradient-to-r from-[#43275a] via-[#5c4092] to-[#6d4ea8] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 rounded-full border border-white/35 bg-white/20 p-2 backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                <ChevronLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Active Session</h1>
                <p className="text-purple-200">{session.patient.full_name}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEndSessionConfirmOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300/40 bg-red-600/75 px-4 py-2 font-semibold text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-red-600/90"
            >
              <StopCircle size={18} />
              End Session
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-1">
        {/* WebSocket Connection Status */}
        {aiError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {aiError && <p className="font-medium">AI Service Error: {aiError}</p>}
          </div>
        )}
        {sessionStarted && (
          <div className="mb-4 space-y-2">
            {/* AI Service WebSocket Status - show when we have the token */}
            {aiWebsocketToken && (
              <div className={`px-4 py-3 rounded-xl border flex items-center justify-between ${aiConnected
                ? 'bg-purple-50 border-purple-200 text-purple-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${aiConnected ? 'bg-purple-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`}></div>
                  <p className="font-medium">
                    {aiConnected ? '🤖 AI Transcription Service Connected' : '🟡 Connecting to AI transcription service...'}
                  </p>
                </div>
                <div className="text-right text-sm font-medium">
                  <p>{aiTranscriptionSegments.length} segments</p>
                  {aiConnected && isRecording && (
                      <p className={`${uploadDelayMs > 3000 ? 'text-amber-700' : 'text-purple-700'} text-xs`}>
                      Delay: {uploadDelayMs}ms • Queue: {queuedChunkCount}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Session Timer */}
            <div className="rounded-xl border border-purple-100 bg-white shadow-md p-6">
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
            <div className="rounded-xl border border-purple-100 bg-white shadow-md p-6">
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
                <div className="mb-6 flex h-20 items-end justify-center space-x-1 rounded-lg bg-purple-50/60 p-4">
                  {waveformBars}
                </div>

                {/* Recording Controls */}
                <div className="flex justify-center space-x-4">
                  {!isRecording ? (
                    <button
                      onClick={handleStartRecording}
                      className="inline-flex items-center rounded-lg border border-purple-300/40 bg-[#5c4092] px-6 py-3 text-white shadow-sm transition-colors hover:bg-[#43275a]"
                    >
                      <Play size={20} className="mr-2" />
                      Start Recording
                    </button>
                  ) : (
                    <button
                      onClick={handleStopRecording}
                      className="inline-flex items-center rounded-lg border border-purple-300/40 bg-[#431657] px-6 py-3 text-white shadow-sm transition-colors hover:bg-[#3a124a]"
                    >
                      <Square size={20} className="mr-2" />
                      Stop Recording
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Recording Status */}
            <div className="rounded-xl border border-purple-100 bg-white shadow-md p-6">
              <div className="flex items-center mb-4">
                <FileText className="text-purple-600 mr-2" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Session Recording</h2>
              </div>

              <div className="text-center py-8">
                {isRecording ? (
                  <div className="space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                      <div className="w-8 h-8 bg-red-500 rounded-full animate-pulse" />
                    </div>
                    <p className="text-gray-700 font-medium">Recording in progress...</p>
                    <p className="text-gray-500 text-sm">Audio is being captured and sent to the AI service.</p>
                    <p className="text-gray-400 text-xs">Transcript will be generated when the session ends.</p>
                    {aiConnected && (
                      <p className="text-purple-600 text-xs">
                        🤖 AI Service connected — {queuedChunkCount > 0 ? `${queuedChunkCount} chunks queued` : 'streaming'}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 text-gray-400">
                    <FileText size={48} className="mx-auto opacity-30" />
                    <p>Press Start Recording to begin the session.</p>
                    <p className="text-sm">The full transcript will be available after the session ends.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Session Notes
            <div className="rounded-xl border border-purple-100 bg-white shadow-md p-6">
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

      {endSessionConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="active-session-end-title"
          aria-describedby="active-session-end-desc"
          onClick={() => setEndSessionConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="active-session-end-title" className="text-lg font-semibold text-gray-900">
              End this session?
            </h3>
            <p id="active-session-end-desc" className="mt-2 text-sm text-gray-600 leading-relaxed">
              Are you sure you want to end this session? You will be taken to the completion form.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEndSessionConfirmOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleEndSessionConfirm()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                End session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveSession;