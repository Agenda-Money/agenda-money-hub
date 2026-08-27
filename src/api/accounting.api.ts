import api from "@/lib/api";
import type { LedgerCategoryId, LedgerCostType, PayrollDepartment } from "@/lib/constants";

const BASE = "/api/admin/accounting";

export interface AccountingSettings {
  costOfFundsRatePercent: number;
  lossThresholdDays: number;
  updatedBy?: string;
}

export type LedgerEntryStatus = "active" | "pending_deletion" | "deleted";

export interface LedgerEntry {
  _id: string;
  category: LedgerCategoryId;
  costType: LedgerCostType;
  department?: PayrollDepartment;
  description: string;
  amount: number;
  periodMonth: string;
  receiptUrl?: string;
  enteredBy: string;
  status: LedgerEntryStatus;
  deletionRequestedAt?: string;
  deletionRequestedBy?: string;
  deletionReason?: string;
  deletionApprovedAt?: string;
  deletionApprovedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PnlResponse {
  month: string;
  revenue: { interest: number; fee: number; total: number; repaidLoanCount: number };
  directCosts: { costOfFunds: number; costOfFundsRatePercent: number; totalDisbursedThisMonth: number; ledgerDirect: number; total: number };
  indirectCosts: { byCategory: { _id: { category: string; department?: string }; total: number }[]; total: number };
  grossMargin: number;
  portfolio: { status: string; count: number; outstandingValue: number }[];
}

export interface ChannelBreakdownResponse {
  type: "disbursement" | "collection";
  month: string;
  breakdown: { _id: { channel?: string; provider?: string }; count: number; volume: number }[];
}

export interface CashflowResponse {
  month: string;
  weeks: { weekLabel: string; weekStart: string; expectedInflow: number; loanCount: number }[];
  knownOutflow: { costOfFunds: number; ledgerCosts: number; total: number };
  netProjected: number;
}

export async function getAccountingSettings(): Promise<AccountingSettings> {
  const res = await api.get(`${BASE}/settings`);
  return res.data.data;
}

export async function updateAccountingSettings(updates: Partial<AccountingSettings>): Promise<AccountingSettings> {
  const res = await api.put(`${BASE}/settings`, updates);
  return res.data.data;
}

export async function listLedgerEntries(params: {
  page?: number;
  limit?: number;
  category?: LedgerCategoryId;
  department?: PayrollDepartment;
  periodMonth?: string;
  status?: LedgerEntryStatus;
}): Promise<{ data: LedgerEntry[]; pagination: { total: number; page: number; pages: number } }> {
  const res = await api.get(`${BASE}/ledger`, { params });
  return res.data;
}

export async function createLedgerEntry(payload: {
  category: LedgerCategoryId;
  costType?: LedgerCostType;
  department?: PayrollDepartment;
  description: string;
  amount: number;
  periodMonth: string;
  receiptUrl?: string;
}): Promise<LedgerEntry> {
  const res = await api.post(`${BASE}/ledger`, payload);
  return res.data.data;
}

export async function requestLedgerDeletion(id: string, reason: string): Promise<LedgerEntry> {
  const res = await api.post(`${BASE}/ledger/${id}/request-deletion`, { reason });
  return res.data.data;
}

export async function approveLedgerDeletion(id: string): Promise<LedgerEntry> {
  const res = await api.post(`${BASE}/ledger/${id}/approve-deletion`);
  return res.data.data;
}

export async function rejectLedgerDeletion(id: string): Promise<LedgerEntry> {
  const res = await api.post(`${BASE}/ledger/${id}/reject-deletion`);
  return res.data.data;
}

export async function getPnl(month: string): Promise<PnlResponse> {
  const res = await api.get(`${BASE}/pnl`, { params: { month } });
  return res.data.data;
}

export async function getChannelBreakdown(type: "disbursement" | "collection", month: string): Promise<ChannelBreakdownResponse> {
  const res = await api.get(`${BASE}/channels`, { params: { type, month } });
  return res.data.data;
}

export async function getCashflow(month: string): Promise<CashflowResponse> {
  const res = await api.get(`${BASE}/cashflow`, { params: { month } });
  return res.data.data;
}
