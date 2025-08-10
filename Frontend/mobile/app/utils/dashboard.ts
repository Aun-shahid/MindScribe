// app/utils/dashboard.ts

import { DashboardData, MoodAlert, SoapNote, PatientMood } from '../types/therapist';

/**
 * Get current greeting based on time of day
 */
export const getCurrentGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

/**
 * Filter sessions for today
 */
export const getTodaySessions = (sessions: any[]): any[] => {
  const today = new Date().toISOString().split('T')[0];
  return sessions.filter((session: any) => {
    const sessionDate = session.session_date?.split('T')[0];
    return sessionDate === today;
  });
};

/**
 * Filter upcoming sessions (future dates)
 */
export const getUpcomingSessions = (sessions: any[], limit: number = 5): any[] => {
  const today = new Date().toISOString().split('T')[0];
  return sessions.filter((session: any) => {
    const sessionDate = session.session_date?.split('T')[0];
    return sessionDate && sessionDate > today;
  }).slice(0, limit);
};

/**
 * Calculate session hours from sessions data
 */
export const calculateSessionHours = (sessions: any[], todaySessions: any[]) => {
  const currentDate = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Calculate total hours from all sessions
  const totalHours = sessions.reduce((total: number, session: any) => {
    return total + (session.duration_minutes || 0);
  }, 0) / 60; // Convert minutes to hours

  // Calculate today's hours
  const todayHours = todaySessions.reduce((total: number, session: any) => {
    return total + (session.duration_minutes || 0);
  }, 0) / 60; // Convert minutes to hours

  // Calculate this week's hours
  const thisWeekSessions = sessions.filter((session: any) => {
    const sessionDate = new Date(session.session_date);
    return sessionDate >= weekAgo && sessionDate <= currentDate;
  });

  const thisWeekHours = thisWeekSessions.reduce((total: number, session: any) => {
    return total + (session.duration_minutes || 0);
  }, 0) / 60; // Convert minutes to hours

  return {
    total: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
    today: Math.round(todayHours * 10) / 10,
    thisWeek: Math.round(thisWeekHours * 10) / 10,
  };
};

/**
 * Generate mock mood alerts
 */
export const generateMoodAlerts = (): MoodAlert[] => [
  { id: 1, patient: 'John D.', mood: 'anxious', level: 'high', color: '#FF6B6B' },
  { id: 2, patient: 'Sarah M.', mood: 'stressed', level: 'medium', color: '#FFB347' },
];

/**
 * Generate mock SOAP notes
 */
export const generateSoapNotes = (): SoapNote[] => [
  { id: 1, patient: 'Alex K.', status: 'pending', count: 3 },
  { id: 2, patient: 'Maria L.', status: 'completed', count: 1 },
];

/**
 * Generate patient moods data
 */
export const generatePatientMoods = (): PatientMood[] => [
  { name: 'Anxious', count: 2, color: '#FF6B6B' },
  { name: 'Peaceful', count: 3, color: '#4ECDC4' },
  { name: 'Sad', count: 1, color: '#A8E6CF' },
  { name: 'Calm', count: 4, color: '#B4A7D6' },
];

/**
 * Create dashboard data from API responses
 */
export const createDashboardData = (
  user: any,
  profile: any,
  patientsData: any[],
  sessionsData: any[]
): DashboardData => {
  const totalPatients = patientsData.length;
  const totalSessions = sessionsData.length;
  
  const todaySessions = getTodaySessions(sessionsData);
  const upcomingSessions = getUpcomingSessions(sessionsData);
  const recentPatients = patientsData.slice(0, 5);
  const moodAlerts = generateMoodAlerts();
  const soapNotes = generateSoapNotes();
  const sessionHours = calculateSessionHours(sessionsData, todaySessions);
  const patientMoods = generatePatientMoods();

  console.log('⏰ [Dashboard Utils] Session hours calculated:');
  console.log('  - Total sessions:', sessionsData.length, 'Total hours:', sessionHours.total);
  console.log('  - Today sessions:', todaySessions.length, 'Today hours:', sessionHours.today);
  console.log('  - This week sessions:', sessionHours.thisWeek);

  return {
    therapist_info: {
      'Name': `${user.first_name} ${user.last_name}`,
      'Email': user.email || 'N/A',
      'Specialization': profile.specialization || 'General Therapy',
      'License Number': profile.license_number || 'N/A',
      'Clinic Name': profile.clinic_name || 'Private Practice',
      'Years of Experience': profile.years_of_experience?.toString() || 'N/A',
      'Therapist PIN': profile.therapist_pin || 'N/A'
    },
    today_sessions: todaySessions,
    upcoming_sessions: upcomingSessions,
    patient_stats: {
      'Total Patients': totalPatients.toString(),
      'Active Patients': patientsData.filter((p: any) => p.status === 'active').length.toString(),
      'Connected Patients': patientsData.filter((p: any) => p.connected_at).length.toString()
    },
    session_stats: {
      'Total Sessions': totalSessions.toString(),
      'Today\'s Sessions': todaySessions.length.toString(),
      'Upcoming Sessions': upcomingSessions.length.toString(),
      'Completed Sessions': sessionsData.filter((s: any) => s.status === 'completed').length.toString()
    },
    recent_patients: recentPatients,
    mood_alerts: moodAlerts,
    soap_notes: soapNotes,
    session_hours: sessionHours,
    progress_data: {
      soap_progress: Math.round((sessionsData.filter((s: any) => s.soap_notes).length / Math.max(totalSessions, 1)) * 100),
      patient_moods: patientMoods
    }
  };
};

/**
 * Create fallback dashboard data when API calls fail
 */
export const createFallbackDashboardData = (user: any): DashboardData => ({
  therapist_info: {
    'Name': `${user.first_name} ${user.last_name}`,
    'Email': user.email || 'N/A',
    'User Type': user.user_type || 'therapist',
    'Status': 'Active'
  },
  today_sessions: [],
  upcoming_sessions: [],
  patient_stats: { 'Status': 'Data unavailable' },
  session_stats: { 'Status': 'Data unavailable' },
  recent_patients: [],
  mood_alerts: [],
  soap_notes: [],
  session_hours: { total: 0, today: 0, thisWeek: 0 },
  progress_data: { soap_progress: 0, patient_moods: [] }
});

/**
 * Format patient name from patient object
 */
export const formatPatientName = (patient: any): string => {
  if (typeof patient === 'string') {
    return patient;
  }
  return patient.name || patient.full_name || 'Patient';
};

/**
 * Format patient connection date
 */
export const formatPatientDate = (patient: any): string => {
  if (typeof patient === 'object' && patient.connected_at) {
    return new Date(patient.connected_at).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
  return 'Recently connected';
};

/**
 * Get patient avatar initial
 */
export const getPatientInitial = (patient: any): string => {
  if (typeof patient === 'string') {
    return patient.charAt(0).toUpperCase();
  }
  return (patient.name || patient.full_name || 'P').charAt(0).toUpperCase();
};
