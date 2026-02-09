// src/hooks/useSessions.ts
// Session-specific hooks for live sessions, analysis, and transcription
import { useState, useEffect, useCallback, useRef } from 'react';
import sessionsService from '../services/sessions.service';
import type {
  SessionTranscription,
  SessionEmotionalAnalysis,
  StartSessionResponse,
  EndSessionResponse,
} from '../types/session';
import type { TherapistError } from '../types/therapist';

/**
 * Hook for starting a session and receiving the AI service token
 */
export const useStartSession = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TherapistError | null>(null);
  const [result, setResult] = useState<StartSessionResponse | null>(null);

  const startSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('[useSessions] 🚀 Starting AI Service session...');

      // Call AI Service directly
      const data = await sessionsService.startSession(sessionId);
      console.log('[useSessions] ✅ AI Service session started:', data);

      // Store AI service token if provided
      if (data.ai_service_token) {
        localStorage.setItem('ai_service_token', data.ai_service_token);
        console.log('[useSessions] 💾 Stored AI Service token');
      }

      setResult(data);
      return data;
    } catch (err) {
      console.error('[useSessions] ❌ Failed to start session:', err);
      setError(err as TherapistError);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { startSession, result, loading, error, clearError: () => setError(null) };
};

/**
 * Hook for ending a session (with AI analysis trigger)
 */
export const useEndSession = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TherapistError | null>(null);
  const [result, setResult] = useState<EndSessionResponse | null>(null);

  const endSession = useCallback(
    async (
      sessionId: string,
      data: {
        session_notes?: string;
        patient_goals?: string;
        patient_mood_after?: number;
        homework_assigned?: string;
        next_session_goals?: string;
        session_effectiveness?: number;
      }
    ) => {
      setLoading(true);
      setError(null);
      try {
        // 1. End session in Django backend
        const response = await sessionsService.endSession(sessionId, data);

        // 2. Stop session in AI Service if token exists
        const aiToken = localStorage.getItem('ai_service_token');
        if (aiToken) {
          console.log('[useSessions] Stopping AI Service session...');
          try {
            await sessionsService.stopAISession(sessionId, aiToken);
            console.log('[useSessions] AI Service session stopped successfully');
            localStorage.removeItem('ai_service_token');
          } catch (stopErr) {
            console.warn('[useSessions] Failed to stop AI Service session (non-critical):', stopErr);
          }
        }

        setResult(response);
        return response;
      } catch (err) {
        console.error('[useSessions] Failed to end session:', err);
        setError(err as TherapistError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { endSession, result, loading, error, clearError: () => setError(null) };
};

/**
 * Hook for fetching session emotional analysis
 */
export const useSessionAnalysis = (sessionId: string) => {
  const [analysis, setAnalysis] = useState<SessionEmotionalAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TherapistError | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await sessionsService.getEmotionalAnalysis(sessionId);
      setAnalysis(data);
    } catch (err) {
      setError(err as TherapistError);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  return { analysis, loading, error, refetch: fetchAnalysis };
};

/**
 * Hook for fetching session transcription
 */
export const useSessionTranscription = (sessionId: string) => {
  const [transcription, setTranscription] = useState<SessionTranscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TherapistError | null>(null);

  const fetchTranscription = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await sessionsService.getTranscription(sessionId);
      setTranscription(data);
    } catch (err) {
      setError(err as TherapistError);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchTranscription();
  }, [fetchTranscription]);

  return { transcription, loading, error, refetch: fetchTranscription };
};

/**
 * Hook for managing a live WebSocket session connection.
 * Handles connection lifecycle, heartbeats, and reconnection.
 */
export const useLiveSession = (
  roomId: string | null,
  options: {
    autoConnect?: boolean;
    heartbeatIntervalMs?: number;
  } = {}
) => {
  const { autoConnect = false, heartbeatIntervalMs = 30_000 } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [connected, setConnected] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [participants, setParticipants] = useState<
    { user_id: string; user_name: string; user_type: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (!roomId) return;
    const token = localStorage.getItem('access_token') || '';

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = sessionsService.createWebSocketConnection(roomId, token, {
      onOpen: () => {
        setConnected(true);
        setError(null);
        // Start heartbeat
        heartbeatRef.current = setInterval(() => {
          sessionsService.sendHeartbeat(ws);
        }, heartbeatIntervalMs);
      },
      onMessage: (data) => {
        setMessages((prev) => [...prev, data]);
      },
      onStatusChange: (status) => {
        setSessionStatus(status);
      },
      onUserJoined: (user) => {
        setParticipants((prev) => [...prev.filter((p) => p.user_id !== user.user_id), user]);
      },
      onUserLeft: (user) => {
        setParticipants((prev) => prev.filter((p) => p.user_id !== user.user_id));
      },
      onError: (err) => {
        setError(err.message);
      },
      onClose: () => {
        setConnected(false);
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
      },
    });

    wsRef.current = ws;
  }, [roomId, heartbeatIntervalMs]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current) sessionsService.sendMessage(wsRef.current, message);
  }, []);

  const sendControl = useCallback(
    (action: 'start_session' | 'end_session' | 'pause_session') => {
      if (wsRef.current) sessionsService.sendControl(wsRef.current, action);
    },
    []
  );

  const sendAudio = useCallback((audioData: string) => {
    if (wsRef.current) sessionsService.sendAudioData(wsRef.current, audioData);
  }, []);

  // Auto-connect if requested
  useEffect(() => {
    if (autoConnect && roomId) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, roomId, connect, disconnect]);

  return {
    connected,
    sessionStatus,
    messages,
    participants,
    error,
    connect,
    disconnect,
    sendMessage,
    sendControl,
    sendAudio,
  };
};

