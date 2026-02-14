export const LOAN_PURPOSES = ["Business", "Education", "Medical", "Home", "Other"];

// Tier Configuration
export type TierConfig = {
  level: number;
  minAmount: number;
  maxAmount: number;
  maxTenure: number;
  amounts?: number[];
  tenures?: number[];
};

export const TIERS: TierConfig[] = [
  { level: 1, minAmount: 50, maxAmount: 300, maxTenure: 14 },
  { level: 2, minAmount: 50, maxAmount: 350, maxTenure: 21 },
  { level: 3, minAmount: 50, maxAmount: 400, maxTenure: 21 },
  { level: 4, minAmount: 50, maxAmount: 500, maxTenure: 30 },
  { level: 5, minAmount: 50, maxAmount: 550, maxTenure: 30 },
  { level: 6, minAmount: 50, maxAmount: 600, maxTenure: 30 },
  { level: 7, minAmount: 50, maxAmount: 700, maxTenure: 30 },
  { level: 8, minAmount: 50, maxAmount: 800, maxTenure: 30 },
  { level: 9, minAmount: 50, maxAmount: 900, maxTenure: 30 },
  { level: 10, minAmount: 50, maxAmount: 1100, maxTenure: 30 },
];

// Helper to get tier by level
export const getTierByLevel = (level: number): TierConfig => {
  return TIERS.find(t => t.level === level) || TIERS[0];
};

// Helper to create tier limits record for backward compatibility
export const TIER_LIMITS: Record<number, TierConfig> = TIERS.reduce((acc, tier) => {
  acc[tier.level] = tier;
  return acc;
}, {} as Record<number, TierConfig>);
