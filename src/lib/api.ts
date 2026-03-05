import axios from 'axios';
import { toast } from 'sonner';
import { tokenRefreshService } from '@/services/tokenRefreshService';

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
    const adminToken = localStorage.getItem('accessToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
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
    // Don't refresh on login failure or if we've already tried identifying it as a retry
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes("/auth/login")) {
      originalRequest._retry = true;
      
      console.log('[API Interceptor] 401 detected, attempting reactive refresh...');
      const newToken = await tokenRefreshService.refreshAccessToken();
      
      if (newToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // If we reach here, refresh failed
      const errorMessage = error.response?.data?.message?.toLowerCase() || '';
      
      if (errorMessage.includes('admin session expired')) {
        toast.error('Session Expired', { description: 'Your Admin session has expired. Please log in again.' });
      } else if (errorMessage.includes('agent session expired')) {
        toast.error('Session Expired', { description: 'Your Agent session has expired. Please log in again.' });
      } else {
        toast.error('Session Expired', { description: 'Your session has expired. Please log in again.' });
      }

      // Clear all auth state
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('expiresAt');
      localStorage.removeItem('user');
      
      // Legacy keys cleanup
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expires_at');
      localStorage.removeItem('token_expiry');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('agenda_token');
      
      // Delay redirect slightly so the user can read the toast
      setTimeout(() => {
        window.location.href = "/login";
      }, 3000);
    }
    
    // Do not auto-logout on 404/500 per instructions; only 401/403 (handled 401 here)
    return Promise.reject(error);
  }
);

export const initiateRepayment = async (amount: number) => {
  const response = await api.post('/api/repayments/initiate', { amount });
  return response.data;
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

export const getUserRewardsSummary = async () => {
    const response = await api.get('/api/users/rewards');
    return response.data;
};

export const getUserRewardsHistory = async (page = 1, limit = 20) => {
    const response = await api.get(`/api/users/rewards/history?page=${page}&limit=${limit}`);
    return response.data;
};

export const requestRewardPayout = async () => {
    const response = await api.post('/api/users/rewards/payout');
    return response.data;
};

export const getUserNetworkSummary = async () => {
    const response = await api.get('/api/users/network');
    return response.data;
};

// Agent Network & Rewards
export const getAgentNetworkSummary = async () => {
    const response = await api.get('/api/agents/network');
    return response.data;
};

export const getAgentReferrals = async () => {
    const response = await api.get('/api/agents/referrals');
    return response.data;
};

export const getAgentRewardsSummary = async () => {
    const response = await api.get('/api/agents/rewards');
    return response.data;
};

export const getAgentRewardsHistory = async (page = 1, limit = 20) => {
    const response = await api.get(`/api/agents/rewards/history?page=${page}&limit=${limit}`);
    return response.data;
};

export const requestAgentRewardPayout = async () => {
    const response = await api.post('/api/agents/rewards/payout');
    return response.data;
};

export default api;
