import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('agenda_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized
    // Don't redirect on login failure (which is also a 401)
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes("/auth/login")) {
      localStorage.removeItem('agenda_token');
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const initiateRepayment = async (amount: number, msisdn: string) => {
  const response = await api.post('/api/repayments/initiate', { amount, msisdn });
  return response.data;
};

export const getMe = async () => {
    const response = await api.get('/api/users/me');
    return response.data;
};

export default api;
