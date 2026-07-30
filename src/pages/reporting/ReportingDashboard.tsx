import React from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { MoMDisbursementCard } from "@/components/dashboard/MoMDisbursementCard";
import { DashboardSkeleton } from "@/components/layout/DashboardSkeleton";
import { formatAmount, formatNumber, cn } from "@/lib/utils";
import { useReportingDashboard } from "@/hooks/useReportingDashboard";
import { BookOpen, TrendingDown, Users, UserPlus, AlertTriangle, Calendar, RefreshCcw, TrendingUp } from "lucide-react";
import { useDateFilter } from "@/hooks/useDateFilter";
import { fetchCohortRepayment } from "@/lib/reportingApi";
import { useQuery } from "@tanstack/react-query";
import { CohortRepaymentCard } from "@/components/dashboard/CohortRepaymentCard";
import { useCohortRepayment } from "@/hooks/useCohortRepayment";

export default function ReportingDashboard() {
  const { data, loading, error, refresh } = useReportingDashboard();
  const { preset, startDate, endDate, applyPreset, setStartDate, setEndDate } = useDateFilter();
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());
  const [cohortRange, setCohortRange] = React.useState<'3' | '6' | 'all'>('all');

  const { data: cohortRes, isLoading: cohortLoading, refetch: refetchCohort } = useCohortRepayment({
    platform: 'reporting',
    monthsBack: cohortRange === 'all' ? undefined : parseInt(cohortRange)
  });

  const cohortData = cohortRes?.data?.cohorts || (Array.isArray(cohortRes?.data) ? cohortRes.data : []);
  const cohortSummary = cohortRes?.data?.summary || null;

  React.useEffect(() => {
    if (data) {
      setLastUpdated(new Date());
    }
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
    activeUsers = { count: 0 },
    todayDisbursement = { total: 0, count: 0 },
    weekDisbursement = { total: 0, count: 0 },
    newSignupsToday = { count: 0 },
    newSignupsThisWeek = { count: 0 },
    repaymentRate = 0,
    defaultRate = 0,
    retentionRate = 0,
    momDisbursements = []
  } = data;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight leading-tight">
              Reporting Summary
            </h1>
            <div className="px-2 py-0.5 sm:py-1 bg-success/10 border border-success/20 rounded text-[9px] sm:text-[10px] font-black text-success uppercase tracking-widest animate-pulse whitespace-nowrap">
              System Live
            </div>
          </div>
          <p className="text-xs sm:text-sm font-bold text-muted-foreground tracking-tight italic opacity-70">
            Last updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        
        <button 
          onClick={() => {
            refresh();
            refetchCohort();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-xl text-sm font-bold transition-all active:scale-95"
        >
          <RefreshCcw className={cn("h-4 w-4", (loading || cohortLoading) && "animate-spin")} />
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatsCard
          title="Loan Book"
          value={`GHS ${formatAmount(loanBook?.total)}`}
          icon={TrendingDown}
          isLive
        />
        <StatsCard
          title="Active Users"
          value={formatNumber(cohortSummary?.activeUsers?.count ?? activeUsers?.count)}
          description={cohortSummary?.activeUsers?.period ?? activeUsers?.period ?? "Unique users"}
          icon={Users}
          isLive
        />
        <StatsCard
          title="Disbursement Today"
          value={`GHS ${formatAmount(todayDisbursement?.total)}`}
          description={`${formatNumber(todayDisbursement?.count)} loans today`}
          icon={Calendar}
          isLive
        />
        <StatsCard
          title="Disbursement This Week"
          value={`GHS ${formatAmount(weekDisbursement?.total)}`}
          description={`${formatNumber(weekDisbursement?.count)} loans this week`}
          icon={Calendar}
          isLive
        />
        <StatsCard
          title="New Signups Today"
          value={formatNumber(newSignupsToday?.count)}
          description={newSignupsToday?.period || "Users registered today"}
          icon={UserPlus}
          isLive
        />
        <StatsCard
          title="New Signups This Week"
          value={formatNumber(newSignupsThisWeek?.count)}
          description={newSignupsThisWeek?.period || "Users registered this week"}
          icon={UserPlus}
          isLive
        />
        <StatsCard
          title="Default Rate"
          value={`${(defaultRate || 0).toFixed(1)}%`}
          description="% of active customers (last 12mo) 120+ days overdue"
          icon={AlertTriangle}
          className="border-destructive/20"
          isLive
        />
        <StatsCard
          title="Retention Rate"
          value={`${(retentionRate || 0).toFixed(1)}%`}
          icon={RefreshCcw}
          isLive
        />
      </div>

      <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-50 flex items-center gap-2">
        <div className="w-1 h-1 rounded-full bg-success animate-pulse" />
        Data refreshes automatically every 15 minutes
      </div>

      {/* Cohort Repayment Analysis */}
      <CohortRepaymentCard 
        data={cohortData} 
        summary={cohortSummary as any} 
        isLoading={cohortLoading}
        onRefresh={() => refetchCohort()}
        timeRange={cohortRange}
        onTimeRangeChange={setCohortRange}
      />

      {/* MoM Disbursement Line Chart */}
      <div className="rounded-3xl overflow-hidden shadow-2xl border border-border/40">
        <MoMDisbursementCard
          data={(momDisbursements || [])
            .map((d: any, idx: number, arr: any[]) => {
              // If growth is not provided or is exactly 0, try calculating it manually from the filtered array
              let calculatedValueGrowth = d.momValueGrowth ?? 0;
              let calculatedCountGrowth = d.momCountGrowth ?? 0;
              
              if (idx > 0 && calculatedValueGrowth === 0) {
                const prev = arr[idx - 1];
                if (prev.total > 0) {
                  calculatedValueGrowth = ((d.total - prev.total) / prev.total) * 100;
                }
              }
              
              if (idx > 0 && calculatedCountGrowth === 0) {
                const prev = arr[idx - 1];
                if (prev.count > 0) {
                  calculatedCountGrowth = ((d.count - prev.count) / prev.count) * 100;
                }
              }

              return {
                month: `${d.year}-${String(d.month).padStart(2, '0')}`,
                value: d.total,
                count: d.count,
                momValueGrowth: calculatedValueGrowth,
                momCountGrowth: calculatedCountGrowth
              };
          })}
          preset={preset}
          startDate={startDate}
          endDate={endDate}
          applyPreset={applyPreset}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          currency="GHS"
        />
      </div>
    </div>
  );
}
