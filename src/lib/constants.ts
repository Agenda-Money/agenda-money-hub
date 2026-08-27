export const LOAN_PURPOSES = ["Business", "Education", "Medical", "Home", "Other"];

// Tier Configuration
export type TierConfig = {
  level: number;
  minAmount: number;
  maxAmount: number;
  maxTenure: number;
  processingFee: number;
  amounts?: number[];
  tenures?: number[];
};

export const TIERS: TierConfig[] = [
  { level: 1,  minAmount: 50,   maxAmount: 300,  maxTenure: 14, processingFee: 30, tenures: [1, 5, 10, 14] },
  { level: 2,  minAmount: 100,  maxAmount: 360,  maxTenure: 14, processingFee: 30, tenures: [1, 5, 10, 14] },
  { level: 3,  minAmount: 150,  maxAmount: 450,  maxTenure: 14, processingFee: 30, tenures: [1, 5, 10, 14] },
  { level: 4,  minAmount: 200,  maxAmount: 515,  maxTenure: 14, processingFee: 30, tenures: [1, 5, 10, 14] },
  { level: 5,  minAmount: 250,  maxAmount: 600,  maxTenure: 14, processingFee: 25, tenures: [1, 5, 10, 14] },
  { level: 6,  minAmount: 300,  maxAmount: 680,  maxTenure: 14, processingFee: 25, tenures: [1, 5, 10, 14] },
  { level: 7,  minAmount: 350,  maxAmount: 770,  maxTenure: 20, processingFee: 25, tenures: [1, 5, 10, 14, 20] },
  // Tier 8+ trades the 1-day option for 30-day; 20-day stays exclusive to tier 7
  // (must match backend's getAllowedTenuresForTier in loan.service.ts).
  { level: 8,  minAmount: 400,  maxAmount: 870,  maxTenure: 30, processingFee: 25, tenures: [5, 10, 14, 30] },
  { level: 9,  minAmount: 500,  maxAmount: 980,  maxTenure: 30, processingFee: 25, tenures: [5, 10, 14, 30] },
  { level: 10, minAmount: 500,  maxAmount: 1100, maxTenure: 30, processingFee: 20, tenures: [5, 10, 14, 30] },
  { level: 11, minAmount: 600,  maxAmount: 1300, maxTenure: 30, processingFee: 20, tenures: [5, 10, 14, 30] },
  { level: 12, minAmount: 700,  maxAmount: 1450, maxTenure: 30, processingFee: 20, tenures: [5, 10, 14, 30] },
  { level: 13, minAmount: 800,  maxAmount: 1600, maxTenure: 30, processingFee: 20, tenures: [5, 10, 14, 30] },
  { level: 14, minAmount: 900,  maxAmount: 1750, maxTenure: 30, processingFee: 20, tenures: [5, 10, 14, 30] },
  { level: 15, minAmount: 1000, maxAmount: 1900, maxTenure: 30, processingFee: 15, tenures: [5, 10, 14, 30] },
  { level: 16, minAmount: 1100, maxAmount: 2100, maxTenure: 30, processingFee: 15, tenures: [5, 10, 14, 30] },
  { level: 17, minAmount: 1300, maxAmount: 2300, maxTenure: 30, processingFee: 15, tenures: [5, 10, 14, 30] },
  { level: 18, minAmount: 1300, maxAmount: 2300, maxTenure: 30, processingFee: 15, tenures: [5, 10, 14, 30] },
  { level: 19, minAmount: 1300, maxAmount: 2300, maxTenure: 30, processingFee: 15, tenures: [5, 10, 14, 30] },
  { level: 20, minAmount: 1300, maxAmount: 2300, maxTenure: 30, processingFee: 15, tenures: [5, 10, 14, 30] },
];

if (process.env.NODE_ENV !== 'production') {
  TIERS.forEach(tier => {
    if (tier.minAmount >= tier.maxAmount) {
      throw new Error(
        `[TIERS CONFIG] L${tier.level} is invalid: minAmount (${tier.minAmount}) must be less than maxAmount (${tier.maxAmount})`
      );
    }
    if (tier.minAmount < 1) {
      throw new Error(
        `[TIERS CONFIG] L${tier.level} has minAmount < 1. All tiers must have a positive minimum.`
      );
    }
  });
}

// Helper to get tier by level
export const getTierByLevel = (level: number): TierConfig => {
  return TIERS.find(t => t.level === level) || TIERS[0];
};

// Helper to create tier limits record for backward compatibility
export const TIER_LIMITS: Record<number, TierConfig> = TIERS.reduce((acc, tier) => {
  acc[tier.level] = tier;
  return acc;
}, {} as Record<number, TierConfig>);

// Accounting ledger categories — single source of truth for the ledger
// entry form's category dropdown AND the P&L's line-item structure.
// Must mirror the backend's src/core/accounting/expense-categories.ts
// exactly (same id strings) — same class of drift risk as TIERS/tenure
// rules above, so keep both sides pointing at each other in comments.
export type LedgerCostType = "direct" | "indirect";

export const PAYROLL_DEPARTMENTS = [
  "Leadership",
  "Finance & Admin",
  "Engineering",
  "Collections & Operations",
  "Sales",
  "Field Agents",
  "Customer Support",
  "Back Office",
] as const;

export type PayrollDepartment = (typeof PAYROLL_DEPARTMENTS)[number];

export type LedgerCategoryId =
  | "sms_ussd_gateway"
  | "credit_bureau_kyc"
  | "payroll"
  | "vehicle_maintenance"
  | "bank_charges"
  | "other";

export interface LedgerCategoryConfig {
  id: LedgerCategoryId;
  label: string;
  defaultCostType: LedgerCostType;
  requiresDepartment: boolean;
}

export const EXPENSE_CATEGORIES: LedgerCategoryConfig[] = [
  { id: "sms_ussd_gateway", label: "SMS / USSD Gateway", defaultCostType: "indirect", requiresDepartment: false },
  { id: "credit_bureau_kyc", label: "Credit Bureau & KYC", defaultCostType: "indirect", requiresDepartment: false },
  { id: "payroll", label: "Payroll", defaultCostType: "indirect", requiresDepartment: true },
  { id: "vehicle_maintenance", label: "Vehicle & Maintenance", defaultCostType: "indirect", requiresDepartment: false },
  { id: "bank_charges", label: "Bank Charges", defaultCostType: "indirect", requiresDepartment: false },
  { id: "other", label: "Other", defaultCostType: "indirect", requiresDepartment: false },
];

export const EXPENSE_CATEGORY_MAP: Record<LedgerCategoryId, LedgerCategoryConfig> = EXPENSE_CATEGORIES.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {} as Record<LedgerCategoryId, LedgerCategoryConfig>);
