import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Activity, CalendarDays, TrendingUp, AlertTriangle, ShieldCheck, Banknote, RefreshCw } from "lucide-react";
import { KpiCard } from "@/components/analytics/KpiCard";
import { ReferralRateCard } from "@/components/dashboard/ReferralRateCard";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
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
  useCsaPerformance
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

  const { data: refRes, isLoading: refLoading } = useQuery({
    queryKey: ['referrals-analytics'],
    queryFn: () => api.get('/api/referrals/analytics').then(r => r.data.data)
  });

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
          value={fPct(p?.repaymentRate?.rate ?? p?.repaymentRate?.overall)}
          subtext={p?.repaymentRate?.dueLoanCount ? `${fCount(p?.repaymentRate?.repaidCount)} of ${fCount(p?.repaymentRate?.dueLoanCount)} loans repaid` : "On-time performance"}
          {...getRepaymentRateStatus(safeNum(p?.repaymentRate?.rate ?? p?.repaymentRate?.overall))}
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
          value={fGHS(s?.loanBook?.value ?? s?.loanBook?.total)}
          subtext={s?.loanBook?.count ? `${fCount(s?.loanBook?.count)} total loans` : "Outstanding principal"}
          {...getLoanBookStatus(safeNum(s?.loanBook?.value ?? s?.loanBook?.total))}
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
          value={fGHS(s?.allTimeDisbursement?.totalValue ?? s?.disbursements?.allTime?.totalGHS)}
          subtext={s?.allTimeDisbursement?.totalCount ? `${fCount(s?.allTimeDisbursement?.totalCount)} total loans` : "Total disbursed"}
          status="neutral"
          icon={<Banknote className="w-5 h-5" />}
        />
        <KpiCard
          label="Active Customers"
          value={fCount(s?.activeCustomers?.count ?? p?.activeUsers?.count ?? s?.userActivity?.activeUsers ?? 0)}
          subtext={s?.activeCustomers?.windowDays ? `Last ${s?.activeCustomers?.windowDays} days` : "Last 30 days"}
          status="green"
          badge={{ text: "Healthy", variant: "green" }}
          icon={<Activity className="w-5 h-5" />}
        />
        <KpiCard
          label="Retention Rate"
          value={fPct(p?.retentionRate?.retentionRate)}
          subtext={p?.retentionRate?.eligibleCustomers ? `${fCount(p?.retentionRate?.retainedCustomers)} of ${fCount(p?.retentionRate?.eligibleCustomers)} customers` : "Repaid & returned"}
          status="green"
          badge={{ text: "Loyal", variant: "green" }}
          icon={<RefreshCw className="w-5 h-5" />}
        />
        <KpiCard
          label="Churn Rate"
          value={fPct(p?.churnRate ?? s?.userActivity?.churnRisk)}
          subtext="Did not return in 90 days"
          {...getChurnStatus(safeNum(p?.churnRate ?? s?.userActivity?.churnRisk))}
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
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-gray-100">Analytics Dashboard</h1>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-tight italic">Ecosystem pulse & business intelligence</p>
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
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-xl p-3 shadow-sm w-full lg:w-fit">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 shrink-0">Filter By Date Range</span>
              <div className="flex items-center gap-2 flex-1">
                <input type="date" className="text-xs bg-transparent border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-1.5 outline-none text-gray-700 dark:text-gray-200 flex-1 min-w-0 font-bold" value={fromInput} onChange={e => setFromInput(e.target.value)} />
                <span className="text-[10px] font-black text-gray-300 dark:text-gray-600 shrink-0 uppercase">to</span>
                <input type="date" className="text-xs bg-transparent border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-1.5 outline-none text-gray-700 dark:text-gray-200 flex-1 min-w-0 font-bold" value={toInput} onChange={e => setToInput(e.target.value)} />
              </div>
            </div>
            
            <div className="hidden sm:block h-6 w-px bg-gray-100 dark:bg-gray-800 mx-1" />
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button onClick={applyRange} className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest px-6 py-2 bg-[#085041] text-white rounded-lg hover:bg-[#0F6E56] transition-colors shadow-sm">Apply</button>
              <button onClick={clearRange} className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest px-6 py-2 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm">Clear</button>
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
              <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-[14px] p-5 shadow-sm">
                <PanelHead title="Signup Growth" />
                {dist.loading ? <div className="animate-pulse bg-gray-100 dark:bg-gray-800 h-[260px] rounded-lg" /> : <ChartSignupGrowth data={d?.signupGrowth || []} />}
              </div>
              <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-[14px] p-5 shadow-sm">
                <PanelHead title="Tier Distribution" />
                {dist.loading ? <div className="animate-pulse bg-gray-100 dark:bg-gray-800 h-[260px] rounded-lg" /> : <ChartTierDistribution data={d?.tierDistribution?.byTier || []} />}
              </div>
              <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-[14px] p-5 shadow-sm">
                <PanelHead title="Geographic Distribution" />
                {dist.loading ? <div className="animate-pulse bg-gray-100 dark:bg-gray-800 h-[260px] rounded-lg" /> : <GeographicList data={d?.geographicDistribution || []} />}
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
              <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-[14px] p-5 shadow-sm">
                <PanelHead title="Disbursement vs Collection" />
                {vol.loading ? <div className="animate-pulse bg-gray-100 dark:bg-gray-800 h-[280px] rounded-lg" /> : <ChartDisbColl data={v?.disbursementVsCollection || []} />}
              </div>
              <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-[14px] p-5 shadow-sm flex flex-col">
                <PanelHead title="Repayment Channels" />
                {vol.loading ? <div className="animate-pulse bg-gray-100 dark:bg-gray-800 h-[280px] rounded-lg flex-1" /> : (
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
          {refLoading ? (
            <div className="h-[200px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ) : refRes ? (
            <ReferralRateCard data={refRes} />
          ) : (
            <SectionError section="Referrals data" onRetry={() => {}} />
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
