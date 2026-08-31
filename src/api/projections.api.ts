import api from "@/lib/api";

const BASE = "/api/admin/projections";

export interface MonthlyDriver {
  monthIndex: number;
  salesAgents: number;
  avgLoanSizeNewCustomer: number;
  avgLoanAmountReturningCustomer: number;
}

export interface ProjectionAssumptions {
  _id: string;
  version: number;
  isActive: boolean;
  horizonStartMonth: string;

  nodesPerAgentPerDay: number;
  connectionsPerNodeRate: number;
  potentialCustNodeRate: number;
  custPerPotentialCustRate: number;
  retainedCustomerRate: number;

  ncRepaymentRate: number;
  rcRepaymentRate: number;
  cyclesPerMonth: number;
  processingFeePerLoan: number;
  avgRepaymentDays: number;
  interestRatePerDay: number;
  monthlyCostOfFundsRate: number;
  momoDisbursementChargeRate: number;
  otherChargesPerCustomer: number;
  agentCommissionPerRepayment: number;

  debtInstrumentMonthlyRate: number;

  corporateTaxRate: number;
  dividendPayoutRate: number;
  statedCapital: number;

  tradeReceivablesPctOfDecRevenue: number;
  nonCurrentDebtGrowthPctOfDebtAsk: number;

  annualInflationRate: number;

  monthlyDrivers: MonthlyDriver[];
  changeNote?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function getProjectionAssumptions(): Promise<ProjectionAssumptions> {
  const res = await api.get(`${BASE}/assumptions`);
  return res.data.data;
}

export async function updateProjectionAssumptions(
  updates: Partial<Omit<ProjectionAssumptions, "_id" | "version" | "isActive" | "createdBy" | "createdAt" | "updatedAt">>,
): Promise<ProjectionAssumptions> {
  const res = await api.put(`${BASE}/assumptions`, updates);
  return res.data.data;
}

export interface CustomerGrowthMonth {
  monthIndex: number;
  month: string;
  salesAgents: number;
  nodesPerDay: number;
  connectionsPerMonth: number;
  potentialCustomersPerMonth: number;
  customersPerMonth: number;
  retainedCustomers: number;
  cumulativeRetainedCustomers: number;
  customerBase: number;
}

export interface ProjectionGrowthResponse {
  assumptionsVersion: number;
  computedAt: string;
  months: CustomerGrowthMonth[];
}

export async function getProjectionGrowth(): Promise<ProjectionGrowthResponse> {
  const res = await api.get(`${BASE}/growth`);
  return res.data.data;
}

// ── Debt Schedule (superadmin-only) ─────────────────────────────────────

export type LenderType = "individual" | "institutional";
export type DebtRegion = "local" | "foreign";
export type DebtFeeStructure = "fixed_annual" | "rate_based";
export type DebtEntryStatus = "active" | "repaid" | "planned";

export interface DebtScheduleEntry {
  _id: string;
  lenderName: string;
  lenderType: LenderType;
  region: DebtRegion;
  principal: number;
  feeStructure: DebtFeeStructure;
  fixedAnnualAmount?: number;
  overrideMonthlyRate?: number;
  disbursedMonth: string;
  status: DebtEntryStatus;
  createdAt: string;
}

export interface CommitmentFeesMonth {
  monthIndex: number;
  month: string;
  totalMonthlyFee: number;
  localPrincipal: number;
  foreignPrincipal: number;
}

export async function listDebtEntries(): Promise<{ data: DebtScheduleEntry[]; commitmentFees: CommitmentFeesMonth[] }> {
  const res = await api.get(`${BASE}/debt`);
  return { data: res.data.data, commitmentFees: res.data.commitmentFees };
}

export async function createDebtEntry(payload: {
  lenderName: string; lenderType: LenderType; region: DebtRegion; principal: number;
  feeStructure: DebtFeeStructure; fixedAnnualAmount?: number; overrideMonthlyRate?: number; disbursedMonth: string;
}): Promise<DebtScheduleEntry> {
  const res = await api.post(`${BASE}/debt`, payload);
  return res.data.data;
}

export async function deleteDebtEntry(id: string): Promise<void> {
  await api.delete(`${BASE}/debt/${id}`);
}

// ── Depreciation ─────────────────────────────────────────────────────────

export type DepreciationAssetCategory = "software_digital_platform" | "motor_vehicle" | "computers_accessories" | "office_equipment";

export interface DepreciationAssetEntry {
  _id: string;
  category: DepreciationAssetCategory;
  description: string;
  costBasis: number;
  usefulLifeMonths: number;
  acquiredMonth: string;
  status: "active" | "disposed";
  createdAt: string;
}

export async function listDepreciationEntries(): Promise<{ data: DepreciationAssetEntry[] }> {
  const res = await api.get(`${BASE}/depreciation`);
  return { data: res.data.data };
}

export async function createDepreciationEntry(payload: {
  category: DepreciationAssetCategory; description: string; costBasis: number; usefulLifeMonths: number; acquiredMonth: string;
}): Promise<DepreciationAssetEntry> {
  const res = await api.post(`${BASE}/depreciation`, payload);
  return res.data.data;
}

export async function deleteDepreciationEntry(id: string): Promise<void> {
  await api.delete(`${BASE}/depreciation/${id}`);
}

// ── Digital Platform: CapEx + Subscriptions ────────────────────────────

export interface CapexEntry {
  _id: string;
  item: string;
  costAmount: number;
  currency: "GHS" | "EUR" | "USD";
  fxRateToGhs?: number;
  plannedMonth: string;
  status: "planned" | "committed" | "live";
}

export interface SubscriptionEntry {
  _id: string;
  item: string;
  monthlyAmount: number;
  currency: "GHS" | "EUR" | "USD";
  fxRateToGhs?: number;
  effectiveFrom: string;
  status: "active" | "inactive";
}

export async function listCapexEntries(): Promise<CapexEntry[]> {
  const res = await api.get(`${BASE}/platform/capex`);
  return res.data.data;
}

export async function createCapexEntry(payload: {
  item: string; costAmount: number; currency: "GHS" | "EUR" | "USD"; fxRateToGhs?: number; plannedMonth: string; autoCreateDepreciationEntry?: boolean;
}): Promise<CapexEntry> {
  const res = await api.post(`${BASE}/platform/capex`, payload);
  return res.data.data;
}

export async function listSubscriptionEntries(): Promise<{ data: SubscriptionEntry[]; schedule: { monthIndex: number; month: string; total: number }[] }> {
  const res = await api.get(`${BASE}/platform/subscriptions`);
  return { data: res.data.data, schedule: res.data.schedule };
}

export async function createSubscriptionEntry(payload: {
  item: string; monthlyAmount: number; currency: "GHS" | "EUR" | "USD"; fxRateToGhs?: number; effectiveFrom: string;
}): Promise<SubscriptionEntry> {
  const res = await api.post(`${BASE}/platform/subscriptions`, payload);
  return res.data.data;
}
