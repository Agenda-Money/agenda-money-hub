import api from '@/lib/api';

const BASE = '/api/admin/direct-debit';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MandateStatus =
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'PAUSED'
  | 'DEBIT_FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'NO_MANDATE';

export type DirectDebitChannel = 'MTN' | 'TELECEL' | 'AT' | 'AIRTEL' | 'BANK' | 'CARD';

export interface DirectDebitConfig {
  enabled: boolean;
  autoSetupOnDisbursement: boolean;
  productId: string;
  merchantId: string;
  defaultDebitTime: string;
  defaultFrequencyType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  triggerDebitStatus: boolean;
  notificationStatus: boolean;
  retryAttempts: number;
  skipFactor: number;
  daysToDebitDayNotice: string[];
  updatedBy?: string;
  updatedAt?: string;
}

export interface DirectDebitMandate {
  _id: string;
  msisdn: string;
  debitAccount: string;
  channel: DirectDebitChannel;
  mandateId?: string;
  subscriptionId?: string;
  status: MandateStatus;
  currentLoanReference?: string;
  currentDebitAmount?: number;
  currentStartDate?: string;
  currentEndDate?: string;
  currentDebitDay?: string;
  currentReferenceNo?: string;
  retryCount: number;
  totalDebitsSuccessful: number;
  totalDebitsFailed: number;
  lastDebitAt?: string;
  lastDebitAmount?: number;
  lastDebitStatus?: string;
  lastDebitTransactionId?: string;
  lastDebitResponseCode?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  pausedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DirectDebitStats {
  mandates: {
    total: number;
    active: number;
    pendingApproval: number;
    paused: number;
    debitFailed: number;
    cancelled: number;
    expired: number;
  };
  debits: {
    totalSuccessful: number;
    totalFailed: number;
    successRate: number | null;
  };
}

export interface DelinquentCustomer {
  loanId: string;
  loanReference: string;
  userMsisdn: string;
  network: string;
  principal: number;
  totalPayable: number;
  amountRepaid: number;
  outstanding: number;
  dueDate: string;
  status: string;
  daysOverdue: number;
  borrowerName: string;
  region?: string;
  mandateStatus: MandateStatus;
  mandateId?: string;
  mandateLastDebitStatus?: string;
  mandateLastDebitAt?: string;
  mandateRetryCount?: number;
}

export interface MandateListResponse {
  success: boolean;
  data: DirectDebitMandate[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface DelinquentListResponse {
  success: boolean;
  data: DelinquentCustomer[];
  pagination: { page: number; limit: number; total: number; pages: number };
  summary: { noMandate: number; debitFailed: number; pendingApproval: number; active: number };
}

// ── Config ─────────────────────────────────────────────────────────────────────

export async function getDirectDebitConfig(): Promise<DirectDebitConfig> {
  const res = await api.get(`${BASE}/config`);
  return res.data.data;
}

export async function updateDirectDebitConfig(
  updates: Partial<DirectDebitConfig>,
): Promise<DirectDebitConfig> {
  const res = await api.put(`${BASE}/config`, updates);
  return res.data.data;
}

// ── Stats ──────────────────────────────────────────────────────────────────────

export async function getDirectDebitStats(): Promise<DirectDebitStats> {
  const res = await api.get(`${BASE}/stats`);
  return res.data.data;
}

// ── Mandates ───────────────────────────────────────────────────────────────────

export async function listMandates(params: {
  status?: string;
  channel?: string;
  msisdn?: string;
  page?: number;
  limit?: number;
}): Promise<MandateListResponse> {
  const res = await api.get(`${BASE}/mandates`, { params });
  return res.data;
}

export async function getMandateByMsisdn(msisdn: string): Promise<DirectDebitMandate> {
  const res = await api.get(`${BASE}/mandates/${msisdn}`);
  return res.data.data;
}

export async function cancelMandate(msisdn: string, reason?: string) {
  const res = await api.post(`${BASE}/mandates/${msisdn}/cancel`, { reason });
  return res.data;
}

export async function pauseMandate(msisdn: string) {
  const res = await api.post(`${BASE}/mandates/${msisdn}/pause`);
  return res.data;
}

export async function resumeMandate(msisdn: string) {
  const res = await api.post(`${BASE}/mandates/${msisdn}/resume`);
  return res.data;
}

export async function triggerDebit(msisdn: string) {
  const res = await api.post(`${BASE}/mandates/${msisdn}/trigger-debit`);
  return res.data;
}

export async function forceDebit(msisdn: string, debitDate: string, debitTime?: string, amount?: number) {
  const res = await api.post(`${BASE}/mandates/${msisdn}/force-debit`, {
    debitDate,
    debitTime,
    amount,
  });
  return res.data;
}

export async function syncMandate(msisdn: string) {
  const res = await api.post(`${BASE}/mandates/${msisdn}/sync`);
  return res.data;
}

export async function updateMandate(msisdn: string, updates: { amount?: number; dueDate?: string; loanReference?: string }) {
  const res = await api.post(`${BASE}/mandates/${msisdn}/update`, updates);
  return res.data;
}

export async function setupMandateForLoan(loanReference: string, debitDate?: string) {
  const res = await api.post(`${BASE}/mandates/loan/${loanReference}/setup`, { debitDate });
  return res.data;
}

export async function scheduleDebitForLoan(loanReference: string, debitDate: string, debitTime?: string) {
  const res = await api.post(`${BASE}/mandates/loan/${loanReference}/schedule-debit`, { debitDate, debitTime });
  return res.data;
}

// ── Delinquent ─────────────────────────────────────────────────────────────────

export async function getDelinquent(params: {
  mandateStatus?: string;
  network?: string;
  minDaysOverdue?: number;
  page?: number;
  limit?: number;
}): Promise<DelinquentListResponse> {
  const res = await api.get(`${BASE}/delinquent`, { params });
  return res.data;
}

// ── Bulk ───────────────────────────────────────────────────────────────────────

export async function bulkSetup(loanReferences: string[]) {
  const res = await api.post(`${BASE}/bulk-setup`, { loanReferences });
  return res.data;
}

export async function bulkTrigger(msisdns?: string[]) {
  const res = await api.post(`${BASE}/bulk-trigger`, { msisdns });
  return res.data;
}

export async function bulkForceDebit(msisdns: string[], debitDate: string, debitTime?: string) {
  const res = await api.post(`${BASE}/bulk-force-debit`, { msisdns, debitDate, debitTime });
  return res.data;
}
