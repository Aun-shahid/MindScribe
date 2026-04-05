// Validate therapist PIN (must be exactly 9 digits)
export const validateTherapistPinField = (pin: string): ValidationResult => {
  if (!validateRequired(pin)) {
    return { isValid: false, message: 'Therapist code is required.' };
  }
  const pinRegex = /^\d{9}$/;
  if (!pinRegex.test(pin.trim())) {
    return { isValid: false, message: 'Therapist code must be exactly 9 digits.' };
  }
  return { isValid: true };
};

// Generic text field validation (e.g., journal, notes, goals)
export const validateTextField = (value: string, fieldName: string, minLength = 1): ValidationResult => {
  if (!validateRequired(value)) {
    return { isValid: false, message: `${fieldName} is required.` };
  }
  if (value.trim().length < minLength) {
    return { isValid: false, message: `${fieldName} must be at least ${minLength} character${minLength > 1 ? 's' : ''}.` };
  }
  return { isValid: true };
};

// Allows expressive text (numbers/punctuation/emojis) but prevents symbol-only or number-only content.
export const validateMeaningfulTextField = (
  value: string,
  fieldName: string,
  minLength = 1,
  optional = false
): ValidationResult => {
  const trimmed = (value || '').trim();

  if (!trimmed) {
    if (optional) return { isValid: true };
    return { isValid: false, message: `${fieldName} is required.` };
  }

  if (trimmed.length < minLength) {
    return { isValid: false, message: `${fieldName} must be at least ${minLength} character${minLength > 1 ? 's' : ''}.` };
  }

  if (!/\p{L}/u.test(trimmed)) {
    return { isValid: false, message: `${fieldName} must include at least one letter.` };
  }

  return { isValid: true };
};

// Optional: Notes field validation (allow empty, but limit length)
export const validateOptionalNotesField = (value: string, maxLength = 1000): ValidationResult => {
  if (value && value.length > maxLength) {
    return { isValid: false, message: `Notes cannot exceed ${maxLength} characters.` };
  }
  return { isValid: true };
};
// app/utils/validation.ts

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateToken = (token: string): boolean => {
  return token.trim().length > 0;
};

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export const validateEmailField = (email: string): ValidationResult => {
  if (!validateRequired(email)) {
    return { isValid: false, message: 'Email is required.' };
  }
  if (!validateEmail(email)) {
    return { isValid: false, message: 'Please enter a valid email address.' };
  }
  return { isValid: true };
};

export const validatePasswordField = (password: string): ValidationResult => {
  if (!validateRequired(password)) {
    return { isValid: false, message: 'Password is required.' };
  }
  if (!validatePassword(password)) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  return { isValid: true };
};

export const validateTokenField = (token: string): ValidationResult => {
  if (!validateToken(token)) {
    return { isValid: false, message: 'Verification token is required.' };
  }
  return { isValid: true };
};

export const validateUsernameField = (username: string): ValidationResult => {
  if (!validateRequired(username)) {
    return { isValid: false, message: 'Username is required.' };
  }
  if (username.trim().length < 3) {
    return { isValid: false, message: 'Username must be at least 3 characters long.' };
  }
  return { isValid: true };
};

export const validateNameField = (name: string, fieldName: string): ValidationResult => {
  if (!validateRequired(name)) {
    return { isValid: false, message: `${fieldName} is required.` };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { isValid: false, message: `${fieldName} must be at least 2 characters long.` };
  }
  if (!/^[\p{L}\s]+$/u.test(trimmed)) {
    return { isValid: false, message: `${fieldName} can only contain letters and spaces.` };
  }
  return { isValid: true };
};

export const validatePhoneField = (phone: string): ValidationResult => {
  if (!validateRequired(phone)) {
    return { isValid: false, message: 'Phone number is required.' };
  }
  const phoneRegex = /^\d{11}$/;
  if (!phoneRegex.test(phone)) {
    return { isValid: false, message: 'Please enter an 11-digit phone number.' };
  }
  return { isValid: true };
};

