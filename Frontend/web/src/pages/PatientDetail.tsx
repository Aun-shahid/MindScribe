// src/pages/PatientDetail.tsx
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { usePatientDetail } from '../hooks/useTherapist';
import { InfoField } from '../components/InfoField';
import { InfoSection } from '../components/InfoSection';
import therapistService from '../services/therapist.service';
import type { SessionType } from '../types/therapist';
import {
  formatDate,
  formatPhoneNumber,
  formatGender,
  formatPreferredDays,
  formatPreferredLanguage,
  shouldShowTherapyInfo,
  shouldShowEmergencyContact,
  shouldShowPreferredDays,
} from '../utils/patientDetails';

const PatientDetail = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { patient, loading, error, handleStartSession } = usePatientDetail(patientId || '');
  const [scheduleSuccess, setScheduleSuccess] = useState<{sessions_created: number; sessions: any[]} | null>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  
  // Session history states
  const [pastSessions, setPastSessions] = useState<SessionType[]>([]);
  const [loadingPastSessions, setLoadingPastSessions] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);
  
  // Upcoming sessions for this patient
  const [upcomingSessions, setUpcomingSessions] = useState<SessionType[]>([]);
  const [loadingUpcomingSessions, setLoadingUpcomingSessions] = useState(false);
  
  // Schedule modal mode: 'choose' | 'manage' | 'add'
  const [scheduleMode, setScheduleMode] = useState<'choose' | 'manage' | 'add'>('choose');
  
  // Bulk update states
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'cancel' | 'update_location' | 'update_type' | 'update_duration' | ''>('');
  const [bulkUpdateData, setBulkUpdateData] = useState({
    new_location: '',
    new_session_type: 'individual' as 'individual' | 'group' | 'family' | 'couples',
    new_duration: 60,
    reason: '',
  });
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Recurring schedule states
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringScheduling, setRecurringScheduling] = useState(false);
  const [usePatientPreferences, setUsePatientPreferences] = useState(true);
  const [recurringFormData, setRecurringFormData] = useState({
    start_date: '',
    end_date: '',
    number_of_sessions: '',
    session_time: '09:00',
    duration_minutes: '60',
    session_type: 'individual',
    location: '',
    is_online: false,
    fee_charged: '',
    override_frequency: '',
    override_days: [] as string[],
  });
  const [recurringErrors, setRecurringErrors] = useState<Record<string, string>>({});

  // Load patient preferences
  const loadPreferences = async () => {
    if (!patientId) return;
    
    setLoadingPreferences(true);
    try {
      const prefs = await therapistService.getPatientSchedulePreferences(patientId);
      setPreferences(prefs);
    } catch (err) {
      console.error('Failed to load preferences:', err);
    } finally {
      setLoadingPreferences(false);
    }
  };

  // Load upcoming sessions for this patient
  const loadUpcomingSessions = async () => {
    if (!patientId) return;
    
    setLoadingUpcomingSessions(true);
    try {
      const sessions = await therapistService.getPatientSessions(patientId);
      console.log('Loaded sessions for patient:', sessions);
      // Filter for upcoming sessions only (include UPCOMING, IN_PROGRESS, RESCHEDULED statuses)
      const now = new Date();
      const upcoming = sessions.filter((s: any) => {
        // API returns session_date, not scheduled_date
        const dateStr = s.session_date || s.scheduled_date || s.start_time || '';
        const sessionDate = new Date(dateStr);
        const isUpcoming = sessionDate >= now;
        const isActiveStatus = !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(s.status || '');
        console.log(`Session ${s.id}: date=${dateStr}, isUpcoming=${isUpcoming}, status=${s.status}, isActiveStatus=${isActiveStatus}`);
        return isUpcoming && isActiveStatus;
      });
      console.log('Filtered upcoming sessions:', upcoming);
      setUpcomingSessions(upcoming);
    } catch (err) {
      console.error('Failed to load upcoming sessions:', err);
      setUpcomingSessions([]);
    } finally {
      setLoadingUpcomingSessions(false);
    }
  };

  // Open schedule modal
  const openScheduleModal = async () => {
    setScheduleMode('choose');
    setSelectedSessions([]);
    setBulkAction('');
    setShowRecurringModal(true);
    await loadUpcomingSessions();
  };

  // Toggle session selection for bulk operations
  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessions(prev => 
      prev.includes(sessionId) 
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  // Select/Deselect all sessions
  const toggleSelectAll = () => {
    if (selectedSessions.length === upcomingSessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(upcomingSessions.map(s => s.id));
    }
  };

  // Handle bulk update
  const handleBulkUpdate = async () => {
    if (selectedSessions.length === 0 || !bulkAction) {
      alert('Please select sessions and an action');
      return;
    }

    setBulkUpdating(true);
    try {
      const payload: any = {
        session_ids: selectedSessions,
        action: bulkAction,
      };

      if (bulkAction === 'cancel') {
        payload.reason = bulkUpdateData.reason || 'Bulk cancelled';
      } else if (bulkAction === 'update_location') {
        payload.new_location = bulkUpdateData.new_location;
      } else if (bulkAction === 'update_type') {
        payload.new_session_type = bulkUpdateData.new_session_type;
      } else if (bulkAction === 'update_duration') {
        payload.new_duration = bulkUpdateData.new_duration;
      }

      const result = await therapistService.bulkUpdateSessions(payload);
      alert(`Success! ${result.updated_sessions} sessions updated.`);
      
      // Reset and reload
      setSelectedSessions([]);
      setBulkAction('');
      await loadUpcomingSessions();
    } catch (err: any) {
      console.error('Bulk update failed:', err);
      alert(err.message || 'Failed to update sessions');
    } finally {
      setBulkUpdating(false);
    }
  };

  // Load preferences when component mounts
  useEffect(() => {
    loadPreferences();
  }, [patientId]);

  // Load past sessions for this patient
  useEffect(() => {
    const loadPastSessions = async () => {
      if (!patientId) return;
      
      setLoadingPastSessions(true);
      try {
        const sessions = await therapistService.getPastSessions({ patientId, limit: 10 });
        setPastSessions(sessions);
      } catch (err) {
        console.error('Failed to load past sessions:', err);
      } finally {
        setLoadingPastSessions(false);
      }
    };
    
    loadPastSessions();
  }, [patientId]);

  // Auto-fill form when using patient preferences
  useEffect(() => {
    if (usePatientPreferences && preferences && showRecurringModal) {
      // Use patient's therapy start date if available, otherwise use tomorrow
      let startDate;
      if (patient?.patient_profile?.therapy_start_date) {
        const therapyStartDate = new Date(patient.patient_profile.therapy_start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // If therapy start date is in the future, use it
        // If it's in the past, use tomorrow
        if (therapyStartDate > today) {
          startDate = therapyStartDate.toISOString().split('T')[0];
        } else {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          startDate = tomorrow.toISOString().split('T')[0];
        }
      } else {
        // Fallback to tomorrow if no therapy start date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        startDate = tomorrow.toISOString().split('T')[0];
      }
      
      // Pre-fill form with patient preferences
      setRecurringFormData({
        start_date: startDate,
        end_date: '',
        number_of_sessions: '10', // Default 10 sessions
        session_time: preferences.preferences?.preferred_session_time || '09:00',
        duration_minutes: preferences.preferences?.session_duration?.toString() || '60',
        session_type: 'individual',
        location: preferences.preferences?.preferred_location || '',
        is_online: false,
        fee_charged: preferences.preferences?.session_fee?.toString() || '',
        override_frequency: '', // Will use patient's default
        override_days: [], // Will use patient's default
      });
    } else if (!usePatientPreferences && showRecurringModal) {
      // Reset to empty when custom mode
      setRecurringFormData({
        start_date: '',
        end_date: '',
        number_of_sessions: '',
        session_time: '09:00',
        duration_minutes: '60',
        session_type: 'individual',
        location: '',
        is_online: false,
        fee_charged: '',
        override_frequency: '',
        override_days: [],
      });
    }
  }, [usePatientPreferences, preferences, showRecurringModal]);

  // Auto-calculate end date based on number of sessions, start date, frequency, and days
  useEffect(() => {
    if (!recurringFormData.start_date || !recurringFormData.number_of_sessions) {
      return; // Need both to calculate
    }

    const numSessions = parseInt(recurringFormData.number_of_sessions);
    if (isNaN(numSessions) || numSessions <= 0) {
      return;
    }

    // Determine frequency and days to use
    let frequency = recurringFormData.override_frequency;
    let selectedDays = recurringFormData.override_days;

    // If using patient preferences and no override, use patient's defaults
    if (usePatientPreferences && !frequency && preferences?.preferences?.session_frequency) {
      frequency = preferences.preferences.session_frequency;
    }
    if (usePatientPreferences && selectedDays.length === 0 && preferences?.preferences?.preferred_session_days) {
      selectedDays = preferences.preferences.preferred_session_days;
    }

    // Need frequency and at least one day to calculate
    if (!frequency || selectedDays.length === 0) {
      return;
    }

    // Calculate end date
    const startDate = new Date(recurringFormData.start_date);
    let currentDate = new Date(startDate);
    let sessionsScheduled = 0;
    const dayNameToNumber: { [key: string]: number } = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };
    const selectedDayNumbers = selectedDays.map(d => dayNameToNumber[d.toLowerCase()]);

    const maxIterations = 400; // Safety limit (over 1 year)
    let iterations = 0;
    let weekNumber = 0;

    while (sessionsScheduled < numSessions && iterations < maxIterations) {
      const dayOfWeek = currentDate.getDay();
      
      // Check if current day is a selected day
      if (selectedDayNumbers.includes(dayOfWeek)) {
        // Calculate which week we're in since start
        const daysSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const currentWeekNumber = Math.floor(daysSinceStart / 7);
        
        let shouldSchedule = false;
        
        if (frequency === 'weekly') {
          // Every week
          shouldSchedule = true;
        } else if (frequency === 'biweekly') {
          // Every other week (weeks 0, 2, 4, 6...)
          shouldSchedule = currentWeekNumber % 2 === 0;
        } else if (frequency === 'monthly') {
          // Every 4 weeks (weeks 0, 4, 8, 12...)
          shouldSchedule = currentWeekNumber % 4 === 0;
        }
        
        if (shouldSchedule && currentDate >= startDate) {
          sessionsScheduled++;
          if (sessionsScheduled >= numSessions) {
            break;
          }
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      iterations++;
    }

    // Set the calculated end date
    const calculatedEndDate = currentDate.toISOString().split('T')[0];
    if (calculatedEndDate !== recurringFormData.end_date) {
      setRecurringFormData(prev => ({ ...prev, end_date: calculatedEndDate }));
    }
  }, [
    recurringFormData.start_date,
    recurringFormData.number_of_sessions,
    recurringFormData.override_frequency,
    recurringFormData.override_days,
    usePatientPreferences,
    preferences
  ]);

  const handleRecurringSchedule = async () => {
    if (!patientId) return;

    // Validation
    const errors: Record<string, string> = {};
    
    if (!recurringFormData.start_date) {
      errors.start_date = 'Start date is required';
    } else {
      const startDate = new Date(recurringFormData.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate <= today) {
        errors.start_date = 'Start date must be in the future';
      }
    }

    if (!recurringFormData.end_date && !recurringFormData.number_of_sessions) {
      errors.general = 'Either end date or number of sessions must be provided';
    }

    if (recurringFormData.end_date && recurringFormData.start_date) {
      const endDate = new Date(recurringFormData.end_date);
      const startDate = new Date(recurringFormData.start_date);
      if (endDate <= startDate) {
        errors.end_date = 'End date must be after start date';
      }
    }

    if (!recurringFormData.session_time) {
      errors.session_time = 'Session time is required';
    }

    // In custom mode, frequency and days are required
    if (!usePatientPreferences) {
      if (!recurringFormData.override_frequency) {
        errors.general = 'Frequency is required in custom mode';
      }
      if (recurringFormData.override_days.length === 0) {
        errors.general = errors.general 
          ? errors.general + '. Preferred days are also required' 
          : 'At least one preferred day is required in custom mode';
      }
    }

    if (Object.keys(errors).length > 0) {
      setRecurringErrors(errors);
      return;
    }

    setRecurringScheduling(true);
    setScheduleSuccess(null);
    setRecurringErrors({});

    try {
      const payload: any = {
        patient_id: patientId,
        start_date: recurringFormData.start_date,
        session_time: recurringFormData.session_time,
        duration_minutes: parseInt(recurringFormData.duration_minutes),
        session_type: recurringFormData.session_type,
        is_online: recurringFormData.is_online,
      };

      if (recurringFormData.end_date) {
        payload.end_date = recurringFormData.end_date;
      }
      if (recurringFormData.number_of_sessions) {
        payload.number_of_sessions = parseInt(recurringFormData.number_of_sessions);
      }
      if (recurringFormData.location) {
        payload.location = recurringFormData.location;
      }
      if (recurringFormData.fee_charged) {
        payload.fee_charged = parseFloat(recurringFormData.fee_charged);
      }
      if (recurringFormData.override_frequency) {
        payload.override_frequency = recurringFormData.override_frequency;
      }
      if (recurringFormData.override_days.length > 0) {
        payload.override_days = recurringFormData.override_days;
      }

      const result = await therapistService.scheduleRecurringSessions(payload);
      setScheduleSuccess(result);
      setShowRecurringModal(false);
      
      // Update local preferences state with the values used for scheduling
      if (result.schedule_summary) {
        setPreferences((prev: any) => ({
          ...prev,
          preferences: {
            ...prev?.preferences,
            session_frequency: result.schedule_summary.frequency || prev?.preferences?.session_frequency,
            preferred_session_days: result.schedule_summary.days || prev?.preferences?.preferred_session_days,
          },
          upcoming_sessions_count: (prev?.upcoming_sessions_count || 0) + result.sessions_created,
        }));
      }
      
      // Reset form
      setRecurringFormData({
        start_date: '',
        end_date: '',
        number_of_sessions: '',
        session_time: '09:00',
        duration_minutes: '60',
        session_type: 'individual',
        location: '',
        is_online: false,
        fee_charged: '',
        override_frequency: '',
        override_days: [],
      });

      setTimeout(() => {
        setScheduleSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error('Recurring schedule failed:', err);
      setRecurringErrors({ general: err.message || 'Failed to schedule sessions' });
    } finally {
      setRecurringScheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading patient details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
              <p className="font-medium">Error loading patient</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => navigate('/patients')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Go Back to Patients
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-500 text-lg">Patient not found</p>
            <button
              onClick={() => navigate('/patients')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Go Back to Patients
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/patients')}
                className="p-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold">Patient Details</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  openScheduleModal();
                  setUsePatientPreferences(true);
                }}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-500 transition-colors shadow-sm"
              >
                📅 Schedule Sessions
              </button>
              <button
                onClick={handleStartSession}
                className="px-6 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-sm"
              >
                Start Session
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {scheduleSuccess && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-lg">
            <p className="font-medium">✓ Sessions scheduled successfully!</p>
            <p className="text-sm mt-1">
              Created {scheduleSuccess.sessions_created} session{scheduleSuccess.sessions_created !== 1 ? 's' : ''} for this patient.
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Schedule Preferences Card */}
          {preferences && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg shadow-sm border border-indigo-200 p-6">
              <h3 className="text-lg font-semibold text-indigo-900 mb-4">📅 Schedule Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Session Frequency</p>
                  <p className="text-lg font-semibold text-indigo-600 capitalize">
                    {preferences.preferences.session_frequency?.replace('_', ' ')}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Preferred Days</p>
                  <p className="text-lg font-semibold text-indigo-600">
                    {preferences.preferences.preferred_session_days?.length > 0 
                      ? preferences.preferences.preferred_session_days.map((d: string) => d.substring(0, 3)).join(', ')
                      : 'Not set'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Upcoming Sessions</p>
                  <p className="text-lg font-semibold text-green-600">
                    {preferences.upcoming_sessions_count} scheduled
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <InfoSection title="Basic Information">
            <InfoField 
              label="Full Name" 
              value={patient.full_name} 
            />
            <InfoField 
              label="Email" 
              value={patient.email} 
            />
            <InfoField 
              label="Phone Number" 
              value={formatPhoneNumber(patient.phone_number)} 
            />
            <InfoField 
              label="Date of Birth" 
              value={formatDate(patient.date_of_birth)} 
            />
            <InfoField 
              label="Gender" 
              value={formatGender(patient.gender)} 
            />
            <InfoField 
              label="Patient ID" 
              value={patient.id} 
            />
          </InfoSection>

          {/* Therapy Information */}
          {shouldShowTherapyInfo(patient) && (
            <InfoSection title="Therapy Information">
              {patient.patient_profile?.primary_concern && (
                <InfoField 
                  label="Primary Concern" 
                  value={patient.patient_profile.primary_concern} 
                  className="md:col-span-2"
                />
              )}
              {patient.patient_profile?.therapy_start_date && (
                <InfoField 
                  label="Therapy Start Date" 
                  value={formatDate(patient.patient_profile.therapy_start_date)} 
                />
              )}
              {patient.patient_profile?.session_frequency && (
                <InfoField 
                  label="Session Frequency" 
                  value={patient.patient_profile.session_frequency} 
                />
              )}
            </InfoSection>
          )}

          {/* Emergency Contact */}
          {shouldShowEmergencyContact(patient) && (
            <InfoSection title="Emergency Contact">
              {patient.patient_profile?.emergency_contact_name && (
                <InfoField 
                  label="Contact Name" 
                  value={patient.patient_profile.emergency_contact_name} 
                />
              )}
              {patient.patient_profile?.emergency_contact_phone && (
                <InfoField 
                  label="Contact Phone" 
                  value={formatPhoneNumber(patient.patient_profile.emergency_contact_phone)} 
                />
              )}
            </InfoSection>
          )}

          {/* Additional Information */}
          <InfoSection title="Additional Information">
            <InfoField 
              label="Preferred Language" 
              value={formatPreferredLanguage(patient.patient_profile?.preferred_language)} 
            />
            {shouldShowPreferredDays(patient) && (
              <InfoField 
                label="Preferred Session Days" 
                value={formatPreferredDays(patient.patient_profile?.preferred_session_days)} 
                isColumn={true}
                className="md:col-span-2"
              />
            )}
            <InfoField 
              label="Total Sessions" 
              value={patient.total_sessions || '0'} 
            />
            <InfoField 
              label="Member Since" 
              value={formatDate(patient.created_at)} 
            />
          </InfoSection>

          {/* Session Information */}
          <InfoSection title="Session Information">
            <InfoField 
              label="Last Session" 
              value={patient.last_session ? formatDate(patient.last_session) : 'No previous sessions'} 
            />
            <InfoField 
              label="Next Session" 
              value={patient.next_session ? formatDate(patient.next_session) : 'Not scheduled'} 
            />
          </InfoSection>

          {/* Session History */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">📋 Session History</h3>
                {pastSessions.length > 5 && (
                  <button
                    onClick={() => setShowAllSessions(!showAllSessions)}
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    {showAllSessions ? 'Show Less' : `Show All (${pastSessions.length})`}
                  </button>
                )}
              </div>
            </div>
            <div className="p-6">
              {loadingPastSessions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  <span className="ml-2 text-gray-500">Loading sessions...</span>
                </div>
              ) : pastSessions.length > 0 ? (
                <div className="space-y-3">
                  {(showAllSessions ? pastSessions : pastSessions.slice(0, 5)).map((session) => (
                    <Link
                      key={session.id}
                      to={`/sessions/${session.id}`}
                      className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(session.scheduled_date || session.session_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-gray-500">
                            {session.session_type} • {session.duration_minutes} min
                            {session.location && ` • ${session.location}`}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            session.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            session.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                            session.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {session.status}
                          </span>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      {session.session_summary && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {session.session_summary}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p>No past sessions with this patient yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recurring Schedule Modal */}
      {showRecurringModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {scheduleMode !== 'choose' && (
                    <button
                      onClick={() => setScheduleMode('choose')}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <h2 className="text-xl font-bold text-gray-900">
                    {scheduleMode === 'choose' ? '📅 Session Management' : scheduleMode === 'manage' ? '📋 Existing Sessions' : '➕ Add New Sessions'}
                  </h2>
                </div>
                <button
                  onClick={() => setShowRecurringModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {scheduleMode === 'choose' 
                  ? `Manage sessions for ${patient?.full_name}`
                  : scheduleMode === 'manage'
                    ? `View and manage existing scheduled sessions`
                    : `Schedule new sessions for ${patient?.full_name}`
                }
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Choose Mode - Show options */}
              {scheduleMode === 'choose' && (
                <>
                  {loadingUpcomingSessions ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-3 text-gray-500">Loading sessions...</p>
                    </div>
                  ) : (
                    <>
                      {/* Summary Card */}
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Current Status</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {upcomingSessions.length > 0 
                                ? `${upcomingSessions.length} upcoming session(s) scheduled`
                                : 'No upcoming sessions scheduled'
                              }
                            </p>
                          </div>
                          <div className="text-3xl font-bold text-indigo-600">
                            {upcomingSessions.length}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {upcomingSessions.length > 0 && (
                          <button
                            onClick={() => setScheduleMode('manage')}
                            className="flex items-center justify-between p-5 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                              </div>
                              <div className="text-left">
                                <h4 className="font-semibold text-gray-900">Manage Existing</h4>
                                <p className="text-sm text-gray-500">View, reschedule or cancel sessions</p>
                              </div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}

                        <button
                          onClick={() => setScheduleMode('add')}
                          className="flex items-center justify-between p-5 bg-white border-2 border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <h4 className="font-semibold text-gray-900">Add New Sessions</h4>
                              <p className="text-sm text-gray-500">Schedule additional sessions</p>
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      {/* Quick list of upcoming sessions */}
                      {upcomingSessions.length > 0 && (
                        <div className="border-t pt-4">
                          <h4 className="font-medium text-gray-700 mb-3">Upcoming Sessions Preview</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {upcomingSessions.slice(0, 5).map((session) => {
                              const dateStr = session.session_date || session.scheduled_date || session.start_time || '';
                              return (
                              <div key={session.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm">
                                <span className="text-gray-700">
                                  {new Date(dateStr).toLocaleDateString('en-US', {
                                    weekday: 'short', month: 'short', day: 'numeric'
                                  })}
                                  {' at '}
                                  {new Date(dateStr).toLocaleTimeString('en-US', {
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  session.status === 'UPCOMING' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {session.status}
                                </span>
                              </div>
                              );
                            })}
                            {upcomingSessions.length > 5 && (
                              <p className="text-xs text-gray-500 text-center pt-2">
                                +{upcomingSessions.length - 5} more sessions
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Manage Mode - Show existing sessions with actions */}
              {scheduleMode === 'manage' && (
                <div className="space-y-4">
                  {upcomingSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No upcoming sessions to manage.</p>
                      <button
                        onClick={() => setScheduleMode('add')}
                        className="mt-4 text-indigo-600 hover:underline"
                      >
                        Add new sessions instead
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Header with select all */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedSessions.length === upcomingSessions.length}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-600">Select All</span>
                          </label>
                          <span className="text-sm text-gray-500">
                            {selectedSessions.length > 0 && `(${selectedSessions.length} selected)`}
                          </span>
                        </div>
                        <Link
                          to="/sessions"
                          className="text-sm text-indigo-600 hover:underline"
                          onClick={() => setShowRecurringModal(false)}
                        >
                          View All Sessions →
                        </Link>
                      </div>

                      {/* Bulk Actions Panel - Show when sessions selected */}
                      {selectedSessions.length > 0 && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm font-medium text-indigo-700">Bulk Action:</span>
                            <select
                              value={bulkAction}
                              onChange={(e) => setBulkAction(e.target.value as any)}
                              className="px-3 py-1.5 border border-indigo-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">Select action...</option>
                              <option value="update_location">Update Location</option>
                              <option value="update_type">Update Session Type</option>
                              <option value="update_duration">Update Duration</option>
                              <option value="cancel">Cancel Sessions</option>
                            </select>
                          </div>

                          {/* Action-specific inputs */}
                          {bulkAction === 'update_location' && (
                            <input
                              type="text"
                              placeholder="New location..."
                              value={bulkUpdateData.new_location}
                              onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, new_location: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          )}
                          {bulkAction === 'update_type' && (
                            <select
                              value={bulkUpdateData.new_session_type}
                              onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, new_session_type: e.target.value as any })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="individual">Individual</option>
                              <option value="couples">Couples</option>
                              <option value="family">Family</option>
                              <option value="group">Group</option>
                            </select>
                          )}
                          {bulkAction === 'update_duration' && (
                            <select
                              value={bulkUpdateData.new_duration}
                              onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, new_duration: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value={30}>30 minutes</option>
                              <option value={45}>45 minutes</option>
                              <option value={60}>60 minutes</option>
                              <option value={90}>90 minutes</option>
                              <option value={120}>120 minutes</option>
                            </select>
                          )}
                          {bulkAction === 'cancel' && (
                            <input
                              type="text"
                              placeholder="Reason for cancellation..."
                              value={bulkUpdateData.reason}
                              onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, reason: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          )}

                          {bulkAction && (
                            <button
                              onClick={handleBulkUpdate}
                              disabled={bulkUpdating}
                              className={`w-full py-2 rounded-lg font-medium text-white transition-colors ${
                                bulkAction === 'cancel' 
                                  ? 'bg-red-600 hover:bg-red-700' 
                                  : 'bg-indigo-600 hover:bg-indigo-700'
                              } disabled:opacity-50`}
                            >
                              {bulkUpdating ? 'Updating...' : `Apply to ${selectedSessions.length} session(s)`}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Sessions list with checkboxes */}
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {upcomingSessions.map((session) => {
                          const sessionDate = session.session_date || session.scheduled_date || session.start_time || '';
                          const isSelected = selectedSessions.includes(session.id);
                          return (
                          <div 
                            key={session.id} 
                            className={`flex items-center gap-3 p-4 border rounded-lg transition-all ${
                              isSelected ? 'bg-indigo-50 border-indigo-300' : 'bg-white hover:shadow-sm'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSessionSelection(session.id)}
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {new Date(sessionDate).toLocaleDateString('en-US', {
                                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                                })}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(sessionDate).toLocaleTimeString('en-US', {
                                  hour: '2-digit', minute: '2-digit'
                                })}
                                {' • '}{session.duration_minutes || 60} min
                                {' • '}{session.session_type}
                                {session.location && ` • ${session.location}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                session.status === 'UPCOMING' ? 'bg-blue-100 text-blue-700' 
                                : session.status === 'RESCHEDULED' ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                              }`}>
                                {session.status}
                              </span>
                              <Link
                                to={`/sessions/${session.id}`}
                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                title="View/Edit Session"
                                onClick={() => setShowRecurringModal(false)}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </Link>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                      <div className="border-t pt-4">
                        <button
                          onClick={() => setScheduleMode('add')}
                          className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                        >
                          + Add More Sessions
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Add Mode - Original scheduling form */}
              {scheduleMode === 'add' && (
                <>
              {/* Use Patient Preferences Toggle */}
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={usePatientPreferences}
                          onChange={(e) => setUsePatientPreferences(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`block w-14 h-8 rounded-full transition ${
                          usePatientPreferences ? 'bg-indigo-600' : 'bg-gray-300'
                        }`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${
                          usePatientPreferences ? 'transform translate-x-6' : ''
                        }`}></div>
                      </div>
                      <div className="ml-3">
                        <span className="text-sm font-semibold text-gray-900">Use Patient Preferences</span>
                        <p className="text-xs text-gray-600 mt-1">
                          {usePatientPreferences 
                            ? '✓ Form pre-filled with patient\'s default preferences' 
                            : 'Custom mode - manually configure all parameters'
                          }
                        </p>
                      </div>
                    </label>
                  </div>
                  {usePatientPreferences && preferences && (
                    <div className="ml-4 text-xs text-indigo-700 bg-indigo-100 px-3 py-2 rounded-lg">
                      <div className="font-medium">Defaults:</div>
                      <div>{preferences.preferences?.session_frequency || 'No frequency'}</div>
                      <div>{preferences.preferences?.preferred_session_days?.map((d: string) => d.substring(0, 3)).join(', ') || 'No days set'}</div>
                    </div>
                  )}
                </div>
              </div>

              {recurringErrors.general && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {recurringErrors.general}
                </div>
              )}

              {/* Show what's being used for calculation in Patient Preferences mode */}
              {usePatientPreferences && preferences && recurringFormData.number_of_sessions && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <svg className="w-4 h-4 text-green-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs text-green-800">
                      <div className="font-medium mb-1">Using patient's preferences for calculation:</div>
                      <div>• Frequency: {preferences.preferences?.session_frequency || 'Not set'}</div>
                      <div>• Days: {preferences.preferences?.preferred_session_days?.map((d: string) => d.substring(0, 3)).join(', ') || 'Not set'}</div>
                      <div>• Sessions: {recurringFormData.number_of_sessions}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date * <span className="text-gray-500 text-xs font-normal">(must be future)</span>
                  </label>
                  <input
                    type="date"
                    value={recurringFormData.start_date}
                    onChange={(e) => {
                      setRecurringFormData(prev => ({ ...prev, start_date: e.target.value }));
                      setRecurringErrors(prev => ({ ...prev, start_date: '' }));
                    }}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                      recurringErrors.start_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {recurringErrors.start_date && (
                    <p className="text-red-500 text-sm mt-1">{recurringErrors.start_date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-gray-500 text-xs font-normal">(auto-calculated, editable)</span>
                  </label>
                  <input
                    type="date"
                    value={recurringFormData.end_date}
                    onChange={(e) => {
                      setRecurringFormData(prev => ({ ...prev, end_date: e.target.value }));
                      setRecurringErrors(prev => ({ ...prev, end_date: '', general: '' }));
                    }}
                    min={recurringFormData.start_date || new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                      recurringErrors.end_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Calculated from sessions"
                  />
                  {recurringFormData.end_date && recurringFormData.number_of_sessions && (
                    <p className="text-green-600 text-xs mt-1">
                      ✓ Estimated for {recurringFormData.number_of_sessions} sessions (you can adjust)
                    </p>
                  )}
                  {recurringErrors.end_date && (
                    <p className="text-red-500 text-sm mt-1">{recurringErrors.end_date}</p>
                  )}
                </div>
              </div>

              {/* Number of Sessions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Sessions <span className="text-gray-500 text-xs font-normal">(alternative to end date, max 52)</span>
                </label>
                <input
                  type="number"
                  value={recurringFormData.number_of_sessions}
                  onChange={(e) => {
                    setRecurringFormData(prev => ({ ...prev, number_of_sessions: e.target.value }));
                    setRecurringErrors(prev => ({ ...prev, general: '' }));
                  }}
                  min="1"
                  max="52"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., 10"
                />
              </div>

              {/* Session Time and Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Time *
                  </label>
                  <input
                    type="time"
                    value={recurringFormData.session_time}
                    onChange={(e) => {
                      setRecurringFormData(prev => ({ ...prev, session_time: e.target.value }));
                      setRecurringErrors(prev => ({ ...prev, session_time: '' }));
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                      recurringErrors.session_time ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {recurringErrors.session_time && (
                    <p className="text-red-500 text-sm mt-1">{recurringErrors.session_time}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={recurringFormData.duration_minutes}
                    onChange={(e) => setRecurringFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                    min="15"
                    max="480"
                    step="15"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Session Type and Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Type
                  </label>
                  <select
                    value={recurringFormData.session_type}
                    onChange={(e) => setRecurringFormData(prev => ({ ...prev, session_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="individual">Individual</option>
                    <option value="group">Group</option>
                    <option value="family">Family</option>
                    <option value="couples">Couples</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={recurringFormData.location}
                    onChange={(e) => setRecurringFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., home, office, clinic"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Online and Fee */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={recurringFormData.is_online}
                    onChange={(e) => setRecurringFormData(prev => ({ ...prev, is_online: e.target.checked }))}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Online Session
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fee Charged (optional)
                  </label>
                  <input
                    type="number"
                    value={recurringFormData.fee_charged}
                    onChange={(e) => setRecurringFormData(prev => ({ ...prev, fee_charged: e.target.value }))}
                    min="0"
                    step="0.01"
                    placeholder="e.g., 100.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Scheduling Parameters - Only show in Custom Mode */}
              {!usePatientPreferences && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <div className="flex items-start mb-4">
                  <svg className="w-5 h-5 text-purple-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-purple-900">Custom Scheduling Parameters</h3>
                    <p className="text-xs text-purple-700 mt-1">
                      Specify frequency and days for this scheduling batch
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency *
                    </label>
                    <select
                      value={recurringFormData.override_frequency}
                      onChange={(e) => setRecurringFormData(prev => ({ ...prev, override_frequency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      <option value="">Select frequency...</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Days *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setRecurringFormData(prev => ({
                              ...prev,
                              override_days: prev.override_days.includes(day)
                                ? prev.override_days.filter(d => d !== day)
                                : [...prev.override_days, day]
                            }));
                          }}
                          className={`px-3 py-1 rounded-full text-sm transition-colors ${
                            recurringFormData.override_days.includes(day)
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {day.substring(0, 3)}
                        </button>
                      ))}
                    </div>
                    {recurringFormData.override_days.length === 0 && (
                      <p className="text-xs text-amber-600 mt-2">
                        ⚠ Please select at least one day
                      </p>
                    )}
                  </div>
                </div>
              </div>
              )}
              </>
              )}
            </div>

            {/* Modal Footer - Only show in add mode */}
            {scheduleMode === 'add' && (
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => setScheduleMode('choose')}
                disabled={recurringScheduling}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleRecurringSchedule}
                disabled={recurringScheduling}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {recurringScheduling ? 'Scheduling...' : 'Schedule Sessions'}
              </button>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetail;