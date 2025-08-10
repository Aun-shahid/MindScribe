// app/utils/sessionDetails.ts

import { Session, PatientWithSessions } from '../types/therapist';

export const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return '#34C759';
    case 'in_progress':
      return '#FF9500';
    case 'scheduled':
      return '#007AFF';
    case 'cancelled':
      return '#FF3B30';
    default:
      return '#8E8E93';
  }
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Date not available';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

export const parseSessionData = (sessionData: any): any => {
  if (typeof sessionData === 'string') {
    try {
      return JSON.parse(sessionData);
    } catch {
      return null;
    }
  }
  return sessionData;
};

export const createSessionFromData = (
  sessionData: any,
  type: 'last' | 'next',
  patientId: string,
  sessionNumber: number
): Session => {
  const parsedData = parseSessionData(sessionData);
  
  if (!parsedData) {
    return {
      id: `${type}-${patientId}`,
      session_notes: typeof sessionData === 'string' ? sessionData : '',
      session_type: 'individual',
      status: type === 'last' ? 'completed' : 'scheduled',
      session_number: sessionNumber
    };
  }

  return {
    id: parsedData.id || `${type}-${patientId}`,
    session_number: parsedData.session_number || sessionNumber,
    session_type: parsedData.session_type || 'individual',
    status: parsedData.status || (type === 'last' ? 'completed' : 'scheduled'),
    scheduled_date: parsedData.scheduled_date || parsedData.date,
    location: parsedData.location || 'Office',
    is_online: parsedData.is_online || false,
    session_notes: parsedData.session_notes || parsedData.notes,
    patient_goals: parsedData.patient_goals,
    homework_assigned: parsedData.homework_assigned,
    next_session_goals: parsedData.next_session_goals,
    patient_mood_before: parsedData.patient_mood_before,
    patient_mood_after: parsedData.patient_mood_after,
    mood_improvement: parsedData.mood_improvement,
    session_effectiveness: parsedData.session_effectiveness,
    actual_duration_minutes: parsedData.actual_duration_minutes || parsedData.duration,
    created_at: parsedData.created_at,
    updated_at: parsedData.updated_at
  };
};

export const extractSessionsFromPatient = (patient: PatientWithSessions): Session[] => {
  const extractedSessions: Session[] = [];

  // Extract last session
  if (patient.last_session) {
    const lastSession = createSessionFromData(
      patient.last_session,
      'last',
      patient.id,
      1
    );
    extractedSessions.push(lastSession);
  }

  // Extract next session
  if (patient.next_session) {
    const nextSession = createSessionFromData(
      patient.next_session,
      'next',
      patient.id,
      2
    );
    extractedSessions.push(nextSession);
  }

  return extractedSessions;
};

export const getSessionCardInfo = (session: Session) => {
  const hasNotes = !!(session.session_notes && session.session_notes.trim().length > 0);
  const hasGoals = !!(session.patient_goals && session.patient_goals.trim().length > 0);
  const statusColor = getStatusColor(session.status || '');
  
  // Build mood text
  let moodText = '';
  if (session.patient_mood_before || session.patient_mood_after) {
    const parts = [];
    if (session.patient_mood_before) {
      parts.push(`😔 Before: ${session.patient_mood_before}/10`);
    }
    if (session.patient_mood_after) {
      parts.push(`😊 After: ${session.patient_mood_after}/10`);
    }
    if (session.mood_improvement !== null && session.mood_improvement !== undefined) {
      const emoji = session.mood_improvement >= 0 ? '📈' : '📉';
      const sign = session.mood_improvement > 0 ? '+' : '';
      parts.push(`${emoji} ${sign}${session.mood_improvement}`);
    }
    moodText = parts.join(' • ');
  }
  
  return {
    hasNotes,
    hasGoals,
    statusColor,
    sessionBadge: `Session #${session.session_number || 1}`,
    sessionType: session.session_type || 'Individual',
    location: session.is_online ? 'Online' : (session.location || 'In-person'),
    statusText: session.status || 'Unknown',
    formattedDate: formatDate(session.scheduled_date || session.created_at),
    duration: session.actual_duration_minutes,
    goals: session.patient_goals,
    notes: session.session_notes,
    moodText,
    effectiveness: session.session_effectiveness
  };
};

export const shouldShowTapToViewDetails = (sessionId: string): boolean => {
  // Show "Tap to view details" for all valid sessions except fallback ones
  return !!(sessionId && !sessionId.startsWith('fallback-'));
};

export const getTapIndicatorText = (sessionId: string): string => {
  return shouldShowTapToViewDetails(sessionId) 
    ? 'Tap to view full details →' 
    : 'Tap for options →';
};
