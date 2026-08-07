import axios from 'axios';
import { getApiBaseUrl } from './domain';

const baseURL = getApiBaseUrl();

const client = axios.create({
  baseURL: import.meta.env.VITE_REPORTING_API_BASE || `${baseURL}/api/reporting`,
  timeout: 10_000,
});

// Attach token from sessionStorage to every request
client.interceptors.request.use(config => {
  const token = sessionStorage.getItem('reporting_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
client.interceptors.response.use(res => res, err => {
  if (err.response?.status === 401) {
    sessionStorage.removeItem('reporting_token');
    window.location.href = '/login';
  }
  return Promise.reject(err);
});

export const reportingLogin = (email: string, password: string) =>
  client.post('/auth/login', { email, password }).then(r => r.data);

export const reportingAcceptInvite = (token: string, password: string, displayName: string) =>
  client.post('/auth/accept', { token, password, displayName }).then(r => r.data);

export const reportingForgotPassword = (email: string) =>
  client.post('/auth/forgot-password', { email }).then(r => r.data);

export const reportingResetPassword = (token: string, password: string) =>
  client.post('/auth/reset-password', { token, password }).then(r => r.data);

export const fetchReportingDashboard = () =>
  client.get('/dashboard').then(r => r.data);

export const fetchCohortRepayment = (query?: string) =>
  client.get(`/analytics/cohort-repayment${query ? `?${query}` : ''}`).then(r => r.data);
