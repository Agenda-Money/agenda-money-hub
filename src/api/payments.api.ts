import api from '@/lib/api';

const BASE = '/api/admin/settings/uniwallet';

export interface UniwalletConfig {
  disbursementEnabled: boolean;
  collectionsEnabled: boolean;
  disbursementNarration: string;
  collectionNarration: string;
  nameEnquiryEnabled: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export interface UniwalletEnvInfo {
  baseUrl: string;
  nodeEnv: string;
  disbursementProductConfigured: boolean;
  collectionsProductConfigured: boolean;
  transflowIdConfigured: boolean;
  apiKeyConfigured: boolean;
}

export async function getUniwalletConfig(): Promise<{ data: UniwalletConfig; env: UniwalletEnvInfo }> {
  const res = await api.get(`${BASE}/config`);
  return res.data;
}

export async function updateUniwalletConfig(updates: Partial<UniwalletConfig>): Promise<UniwalletConfig> {
  const res = await api.put(`${BASE}/config`, updates);
  return res.data.data;
}

export async function checkTransactionStatus(loanRef: string, type: 'DISBURSEMENT' | 'REPAYMENT' = 'DISBURSEMENT') {
  const res = await api.get(`${BASE}/status/${loanRef}`, { params: { type } });
  return res.data;
}

export async function reverseTransaction(params: { uniwalletTransactionId: string; network: string; narration?: string }) {
  const res = await api.post(`${BASE}/reverse`, params);
  return res.data;
}

export async function provisionSandbox(callbackUrl: string) {
  const res = await api.post(`${BASE}/provision-sandbox`, { callbackUrl });
  return res.data;
}
