// src/pages/Patients.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTherapistPatients } from '../hooks/useTherapist';
import type { PatientFilter } from '../types/therapist';

const Patients = () => {
  const [activeFilter, setActiveFilter] = useState<PatientFilter>({});
  const { patients, loading, error, updateFilter, clearError } = useTherapistPatients(activeFilter);

  const handleFilterChange = (newFilter: PatientFilter) => {
    setActiveFilter(newFilter);
    updateFilter(newFilter);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
        <Link
          to="/patients/new"
          className="btn-primary"
        >
          Add Patient
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error loading patients: {error.message}</p>
          <button 
            onClick={clearError}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search_query" className="form-label">
              Search
            </label>
            <input
              id="search_query"
              type="text"
              placeholder="Search patients..."
              className="form-input"
              value={activeFilter.search_query || ''}
              onChange={(e) => handleFilterChange({ ...activeFilter, search_query: e.target.value || undefined })}
            />
          </div>

          <div>
            <label htmlFor="gender" className="form-label">
              Gender
            </label>
            <select
              id="gender"
              className="form-input"
              value={activeFilter.gender || ''}
              onChange={(e) => handleFilterChange({ ...activeFilter, gender: e.target.value || undefined })}
            >
              <option value="">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="therapy_status" className="form-label">
              Status
            </label>
            <select
              id="therapy_status"
              className="form-input"
              value={activeFilter.therapy_status || ''}
              onChange={(e) => handleFilterChange({ 
                ...activeFilter, 
                therapy_status: e.target.value ? e.target.value as any : undefined 
              })}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => {
              setActiveFilter({});
              updateFilter({});
            }}
            className="btn-secondary text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Patients List */}
      <div className="card">
        <div className="space-y-4">
          {patients.length > 0 ? (
            patients.map((patient) => (
              <div key={patient.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-lg">
                          {patient.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {patient.full_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {patient.email}
                        </p>
                        <p className="text-sm text-gray-500">
                          Patient ID: {patient.id}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right text-sm text-gray-500">
                      <p>Phone: {patient.phone_number}</p>
                      <p>Joined: {new Date(patient.created_at).toLocaleDateString()}</p>
                    </div>
                    <Link
                      to={`/patients/${patient.id}`}
                      className="btn-primary text-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No patients found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {Object.keys(activeFilter).length > 0 
                  ? 'Try adjusting your filters or add a new patient.'
                  : 'Get started by adding your first patient.'
                }
              </p>
              <div className="mt-6">
                <Link
                  to="/patients/new"
                  className="btn-primary"
                >
                  Add New Patient
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Patients;