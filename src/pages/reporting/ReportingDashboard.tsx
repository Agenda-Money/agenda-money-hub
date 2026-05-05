import React from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { MoMDisbursementCard } from "@/components/dashboard/MoMDisbursementCard";
import { DashboardSkeleton } from "@/components/layout/DashboardSkeleton";
import { formatAmount, formatNumber, cn } from "@/lib/utils";
import { useReportingDashboard } from "@/hooks/useReportingDashboard";
import { BookOpen, TrendingDown, Users, AlertTriangle, Calendar, RefreshCcw } from "lucide-react";
import { useDateFilter } from "@/hooks/useDateFilter";

export default function ReportingDashboard() {
  const { data, loading, error, refresh } = useReportingDashboard();
  const { preset, startDate, endDate, applyPreset, setStartDate, setEndDate } = useDateFilter();
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());

  React.useEffect(() => {
    if (data) setLastUpdated(new Date());
  }, [data]);

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
        <p className="text-muted-foreground font-medium">{error}</p>
        <button 
          className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-bold hover:opacity-90 transition-opacity" 
          onClick={() => refresh()}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const {
    loanBook = { total: 0, count: 0 },
    allTimeDisbursement = { total: 0, count: 0 },
    todayDisbursement = { total: 0, count: 0 },
    weekDisbursement = { total: 0, count: 0 },
    repaymentRate = 0,
    defaultRate = 0,
    retentionRate = 0,
    momDisbursements = []
  } = data;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight">Reporting Summary</h1>
            <div className="px-2 py-1 bg-success/10 border border-success/20 rounded text-[10px] font-black text-success uppercase tracking-widest animate-pulse">
              System Live
            </div>
          </div>
          <p className="text-sm font-bold text-muted-foreground mt-2 tracking-tight italic opacity-70">
            Read-only portfolio metrics • Last updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        
        <button 
          onClick={() => refresh()}
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-xl text-sm font-bold transition-all active:scale-95"
        >
          <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Loan Book"
          value={`GH₵ ${formatAmount(loanBook?.total)}`}
          description={`${formatNumber(loanBook?.count)} active loans`}
          icon={TrendingDown}
          isLive
        />
        <StatsCard
          title="All-Time Disbursement"
          value={`GH₵ ${formatAmount(allTimeDisbursement?.total)}`}
          description={`${formatNumber(allTimeDisbursement?.count)} total loans`}
          icon={BookOpen}
          isLive
        />
        <StatsCard
          title="Disbursement Today"
          value={`GH₵ ${formatAmount(todayDisbursement?.total)}`}
          description={`${formatNumber(todayDisbursement?.count)} loans today`}
          icon={Calendar}
          isLive
        />
        <StatsCard
          title="Disbursement This Week"
          value={`GH₵ ${formatAmount(weekDisbursement?.total)}`}
          description={`${formatNumber(weekDisbursement?.count)} loans this week`}
          icon={Calendar}
          isLive
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard
          title="Repayment Rate"
          value={`${repaymentRate.toFixed(1)}%`}
          icon={TrendingDown}
          className="border-success/20"
          isLive
        />
        <StatsCard
          title="Default Rate"
          value={`${defaultRate.toFixed(1)}%`}
          icon={AlertTriangle}
          className="border-destructive/20"
          isLive
        />
        <StatsCard
          title="Retention Rate"
          value={`${retentionRate.toFixed(1)}%`}
          icon={RefreshCcw}
          isLive
        />
      </div>

      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-50">
        Data refreshes automatically every 15 minutes
      </div>

      {/* MoM Disbursement Line Chart */}
      <div className="rounded-3xl overflow-hidden shadow-2xl border border-border/40">
        <MoMDisbursementCard
          data={(momDisbursements || []).map((d: any) => ({
              month: `${d.year}-${String(d.month).padStart(2, '0')}`,
              value: d.total,
              count: d.count,
              momValueGrowth: d.momValueGrowth ?? 0,
              momCountGrowth: d.momCountGrowth ?? 0
          }))}
          preset={preset}
          startDate={startDate}
          endDate={endDate}
          applyPreset={applyPreset}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
        />
      </div>
    </div>
  );
}
