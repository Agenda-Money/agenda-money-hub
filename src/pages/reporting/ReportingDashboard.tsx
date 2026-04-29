import React from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { MoMDisbursementCard } from "@/components/dashboard/MoMDisbursementCard";
import { DashboardSkeleton } from "@/components/layout/DashboardSkeleton";
import { formatAmount, formatNumber } from "@/lib/utils";
import { useReportingDashboard } from "@/hooks/useReportingDashboard";
import { BookOpen, TrendingDown, Users, AlertTriangle, Calendar, RefreshCcw } from "lucide-react";
import { useDateFilter } from "@/hooks/useDateFilter";

export default function ReportingDashboard() {
  const { data, loading, error } = useReportingDashboard();
  const { preset, startDate, endDate, applyPreset, setStartDate, setEndDate } = useDateFilter();

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
        <p className="text-muted-foreground">{error}</p>
        <button className="text-primary hover:underline" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  const {
    allTimeDisbursement,
    repaymentRate,
    defaultRate,
    retentionRate,
    disbursementToday,
    disbursementThisWeek,
    momDisbursements
  } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground">Reporting Summary</h1>
          <p className="text-sm font-bold text-muted-foreground mt-1 tracking-tight italic">
            Read-only portfolio metrics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="All-Time Disbursement"
          value={`GH₵ ${formatAmount(allTimeDisbursement)}`}
          icon={BookOpen}
        />
        <StatsCard
          title="Disbursement Today"
          value={`GH₵ ${formatAmount(disbursementToday)}`}
          icon={Calendar}
        />
        <StatsCard
          title="Disbursement This Week"
          value={`GH₵ ${formatAmount(disbursementThisWeek)}`}
          icon={Calendar}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Repayment Rate *"
          value={`${repaymentRate.toFixed(1)}%`}
          icon={TrendingDown}
        />
        <StatsCard
          title="Default Rate *"
          value={`${defaultRate.toFixed(1)}%`}
          icon={AlertTriangle}
        />
        <StatsCard
          title="Retention Rate *"
          value={`${retentionRate.toFixed(1)}%`}
          icon={RefreshCcw}
        />
      </div>

      <div className="text-xs text-muted-foreground italic">
        * Michael-excluded calculation
      </div>

      {/* MoM Disbursement Line Chart */}
      <MoMDisbursementCard
        data={momDisbursements.map((d: any) => ({
            month: d.month,
            volume: d.amount,
            count: d.count
        }))}
        preset={preset}
        startDate={startDate}
        endDate={endDate}
        applyPreset={applyPreset}
        setStartDate={setStartDate}
        setEndDate={setEndDate}
      />
    </div>
  );
}
