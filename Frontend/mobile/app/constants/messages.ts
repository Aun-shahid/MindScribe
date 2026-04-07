

export const AUTH_MESSAGES = {
  LOGIN_SUCCESS: 'Welcome back!',
  LOGIN_FAILED: 'Login failed. Please check your credentials and try again.',
  REGISTER_SUCCESS: 'Registration successful! Please check your email to verify your account.',
  REGISTER_FAILED: 'Registration failed. Please try again.',
  EMAIL_SENT: 'Password reset email sent! Check your inbox.',
  EMAIL_SEND_FAILED: 'Could not send password reset email.',
  EMAIL_VERIFIED: 'Email verified successfully!',
  EMAIL_VERIFICATION_FAILED: 'Email verification failed. Please try again.',
  LOGOUT_SUCCESS: 'You have been logged out successfully.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_TOKEN: 'Please enter the verification token.',
  PASSWORD_RESET_SUCCESS: 'Password set successfully. Try logging in to the app with your new password.',
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long.',
  PASSWORDS_DONT_MATCH: 'Passwords do not match.',
  INVALID_TOKEN: 'Please enter a valid verification token.',
  INVALID_PHONE: 'Please enter an 11-digit phone number.',
  INVALID_DATE: 'Date must be in YYYY-MM-DD format.',
  FIRST_NAME_REQUIRED: 'First Name is required',
  LAST_NAME_REQUIRED: 'Last Name is required',
  PHONE_NUMBER_REQUIRED: 'Phone Number is required',
} as const;

