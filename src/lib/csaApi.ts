import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';

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
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default csaApi;
