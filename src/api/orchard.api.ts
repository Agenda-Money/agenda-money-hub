import api from '@/lib/api';

const BASE = '/api/admin/settings/orchard';

export interface OrchardConfig {
  disbursementEnabled: boolean;
  autoDebitEnabled: boolean;
  airtimeEnabled: boolean;
  billPayEnabled: boolean;
  remittanceEnabled: boolean;
  retryAttempts: number;
  updatedBy?: string;
  updatedAt?: string;
}

export interface OrchardEnvInfo {
  baseUrl: string;
  nodeEnv: string;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  serviceIdConfigured: boolean;
  webhookSecretConfigured: boolean;
}

export type OrchardMandateStatus = 'PENDING_OTP' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';

export interface OrchardMandate {
  _id: string;
  msisdn: string;
  network: 'MTN' | 'VOD' | 'AIR';
  uniqRefId: string;
  status: OrchardMandateStatus;
  currentLoanReference?: string;
  currentDebitAmount?: number;
  cycle?: 'DLY' | 'WKL' | 'MON';
  startDate?: string;
  endDate?: string;
  retryCount: number;
  totalDebitsSuccessful: number;
  totalDebitsFailed: number;
  lastDebitAt?: string;
  lastDebitAmount?: number;
  lastDebitStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getOrchardConfig(): Promise<{ data: OrchardConfig; env: OrchardEnvInfo }> {
  const res = await api.get(`${BASE}/config`);
  return res.data;
}

export async function updateOrchardConfig(updates: Partial<OrchardConfig>): Promise<OrchardConfig> {
  const res = await api.put(`${BASE}/config`, updates);
  return res.data.data;
}

export async function checkOrchardWalletBalance() {
  const res = await api.get(`${BASE}/balance`);
  return res.data.data;
}

export interface OrchardTransactionLog {
  status: 'initialized' | 'pending' | 'completed' | 'failed' | 'reversed';
  transId?: string;
  reference: string;
  amount: number;
  metadata?: Record<string, unknown>;
}

/** Orchard exposes no one-off status-check API for disbursements — this
 * re-reads our own transaction log (kept current by the callback) rather
 * than calling Orchard directly, unlike the Paystack sync-transfer flow. */
export async function getOrchardTransactionStatus(loanId: string): Promise<OrchardTransactionLog> {
  const res = await api.get(`${BASE}/transactions/${loanId}`);
  return res.data.data;
}

export async function listOrchardMandates(status?: OrchardMandateStatus): Promise<OrchardMandate[]> {
  const res = await api.get(`${BASE}/mandates`, { params: status ? { status } : undefined });
  return res.data.data;
}

export async function getOrchardMandate(msisdn: string): Promise<OrchardMandate> {
  const res = await api.get(`${BASE}/mandates/${msisdn}`);
  return res.data.data;
}

export async function suspendOrchardMandate(msisdn: string) {
  const res = await api.post(`${BASE}/mandates/${msisdn}/suspend`);
  return res.data;
}

export async function resumeOrchardMandate(msisdn: string) {
  const res = await api.post(`${BASE}/mandates/${msisdn}/resume`);
  return res.data;
}

export async function cancelOrchardMandate(msisdn: string, reason?: string) {
  const res = await api.post(`${BASE}/mandates/${msisdn}/cancel`, { reason });
  return res.data;
}

export async function resendOrchardOtp(msisdn: string) {
  const res = await api.post(`${BASE}/mandates/${msisdn}/resend-otp`);
  return res.data;
}

export async function syncOrchardMandate(msisdn: string) {
  const res = await api.post(`${BASE}/mandates/${msisdn}/sync`);
  return res.data;
}

// ── Disbursement provider switch (shared settings, not Orchard-specific) ──
export type DisbursementProviderName = 'PAYSTACK' | 'ORCHARD';

export async function getDisbursementProvider(): Promise<DisbursementProviderName> {
  const res = await api.get('/api/admin/settings/disbursement-provider');
  return res.data.activeProvider;
}

export async function setDisbursementProvider(activeProvider: DisbursementProviderName): Promise<DisbursementProviderName> {
  const res = await api.put('/api/admin/settings/disbursement-provider', { activeProvider });
  return res.data.activeProvider;
}
