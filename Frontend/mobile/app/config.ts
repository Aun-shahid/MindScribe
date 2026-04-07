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

const isPrivateNetworkUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        const host = (parsed.hostname || '').toLowerCase();

        if (!host) return false;

        if (host === 'localhost' || host.endsWith('.local')) return true;

        if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
            const parts = host.split('.').map((n) => Number(n));
            const [a, b] = parts;
            if (a === 10 || a === 127) return true;
            if (a === 192 && b === 168) return true;
            if (a === 172 && b >= 16 && b <= 31) return true;
        }

        return false;
    } catch {
        return false;
    }
};

const getDefaultBackendUrl = (): string => {
    // Always return production URL since backend is deployed
    return PRODUCTION_BACKEND_URL;
};

const getResolvedBackendUrl = (): string => {
    const configured = getEnvironmentVar('BACKEND_URL');

    if (!configured) {
        return getDefaultBackendUrl();
    }

    return (isLoopbackOrEmulatorUrl(configured) || isPrivateNetworkUrl(configured))
        ? PRODUCTION_BACKEND_URL
        : configured;
};

export const BASE_URL = getResolvedBackendUrl();
const ExpoRouterStubScreen = () => null;
export default ExpoRouterStubScreen;

