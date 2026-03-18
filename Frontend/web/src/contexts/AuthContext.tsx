// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import authService from '../services/auth.service';
import profileService from '../services/profile.service';

interface User {
  id: string;
  username: string;
  email: string;
  user_type: string;
  email_verified: boolean;
  is_verified?: boolean;
  first_name?: string;
  last_name?: string;
}

interface AuthError {
  message: string;
  code?: string;
  details?: any;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<{ success: boolean; needsVerification?: boolean; user?: any }>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, password: string) => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
  profileLoading: boolean;
  error: AuthError | null;
  clearError: () => void;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const profile = await authService.getProfile();
          setUser(profile);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Clear invalid tokens
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await authService.login({ email, password });
      if (response.user) {
        setUser(response.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any): Promise<{ success: boolean; needsVerification?: boolean; user?: any }> => {
    try {
      setLoading(true);
      const response = await authService.register(userData);
      
      // If user is returned but email is not verified, don't log them in
      if (response.user && !response.user.email_verified) {
        return { success: true, needsVerification: true, user: response.user };
      }
      
      // If user is verified, log them in
      if (response.user && response.user.email_verified) {
        setUser(response.user);
        return { success: true, needsVerification: false, user: response.user };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Registration failed:', error);
      throw error; // Re-throw the error so the component can handle it
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const clearError = () => {
    setError(null);
  };

  /**
   * Fetch user profile
   */
  const fetchProfile = useCallback(async () => {
    try {
      console.log('🔄 [AUTH] Starting fetchProfile...');
      setProfileLoading(true);
      setError(null);
      
      const profile = await profileService.getProfile();
      
      console.log('✅ [AUTH] Profile fetched successfully:');
      console.log('📊 Profile Data Summary:');
      console.log('  - User ID:', profile.id);
      console.log('  - Email:', profile.email);
      console.log('  - User Type:', profile.user_type);
      console.log('  - Verified Status (is_verified):', profile.is_verified);
      console.log('  - Verified Status (email_verified):', profile.email_verified);
      console.log('  - Complete Profile Object:', JSON.stringify(profile, null, 2));
      
      setUser(profile);
      setProfileLoading(false);
    } catch (err: any) {
      console.error('❌ [AUTH] Error fetching profile:', err);
      console.error('❌ [AUTH] Error details:', err);
      setProfileLoading(false);
      setError(err);
    }
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = async (profileData: Partial<User>) => {
    try {
      setProfileLoading(true);
      setError(null);
      
      const updatedProfile = await profileService.updateProfile(profileData);
      
      setUser(updatedProfile);
      setProfileLoading(false);
    } catch (err: any) {
      setProfileLoading(false);
      setError(err);
    }
  };

  const requestPasswordReset = async (email: string): Promise<void> => {
    try {
      setLoading(true);
      await authService.requestPasswordReset({ email });
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const confirmPasswordReset = async (token: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      await authService.confirmPasswordReset({ token, new_password: password });
    } catch (error) {
      console.error('Password reset confirmation failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (code: string): Promise<void> => {
    try {
      setLoading(true);
      await authService.verifyEmail({ code });
    } catch (error) {
      console.error('Email verification failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetInactivityTimer = () => {
    // This function is used by useAutoLogout hook
    // It can be used to reset the inactivity timer when user performs actions
    console.log('Inactivity timer reset');
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user,
    requestPasswordReset,
    confirmPasswordReset,
    verifyEmail,
    fetchProfile,
    updateProfile,
    profileLoading,
    error,
    clearError,
    resetInactivityTimer,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};