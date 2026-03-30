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
  PanelHead
} from "@/components/analytics/AnalyticsWidgets";
import { 
  useSummary, 
  usePerformance, 
  useDistribution, 
  useVolume 
} from "@/components/analytics/analytics.hooks";
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
          subtext="Last 7 days"
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
            <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900">Analytics Dashboard</h1>
            <p className="text-sm text-neutral-500 mt-1">Ecosystem pulse & business intelligence</p>
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
          
          <div className="flex flex-wrap items-center gap-2 mb-4 bg-white border border-border rounded-xl px-3 py-2 shadow-sm w-full sm:w-fit max-w-full">
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest px-1 shrink-0">Date Filter</span>
            <input type="date" className="text-xs bg-transparent border border-neutral-200 rounded px-2 py-1 outline-none text-neutral-700 flex-1 min-w-[110px]" value={fromInput} onChange={e => setFromInput(e.target.value)} />
            <span className="text-[11px] text-neutral-400 shrink-0">to</span>
            <input type="date" className="text-xs bg-transparent border border-neutral-200 rounded px-2 py-1 outline-none text-neutral-700 flex-1 min-w-[110px]" value={toInput} onChange={e => setToInput(e.target.value)} />
            <div className="hidden sm:block h-4 w-px bg-border mx-2" />
            <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <button onClick={applyRange} className="flex-1 sm:flex-none text-xs font-semibold px-4 py-1.5 bg-[#085041] text-white rounded-md hover:bg-[#0F6E56] transition-colors">Apply</button>
              <button onClick={clearRange} className="flex-1 sm:flex-none text-xs font-semibold px-4 py-1.5 bg-neutral-100 text-neutral-600 rounded-md hover:bg-neutral-200 transition-colors">Clear</button>
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

        {/* Section 3: Distribution */}
        <div>
          <SectionHead title="Distribution" />
          {dist.error ? (
            <SectionError section="Distribution data" onRetry={dist.refetch} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white border rounded-[14px] p-5 shadow-sm">
                <PanelHead title="Signup Growth" />
                {dist.loading ? <div className="animate-pulse bg-neutral-100 h-[260px] rounded-lg" /> : <ChartSignupGrowth data={d?.signupGrowth || []} />}
              </div>
              <div className="bg-white border rounded-[14px] p-5 shadow-sm">
                <PanelHead title="Tier Distribution" />
                {dist.loading ? <div className="animate-pulse bg-neutral-100 h-[260px] rounded-lg" /> : <ChartTierDistribution data={d?.tierDistribution?.byTier || []} />}
              </div>
              <div className="bg-white border rounded-[14px] p-5 shadow-sm">
                <PanelHead title="Geographic Distribution" />
                {dist.loading ? <div className="animate-pulse bg-neutral-100 h-[260px] rounded-lg" /> : <GeographicList data={d?.geographicDistribution || []} />}
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
              <div className="bg-white border rounded-[14px] p-5 shadow-sm">
                <PanelHead title="Disbursement vs Collection" />
                {vol.loading ? <div className="animate-pulse bg-neutral-100 h-[280px] rounded-lg" /> : <ChartDisbColl data={v?.disbursementVsCollection || []} />}
              </div>
              <div className="bg-white border rounded-[14px] p-5 shadow-sm flex flex-col">
                <PanelHead title="Repayment Channels" />
                {vol.loading ? <div className="animate-pulse bg-neutral-100 h-[280px] rounded-lg flex-1" /> : (
                  <div className="flex-1 flex flex-col justify-center">
                    <RepaymentChannels data={v?.repaymentChannels} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
