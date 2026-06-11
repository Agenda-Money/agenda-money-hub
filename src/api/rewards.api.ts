import api from '@/lib/api';

// ── Reward Tiers ──────────────────────────────────────────────────────────

export interface RewardTier {
  tier: number;          // 4, 8, 12, 16
  label: string;         // 'L4', 'L8' etc.
  airtimeAmount: number; // GHS
  momoAmount: number;    // GHS
  smsTemplate: string;   // 'Hi [firstname], ...'
  senderId: string;
  isActive: boolean;
}

export async function getRewardTiers(): Promise<RewardTier[]> {
  const res = await api.get('/api/admin/reward-tiers');
  // Backend returns { tiers: [...] } or { data: [...] }
  return res.data.tiers || res.data.data || [];
}

export async function updateRewardTier(
  tier: number,
  updates: Partial<Pick<RewardTier, 'airtimeAmount' | 'momoAmount' | 'smsTemplate' | 'senderId' | 'isActive'>>
): Promise<RewardTier> {
  const res = await api.put(`/api/admin/reward-tiers/${tier}`, updates);
  return res.data.tier || res.data.data;
}

// ── Airtime ───────────────────────────────────────────────────────────────

export async function triggerAirtimeReward(
  tier: number,
  userIds?: string[]
): Promise<{ blob: Blob; filename: string; unknownNetworks: string[]; campaignId: string }> {
  const res = await api.post(
    '/api/admin/rewards/trigger',
    { tier, userIds },
    { responseType: 'blob' }
  );
  const disposition: string = res.headers['content-disposition'] ?? '';
  const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] ?? `airtime-L${tier}-${Date.now()}.csv`;
  const unknownNetworks = (res.headers['x-unknown-networks'] ?? '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  const campaignId = res.headers['x-campaign-id'] ?? '';
  return { blob: res.data, filename, unknownNetworks, campaignId };
}

export async function redownloadAirtimeCsv(tier: number): Promise<{ blob: Blob; filename: string }> {
  const res = await api.get(`/api/admin/rewards/airtime-csv/${tier}`, { responseType: 'blob' });
  const disposition: string = res.headers['content-disposition'] ?? '';
  const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] ?? `airtime-L${tier}.csv`;
  return { blob: res.data, filename };
}

export async function sendAirtimeSms(campaignId: string): Promise<{ message: string; recipientCount: number }> {
  const res = await api.post(`/api/admin/campaigns/${campaignId}/send-sms`);
  return res.data;
}

export async function getPendingAirtimeCampaign(tier: number): Promise<Campaign | null> {
  const res = await api.get(`/api/admin/rewards/pending/${tier}`);
  return res.data.campaign;
}

// ── SMS ───────────────────────────────────────────────────────────────────

export interface BulkSmsPayload {
  senderId: string;
  message: string;
  label: string;
  all?: boolean;         // send to every registered customer
  tier?: number;
  contacts?: string[];   // array of MSISDNs
  scheduled?: boolean;
  startDate?: string;    // ISO string — required if scheduled: true
  messageType?: 'general' | 'issue' | 'maintenance';
}

export async function sendBulkSms(payload: BulkSmsPayload): Promise<{ campaignId: string }> {
  const res = await api.post('/api/admin/sms/bulk', payload);
  return res.data;
}

export async function getBundleBalance(): Promise<{ bundleCount: number }> {
  const res = await api.get('/api/admin/sms/bundle-balance');
  return res.data;
}

// ── MoMo ──────────────────────────────────────────────────────────────────

export interface SingleMomoPayload {
  msisdn: string;
  amount: number;
  reference: string;
  note?: string;
}

export interface TierMomoPayload {
  tier: number;
  note?: string;
}

export async function disburseMomo(
  payload: SingleMomoPayload | TierMomoPayload
): Promise<{ campaignId: string; message: string; recipientCount?: number; amountEach?: number }> {
  const res = await api.post('/api/admin/momo/disburse', payload);
  return res.data;
}

// ── Campaigns ─────────────────────────────────────────────────────────────

export type CampaignType   = 'sms' | 'airtime' | 'momo' | 'otp';
export type CampaignStatus = 'pending' | 'csv_ready' | 'processing' | 'completed' | 'partial' | 'failed';
export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'undelivered';

export interface Campaign {
  _id: string;
  type: CampaignType;
  label: string;
  tier?: number;
  status: CampaignStatus;
  totalCount: number;
  deliveredCount: number;
  failedCount: number;
  amount?: number;
  rancardCampaignId?: string;
  parentCampaignId?: string;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRecipient {
  msisdn: string;
  firstName: string;
  status: DeliveryStatus;
  deliveredAt?: string;
  failureReason?: string;
}

export interface CampaignListResponse {
  campaigns: Campaign[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CampaignReportResponse {
  campaignId: string;
  label: string;
  type: CampaignType;
  status: CampaignStatus;
  totalCount: number;
  deliveredCount: number;
  failedCount: number;
  deliveryRate: string;  // e.g. "97.9%"
  recipients: CampaignRecipient[];
  total: number;
  page: number;
  limit: number;
}

export async function listCampaigns(params: {
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<CampaignListResponse> {
  const res = await api.get('/api/admin/campaigns', { params });
  return res.data;
}

export async function getCampaignReport(
  id: string,
  params: { status?: string; page?: number; limit?: number }
): Promise<CampaignReportResponse> {
  const res = await api.get(`/api/admin/campaigns/${id}/report`, { params });
  return res.data;
}

export async function retryCampaign(id: string): Promise<{ retryCampaignId: string; retryCount: number }> {
  const res = await api.post(`/api/admin/campaigns/${id}/retry`);
  return res.data;
}
