export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ── Summary ────────────────────────────────────────────────────────────────
export interface SummaryData {
  loanBook: {
    value:    number;
    count:    number;
    total:    number;
    currency: string;
  };
  activeLoans:  { count: number };
  overdueLoans: { count: number };
  disbursements: {
    today:    { count: number; totalGHS: number };
    thisWeek: { count: number; totalGHS: number };
    allTime:  { count: number; totalGHS: number };
  };
  allTimeDisbursement: {
    totalCount: number;
    totalValue: number;
  };
  activeCustomers: {
    count:      number;
    windowDays: number;
  };
  userActivity: {
    activeUsers:        number;
    dormantUsers:       number;
    newUsersLast30Days: number;
  };
  generatedAt: string;
}

// ── Performance ────────────────────────────────────────────────────────────
export interface TierRate {
  tier:  number;
  total: number;
  rate:  number;
}

export interface PerformanceData {
  repaymentRate: {
    rate:         number;
    overall:      number;
    dueLoanCount: number;
    repaidCount:  number;
    windowDays:   number;
    byTier:       Array<TierRate & { repaid: number }>;
  };
  retentionRate: {
    retentionRate:     number;
    churnRate:         number;
    eligibleCustomers: number;
    retainedCustomers: number;
  };
  churnRate:      number;
  defaultRate:    { byTier: Array<TierRate & { defaulted: number }> };
  collectionRate: { byTier: Array<TierRate & { repaid: number }> };
  approvalRate: {
    byTier: Array<TierRate & {
      approved:     number;
      rejected:     number;
      pending:      number;
      approvalRate: number;
    }>;
  };
  activeUsers: { count: number };
  portfolioAtRisk: {
    totalOutstandingGHS: number;
    PAR3:  { overall: number; amount: number };
    PAR15: { overall: number; amount: number };
    PAR30: { overall: number; amount: number };
  };
  averageLoanSize: {
    overall: number;
    byTier:  Array<{ tier: number; avgLoanSize: number }>;
  };
}

// ── Volume ─────────────────────────────────────────────────────────────────
export interface MomDisbursementPoint {
  month:          string;
  value:          number;
  count:          number;
  momValueGrowth: number | null;
  momCountGrowth: number | null;
}

export interface VolumeData {
  disbursementVsCollection: Array<{
    month:          string;
    disbursed:      number;
    disbursedCount: number;
    collected:      number;
    net:            number;
    momValueGrowth: number | null;
    momCountGrowth: number | null;
  }>;
  momDisbursementGrowth: MomDisbursementPoint[];
  repaymentChannels: {
    channels: Array<{
      method:           string;
      transactionCount: number;
      volumeGHS:        number;
      percentage:       number;
    }>;
    total: { transactionCount: number; volumeGHS: number };
  };
}

// ── Referrals ──────────────────────────────────────────────────────────────
export interface ReferralAnalyticsData {
  conversionRate:    number;
  totalShares:       number;
  totalApplications: number;
  momShares:         Array<{ month: string; count: number }>;
}

export interface AdminReferralAnalyticsData {
  funnel: {
    totalShares:       number;
    totalApplications: number;
    totalRegistrations: number;
    totalLoans:        number;
    conversionRate:    number;
  };
  topReferrers: Array<{
    msisdn:           string;
    name:             string | null;
    nodeCode:         string | null;
    totalShares:      number;
    totalConversions: number;
  }>;
  momTrend: Array<{ month: string; shares: number; conversions: number }>;
  channelBreakdown: Array<{ channel: string; count: number }>;
}
