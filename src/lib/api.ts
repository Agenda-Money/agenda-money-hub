import axios from 'axios';
import { toast } from 'sonner';

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
      
      const errorMessage = error.response?.data?.message?.toLowerCase() || '';
      
      // Show specific messages based on backend response
      if (errorMessage.includes('admin session expired')) {
        toast.error('Session Expired', { description: 'Your Admin session has expired. Please log in again.' });
      } else if (errorMessage.includes('agent session expired')) {
        toast.error('Session Expired', { description: 'Your Agent session has expired. Please log in again.' });
      } else {
        toast.error('Session Expired', { description: 'Your session has expired. Please log in again.' });
      }

      // Remove both tokens to support both authentication flows
      localStorage.removeItem('token');
      localStorage.removeItem('token_expiry');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('agenda_token');
      
      // Delay redirect slightly so the user can read the toast, although the full reload might clear it.
      // Alternatively, we could just rely on the router to redirect, but since we are clearing storage here:
      setTimeout(() => {
        window.location.href = "/login";
      }, 4000);
    }
    return Promise.reject(error);
  }
);

type InitiateRepaymentResponse = {
  authorizationUrl?: string;
  [key: string]: any;
};

const extractAuthorizationUrl = (payload: any): string | undefined => {
  if (!payload || typeof payload !== 'object') return undefined;

  return (
    payload.authorizationUrl ||
    payload.authorization_url ||
    payload?.data?.authorizationUrl ||
    payload?.data?.authorization_url ||
    payload?.result?.authorizationUrl ||
    payload?.result?.authorization_url
  );
};

export const initiateRepayment = async (amount: number): Promise<InitiateRepaymentResponse> => {
  const response = await api.post('/api/repayments/initiate', { amount });
  const payload = response.data;
  const authorizationUrl = extractAuthorizationUrl(payload);

  if (authorizationUrl) {
    return {
      ...payload,
      authorizationUrl,
    };
  }

  return payload;
};

export const getMe = async () => {
    const response = await api.get('/api/users/me');
    return response.data;
};

export const getUserLoansHistory = async () => {
    const response = await api.get('/api/loans/history');
    return response.data;
};

export const getUserRepaymentsHistory = async () => {
    const response = await api.get('/api/repayments/history');
    return response.data;
};

export default api;