// Therapist-specific messages
export const THERAPIST_MESSAGES = {
  // Dashboard messages
  DASHBOARD_LOADING: 'Loading your dashboard...',
  DASHBOARD_PREPARING: 'Preparing your therapeutic workspace',
  DASHBOARD_CONNECTION_ISSUE: 'Connection Issue',
  DASHBOARD_UNABLE_TO_LOAD: 'Unable to load your dashboard. Please check your connection and try again.',
  DASHBOARD_BACK_TO_LOGIN: 'Back to Login',
  
  // Session messages
  SESSION_NO_PATIENT_SELECTED: 'No patient selected',
  SESSION_NO_ACTIVE_SESSION: 'No active session found. Please restart the session.',
  SESSION_RECORDING_STARTED: 'Audio recording has begun.',
  SESSION_RECORDING_STOPPED: 'Audio recording has been stopped. Session is ready to end.',
  SESSION_RECORDING_START_FAILED: 'Failed to start recording. Please try again.',
  SESSION_RECORDING_STOP_FAILED: 'Failed to stop recording. Please try again.',
  SESSION_END_CONFIRMATION: 'Ready to complete this session?',
  SESSION_END_NAVIGATION_FAILED: 'Failed to navigate to end session. Please try again.',
  SESSION_LOAD_FAILED: 'Failed to load sessions',
  SESSION_LOAD_ERROR: 'Could not load sessions.',
  SESSION_LOAD_RETRY: 'Could not load sessions. Please try again.',
  
  // Patient messages
  PATIENT_LOAD_FAILED: 'Failed to load patients',
  PATIENT_REFRESH_FAILED: 'Failed to refresh patients',
  PATIENT_LOAD_ERROR: 'Failed to load patients. Please try again.',
  PATIENT_SELECT_FIRST: 'Please select a patient first.',
  PATIENT_NOT_FOUND: 'Patient not found',
  PATIENT_CREATED_SUCCESS: 'Patient created successfully!',
  PATIENT_CREATE_FAILED: 'Failed to create patient. Please try again.',
  
  // QR Code messages
  QR_CODE_LOADING: 'Loading QR Code...',
  QR_CODE_UNABLE_TO_LOAD: 'Unable to load QR code',
  QR_CODE_LOAD_FAILED: 'Failed to load QR code information',
  QR_CODE_CONNECTION_FAILED: 'Failed to load QR code. Please check your connection and try again.',
  
  // Access control messages
  ACCESS_THERAPIST_ONLY: 'Only therapists can access this feature.',
  PROFILE_NOT_FOUND: 'Therapist profile not found. Please contact support.',
  
  // Form validation messages
  VALIDATION_ERROR_TITLE: 'Validation Error',
  PATIENT_CONNECTION_TITLE: 'Patient Connection',
  PATIENT_CONNECTION_SUBTITLE: 'Have your patient scan this QR code to connect with you',
  
  // Greeting messages
  GREETING_MORNING: 'Good Morning',
  GREETING_AFTERNOON: 'Good Afternoon',
  GREETING_EVENING: 'Good Evening',
  
  // Profile messages
  PROFILE_TITLE: '👩‍⚕️ Therapist Profile',
  PROFILE_LOADING: 'Fetching your profile...',
  PROFILE_LOAD_ERROR: '⚠️ Failed to load profile. Please try again.',
  LOGOUT: 'Logout',
  
  // Patient Details messages
  PATIENT_DETAILS_BASIC_INFO: 'Basic Information',
  PATIENT_DETAILS_THERAPY_INFO: 'Therapy Information',
  PATIENT_DETAILS_EMERGENCY_CONTACT: 'Emergency Contact',
  PATIENT_DETAILS_ADDITIONAL_INFO: 'Additional Information',
  PATIENT_DETAILS_FULL_NAME: 'Full Name',
  PATIENT_DETAILS_EMAIL: 'Email',
  PATIENT_DETAILS_PHONE: 'Phone',
  PATIENT_DETAILS_DOB: 'Date of Birth',
  PATIENT_DETAILS_GENDER: 'Gender',
  PATIENT_DETAILS_PRIMARY_CONCERN: 'Primary Concern',
  PATIENT_DETAILS_THERAPY_START: 'Therapy Start',
  PATIENT_DETAILS_SESSION_FREQUENCY: 'Session Frequency',
  PATIENT_DETAILS_EMERGENCY_NAME: 'Name',
  PATIENT_DETAILS_PREFERRED_LANGUAGE: 'Preferred Language',
  PATIENT_DETAILS_PREFERRED_DAYS: 'Preferred Session Days',
  
  // End Session messages
  END_SESSION_TITLE: 'End Session',
  END_SESSION_NOTES_TITLE: 'Session Notes',
  END_SESSION_NOTES_PLACEHOLDER: 'E.g. Covered anxiety management, patient was more open',
  END_SESSION_MOOD_TITLE: 'Patient Mood After (1-10)',
  END_SESSION_MOOD_PLACEHOLDER: 'e.g. 8',
  END_SESSION_HOMEWORK_TITLE: 'Homework Assigned',
  END_SESSION_HOMEWORK_PLACEHOLDER: 'e.g. Practice mindfulness daily',
  END_SESSION_GOALS_TITLE: 'Next Session Goals',
  END_SESSION_GOALS_PLACEHOLDER: 'e.g. Explore root of social anxiety',
  END_SESSION_EFFECTIVENESS_TITLE: 'Session Effectiveness (1-10)',
  END_SESSION_EFFECTIVENESS_PLACEHOLDER: 'e.g. 9',
  END_SESSION_COMPLETE_BUTTON: 'Complete Session',
  
  // Start New Session messages
  START_NEW_SESSION_EXISTING_TAB: 'Existing Patients',
  START_NEW_SESSION_NEW_TAB: 'New Patient',
  START_NEW_SESSION_SEARCH_TITLE: 'Search Patients',
  START_NEW_SESSION_SEARCH_PLACEHOLDER: 'Search by name...',
  START_NEW_SESSION_QR_TITLE: 'Patient Connection',
  START_NEW_SESSION_QR_SUBTITLE: 'Have your patient scan this QR code to join the session',
  START_NEW_SESSION_NO_PATIENTS: 'No patients found',
  START_NEW_SESSION_START_BUTTON: 'Start Session',
  
  // Status messages
  READY: 'Ready',
  LOADING: 'Loading...',
  SAVING: 'Saving...',
  CANCEL: 'Cancel',
  SAVE: 'Save',
  ERROR: 'Error',
  SUCCESS: 'Success',
} as const;

