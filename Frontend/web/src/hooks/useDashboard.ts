// src/hooks/useDashboard.ts
import { useState, useEffect, useCallback } from 'react';
import dashboardService from '../services/dashboard.service';
import { listenToAppEvent } from '../utils/events';
import type { DashboardResponse } from '../types/dashboard';

interface DashboardError {
  message: string;
  code?: string;
}

export const useDashboard = () => {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DashboardError | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getDashboardData();
      setDashboard(data);
    } catch (err) {
      setError(err as DashboardError);
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();

    // Listen for patient-related events to auto-refresh dashboard
    const cleanupCreated = listenToAppEvent('patient-created', () => {
      console.log('Patient created, refreshing dashboard...');
      fetchDashboard();
    });

    const cleanupUpdated = listenToAppEvent('patient-updated', () => {
      console.log('Patient updated, refreshing dashboard...');
      fetchDashboard();
    });

    const cleanupDeleted = listenToAppEvent('patient-deleted', () => {
      console.log('Patient deleted, refreshing dashboard...');
      fetchDashboard();
    });

    return () => {
      cleanupCreated();
      cleanupUpdated();
      cleanupDeleted();
    };
  }, [fetchDashboard]);

  const refreshDashboard = useCallback(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    dashboard,
    loading,
    error,
    fetchDashboard,
    refreshDashboard,
    clearError,
  };
};
