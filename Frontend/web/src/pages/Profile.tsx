// src/pages/Profile.tsx
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTherapistProfile } from '../hooks/useTherapist';
import authService from '../services/auth.service';
import { validatePasswordStrength } from '../utils/passwordValidation';

interface ProfileEditingState {
  first_name: boolean;
  last_name: boolean;
  username: boolean;
  education: boolean;
  certifications: boolean;
  clinic_name: boolean;
  clinic_address: boolean;
  specialization: boolean;
  years_of_experience: boolean;
}

const Profile = () => {
  const { profile, loading, error, handleLogout, updateProfile } = useTherapistProfile();
  const [editing, setEditing] = useState<ProfileEditingState>({
    first_name: false,
    last_name: false,
    username: false,
    education: false,
    certifications: false,
    clinic_name: false,
    clinic_address: false,
    specialization: false,
    years_of_experience: false,
  });
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<{
    old?: string;
    new?: string;
    confirm?: string;
  }>({});
  const [securityOpen, setSecurityOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const userInfo = (profile as any)?.user_info;
  const fullName = userInfo
    ? `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim()
    : 'N/A';

  const handleEdit = (field: keyof ProfileEditingState) => {
    setEditing({ ...editing, [field]: true });
    const userInfo = (profile as any)?.user_info;
    if (field === 'first_name' || field === 'last_name' || field === 'username') {
      setFormData({ ...formData, [field]: userInfo?.[field] ?? '' });
    } else {
      setFormData({ ...formData, [field]: (profile as any)?.[field] || '' });
    }
    setSaveSuccess(null);
    setSaveError(null);
  };

  const handleCancel = (field: keyof ProfileEditingState) => {
    setEditing({ ...editing, [field]: false });
    setFormData({ ...formData, [field]: '' });
  };

  const handleSave = async (field: keyof ProfileEditingState) => {
    try {
      setSaveError(null);
      const updateData = { [field]: formData[field] };
      await updateProfile(updateData);
      setEditing({ ...editing, [field]: false });
      setSaveSuccess(`${field.replace(/_/g, ' ')} updated successfully!`);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving.';
      setSaveError(msg);
      console.error('Save error:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, field: keyof ProfileEditingState) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave(field);
    }
  };

  const setPasswordField = (key: 'old' | 'new' | 'confirm', value: string) => {
    setPasswordForm((prev) => ({ ...prev, [key]: value }));
    setPasswordErrors((prev) => ({ ...prev, [key]: undefined }));
    if (passwordNotice) setPasswordNotice(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);
    const nextErrors: typeof passwordErrors = {};
    if (!passwordForm.old.trim()) {
      nextErrors.old = 'Current password is required';
    }
    const newErr = validatePasswordStrength(passwordForm.new, 'New password is required');
    if (newErr) nextErrors.new = newErr;
    if (!passwordForm.confirm) {
      nextErrors.confirm = 'Please confirm your new password';
    } else if (passwordForm.new !== passwordForm.confirm) {
      nextErrors.confirm = 'Passwords do not match';
    }
    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPasswordSaving(true);
    try {
      await authService.changePassword({
        old_password: passwordForm.old,
        new_password: passwordForm.new,
        new_password_confirm: passwordForm.confirm,
      });
      setPasswordForm({ old: '', new: '', confirm: '' });
      setPasswordErrors({});
      setPasswordNotice({ type: 'ok', text: 'Password updated. You remain signed in.' });
    } catch (err: unknown) {
      setPasswordNotice({
        type: 'err',
        text: err instanceof Error ? err.message : 'Could not change password.',
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await authService.deleteAccount({ password: deletePassword });
      setDeleteOpen(false);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not delete account.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Purple Gradient Header with Therapist Info */}
      <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 text-white shadow-lg overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Therapist Info Section */}
            <div className="flex items-start gap-4 flex-1">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 lg:w-24 lg:h-24 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl lg:text-3xl font-bold shadow-xl border-4 border-white/30">
                  {fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'T'}
                </div>
                {/* Online Status Indicator */}
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-green-500 border-4 border-white rounded-full shadow-lg"></div>
              </div>

              {/* Therapist Details */}
              <div className="flex-1 space-y-3">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold mb-2">{fullName}</h1>
                  <div className="flex flex-wrap items-center gap-3">
                    {(profile as any)?.specialization && (
                      <span className="inline-flex items-center px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-xs font-medium">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        {(profile as any)?.specialization}
                      </span>
                    )}
                    {(profile as any)?.therapist_pin && (
                      <span className="inline-flex items-center px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-xs font-medium">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        PIN: {(profile as any)?.therapist_pin}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {userInfo?.email && (
                    <div className="flex items-center space-x-2.5 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2.5">
                      <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="text-xs text-white/70">Email</p>
                        <p className="font-medium text-sm">{userInfo.email}</p>
                      </div>
                    </div>
                  )}
                  {(profile as any)?.clinic_name && (
                    <div className="flex items-center space-x-2.5 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2.5">
                      <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <div>
                        <p className="text-xs text-white/70">Clinic</p>
                        <p className="font-medium text-sm">{(profile as any)?.clinic_name}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-3 pt-1">
                  {(profile as any)?.years_of_experience && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20">
                      <p className="text-xs text-white/70 mb-1">Experience</p>
                      <p className="font-semibold">{(profile as any)?.years_of_experience} years</p>
                    </div>
                  )}
                  {(profile as any)?.education && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20">
                      <p className="text-xs text-white/70 mb-1">Education</p>
                      <p className="font-semibold text-sm">{(profile as any)?.education.substring(0, 20)}{(profile as any)?.education.length > 20 ? '...' : ''}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex flex-col gap-2 lg:self-start">
              <button
                onClick={handleLogout}
                className="px-4 py-2.5 bg-white hover:bg-gray-50 text-purple-700 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Success/Error Notifications */}
      {saveSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {saveSuccess}
        </div>
      )}
      {saveError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column - Account & Basic Info */}
        <div className="lg:col-span-1 space-y-5">
          {/* Account Information */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Account Information
            </h2>
            <div className="space-y-4">
              <ProfileEditableField
                label="First name"
                value={userInfo?.first_name}
                field="first_name"
                editing={editing.first_name}
                formData={formData.first_name}
                onEdit={() => handleEdit('first_name')}
                onCancel={() => handleCancel('first_name')}
                onSave={() => handleSave('first_name')}
                onChange={(value: string) => setFormData({ ...formData, first_name: value })}
                onKeyPress={(e: React.KeyboardEvent) => handleKeyPress(e, 'first_name')}
              />
              <ProfileEditableField
                label="Last name"
                value={userInfo?.last_name}
                field="last_name"
                editing={editing.last_name}
                formData={formData.last_name}
                onEdit={() => handleEdit('last_name')}
                onCancel={() => handleCancel('last_name')}
                onSave={() => handleSave('last_name')}
                onChange={(value: string) => setFormData({ ...formData, last_name: value })}
                onKeyPress={(e: React.KeyboardEvent) => handleKeyPress(e, 'last_name')}
              />
              <div>
                {userInfo?.can_change_username === false && userInfo?.next_username_change_at && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-2">
                    Next change allowed after{' '}
                    {new Date(userInfo.next_username_change_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                )}
                <ProfileEditableField
                  label="Username"
                  value={userInfo?.username}
                  field="username"
                  editing={editing.username}
                  formData={formData.username}
                  onEdit={() => {
                    if (userInfo?.can_change_username === false) {
                      setSaveError(
                        'You can only change your username once every 30 days. See the date above.'
                      );
                      return;
                    }
                    handleEdit('username');
                  }}
                  onCancel={() => handleCancel('username')}
                  onSave={() => handleSave('username')}
                  onChange={(value: string) => setFormData({ ...formData, username: value })}
                  onKeyPress={(e: React.KeyboardEvent) => handleKeyPress(e, 'username')}
                  hideLabel
                  disabledHint={userInfo?.can_change_username === false}
                />
              </div>
              <InfoField label="Email" value={userInfo?.email} />
              <InfoField label="Phone" value={userInfo?.phone_number} />
              <InfoField label="Date of Birth" value={userInfo?.date_of_birth} />
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setSecurityOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50/80 transition-colors"
              aria-expanded={securityOpen}
              id="profile-security-toggle"
            >
              <span className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                <svg className="w-5 h-5 text-purple-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Security
              </span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200 ${
                  securityOpen ? 'rotate-180' : ''
                }`}
                aria-hidden
              />
            </button>

            {securityOpen && (
              <div className="border-t border-gray-100 px-5 pb-5 pt-2" role="region" aria-labelledby="profile-security-toggle">
                <form onSubmit={handleChangePassword} className="space-y-3">
                  {passwordNotice && (
                    <p
                      className={`text-sm px-2 py-1.5 rounded ${
                        passwordNotice.type === 'ok'
                          ? 'bg-green-50 text-green-800 border border-green-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {passwordNotice.text}
                    </p>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Current password</label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={passwordForm.old}
                      onChange={(e) => setPasswordField('old', e.target.value)}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                        passwordErrors.old ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {passwordErrors.old && (
                      <p className="text-red-500 text-xs mt-1">{passwordErrors.old}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">New password</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.new}
                      onChange={(e) => setPasswordField('new', e.target.value)}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                        passwordErrors.new ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {passwordErrors.new && (
                      <p className="text-red-500 text-xs mt-1">{passwordErrors.new}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Confirm new password</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordField('confirm', e.target.value)}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                        passwordErrors.confirm ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {passwordErrors.confirm && (
                      <p className="text-red-500 text-xs mt-1">{passwordErrors.confirm}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="w-full bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-60"
                  >
                    {passwordSaving ? 'Updating…' : 'Change password'}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-gray-200">
                  <p className="text-xs font-medium text-red-800 mb-2">Danger zone</p>
                  <button
                    type="button"
                    onClick={() => {
                      setDeletePassword('');
                      setDeleteOpen(true);
                      setSaveError(null);
                    }}
                    className="w-full border border-red-300 text-red-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50"
                  >
                    Delete account
                  </button>
                </div>
              </div>
            )}
          </div>

          {deleteOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Delete your account?</h3>
                <p className="text-sm text-gray-600">
                  This permanently removes your account and associated data. This cannot be undone.
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Confirm with your password</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(false)}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteLoading || !deletePassword}
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteLoading ? 'Deleting…' : 'Delete forever'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Practice Statistics
            </h2>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Patients</span>
                <span className="text-xl font-bold text-purple-600">{(profile as any)?.patient_count ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Years of Experience</span>
                <span className="text-xl font-bold text-purple-600">{(profile as any)?.years_of_experience ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Professional Info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Professional Information */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Professional Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProfileEditableField
                label="Specialization"
                value={(profile as any)?.specialization}
                field="specialization"
                editing={editing.specialization}
                formData={formData.specialization}
                onEdit={() => handleEdit('specialization')}
                onCancel={() => handleCancel('specialization')}
                onSave={() => handleSave('specialization')}
                onChange={(value: string) => setFormData({ ...formData, specialization: value })}
                onKeyPress={(e: React.KeyboardEvent) => handleKeyPress(e, 'specialization')}
              />
              <InfoField label="License Number" value={(profile as any)?.license_number} readOnly />
              <ProfileEditableField
                label="Years of Experience"
                value={(profile as any)?.years_of_experience}
                field="years_of_experience"
                type="number"
                editing={editing.years_of_experience}
                formData={formData.years_of_experience}
                onEdit={() => handleEdit('years_of_experience')}
                onCancel={() => handleCancel('years_of_experience')}
                onSave={() => handleSave('years_of_experience')}
                onChange={(value: string) => setFormData({ ...formData, years_of_experience: value })}
                onKeyPress={(e: React.KeyboardEvent) => handleKeyPress(e, 'years_of_experience')}
              />
              <InfoField label="Therapist PIN" value={(profile as any)?.therapist_pin} readOnly mono />
            </div>

            <div className="mt-5 space-y-5">
              <ProfileEditableField
                label="Education"
                value={(profile as any)?.education}
                field="education"
                editing={editing.education}
                formData={formData.education}
                onEdit={() => handleEdit('education')}
                onCancel={() => handleCancel('education')}
                onSave={() => handleSave('education')}
                onChange={(value: string) => setFormData({ ...formData, education: value })}
                onKeyPress={(e: React.KeyboardEvent) => handleKeyPress(e, 'education')}
                multiline
              />
              <ProfileEditableField
                label="Certifications"
                value={(profile as any)?.certifications}
                field="certifications"
                editing={editing.certifications}
                formData={formData.certifications}
                onEdit={() => handleEdit('certifications')}
                onCancel={() => handleCancel('certifications')}
                onSave={() => handleSave('certifications')}
                onChange={(value: string) => setFormData({ ...formData, certifications: value })}
                onKeyPress={(e: React.KeyboardEvent) => handleKeyPress(e, 'certifications')}
                multiline
              />
            </div>
          </div>

          {/* Clinic Information */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Clinic Information
            </h2>
            <div className="space-y-5">
              <ProfileEditableField
                label="Clinic Name"
                value={(profile as any)?.clinic_name}
                field="clinic_name"
                editing={editing.clinic_name}
                formData={formData.clinic_name}
                onEdit={() => handleEdit('clinic_name')}
                onCancel={() => handleCancel('clinic_name')}
                onSave={() => handleSave('clinic_name')}
                onChange={(value: string) => setFormData({ ...formData, clinic_name: value })}
                onKeyPress={(e: React.KeyboardEvent) => handleKeyPress(e, 'clinic_name')}
              />
              <ProfileEditableField
                label="Clinic Address"
                value={(profile as any)?.clinic_address}
                field="clinic_address"
                editing={editing.clinic_address}
                formData={formData.clinic_address}
                onEdit={() => handleEdit('clinic_address')}
                onCancel={() => handleCancel('clinic_address')}
                onSave={() => handleSave('clinic_address')}
                onChange={(value: string) => setFormData({ ...formData, clinic_address: value })}
                onKeyPress={(e: React.KeyboardEvent) => handleKeyPress(e, 'clinic_address')}
                multiline
              />
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

// Helper component for read-only info fields
const InfoField = ({ label, value, readOnly = false, mono = false }: any) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
    <p className={`text-sm text-gray-900 ${mono ? 'font-mono text-base' : ''} ${readOnly ? 'bg-gray-50 px-3 py-2 rounded' : ''}`}>
      {value || 'Not provided'}
    </p>
  </div>
);

// Helper component for editable fields
const ProfileEditableField = ({
  label,
  value,
  editing,
  formData,
  onEdit,
  onCancel,
  onSave,
  onChange,
  onKeyPress,
  multiline = false,
  type = 'text',
  hideLabel = false,
  disabledHint = false,
}: any) => {
  const isEmpty = !value || value.toString().trim() === '';

  return (
    <div>
      {!hideLabel && label ? (
        <label className="block text-xs font-medium text-gray-500 mb-2">{label}</label>
      ) : null}
      {editing ? (
        <div className="space-y-2">
          {multiline ? (
            <textarea
              value={formData || ''}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={onKeyPress}
              className="w-full px-3 py-2 text-sm border border-purple-500 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
              autoFocus
            />
          ) : (
            <input
              type={type}
              value={formData || ''}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={onKeyPress}
              className="w-full px-3 py-2 text-sm border border-purple-500 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoFocus
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : isEmpty ? (
        <button
          onClick={onEdit}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-purple-500 hover:bg-purple-50 transition-all group"
        >
          <div className="flex items-center justify-center gap-2 text-gray-500 group-hover:text-purple-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium">Add {label}</span>
          </div>
        </button>
      ) : (
        <div
          className={`group relative bg-gray-50 rounded-lg p-3 transition-colors ${
            disabledHint ? 'opacity-75' : 'hover:bg-purple-50'
          }`}
        >
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{value}</p>
          <button
            onClick={onEdit}
            disabled={disabledHint}
            className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-purple-600 text-white p-2 rounded-lg transition-all ${
              disabledHint ? 'opacity-40 cursor-not-allowed' : 'hover:bg-purple-700'
            }`}
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;