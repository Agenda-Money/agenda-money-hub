import { Users, TrendingDown, BookOpen, Percent, Calendar, DollarSign, Layers, PieChart } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentLoansTable } from "@/components/dashboard/RecentLoansTable";
import { PendingApprovals } from "@/components/dashboard/PendingApprovals";
import { LoanTrendsChart } from "@/components/dashboard/LoanTrendsChart";
import { TierDistributionChart } from "@/components/dashboard/TierDistributionChart";

export default function Dashboard() {
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
          value="₵600K"
          icon={BookOpen}
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatsCard
          title="Active Loans"
          value="1,847"
          icon={Users}
          trend={{ value: 8.2, isPositive: true }}
        />
        <StatsCard
          title="Repayment vs Disbursement"
          value="75%"
          icon={Percent}
          trend={{ value: 2.1, isPositive: true }}
        />
        <StatsCard
          title="Default Rate"
          value="3.2%"
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
            value="5,420"
            icon={Layers}
            trend={{ value: 15.3, isPositive: true }}
          />
          <StatsCard
            title="Total Disbursed (All Time)"
            value="₵12.5M"
            icon={DollarSign}
            trend={{ value: 10.8, isPositive: true }}
          />
          <StatsCard
            title="Disbursed This Month"
            value="₵450K"
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
            value="₵450.00"
            icon={DollarSign}
            trend={{ value: 2.5, isPositive: true }}
          />
          <StatsCard
            title="Interest Income"
            value="₵45,200"
            icon={TrendingDown}
            trend={{ value: 12.0, isPositive: true }}
          />
           <StatsCard
            title="Fee Income"
            value="₵12,800"
            icon={PieChart}
            trend={{ value: 8.5, isPositive: true }}
          />
           <StatsCard
            title="Loss (Defaults)"
            value="₵3,200"
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