/**
 * Hook for connecting to AI Service WebSocket for live transcription and emotion analysis
 * This is separate from the Django WebSocket (useLiveSession)
 * Uses aiServiceUrl from config.ts
 */
export const useAIServiceWebSocket = (
  sessionId: string | null,
  aiServiceToken: string | null,
  options: {
    autoConnect?: boolean;
  } = {}
) => {
  const { autoConnect = false } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkIndexRef = useRef<number>(0);

  const [connected, setConnected] = useState(false);
  const [transcriptionSegments, setTranscriptionSegments] = useState<
    Array<{
      id: string;
      speaker: string;
      text: string;
      start_time: number;
      end_time: number;
      emotion?: string;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    console.log('[AI Service WS] Connect called with:', { sessionId, aiServiceToken: aiServiceToken ? 'present' : 'missing' });

    if (!sessionId || !aiServiceToken) {
      console.warn('[AI Service WS] Missing required parameters - sessionId:', sessionId, 'token:', aiServiceToken ? 'present' : 'missing');
      return;
    }

    // Clean up existing connection
    if (wsRef.current) {
      console.log('[AI Service WS] Closing existing connection');
      wsRef.current.close();
    }

    console.log('[AI Service WS] Creating WebSocket connection...');
    const ws = sessionsService.createAIServiceWebSocket(
      sessionId,
      aiServiceToken,
      {
        onOpen: () => {
          setConnected(true);
          setError(null);
          console.log('[AI Service WS] Connected - ready to stream audio');

          // Start heartbeat
          heartbeatRef.current = setInterval(() => {
            if (wsRef.current) {
              sessionsService.sendAIServiceHeartbeat(wsRef.current);
            }
          }, 30000); // Every 30 seconds
        },
        onTranscription: (segment) => {
          console.log('[AI Service WS] New transcription segment:', segment);
          setTranscriptionSegments((prev) => [...prev, segment]);
        },
        onError: (err) => {
          console.error('[AI Service WS] Error:', err);
          setError(err.message);
        },
        onClose: () => {
          setConnected(false);
          if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
          }
        },
      }
    );

    wsRef.current = ws;
  }, [sessionId, aiServiceToken]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    chunkIndexRef.current = 0;
  }, []);

  const sendAudioChunk = useCallback((audioData: string, sampleRate: number = 16000, format: string = 'wav') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sessionsService.sendAudioChunk(wsRef.current, audioData, chunkIndexRef.current, sampleRate, format);
      chunkIndexRef.current += 1;
    } else {
      console.warn('[AI Service WS] Cannot send audio - WebSocket not open');
    }
  }, []);

  const clearTranscription = useCallback(() => {
    setTranscriptionSegments([]);
    chunkIndexRef.current = 0;
  }, []);

  // Auto-connect if requested
  useEffect(() => {
    if (autoConnect && sessionId && aiServiceToken) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, sessionId, aiServiceToken, connect, disconnect]);

  return {
    connected,
    transcriptionSegments,
    error,
    connect,
    disconnect,
    sendAudioChunk,
    clearTranscription,
  };
};
