// src/pages/NewSession.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTherapistPatients } from '../hooks/useTherapist';
import therapistService from '../services/therapist.service';

const NewSession = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { patients, loading: patientsLoading } = useTherapistPatients();
  
  const selectedPatientId = searchParams.get('patientId') || '';

  const [selectedPatient, setSelectedPatient] = useState(selectedPatientId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get current date and time for default values
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0); // Default to 10:00 AM tomorrow
  
  // Session timing mode: 'now' or 'scheduled'
  const [sessionTiming, setSessionTiming] = useState<'now' | 'scheduled'>('scheduled');

  const [formData, setFormData] = useState({
    session_type: 'individual',
    duration_minutes: 60,
    location: '',
    is_online: false,
    patient_goals: '',
    fee_charged: 0,
    consent_recording: false,
    consent_ai_analysis: false,
    scheduled_date: tomorrow.toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:mm
  });

  useEffect(() => {
    if (selectedPatientId) {
      setSelectedPatient(selectedPatientId);
    }
  }, [selectedPatientId]);

  const updateField = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Check if the scheduled date is in the future (more than 10 minutes from now)
  const isUpcomingSession = () => {
    const scheduledDate = new Date(formData.scheduled_date);
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60000);
    return scheduledDate > tenMinutesFromNow;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert('Please select a patient');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      // If "Right Now", use current time + 1 minute to pass backend validation
      // For scheduled sessions, send the datetime-local value directly with seconds appended
      const now = new Date();
      const scheduledDate = sessionTiming === 'now' 
        ? new Date(now.getTime() + 60000).toISOString()  // 1 minute in future for "now"
        : formData.scheduled_date + ':00';  // datetime-local format + seconds

      const sessionData = {
        patient_id: selectedPatient,
        scheduled_date: scheduledDate,
        duration_minutes: Number(formData.duration_minutes),
        session_type: formData.session_type,
        location: formData.location || 'Office',
        is_online: formData.is_online,
        patient_goals: formData.patient_goals || '',
        fee_charged: formData.fee_charged || 0,
        consent_recording: formData.consent_recording,
        consent_ai_analysis: formData.consent_ai_analysis,
      };

      console.log('Scheduling session:', sessionData);
      const session = await therapistService.createSession(sessionData);
      
      if (session) {
        if (sessionTiming === 'now') {
          // For "Right Now" sessions, go directly to session detail page to start
          navigate(`/sessions/${session.id}`, {
            state: { 
              message: 'Session created! You can start it now.',
              startImmediately: true
            }
          });
        } else if (isUpcomingSession()) {
          // For future sessions, go to dashboard with success message
          navigate('/dashboard', { 
            state: { 
              message: 'Session scheduled successfully!',
              sessionId: session.id 
            } 
          });
        } else {
          // For current/immediate sessions, go to session detail page to start
          navigate(`/sessions/${session.id}`);
        }
      }
    } catch (err: unknown) {
      console.error('Schedule session error:', err);
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to schedule session';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  if (patientsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">New Session</h1>
        <button
          onClick={() => navigate('/sessions')}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-4 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-medium text-red-700 mb-1">Failed to schedule session</p>
              <p className="text-sm text-red-600">{error}</p>
              <p className="text-xs text-red-500 mt-2">Common issues: Invalid date format, patient not found, or missing required fields.</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 ml-2"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Session Details</h2>
        
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div>
            <label htmlFor="patient" className="form-label">
              Select Patient <span className="text-red-500">*</span>
            </label>
            <select
              id="patient"
              required
              className="form-input"
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              disabled={loading}
            >
              <option value="">Choose a patient...</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.full_name} - {patient.email}
                </option>
              ))}
            </select>
          </div>

          {/* Session Type */}
          <div>
            <label htmlFor="session_type" className="form-label">
              Session Type <span className="text-red-500">*</span>
            </label>
            <select
              id="session_type"
              required
              className="form-input"
              value={formData.session_type}
              onChange={(e) => updateField('session_type', e.target.value)}
              disabled={loading}
            >
              <option value="individual">Individual</option>
              <option value="group">Group</option>
              <option value="family">Family</option>
              <option value="couples">Couples</option>
            </select>
          </div>

          {/* Session Timing Toggle */}
          <div>
            <label className="form-label">
              When to Start <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4 mt-2">
              <label className={`flex-1 flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                sessionTiming === 'now' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="sessionTiming"
                  value="now"
                  checked={sessionTiming === 'now'}
                  onChange={() => setSessionTiming('now')}
                  className="sr-only"
                  disabled={loading}
                />
                <div className="text-center">
                  <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="font-medium">Start Right Now</span>
                  <p className="text-xs text-gray-500 mt-1">Begin session immediately</p>
                </div>
              </label>
              <label className={`flex-1 flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                sessionTiming === 'scheduled' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="sessionTiming"
                  value="scheduled"
                  checked={sessionTiming === 'scheduled'}
                  onChange={() => setSessionTiming('scheduled')}
                  className="sr-only"
                  disabled={loading}
                />
                <div className="text-center">
                  <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">Schedule for Later</span>
                  <p className="text-xs text-gray-500 mt-1">Pick a future date & time</p>
                </div>
              </label>
            </div>
          </div>

          {/* Scheduled Date & Time - Only show when scheduling for later */}
          {sessionTiming === 'scheduled' && (
            <div>
              <label htmlFor="scheduled_date" className="form-label">
                Scheduled Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                id="scheduled_date"
                type="datetime-local"
                required
                className="form-input"
                value={formData.scheduled_date}
                onChange={(e) => updateField('scheduled_date', e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                disabled={loading}
              />
              <p className="mt-1 text-sm text-gray-500">
                Select the date and time for this session
              </p>
            </div>
          )}

          {/* Duration */}
          <div>
            <label htmlFor="duration_minutes" className="form-label">
              Duration (minutes) <span className="text-red-500">*</span>
            </label>
            <select
              id="duration_minutes"
              required
              className="form-input"
              value={formData.duration_minutes}
              onChange={(e) => updateField('duration_minutes', parseInt(e.target.value))}
              disabled={loading}
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="form-label">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              id="location"
              type="text"
              required
              className="form-input"
              value={formData.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="Enter session location"
              disabled={loading}
            />
          </div>

          {/* Online Session */}
          <div className="flex items-center">
            <input
              id="is_online"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={formData.is_online}
              onChange={(e) => updateField('is_online', e.target.checked)}
              disabled={loading}
            />
            <label htmlFor="is_online" className="ml-2 block text-sm text-gray-900">
              This is an online session
            </label>
          </div>

          {/* Patient Goals */}
          <div>
            <label htmlFor="patient_goals" className="form-label">
              Session Goals
            </label>
            <textarea
              id="patient_goals"
              rows={3}
              className="form-input"
              value={formData.patient_goals}
              onChange={(e) => updateField('patient_goals', e.target.value)}
              placeholder="What are the goals for this session?"
              disabled={loading}
            />
          </div>

          {/* Fee */}
          <div>
            <label htmlFor="fee_charged" className="form-label">
              Fee Charged
            </label>
            <input
              id="fee_charged"
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={formData.fee_charged}
              onChange={(e) => updateField('fee_charged', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              disabled={loading}
            />
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="consent_recording"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.consent_recording}
                onChange={(e) => updateField('consent_recording', e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="consent_recording" className="ml-2 block text-sm text-gray-900">
                Patient consents to session recording
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="consent_ai_analysis"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.consent_ai_analysis}
                onChange={(e) => updateField('consent_ai_analysis', e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="consent_ai_analysis" className="ml-2 block text-sm text-gray-900">
                Patient coScheduling Session...' : 'Scheduleion
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/sessions')}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !selectedPatient}
            >
              {loading 
                ? (sessionTiming === 'now' ? 'Creating...' : 'Scheduling...') 
                : (sessionTiming === 'now' ? 'Create & Start Session' : 'Schedule Session')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewSession;