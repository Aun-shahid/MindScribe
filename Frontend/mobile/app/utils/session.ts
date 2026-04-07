// app/utils/session.ts

/**
 * Session-related utility functions
 */

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

export const formatDetailedDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

export const hasSessionContent = (session: any, field: string): boolean => {
  return session?.[field] && typeof session[field] === 'string' && session[field].trim().length > 0;
};

export const getMoodImprovementColor = (improvement: number): string => {
  return improvement >= 0 ? '#34C759' : '#FF3B30';
};

export const getEffectivenessRating = (effectiveness: number): string => {
  if (effectiveness >= 8) return 'Highly Effective';
  if (effectiveness >= 6) return 'Moderately Effective';
  return 'Needs Improvement';
};

export const getEffectivenessColor = (effectiveness: number): string => {
  if (effectiveness >= 8) return '#34C759';
  if (effectiveness >= 6) return '#FF9500';
  return '#FF3B30';
};

// Session Details specific utilities
export const extractSessionData = (sessionData: any, fallbackId: string, sessionNumber: number, status: string): any => {
  let parsedData;
  
  if (typeof sessionData === 'string') {
    try {
      parsedData = JSON.parse(sessionData);
    } catch {
      parsedData = {
        id: fallbackId,
        session_notes: sessionData,
        session_type: 'individual',
        status: status
      };
    }
  } else {
    parsedData = sessionData;
  }
  
  if (!parsedData) return null;
  
  return {
    id: parsedData.id || fallbackId,
    session_number: parsedData.session_number || sessionNumber,
    session_type: parsedData.session_type || 'individual',
    status: parsedData.status || status,
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

export const getSessionCardInfo = (session: any) => {
  const hasNotes = session.session_notes && session.session_notes.trim().length > 0;
  const hasGoals = session.patient_goals && session.patient_goals.trim().length > 0;
  const statusColor = getStatusColor(session.status || '');
  
  return {
    hasNotes,
    hasGoals,
    statusColor
  };
};

export const getTapIndicatorText = (session: any): string => {
  return session.id && !session.id.startsWith('last-') && !session.id.startsWith('next-') 
    ? 'Tap to view full details →' 
    : 'Tap for options →';
};

export const shouldShowMoodRow = (session: any): boolean => {
  return !!(session.patient_mood_before || session.patient_mood_after);
};

export const shouldShowDuration = (session: any): boolean => {
  return !!(session.actual_duration_minutes && session.actual_duration_minutes > 0);
};

export const shouldShowEffectiveness = (session: any): boolean => {
  return !!(session.session_effectiveness);
};

export default function SessionUtilsRoute() {
  return null;
}
