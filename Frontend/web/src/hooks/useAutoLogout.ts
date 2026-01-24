// src/hooks/useAutoLogout.ts
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to automatically reset inactivity timer on component interactions
 * Use this in components where user activity should reset the logout timer
 */
export const useAutoLogout = () => {
  const { resetInactivityTimer, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    // List of events that should reset the inactivity timer
    const events = [
      'click',
      'keydown',
      'scroll',
      'mousemove',
      'touchstart',
    ];

    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
    };
  }, [resetInactivityTimer, isAuthenticated]);

  return { resetInactivityTimer };
};