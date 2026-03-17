// src/hooks/useSessions.ts
// Session-specific hooks for live sessions, analysis, and transcription
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import sessionsService from '../services/sessions.service';
import type {
  SessionTranscription,
  SessionEmotionalAnalysis,
  StartSessionResponse,
  EndSessionResponse,
  SessionType,
  SessionDetail,
  SessionFilter,
  SessionFormData,
  CalendarSession,
  SessionNotes,
  SessionUpdate,
  SessionConsentData,
  SessionConsentParams,
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

  // Form states moved from useTherapist.ts
  const [sessionNotes, setSessionNotes] = useState('');
  const [patientMoodAfter, setPatientMoodAfter] = useState('');
  const [homeworkAssigned, setHomeworkAssigned] = useState('');
  const [nextSessionGoals, setNextSessionGoals] = useState('');
  const [sessionEffectiveness, setSessionEffectiveness] = useState('');
  const navigate = useNavigate();

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

  const handleCompleteSession = useCallback(async (sessionId: string) => {
    const data = {
      session_notes: sessionNotes,
      patient_mood_after: parseInt(patientMoodAfter) || 5,
      homework_assigned: homeworkAssigned,
      next_session_goals: nextSessionGoals,
      session_effectiveness: parseInt(sessionEffectiveness) || 5,
    };

    const res = await endSession(sessionId, data);
    if (res) {
      navigate('/sessions');
    }
  }, [sessionNotes, patientMoodAfter, homeworkAssigned, nextSessionGoals, sessionEffectiveness, endSession, navigate]);

  const resetForm = useCallback(() => {
    setSessionNotes('');
    setPatientMoodAfter('');
    setHomeworkAssigned('');
    setNextSessionGoals('');
    setSessionEffectiveness('');
  }, []);

  return {
    endSession,
    result,
    loading,
    error,
    clearError: () => setError(null),
    // Form props
    sessionNotes,
    patientMoodAfter,
    homeworkAssigned,
    nextSessionGoals,
    sessionEffectiveness,
    handleCompleteSession,
    setSessionNotes,
    setPatientMoodAfter,
    setHomeworkAssigned,
    setNextSessionGoals,
    setSessionEffectiveness,
    resetForm,
  };
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
 * Hook for managing all sessions for a therapist
 */
export const useSessions = (initialFilter: SessionFilter = {}) => {
  const [sessions, setSessions] = useState<SessionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TherapistError | null>(null);
  const [filter, setFilter] = useState<SessionFilter>(initialFilter);

  const fetchSessions = useCallback(async (filterOverride?: SessionFilter) => {
    try {
      setLoading(true);
      setError(null);
      const currentFilter = filterOverride || filter;
      // Note: sessionsService needs to be updated to support getSessions if not already
      // For now using api directly or updating sessionsService is required
      // Since I'm refactoring, I'll assume sessionsService.getSessions exists or I'll add it
      const data = await sessionsService.getSessions(currentFilter);
      setSessions(data);
    } catch (err) {
      setError(err as TherapistError);
      console.error('Sessions fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const updateFilter = useCallback((newFilter: SessionFilter, reset = false) => {
    if (reset) {
      setFilter({ ...newFilter });
    } else {
      setFilter(prev => ({ ...prev, ...newFilter }));
    }
  }, []);

  const createSession = useCallback(async (sessionData: SessionFormData): Promise<SessionType | null> => {
    try {
      setError(null);
      const newSession = await sessionsService.createSession(sessionData);
      await fetchSessions();
      return newSession;
    } catch (err) {
      setError(err as TherapistError);
      return null;
    }
  }, [fetchSessions]);

  const updateSession = useCallback(async (sessionId: string, updateData: SessionUpdate): Promise<boolean> => {
    try {
      setError(null);
      await sessionsService.updateSession(sessionId, updateData);
      await fetchSessions();
      return true;
    } catch (err) {
      setError(err as TherapistError);
      return false;
    }
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    filter,
    updateFilter,
    fetchSessions,
    createSession,
    updateSession,
    clearError: () => setError(null),
  };
};

/**
 * Hook for session detail
 */
export const useSessionDetail = (sessionId: string) => {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TherapistError | null>(null);

  const fetchSessionDetail = useCallback(async () => {
    if (!sessionId || sessionId === 'undefined' || sessionId === 'null') {
      setError({ message: 'Invalid session ID', code: 'INVALID_ID' });
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await sessionsService.getSessionDetail(sessionId);
      setSession(data);
    } catch (err) {
      setError(err as TherapistError);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSessionDetail();
  }, [fetchSessionDetail]);

  const updateNotes = useCallback(async (notesData: SessionNotes) => {
    try {
      setError(null);
      await sessionsService.updateSessionNotes(sessionId, notesData);
      await fetchSessionDetail();
    } catch (err) {
      setError(err as TherapistError);
      throw err;
    }
  }, [sessionId, fetchSessionDetail]);

  return {
    session,
    loading,
    error,
    fetchSession: fetchSessionDetail,
    updateSessionNotes: updateNotes,
    clearError: () => setError(null),
  };
};

/**
 * Hook for session calendar
 */
export const useSessionCalendar = () => {
  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TherapistError | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const fetchCalendarSessions = useCallback(async (date: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await sessionsService.getCalendarSessions(date);
      setSessions(data);
    } catch (err) {
      setError(err as TherapistError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarSessions(selectedDate);
  }, [selectedDate, fetchCalendarSessions]);

  return {
    sessions,
    loading,
    error,
    selectedDate,
    setSelectedDate,
    fetchCalendarSessions,
    clearError: () => setError(null),
  };
};

/**
 * Hook for session consent
 */
export const useSessionConsent = (params: SessionConsentParams) => {
  const [formData, setFormData] = useState<SessionConsentData>({
    session_type: 'individual',
    duration_minutes: 60,
    location: '',
    patient_goals: '',
    fee_charged: 0,
    is_online: false,
    consent_recording: false,
    consent_ai_analysis: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const updateField = useCallback((field: keyof SessionConsentData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const scheduledDate = new Date(now.getTime() + 60000);

      const sessionData: SessionFormData = {
        patient_id: params.patientId,
        scheduled_date: scheduledDate.toISOString(),
        duration_minutes: Number(formData.duration_minutes),
        session_type: formData.session_type,
        location: formData.location || 'Office',
        is_online: formData.is_online,
        patient_goals: formData.patient_goals || '',
        fee_charged: formData.fee_charged || 0,
      };

      const session = await sessionsService.createSession(sessionData);

      if (session) {
        // AI Session Start is often handled separately now
        await sessionsService.startSession(session.id);
        navigate(`/sessions/${session.id}`);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create session';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [formData, params, navigate]);

  return {
    formData,
    loading,
    error,
    updateField,
    handleSubmit,
    clearError: () => setError(null),
  };
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

  const getWsCloseMessage = useCallback((code: number, reason?: string) => {
    if (reason && reason.trim().length > 0) {
      return `Session control disconnected (${code}): ${reason}`;
    }

    switch (code) {
      case 4001:
        return 'Session control disconnected: unauthorized token (4001).';
      case 4003:
        return 'Session control disconnected: access denied for this session (4003).';
      case 4004:
        return 'Session control disconnected: session room not found (4004).';
      case 1006:
        return 'Session control connection dropped unexpectedly (1006).';
      case 1008:
        return 'Session control rejected by server policy (1008).';
      case 1011:
        return 'Session control server error (1011).';
      default:
        return `Session control disconnected (code ${code}).`;
    }
  }, []);

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
      onClose: (code, reason) => {
        setConnected(false);
        setError(getWsCloseMessage(code, reason));
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
      },
    });

    wsRef.current = ws;
  }, [roomId, heartbeatIntervalMs, getWsCloseMessage]);

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
      text?: string;
      text_urdu?: string;
      text_english?: string;
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
