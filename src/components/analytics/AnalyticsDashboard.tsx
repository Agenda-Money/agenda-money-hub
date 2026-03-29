import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { KpiCard } from './KpiCard';
import {
  SectionHead, SectionError, PanelHead,
  ChartDisbColl, ChartChannels, ChartSignupGrowth, TableTierBreakdown
} from './AnalyticsWidgets';
import {
  useSummary, usePerformance, useDistribution, useVolume,
} from './analytics.hooks';
import {
  safeNum, fGHS, fPct, fCount, flatTrend,
  statusRepayment, statusCollection, statusDefault, statusPAR,
  computeOverallRate
} from './analytics.helpers';
import type { DateRange } from './analytics.types';
import { RefreshCw, TrendingUp, AlertTriangle, ShieldCheck, Users, Banknote } from 'lucide-react';

export default function AnalyticsDashboard() {
  const [range, setRange]           = useState<DateRange>({});
  const [fromInput, setFromInput]   = useState('');
  const [toInput, setToInput]       = useState('');

  const sum  = useSummary();
  const perf = usePerformance(range);
  const dist = useDistribution();
  const vol  = useVolume(range);

  const s_ = sum.data;
  const p_ = perf.data;
  const d_ = dist.data;
  const v_ = vol.data;

  // Compute missing 'overall' variants safely
  const defRateVal = p_?.defaultRate?.overall ?? computeOverallRate(p_?.defaultRate?.byTier, 'defaulted', 'total');
  const collRateVal = p_?.collectionRate?.overall ?? computeOverallRate(p_?.collectionRate?.byTier, 'repaid', 'total');

  // Compute Funnel
  const funnelTotal = p_?.approvalRate?.overall?.totalDecided ?? (p_?.approvalRate?.byTier?.reduce((s: number, t: any) => s + safeNum(t.total), 0) || 0);
  const funnelPending = p_?.approvalRate?.overall?.pendingCount ?? (p_?.approvalRate?.byTier?.reduce((s: number, t: any) => s + safeNum(t.pending), 0) || 0);
  const funnelApproved = p_?.approvalRate?.overall?.approved ?? (p_?.approvalRate?.byTier?.reduce((s: number, t: any) => s + safeNum(t.approved), 0) || 0);
  const funnelRejected = p_?.approvalRate?.overall?.rejected ?? (p_?.approvalRate?.byTier?.reduce((s: number, t: any) => s + safeNum(t.rejected), 0) || 0);
  const funnelApprovalRate = funnelTotal > 0 ? (funnelApproved / funnelTotal) * 100 : 0;

  const applyRange = () => setRange({ from: fromInput, to: toInput });
  const clearRange = () => { setRange({}); setFromInput(''); setToInput(''); };

  const refreshAll = () => {
    sum.refetch(); perf.refetch(); dist.refetch(); vol.refetch();
  };

  return (
    <div className="w-full min-h-screen pb-16">
      
      <div className="flex sm:flex-row flex-col items-start sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-800 mb-1">Analytics</h1>
          <p className="text-[13px] text-muted-foreground">Live loan portfolio intelligence</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest pl-1">Period</span>
            <input type="date" className="text-xs bg-transparent border-none outline-none text-neutral-700" value={fromInput} onChange={e => setFromInput(e.target.value)} />
            <span className="text-[11px] text-muted-foreground">to</span>
            <input type="date" className="text-xs bg-transparent border-none outline-none text-neutral-700" value={toInput} onChange={e => setToInput(e.target.value)} />
            <div className="h-4 w-px bg-border mx-1" />
            <button onClick={applyRange} className="text-xs font-semibold px-2 py-1 bg-neutral-800 text-white rounded-md hover:bg-neutral-700">Apply</button>
            {(range.from || range.to) && <button onClick={clearRange} className="text-xs font-medium px-2 py-1 bg-red-50 text-red-600 rounded-md">Clear</button>}
          </div>
          <button onClick={refreshAll} className="flex items-center gap-1.5 px-3 py-2 bg-white border rounded-xl shadow-sm text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {sum.error && <SectionError section="summary data" onRetry={sum.refetch} />}

      {/* ZONE 1: Hero Stat Strip */}
      <Card className="flex flex-col sm:flex-row w-full divide-y sm:divide-y-0 sm:divide-x border-border shadow-sm mb-10 overflow-hidden bg-white">
        <StatCell label="Loan book" value={fGHS(s_?.loanBook?.total)} sub="Outstanding principal" dot={safeNum(s_?.loanBook?.total) > 0 ? "bg-emerald-500" : "bg-muted-foreground"} loading={sum.loading} />
        <StatCell label="Active loans" value={fCount(s_?.activeLoans?.count)} sub="Currently open" loading={sum.loading} />
        <StatCell label="Disbursed today" value={fGHS(s_?.disbursements?.today?.totalGHS)} sub={`${fCount(s_?.disbursements?.today?.count)} loans`} valueColor="text-emerald-700" loading={sum.loading} />
        <StatCell label="Overdue" value={fCount(s_?.overdueLoans?.count)} sub="Requires attention" dot={safeNum(s_?.overdueLoans?.count) > 5 ? "bg-red-500" : safeNum(s_?.overdueLoans?.count) > 0 ? "bg-amber-500" : "bg-emerald-500"} valueColor={safeNum(s_?.overdueLoans?.count) > 0 ? "text-red-700" : "text-neutral-800"} loading={sum.loading} />
        <StatCell label="New users" value={fCount(s_?.userActivity?.newUsersLast30Days)} sub="Last 30 days" loading={sum.loading} />
      </Card>

      {/* ZONE 2: Portfolio Health */}
      <SectionHead title="Portfolio Health" />
      {perf.error && <SectionError section="performance" onRetry={perf.refetch} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KpiCard
          loading={perf.loading}
          label="Repayment Rate"
          value={fPct(p_?.repaymentRate?.overall)}
          subtext="On-time performance"
          icon={<TrendingUp className="h-4 w-4" />}
          trend={flatTrend()}
          {...(p_ ? statusRepayment(safeNum(p_?.repaymentRate?.overall)) : { status: 'neutral', badge: { text: "Loading", variant: "neutral" } })}
        />
        <KpiCard
          loading={perf.loading}
          label="Default Rate"
          value={fPct(defRateVal)}
          subtext="DD+15 unpaid"
          icon={<AlertTriangle className="h-4 w-4" />}
          trend={flatTrend()}
          {...(p_ ? statusDefault(safeNum(defRateVal)) : { status: 'neutral', badge: { text: "Loading", variant: "neutral" } })}
        />
        <KpiCard
          loading={perf.loading}
          label="Recovery Rate"
          value={fPct(collRateVal)}
          subtext="Overdue collected"
          icon={<Banknote className="h-4 w-4" />}
          trend={flatTrend()}
          {...(p_ ? statusCollection(safeNum(collRateVal)) : { status: 'neutral', badge: { text: "Loading", variant: "neutral" } })}
        />
        <KpiCard
          loading={perf.loading}
          label="PAR 15"
          value={fPct(p_?.portfolioAtRisk?.PAR15?.overall)}
          subtext="Portfolio at risk"
          icon={<ShieldCheck className="h-4 w-4" />}
          trend={flatTrend()}
          {...(p_ ? statusPAR(safeNum(p_?.portfolioAtRisk?.PAR15?.overall)) : { status: 'neutral', badge: { text: "Loading", variant: "neutral" } })}
        />
      </div>

      {/* ZONE 3: Volume */}
      <SectionHead title="Volume" />
      {vol.error && <SectionError section="volume" onRetry={vol.refetch} />}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
        <Card className="col-span-1 lg:col-span-2 p-5 shadow-sm border-border bg-white">
          <PanelHead title="Disbursement vs Collection" />
          {vol.loading ? <div className="animate-pulse bg-muted/30 h-[220px] rounded-xl" /> : <ChartDisbColl data={v_?.disbursementVsCollection || []} />}
        </Card>
        <Card className="col-span-1 p-5 shadow-sm border-border bg-white">
          {vol.loading ? <div className="animate-pulse bg-muted/30 h-[220px] rounded-xl" /> : <ChartChannels data={v_?.repaymentChannels || { channels: [], total: null }} />}
        </Card>
      </div>

      {/* ZONE 4: Tier Breakdown */}
      <SectionHead title="Tier Breakdown" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
        <Card className="p-5 shadow-sm border-border bg-white overflow-x-auto">
          <PanelHead title="Performance by Tier" />
          {perf.loading ? <div className="animate-pulse bg-muted/30 h-[200px] rounded-xl" /> : (
            <TableTierBreakdown 
              byTier={p_?.repaymentRate?.byTier} 
              defaults={p_?.defaultRate?.byTier} 
              avgSize={p_?.averageLoanSize?.byTier} 
            />
          )}
        </Card>
        <Card className="p-5 shadow-sm border-border bg-white">
          <PanelHead title="Signup Growth" />
          {dist.loading ? <div className="animate-pulse bg-muted/30 h-[200px] rounded-xl" /> : <ChartSignupGrowth data={d_?.signupGrowth || []} />}
        </Card>
      </div>

      {/* ZONE 5: Distribution */}
      <SectionHead title="Distribution" />
      {dist.error && <SectionError section="distribution" onRetry={dist.refetch} />}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Top Regions */}
        <Card className="p-5 shadow-sm border-border bg-white">
          <PanelHead title="Top Regions" />
          {dist.loading ? <div className="animate-pulse bg-muted/30 h-[200px] rounded-xl" /> : (
            <div className="space-y-3 mt-2">
              {(d_?.geographicDistribution || []).slice(0,8).map((geo: any) => (
                <div key={geo.region} className="flex items-center justify-between pb-2 border-b border-[#F5F4F0] last:border-0 last:pb-0">
                  <span className="text-xs text-neutral-800">{geo.region || 'Unknown'}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground">{geo.userCount}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${safeNum(geo.repaymentRate) >= 80 ? 'bg-emerald-100 text-emerald-800' : safeNum(geo.repaymentRate) >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                      {fPct(geo.repaymentRate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* User Activity Grid */}
        <Card className="shadow-sm border-border overflow-hidden bg-white">
          <div className="p-5 border-b border-border">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground m-0">User Activity</h3>
          </div>
          {sum.loading ? <div className="animate-pulse bg-muted/30 h-[200px]" /> : (
            <div className="grid grid-cols-2 grid-rows-2 h-[200px] bg-border gap-px">
              <ActivityCell label="Active" value={fCount(s_?.userActivity?.activeUsers)} color="text-emerald-800" />
              <ActivityCell label="Dormant" value={fCount(s_?.userActivity?.dormantUsers)} color="text-neutral-500" />
              <ActivityCell label="New 30d" value={fCount(s_?.userActivity?.newUsersLast30Days)} color="text-[#0C447C]" />
              <ActivityCell label="Churn Risk" value={fCount(s_?.userActivity?.churnRisk)} color={safeNum(s_?.userActivity?.churnRisk) > 10 ? "text-red-700" : "text-neutral-700"} />
            </div>
          )}
        </Card>

        {/* Approval Funnel */}
        <Card className="p-5 shadow-sm border-border bg-white">
          <PanelHead title="Approval Funnel" />
          {perf.loading ? <div className="animate-pulse bg-muted/30 h-[200px] rounded-xl" /> : (
            <div className="mt-4 flex flex-col gap-2">
              <FunnelBar label="Applied" count={funnelTotal + funnelPending} indent={0} bg="bg-[#E1F5EE]" fg="text-[#085041]" />
              <FunnelBar label="Approved" count={funnelApproved} indent={12} bg="bg-[#E6F1FB]" fg="text-[#0C447C]" />
              <FunnelBar label="Disbursed" count={safeNum(s_?.disbursements?.allTime?.count)} indent={24} bg="bg-[#FAC775]" fg="text-[#633806]" />
              <FunnelBar label="Rejected" count={funnelRejected} indent={36} bg="bg-[#FCEBEB]" fg="text-[#791F1F]" />
              <p className="text-[10px] text-muted-foreground text-center mt-4 pt-2 border-t border-border">
                {safeNum(funnelApprovalRate).toFixed(1)}% target approval rate
              </p>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}

function StatCell({ label, value, sub, dot, valueColor = "text-neutral-800", loading }: any) {
  if (loading) return <div className="flex-1 p-5 animate-pulse bg-muted/10" />;
  return (
    <div className="flex-1 p-5 flex flex-col justify-center">
      <div className="flex items-center gap-1.5 mb-1.5">
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
        <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">{label}</span>
      </div>
      <span className={`text-[28px] font-semibold tracking-tight tabular-nums leading-none mb-1 shadow-none ${valueColor}`}>{value === 'GHS 0' ? '—' : value}</span>
      <span className="text-[11px] text-muted-foreground">{sub}</span>
    </div>
  );
}

function ActivityCell({ label, value, color }: any) {
  return (
    <div className="bg-white p-5 flex flex-col justify-center">
      <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1">{label}</span>
      <span className={`text-[26px] font-semibold tabular-nums leading-none ${color}`}>{value || '—'}</span>
    </div>
  );
}

function FunnelBar({ label, count, indent, bg, fg }: any) {
  return (
    <div className={`p-2.5 rounded-lg flex items-center justify-between transition-all ${bg}`} style={{ marginLeft: indent }}>
      <span className={`text-xs font-semibold ${fg}`}>{label}</span>
      <span className={`text-xs font-bold ${fg}`}>{fCount(count)}</span>
    </div>
  );
}
