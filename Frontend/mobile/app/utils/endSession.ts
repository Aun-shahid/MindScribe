// app/utils/endSession.ts

import { EndSessionFormData } from '../types/therapist';

/**
 * Default form values for end session
 */
export const getDefaultEndSessionForm = () => ({
  sessionNotes: '',
  patientMoodAfter: '7',
  homeworkAssigned: '',
  nextSessionGoals: '',
  sessionEffectiveness: '8',
});

/**
 * Validate end session form data
 */
export const validateEndSessionForm = (formData: {
  sessionNotes: string;
  patientMoodAfter: string;
  sessionEffectiveness: string;
}): { isValid: boolean; error?: string } => {
  // Validate session notes
  if (!formData.sessionNotes.trim()) {
    return {
      isValid: false,
      error: 'Please enter session notes before completing.'
    };
  }

  // Validate patient mood after
  const moodAfter = parseInt(formData.patientMoodAfter);
  if (isNaN(moodAfter) || moodAfter < 1 || moodAfter > 10) {
    return {
      isValid: false,
      error: 'Patient mood must be a number between 1 and 10'
    };
  }

  // Validate session effectiveness
  const effectiveness = parseInt(formData.sessionEffectiveness);
  if (isNaN(effectiveness) || effectiveness < 1 || effectiveness > 10) {
    return {
      isValid: false,
      error: 'Session effectiveness must be a number between 1 and 10'
    };
  }

  return { isValid: true };
};

/**
 * Prepare end session payload for API
 */
export const prepareEndSessionPayload = (formData: {
  sessionNotes: string;
  patientMoodAfter: string;
  homeworkAssigned: string;
  nextSessionGoals: string;
  sessionEffectiveness: string;
}): EndSessionFormData => ({
  session_notes: formData.sessionNotes.trim(),
  patient_mood_after: parseInt(formData.patientMoodAfter) || 7,
  homework_assigned: formData.homeworkAssigned.trim(),
  next_session_goals: formData.nextSessionGoals.trim(),
  session_effectiveness: parseInt(formData.sessionEffectiveness) || 8,
});

/**
 * Format error message based on error response
 */
export const formatEndSessionError = (error: any, sessionId: string | string[]): string => {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 400) {
    // Better handling for 400 errors
    if (data?.detail) {
      return `Validation Error: ${data.detail}`;
    } else if (data?.error) {
      return `Error: ${data.error}`;
    } else if (typeof data === 'string') {
      return `Error: ${data}`;
    } else if (data?.non_field_errors) {
      return `Validation Error: ${data.non_field_errors.join(', ')}`;
    } else {
      return `Bad Request: Please check your input data. Session ID: ${sessionId}`;
    }
  } else if (status === 404) {
    return 'Session not found.';
  } else if (status === 403) {
    return 'Permission denied.';
  }

  return 'An error occurred while completing the session.';
};

/**
 * Log comprehensive error details for debugging
 */
export const logEndSessionError = (error: any, sessionId: string | string[]) => {
  console.error('❌ Failed to complete session:', error);
  console.error('❌ Error details:', {
    message: error.message,
    status: error?.response?.status,
    statusText: error?.response?.statusText,
    data: error?.response?.data,
    url: error?.config?.url,
    method: error?.config?.method,
    baseURL: error?.config?.baseURL,
    timeout: error?.config?.timeout,
    sessionId,
  });
  
  // Enhanced error logging
  if (error.response) {
    console.error('📄 Error status:', error.response.status);
    console.error('📄 Error data:', error.response.data);
    console.error('📄 Error headers:', error.response.headers);
  } else if (error.request) {
    console.error('📄 No response received:', error.request);
  } else {
    console.error('📄 Request setup error:', error.message);
  }
};

/**
 * Log authentication and request details
 */
export const logEndSessionRequest = (payload: EndSessionFormData, sessionId: string | string[], token: string | null, baseURL: string) => {
  console.log('📤 Auth token exists:', !!token);
  console.log('📤 Auth token (first 20 chars):', token ? token.substring(0, 20) + '...' : 'No token');
  console.log('📤 Sending data:', payload);
  console.log('📤 Sending data to sessionId:', sessionId);
  console.log('📤 Request URL:', `${baseURL}therapy_sessions/sessions/${sessionId}/end/`);
  console.log('📤 Base URL check:', baseURL);
  console.log('📤 Full URL being called:', `${baseURL}therapy_sessions/sessions/${sessionId}/end/`);
};
