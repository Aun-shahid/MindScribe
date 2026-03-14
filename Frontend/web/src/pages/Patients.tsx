// src/pages/Patients.tsx
import { Link } from 'react-router-dom';
import { useTherapistPatients } from '../hooks/usePatients';
import { useState } from 'react';


const Patients = () => {
  const { patients, loading, error, clearError, updateFilter } = useTherapistPatients({});
  const [searchQuery, setSearchQuery] = useState('');

  // Handle search execution (only when user presses Enter or clicks search icon)
  const handleSearch = () => {
    if (searchQuery.trim()) {
      updateFilter({ search: searchQuery.trim() });
    } else {
      updateFilter({}, true); // Reset filter when search is empty
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Filter patients locally (for ID search that might not be handled by backend)
  const filteredPatients = patients.filter(patient => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    const fullName = patient.full_name?.toLowerCase() || '';
    const email = patient.email?.toLowerCase() || '';
    const patientId = patient.id?.toLowerCase() || '';
    
    return fullName.includes(query) || 
           email.includes(query) || 
           patientId.includes(query);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="patients-page bg-[#f7f7fa] min-h-screen">

      {/* Add Patient button above image */}
      {/* <div className="max-w-3xl mx-auto flex justify-end mt-6">
        <Link
          to="/patients/new"
          className="bg-[#5a3577] hover:bg-[#43275a] text-white px-6 py-2 rounded-lg font-semibold shadow"
        >
          + Add Patient
        </Link>
      </div> */}

      {/* Top header with placeholder image and overlay */}
      <div className="relative w-full h-48 bg-[#2f224a] flex items-center justify-center mt-1">
        <img
          src="/images/pat.png"
          alt="Patients Header"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        {/* Purple overlay for better text visibility */}
        <div className="absolute inset-0 bg-[#5c4092] opacity-60"></div>
        {/* Add Patient button on top right of image */}
        <div className="absolute top-4 right-8 z-20">
          <Link
            to="/patients/new"
            className="bg-[#43275a] hover:bg-[#2d183a] text-white px-5 py-2 rounded-lg font-semibold shadow-lg"
          >
            + Add Patient
          </Link>
        </div>
        <div className="absolute bottom-6 left-6 z-10 text-white">
    <div className="text-3xl font-bold">All Patients</div>
    <div className="text-lg mt-1">
      Manage and monitor patient progress
    </div>
  </div>
      </div>

      {/* Search bar */}
      <div className="max-w-3xl mx-auto mt-8">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, email, or patient ID... (Press Enter)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-3 pl-10 pr-20 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors"
            title="Search"
          >
            <svg 
              className="w-5 h-5"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                updateFilter({}, true); // Reset filter when clearing search
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-600">
            Found {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-3xl mx-auto mt-6">
          <p>Error loading patients: {error.message}</p>
          <button 
            onClick={clearError}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Patient cards */}
      <div className="max-w-3xl mx-auto mt-6 space-y-6 pb-8">
        {filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => {
            // Calculate age from date_of_birth
            let age = '';
            if (patient.date_of_birth) {
              const dob = new Date(patient.date_of_birth);
              const diff = Date.now() - dob.getTime();
              const ageDate = new Date(diff);
              age = Math.abs(ageDate.getUTCFullYear() - 1970).toString();
            }
            return (
              <div key={patient.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <div className="text-xl font-semibold text-gray-800">
                        {patient.full_name}
                      </div>
                      <span className="ml-3 px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold">
                        active
                      </span>
                    </div>
                    <div className="text-gray-600 text-sm space-y-1">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                        <span className="font-medium text-gray-700">ID:</span>
                        <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">{patient.id}</span>
                      </div>
                      <div className="flex items-center mt-2">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Age: <strong>{age || 'N/A'}</strong></span>
                        <span className="mx-3 text-gray-300">|</span>
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Sessions: <strong>{patient.total_sessions || 0}</strong></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 mt-4 md:mt-0 md:ml-6 w-full md:w-auto">
                    <Link 
                      to={`/patients/${patient.id}`} 
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-5 py-2.5 rounded-lg font-medium text-center transition-all shadow-md hover:shadow-lg"
                    >
                      View Profile
                    </Link>
                    <Link 
                      to={`/patients/${patient.id}/sessions`} 
                      className="bg-gray-100 hover:bg-gray-200 text-purple-700 px-5 py-2.5 rounded-lg font-medium text-center transition-all border border-gray-200"
                    >
                      View Sessions
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
        )}
      </div>
    </div>
  );
};

export default Patients;