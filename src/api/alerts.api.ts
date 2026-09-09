import api from '@/lib/api';

export interface AlertChannelResult {
  attempted: boolean;
  ok: boolean;
  detail?: string;
}

export interface TestAlertResult {
  sms: AlertChannelResult;
  email: AlertChannelResult;
  adminPhoneConfigured: boolean;
  alertEmailConfigured: boolean;
}

/**
 * Fires a real alert down both channels and reports what happened to each.
 *
 * Operational alerting is written to swallow its own failures, so that a
 * broken alert never becomes a second fault during an incident. The cost of
 * that is you cannot tell a working alert path from a dead one by watching —
 * both are silent. This is the only way to find out before it matters.
 */
export async function sendTestAlert(): Promise<TestAlertResult> {
  const res = await api.post('/api/admin/settings/alerts/test');
  return res.data;
}
