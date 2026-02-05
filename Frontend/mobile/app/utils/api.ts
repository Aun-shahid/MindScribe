// app/utils/api.ts
//local
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

// Log the base URL being used
console.log(`[API Config] Base URL: ${BASE_URL}`);

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 10000,
});

// Request interceptor to add auth token and log requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Log the full URL being called
  const fullUrl = `${config.baseURL}${config.url}`;
  console.log(`[API Request] ${config.method?.toUpperCase()} ${fullUrl}`);
  if (config.data) {
    console.log(`[API Request Data]`, config.data);
  }
  
  return config;
});

// Response interceptor to handle token refresh and log responses
api.interceptors.response.use(
  (response) => {
    // Log successful responses
    const fullUrl = `${response.config.baseURL}${response.config.url}`;
    console.log(`[API Response] ${response.status} ${fullUrl}`);
    return response;
  },
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
        const refreshUrl = `${BASE_URL}/api/authenticator/token/refresh/`;
        console.log(`[API Token Refresh] POST ${refreshUrl}`);
        const response = await axios.post(refreshUrl, {
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

    // Log error responses
    if (error.response) {
      const fullUrl = `${error.config?.baseURL}${error.config?.url}`;
      console.log(`[API Error] ${error.response.status} ${fullUrl}`, error.response.data);
    } else {
      console.log(`[API Network Error]`, error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;












//deplloyed



// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { BASE_URL } from '../config';

// // Log the base URL being used
// console.log(`[API Config] Base URL: ${BASE_URL}`);

// const api = axios.create({
//   baseURL: `${BASE_URL}/api`,
//   timeout: 10000,
// });

// // Request interceptor to add auth token and log requests
// api.interceptors.request.use(async (config) => {
//   const token = await AsyncStorage.getItem('access_token');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
  
//   // Log the full URL being called
//   const fullUrl = `${config.baseURL}${config.url}`;
//   console.log(`[API Request] ${config.method?.toUpperCase()} ${fullUrl}`);
//   if (config.data) {
//     console.log(`[API Request Data]`, config.data);
//   }
  
//   return config;
// });

// // Response interceptor to handle token refresh and log responses
// api.interceptors.response.use(
//   (response) => {
//     // Log successful responses
//     const fullUrl = `${response.config.baseURL}${response.config.url}`;
//     console.log(`[API Response] ${response.status} ${fullUrl}`);
//     return response;
//   },
//   async (error) => {
//     const originalRequest = error.config;

//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;

//       const refresh = await AsyncStorage.getItem('refresh_token');
//       if (!refresh) {
//         // Clear tokens and redirect to login
//         await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
//         return Promise.reject(error);
//       }

//       try {
//         const refreshUrl = `${BASE_URL}/api/authenticator/token/refresh/`;
//         console.log(`[API Token Refresh] POST ${refreshUrl}`);
//         const response = await axios.post(refreshUrl, {
//           refresh,
//         });

//         const { access, refresh: newRefresh } = response.data;
//         await AsyncStorage.setItem('access_token', access);
//         await AsyncStorage.setItem('refresh_token', newRefresh);

//         originalRequest.headers.Authorization = `Bearer ${access}`;
//         return api(originalRequest);
//       } catch (refreshError) {
//         // Clear tokens and redirect to login
//         await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
//         return Promise.reject(refreshError);
//       }
//     }

//     // Log error responses
//     if (error.response) {
//       const fullUrl = `${error.config?.baseURL}${error.config?.url}`;
//       console.log(`[API Error] ${error.response.status} ${fullUrl}`, error.response.data);
//     } else {
//       console.log(`[API Network Error]`, error.message);
//     }
    
//     return Promise.reject(error);
//   }
// );

// export default api;