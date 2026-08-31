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
