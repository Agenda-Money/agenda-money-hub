import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    // Check for both admin token and applicant token
    const adminToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    const applicantToken = sessionStorage.getItem('agenda_token');
    const token = adminToken || applicantToken;
    const hasAuthHeader = Object.keys(config.headers || {}).some(
      (key) => key.toLowerCase() === 'authorization'
    );
    if (token && !hasAuthHeader) {
      config.headers['Authorization'] = `Bearer ${token}`;
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
      // Remove both tokens to support both authentication flows
      localStorage.removeItem('token');
      localStorage.removeItem('token_expiry');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('agenda_token');
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
