// src/services/sessions.service.ts
// Session-specific service for analysis, transcription, WebSocket, and AI integration
import api, { aiApi } from '../utils/api';
import { aiServiceUrl, backendUrl } from '../config';
import type {
  SessionTranscription,
  SessionEmotionalAnalysis,
  StartSessionResponse,
  EndSessionResponse,
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
  /**
   * Start a therapy session - calls AI Service directly
   * Returns AI service token and session info
   */
  async startSession(sessionId: string): Promise<StartSessionResponse> {
    try {
      console.log('[SessionsService] 🚀 Starting session via AI Service...');

      // Get the access token for authentication
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        throw new Error('No access token found');
      }

      // Call AI Service start endpoint
      const response = await aiApi.post<any>(
        '/session/start',
        { session_id: sessionId },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      console.log('[SessionsService] ✅ AI Service session started:', response.data);

      // Map AI Service response to frontend format
      // AI Service returns: { session_id, status, websocket_token, message }
      // Frontend expects: { ai_service_token, session, ... }
      return {
        detail: response.data.message || 'Session started successfully',
        session: {} as any, // AI Service doesn't return full session object
        session_id: response.data.session_id,
        status: response.data.status,
        websocket_token: response.data.websocket_token,
        ai_service_token: response.data.websocket_token, // Map for compatibility
        message: response.data.message,
      };
    } catch (error) {
      console.error('[SessionsService] ❌ Failed to start AI session:', error);
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
      const response = await api.post('/therapy_sessions/sessions/bulk_update/', data);
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
      const response = await api.post(`/therapy_sessions/patients/${patientId}/auto_schedule/`);
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
      const response = await api.get(`/therapy_sessions/patients/${patientId}/schedule_preferences/`);
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
      const response = await api.post('/therapy_sessions/sessions/schedule_recurring/', data);
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
      const response = await api.get(`/therapy_sessions/sessions/?date=${date}&limit=50`);
      let sessionsData: CalendarSession[] = [];
      if (response.data && Array.isArray(response.data.sessions)) {
        sessionsData = response.data.sessions.map((s: SessionType) => ({
          id: s.id,
          patient_name: s.patient_name || 'Unknown',
          session_date: s.session_date || 'Unknown',
          status: s.status || 'UNKNOWN',
          session_type: s.session_type || 'General',
          location: s.location || 'Unknown',
          duration_minutes: s.duration_minutes || 0,
        }));
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
      onClose?: (code: number) => void;
      onOpen?: () => void;
    }
  ): WebSocket {
    // Get the backend base URL from config
    // For production: wss://mindscribe-backend-production-ca1e.up.railway.app/ws/therapy-session/...
    // For local dev: ws://localhost:8000/ws/therapy-session/...
    const protocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
    const host = backendUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${protocol}://${host}/ws/therapy-session/${roomId}/?token=${token}`;

    console.log('[SessionWS] Connecting to:', wsUrl);
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
      console.log('[SessionWS] Connection closed', event.code);
      handlers.onClose?.(event.code);
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
      onTranscription?: (segment: {
        id: string;
        speaker: string;
        text: string;
        start_time: number;
        end_time: number;
        emotion?: string;
      }) => void;
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
  private handleError(error: unknown): TherapistError {
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
