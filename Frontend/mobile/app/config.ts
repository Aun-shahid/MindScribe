// app/config.ts
import Constants from 'expo-constants';

const getEnvironmentVar = (key: string): string => {
    const value = Constants.expoConfig?.extra?.[key] || process.env[key];
    if (!value) {
        console.warn(`Environment variable ${key} is not defined`);
        return '';
    }
    return value;
};

export const BASE_URL = getEnvironmentVar('BACKEND_URL') || 'http://localhost:8000';