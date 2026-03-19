import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PRODUCTION_BACKEND_URL = 'https://mindscribe-backend-production-ca1e.up.railway.app';

const getEnvironmentVar = (key: string): string => {
    const value = Constants.expoConfig?.extra?.[key] || process.env[key];
    if (!value) {
        return '';
    }
    return String(value);
};

const isLoopbackOrEmulatorUrl = (url: string): boolean => {
    const lowered = (url || '').toLowerCase();
    return (
        lowered.includes('localhost') ||
        lowered.includes('127.0.0.1') ||
        lowered.includes('10.0.2.2')
    );
};

const getDefaultBackendUrl = (): string => {
    if (__DEV__) {
        return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
    }
    return PRODUCTION_BACKEND_URL;
};

const getResolvedBackendUrl = (): string => {
    const configured = getEnvironmentVar('BACKEND_URL');

    if (!configured) {
        return getDefaultBackendUrl();
    }

    if (__DEV__) {
        return configured;
    }

    return isLoopbackOrEmulatorUrl(configured) ? PRODUCTION_BACKEND_URL : configured;
};

export const BASE_URL = getResolvedBackendUrl();