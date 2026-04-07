// app/utils/profile.ts

import { TherapistProfileData, ProfileFieldData } from '../types/therapist';

export const getProfileFields = (profile: TherapistProfileData): ProfileFieldData[] => {
  return [
    {
      label: 'ID',
      value: profile.id
    },
    {
      label: 'Name',
      value: `${profile.first_name} ${profile.last_name}`
    },
    {
      label: 'Email',
      value: profile.email
    },
    {
      label: 'User Type',
      value: profile.user_type
    },
    {
      label: 'Verified',
      value: (profile.email_verified || profile.is_verified) ? 'Yes' : 'No'
    }
  ];
};

export const getThemeToggleText = (currentTheme: string): string => {
  return `Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} Mode`;
};

export const formatProfileName = (profile: TherapistProfileData): string => {
  return `${profile.first_name} ${profile.last_name}`;
};

export const isProfileVerified = (profile: TherapistProfileData): boolean => {
  return !!(profile.email_verified || profile.is_verified);
};

export const getProfileDisplayValue = (value: string | undefined | null): string => {
  return value || 'Not available';
};

export default function ProfileUtilsRoute() {
  return null;
}
