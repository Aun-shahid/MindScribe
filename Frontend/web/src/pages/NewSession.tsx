// src/pages/NewSession.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTherapistPatients, useSessionConsent } from '../hooks/useTherapist';

const NewSession = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { patients, loading: patientsLoading } = useTherapistPatients();
  
  const selectedPatientId = searchParams.get('patientId') || '';
  const selectedPatientName = searchParams.get('patientName') || '';

  const [selectedPatient, setSelectedPatient] = useState(selectedPatientId);
  
  const { 
    formData, 
    loading, 
    error, 
    updateField, 
    handleSubmit, 
    clearError 
  } = useSessionConsent({
    patientId: selectedPatient,
    patientName: patients.find(p => p.id === selectedPatient)?.full_name || selectedPatientName,
    isNewPatient: 'false'
  });

  useEffect(() => {
    if (selectedPatientId) {
      setSelectedPatient(selectedPatientId);
    }
  }, [selectedPatientId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert('Please select a patient');
      return;
    }
    await handleSubmit();
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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <button 
            onClick={clearError}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
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
                Patient consents to AI analysis of session
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
              {loading ? 'Creating Session...' : 'Start Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewSession;