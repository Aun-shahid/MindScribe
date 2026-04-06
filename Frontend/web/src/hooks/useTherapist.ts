import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import therapistService from '../services/therapist.service';
import type {
  QRCodeState,
  TherapistQRInfo,
} from '../types/therapist';

interface UseTherapistQRCodeActions {
  fetchTherapistInfo: () => Promise<void>;
  handleShare: () => Promise<void>;
  handleRefresh: () => void;
}

// QR Code Hook
export const useTherapistQRCode = (): QRCodeState & UseTherapistQRCodeActions => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [therapistInfo, setTherapistInfo] = useState<TherapistQRInfo | null>(null);

  const fetchTherapistInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await therapistService.getTherapistQRInfo();
      setTherapistInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch therapist info');
      console.error('QR code fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTherapistInfo();
  }, [fetchTherapistInfo]);

  const handleShare = useCallback(async () => {
    if (therapistInfo && navigator.share) {
      try {
        await navigator.share({
          title: 'MindScribe - Connect with your Therapist',
          text: `Use this PIN to connect: ${(therapistInfo as any).therapist_pin}`,
          url: window.location.origin,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback to clipboard
      if (therapistInfo) {
        navigator.clipboard.writeText(`MindScribe PIN: ${(therapistInfo as any).therapist_pin}`);
        alert('PIN copied to clipboard!');
      }
    }
  }, [therapistInfo]);

  const handleRefresh = useCallback(() => {
    fetchTherapistInfo();
  }, [fetchTherapistInfo]);

  return {
    loading,
    error,
    therapistInfo,
    fetchTherapistInfo,
    handleShare,
    handleRefresh,
  };
};



// Profile Hook
export const useTherapistProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await therapistService.getTherapistProfile();
      setProfile(data);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to fetch profile';
      setError(errorMessage);
      console.error('Profile fetch error:', err);
      console.error('Error details:', {
        message: err?.message,
        code: err?.code,
        status: err?.response?.status,
        data: err?.response?.data
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch profile if we have an access token (user is authenticated)
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
      setError('User not authenticated');
    }
  }, [fetchProfile]);

  const updateProfile = useCallback(async (profileData: any) => {
    setError(null);
    const updatedProfile = await therapistService.updateTherapistProfile(profileData);
    setProfile(updatedProfile);
    return updatedProfile;
  }, []);

  const applyProfile = useCallback((data: any) => {
    setProfile(data);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      // Clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');

      // Redirect to login
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, [navigate]);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    applyProfile,
    handleLogout,
    clearError: () => setError(null),
  };
};