export const validateDateOfBirthField = (date: string): ValidationResult => {
  if (!validateRequired(date)) {
    return { isValid: false, message: 'Date of birth is required.' };
  }

  const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dobRegex.test(date.trim())) {
    return { isValid: false, message: 'Please enter date of birth in YYYY-MM-DD format.' };
  }

  const birthDate = new Date(`${date.trim()}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) {
    return { isValid: false, message: 'Please enter a valid date of birth.' };
  }

  const today = new Date();
  if (birthDate > today) {
    return { isValid: false, message: 'Date of birth cannot be in the future.' };
  }

  const age = today.getFullYear() - birthDate.getFullYear();

  if (age < 13) {
    return { isValid: false, message: 'You must be at least 13 years old to register.' };
  }
  return { isValid: true };
};

export const validatePasswordConfirmField = (password: string, confirmPassword: string): ValidationResult => {
  if (!validateRequired(confirmPassword)) {
    return { isValid: false, message: 'Please confirm your password.' };
  }
  if (password !== confirmPassword) {
    return { isValid: false, message: 'Passwords do not match.' };
  }
  return { isValid: true };
};

export const validateLicenseField = (license: string, isTherapist: boolean): ValidationResult => {
  if (isTherapist && !validateRequired(license)) {
    return { isValid: false, message: 'License number is required for therapists.' };
  }
  return { isValid: true };
};

export const validateSpecializationField = (specialization: string, isTherapist: boolean): ValidationResult => {
  if (isTherapist && !validateRequired(specialization)) {
    return { isValid: false, message: 'Specialization is required for therapists.' };
  }
  return { isValid: true };
};

// Required by Expo Router (all files inside app/ must export a default component)
export default function ValidationUtils() { return null; }

export interface FormValidationErrors {
  username?: string;
  email?: string;
  password?: string;
  password_confirm?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  date_of_birth?: string;
  license_number?: string;
  specialization?: string;
}

export const validateRegisterForm = (form: any): { isValid: boolean; errors: FormValidationErrors } => {
  const errors: FormValidationErrors = {};
  
  // Username validation
  const usernameValidation = validateUsernameField(form.username);
  if (!usernameValidation.isValid) {
    errors.username = usernameValidation.message;
  }
  
  // Email validation
  const emailValidation = validateEmailField(form.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.message;
  }
  
  // Password validation
  const passwordValidation = validatePasswordField(form.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.message;
  }
  
  // Password confirmation validation
  const passwordConfirmValidation = validatePasswordConfirmField(form.password, form.password_confirm);
  if (!passwordConfirmValidation.isValid) {
    errors.password_confirm = passwordConfirmValidation.message;
  }
  
  // First name validation
  const firstNameValidation = validateNameField(form.first_name, 'First name');
  if (!firstNameValidation.isValid) {
    errors.first_name = firstNameValidation.message;
  }
  
  // Last name validation
  const lastNameValidation = validateNameField(form.last_name, 'Last name');
  if (!lastNameValidation.isValid) {
    errors.last_name = lastNameValidation.message;
  }
  
  // Phone validation
  const phoneValidation = validatePhoneField(form.phone_number);
  if (!phoneValidation.isValid) {
    errors.phone_number = phoneValidation.message;
  }
  
  // Date of birth validation
  const dateValidation = validateDateOfBirthField(form.date_of_birth);
  if (!dateValidation.isValid) {
    errors.date_of_birth = dateValidation.message;
  }
  
  // Therapist-specific validations
  const isTherapist = form.user_type === 'therapist';
  
  const licenseValidation = validateLicenseField(form.license_number, isTherapist);
  if (!licenseValidation.isValid) {
    errors.license_number = licenseValidation.message;
  }
  
  const specializationValidation = validateSpecializationField(form.specialization, isTherapist);
  if (!specializationValidation.isValid) {
    errors.specialization = specializationValidation.message;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
