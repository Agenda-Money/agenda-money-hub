import api from "@/lib/api";

const FLAG = "TWO_STEP_DISBURSEMENT";

export interface TwoStepState {
  enabled: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

/** Whether two admins must approve a loan before money is sent. Off if the flag has never been set. */
export async function getTwoStepDisbursement(): Promise<TwoStepState> {
  const res = await api.get("/api/admin/settings/feature-flags");
  const flag = (res.data?.flags ?? []).find((f: { key: string }) => f.key === FLAG);
  return { enabled: flag?.enabled === true, updatedBy: flag?.updatedBy, updatedAt: flag?.updatedAt };
}

export async function setTwoStepDisbursement(enabled: boolean): Promise<void> {
  await api.patch(`/api/admin/settings/feature-flags/${FLAG}`, { enabled });
}

// ── Who is texted for the final approval ──

export interface ApprovalAlertAdmin {
  adminId: string;
  fullName: string;
  email: string;
  /** 233XXXXXXXXX, or empty when none is saved. */
  phone: string;
}

export async function listApprovalAlerts(): Promise<ApprovalAlertAdmin[]> {
  const res = await api.get("/api/admin/settings/approval-alerts");
  return res.data.data;
}

/** An empty string clears the number. */
export async function setApprovalAlert(adminId: string, phone: string): Promise<void> {
  await api.put(`/api/admin/settings/approval-alerts/${adminId}`, { phone });
}
