import csaApi from './csaApi';
import api from './api';

export interface AgentActivitySummary {
  _id: string;
  name: string;
  phoneNumber: string;
  email: string;
  totalActivities: number;
  outcomes: {
    answered: number;
    noAnswer: number;
    numberOff: number;
    promisedToPay: number;
    wrongNumber: number;
    thirdParty: number;
    partialPayment?: number;
    notReachable?: number;
    messageDelivered?: number;
    other: number;
  };
  conversionRate: number;
  successfulCollections: number;
  lastActiveAt: string;
}

export interface ActivityFeedItem {
  _id: string;
  type: 'CALL' | 'SMS';
  outcome: string;
  borrowerName: string;
  borrowerPhone: string;
  loanReference: string;
  loanAmount: number;
  createdAt: string;
  notes?: string;
  promiseDetails?: {
    promiseDate: string;
    promiseAmount: number;
  };
  smsBody?: string;
}

export const getTeamActivityOverview = async (dateFrom?: string, dateTo?: string) => {
  const res = await csaApi.get('/api/csa/collections/agents/activity-overview', {
    params: { dateFrom, dateTo }
  });
  return res.data;
};

export const getAgentActivityFeed = async (agentId: string, params?: { type?: string; page?: number; limit?: number; dateFrom?: string; dateTo?: string }) => {
  const res = await csaApi.get(`/api/csa/collections/agents/${agentId}/activity-feed`, {
    params
  });
  return res.data;
};

// Admin Dashboard Endpoints
export const getAdminTeamOverview = async (dateFrom?: string, dateTo?: string) => {
  const res = await api.get('/api/admin/collections/team-activity/overview', {
    params: { dateFrom, dateTo }
  });
  return res.data;
};

export const getAdminAgentActivityFeed = async (agentId: string, params?: { type?: string; page?: number; limit?: number; dateFrom?: string; dateTo?: string }) => {
  // agentId can be "all" for the combined feed
  const res = await api.get(`/api/admin/collections/team-activity/feed/${agentId}`, {
    params
  });
  return res.data;
};

export const promoteCsaRole = async (agentId: string, role: 'agent' | 'supervisor' | 'manager') => {
  const res = await api.patch(`/api/admin/csa/${agentId}/set-role`, { role });
  return res.data;
};
