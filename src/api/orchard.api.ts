import api from '@/lib/api';
import type { MandateExpiry } from '@/lib/orchard-insights';

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
  /** The mandate's linked loan's actual due date, attached server-side —
   * not derived from startDate, since mandates predating the DD+4 grace
   * period have startDate equal to the due date with no offset. */
  loanDueDate?: string | null;
  /** Attached server-side from the customer and the loan. */
  customerName?: string | null;
  loanStatus?: string | null;
  /** What the loan still owes, or null when the mandate has no loan. */
  outstanding?: number | null;
  expiry?: MandateExpiry;
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

export async function listOrchardMandates(
  params: { status?: OrchardMandateStatus | ''; search?: string; limit?: number } = {},
): Promise<OrchardMandate[]> {
  const query: Record<string, string | number> = {};
  if (params.status) query.status = params.status;
  if (params.search?.trim()) query.search = params.search.trim();
  if (params.limit) query.limit = params.limit;
  const res = await api.get(`${BASE}/mandates`, { params: query });
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

export async function forceRetryOrchardDebit(msisdn: string) {
  const res = await api.post(`${BASE}/mandates/${msisdn}/force-retry`);
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

// ── Collection provider switch (governs the customer USSD "Pay Now" flow) ──
export type CollectionProviderName = 'PAYSTACK' | 'ORCHARD';

export async function getCollectionProvider(): Promise<CollectionProviderName> {
  const res = await api.get('/api/admin/settings/collection-provider');
  return res.data.activeProvider;
}

export async function setCollectionProvider(activeProvider: CollectionProviderName): Promise<CollectionProviderName> {
  const res = await api.put('/api/admin/settings/collection-provider', { activeProvider });
  return res.data.activeProvider;
}

// ── Manual collection triggers ──────────────────────────────────────────
export interface TriggerCollectionResult {
  success: boolean;
  reference: string;
  message: string;
  response?: Record<string, unknown>;
}

/** Generic — targets whichever provider is passed (defaults server-side to
 * the active collection provider if omitted). */
export async function triggerCollection(params: {
  loanReference: string;
  amount?: number;
  provider?: CollectionProviderName;
}): Promise<TriggerCollectionResult> {
  const res = await api.post('/api/admin/repayments/trigger-collection', params);
  return res.data.data;
}

/** Orchard-specific — lives in the Orchard settings tab, always Orchard. */
export async function triggerOrchardCollection(loanReference: string, amount?: number): Promise<TriggerCollectionResult> {
  const res = await api.post(`${BASE}/collect/${encodeURIComponent(loanReference)}`, amount !== undefined ? { amount } : {});
  return res.data.data;
}

// ── Mandates running out while money is still owed ──────────────────────
export interface ExpiryRiskRow {
  msisdn: string;
  customerName: string | null;
  loanReference: string;
  loanStatus: string;
  outstanding: number;
  endDate: string;
  daysLeft: number;
  state: 'ENDED' | 'ENDS_SOON';
}

export interface ExpiryRisk {
  asOf: string;
  withinDays: number;
  summary: {
    endedWithMoneyOwed: { mandates: number; owed: number };
    endingSoonWithMoneyOwed: { mandates: number; owed: number };
    within3Days: number;
    within7Days: number;
  };
  rows: ExpiryRiskRow[];
}

export async function getMandateExpiryRisk(withinDays?: number): Promise<ExpiryRisk> {
  const res = await api.get(`${BASE}/mandate-expiry`, { params: withinDays ? { withinDays } : undefined });
  return res.data.data;
}

// ── When repayments land ────────────────────────────────────────────────
export interface TimingBucket {
  key: number;
  count: number;
  amount: number;
}

export interface RepaymentTiming {
  asOf: string;
  days: number;
  timezone: string;
  sampleSize: number;
  customerChosenSampleSize: number;
  lowSample: boolean;
  all: { byHour: TimingBucket[]; byDayOfMonth: TimingBucket[]; byWeekday: TimingBucket[] };
  customerChosen: {
    byHour: TimingBucket[];
    byDayOfMonth: TimingBucket[];
    byWeekday: TimingBucket[];
    busiestHours: TimingBucket[];
    busiestDays: TimingBucket[];
  };
  byChannel: { channel: string; count: number; amount: number }[];
}

export async function getRepaymentTiming(days?: number): Promise<RepaymentTiming> {
  const res = await api.get(`${BASE}/repayment-timing`, { params: days ? { days } : undefined });
  return res.data.data;
}

// ── Automatic retry report (report only: it never charges anyone) ───────
export interface RetryVerdict {
  uniqRefId: string;
  loanReference?: string;
  customer: string;
  verdict: 'WOULD_RETRY' | 'SKIP';
  code?: string;
  reason: string;
  chargeAmount?: number;
  outstanding?: number;
}

export interface RetryPlan {
  asOf: string;
  considered: number;
  wouldRetry: RetryVerdict[];
  skipped: Record<string, number>;
  needsAPerson: RetryVerdict[];
  statusChecks: number;
  verdicts: RetryVerdict[];
}

export async function getRetryReport(): Promise<RetryPlan> {
  const res = await api.get(`${BASE}/retry-report`);
  return res.data.data;
}

export interface RetrySchedule {
  enabled: boolean;
  reportOnly: true;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export async function getRetrySchedule(): Promise<RetrySchedule> {
  const res = await api.get(`${BASE}/retry-report/schedule`);
  return res.data.data;
}

export async function setRetrySchedule(enabled: boolean): Promise<RetrySchedule> {
  const res = await api.put(`${BASE}/retry-report/schedule`, { enabled });
  return res.data.data;
}
