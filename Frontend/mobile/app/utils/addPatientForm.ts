// app/utils/addPatientForm.ts
import { NewPatientFormData, AddPatientFormValidation, CreatePatientData } from '../types/therapist';

// Form validation utilities
export const validateEmail = (email: string): boolean => {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  return phone.length >= 10;
};

export const validateDate = (date: string): boolean => {
  if (!date) return true; // Date is optional
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(date);
};

export const validateRequiredFields = (patient: NewPatientFormData): string[] => {
  const errors: string[] = [];
  
  if (!patient.first_name?.trim()) {
    errors.push('First Name is required');
  }
  
  if (!patient.last_name?.trim()) {
    errors.push('Last Name is required');
  }
  
  if (!patient.phone_number?.trim()) {
    errors.push('Phone Number is required');
  }
  
  return errors;
};

export const validatePatientForm = (patient: NewPatientFormData): AddPatientFormValidation => {
  const errors: string[] = [];
  
  // Required field validation
  errors.push(...validateRequiredFields(patient));
  
  // Email validation
  if (patient.email && !validateEmail(patient.email)) {
    errors.push('Please enter a valid email address');
  }
  
  // Phone validation
  if (patient.phone_number && !validatePhone(patient.phone_number)) {
    errors.push('Please enter a valid phone number (at least 10 digits)');
  }
  
  // Date validation
  if (patient.date_of_birth && !validateDate(patient.date_of_birth)) {
    errors.push('Date of Birth must be in YYYY-MM-DD format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Form data transformation utilities
export const getInitialPatientFormData = (): NewPatientFormData => ({
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  date_of_birth: '',
  gender: 'male',
  primary_concern: '',
  therapy_start_date: new Date().toISOString().split('T')[0],
  session_frequency: 'weekly',
  preferred_session_days: [],
  emergency_contact_name: '',
  emergency_contact_phone: '',
  address: '',
  medical_history: '',
  current_medications: '',
  preferred_language: 'en'
});

export const preparePatientDataForAPI = (patient: NewPatientFormData): CreatePatientData => ({
  first_name: patient.first_name.trim(),
  last_name: patient.last_name.trim(),
  email: patient.email.trim().toLowerCase() || '',
  phone_number: patient.phone_number.trim(),
  date_of_birth: patient.date_of_birth || '',
  gender: patient.gender,
  primary_concern: patient.primary_concern.trim() || '',
  therapy_start_date: patient.therapy_start_date,
  session_frequency: patient.session_frequency,
  preferred_session_days: patient.preferred_session_days,
  emergency_contact_name: patient.emergency_contact_name.trim() || '',
  emergency_contact_phone: patient.emergency_contact_phone.trim() || '',
  address: patient.address.trim() || '',
  medical_history: patient.medical_history.trim() || '',
  current_medications: patient.current_medications.trim() || '',
  preferred_language: patient.preferred_language
});

// Form field helpers
export const updatePatientField = (
  currentPatient: NewPatientFormData,
  field: keyof NewPatientFormData,
  value: any
): NewPatientFormData => ({
  ...currentPatient,
  [field]: value
});

export const togglePreferredDay = (
  currentPatient: NewPatientFormData,
  day: string
): NewPatientFormData => ({
  ...currentPatient,
  preferred_session_days: currentPatient.preferred_session_days.includes(day)
    ? currentPatient.preferred_session_days.filter(d => d !== day)
    : [...currentPatient.preferred_session_days, day]
});

// Constants
export const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer Not To Say' }
];

export const SESSION_FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'as_needed', label: 'As Needed' }
];

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ur', label: 'Urdu' }
];

// Error message formatting
export const formatValidationErrors = (errors: string[]): string => {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  
  return 'Please fix the following issues:\n' + errors.map(error => `• ${error}`).join('\n');
};

export const formatAPIError = (error: any): string => {
  if (error.response?.data?.detail?.includes('UserManager')) {
    return 'There is a configuration issue with the backend. Please contact the administrator to fix the UserManager password generation issue.';
  }
  
  if (error.response?.status === 400) {
    const errorData = error.response.data;
    let errorMessage = 'Invalid data provided. Please check:\n';
    
    const fieldErrors = [
      { field: 'email', data: errorData.email },
      { field: 'phone_number', data: errorData.phone_number, label: 'Phone' },
      { field: 'date_of_birth', data: errorData.date_of_birth, label: 'Date of Birth' },
      { field: 'first_name', data: errorData.first_name, label: 'First Name' },
      { field: 'last_name', data: errorData.last_name, label: 'Last Name' },
      { field: 'therapy_start_date', data: errorData.therapy_start_date, label: 'Therapy Start Date' },
      { field: 'preferred_session_days', data: errorData.preferred_session_days, label: 'Preferred Days' }
    ];
    
    for (const { field, data, label } of fieldErrors) {
      if (data) {
        const message = Array.isArray(data) ? data[0] : data;
        errorMessage += `• ${label || field}: ${message}\n`;
      }
    }
    
    if (errorData.non_field_errors) {
      const message = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors;
      errorMessage += `• ${message}\n`;
    }
    
    if (errorData.detail && !errorData.detail.includes('UserManager')) {
      errorMessage += `• ${errorData.detail}\n`;
    }
    
    return errorMessage;
  }
  
  if (error.response?.status === 405) {
    return 'This endpoint method is not allowed. Please check the API configuration.';
  }
  
  if (error.request) {
    return 'Unable to connect to server. Please check your internet connection.';
  }
  
  return `Failed to create patient${error.response?.status ? ` (${error.response.status})` : ''}`;
};
