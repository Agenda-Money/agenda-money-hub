import React from "react";
// Old layout elements to keep:
import { RecentLoansTable } from "@/components/dashboard/RecentLoansTable";
import { PendingApprovals } from "@/components/dashboard/PendingApprovals";
import { RecentRepaymentsWidget } from "@/components/dashboard/RecentRepaymentsWidget";
import { DashboardSkeleton } from "@/components/layout/DashboardSkeleton";
import { useSocket } from "@/hooks/useSocket";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Users, TrendingDown, BookOpen, AlertTriangle } from "lucide-react";
import { formatAmount, formatNumber } from "@/lib/utils";

// New hooks and types
import { useQuery } from "@tanstack/react-query";
import { useDateFilter } from "@/hooks/useDateFilter";
import api from "@/lib/api";
import { SummaryData, PerformanceData, VolumeData } from "@/types/analytics";

// New cards
import { MoMDisbursementCard } from "@/components/dashboard/MoMDisbursementCard";

export default function Dashboard() {
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";
  const { preset, startDate, endDate, applyPreset, setStartDate, setEndDate } = useDateFilter();

  // 1. Batch API fetches for Summary and Performance (Mounted once or on refetch)
  const { data: dashboardData, isLoading: isDashboardLoading, refetch } = useQuery({
    queryKey: ["dashboard-core"],
    queryFn: async () => {
      const [summaryRes, perfRes] = await Promise.all([
        api.get("/api/admin/analytics/summary"),
        api.get("/api/admin/analytics/performance"),
      ]);

      return {
        summary: summaryRes.data.data as SummaryData,
        performance: perfRes.data.data as PerformanceData,
      };
    },
  });

  // 2. Volume API triggered by date filter
  const { data: volumeData } = useQuery({
    queryKey: ["dashboard-volume", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      });
      const res = await api.get(`/api/admin/analytics/volume?${params}`);
      return res.data.data as VolumeData;
    },
  });

  // WebSocket integration for real-time updates
  useSocket(wsUrl, (message) => {
    if (message?.type === "NEW_APPLICATION" || message?.type === "KYC_VERIFIED_SUCCESS") {
      refetch();
    }
  });

  if (isDashboardLoading || !dashboardData) {
    return <DashboardSkeleton />;
  }

  const { summary, performance } = dashboardData;
  const momGrowth = volumeData?.momDisbursementGrowth || [];

  return (
    <div className="space-y-6">
      {/* Compact Page Header */}
      {/* Compact Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground">Admin Dashboard</h1>
          <p className="text-sm font-bold text-muted-foreground mt-1 uppercase tracking-tight italic">Real-time portfolio health & live pipeline</p>
        </div>
      </div>

      {/* Top 4 Hero Metrics (Restored per feedback) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Loan Book"
          value={`₵ ${formatAmount(summary.loanBook.value ?? 0)}`}
          icon={BookOpen}
        />
        <StatsCard
          title="Active Loans"
          value={formatNumber(summary.activeLoans?.count ?? 0)}
          icon={Users}
        />
        <StatsCard
          title="Repayment Rate"
          value={performance.repaymentRate?.rate != null ? `${performance.repaymentRate.rate.toFixed(1)}%` : "0%"}
          icon={TrendingDown}
        />
        <StatsCard
          title="Overdue"
          value={formatNumber(summary.overdueLoans?.count ?? 0)}
          icon={AlertTriangle}
        />
      </div>

      {/* Row 1: MoM Disbursement Growth */}
      <MoMDisbursementCard 
        data={momGrowth}
        preset={preset}
        startDate={startDate}
        endDate={endDate}
        applyPreset={applyPreset}
        setStartDate={setStartDate}
        setEndDate={setEndDate}
      />

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
