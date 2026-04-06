// src/hooks/useSessions.ts
// Session-specific hooks for live sessions, analysis, and transcription
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiServiceUrl } from '../config';
import sessionsService from '../services/sessions.service';
import type {
  SessionTranscription,
  SessionEmotionalAnalysis,
  AILiveTranscriptionSegment,
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
  SessionInsight,
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
      console.log('[useSessions] 🚀 Starting session lifecycle...');

      // Call AI Service directly
      const data = await sessionsService.startSession(sessionId);
      console.log('[useSessions] ✅ AI Service session started:', data);

      // Store AI service API token if provided
      if (data.ai_service_token) {
        localStorage.setItem('ai_service_token', data.ai_service_token);
        console.log('[useSessions] 💾 Stored AI Service token');
      }

      // Store AI service WebSocket token if provided
      if (data.ai_websocket_token || data.websocket_token) {
        localStorage.setItem('ai_websocket_token', data.ai_websocket_token || data.websocket_token || '');
        console.log('[useSessions] 💾 Stored AI Service WebSocket token');
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
 * Poll the AI service SOAP status endpoint until the pipeline is done.
 * Returns true if ready, false if timed out.
 */
const waitForPipeline = async (
  sessionId: string,
  aiToken: string,
  maxWaitMs = 120_000,
  intervalMs = 4_000
): Promise<boolean> => {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${aiServiceUrl}/api/v1/soap/${sessionId}/status`, {
        headers: { Authorization: `Bearer ${aiToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[useSessions] Pipeline status:', data);
        if (data.pipeline_complete || data.segment_count > 0) {
          return true;
        }
      }
    } catch (e) {
      console.warn('[useSessions] Pipeline status poll error (will retry):', e);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  console.warn('[useSessions] Pipeline did not finish within timeout — proceeding anyway');
  return false;
};

/**
 * Hook for ending a session (with AI analysis trigger)
 */
export const useEndSession = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TherapistError | null>(null);
  const [result, setResult] = useState<EndSessionResponse | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<
    'idle' | 'stopping' | 'processing' | 'ready' | 'timeout'
  >('idle');

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
      setPipelineStatus('stopping');
      try {
        // 1. End session in Django backend
        const response = await sessionsService.endSession(sessionId, data);

        // 2. Stop session in AI Service if token exists
        const aiToken = localStorage.getItem('ai_service_token');
        if (aiToken) {
          console.log('[useSessions] Stopping AI Service session...');
          try {
            await sessionsService.stopAISession(sessionId, aiToken);
            console.log('[useSessions] AI Service session stopped — pipeline started in background');
          } catch (stopErr) {
            console.warn('[useSessions] Failed to stop AI Service session (non-critical):', stopErr);
          }
        }

        setResult(response);
        return response;
      } catch (err) {
        console.error('[useSessions] Failed to end session:', err);
        setError(err as TherapistError);
        setPipelineStatus('idle');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * End the session AND wait for the AI pipeline to finish before navigating to SOAP.
   * Shows a "Processing..." state to the user instead of hitting a 400.
   */
  const endSessionAndGoToSOAP = useCallback(
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
    ): Promise<{ success: boolean; timedOut: boolean }> => {
      setLoading(true);
      setError(null);
      setPipelineStatus('stopping');

      try {
        // Step 1: End Django session
        await sessionsService.endSession(sessionId, data);

        // Step 2: Stop AI service session (kicks off background pipeline)
        const aiToken = localStorage.getItem('ai_service_token');
        if (aiToken) {
          try {
            await sessionsService.stopAISession(sessionId, aiToken);
            console.log('[useSessions] AI pipeline started in background');
          } catch (stopErr) {
            console.warn('[useSessions] stopAISession failed (non-critical):', stopErr);
          }

          // Step 3: Poll until pipeline is done (or timeout)
          setPipelineStatus('processing');
          console.log('[useSessions] Waiting for AI pipeline to finish...');
          const ready = await waitForPipeline(sessionId, aiToken);
          setPipelineStatus(ready ? 'ready' : 'timeout');
        } else {
          setPipelineStatus('ready');
        }

        return { success: true, timedOut: pipelineStatus === 'timeout' };
      } catch (err) {
        console.error('[useSessions] endSessionAndGoToSOAP failed:', err);
        setError(err as TherapistError);
        setPipelineStatus('idle');
        return { success: false, timedOut: false };
      } finally {
        setLoading(false);
      }
    },
    [pipelineStatus]
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
    endSessionAndGoToSOAP,
    pipelineStatus,
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
const AI_SERVICE_URL = aiServiceUrl;

/**
 * Hook for fetching session emotional analysis.
 * Reads from AI Service transcript (has full audio+text+fused emotion breakdown).
 * Falls back gracefully if not available.
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
      const token = localStorage.getItem('access_token');
      const res = await fetch(
        `${AI_SERVICE_URL}/api/v1/session/${sessionId}/transcript`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        throw new Error(`AI service returned ${res.status}`);
      }

      const transcript = await res.json();
      const segments: any[] = transcript.segments || [];

      // ── Build emotional_timeline from segments ───────────────────────────
      const emotional_timeline = segments.map((seg: any) => {
        const em = seg.emotion;
        const isCombined = em?.analysis_type === 'combined';
        return {
          timestamp: seg.start_time,
          speaker: (seg.speaker || '').toUpperCase(),
          // Final fused emotion (for the GPT line)
          emotion: em?.final_emotion ?? 'unknown',
          confidence: em?.final_confidence ?? 0,
          // Audio model
          audio_emotion: isCombined ? (em?.audio_emotion ?? null) : null,
          audio_confidence: isCombined ? (em?.audio_confidence ?? 0) : 0,
          // Text model
          text_emotion: isCombined ? (em?.text_emotion ?? null) : null,
          text_confidence: isCombined ? (em?.text_confidence ?? 0) : 0,
          // Meta
          analysis_type: em?.analysis_type ?? 'unknown',
          agreement: em?.agreement ?? null,
        };
      });

      // ── Compute dominant emotion, valence, arousal ───────────────────────
      const EMOTION_DIMENSIONAL: Record<string, [number, number]> = {
        joy:      [ 0.85, 0.75],
        surprise: [ 0.10, 0.85],
        neutral:  [ 0.00, 0.20],
        fear:     [-0.65, 0.80],
        sadness:  [-0.70, 0.25],
        anger:    [-0.60, 0.90],
        disgust:  [-0.75, 0.55],
        unknown:  [ 0.00, 0.00],
      };

      const patientSegs = segments.filter(
        (s: any) => (s.speaker || '').toUpperCase() === 'PATIENT' && s.emotion
      );

      const emotionCounts: Record<string, number> = {};
      let totalValence = 0, totalArousal = 0, weightedCount = 0;

      patientSegs.forEach((s: any) => {
        const em = s.emotion;
        const label = em?.final_emotion ?? 'unknown';
        const conf = em?.final_confidence ?? 1;
        emotionCounts[label] = (emotionCounts[label] ?? 0) + 1;
        const [v, a] = EMOTION_DIMENSIONAL[label] ?? [0, 0];
        totalValence += v * conf;
        totalArousal += a * conf;
        weightedCount += conf;
      });

      const dominant = Object.entries(emotionCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';

      const avgValence = weightedCount > 0
        ? parseFloat((totalValence / weightedCount).toFixed(3))
        : null;
      const avgArousal = weightedCount > 0
        ? parseFloat((totalArousal / weightedCount).toFixed(3))
        : null;

      // ── Count analysis types ─────────────────────────────────────────────
      const dualSource = patientSegs.filter(
        (s: any) => s.emotion?.analysis_type === 'combined'
      ).length;
      const textOnly = patientSegs.filter(
        (s: any) => s.emotion?.analysis_type === 'text_only'
      ).length;
      const unknownSource = patientSegs.filter(
        (s: any) => !s.emotion?.analysis_type || s.emotion?.analysis_type === 'unknown'
      ).length;

      // ── Mood distribution (patient only, GPT fused) ──────────────────────
      const mood_distribution = Object.entries(emotionCounts).map(([emotion, count]) => ({
        emotion,
        count,
        percentage: patientSegs.length > 0
          ? parseFloat(((count / patientSegs.length) * 100).toFixed(1))
          : 0,
      }));

      setAnalysis({
        emotional_timeline,
        dominant_emotion: dominant,
        average_valence: avgValence,
        average_arousal: avgArousal,
        dual_source_segments: dualSource,
        text_only_segments: textOnly,
        unknown_source_segments: unknownSource,
        mood_distribution,
        mood_timeline: emotional_timeline, // alias for older page references
      } as any);

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
/**
 * Hook for fetching session transcription
 * Prefers AI Service (has full dual-source emotion) over Django backend
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
      // Use AI Service transcript (has audio_emotion + text_emotion flat strings)
      const data = await sessionsService.getAITranscription(sessionId);
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
 * Hook for fetching and generating session AI insights.
 */
export const useSessionInsights = (
  sessionId: string,
  options: { autoFetch?: boolean } = {}
) => {
  const { autoFetch = true } = options;

  const [insight, setInsight] = useState<SessionInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<TherapistError | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!sessionId) return null;
    setLoading(true);
    setError(null);
    try {
      const data = await sessionsService.getSessionInsights(sessionId);
      setInsight(data);
      return data;
    } catch (err) {
      setError(err as TherapistError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const generateInsights = useCallback(async (force: boolean = true) => {
    if (!sessionId) return null;
    setGenerating(true);
    setError(null);
    try {
      const data = await sessionsService.generateSessionInsights(sessionId, force);
      setInsight(data);
      return data;
    } catch (err) {
      setError(err as TherapistError);
      return null;
    } finally {
      setGenerating(false);
    }
  }, [sessionId]);

  useEffect(() => {
    setInsight(null);
    setError(null);
  }, [sessionId]);

  useEffect(() => {
    if (autoFetch && sessionId) {
      fetchInsights();
    }
  }, [autoFetch, sessionId, fetchInsights]);

  return {
    insight,
    loading,
    generating,
    error,
    fetchInsights,
    generateInsights,
    clearError: () => setError(null),
  };
};
/**
 * Hook for managing all sessions for a therapist
 */
const DEFAULT_PAGE_SIZE = 20;

export const useSessions = (initialFilter: SessionFilter = {}) => {
  const [sessions, setSessions] = useState<SessionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TherapistError | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<SessionFilter>({
    limit: DEFAULT_PAGE_SIZE,
    ...initialFilter,
  });
  const [pagination, setPagination] = useState({
    total_count: 0,
    limit: DEFAULT_PAGE_SIZE,
    offset: 0,
    has_next: false,
    has_previous: false,
  });

  const totalPages = useMemo(() => {
    const lim = pagination.limit || DEFAULT_PAGE_SIZE;
    if (pagination.total_count === 0) return 0;
    return Math.ceil(pagination.total_count / lim);
  }, [pagination.total_count, pagination.limit]);

  const fetchSessions = useCallback(
    async (filterOverride?: SessionFilter) => {
      const currentFilter = filterOverride ?? filter;
      const limit = currentFilter.limit ?? DEFAULT_PAGE_SIZE;
      const offset = (page - 1) * limit;

      try {
        setLoading(true);
        setError(null);

        const data = await sessionsService.getSessions({
          ...currentFilter,
          limit,
          offset,
        });

        setSessions(data.sessions);
        setPagination({
          total_count: data.total_count,
          limit: data.limit,
          offset: data.offset,
          has_next: data.has_next,
          has_previous: data.has_previous,
        });
      } catch (err) {
        setError(err as TherapistError);
        console.error('Sessions fetch error:', err);
      } finally {
        setLoading(false);
      }
    },
    [filter, page]
  );

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const updateFilter = useCallback((newFilter: SessionFilter, reset = false) => {
    setPage(1);
    if (reset) {
      setFilter({ limit: DEFAULT_PAGE_SIZE, ...newFilter });
    } else {
      setFilter((prev) => ({ ...prev, ...newFilter }));
    }
  }, []);

  const goToPage = useCallback(
    (nextPage: number) => {
      const lim = filter.limit ?? DEFAULT_PAGE_SIZE;
      const tp =
        pagination.total_count === 0 ? 0 : Math.ceil(pagination.total_count / lim);
      if (nextPage < 1 || (tp > 0 && nextPage > tp)) return;
      setPage(nextPage);
    },
    [filter.limit, pagination.total_count]
  );

  const createSession = useCallback(
    async (sessionData: SessionFormData): Promise<SessionType | null> => {
      try {
        setError(null);
        const newSession = await sessionsService.createSession(sessionData);
        await fetchSessions();
        return newSession;
      } catch (err) {
        setError(err as TherapistError);
        return null;
      }
    },
    [fetchSessions]
  );

  const updateSession = useCallback(
    async (sessionId: string, updateData: SessionUpdate): Promise<boolean> => {
      try {
        setError(null);
        await sessionsService.updateSession(sessionId, updateData);
        await fetchSessions();
        return true;
      } catch (err) {
        setError(err as TherapistError);
        return false;
      }
    },
    [fetchSessions]
  );

  return {
    sessions,
    loading,
    pagination,
    page,
    setPage,
    totalPages,
    goToPage,
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
        location: formData.location || 'Office',
        is_online: formData.is_online,
        patient_goals: formData.patient_goals || '',
        fee_charged: formData.fee_charged || 0,
        consent_recording: true,
        consent_ai_analysis: true,
      };

      const session = await sessionsService.createSession(sessionData);

      if (session) {
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
  const retryCountRef = useRef<number>(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = sessionsService.createWebSocketConnection(roomId, token, {
      onOpen: () => {
        setConnected(true);
        setError(null);
        retryCountRef.current = 0;

        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }

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

        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }

        if (retryCountRef.current < 5) {
          retryCountRef.current += 1;
          console.log(`[SessionWS] Retrying connection... attempt ${retryCountRef.current}/5`);
          retryTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        } else {
          setError(getWsCloseMessage(code, reason));
        }
      },
    });

    wsRef.current = ws;
  }, [roomId, heartbeatIntervalMs, getWsCloseMessage]);

  const disconnect = useCallback(() => {
    retryCountRef.current = 5;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
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
  const [transcriptionSegments, setTranscriptionSegments] = useState<AILiveTranscriptionSegment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    console.log('[AI Service WS] Connect called with:', { sessionId, aiServiceToken: aiServiceToken ? 'present' : 'missing' });

    if (!sessionId || !aiServiceToken) {
      console.warn('[AI Service WS] Missing required parameters - sessionId:', sessionId, 'token:', aiServiceToken ? 'present' : 'missing');
      return;
    }

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

          heartbeatRef.current = setInterval(() => {
            if (wsRef.current) {
              sessionsService.sendAIServiceHeartbeat(wsRef.current);
            }
          }, 30000);
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

  const sendAudioChunk = useCallback((audioData: string | null, sampleRate: number = 16000, format: string = 'wav') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (audioData) {
        sessionsService.sendAudioChunk(wsRef.current, audioData, chunkIndexRef.current, sampleRate, format);
      }
      chunkIndexRef.current += 1;
    } else {
      console.warn('[AI Service WS] Cannot send audio - WebSocket not open');
    }
  }, []);

  const clearTranscription = useCallback(() => {
    setTranscriptionSegments([]);
    chunkIndexRef.current = 0;
  }, []);

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