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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('expiresAt');
      localStorage.removeItem('token');
      localStorage.removeItem('token_expiry');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('agenda_token');
      
      // Delay redirect slightly so the user can read the toast, although the full reload might clear it.
      // Crucial: Don't redirect if we are already on the login page
      if (window.location.pathname !== "/login") {
        setTimeout(() => {
          window.location.href = "/login";
        }, 4000);
      }
    }
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


export const getUserRewardsSummary = async () => {
  const response = await api.get('/api/users/rewards/summary');
  return response.data;
};

export const getUserRewardsHistory = async (page = 1, limit = 20) => {
  const response = await api.get('/api/users/rewards/history', { params: { page, limit } });
  return response.data;
};

export const requestRewardPayout = async () => {
  const response = await api.post('/api/users/rewards/payout');
  return response.data;
};

export const getUserNetworkSummary = async () => {
  const response = await api.get('/api/users/network/summary');
  return response.data;
};

export const getPendingEndorsements = async () => {
  const response = await api.get('/api/users/pending-endorsements');
  return response.data;
};

export const approveEndorsement = async (loanId: string) => {
  const response = await api.post(`/api/users/endorsements/${loanId}/approve`);
  return response.data;
};

export const rejectEndorsement = async (loanId: string, reason?: string) => {
  const payload = reason ? { reason } : {};
  const response = await api.post(`/api/users/endorsements/${loanId}/reject`, payload);
  return response.data;
};

export const getUserRepaymentsHistory = async () => {
  const response = await api.get('/api/repayments/history');
  return response.data;
};

// --- Agent API ---

export const getAgentCommissionSummary = async () => {
  const response = await api.get('/api/agents/commissions/summary');
  return response.data;
};

export const getAgentCommissions = async (params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) => {
  const response = await api.get('/api/agents/commissions', { params });
  return response.data;
};

export const getAgentNetworkSummary = async () => {
  const response = await api.get('/api/agents/network/summary');
  return response.data;
};

export const getAgentReferrals = async () => {
  const response = await api.get('/api/agents/referrals');
  return response.data;
};

export const requestAgentRewardPayout = async () => {
  const response = await api.post('/api/agents/commissions/payout');
  return response.data;
};

export const getAgentMyStats = async () => {
  const response = await api.get('/api/agents/my-stats');
  return response.data;
};

export const getAgentPendingEndorsements = async () => {
  const response = await api.get('/api/agents/pending-endorsements');
  return response.data;
};

export const getAgentPortfolio = async (params?: any) => {
  const response = await api.get('/api/agents/portfolio', { params });
  return response.data;
};

// --- Admin API ---

export const getAdminPayoutRequests = async (params?: any) => {
  const response = await api.get('/api/admin/payouts', { params });
  return response.data;
};

export const approveAdminPayoutRequest = async (id: string) => {
  const response = await api.post(`/api/admin/payouts/${id}/approve`);
  return response.data;
};

export const rejectAdminPayoutRequest = async (id: string, reason: string) => {
  const response = await api.post(`/api/admin/payouts/${id}/reject`, { reason });
  return response.data;
};

export const markAdminPayoutPaid = async (id: string, reference?: string) => {
  const response = await api.post(`/api/admin/payouts/${id}/mark-paid`, { reference });
  return response.data;
};

export const getAdminAnalytics = async (params?: any) => {
  const response = await api.get('/api/admin/analytics', { params });
  return response.data;
};

export const getAdminRepaymentChannels = async () => {
  const response = await api.get('/api/admin/repayment-analytics/channels');
  return response.data;
};

export const getAdminAgents = async (params?: any) => {
  const response = await api.get('/api/admin/agents', { params });
  return response.data;
};

export const getPendingAgentApplications = async () => {
  const response = await api.get('/api/admin/agents/pending');
  return response.data;
};

export const getAdminPendingApprovals = async () => {
  const response = await api.get('/api/admin/dashboard/pending-approvals');
  return response.data;
};

export const getAdminRecentLoans = async () => {
  const response = await api.get('/api/admin/dashboard/recent-loans');
  return response.data;
};

export const approveAgentApplication = async (agentId: string) => {
  const response = await api.patch(`/api/admin/agents/${agentId}/approve`);
  return response.data;
};

export const rejectAgentApplication = async (agentId: string, reason: string) => {
  const response = await api.patch(`/api/admin/agents/${agentId}/reject`, { reason });
  return response.data;
};

export const getAdminAgentPortfolio = async (nodeCode: string, params?: any) => {
  const response = await api.get(`/api/admin/agents/${nodeCode}/portfolio`, { params });
  return response.data;
};

export const getAdminAgentCommissions = async (id: string, params?: any) => {
  const response = await api.get(`/api/admin/agents/${id}/commissions`, { params });
  return response.data;
};

export const getAdminDashboardStats = async () => {
  const response = await api.get('/api/admin/dashboard/stats');
  return response.data;
};

export const getAdminLoans = async (params?: any) => {
  const response = await api.get('/api/admin/loans', { params });
  return response.data;
};

export const approveLoan = async (id: string) => {
  const response = await api.post(`/api/admin/loans/${id}/approve`);
  return response.data;
};

export const rejectLoan = async (id: string) => {
  const response = await api.post(`/api/admin/loans/${id}/reject`);
  return response.data;
};

export const syncLoanTransfer = async (loanId: string) => {
  const response = await api.post(`/api/payments/paystack/sync-transfer`, { loanId });
  return response.data;
};

export const getAdminUserProfile = async (userId: string) => {
  const response = await api.get(`/api/admin/users/profile/${userId}`);
  return response.data;
};

export const getRecentRepayments = async (params?: { period?: string; limit?: number }) => {
  const response = await api.get('/api/admin/repayments/recent', { params });
  return response.data;
};

export const recordManualRepayment = async (data: { msisdn: string; amount: number; method: string; reference: string; notes?: string }) => {
  const response = await api.post('/api/admin/repayments/record', data);
  return response.data;
};

export const getAdminUsers = async (params?: any) => {
  const response = await api.get('/api/admin/users', { params });
  return response.data;
};

export const getPendingKycUsers = async (limit: number = 1000) => {
  const response = await api.get('/api/admin/users/pending', { params: { limit } });
  return response.data;
};

export const blockUser = async (userId: string) => {
  const response = await api.patch(`/api/admin/users/block/${userId}`);
  return response.data;
};

export const unblockUser = async (userId: string) => {
  const response = await api.patch(`/api/admin/users/unblock/${userId}`);
  return response.data;
};

export const approveUserKyc = async (userId: string) => {
  const response = await api.patch(`/api/admin/users/approve/${userId}`);
  return response.data;
};

export const rejectUserKyc = async (userId: string) => {
  const response = await api.patch(`/api/admin/users/reject/${userId}`);
  return response.data;
};

export const getKycSignedUrl = async (userId: string, imageType: string) => {
  const response = await api.get(`/api/admin/kyc/signed-url`, {
    params: { userId, type: imageType }
  });
  return response.data;
};

export const getUserActiveLoan = async (phone: string) => {
  const response = await api.get(`/api/loans/active/${phone}`);
  return response.data;
};

export const getAdminAgentDetails = async (id: string) => {
  const response = await api.get(`/api/admin/agents/${id}`);
  return response.data;
};

export default api;
