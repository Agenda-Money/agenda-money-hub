import { Users, TrendingDown, BookOpen } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentLoansTable } from "@/components/dashboard/RecentLoansTable";
import { PendingApprovals } from "@/components/dashboard/PendingApprovals";
import { LoanTrendsChart } from "@/components/dashboard/LoanTrendsChart";
import { DashboardSkeleton } from "@/components/layout/DashboardSkeleton";
import { normalizeStatsResponse, type DashboardStats } from "@/lib/utils";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export default function Dashboard() {
  const { data: responseData, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("/api/admin/dashboard/stats");
      return res.data;
    },
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

  return (
    <div className="space-y-6">
      {/* Compact Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Portfolio snapshot</p>
        </div>
      </div>

      {/* Primary Hero Cards - Top 3 Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Loan Book"
          value={data.loanBook === "N/A" ? "N/A" : `₵${data.loanBook}`}
          icon={BookOpen}
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatsCard
          title="Active Loans"
          value={data.activeLoans}
          icon={Users}
          trend={{ value: 8.2, isPositive: true }}
        />
        <StatsCard
          title="Default Rate"
          value={data.defaultRate === "N/A" ? "N/A" : data.defaultRate}
          icon={TrendingDown}
          trend={{ value: 0.5, isPositive: false }}
        />
      </div>

      {/* Hero Graph - Disbursement vs Repayment */}
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
