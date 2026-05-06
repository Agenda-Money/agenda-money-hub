import axios from 'axios';
import { toast } from 'sonner';
import { ManualDisbursementRequest } from "@/types/disbursement";

export interface DecisionError {
  uiState: 'soft_block' | 'hard_block' | 'hard_block_date' | 'cap_state' | 'blacklisted';
  reasonCode: string;
  displayDate?: string;
  unusedDays?: number;
  capAmount?: number;
  message: string;
  isDecision: boolean; // Flag to easily identify parsed decision errors
}

export const parseDecisionError = (error: any): DecisionError | null => {
  if (!error.response?.data) return null;
  const data = error.response.data;
  const code = data.errorCode || data.code || data.reasonCode || '';
  const message = data.message || "Your application could not be processed at this time.";
  
  switch (code) {
    case 'COOLING_OFF_HIGHER':
      return { uiState: 'soft_block', reasonCode: code, message, isDecision: true, capAmount: data.capAmount, unusedDays: data.unusedDays };
    case 'ROLLING_WINDOW_LIMIT':
      return { uiState: 'hard_block', reasonCode: code, message, isDecision: true, displayDate: data.displayDate || data.availableDate };
    case 'SHORT_TENOR_COOLDOWN':
      return { uiState: 'hard_block_date', reasonCode: code, message, isDecision: true, displayDate: data.displayDate || data.nextDate };
    case 'TIER_CAPPED':
      return { uiState: 'cap_state', reasonCode: code, message, isDecision: true, capAmount: data.capAmount || data.approvedAmount };
    case 'BLACKLISTED_TEMP':
    case 'BLACKLISTED_PERMANENT':
      return { uiState: 'blacklisted', reasonCode: code, message, isDecision: true, displayDate: data.displayDate || data.endDate };
    default:
      if (error.response.status === 409 || code === 'ACTIVE_LOAN_EXISTS') {
         return { uiState: 'hard_block', reasonCode: 'ACTIVE_LOAN_EXISTS', message: "You already have an active loan. Please repay it to apply for another.", isDecision: true };
      }
      // If none matched, return null
      return null;
  }
};

// Helper to generate a unique request ID
const generateId = () => Math.random().toString(36).substring(2, 15);
// Helper to generate a UUID for idempotency
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Create axios instance with base URL
const baseURL = import.meta.env.VITE_API_URL || '';

if (!baseURL) {
  // This will help diagnose missing env var in production builds — check browser console/network
  // Vite inlines `import.meta.env` at build time so this value is baked into the bundle.
  // Keep the warning; remove in production if you prefer silence.
  // eslint-disable-next-line no-console
  console.warn('VITE_API_URL is not set. API requests will be sent to the same origin.');
}

