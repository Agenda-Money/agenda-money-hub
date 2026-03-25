import { Users, TrendingDown, BookOpen, AlertTriangle } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentLoansTable } from "@/components/dashboard/RecentLoansTable";
import { PendingApprovals } from "@/components/dashboard/PendingApprovals";
import { LoanTrendsChart } from "@/components/dashboard/LoanTrendsChart";
import { DashboardSkeleton } from "@/components/layout/DashboardSkeleton";
import { normalizeStatsResponse, formatAmount, formatNumber } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";

import { useQuery } from "@tanstack/react-query";
import { getAdminDashboardStats } from "@/lib/api";

export default function Dashboard() {
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

  const { data: responseData, isLoading, refetch } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await getAdminDashboardStats();
      return res;
    },
  });

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

  // Fallback to defaults if stats is undefined (e.g. error) or some fields missing
  const data = stats ?? {
    loanBook: "N/A",
    activeLoans: "N/A",
    repaymentEfficiency: "N/A",
    defaultRate: "N/A",
    totalLoansCumulative: "N/A",
    totalDisbursedCumulative: "N/A",
    disbursedThisMonth: "N/A",
    avgLoanSize: "N/A",
    interestIncome: "N/A",
    feeIncome: "N/A",
    lossDefaults: "N/A",
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
          value={data.loanBook === "N/A" ? "N/A" : `₵${formatAmount(data.loanBook)}`}
          icon={BookOpen}
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatsCard
          title="Active Loans"
          value={formatNumber(data.activeLoans)}
          icon={Users}
          trend={{ value: 8.2, isPositive: true }}
        />
        <StatsCard
          title="Repayment Rate"
          value={repaymentRate === "N/A" ? "N/A" : repaymentRate}
          icon={TrendingDown}
          trend={{ value: 2.1, isPositive: true }}
        />
        <StatsCard
          title="Overdue Loans"
          value={formatNumber(overdueCount)}
          icon={AlertTriangle}
          trend={{ value: 0.5, isPositive: false }}
        />
      </div>

      {/* Hero Graph - Disbursement vs Repayment (Liquidity Tracker) */}
      <LoanTrendsChart />

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentLoansTable />
        </div>
        <PendingApprovals />
      </div>
    </div>
  );
}
