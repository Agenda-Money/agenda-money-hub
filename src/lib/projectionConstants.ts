// src/lib/projectionConstants.ts
//
// Mirrors src/core/projections/projection-assumption-fields.ts on the
// backend — single source of truth for how each ProjectionAssumptions
// scalar field is labeled/grouped/formatted on the Assumptions page.
// Grouped under the same three headers the source spreadsheet's own
// Assumptions sheet uses (Commercial / P&L / BS).

export type ProjectionAssumptionGroup = "commercial" | "pnl" | "bs";
export type ProjectionAssumptionUnit = "count" | "ghs" | "percent" | "days" | "multiplier";

export interface ProjectionAssumptionFieldConfig {
  id: string;
  group: ProjectionAssumptionGroup;
  label: string;
  unit: ProjectionAssumptionUnit;
}

export const PROJECTION_ASSUMPTION_FIELDS: ProjectionAssumptionFieldConfig[] = [
  // Commercial
  { id: "nodesPerAgentPerDay", group: "commercial", label: "Nodes reached per agent per day", unit: "count" },
  { id: "connectionsPerNodeRate", group: "commercial", label: "Connections per node", unit: "multiplier" },
  { id: "potentialCustNodeRate", group: "commercial", label: "Potential customers per node", unit: "multiplier" },
  { id: "custPerPotentialCustRate", group: "commercial", label: "Customers per potential customer", unit: "multiplier" },
  { id: "retainedCustomerRate", group: "commercial", label: "Customer retention rate", unit: "percent" },
  { id: "ncRepaymentRate", group: "commercial", label: "New customer repayment rate", unit: "percent" },
  { id: "rcRepaymentRate", group: "commercial", label: "Returning customer repayment rate", unit: "percent" },
  { id: "cyclesPerMonth", group: "commercial", label: "Borrowing cycles per month", unit: "multiplier" },
  { id: "processingFeePerLoan", group: "commercial", label: "Avg. processing fee per loan", unit: "ghs" },
  { id: "avgRepaymentDays", group: "commercial", label: "Avg. repayment days", unit: "days" },
  { id: "interestRatePerDay", group: "commercial", label: "Interest rate charged per day", unit: "percent" },
  { id: "monthlyCostOfFundsRate", group: "commercial", label: "Monthly cost of funds rate", unit: "percent" },
  { id: "momoDisbursementChargeRate", group: "commercial", label: "Mobile money disbursement charge", unit: "percent" },
  { id: "otherChargesPerCustomer", group: "commercial", label: "KYC/SMS charge per customer", unit: "ghs" },
  { id: "agentCommissionPerRepayment", group: "commercial", label: "Agent commission per loan", unit: "ghs" },
  { id: "debtInstrumentMonthlyRate", group: "commercial", label: "Debt instrument monthly rate (fallback)", unit: "percent" },

  // P&L
  { id: "annualInflationRate", group: "pnl", label: "Annual inflation assumed", unit: "percent" },
  { id: "corporateTaxRate", group: "pnl", label: "Corporate income tax rate", unit: "percent" },

  // BS
  { id: "tradeReceivablesPctOfDecRevenue", group: "bs", label: "Trade receivables, % of December revenue", unit: "percent" },
  { id: "nonCurrentDebtGrowthPctOfDebtAsk", group: "bs", label: "Non-current debt growth, % of debt ask", unit: "percent" },
  { id: "dividendPayoutRate", group: "bs", label: "Dividend payout rate (when profitable)", unit: "percent" },
  { id: "statedCapital", group: "bs", label: "Stated capital", unit: "ghs" },
];

export const PROJECTION_ASSUMPTION_GROUP_LABELS: Record<ProjectionAssumptionGroup, string> = {
  commercial: "Commercial",
  pnl: "P&L",
  bs: "Balance Sheet",
};
