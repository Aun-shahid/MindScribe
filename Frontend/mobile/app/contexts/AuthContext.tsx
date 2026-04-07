// app/contexts/AuthContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  User,
  LoginRequest,
  RegisterRequest,
  PasswordResetRequest,
  EmailVerificationRequest,
  PasswordResetConfirm,
  AuthError,
} from '../types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
  profile: User | null;
  profileLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (data: PasswordResetRequest) => Promise<void>;
  confirmPasswordReset: (data: PasswordResetConfirm) => Promise<void>;
  verifyEmail: (data: EmailVerificationRequest) => Promise<void>;
  clearError: () => void;
  checkAuthStatus: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}
const THERAPIST_ACCOUNT_REQUIRED_MESSAGE = 'You do not have a valid therapist account.';
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const authState = useAuth();

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

const ExpoRouterStubScreen = () => null;
export default ExpoRouterStubScreen;

