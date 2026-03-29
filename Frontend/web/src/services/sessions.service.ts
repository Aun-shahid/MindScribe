// src/services/sessions.service.ts
// Session-specific service for analysis, transcription, WebSocket, and AI integration
import api, { aiApi } from '../utils/api';
import { aiServiceUrl, backendUrl } from '../config';
import axios from 'axios';
import type {
  SessionTranscription,
  SessionEmotionalAnalysis,
  StartSessionResponse,
  EndSessionResponse,
  SOAPGenerateResponse,
  SOAPNote,
  AILiveTranscriptionSegment,
  SessionInsight,
  SessionSummaryUpdate,
  SessionType,
  SessionDetail,
  SessionFilter,
  SessionFormData,
  CalendarSession,
  SessionNotes,
  SessionUpdate,
} from '../types/session';
import type { TherapistError } from '../types/therapist';

class SessionsService {
  private decodeJwtUserId(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;

      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = payloadBase64.padEnd(Math.ceil(payloadBase64.length / 4) * 4, '=');
      const payloadJson = atob(padded);
      const payload = JSON.parse(payloadJson) as { user_id?: string; sub?: string };

      return payload.user_id || payload.sub || null;
    } catch {
      return null;
    }
  }

  /**
   * Start a therapy session.
   * 1) Mark Django session as IN_PROGRESS
   * 2) Start AI Service session and obtain WebSocket token
   */
  async startSession(sessionId: string): Promise<StartSessionResponse> {
    try {
      console.log('[SessionsService] 🚀 Starting session via Django backend and AI Service...');

      // Get the access token for authentication
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        throw new Error('No access token found');
      }

      let backendSession: SessionDetail;
      let effectiveAiServiceUrl = aiServiceUrl;
      let backendAiServiceToken: string | null = null;

      // 1) Start session in Django backend to keep canonical session status in sync.
      // Treat "already IN_PROGRESS" as an idempotent success to avoid noisy retries.
      try {
        const backendResponse = await api.post<any>(`/therapy_sessions/sessions/${sessionId}/start/`);
        console.log('[SessionsService] ✅ Backend session started:', backendResponse.data);

        backendSession = (backendResponse.data?.session || backendResponse.data) as SessionDetail;
        effectiveAiServiceUrl = backendResponse.data?.ai_service_url || aiServiceUrl;
        backendAiServiceToken = backendResponse.data?.ai_service_token || null;
      } catch (backendStartError) {
        if (!this.isAlreadyInProgressStartError(backendStartError)) {
          throw backendStartError;
        }

        console.warn('[SessionsService] Session already IN_PROGRESS. Skipping duplicate start call.');
        const currentSession = await this.getSessionDetail(sessionId);
        backendSession = currentSession;

        return {
          detail: 'Session already in progress',
          session: backendSession,
          status: 'in_progress',
          ai_service_url: effectiveAiServiceUrl,
          message: 'Session already in progress',
        };
      }

      try {
        // 2) Start AI Service session for live transcription pipeline.
        const authToken = backendAiServiceToken || accessToken;
        if (!backendAiServiceToken) {
          console.warn('[SessionsService] No ai_service_token from backend, falling back to access token for AI start.');
        }

        const response = await axios.post<any>(
          `${effectiveAiServiceUrl}/api/v1/session/start`,
          { session_id: sessionId },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            withCredentials: true,
          }
        );

        console.log('[SessionsService] ✅ AI Service session started:', response.data);

        // Map merged backend + AI response to frontend format.
        // AI Service returns: { session_id, status, websocket_token, message }.
        return {
          detail: response.data.message || 'Session started successfully',
          session: backendSession,
          session_id: response.data.session_id,
          status: response.data.status,
          websocket_token: response.data.websocket_token,
          ai_websocket_token: response.data.websocket_token,
          ai_service_token: authToken,
          message: response.data.message,
          ai_service_url: effectiveAiServiceUrl,
        };
      } catch (aiError) {
        console.error('[SessionsService] ⚠️ AI Service unavailable, continuing with session control only:', aiError);

        // Keep session usable even if AI service is offline.
        return {
          detail: 'Session started. AI transcription service is currently unavailable.',
          session: backendSession,
          status: 'in_progress',
          ai_service_url: effectiveAiServiceUrl,
          ai_service_info: 'AI transcription unavailable. Verify AI service is running and reachable.',
          message: 'AI transcription service unavailable',
        };
      }
    } catch (error) {
      console.error('[SessionsService] ❌ Failed to start session lifecycle:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Start research/transcription on the AI Service
   */
  async startAISession(sessionId: string, token: string): Promise<void> {
    try {
      console.log('[SessionsService] 🌐 Calling AI Service start endpoint...');
      console.log('[SessionsService] URL:', `${aiServiceUrl}/api/v1/session/start`);
      console.log('[SessionsService] Session ID:', sessionId);
      console.log('[SessionsService] Token (first 20 chars):', token.substring(0, 20) + '...');

      const response = await aiApi.post(
        '/session/start',
        { session_id: sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('[SessionsService] ✅ AI Service response:', response.data);
    } catch (error) {
      console.error('[SessionsService] ❌ AI Service error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Stop research/transcription on the AI Service
   */
  async stopAISession(sessionId: string, token: string): Promise<void> {
    try {
      await aiApi.post(
        `/session/${sessionId}/stop`,
        { save_transcript: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Fetch generated SOAP note for a session.
   */
  async getSessionSOAP(sessionId: string): Promise<SOAPNote> {
    try {
      const authToken = localStorage.getItem('ai_service_token');
      if (!authToken) {
        throw new Error('AI session token is missing. Start and complete the session flow to generate or load SOAP notes.');
      }

      const response = await aiApi.get<SOAPNote>(`/soap/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate SOAP note for a session.
   */
  async generateSessionSOAP(
    sessionId: string,
    payload: { include_emotions?: boolean; additional_context?: string } = {}
  ): Promise<SOAPGenerateResponse> {
    try {
      const authToken = localStorage.getItem('ai_service_token');
      if (!authToken) {
        throw new Error('AI session token is missing. Start and complete the session flow before generating SOAP notes.');
      }

      const response = await aiApi.post<SOAPGenerateResponse>(
        `/soap/${sessionId}/generate`,
        {
          include_emotions: payload.include_emotions ?? true,
          additional_context: payload.additional_context ?? '',
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update therapist-edited SOAP sections.
   */
  async updateSessionSOAP(
    sessionId: string,
    payload: {
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
    }
  ): Promise<SOAPNote> {
    try {
      const authToken = localStorage.getItem('ai_service_token');
      if (!authToken) {
        throw new Error('AI session token is missing. Re-open this session through the active session flow before saving SOAP notes.');
      }

      const response = await aiApi.put<SOAPNote>(`/soap/${sessionId}`, payload, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * End a therapy session — triggers background AI analysis if consent given
   */
  async endSession(
    sessionId: string,
    data: {
      session_notes?: string;
      patient_goals?: string;
      patient_mood_after?: number;
      homework_assigned?: string;
      next_session_goals?: string;
      session_effectiveness?: number;
    }
  ): Promise<EndSessionResponse> {
    try {
      const response = await api.post<EndSessionResponse>(
        `/therapy_sessions/sessions/${sessionId}/end/`,
        data
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get emotional analysis for a session
   */
  async getEmotionalAnalysis(sessionId: string): Promise<SessionEmotionalAnalysis> {
    try {
      const response = await api.get<SessionEmotionalAnalysis>(
        `/therapy_sessions/sessions/${sessionId}/analysis/`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get transcription data for a session
   */
  async getTranscription(sessionId: string): Promise<SessionTranscription> {
    try {
      const response = await api.get<SessionTranscription>(
        `/therapy_sessions/sessions/${sessionId}/transcription/`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  /**
 * Get full transcript with dual-source emotion from AI Service
 * Falls back to Django transcription if AI Service unavailable
 */
async getAITranscription(sessionId: string): Promise<SessionTranscription> {
  const aiToken = localStorage.getItem('ai_service_token');
  
  if (aiToken) {
    try {
      const response = await aiApi.get(`/session/${sessionId}/transcript`, {
        headers: { Authorization: `Bearer ${aiToken}` },
      });
      
      const data = response.data;
      // Map AI Service FullTranscript → SessionTranscription shape
      const segments = (data.segments || []).map((seg: any) => ({
        id: seg.id,
        speaker: seg.speaker,
        speaker_type: seg.speaker?.toLowerCase() === 'therapist' ? 'therapist' : 'patient',
        speaker_id: seg.speaker,
        text: seg.text_english || seg.text_urdu || '',
        text_english: seg.text_english || '',
        text_urdu: seg.text_urdu || '',
        start_time: seg.start_time,
        end_time: seg.end_time,
        confidence: 1.0,
        // Emotion comes as flat SegmentEmotionResult — pass through as-is
        emotion: seg.emotion || null,
      }));
      
      return {
        session_id: data.session_id || sessionId,
        segments,
        total_duration: data.total_duration || 0,
        speaker_count: data.speaker_count || 0,
      };
    } catch (aiErr) {
      console.warn('[SessionsService] AI Service transcript unavailable, falling back to Django:', aiErr);
    }
  }
  
  // Fallback to Django backend
  return this.getTranscription(sessionId);
}

  /**
   * Update the therapist-written session summary (visible to patient)
   */
  async updateSessionSummary(
    sessionId: string,
    data: SessionSummaryUpdate
  ): Promise<void> {
    try {
      await api.put(`/therapy_sessions/sessions/${sessionId}/summary/`, data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get sessions with optional filtering
   */
  async getSessions(filter: SessionFilter = {}): Promise<SessionType[]> {
    try {
      let endpoint = '/therapy_sessions/sessions/';
      const params = new URLSearchParams();

      if (filter.date) params.append('date', filter.date);
      if (filter.status && filter.status !== 'ALL') params.append('status', filter.status);
      if (filter.patient_id) params.append('patient_id', filter.patient_id);
      if (filter.session_type) params.append('session_type', filter.session_type);

      const queryString = params.toString();
      if (queryString) {
        endpoint += `?${queryString}&limit=50`;
      } else {
        endpoint += '?limit=50';
      }

      const response = await api.get(endpoint);
      let sessionsData = [];
      if (response.data) {
        if (Array.isArray(response.data.sessions)) {
          sessionsData = response.data.sessions;
        } else if (Array.isArray(response.data)) {
          sessionsData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          sessionsData = response.data.results;
        }
      }
      return sessionsData;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get detailed session info
   */
  async getSessionDetail(sessionId: string): Promise<SessionDetail> {
    try {
      const response = await api.get<SessionDetail>(`/therapy_sessions/sessions/${sessionId}/`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Schedule/Create a new session
   */
  async createSession(sessionData: SessionFormData): Promise<SessionType> {
    try {
      const response = await api.post<SessionType>('/therapy_sessions/schedule/', sessionData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update an existing session
   */
  async updateSession(sessionId: string, updateData: SessionUpdate): Promise<SessionType> {
    try {
      const response = await api.patch<SessionType>(`/therapy_sessions/sessions/${sessionId}/`, updateData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await api.delete(`/therapy_sessions/sessions/${sessionId}/`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Bulk update sessions (cancel, reschedule, etc.)
   */
  async bulkUpdateSessions(data: any): Promise<any> {
    try {
      const response = await api.post('/therapy_sessions/schedule/bulk-update/', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(days: number = 30): Promise<any> {
    try {
      const response = await api.get(`/therapy_sessions/stats/?days=${days}`);
      const data = response.data;

      // Transform backend arrays to Record<string, number> for frontend
      const byStatus: Record<string, number> = {};
      if (Array.isArray(data.sessions_by_status)) {
        data.sessions_by_status.forEach((item: any) => {
          byStatus[item.status] = item.count;
        });
      }

      const byType: Record<string, number> = {};
      if (Array.isArray(data.sessions_by_type)) {
        data.sessions_by_type.forEach((item: any) => {
          byType[item.session_type] = item.count;
        });
      }

      return {
        ...data,
        by_status: byStatus,
        by_type: byType,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Auto-schedule sessions for a patient
   */
  async autoSchedulePatientSessions(patientId: string): Promise<any> {
    try {
      const response = await api.post(`/therapy_sessions/patients/${patientId}/auto-schedule/`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get patient's scheduling preferences
   */
  async getPatientSchedulePreferences(patientId: string): Promise<any> {
    try {
      const response = await api.get(`/therapy_sessions/patients/${patientId}/preferences/`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get sessions for a specific patient
   */
  async getPatientSessions(patientId: string, options: any = {}): Promise<any> {
    try {
      let endpoint = `/therapy_sessions/patients/${patientId}/sessions/`;
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);
      if (typeof options.include_past === 'boolean') params.append('include_past', String(options.include_past));
      if (typeof options.include_upcoming === 'boolean') params.append('include_upcoming', String(options.include_upcoming));
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());

      const queryString = params.toString();
      if (queryString) endpoint += `?${queryString}`;

      const response = await api.get(endpoint);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get past sessions
   */
  async getPastSessions(options: { patientId?: string; limit?: number } = {}): Promise<any> {
    try {
      let endpoint = '/therapy_sessions/sessions/past/';
      const params = new URLSearchParams();
      if (options.patientId) params.append('patient_id', options.patientId);
      if (options.limit) params.append('limit', options.limit.toString());

      const queryString = params.toString();
      if (queryString) endpoint += `?${queryString}`;

      const response = await api.get(endpoint);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Schedule recurring sessions for a patient
   */
  async scheduleRecurringSessions(data: any): Promise<any> {
    try {
      const response = await api.post('/therapy_sessions/schedule/recurring/', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update session notes (private to therapist)
   */
  async updateSessionNotes(sessionId: string, notesData: SessionNotes): Promise<void> {
    try {
      await api.patch(`/therapy_sessions/sessions/${sessionId}/notes/`, notesData);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get sessions for a calendar view
   */
  async getCalendarSessions(date: string): Promise<CalendarSession[]> {
    try {
      const response = await api.get(`/therapy_sessions/sessions/?date=${encodeURIComponent(date)}&limit=300`);
      let sessionsData: CalendarSession[] = [];
      if (response.data && Array.isArray(response.data.sessions)) {
        sessionsData = response.data.sessions
          .map((s: any) => ({
            id: s.id,
            patient_name: s.patient_name || s.patient?.full_name || 'Unknown',
            session_date: s.session_date || s.scheduled_date || '',
            status: s.status || 'UNKNOWN',
            session_type: s.session_type || 'General',
            location: s.location || 'Unknown',
            duration_minutes: s.duration_minutes || 0,
          }))
          .filter((s: CalendarSession) => !Number.isNaN(new Date(s.session_date).getTime()))
          .sort((a: CalendarSession, b: CalendarSession) => {
            return new Date(a.session_date).getTime() - new Date(b.session_date).getTime();
          });
      }
      return sessionsData;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get session insights generated by AI
   */
  async getSessionInsights(sessionId: string): Promise<SessionInsight | null> {
    try {
      const response = await api.get<SessionInsight>(
        `/therapy_sessions/sessions/${sessionId}/analysis/`
      );
      return response.data;
    } catch {
      // Insights may not be generated yet
      return null;
    }
  }

  /**
   * Create a WebSocket connection for a live therapy session.
   * Returns the WebSocket instance for the caller to manage.
   *
   * @param roomId - The websocket_room_id from the session object
   * @param token  - JWT access token for authentication
   * @param handlers - Event handler callbacks
   */
  createWebSocketConnection(
    roomId: string,
    token: string,
    handlers: {
      onMessage?: (data: Record<string, unknown>) => void;
      onStatusChange?: (status: string) => void;
      onUserJoined?: (user: { user_id: string; user_name: string; user_type: string }) => void;
      onUserLeft?: (user: { user_id: string; user_name: string; user_type: string }) => void;
      onError?: (error: { message: string; code: string }) => void;
      onClose?: (code: number, reason?: string) => void;
      onOpen?: () => void;
    }
  ): WebSocket {
    // Get the backend base URL from config
    // For production: wss://mindscribe-backend-production-ca1e.up.railway.app/ws/therapy-session/...
    // For local dev: ws://localhost:8000/ws/therapy-session/...
    const protocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
    const host = backendUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${protocol}://${host}/ws/therapy-session/${roomId}/?token=${token}`;
    const tokenUserId = this.decodeJwtUserId(token);

    console.log('[SessionWS] Connecting to:', wsUrl);
    console.log('[SessionWS] Debug connect context:', {
      roomId,
      backendUrl,
      tokenUserId,
      tokenPreview: `${token.slice(0, 16)}...`,
    });
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[SessionWS] Connected to session', roomId);
      handlers.onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'session_message':
            handlers.onMessage?.(data);
            break;
          case 'session_status_changed':
            handlers.onStatusChange?.(data.status);
            break;
          case 'user_joined':
            handlers.onUserJoined?.(data);
            break;
          case 'user_left':
            handlers.onUserLeft?.(data);
            break;
          case 'error':
            handlers.onError?.(data);
            break;
          case 'connection_established':
            console.log('[SessionWS] Connection established:', data);
            break;
          case 'heartbeat_response':
            // Heartbeat acknowledged
            break;
          default:
            console.log('[SessionWS] Unknown message type:', data.type);
        }
      } catch {
        console.error('[SessionWS] Failed to parse message');
      }
    };

    ws.onerror = () => {
      console.error('[SessionWS] WebSocket error');
      handlers.onError?.({ message: 'WebSocket connection error', code: 'WS_ERROR' });
    };

    ws.onclose = (event) => {
      console.log('[SessionWS] Connection closed', event.code, event.reason);
      handlers.onClose?.(event.code, event.reason);
    };

    return ws;
  }

  /**
   * Send a message through an active WebSocket connection
   */
  sendMessage(ws: WebSocket, message: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'session_message', message }));
    }
  }

  /**
   * Send a session control command (start, end, pause)
   */
  sendControl(ws: WebSocket, action: 'start_session' | 'end_session' | 'pause_session'): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'session_control', action }));
    }
  }

  /**
   * Send audio data through WebSocket for transcription
   */
  sendAudioData(ws: WebSocket, audioData: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'audio_data', audio_data: audioData }));
    }
  }

  /**
   * Send a heartbeat to keep the connection alive
   */
  sendHeartbeat(ws: WebSocket): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }

  /**
   * Connect to AI Service WebSocket for real-time transcription and emotion analysis
   * This is separate from the Django WebSocket used for session control
   * Uses aiServiceUrl from config.ts
   */
  createAIServiceWebSocket(
    sessionId: string,
    aiServiceToken: string,
    handlers: {
      onTranscription?: (segment: AILiveTranscriptionSegment) => void;
      onError?: (error: { message: string }) => void;
      onClose?: () => void;
      onOpen?: () => void;
    }
  ): WebSocket {
    // Convert HTTP URL to WebSocket URL using config
    // e.g., http://localhost:8001 -> ws://localhost:8001
    const wsProtocol = aiServiceUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = aiServiceUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${wsHost}/api/v1/session/ws/${sessionId}?token=${aiServiceToken}`;

    console.log('[AI Service WS] Connecting to:', wsUrl);
    console.log('[AI Service WS] Session ID:', sessionId);
    console.log('[AI Service WS] Token (first 20 chars):', aiServiceToken.substring(0, 20) + '...');
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[AI Service WS] ✅ Connection established successfully!');
      handlers.onOpen?.();
    };

    ws.onmessage = (event) => {
      console.log('[AI Service WS] Message received:', event.data);
      try {
        const data = JSON.parse(event.data);
        console.log('[AI Service WS] Message:', data);

        switch (data.type) {
          case 'connection':
            console.log('[AI Service WS] Connection confirmed:', data.message);
            break;

          case 'transcription':
            // Handle transcription segment
            if (data.segment) {
              handlers.onTranscription?.(data.segment);
            }
            break;

          case 'heartbeat_response':
            // Heartbeat acknowledged
            break;

          case 'error':
            console.error('[AI Service WS] Error:', data.message);
            handlers.onError?.({ message: data.message });
            break;

          default:
            console.log('[AI Service WS] Unknown message type:', data.type);
        }
      } catch (err) {
        console.error('[AI Service WS] Failed to parse message:', err);
      }
    };

    ws.onerror = (event) => {
      console.error('[AI Service WS] ❌ WebSocket error occurred');
      console.error('[AI Service WS] Error event:', event);
      console.error('[AI Service WS] WebSocket state:', ws.readyState);
      console.error('[AI Service WS] URL:', wsUrl);
      handlers.onError?.({ message: 'WebSocket connection error' });
    };

    ws.onclose = (event) => {
      console.log('[AI Service WS] Connection closed');
      console.log('[AI Service WS] Close code:', event.code, 'Reason:', event.reason);
      console.log('[AI Service WS] Was clean:', event.wasClean);
      handlers.onClose?.();
    };

    return ws;
  }

  /**
   * Send audio chunk to AI Service WebSocket for transcription
   * Audio should be base64-encoded PCM/WAV data
   */
  sendAudioChunk(
    ws: WebSocket,
    audioData: string,
    chunkIndex: number,
    sampleRate: number = 16000,
    format: string = 'wav'
  ): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'audio_chunk',
        audio_data: audioData,
        chunk_index: chunkIndex,
        sample_rate: sampleRate,
        format: format
      }));
    }
  }

  /**
   * Send heartbeat to AI Service WebSocket
   */
  sendAIServiceHeartbeat(ws: WebSocket): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }

  /**
   * Error handler
   */
  private isAlreadyInProgressStartError(error: unknown): boolean {
    if (!axios.isAxiosError(error) || error.response?.status !== 400) {
      return false;
    }

    const detail =
      (error.response?.data as { detail?: string; message?: string } | undefined)?.detail ||
      (error.response?.data as { detail?: string; message?: string } | undefined)?.message ||
      '';

    const normalizedDetail = detail.toLowerCase();
    return normalizedDetail.includes('current status: in_progress') ||
      (normalizedDetail.includes('cannot be started') && normalizedDetail.includes('in_progress'));
  }

  private handleError(error: unknown): TherapistError {
    if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
      const targetUrl = error.config?.url || 'AI service endpoint';
      return {
        message: `Network Error. Could not reach ${targetUrl}. Ensure the AI service is running and CORS allows this origin.`,
        code: 'NETWORK_ERROR',
      };
    }

    if (typeof error === 'object' && error !== null && 'response' in error) {
      const err = error as { response?: { data?: Record<string, unknown>; status?: number } };
      if (err.response?.data) {
        const data = err.response.data;
        return {
          message: (data.detail as string) || (data.message as string) || 'An error occurred',
          code: err.response.status?.toString(),
        };
      }
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return { message: (error as Error).message, code: 'NETWORK_ERROR' };
    }
    return { message: 'An unexpected error occurred', code: 'UNKNOWN_ERROR' };
  }
}

const sessionsService = new SessionsService();
export default sessionsService;