// Add Patient Form specific messages
export const ADD_PATIENT_FORM_MESSAGES = {
  FORM_TITLE: 'Add New Patient',
  BASIC_INFORMATION: 'Basic Information',
  THERAPY_INFORMATION: 'Therapy Information',
  SESSION_FREQUENCY: 'Session Frequency',
  PREFERRED_SESSION_DAYS: 'Preferred Session Days',
  EMERGENCY_CONTACT: 'Emergency Contact',
  ADDRESS_INFORMATION: 'Address Information',
  MEDICAL_INFORMATION: 'Medical Information',
  PREFERRED_LANGUAGE: 'Preferred Language',
  GENDER: 'Gender',
  
  // Placeholders
  FIRST_NAME_PLACEHOLDER: 'First Name *',
  LAST_NAME_PLACEHOLDER: 'Last Name *',
  EMAIL_PLACEHOLDER: 'Email',
  PHONE_PLACEHOLDER: 'Phone Number *',
  DATE_OF_BIRTH_PLACEHOLDER: 'Date of Birth (YYYY-MM-DD)',
  PRIMARY_CONCERN_PLACEHOLDER: 'Primary Concern',
  THERAPY_START_DATE_PLACEHOLDER: 'Therapy Start Date (YYYY-MM-DD)',
  EMERGENCY_CONTACT_NAME_PLACEHOLDER: 'Emergency Contact Name',
  EMERGENCY_CONTACT_PHONE_PLACEHOLDER: 'Emergency Contact Phone',
  ADDRESS_PLACEHOLDER: 'Complete Address',
  MEDICAL_HISTORY_PLACEHOLDER: 'Medical History',
  CURRENT_MEDICATIONS_PLACEHOLDER: 'Current Medications',
  
  // Validation messages
  REQUIRED_FIELDS_ERROR: 'Please fill in all required fields (First Name, Last Name, Phone Number)',
  EMAIL_VALIDATION_ERROR: 'Please enter a valid email address',
  DATE_VALIDATION_ERROR: 'Date of Birth must be in YYYY-MM-DD format',
  PHONE_VALIDATION_ERROR: 'Please enter a valid phone number',
  
  // API error messages
  BACKEND_CONFIG_ERROR: 'There is a configuration issue with the backend. Please contact the administrator to fix the UserManager password generation issue.',
  INVALID_DATA_ERROR: 'Invalid data provided. Please check:',
  ENDPOINT_NOT_ALLOWED: 'This endpoint method is not allowed. Please check the API configuration.',
  NETWORK_ERROR: 'Unable to connect to server. Please check your internet connection.',
  
  // Success message
  CREATE_SUCCESS: 'Patient created successfully',
} as const;

// Session specific messages
export const SESSION_MESSAGES = {
  RECORDING_STARTED: 'Recording Started',
  RECORDING_STOPPED: 'Recording Stopped',
  END_SESSION: 'End Session',
  START_SESSION: 'Start Session',
  CONTINUE: 'Continue',
  END_NOW: 'End Now',
} as const;

// Loading and status messages
export const STATUS_MESSAGES = {
  LOADING_SESSIONS: 'Loading sessions...',
  LOADING_PATIENTS: 'Loading patients...',
  LOADING_DASHBOARD: 'Loading dashboard...',
  PREPARING_WORKSPACE: 'Preparing your therapeutic workspace',
  NO_DATA_AVAILABLE: 'No data available',
  REFRESH: 'Refresh',
  RETRY: 'Retry',
} as const;

// Navigation and UI messages
export const UI_MESSAGES = {
  TODAYS_OVERVIEW: 'Today\'s Overview',
  QUICK_ACTIONS: 'Quick Actions',
  WEEKLY_PERFORMANCE: 'Weekly Performance',
  PATIENT_MOOD_INSIGHTS: 'Patient Mood Insights',
  RECENT_PATIENTS: 'Recent Patients',
  SESSIONS_TODAY: 'Sessions Today',
  TOTAL_PATIENTS: 'Total Patients',
  MOOD_ALERTS: 'Mood Alerts',
  PENDING_SOAP: 'Pending SOAP',
  START_NEW_SESSION: 'Start New Session',
  BEGIN_THERAPEUTIC_INTERVENTION: 'Begin therapeutic intervention',
  UNDER_YOUR_CARE: 'Under your care',
  REQUIRE_ATTENTION: 'Require attention',
  NOTES_TO_REVIEW: 'Notes to review',
  UPCOMING: 'upcoming',
  RECENTLY_CONNECTED: 'Recently connected individuals',
  CURRENT_EMOTIONAL_LANDSCAPE: 'Current emotional landscape',
  YOUR_THERAPEUTIC_IMPACT: 'Your therapeutic impact this week',
  MAKING_DIFFERENCE: 'Making a difference, one session at a time',
  PROFESSIONAL_DETAILS: 'Professional Details',
  LICENSE: 'License:',
  SPECIALTY: 'Specialty:',
  SCHEDULE: 'Schedule',
} as const;

const ExpoRouterStubScreen = () => null;
export default ExpoRouterStubScreen;

