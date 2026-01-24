// src/utils/patientDetails.ts

import type { PatientDetailsType } from '../types/therapist';

/**
 * Clean and sanitize patient data to ensure safe rendering
 */
export const cleanPatientData = (patient: PatientDetailsType): PatientDetailsType => {
  return {
    ...patient,
    last_session: typeof patient.last_session === 'string' 
      ? patient.last_session 
      : patient.last_session 
        ? JSON.stringify(patient.last_session) 
        : null,
    next_session: typeof patient.next_session === 'string' 
      ? patient.next_session 
      : patient.next_session 
        ? JSON.stringify(patient.next_session) 
        : null,
  };
};

/**
 * Find patient by ID from a list of patients
 */
export const findPatientById = (patients: PatientDetailsType[], patientId: string): PatientDetailsType | undefined => {
  return patients.find((patient) => patient.id === patientId);
};

/**
 * Format date display for patient details
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Not provided';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch {
    return dateString;
  }
};

/**
 * Format phone number display
 */
export const formatPhoneNumber = (phone: string | null): string => {
  return phone || 'Not provided';
};

/**
 * Format gender display
 */
export const formatGender = (gender: string | null): string => {
  if (!gender) return 'Not specified';
  
  // Capitalize first letter
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
};

/**
 * Format preferred session days
 */
export const formatPreferredDays = (days: string[] | undefined): string => {
  if (!days || days.length === 0) return 'Not specified';
  
  // Capitalize each day
  const capitalizedDays = days.map(day => 
    day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()
  );
  
  return capitalizedDays.join(', ');
};

/**
 * Format preferred language
 */
export const formatPreferredLanguage = (language: string | undefined): string => {
  if (!language) return 'English';
  
  // Map language codes to full names
  const languageMap: { [key: string]: string } = {
    'en': 'English',
    'ur': 'Urdu',
    'english': 'English',
    'urdu': 'Urdu'
  };
  
  return languageMap[language.toLowerCase()] || language;
};

/**
 * Check if therapy information section should be displayed
 */
export const shouldShowTherapyInfo = (patient: PatientDetailsType): boolean => {
  return !!(
    patient.patient_profile?.primary_concern || 
    patient.patient_profile?.therapy_start_date || 
    patient.patient_profile?.session_frequency
  );
};

/**
 * Check if emergency contact section should be displayed
 */
export const shouldShowEmergencyContact = (patient: PatientDetailsType): boolean => {
  return !!(
    patient.patient_profile?.emergency_contact_name || 
    patient.patient_profile?.emergency_contact_phone
  );
};

/**
 * Check if preferred session days should be displayed
 */
export const shouldShowPreferredDays = (patient: PatientDetailsType): boolean => {
  return !!(
    patient.patient_profile?.preferred_session_days && 
    patient.patient_profile.preferred_session_days.length > 0
  );
};