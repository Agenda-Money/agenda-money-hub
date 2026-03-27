import { useQuery } from "@tanstack/react-query";
import { getAdminAnalytics } from "@/lib/api";

export interface AnalyticsDashboardData {
  summary: {
    disbursedToday: { amount: number; count: number; change: number };
    loanBook: { volume: number; percentage: number; change: number; status: string };
    portfolioAtRisk: { volume: number; percentage: number; change: number; status: string };
    collectionRate: { percentage: number; change: number; status: string };
    overdueLoans: { count: number; change: number; status: string };
    activeLoans?: { count: number; change: number }; // Added for trend support if backend adds it
    disbursedWeek: { amount: number; count: number };
    principalTrend: number[];
    graduationRate: number;
    activeAgents: number;
    totalActiveLoans: number;
    liquidityPercentage: number;
    systemStatus: string;
    averageTicket: number;
  };
  growth: any[];
  distribution: {
    totalSignups: number;
    tiers: any[];
    regions: any[];
  };
  liquidity: any[];
  genderDistribution: any[];
  loanPurposeDistribution: any[];
  disbursementPerNetwork: any[];
  repaymentChannelBreakdown: any[];
  writeOffs: { count: number; volume: number };
  retentionRate: { byTier: any[]; average: number };
  tierBreakdowns: any[];
  defaultRate: { count: number; totalDue: number; percentage: number };
  collectionRate: { repaidAfterOverdue: number; totalOverdue: number; percentage: number };
  overdueLoans: { count: number };
}

export const useAnalyticsDashboard = () => {
  return useQuery<AnalyticsDashboardData>({
    queryKey: ["admin", "analytics"],
    queryFn: async () => {
      const response = await getAdminAnalytics();
      return response.data || response;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
