// src/pages/Profile.tsx
import { useTherapistProfile } from '../hooks/useTherapist';

const Profile = () => {
  const { profile, loading, error, handleLogout } = useTherapistProfile();

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

      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Account Information</h2>
        {profile && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name</label>
              <p className="text-gray-900">{(profile as any).full_name || 'N/A'}</p>
            </div>
            <div>
              <label className="form-label">Email</label>
              <p className="text-gray-900">{(profile as any).email || 'N/A'}</p>
            </div>
            <div>
              <label className="form-label">Specialization</label>
              <p className="text-gray-900">{(profile as any).specialization || 'N/A'}</p>
            </div>
            <div>
              <label className="form-label">License Number</label>
              <p className="text-gray-900">{(profile as any).license_number || 'N/A'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;