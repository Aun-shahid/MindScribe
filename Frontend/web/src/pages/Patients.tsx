// src/pages/Patients.tsx
import { Link } from 'react-router-dom';
import { useTherapistPatients } from '../hooks/usePatients';
import { useState } from 'react';
import {
  TherapistPageBanner,
  TherapistPageSimpleHero,
  therapistHeroPrimaryButtonClass,
} from '../components/TherapistPageBanner';
import { THERAPIST_PAGE_SHELL } from '../constants/pageShell';
import { PatientsListSkeleton } from '../components/pageSkeletons/MainPageSkeletons';

const Patients = () => {
  const { patients, loading, error, clearError, updateFilter } = useTherapistPatients({});
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      updateFilter({ search: searchQuery.trim() });
    } else {
      updateFilter({}, true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const filteredPatients = patients.filter((patient) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    const fullName = patient.full_name?.toLowerCase() || '';
    const email = patient.email?.toLowerCase() || '';
    const patientId = patient.id?.toLowerCase() || '';

    return fullName.includes(query) || email.includes(query) || patientId.includes(query);
  });

  const formatDateValue = (date?: string | null) => {
    if (!date) return 'Not scheduled';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'Not set';
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={`patients-page ${THERAPIST_PAGE_SHELL}`}>
      <div className="mb-6">
      <TherapistPageBanner>
        <TherapistPageSimpleHero
          title="All Patients"
          subtitle="Manage and monitor patient progress"
          actions={
            <Link to="/patients/new" className={therapistHeroPrimaryButtonClass}>
              + Add Patient
            </Link>
          }
        />
      </TherapistPageBanner>
      </div>

      <div className="w-full mt-5">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, email, or patient ID... (Press Enter)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-3 pl-10 pr-14 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors"
            title="Search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                updateFilter({}, true);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {searchQuery && !loading && (
          <p className="mt-2 text-sm text-black">
            Found {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded w-full mx-auto mt-5 text-sm">
          <p>Error loading patients: {error.message}</p>
          <button onClick={clearError} className="mt-2 text-sm underline hover:no-underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="relative w-full mt-5 space-y-4 pb-8">
        {loading && patients.length > 0 && (
          <div
            className="flex items-center gap-2 rounded-lg border border-purple-100 bg-purple-50/90 px-2 py-2 text-sm text-purple-700"
            role="status"
            aria-live="polite"
          >
            <div
              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"
              aria-hidden
            />
            <span>Updating results…</span>
          </div>
        )}

        {loading && patients.length === 0 ? (
          <PatientsListSkeleton rows={5} />
        ) : filteredPatients.length > 0 ? (
          <div
            className={loading ? 'pointer-events-none opacity-60 transition-opacity' : ''}
            aria-busy={loading}
          >
            <div className="hidden md:grid md:grid-cols-12 items-center bg-white border border-gray-200 rounded-lg px-5 py-3 text-xs font-bold uppercase tracking-wide text-black">
              <div className="md:col-span-4">Name</div>
              <div className="md:col-span-4">Care Profile</div>
              <div className="md:col-span-2">Therapy Start</div>
              <div className="md:col-span-2 text-right">Actions</div>
            </div>

            {filteredPatients.map((patient) => {
              let age = '';
              if (patient.date_of_birth) {
                const dob = new Date(patient.date_of_birth);
                const diff = Date.now() - dob.getTime();
                const ageDate = new Date(diff);
                age = Math.abs(ageDate.getUTCFullYear() - 1970).toString();
              }

              return (
                <div
                  key={patient.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-gray-200"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 items-start md:items-center gap-4">
                    <div className="md:col-span-4">
                      <div className="flex items-center mb-2">
                        <div className="text-lg font-semibold text-gray-800">{patient.full_name}</div>
                        <span className="ml-2 px-2.5 py-1 bg-green-500 text-white rounded-full text-[10px] font-semibold uppercase tracking-wide">
                          Active
                        </span>
                      </div>
                      <div className="text-gray-600 text-sm flex items-center">
                        <span className="font-medium text-gray-700">ID:</span>
                        <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{patient.id}</span>
                      </div>
                      {patient.email && <div className="text-sm text-gray-600 mt-1 truncate">{patient.email}</div>}
                    </div>

                    <div className="md:col-span-4 text-sm text-gray-700">
                      <div>
                        <span className="md:hidden font-semibold text-gray-500 uppercase tracking-wide mr-1">Care:</span>
                        <span className="font-semibold text-gray-900">
                          {patient.patient_profile?.primary_concern || 'General therapy'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {patient.patient_profile?.session_frequency
                          ? `${patient.patient_profile.session_frequency.replace('_', ' ')}`
                          : 'Frequency not set'}
                        {patient.patient_profile?.preferred_language ? ` • ${patient.patient_profile.preferred_language.toUpperCase()}` : ''}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {age ? `Age ${age}` : 'Age N/A'}
                      </div>
                    </div>

                    <div className="md:col-span-2 text-sm text-gray-700">
                      <span className="md:hidden font-semibold text-gray-500 uppercase tracking-wide mr-1">Therapy Start:</span>
                      <div className="font-medium text-gray-900">
                        {formatDateValue(patient.patient_profile?.therapy_start_date || null)}
                      </div>
                    </div>

                    <div className="md:col-span-2 flex flex-col justify-start md:justify-center gap-2 mt-1 md:mt-0 md:ml-auto w-full md:max-w-[220px]">
                      <Link
                        to={`/patients/${patient.id}`}
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-md text-sm font-semibold text-center transition-all shadow-sm hover:shadow-md"
                      >
                        View Profile
                      </Link>
                      <Link
                        to={`/patients/${patient.id}/sessions`}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-purple-700 px-4 py-2 rounded-md text-sm font-semibold text-center transition-all border border-gray-200"
                      >
                        View Sessions
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !loading ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {searchQuery ? 'No patients found' : 'No patients yet'}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchQuery
                ? `No patients match "${searchQuery}". Try a different search term.`
                : 'Get started by adding your first patient.'}
            </p>
            <div className="mt-6">
              <Link
                to="/patients/new"
                className="inline-flex items-center bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New Patient
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Patients;
