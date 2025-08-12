// app/utils/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

const api = axios.create({
  baseURL: `${BASE_URL}/api/`,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refresh = await AsyncStorage.getItem('refresh_token');
      if (!refresh) {
        // Clear tokens and redirect to login
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${BASE_URL}/api/authenticator/token/refresh/`, {
          refresh,
        });

        const { access, refresh: newRefresh } = response.data;
        await AsyncStorage.setItem('access_token', access);
        await AsyncStorage.setItem('refresh_token', newRefresh);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Clear tokens and redirect to login
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
