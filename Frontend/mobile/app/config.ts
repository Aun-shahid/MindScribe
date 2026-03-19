
// // depdloyed

// // // app/config.ts
// import Constants from 'expo-constants';
// import { Platform } from 'react-native';

// const getEnvironmentVar = (key: string): string => {
//     const value = Constants.expoConfig?.extra?.[key] || process.env[key];
//     if (!value) {
//         console.warn(`Environment variable ${key} is not defined`);
//         return '';
//     }
//     return value;
// };

// // For Android emulator, localhost needs to be 10.0.2.2
// const getDefaultBackendUrl = () => {
//   if (Platform.OS === 'android') {
//     return 'http://10.0.2.2:8000';
//     // return 'https://192.168.100.118:8000';

//   }
//   return 'http://localhost:8000';
// };
// export const BASE_URL = 'https://mindscribe-backend-production-ca1e.up.railway.app';
// // export const BASE_URL = getEnvironmentVar('BACKEND_URL') || getDefaultBackendUrl();
// // export const BASE_URL = 'http://192.168.100.118:8000';





//local backend
// // app/config.ts
import Constants from 'expo-constants';

const getEnvironmentVar = (key: string): string => {
    const value = Constants.expoConfig?.extra?.[key] || process.env[key];
    if (!value) {
        console.warn(`Environment variable ${key} is not defined`);
        return '';
    }
    return value;
};

// export const BASE_URL = getEnvironmentVar('BACKEND_URL') || 'http://localhost:8000';
export const BASE_URL = 'http://192.168.100.118:8000';