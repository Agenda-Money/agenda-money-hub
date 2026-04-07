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
  { level: 1,  minAmount: 50,   maxAmount: 300,  maxTenure: 14 },
  { level: 2,  minAmount: 100,  maxAmount: 350,  maxTenure: 14 },
  { level: 3,  minAmount: 150,  maxAmount: 450,  maxTenure: 14 },
  { level: 4,  minAmount: 200,  maxAmount: 500,  maxTenure: 14 },
  { level: 5,  minAmount: 250,  maxAmount: 600,  maxTenure: 14 },
  { level: 6,  minAmount: 300,  maxAmount: 650,  maxTenure: 14 },
  { level: 7,  minAmount: 350,  maxAmount: 750,  maxTenure: 14 },
  { level: 8,  minAmount: 400,  maxAmount: 850,  maxTenure: 14 },
  { level: 9,  minAmount: 500,  maxAmount: 900,  maxTenure: 14 },
  { level: 10, minAmount: 500,  maxAmount: 1100, maxTenure: 14 },
  { level: 11, minAmount: 600,  maxAmount: 1300, maxTenure: 14 },
  { level: 12, minAmount: 700,  maxAmount: 1450, maxTenure: 14 },
  { level: 13, minAmount: 800,  maxAmount: 1600, maxTenure: 14 },
  { level: 14, minAmount: 900,  maxAmount: 1700, maxTenure: 14 },
  { level: 15, minAmount: 1000, maxAmount: 1800, maxTenure: 14 },
  { level: 16, minAmount: 1100, maxAmount: 1900, maxTenure: 14 },
  { level: 17, minAmount: 1300, maxAmount: 2000, maxTenure: 14 },
  { level: 18, minAmount: 1300, maxAmount: 2000, maxTenure: 14 },
  { level: 19, minAmount: 1300, maxAmount: 2000, maxTenure: 14 },
  { level: 20, minAmount: 1300, maxAmount: 2000, maxTenure: 14 },
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
