// src/pages/Profile.tsx
import { useTherapistProfile } from '../hooks/useTherapist';

const Profile = () => {
  const { profile, loading, error, handleLogout } = useTherapistProfile();

  const userInfo = (profile as any)?.user_info;
  const fullName = userInfo
    ? `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim()
    : 'N/A';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>Error loading profile: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <button
          onClick={handleLogout}
          className="btn-danger"
        >
          Logout
        </button>
      </div>

      {/* Account Information */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Account Information</h2>
        {profile && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name</label>
              <p className="text-gray-900">{fullName}</p>
            </div>
            <div>
              <label className="form-label">Username</label>
              <p className="text-gray-900">{userInfo?.username || 'N/A'}</p>
            </div>
            <div>
              <label className="form-label">Email</label>
              <p className="text-gray-900">{userInfo?.email || 'N/A'}</p>
            </div>
            <div>
              <label className="form-label">Phone Number</label>
              <p className="text-gray-900">{userInfo?.phone_number || 'N/A'}</p>
            </div>
            <div>
              <label className="form-label">Date of Birth</label>
              <p className="text-gray-900">{userInfo?.date_of_birth || 'N/A'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Professional Information */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Professional Information</h2>
        {profile && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Specialization</label>
              <p className="text-gray-900">{(profile as any).specialization || 'N/A'}</p>
            </div>
            <div>
              <label className="form-label">License Number</label>
              <p className="text-gray-900">{(profile as any).license_number || 'N/A'}</p>
            </div>
            <div>
              <label className="form-label">Years of Experience</label>
              <p className="text-gray-900">{(profile as any).years_of_experience ?? 'N/A'}</p>
            </div>
            <div>
              <label className="form-label">Education</label>
              <p className="text-gray-900">{(profile as any).education || 'N/A'}</p>
            </div>
            <div>
              <label className="form-label">Certifications</label>
              <p className="text-gray-900">{(profile as any).certifications || 'N/A'}</p>
            </div>
            <div>
              <label className="form-label">Therapist PIN</label>
              <p className="text-gray-900 font-mono">{(profile as any).therapist_pin || 'N/A'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Clinic Information */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Clinic Information</h2>
        {profile && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Clinic Name</label>
              <p className="text-gray-900">{(profile as any).clinic_name || 'N/A'}</p>
            </div>
            <div>
              <label className="form-label">Clinic Address</label>
              <p className="text-gray-900">{(profile as any).clinic_address || 'N/A'}</p>
            </div>
            <div>
              <label className="form-label">Total Patients</label>
              <p className="text-gray-900">{(profile as any).patient_count ?? 'N/A'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;