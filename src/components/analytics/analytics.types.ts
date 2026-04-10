/** DATE & UI TYPES **/
export interface DateRange {
  from?: string;
  to?: string;
}

export type CardStatus = 'green' | 'red' | 'neutral' | 'amber';

export interface Trend {
  direction: 'up' | 'down' | 'flat';
  value: string;
  label: string;
}

export interface Badge {
  text: string;
  variant: 'green' | 'red' | 'amber' | 'neutral';
}

/** API RESPONSES **/

export interface AnalyticsSummaryResponse {
  loanBook: { total: number };
  activeLoans: { count: number };
  overdueLoans: { count: number };
  disbursements: {
    today: { count: number; totalGHS: number };
    thisWeek: { count: number; totalGHS: number };
    allTime: { count: number; totalGHS: number };
  };
  userActivity: {
    activeUsers: number;
    dormantUsers: number;
    newUsersLast30Days: number;
    churnRisk: number;
  };
}

export interface AnalyticsPerformanceResponse {
  repaymentRate: { overall?: number; byTier?: Array<{ tier: number; total: number; repaid: number; rate: number }> };
  defaultRate: { overall?: number; byTier?: Array<{ tier: number; total: number; defaulted: number; rate: number }> };
  collectionRate: { overall?: number; byTier?: Array<{ tier: number; total: number; repaid: number; rate: number }> };
  approvalRate: { 
    overall?: { approvalRate: number; pendingCount: number; totalDecided: number; approved: number; rejected: number }; 
    byTier?: Array<{ tier: number; total: number; approved: number; rejected: number; pending: number; approvalRate: number }> 
  };
  activeUsers?: { count: number };
  portfolioAtRisk: { 
    PAR15?: { overall?: number }; 
  };
  averageLoanSize: { overall?: number; byTier?: Array<{ tier: number; avgLoanSize: number }> };
}

export interface AnalyticsDistributionResponse {
  signupGrowth: Array<{ month: string; role?: string; isGraduated?: boolean; count: number; edgeCount?: number; graduatedCount?: number }>; // allow pre-grouped structure if backend sends edgeCount
  tierDistribution: { totalUsers: number; byTier: Array<{ tier: number; userCount: number; percentage: number; avgLoanSize: number }> };
  geographicDistribution: Array<{ region: string; userCount: number; repaymentRate: number }>;
}

export interface TelcoDisbursementRow {
  network: string;
  loanCount: number;
  volumeGHS: number;
  sharePercent: number;
}

export interface AnalyticsVolumeResponse {
  disbursementVsCollection: Array<{ month: string; disbursed: number; collected: number; net?: number }>;
  repaymentChannels: {
    channels: Array<{ method: "app" | "ussd" | "other"; transactionCount: number; volumeGHS: number; percentage: number }>;
    total: { transactionCount: number; volumeGHS: number } | null;
  };
  /** Populated by normalizer from /volume and/or legacy /analytics */
  disbursementByTelco?: TelcoDisbursementRow[];
}
