// app/types/auth.ts

export interface User {
  id: string;
  email: string;
  username?: string;
  user_type: 'therapist' | 'patient';
  first_name: string;
  last_name: string;
  phone_number?: string;
  date_of_birth?: string;
  is_verified: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  access: string;
  refresh: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  user_type: 'therapist' | 'patient';
  phone_number: string;
  date_of_birth: string;
  license_number?: string; // Optional for therapists only
  specialization?: string; // Optional for therapists only
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

export interface EmailVerificationRequest {
  code: string;
}

export interface TokenRefreshRequest {
  refresh: string;
}

export interface TokenRefreshResponse {
  access: string;
  refresh: string;
}

export interface AuthError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}