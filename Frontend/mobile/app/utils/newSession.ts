// app/utils/newSession.ts

export const validateNewPatientForm = (form: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!form.first_name?.trim()) {
    errors.push('First name is required');
  }

  if (!form.last_name?.trim()) {
    errors.push('Last name is required');
  }

  if (!form.email?.trim()) {
    errors.push('Email is required');
  } else if (!isValidEmail(form.email)) {
    errors.push('Please enter a valid email address');
  }

  if (!form.phone_number?.trim()) {
    errors.push('Phone number is required');
  }

  if (!form.date_of_birth) {
    errors.push('Date of birth is required');
  }

  if (!form.gender?.trim()) {
    errors.push('Gender is required');
  }

  if (!form.emergency_contact_name?.trim()) {
    errors.push('Emergency contact name is required');
  }

  if (!form.emergency_contact_phone?.trim()) {
    errors.push('Emergency contact phone is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateSessionForm = (form: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!form.patient_id?.trim()) {
    errors.push('Patient selection is required');
  }

  if (!form.session_date) {
    errors.push('Session date is required');
  }

  if (!form.duration_minutes || form.duration_minutes <= 0) {
    errors.push('Session duration must be greater than 0');
  }

  if (!form.location?.trim() && !form.is_online) {
    errors.push('Location is required for in-person sessions');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const formatSessionDate = (date: string): string => {
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return date;
  }
};

export const formatSessionTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} minutes`;
  } else if (mins === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`;
  }
};

export const generatePatientCode = (firstName: string, lastName: string, dateOfBirth: string): string => {
  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  const dobNumbers = dateOfBirth.replace(/\D/g, '').slice(-4);
  const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
  return `${initials}${dobNumbers}${randomNum}`;
};

export const sessionTypes = [
  { label: 'One-on-One', value: 'one-on-one' },
  { label: 'Group Therapy', value: 'group' },
  { label: 'Family Therapy', value: 'family' },
  { label: 'Couples Therapy', value: 'couples' },
];

export const sessionDurations = [
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '60 minutes', value: 60 },
  { label: '90 minutes', value: 90 },
  { label: '120 minutes', value: 120 },
];

export const genderOptions = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Non-binary', value: 'non-binary' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
  { label: 'Other', value: 'other' },
];

export const languageOptions = [
  { label: 'English', value: 'english' },
  { label: 'Spanish', value: 'spanish' },
  { label: 'French', value: 'french' },
  { label: 'German', value: 'german' },
  { label: 'Italian', value: 'italian' },
  { label: 'Portuguese', value: 'portuguese' },
  { label: 'Chinese', value: 'chinese' },
  { label: 'Japanese', value: 'japanese' },
  { label: 'Korean', value: 'korean' },
  { label: 'Arabic', value: 'arabic' },
  { label: 'Hindi', value: 'hindi' },
  { label: 'Other', value: 'other' },
];

export const sessionFrequencyOptions = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-weekly', value: 'bi-weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'As needed', value: 'as-needed' },
];

export const daysOfWeek = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' },
];
