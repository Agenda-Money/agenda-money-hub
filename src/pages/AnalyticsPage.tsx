import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Activity, CalendarDays, TrendingUp, AlertTriangle, ShieldCheck, Banknote, RefreshCw } from "lucide-react";
import { KpiCard } from "@/components/analytics/KpiCard";
import { 
  SectionHead, 
  SectionError, 
  TierBreakdownTables, 
  ChartSignupGrowth, 
  ChartTierDistribution, 
  GeographicList, 
  ChartDisbColl, 
  RepaymentChannels,
  PanelHead,
  CsaPerformanceTable
} from "@/components/analytics/AnalyticsWidgets";
import {
  useSummary,
  usePerformance,
  useDistribution,
  useVolume,
  useCsaPerformance,
  useReferralAnalytics
} from "@/components/analytics/analytics.hooks";
import { ReferralAnalytics } from "@/components/analytics/ReferralAnalytics";
import { 
  safeNum, 
  fGHS, 
  fPct, 
  fCount, 
  getTrend,
  getDisbursedTodayStatus,
  getWeeklyDisbursementStatus,
  getRepaymentRateStatus,
  getCollectionRateStatus,
  getLoanBookStatus,
  getOverdueLoansStatus,
  getDefaultRateStatus,
  getPAR15Status,
  getPAR15StatusCustom,
  getApprovalRateStatus,
  getChurnStatus
} from "@/components/analytics/analytics.helpers";
import type { DateRange } from "@/components/analytics/analytics.types";

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>({});
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');

  const sum = useSummary();
  const perf = usePerformance(range);
  const dist = useDistribution();
  const vol = useVolume(range);
  const ref = useReferralAnalytics();

  const applyRange = () => setRange({ from: fromInput, to: toInput });
  const clearRange = () => { setRange({}); setFromInput(''); setToInput(''); };

  // Data helpers
  const s = sum.data;
  const p = perf.data;
  const d = dist.data;
  const v = vol.data;

  // Since backend omits `.overall` in many endpoints, we aggregate them from `byTier` when missing
  const getOverallObj = (pObj: any, numKey: string, denKey: string) => {
    if (pObj?.overall !== undefined && typeof pObj.overall === 'number') return pObj.overall;
    if (pObj?.overall?.approvalRate !== undefined) return pObj.overall.approvalRate; // specialized for approval
    if (!pObj?.byTier?.length) return 0;
    
    // Total sum in arrays
    const totalNum = pObj.byTier.reduce((acc: number, t: any) => acc + (safeNum(t[numKey])), 0);
    const totalDen = pObj.byTier.reduce((acc: number, t: any) => acc + (safeNum(t[denKey])), 0);
    return totalDen > 0 ? (totalNum / totalDen) * 100 : 0;
  };

  const overallApprovalRate = getOverallObj(p?.approvalRate, 'approved', 'total');
  const overallDefaultRate = getOverallObj(p?.defaultRate, 'defaulted', 'total');
  // the exact sum key for collection isn't known for empty array, assuming 'repaid' based on repayment definition
  const overallCollectionRate = getOverallObj(p?.collectionRate, 'repaid', 'total');

  // 1. Summary Cards
  const renderSummaryCards = () => {
    if (sum.error || perf.error) return <SectionError section="Summary KPIs" onRetry={() => { sum.refetch(); perf.refetch(); }} />;
    if (sum.loading || perf.loading) return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px]">
        {Array.from({length: 6}).map((_, i) => <KpiCard key={i} loading={true} label="" value="" subtext="" status="neutral" />)}
      </div>
    );

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px]">
        <KpiCard
          label="Disbursed today"
          value={fGHS(s?.disbursements?.today?.totalGHS)}
          subtext="24hr volume"
          {...getDisbursedTodayStatus(safeNum(s?.disbursements?.today?.totalGHS))}
          icon={<Banknote className="w-5 h-5" />}
        />
        <KpiCard
          label="Weekly disbursement"
          value={fGHS(s?.disbursements?.thisWeek?.totalGHS)}
          subtext="Disbursement this week"
          {...getWeeklyDisbursementStatus(safeNum(s?.disbursements?.thisWeek?.totalGHS))}
          icon={<CalendarDays className="w-5 h-5" />}
        />
        <KpiCard
          label="Repayment Rate"
          value={fPct(p?.repaymentRate?.overall)}
          subtext="On-time performance"
          {...getRepaymentRateStatus(safeNum(p?.repaymentRate?.overall))}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KpiCard
          label="Recovery rate"
          value={fPct(overallCollectionRate)}
          subtext="Overdue collections"
          {...getCollectionRateStatus(safeNum(overallCollectionRate))}
          icon={<RefreshCw className="w-5 h-5" />}
        />
        <KpiCard
          label="Loan book"
          value={fGHS(s?.loanBook?.total)}
          subtext="Outstanding principal"
          {...getLoanBookStatus(safeNum(s?.loanBook?.total))}
          icon={<Banknote className="w-5 h-5" />}
        />
        <KpiCard
          label="Overdue loans"
          value={safeNum(s?.overdueLoans?.count).toString()}
          subtext="Includes defaulted loans"
          {...getOverdueLoansStatus(safeNum(s?.overdueLoans?.count))}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
      </div>
    );
  };

  // 2. Performance Cards
  const renderPerformanceCards = () => {
    if (perf.error || sum.error) return <SectionError section="Performance metrics" onRetry={() => { perf.refetch(); sum.refetch(); }} />;
    if (perf.loading || sum.loading) return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px] mt-4">
        {Array.from({length: 6}).map((_, i) => <KpiCard key={i} loading={true} label="" value="" subtext="" status="neutral" />)}
      </div>
    );

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px] mt-4">
        <KpiCard
          label="Default rate"
          value={fPct(overallDefaultRate)}
          subtext="DD+15 unpaid"
          {...getDefaultRateStatus(safeNum(overallDefaultRate))}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <KpiCard
          label="PAR 15"
          value={fPct(p?.portfolioAtRisk?.PAR15?.overall)}
          subtext="Portfolio at risk"
          status={getPAR15StatusCustom(safeNum(p?.portfolioAtRisk?.PAR15?.overall))}
          badge={getPAR15Status(safeNum(p?.portfolioAtRisk?.PAR15?.overall)).badge}
          icon={<ShieldCheck className="w-5 h-5" />}
        />
        <KpiCard
          label="Approval rate"
          value={fPct(overallApprovalRate)}
          subtext="Loans approved"
          {...getApprovalRateStatus(safeNum(overallApprovalRate))}
          icon={<ShieldCheck className="w-5 h-5" />}
        />
        <KpiCard
          label="All-time disbursements"
          value={fGHS(s?.disbursements?.allTime?.totalGHS)}
          subtext="Total disbursed"
          status="neutral"
          icon={<Banknote className="w-5 h-5" />}
        />
        <KpiCard
          label="Active users"
          value={fCount(p?.activeUsers?.count || s?.userActivity?.activeUsers || 0)}
          subtext="Last 30 days"
          status="green"
          badge={{ text: "Healthy", variant: "green" }}
          icon={<Activity className="w-5 h-5" />}
        />
        <KpiCard
          label="Churn risk"
          value={safeNum(s?.userActivity?.churnRisk).toString()}
          subtext="No re-application"
          {...getChurnStatus(safeNum(s?.userActivity?.churnRisk))}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1D9E75] to-[#9FE1CB] flex items-center justify-center shadow-lg">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Ecosystem pulse & business intelligence</p>
          </div>
        </div>

        {/* Section 1: Summary KPIs */}
        <div>
          <SectionHead title="Summary KPIs" />
          {renderSummaryCards()}
        </div>

        {/* Section 2: Performance Metrics */}
        <div>
          <SectionHead title="Performance metrics" />
          
          <div className="flex flex-col gap-3 mb-6 bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-xl p-3 shadow-sm w-full lg:w-fit">
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Filter By Date Range</span>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <input type="date" className="text-xs bg-transparent border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-1.5 outline-none text-gray-700 dark:text-gray-200 flex-1 min-w-0 font-bold" value={fromInput} onChange={e => setFromInput(e.target.value)} />
                <span className="text-[10px] font-black text-gray-300 dark:text-gray-600 shrink-0 uppercase">to</span>
                <input type="date" className="text-xs bg-transparent border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-1.5 outline-none text-gray-700 dark:text-gray-200 flex-1 min-w-0 font-bold" value={toInput} onChange={e => setToInput(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={applyRange} className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest px-6 py-2 bg-[#085041] text-white rounded-lg hover:bg-[#0F6E56] transition-colors shadow-sm">Apply</button>
                <button onClick={clearRange} className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest px-6 py-2 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm">Clear</button>
              </div>
            </div>
          </div>

          {renderPerformanceCards()}

          {!perf.loading && !perf.error && (
            <TierBreakdownTables 
              repayment={p?.repaymentRate?.byTier} 
              defaultRate={p?.defaultRate?.byTier} 
              collection={p?.collectionRate?.byTier} 
            />
          )}
        </div>

        {/* Section 2.5: CSA Performance */}
        <div>
          <SectionHead title="CSA Performance" />
          <CsaPerformanceTable range={range} />
        </div>

        {/* Section 3: Distribution */}
        <div>
          <SectionHead title="Distribution" />
          {dist.error ? (
            <SectionError section="Distribution data" onRetry={dist.refetch} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-[14px] border border-border/60 bg-card p-5 shadow-sm">
                <PanelHead title="Signup Growth" />
                {dist.loading ? <div className="h-[260px] animate-pulse rounded-lg bg-muted/40" /> : <ChartSignupGrowth data={d?.signupGrowth || []} />}
              </div>
              <div className="rounded-[14px] border border-border/60 bg-card p-5 shadow-sm">
                <PanelHead title="Tier Distribution" />
                {dist.loading ? <div className="h-[260px] animate-pulse rounded-lg bg-muted/40" /> : <ChartTierDistribution data={d?.tierDistribution?.byTier || []} />}
              </div>
              <div className="rounded-[14px] border border-border/60 bg-card p-5 shadow-sm">
                <PanelHead title="Geographic Distribution" />
                {dist.loading ? <div className="h-[260px] animate-pulse rounded-lg bg-muted/40" /> : <GeographicList data={d?.geographicDistribution || []} />}
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Volume */}
        <div>
          <SectionHead title="Volume" />
          {vol.error ? (
            <SectionError section="Volume data" onRetry={vol.refetch} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-[14px] border border-border/60 bg-card p-5 shadow-sm">
                <PanelHead title="Disbursement vs Collection" />
                {vol.loading ? <div className="h-[280px] animate-pulse rounded-lg bg-muted/40" /> : <ChartDisbColl data={v?.disbursementVsCollection || []} />}
              </div>
              <div className="flex flex-col rounded-[14px] border border-border/60 bg-card p-5 shadow-sm">
                <PanelHead title="Repayment Channels" />
                {vol.loading ? <div className="h-[280px] flex-1 animate-pulse rounded-lg bg-muted/40" /> : (
                  <div className="flex-1 flex flex-col justify-center">
                    <RepaymentChannels data={v?.repaymentChannels} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Referrals */}
        <div>
          <SectionHead title="Referrals" />
          {ref.error ? (
            <SectionError section="Referral data" onRetry={ref.refetch} />
          ) : ref.loading ? (
            <div className="space-y-4">
              <div className="h-[160px] animate-pulse rounded-[14px] bg-muted/40" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="h-[300px] animate-pulse rounded-[14px] bg-muted/40" />
                <div className="h-[300px] animate-pulse rounded-[14px] bg-muted/40" />
              </div>
              <div className="h-[300px] animate-pulse rounded-[14px] bg-muted/40" />
            </div>
          ) : ref.data ? (
            <ReferralAnalytics data={ref.data} onRefresh={ref.refetch} loading={ref.loading} />
          ) : null}
        </div>

      </div>
    </DashboardLayout>
  );
}
