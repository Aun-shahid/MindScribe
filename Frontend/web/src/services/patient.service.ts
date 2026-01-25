// src/services/patient.service.ts
import api from '../utils/api';

/**
 * Patient Service
 * Handles all patient-related API calls for mood tracking, journal, relaxation, etc.
 */

export const patientService = {
  // Dashboard
  getDashboard: async () => {
    const response = await api.get('/patients/dashboard/');
    return response.data;
  },

  // Mood tracking
  getMoods: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const response = await api.get(`/patients/mood/?${params}`);
    return response.data;
  },

  getMoodById: async (id: number) => {
    const response = await api.get(`/patients/mood/${id}/`);
    return response.data;
  },

  createMood: async (moodData: {
    primary_emotion: string;
    intensity: number;
    anxiety_level?: number;
    depression_level?: number;
    stress_level?: number;
    notes?: string;
    tags?: string[];
  }) => {
    const response = await api.post('/patients/mood/', moodData);
    return response.data;
  },

  updateMood: async (id: number, moodData: any) => {
    const response = await api.put(`/patients/mood/${id}/`, moodData);
    return response.data;
  },

  deleteMood: async (id: number) => {
    await api.delete(`/patients/mood/${id}/`);
  },

  // Journal entries
  getJournalEntries: async () => {
    const response = await api.get('/patients/journal/');
    return response.data;
  },

  getJournalEntryById: async (id: number) => {
    const response = await api.get(`/patients/journal/${id}/`);
    return response.data;
  },

  createJournalEntry: async (entryData: {
    title?: string;
    content: string;
    mood?: string;
    tags?: string[];
  }) => {
    const response = await api.post('/patients/journal/', entryData);
    return response.data;
  },

  updateJournalEntry: async (id: number, entryData: any) => {
    const response = await api.put(`/patients/journal/${id}/`, entryData);
    return response.data;
  },

  deleteJournalEntry: async (id: number) => {
    await api.delete(`/patients/journal/${id}/`);
  },

  // Relaxation content
  getRelaxationContent: async () => {
    const response = await api.get('/patients/relaxation/content/');
    return response.data;
  },

  getRelaxationContentById: async (id: number) => {
    const response = await api.get(`/patients/relaxation/content/${id}/`);
    return response.data;
  },

  getRelaxationTips: async () => {
    const response = await api.get('/patients/relaxation/tips/');
    return response.data;
  },

  // Goals
  getGoals: async () => {
    const response = await api.get('/patients/goals/');
    return response.data;
  },

  getGoalById: async (id: number) => {
    const response = await api.get(`/patients/goals/${id}/`);
    return response.data;
  },

  createGoal: async (goalData: {
    title: string;
    description?: string;
    target_date?: string;
    category?: string;
  }) => {
    const response = await api.post('/patients/goals/', goalData);
    return response.data;
  },

  updateGoal: async (id: number, goalData: any) => {
    const response = await api.put(`/patients/goals/${id}/`, goalData);
    return response.data;
  },

  deleteGoal: async (id: number) => {
    await api.delete(`/patients/goals/${id}/`);
  },

  markGoalComplete: async (id: number) => {
    const response = await api.post(`/patients/goals/${id}/complete/`);
    return response.data;
  },

  // Notifications
  getNotifications: async () => {
    const response = await api.get('/patients/notifications/');
    return response.data;
  },

  markNotificationRead: async (id: number) => {
    const response = await api.post(`/patients/notifications/${id}/mark_read/`);
    return response.data;
  },

  markAllNotificationsRead: async () => {
    const response = await api.post('/patients/notifications/mark_all_read/');
    return response.data;
  },

  // Notification preferences
  getNotificationPreferences: async () => {
    const response = await api.get('/patients/notifications/preferences/');
    return response.data;
  },

  updateNotificationPreferences: async (preferences: any) => {
    const response = await api.put('/patients/notifications/preferences/', preferences);
    return response.data;
  },

  // Emotional insights (AI-powered)
  getEmotionalInsights: async () => {
    const response = await api.get('/patients/emotional-insights/');
    return response.data;
  },

  // Inspiration
  getDailyInspiration: async () => {
    const response = await api.get('/patients/inspiration/daily/');
    return response.data;
  },

  getRandomInspiration: async () => {
    const response = await api.get('/patients/inspiration/random/');
    return response.data;
  },
};

export default patientService;
