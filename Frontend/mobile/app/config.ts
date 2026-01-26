// app/config.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getEnvironmentVar = (key: string): string => {
    const value = Constants.expoConfig?.extra?.[key] || process.env[key];
    if (!value) {
        console.warn(`Environment variable ${key} is not defined`);
        return '';
    }
    return value;
};

// For Android emulator, localhost needs to be 10.0.2.2
const getDefaultBackendUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
};

export const BASE_URL = getEnvironmentVar('BACKEND_URL') || getDefaultBackendUrl();