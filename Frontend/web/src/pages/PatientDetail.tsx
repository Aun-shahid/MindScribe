// src/pages/PatientDetail.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { usePatientDetail } from '../hooks/useTherapist';
import { InfoField } from '../components/InfoField';
import { InfoSection } from '../components/InfoSection';
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
            <button
              onClick={handleStartSession}
              className="px-6 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-sm"
            >
              Start Session
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
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
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;