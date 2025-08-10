// app/utils/sessionConsent.ts

import { SessionConsentData, CreateSessionData } from '../types/therapist';

export const getInitialConsentData = (): SessionConsentData => ({
  session_type: 'individual',
  duration_minutes: 60,
  location: 'Office',
  patient_goals: '',
  fee_charged: 0,
  is_online: false,
  consent_recording: false,
  consent_ai_analysis: false
});

export const validateConsentData = (data: SessionConsentData): string | null => {
  if (!data.patient_goals.trim()) {
    return 'Session goals are required';
  }

  if (!data.consent_recording || !data.consent_ai_analysis) {
    return 'Both recording and AI analysis consent are required to proceed.';
  }

  return null;
};

export const formatDurationMinutes = (duration: number | string): number => {
  if (typeof duration === 'string') {
    return duration === '' ? 60 : parseInt(duration);
  }
  return duration;
};

export const prepareCreateSessionData = (
  patientId: string,
  consentData: SessionConsentData
): CreateSessionData => ({
  patient_id: patientId,
  session_type: consentData.session_type,
  scheduled_date: new Date().toISOString(),
  duration_minutes: formatDurationMinutes(consentData.duration_minutes),
  location: consentData.location,
  is_online: consentData.is_online,
  patient_goals: consentData.patient_goals,
  fee_charged: consentData.fee_charged,
  consent_recording: consentData.consent_recording,
  consent_ai_analysis: consentData.consent_ai_analysis
});

export const prepareStartSessionData = () => ({
  detail: "Starting therapy session",
  session: {
    status: "in_progress",
    actual_start_time: new Date().toISOString()
  }
});

export const formatErrorMessage = (error: any): string => {
  if (error.response?.status === 400) {
    const errorData = error.response.data;
    if (typeof errorData === 'object') {
      const errorFields = Object.keys(errorData).join(', ');
      return `Invalid data in fields: ${errorFields}`;
    } else {
      return `Invalid data: ${errorData}`;
    }
  } else if (error.response?.status === 500) {
    return 'Server error. Please check backend connection.';
  }
  return 'Failed to create session. Please try again.';
};

export const updateConsentField = <K extends keyof SessionConsentData>(
  data: SessionConsentData,
  field: K,
  value: SessionConsentData[K]
): SessionConsentData => ({
  ...data,
  [field]: value
});

export const handleDurationInput = (
  text: string,
  currentData: SessionConsentData
): SessionConsentData => {
  if (text === '') {
    return updateConsentField(currentData, 'duration_minutes', '');
  } else {
    const numValue = parseInt(text);
    if (!isNaN(numValue)) {
      return updateConsentField(currentData, 'duration_minutes', numValue);
    }
  }
  return currentData;
};

export const handleFeeInput = (
  text: string,
  currentData: SessionConsentData
): SessionConsentData => {
  const feeValue = parseFloat(text) || 0;
  return updateConsentField(currentData, 'fee_charged', feeValue);
};
