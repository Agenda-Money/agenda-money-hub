import { Users, TrendingDown, BookOpen, Percent, Calendar, DollarSign, Layers, PieChart } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentLoansTable } from "@/components/dashboard/RecentLoansTable";
import { PendingApprovals } from "@/components/dashboard/PendingApprovals";
import { LoanTrendsChart } from "@/components/dashboard/LoanTrendsChart";
import { TierDistributionChart } from "@/components/dashboard/TierDistributionChart";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface DashboardStats {
  loanBook: string;
  activeLoans: string;
  repaymentEfficiency: string;
  defaultRate: string;
  totalLoansCumulative: string;
  totalDisbursedCumulative: string;
  disbursedThisMonth: string;
  avgLoanSize: string;
  interestIncome: string;
  feeIncome: string;
  lossDefaults: string;
}

export default function Dashboard() {
  const { data: responseData, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("/api/admin/dashboard/stats");
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">Loading dashboard data...</div>
      </DashboardLayout>
    );
  }

  // Normalize API response: support wrapped { success, data }, { data }, or direct stats object.
  let stats: DashboardStats | undefined;
  if (responseData && typeof responseData === "object") {
    // Case 1: explicit success wrapper { success: boolean, data?: DashboardStats }
    if ("success" in responseData) {
      const wrapped = responseData as { success: boolean; data?: DashboardStats | null };
      if (wrapped.success && wrapped.data) {
        stats = wrapped.data;
      }
    } else if ("data" in responseData) {
      // Case 2: simple wrapper { data: DashboardStats }
      const wrapped = responseData as { data: DashboardStats | null | undefined };
      if (wrapped.data) {
        stats = wrapped.data;
      }
    } else {
      // Case 3: direct stats object
      stats = responseData as DashboardStats;
    }
  }

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
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's your lending overview.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Loan Book"
          value={data.loanBook !== "N/A" ? `₵${data.loanBook}` : "N/A"}
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
          title="Repayment vs Disbursement"
          value={data.repaymentEfficiency !== "N/A" ? data.repaymentEfficiency : "N/A"}
          icon={Percent}
          trend={{ value: 2.1, isPositive: true }}
        />
        <StatsCard
          title="Default Rate"
          value={data.defaultRate !== "N/A" ? data.defaultRate : "N/A"}
          icon={TrendingDown}
          trend={{ value: 0.5, isPositive: false }}
        />
      </div>

      {/* Performance Overview */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Performance Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Total Loans (Cumulative)"
            value={data.totalLoansCumulative}
            icon={Layers}
            trend={{ value: 15.3, isPositive: true }}
          />
          <StatsCard
            title="Total Disbursed (All Time)"
            value={data.totalDisbursedCumulative !== "N/A" ? `₵${data.totalDisbursedCumulative}` : "N/A"}
            icon={DollarSign}
            trend={{ value: 10.8, isPositive: true }}
          />
          <StatsCard
            title="Disbursed This Month"
            value={data.disbursedThisMonth !== "N/A" ? `₵${data.disbursedThisMonth}` : "N/A"}
            icon={Calendar}
            trend={{ value: 5.2, isPositive: true }}
          />
        </div>
      </div>

      {/* Financial Overview */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Financial Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <StatsCard
            title="Avg. Loan Size"
            value={data.avgLoanSize !== "N/A" ? `₵${data.avgLoanSize}` : "N/A"}
            icon={DollarSign}
            trend={{ value: 2.5, isPositive: true }}
          />
          <StatsCard
            title="Interest Income"
            value={data.interestIncome !== "N/A" ? `₵${data.interestIncome}` : "N/A"}
            icon={TrendingDown}
            trend={{ value: 12.0, isPositive: true }}
          />
           <StatsCard
            title="Fee Income"
            value={data.feeIncome !== "N/A" ? `₵${data.feeIncome}` : "N/A"}
            icon={PieChart}
            trend={{ value: 8.5, isPositive: true }}
          />
           <StatsCard
            title="Loss (Defaults)"
            value={data.lossDefaults !== "N/A" ? `₵${data.lossDefaults}` : "N/A"}
            icon={TrendingDown}
            trend={{ value: 1.2, isPositive: false }}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LoanTrendsChart />
        </div>
        <TierDistributionChart />
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentLoansTable />
        </div>
        <PendingApprovals />
      </div>
    </div>
  );
}
