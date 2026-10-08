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
