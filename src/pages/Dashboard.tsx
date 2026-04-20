import { Users, TrendingDown, BookOpen, AlertTriangle } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentLoansTable } from "@/components/dashboard/RecentLoansTable";
import { PendingApprovals } from "@/components/dashboard/PendingApprovals";
import { RecentRepaymentsWidget } from "@/components/dashboard/RecentRepaymentsWidget";
import { LoanTrendsChart } from "@/components/dashboard/LoanTrendsChart";
import { DashboardSkeleton } from "@/components/layout/DashboardSkeleton";
import { normalizeStatsResponse, formatAmount, formatNumber } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";

import { useQuery } from "@tanstack/react-query";
import { getAdminDashboardStats } from "@/lib/api";
import { useAnalyticsDashboard } from "@/hooks/useAnalyticsDashboard";

export default function Dashboard() {
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

  const { data: responseData, isLoading: isStatsLoading, refetch } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await getAdminDashboardStats();
      return res;
    },
  });

  const { data: analyticsData, isLoading: isAnalyticsLoading } = useAnalyticsDashboard();

  const isLoading = isStatsLoading || isAnalyticsLoading;

  // WebSocket integration for real-time updates
  useSocket(wsUrl, (message) => {
    if (message?.type === "NEW_APPLICATION" || message?.type === "KYC_VERIFIED_SUCCESS") {
      // Refetch dashboard stats when new events occur
      refetch();
    }
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const stats = normalizeStatsResponse(responseData);

  const data = stats ?? {
    loanBook: "N/A",
    activeLoans: "N/A",
    repaymentEfficiency: "N/A",
    repaymentRate: "N/A",
    defaultRate: "N/A",
    totalLoansCumulative: "N/A",
    totalDisbursedCumulative: "N/A",
    disbursedThisMonth: "N/A",
    avgLoanSize: "N/A",
    interestIncome: "N/A",
    feeIncome: "N/A",
    lossDefaults: "N/A",
    overdueLoans: "N/A",
  };

  // Additional stats from the "War Room" requirements
  const repaymentRate = responseData?.repaymentRate ?? data.repaymentEfficiency;
  const overdueCount = responseData?.overdueLoans ?? 0;

  return (
    <div className="space-y-6">
      {/* Compact Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time portfolio health & live pipeline</p>
        </div>
      </div>

      {/* Primary Hero Cards - Top 4 Key Metrics for "The War Room" */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Loan Book"
          value={`₵ ${formatAmount(data.loanBook ?? 0)}`}
          icon={BookOpen}
        />
        <StatsCard
          title="Active Loans"
          value={formatNumber(data.activeLoans ?? 0)}
          icon={Users}
        />
        <StatsCard
          title="Repayment Rate"
          value={`${formatAmount(data.repaymentRate ?? 0)}%`}
          icon={TrendingDown}
        />
        <StatsCard
          title="Overdue"
          value={formatNumber(data.overdueLoans ?? overdueCount ?? 0)}
          icon={AlertTriangle}
        />
      </div>

      {/* Hero Graph - Disbursement vs Repayment (Liquidity Tracker) */}
      <LoanTrendsChart />

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <RecentLoansTable />
        </div>
        <div className="space-y-4 h-full flex flex-col">
          <PendingApprovals />
          <div className="flex-1 min-h-[300px]">
            <RecentRepaymentsWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
