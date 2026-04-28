// src/pages/Profile.tsx
import { useState, useRef } from 'react';
import { ChevronDown, Info, X } from 'lucide-react';
import { useTherapistProfile } from '../hooks/useTherapist';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/auth.service';
import therapistService from '../services/therapist.service';
import { validatePasswordStrength } from '../utils/passwordValidation';
import { TherapistPageBanner } from '../components/TherapistPageBanner';
import { THERAPIST_PAGE_SHELL } from '../constants/pageShell';
import { ProfilePageSkeleton } from '../components/pageSkeletons/MainPageSkeletons';

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
  phone_number: boolean;
  date_of_birth: boolean;
  license_number: boolean;
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const PUBLIC_DIRECTORY_TOOLTIP =
  'When enabled, your profile is visible to other Mindscribe users browsing the public therapist directory (limited details such as name, photo, and specialization).';

const HeaderReadOnlyChip = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="rounded-lg bg-white/10 px-3 py-2 border border-white/15 min-w-0">
    <p className="text-[10px] uppercase tracking-wide text-purple-200/90">{label}</p>
    <p className="text-sm font-medium text-white truncate" title={value || undefined}>
      {value !== undefined && value !== null && String(value).trim() !== '' ? value : '—'}
    </p>
  </div>
);

const Profile = () => {
  const { fetchProfile: refreshAuthUser } = useAuth();
  const { profile, loading, error, handleLogout, updateProfile, applyProfile } = useTherapistProfile();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);
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
    phone_number: false,
    date_of_birth: false,
    license_number: false,
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
  const [visibilityBusy, setVisibilityBusy] = useState(false);

  const userInfo = (profile as any)?.user_info;
  const isPublicDirectory = Boolean((profile as any)?.is_public);
  const avatarUrl = userInfo?.avatar_url as string | undefined;
  const fullName = userInfo
    ? `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim()
    : 'N/A';



  const handleEdit = (field: keyof ProfileEditingState) => {
    setEditing({ ...editing, [field]: true });
    const userInfo = (profile as any)?.user_info;
    if (['first_name', 'last_name', 'username', 'phone_number', 'date_of_birth'].includes(field)) {
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
    if (!passwordForm.old.trim() && userInfo?.has_usable_password) {
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

  const handleAvatarPick = () => {
    setAvatarMsg(null);
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarMsg('Image must be 5 MB or smaller.');
      e.target.value = '';
      return;
    }
    setAvatarMsg(null);
    setAvatarBusy(true);
    try {
      const data = await therapistService.uploadTherapistAvatar(file);
      applyProfile(data);
      await refreshAuthUser();
    } catch (err) {
      setAvatarMsg(err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setAvatarBusy(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarMsg(null);
    setAvatarBusy(true);
    try {
      const data = await therapistService.clearTherapistAvatar();
      applyProfile(data);
      await refreshAuthUser();
    } catch (err) {
      setAvatarMsg(err instanceof Error ? err.message : 'Could not remove photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleDirectoryVisibility = async (nextPublic: boolean) => {
    if (Boolean((profile as any)?.is_public) === nextPublic) return;
    setVisibilityBusy(true);
    setSaveError(null);
    try {
      await updateProfile({ is_public: nextPublic });
      setSaveSuccess(
        nextPublic
          ? 'Your profile is listed in the public therapist directory.'
          : 'Your profile is private and hidden from the directory.'
      );
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not update visibility.');
    } finally {
      setVisibilityBusy(false);
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
    return <ProfilePageSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>Error loading profile: {error}</p>
      </div>
    );
  }

  return (
    <div className={THERAPIST_PAGE_SHELL}>
      <div className="mb-6">
        <TherapistPageBanner heightClassName="min-h-[200px]">
        <div className="relative z-10 flex w-full flex-col gap-5 p-4 text-white sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Profile</h1>
              <p className="text-sm mt-1 text-purple-100">Your account and practice details</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0 min-w-[200px]">
              <p id="public-directory-tooltip" className="sr-only">
                {PUBLIC_DIRECTORY_TOOLTIP}
              </p>
              <span className="text-[10px] uppercase tracking-wide text-purple-200/90 self-end inline-flex items-center gap-1">
                Public directory
                <span
                  className="inline-flex cursor-help text-purple-200/85 hover:text-white"
                  title={PUBLIC_DIRECTORY_TOOLTIP}
                >
                  <Info className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                </span>
              </span>
              <div
                className="flex items-center gap-2.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm"
                title={PUBLIC_DIRECTORY_TOOLTIP}
              >
                <span
                  className={`text-xs font-medium tabular-nums transition-colors ${
                    !isPublicDirectory ? 'text-white' : 'text-purple-200/65'
                  }`}
                >
                  Private
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPublicDirectory}
                  aria-label="Toggle public therapist directory visibility"
                  aria-describedby="public-directory-tooltip"
                  disabled={visibilityBusy}
                  onClick={() => handleDirectoryVisibility(!isPublicDirectory)}
                  className={`relative inline-flex h-7 w-11 shrink-0 cursor-pointer rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-50 ${
                    isPublicDirectory
                      ? 'border-white/35 bg-emerald-500/35'
                      : 'border-white/25 bg-white/10'
                  }`}
                >
                  <span
                    className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-out ${
                      isPublicDirectory ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span
                  className={`text-xs font-medium tabular-nums transition-colors ${
                    isPublicDirectory ? 'text-white' : 'text-purple-200/65'
                  }`}
                >
                  Public
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
                {avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="w-full h-full rounded-xl object-cover shadow-lg border-4 border-white/35 bg-white/10"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                )}
                <div 
                  className={`avatar-fallback ${avatarUrl ? 'hidden' : 'flex'} w-full h-full bg-white/20 backdrop-blur-sm rounded-xl items-center justify-center text-2xl sm:text-3xl font-bold shadow-lg border-4 border-white/30`}
                >
                  {fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'T'}
                </div>
                {avatarUrl && (
                  <button
                    type="button"
                    aria-label="Remove profile photo"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAvatar();
                    }}
                    disabled={avatarBusy}
                    className="absolute top-0.5 right-0.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white shadow-md hover:bg-black/75 border border-white/50 transition-colors disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                  </button>
                )}
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-green-500 border-4 border-white rounded-full shadow-lg pointer-events-none"
                  aria-hidden
                />
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={handleAvatarPick}
                  disabled={avatarBusy}
                  className="text-xs font-medium px-2 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white border border-white/35 disabled:opacity-50"
                >
                  {avatarBusy ? '…' : avatarUrl ? 'Change photo' : 'Add photo'}
                </button>
              </div>
              {avatarMsg && (
                <p className="text-xs text-amber-200 mt-1 max-w-[220px] leading-snug">{avatarMsg}</p>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  tone="header"
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
                  tone="header"
                />
                <div>
                  {userInfo?.can_change_username === false && userInfo?.next_username_change_at && (
                    <p className="text-xs text-amber-200 bg-black/20 border border-amber-400/40 rounded px-2 py-1.5 mb-2">
                      Next username change after{' '}
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
                    disabledHint={userInfo?.can_change_username === false}
                    tone="header"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <HeaderReadOnlyChip label="Email" value={userInfo?.email} />
                <ProfileEditableField
                  label="Phone"
                  value={userInfo?.phone_number}
                  field="phone_number"
                  editing={editing.phone_number}
                  formData={formData.phone_number}
                  onEdit={() => handleEdit('phone_number')}
                  onCancel={() => handleCancel('phone_number')}
                  onSave={() => handleSave('phone_number')}
                  onChange={(value: string) => setFormData({ ...formData, phone_number: value })}
                  onKeyPress={(e: React.KeyboardEvent) => handleKeyPress(e, 'phone_number')}
                  tone="header"
                />
                <ProfileEditableField
                  label="Date of birth"
                  value={userInfo?.date_of_birth}
                  field="date_of_birth"
                  type="date"
                  editing={editing.date_of_birth}
                  formData={formData.date_of_birth}
                  onEdit={() => handleEdit('date_of_birth')}
                  onCancel={() => handleCancel('date_of_birth')}
                  onSave={() => handleSave('date_of_birth')}
                  onChange={(value: string) => setFormData({ ...formData, date_of_birth: value })}
                  onKeyPress={(e: React.KeyboardEvent) => handleKeyPress(e, 'date_of_birth')}
                  tone="header"
                />
                <HeaderReadOnlyChip
                  label="Total patients"
                  value={String((profile as any)?.patient_count ?? 0)}
                />
              </div>
            </div>
          </div>
        </div>
        </TherapistPageBanner>
      </div>

      <div className="space-y-5">
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

      <div className="space-y-5">
        {/* Professional + clinic */}
        <div>
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
              <ProfileEditableField
                label="License Number"
                value={(profile as any)?.license_number}
                field="license_number"
                editing={editing.license_number}
                formData={formData.license_number}
                onEdit={() => handleEdit('license_number')}
                onCancel={() => handleCancel('license_number')}
                onSave={() => handleSave('license_number')}
                onChange={(value: string) => setFormData({ ...formData, license_number: value })}
                onKeyPress={(e: React.KeyboardEvent) => handleKeyPress(e, 'license_number')}
              />
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

            <h3 className="text-base font-semibold text-gray-800 mt-8 pt-2 border-t border-gray-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Clinic
            </h3>
            <div className="mt-4 space-y-5">
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

        {/* Security — full width at bottom */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-2">
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
              <button
                type="button"
                onClick={handleLogout}
                className="w-full mb-5 flex items-center justify-center gap-2 border border-gray-300 text-gray-800 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Log out
              </button>

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
                {!userInfo?.has_usable_password ? (
                  <p className="text-sm text-purple-700 bg-purple-50 p-3 rounded-lg border border-purple-100 mb-4">
                    Since you signed up via Google, you don't have a password set yet. Create one below if you'd like to sign in with your email and a password in the future.
                  </p>
                ) : (
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
                    {passwordErrors.old && <p className="text-red-500 text-xs mt-1">{passwordErrors.old}</p>}
                  </div>
                )}
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
                  {passwordErrors.new && <p className="text-red-500 text-xs mt-1">{passwordErrors.new}</p>}
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
                  {passwordSaving ? 'Updating…' : (userInfo?.has_usable_password ? 'Change password' : 'Create password')}
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
  tone = 'default',
}: any) => {
  const isEmpty = !value || value.toString().trim() === '';
  const isHeader = tone === 'header';

  const labelCls = isHeader
    ? 'block text-xs font-medium text-purple-100/90 mb-1.5'
    : 'block text-xs font-medium text-gray-500 mb-2';
  const inputCls = isHeader
    ? 'w-full px-3 py-2 text-sm rounded-lg bg-white/15 border border-white/40 text-white placeholder-purple-200/80 focus:ring-2 focus:ring-white/50 focus:border-white/60'
    : 'w-full px-3 py-2 text-sm border border-purple-500 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent';
  const saveCls = isHeader
    ? 'flex-1 bg-white text-[#2f224a] px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors text-sm font-semibold'
    : 'flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium';
  const cancelCls = isHeader
    ? 'flex-1 bg-white/15 text-white px-3 py-2 rounded-lg hover:bg-white/25 transition-colors text-sm font-medium border border-white/30'
    : 'flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium';
  const emptyBtnCls = isHeader
    ? 'w-full border-2 border-dashed border-white/35 rounded-lg p-2.5 hover:border-white/60 hover:bg-white/10 transition-all text-purple-100'
    : 'w-full border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-purple-500 hover:bg-purple-50 transition-all group';
  const displayCls = isHeader
    ? `group relative rounded-lg p-2.5 border border-white/20 bg-white/10 transition-colors ${
        disabledHint ? 'opacity-75' : 'hover:bg-white/15'
      }`
    : `group relative bg-gray-50 rounded-lg p-3 transition-colors ${
        disabledHint ? 'opacity-75' : 'hover:bg-purple-50'
      }`;
  const valueTextCls = isHeader ? 'text-sm text-white whitespace-pre-wrap pr-8' : 'text-sm text-gray-900 whitespace-pre-wrap';
  const editIconBtnCls = isHeader
    ? `absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 bg-white/25 text-white p-1.5 rounded-md transition-all ${
        disabledHint ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/35'
      }`
    : `absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-purple-600 text-white p-2 rounded-lg transition-all ${
        disabledHint ? 'opacity-40 cursor-not-allowed' : 'hover:bg-purple-700'
      }`;

  return (
    <div>
      {!hideLabel && label ? <label className={labelCls}>{label}</label> : null}
      {editing ? (
        <div className="space-y-2">
          {multiline ? (
            <textarea
              value={formData || ''}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={onKeyPress}
              className={inputCls}
              rows={3}
              autoFocus
            />
          ) : (
            <input
              type={type}
              value={formData || ''}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={onKeyPress}
              className={inputCls}
              autoFocus
            />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onSave} className={saveCls}>
              Save
            </button>
            <button type="button" onClick={onCancel} className={cancelCls}>
              Cancel
            </button>
          </div>
        </div>
      ) : isEmpty ? (
        <button type="button" onClick={onEdit} className={emptyBtnCls}>
          <div
            className={`flex items-center justify-center gap-2 ${
              isHeader ? 'text-purple-100' : 'text-gray-500 group-hover:text-purple-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium">Add {label}</span>
          </div>
        </button>
      ) : (
        <div className={displayCls}>
          <p className={valueTextCls}>{value}</p>
          <button
            type="button"
            onClick={onEdit}
            disabled={disabledHint}
            className={editIconBtnCls}
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