const api = axios.create({
  baseURL,
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

    // Add unique request tracking and idempotency for write operations
    if (['post', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
      if (!config.headers['x-request-id']) {
        config.headers['x-request-id'] = generateId();
      }
      if (!config.headers['Idempotency-Key']) {
        config.headers['Idempotency-Key'] = generateUUID();
      }
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
      } else if (error.response?.status === 403) {
        toast.error('Not permitted', { description: 'You have view-only access. This action is restricted.' });
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
  const response = await api.post('/api/agents/rewards/payout');
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

export const getAgentDuePayments = async () => {
  const response = await api.get('/api/agents/due-payments');
  return response.data;
};

// --- Admin API ---

export const getAdminPayoutRequests = async (params?: any) => {
  const response = await api.get('/api/admin/payouts', { params });
  return response.data;
};

export const approveAdminPayoutRequest = async (id: string, reason?: string) => {
  const response = await api.post(`/api/admin/payouts/${id}/approve`, { reason });
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

export const getCohortRepayment = async () => {
  const response = await api.get('/api/analytics/cohort-repayment');
  return response.data;
};

export const getAdminAuditLogs = async (params?: any) => {
  const response = await api.get('/api/admin/audit-logs', { params });
  return response.data;
};

export const getAdminSensitiveAuditLogs = async (params?: any) => {
  const response = await api.get('/api/admin/audit-logs/sensitive', { params });
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

export const approveAgentApplication = async (agentId: string, reason?: string) => {
  const response = await api.patch(`/api/admin/agents/${agentId}/approve`, { reason });
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

export const getAdminDeductions = async (params?: any) => {
  const response = await api.get('/api/admin/commissions/deductions', { params });
  return response.data;
};

export const confirmDeduction = async (id: string) => {
  const response = await api.post(`/api/admin/commissions/deductions/${id}/confirm`);
  return response.data;
};

export const reverseDeduction = async (id: string) => {
  const response = await api.post(`/api/admin/commissions/deductions/${id}/reverse`);
  return response.data;
};

export const createManualDeduction = async (data: any) => {
  const response = await api.post('/api/admin/commissions/manual-deduction', data);
  return response.data;
};

export const revokeFraud = async (borrowerMsisdn: string, reason: string) => {
  const response = await api.post(`/api/admin/commissions/revoke-fraud/${borrowerMsisdn}`, { reason });
  return response.data;
};

export const resolveMomoName = async (id: string) => {
  const response = await api.get(`/api/admin/loans/${id}/resolve-momo`);
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

export const manualDisburseLoan = async (id: string, data: ManualDisbursementRequest, idempotencyKey?: string) => {
  const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
  const response = await api.post(`/api/admin/loans/${id}/manual-disbursement`, data, { headers });
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

export const getRepayments = async (params?: any) => {
  const response = await api.get('/api/admin/repayments', { params });
  return response.data;
};

export const getRecentRepayments = async (params?: { period?: string; limit?: number; source?: string }) => {
  const response = await api.get('/api/admin/repayments/recent', { params });
  return response.data;
};

export const getEligibleLoans = async (msisdn: string) => {
  const response = await api.get('/api/admin/repayments/eligible-loans', { params: { msisdn } });
  return response.data;
};

export const recordManualRepayment = async (data: { msisdn?: string; amount: number; method: string; reference: string; notes?: string; loanReference?: string }) => {
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

export const getFailedKycUsers = async (page: number = 1, limit: number = 1000) => {
  const response = await api.get('/api/admin/users/failed', { params: { page, limit } });
  return response.data;
};

export const getVapidPublicKey = async () => {
  const response = await api.get('/api/admin/notifications/vapidPublicKey');
  return response.data;
};

export const subscribeNotification = async (subscription: any) => {
  const response = await api.post('/api/admin/notifications/subscribe', subscription);
  return response.data;
};

export const unsubscribeNotification = async (payload: { endpoint: string }) => {
  const response = await api.delete('/api/admin/notifications/unsubscribe', { data: payload });
  return response.data;
};

export const blockUser = async (msisdn: string, reason: string) => {
  const response = await api.patch(`/api/admin/users/${msisdn}/block`, { reason });
  return response.data;
};

export const unblockUser = async (msisdn: string, reason?: string) => {
  const response = await api.patch(`/api/admin/users/${msisdn}/unblock`, { reason });
  return response.data;
};

export const verifyUserKyc = async (msisdn: string, reason?: string) => {
  const response = await api.patch(`/api/admin/users/${msisdn}/kyc/verify`, { reason });
  return response.data;
};

export const failUserKyc = async (msisdn: string, reason: string) => {
  const response = await api.patch(`/api/admin/users/${msisdn}/kyc/fail`, { reason });
  return response.data;
};

export const restoreUserKyc = async (msisdn: string, reason?: string) => {
  const response = await api.patch(`/api/admin/users/${msisdn}/kyc/restore`, { reason });
  return response.data;
};

export const editUser = async (msisdn: string, data: any) => {
  const response = await api.patch(`/api/admin/users/${msisdn}/edit`, data);
  return response.data;
};

export const softRejectUserKyc = async (msisdn: string, reason?: string) => {
  // Using the old endpoint per instructions for "Soft reject"
  const response = await api.patch(`/api/admin/users/reject/${msisdn}`, { reason });
  return response.data;
};

export const getKycSignedUrl = async (userId: string, imageType: string) => {
  const response = await api.get(`/api/admin/kyc/signed-url`, {
    params: { userId, type: imageType }
  });
  return response.data;
};

export const getUserActiveLoan = async (phone: string) => {
  const response = await api.get(`/api/admin/loans/active/${phone}`);
  return response.data;
};

export const getUserDetail = async (userId: string) => {
  const response = await api.get(`/api/admin/users/${userId}`);
  return response.data;
};

export const getUserSessions = async (userId: string, page = 1, limit = 20) => {
  const response = await api.get(`/api/admin/users/${userId}/sessions`, { params: { page, limit } });
  return response.data;
};

export const getCollectionActivities = async (params?: { page?: number; limit?: number; loanReference?: string }) => {
  const response = await api.get('/api/admin/collections/activities', { params });
  return response.data;
};

export const getCsaPerformance = async (params?: { agentId?: string; dateFrom?: string; dateTo?: string; windowHours?: number }) => {
  const response = await api.get('/api/admin/analytics/csa-performance', { params });
  return response.data;
};

export const addFlag = async (userId: string, level: string, reason: string) => {
  const response = await api.post(`/api/admin/users/${userId}/flag`, { level, reason });
  return response.data;
};

export const deleteFlag = async (userId: string, flagId: string) => {
  const response = await api.delete(`/api/admin/users/${userId}/flag/${flagId}`);
  return response.data;
};

export const getAdminAgentDetails = async (id: string) => {
  const response = await api.get(`/api/admin/agents/${id}`);
  return response.data;
};

export default api;
