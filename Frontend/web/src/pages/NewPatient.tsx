// src/pages/NewPatient.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  User, 
  MapPin, 
  Heart, 
  AlertCircle,
  Languages,
  Save,
  X
} from 'lucide-react';
import { useCreatePatient } from '../hooks/useTherapist';

interface NewPatientData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other' | '';
  primary_concern: string;
  therapy_start_date: string;
  session_frequency: 'weekly' | 'biweekly' | 'monthly' | '';
  preferred_session_days: string[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  address: string;
  medical_history: string;
  current_medications: string;
  preferred_language: 'english' | 'spanish' | 'french' | 'other' | '';
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' }
];
const SESSION_FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' }
];
const LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English' },
  { value: 'urdu', label: 'Urdu' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'french', label: 'French' },
  { value: 'other', label: 'Other' }
];

const NewPatient: React.FC = () => {
  const navigate = useNavigate();
  const { createPatient, loading, error } = useCreatePatient();

  const [patientData, setPatientData] = useState<NewPatientData>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    gender: '',
    primary_concern: '',
    therapy_start_date: '',
    session_frequency: '',
    preferred_session_days: [],
    emergency_contact_name: '',
    emergency_contact_phone: '',
    address: '',
    medical_history: '',
    current_medications: '',
    preferred_language: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!patientData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }
    if (!patientData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }
    if (!patientData.phone_number.trim()) {
      errors.phone_number = 'Phone number is required';
    }
    if (patientData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof NewPatientData, value: string) => {
    setPatientData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleDay = (day: string) => {
    setPatientData(prev => ({
      ...prev,
      preferred_session_days: prev.preferred_session_days.includes(day)
        ? prev.preferred_session_days.filter(d => d !== day)
        : [...prev.preferred_session_days, day]
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      console.log('Submitting patient data:', patientData);
      await createPatient(patientData);
      navigate('/patients');
    } catch (err: any) {
      console.error('Failed to create patient:', err);
      console.error('Error details:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        response: err?.response?.data
      });
      // Show user-friendly error message
      alert(`Failed to create patient: ${err?.message || 'Unknown error. Check console for details.'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Add New Patient</h1>
                <p className="text-purple-200">Create a new patient profile</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors flex items-center"
              >
                <X size={16} className="mr-1" />
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-white text-purple-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center disabled:opacity-50"
              >
                <Save size={16} className="mr-1" />
                {loading ? 'Saving...' : 'Save Patient'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="text-red-600 mr-2" size={20} />
              <p className="text-red-700">Failed to create patient. Please try again.</p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-6">
              <User className="text-purple-600 mr-2" size={20} />
              <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={patientData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    validationErrors.first_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter first name"
                />
                {validationErrors.first_name && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={patientData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    validationErrors.last_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter last name"
                />
                {validationErrors.last_name && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.last_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={patientData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    validationErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {validationErrors.email && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={patientData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    validationErrors.phone_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter phone number"
                />
                {validationErrors.phone_number && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.phone_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={patientData.date_of_birth}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <div className="flex space-x-4">
                  {GENDER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleInputChange('gender', option.value)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        patientData.gender === option.value
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Therapy Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-6">
              <Heart className="text-purple-600 mr-2" size={20} />
              <h2 className="text-lg font-semibold text-gray-900">Therapy Information</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Concern
                </label>
                <textarea
                  value={patientData.primary_concern}
                  onChange={(e) => handleInputChange('primary_concern', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Describe the primary concern or reason for therapy"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Therapy Start Date
                  </label>
                  <input
                    type="date"
                    value={patientData.therapy_start_date}
                    onChange={(e) => handleInputChange('therapy_start_date', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Frequency
                  </label>
                  <select
                    value={patientData.session_frequency}
                    onChange={(e) => handleInputChange('session_frequency', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select frequency</option>
                    {SESSION_FREQUENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Session Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        patientData.preferred_session_days.includes(day)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-6">
              <AlertCircle className="text-purple-600 mr-2" size={20} />
              <h2 className="text-lg font-semibold text-gray-900">Emergency Contact</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={patientData.emergency_contact_name}
                  onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter emergency contact name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  value={patientData.emergency_contact_phone}
                  onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter emergency contact phone"
                />
              </div>
            </div>
          </div>

          {/* Address & Medical Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-6">
              <MapPin className="text-purple-600 mr-2" size={20} />
              <h2 className="text-lg font-semibold text-gray-900">Additional Information</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complete Address
                </label>
                <textarea
                  value={patientData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter complete address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical History
                </label>
                <textarea
                  value={patientData.medical_history}
                  onChange={(e) => handleInputChange('medical_history', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter relevant medical history"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Medications
                </label>
                <textarea
                  value={patientData.current_medications}
                  onChange={(e) => handleInputChange('current_medications', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="List current medications"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Languages className="inline mr-1" size={16} />
                  Preferred Language
                </label>
                <select
                  value={patientData.preferred_language}
                  onChange={(e) => handleInputChange('preferred_language', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select language</option>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="pb-8"></div>
      </div>
    </div>
  );
};

export default NewPatient;