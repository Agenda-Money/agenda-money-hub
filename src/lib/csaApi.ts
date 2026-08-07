import axios from 'axios';
import { getSubdomain, getApiBaseUrl } from './domain';

const baseURL = getApiBaseUrl();

const csaApi = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

csaApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('csa_accessToken');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

csaApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const sub = getSubdomain();

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('csa_refreshToken');
      
      if (refreshToken) {
        try {
          const res = await axios.post(`${baseURL}/api/csa/auth/refresh-token`, { refreshToken });
          const { accessToken } = res.data;
          localStorage.setItem('csa_accessToken', accessToken);
          original.headers['Authorization'] = `Bearer ${accessToken}`;
          return csaApi(original);
        } catch {
          localStorage.removeItem('csa_accessToken');
          localStorage.removeItem('csa_refreshToken');
          
          // Only redirect if we are on the collections subdomain
          // Admins using CSA components should NOT be redirected
          if (sub === 'collections' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } else {
         localStorage.removeItem('csa_accessToken');
         if (sub === 'collections' && window.location.pathname !== '/login') {
           window.location.href = '/login';
         }
      }
    }
    return Promise.reject(error);
  },
);

export default csaApi;
