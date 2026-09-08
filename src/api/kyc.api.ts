import api from '@/lib/api';
import { getApiBaseUrl } from '@/lib/domain';

// ── KYC provider switch (governs which identity flow applicants get) ──────
export type KycProviderName = 'INTERNAL' | 'DIDIT';

export interface KycProviderState {
  activeProvider: KycProviderName;
  diditConfigured: boolean;
}

export async function getKycProvider(): Promise<KycProviderState> {
  const res = await api.get('/api/admin/settings/kyc-provider');
  return {
    activeProvider: res.data.activeProvider,
    diditConfigured: Boolean(res.data.diditConfigured),
  };
}

export async function setKycProvider(activeProvider: KycProviderName): Promise<KycProviderName> {
  const res = await api.put('/api/admin/settings/kyc-provider', { activeProvider });
  return res.data.activeProvider;
}

export interface DiditHealth {
  configured: boolean;
  webhookSecretConfigured: boolean;
  callbackConfigured: boolean;
  baseUrl: string;
}

export async function getDiditHealth(): Promise<DiditHealth> {
  const res = await api.get('/api/kyc/didit/health');
  return res.data;
}

// ── Applicant-facing (used by the apply flow, not the admin dashboard) ────

/**
 * Which identity flow this applicant should be shown. Unauthenticated.
 *
 * Falls back to INTERNAL on anything unexpected. The content-type check is
 * deliberate: if the API base is ever misconfigured to empty, this resolves
 * against the frontend origin, where the SPA fallback answers 200 with
 * index.html — a "successful" response carrying HTML. Checking ok alone would
 * sail straight past that.
 */
export async function getActiveKycProvider(): Promise<KycProviderName> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/kyc/provider`);
    if (!res.ok) return 'INTERNAL';
    if (!res.headers.get('content-type')?.includes('application/json')) return 'INTERNAL';
    const data = await res.json();
    return data?.provider === 'DIDIT' ? 'DIDIT' : 'INTERNAL';
  } catch {
    return 'INTERNAL';
  }
}

export interface DiditSession {
  sessionId: string;
  url: string;
}

export async function createDiditSession(redirectUrl?: string): Promise<DiditSession> {
  const res = await api.post('/api/kyc/didit/session', { redirectUrl });
  return { sessionId: res.data.session_id ?? res.data.sessionId, url: res.data.url };
}

/** Pull the result for a session we just came back from. Used instead of
 * waiting on a webhook, so the applicant sees their outcome immediately. */
export async function syncDiditSession(sessionId: string): Promise<void> {
  await api.post(`/api/kyc/didit/session/${encodeURIComponent(sessionId)}/sync`);
}
