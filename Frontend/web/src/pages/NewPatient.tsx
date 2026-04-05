// src/pages/NewPatient.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  User,
  MapPin,
  Heart,
  AlertCircle,
  Save,
  X
} from 'lucide-react';
import { useCreatePatient } from '../hooks/usePatients';
import sessionsService from '../services/sessions.service';

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
    current_medications: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState<boolean>(true);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Name validation (letters, spaces, hyphens, apostrophes only)
    const nameRegex = /^[a-zA-Z\s'-]+$/;

    if (!patientData.first_name.trim()) {
      errors.first_name = 'First name is required';
    } else if (!nameRegex.test(patientData.first_name.trim())) {
      errors.first_name = 'First name can only contain letters, spaces, hyphens, and apostrophes';
    } else if (patientData.first_name.trim().length < 2) {
      errors.first_name = 'First name must be at least 2 characters';
    } else if (patientData.first_name.trim().length > 50) {
      errors.first_name = 'First name must not exceed 50 characters';
    }

    if (!patientData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    } else if (!nameRegex.test(patientData.last_name.trim())) {
      errors.last_name = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
    } else if (patientData.last_name.trim().length < 2) {
      errors.last_name = 'Last name must be at least 2 characters';
    } else if (patientData.last_name.trim().length > 50) {
      errors.last_name = 'Last name must not exceed 50 characters';
    }

    // Phone number validation
    if (!patientData.phone_number.trim()) {
      errors.phone_number = 'Phone number is required';
    } else if (!/^[0-9]+$/.test(patientData.phone_number.trim())) {
      errors.phone_number = 'Phone number must contain only digits (no dashes or spaces)';
    } else if (patientData.phone_number.trim().length < 10) {
      errors.phone_number = 'Phone number must be at least 10 digits';
    } else if (patientData.phone_number.trim().length > 20) {
      errors.phone_number = 'Phone number must not exceed 20 digits';
    }

    // Emergency contact phone validation if provided
    if (patientData.emergency_contact_phone && patientData.emergency_contact_phone.trim()) {
      if (!/^[0-9]+$/.test(patientData.emergency_contact_phone.trim())) {
        errors.emergency_contact_phone = 'Emergency contact phone must contain only digits (no dashes or spaces)';
      } else if (patientData.emergency_contact_phone.trim().length < 10) {
        errors.emergency_contact_phone = 'Emergency contact phone must be at least 10 digits';
      } else if (patientData.emergency_contact_phone.trim().length > 20) {
        errors.emergency_contact_phone = 'Emergency contact phone must not exceed 20 digits';
      }
    }

    // Emergency contact name validation if provided
    if (patientData.emergency_contact_name && patientData.emergency_contact_name.trim()) {
      if (!nameRegex.test(patientData.emergency_contact_name.trim())) {
        errors.emergency_contact_name = 'Emergency contact name can only contain letters, spaces, hyphens, and apostrophes';
      } else if (patientData.emergency_contact_name.trim().length < 2) {
        errors.emergency_contact_name = 'Emergency contact name must be at least 2 characters';
      } else if (patientData.emergency_contact_name.trim().length > 100) {
        errors.emergency_contact_name = 'Emergency contact name must not exceed 100 characters';
      }
    }

    // Email validation
    if (patientData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Date of birth validation if provided
    if (patientData.date_of_birth) {
      const dob = new Date(patientData.date_of_birth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minDate = new Date();
      minDate.setFullYear(today.getFullYear() - 120); // Max age 120 years

      if (dob >= today) {
        errors.date_of_birth = 'Date of birth must be in the past';
      } else if (dob < minDate) {
        errors.date_of_birth = 'Date of birth is too far in the past';
      } else {
        const age = today.getFullYear() - dob.getFullYear();
        if (age < 1) {
          errors.date_of_birth = 'Patient must be at least 1 year old';
        }
      }
    }

    // Therapy start date validation if provided
    if (patientData.therapy_start_date) {
      const startDate = new Date(patientData.therapy_start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        errors.therapy_start_date = 'Therapy start date cannot be in the past';
      }

      // Check if date is too far in the future (e.g., more than 1 year)
      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(today.getFullYear() + 1);
      if (startDate > maxFutureDate) {
        errors.therapy_start_date = 'Therapy start date cannot be more than 1 year in the future';
      }
    }

    // Primary concern validation if provided
    if (patientData.primary_concern && patientData.primary_concern.trim()) {
      if (patientData.primary_concern.trim().length > 1000) {
        errors.primary_concern = 'Primary concern must not exceed 1000 characters';
      }
    }

    // Address validation if provided
    if (patientData.address && patientData.address.trim()) {
      if (patientData.address.trim().length > 500) {
        errors.address = 'Address must not exceed 500 characters';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof NewPatientData, value: string) => {
    setPatientData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (backendErrors[field]) {
      setBackendErrors(prev => ({ ...prev, [field]: '' }));
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
      const createdPatient = await createPatient(patientData);

      // Auto-schedule sessions if enabled and patient has preferences
      if (autoScheduleEnabled && patientData.session_frequency && patientData.preferred_session_days.length > 0 && createdPatient?.id) {
        try {
          const scheduleResult = await sessionsService.autoSchedulePatientSessions(createdPatient.id);
          console.log('Auto-schedule result:', scheduleResult);
        } catch (scheduleError) {
          console.error('Failed to auto-schedule sessions:', scheduleError);
          // Don't block navigation if auto-schedule fails
        }
      }

      navigate('/patients');
    } catch (err: any) {
      console.error('Failed to create patient:', err);
      console.log('Error details:', err.details);
      console.log('Error message:', err.message);
      console.log('Full error object:', JSON.stringify(err, null, 2));

      // Parse backend validation errors and map to fields
      if (err.details && typeof err.details === 'object') {
        const fieldErrors: Record<string, string> = {};
        Object.entries(err.details).forEach(([field, msgs]) => {
          const message = Array.isArray(msgs) ? msgs[0] : msgs;
          fieldErrors[field] = message as string;
        });

        console.log('Parsed field errors:', fieldErrors);
        setBackendErrors(fieldErrors);

        // Scroll to first error
        const firstErrorField = Object.keys(fieldErrors)[0];
        if (firstErrorField) {
          const element = document.querySelector(`[name="${firstErrorField}"]`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        console.log('No details found in error object');
      }
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
            <div className="flex items-start">
              <AlertCircle className="text-red-600 mr-2 mt-0.5 flex-shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-red-700 font-medium mb-1">Failed to create patient</p>
                <p className="text-red-600 text-sm">
                  {typeof error.message === 'string' ? error.message : 'Please check your input and try again.'}
                </p>
                {error.details && (
                  <div className="mt-2 text-sm text-red-600">
                    <ul className="list-disc list-inside space-y-1">
                      {Object.entries(error.details).map(([field, msgs]) => (
                        <li key={field}>
                          <span className="font-medium capitalize">{field.replace('_', ' ')}</span>: {Array.isArray(msgs) ? msgs.join(', ') : msgs}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={() => window.location.reload()}
                className="text-red-600 hover:text-red-800 text-sm underline ml-2"
              >
                Retry
              </button>
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
                  name="first_name"
                  value={patientData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${validationErrors.first_name || backendErrors.first_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="e.g., user3"
                />
                {validationErrors.first_name && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.first_name}</p>
                )}
                {backendErrors.first_name && (
                  <p className="text-red-500 text-sm mt-1">{backendErrors.first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={patientData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${validationErrors.last_name || backendErrors.last_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="e.g., user3"
                />
                {validationErrors.last_name && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.last_name}</p>
                )}
                {backendErrors.last_name && (
                  <p className="text-red-500 text-sm mt-1">{backendErrors.last_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={patientData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${validationErrors.email || backendErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="e.g., user3@gmail.com"
                />
                {validationErrors.email && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                )}
                {backendErrors.email && (
                  <p className="text-red-500 text-sm mt-1">{backendErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number * <span className="text-gray-500 text-xs font-normal">(digits only)</span>
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={patientData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${validationErrors.phone_number || backendErrors.phone_number ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="e.g., 03009987654"
                />
                {validationErrors.phone_number && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.phone_number}</p>
                )}
                {backendErrors.phone_number && (
                  <p className="text-red-500 text-sm mt-1">{backendErrors.phone_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={patientData.date_of_birth}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${validationErrors.date_of_birth || backendErrors.date_of_birth ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {validationErrors.date_of_birth && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.date_of_birth}</p>
                )}
                {backendErrors.date_of_birth && (
                  <p className="text-red-500 text-sm mt-1">{backendErrors.date_of_birth}</p>
                )}
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
                      className={`px-4 py-2 rounded-lg border transition-colors ${patientData.gender === option.value
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
                  name="primary_concern"
                  value={patientData.primary_concern}
                  onChange={(e) => handleInputChange('primary_concern', e.target.value)}
                  rows={3}
                  maxLength={1000}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${validationErrors.primary_concern || backendErrors.primary_concern ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Describe the primary concern or reason for therapy"
                />
                {patientData.primary_concern && (
                  <p className="text-xs text-gray-500 mt-1">{patientData.primary_concern.length}/1000 characters</p>
                )}
                {validationErrors.primary_concern && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.primary_concern}</p>
                )}
                {backendErrors.primary_concern && (
                  <p className="text-red-500 text-sm mt-1">{backendErrors.primary_concern}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Therapy Start Date
                  </label>
                  <input
                    type="date"
                    name="therapy_start_date"
                    value={patientData.therapy_start_date}
                    onChange={(e) => handleInputChange('therapy_start_date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${validationErrors.therapy_start_date || backendErrors.therapy_start_date ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {validationErrors.therapy_start_date && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.therapy_start_date}</p>
                  )}
                  {backendErrors.therapy_start_date && (
                    <p className="text-red-500 text-sm mt-1">{backendErrors.therapy_start_date}</p>
                  )}
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
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${patientData.preferred_session_days.includes(day)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-full">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScheduleEnabled}
                    onChange={(e) => setAutoScheduleEnabled(e.target.checked)}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      Auto-schedule initial sessions
                    </span>
                    <p className="text-xs text-gray-500">
                      Automatically create sessions based on frequency and preferred days after creating patient
                    </p>
                  </div>
                </label>
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
                  name="emergency_contact_name"
                  value={patientData.emergency_contact_name}
                  onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                  maxLength={100}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${validationErrors.emergency_contact_name || backendErrors.emergency_contact_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="e.g., John Doe"
                />
                {validationErrors.emergency_contact_name && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.emergency_contact_name}</p>
                )}
                {backendErrors.emergency_contact_name && (
                  <p className="text-red-500 text-sm mt-1">{backendErrors.emergency_contact_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Phone <span className="text-gray-500 text-xs font-normal">(digits only)</span>
                </label>
                <input
                  type="tel"
                  name="emergency_contact_phone"
                  value={patientData.emergency_contact_phone}
                  onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${validationErrors.emergency_contact_phone || backendErrors.emergency_contact_phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="e.g., 03009987654"
                />
                {validationErrors.emergency_contact_phone && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.emergency_contact_phone}</p>
                )}
                {backendErrors.emergency_contact_phone && (
                  <p className="text-red-500 text-sm mt-1">{backendErrors.emergency_contact_phone}</p>
                )}
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
                  name="address"
                  value={patientData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                  maxLength={500}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${validationErrors.address || backendErrors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Enter complete address"
                />
                {patientData.address && (
                  <p className="text-xs text-gray-500 mt-1">{patientData.address.length}/500 characters</p>
                )}
                {validationErrors.address && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.address}</p>
                )}
                {backendErrors.address && (
                  <p className="text-red-500 text-sm mt-1">{backendErrors.address}</p>
                )}
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