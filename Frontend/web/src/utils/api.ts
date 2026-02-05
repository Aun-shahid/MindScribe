// // // src/utils/api.ts
// // import axios from 'axios';
// // import { backendUrl } from '../config';

// // // Create axios instance with base configuration
// // const api = axios.create({
// //   baseURL: `${backendUrl}/api`, // Using backendUrl from config
// //   headers: {
// //     'Content-Type': 'application/json',
// //   },
// // });

// // // Request interceptor to add auth token
// // api.interceptors.request.use(
// //   (config) => {
// //     const token = localStorage.getItem('access_token');
// //     if (token) {
// //       config.headers.Authorization = `Bearer ${token}`;
// //     }
// //     return config;
// //   },
// //   (error) => {
// //     return Promise.reject(error);
// //   }
// // );

// // // Response interceptor to handle token refresh
// // api.interceptors.response.use(
// //   (response) => response,
// //   async (error) => {
// //     const originalRequest = error.config;

// //     // Handle 401 Unauthorized (token expired)
// //     if (error.response?.status === 401 && !originalRequest._retry) {
// //       originalRequest._retry = true;

// //       try {
// //         const refreshToken = localStorage.getItem('refresh_token');
// //         if (refreshToken) {
// //           const response = await axios.post(`${backendUrl}/api/authenticator/token/refresh/`, {
// //             refresh: refreshToken,
// //           });

// //           const { access, refresh } = response.data;
// //           localStorage.setItem('access_token', access);
// //           localStorage.setItem('refresh_token', refresh);

// //           // Retry the original request with new token
// //           originalRequest.headers.Authorization = `Bearer ${access}`;
// //           return api(originalRequest);
// //         }
// //       } catch (refreshError) {
// //         // Refresh failed, redirect to login
// //         localStorage.removeItem('access_token');
// //         localStorage.removeItem('refresh_token');
// //         window.location.href = '/login';
// //         return Promise.reject(refreshError);
// //       }
// //     }

// //     return Promise.reject(error);
// //   }
// // );

// // export default api;













// import axios from 'axios';

// const api = axios.create({
//   baseURL: 'https://mindscribe-backend-production-ca1e.up.railway.app/api',  // Production backend
//   headers: {
//     'Content-Type': 'application/json',
//   },
//   withCredentials: true,
// });

// // Request interceptor to add auth token
// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('access_token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// // Response interceptor for handling token refresh
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;

//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;

//       try {
//         const refreshToken = localStorage.getItem('refresh_token');
//         const response = await axios.post(
//           'https://mindscribe-backend-production-ca1e.up.railway.app/api/authenticator/token/refresh/',
//           { refresh: refreshToken }
//         );

//         const { access } = response.data;
//         localStorage.setItem('access_token', access);

//         originalRequest.headers.Authorization = `Bearer ${access}`;
//         return api(originalRequest);
//       } catch (refreshError) {
//         localStorage.removeItem('access_token');
//         localStorage.removeItem('refresh_token');
//         window.location.href = '/login';
//         return Promise.reject(refreshError);
//       }
//     }

//     return Promise.reject(error);
//   }
// );

// export default api;








//loclsoa backned

// src/utils/api.ts
import axios from 'axios';
import { backendUrl } from '../config';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: `${backendUrl}/api`, // Using backendUrl from config
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${backendUrl}/api/authenticator/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access, refresh } = response.data;
          localStorage.setItem('access_token', access);
          localStorage.setItem('refresh_token', refresh);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;