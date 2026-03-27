import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, BarChart3, PieChart as PieChartIcon, Target, Layers } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import { KpiCards } from "@/components/analytics/KpiCards";
import { SignupGrowthChart } from "@/components/analytics/SignupGrowthChart";
import { GeographicMap } from "@/components/analytics/GeographicMap";
import { TierDistributionPie } from "@/components/analytics/TierDistributionPie";
import { RepaymentChannelStats } from "@/components/analytics/RepaymentChannelStats";
import { LoanBookWidget } from "@/components/analytics/LoanBookWidget";
import { TierBreakdownWidget } from "@/components/analytics/TierBreakdownWidget";
import { DistributionCharts } from "@/components/analytics/DistributionCharts";

import { useAnalyticsDashboard } from "@/hooks/useAnalyticsDashboard";
import { useRepaymentChannelAnalytics } from "@/hooks/useRepaymentChannelAnalytics";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const ANALYTICS_COLORS = [
  "hsl(var(--primary))",
  "hsl(175, 100%, 36%)", // Green/Teal
  "hsl(330, 86%, 52%)", // Pink
  "hsl(38, 92%, 50%)",  // Yellow
  "hsl(217, 91%, 60%)", // Blue
  "hsl(280, 65%, 60%)", // Purple
  "hsl(10, 80%, 60%)",  // Red
  "hsl(190, 90%, 50%)", // Sky
];

const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState("6m");

  // Fetch full analytics data using the new hook
  const { data: analyticsResponse, isLoading: isAnalyticsLoading } = useAnalyticsDashboard();

  // Fetch Repayment Channel Analytics
  const { data: repaymentDataRaw, isLoading: isRepaymentLoading } = useRepaymentChannelAnalytics();

  const summary = analyticsResponse?.summary;
  const growth = analyticsResponse?.growth || [];
  const liquidity = analyticsResponse?.liquidity || [];

  // Map Growth Data
  const signupGrowthData = growth.length > 0 ? Array.from(
    growth.reduce((acc: any, curr: any) => {
      const month = curr._id.month;
      if (!acc.has(month)) acc.set(month, { month, l1: 0, graduated: 0, sort: curr._id.sortOrder });
      const entry = acc.get(month);
      if (curr._id.isGraduated) entry.graduated += curr.count;
      else entry.l1 += curr.count;
      return acc;
    }, new Map()).values()
  ) as any[] : [];

  // Map Liquidity Data (Disbursement vs Collection)
  const revenueData = liquidity.length > 0 ? liquidity.map((l: any) => ({
    month: l._id.month,
    disbursed: l.disbursed || 0,
    repaid: l.repaid || 0,
  })) : [];

  // Map Tiers Data for Pie
  const tierPieData = (analyticsResponse?.distribution?.tiers || []).map((t: any, idx: number) => ({
    name: t._id || `Tier ${idx + 1}`,
    value: t.count || 0,
    color: ANALYTICS_COLORS[idx % ANALYTICS_COLORS.length]
  }));

  // Map Tier Metrics for Breakdown - Using top-level tierBreakdowns and retentionRate
  const retentionByTier = analyticsResponse?.retentionRate?.byTier || [];
  const tierMetricsData = (analyticsResponse?.tierBreakdowns || []).map((t: any) => {
    const retention = retentionByTier.find((r: any) => r.tier === t.tier);
    return {
      tier: t.tier || "Unknown",
      repaymentRate: Number((t.repaymentRate || 0).toFixed(1)),
      defaultRate: Number((t.defaultRate || 0).toFixed(1)),
      retentionRate: Number((retention?.percentage || 0).toFixed(1)),
    };
  });

  // Map Network/Gender/Purpose - Calculating percentages for the charts and labels
  const totalNetworkVolume = (analyticsResponse?.disbursementPerNetwork || []).reduce((sum: number, n: any) => sum + (n.volume || 0), 0) || 1;
  const networkData = (analyticsResponse?.disbursementPerNetwork || []).map((n: any) => ({ 
    name: n.network === "VODAFONE" ? "Telecel" : (n.network || "Other"), 
    value: Number(((n.volume || 0) / totalNetworkVolume * 100).toFixed(1)),
    rawVolume: n.volume || 0
  }));

  const totalGenderCount = (analyticsResponse?.genderDistribution || []).reduce((sum: number, g: any) => sum + (g.count || 0), 0) || 1;
  const genderData = (analyticsResponse?.genderDistribution || []).map((g: any) => ({ 
    name: g.gender || "Other", 
    value: g.percentage || Number(((g.count || 0) / totalGenderCount * 100).toFixed(1))
  }));

  const totalPurposeCount = (analyticsResponse?.loanPurposeDistribution || []).reduce((sum: number, p: any) => sum + (p.count || 0), 0) || 1;
  const purposeData = (analyticsResponse?.loanPurposeDistribution || []).map((p: any) => ({ 
    name: p.purpose || "Other", 
    value: p.percentage || Number(((p.count || 0) / totalPurposeCount * 100).toFixed(1))
  }));

  // Map Geographic Data
  const geographicData = (analyticsResponse?.distribution?.regions || []).map((r: any, idx: number) => ({
    name: r.region || "Other / Pending",
    signups: r.count || 0,
    percentage: r.percentage || 0,
    color: ANALYTICS_COLORS[idx % ANALYTICS_COLORS.length]
  }));

  // KPI data - Mapping from production JSON structure
  const kpiData = {
    disbursedToday: {
      amount: summary?.disbursedToday?.amount || 0,
      change: summary?.disbursedToday?.change || 0,
    },
    disbursedWeek: summary?.disbursedWeek?.amount || 0,
    activeDebt: {
      volume: summary?.loanBook?.volume || 0,
      change: summary?.loanBook?.change || 0,
      status: summary?.loanBook?.status || "Healthy",
    },
    collectionRate: {
      percentage: summary?.collectionRate?.percentage || analyticsResponse?.defaultRate?.percentage || 0,
      change: summary?.collectionRate?.change || 0,
      status: summary?.collectionRate?.status || summary?.systemStatus || "Healthy",
    },
    portfolioAtRisk: {
      percentage: summary?.portfolioAtRisk?.percentage || analyticsResponse?.collectionRate?.percentage || 0,
      change: summary?.portfolioAtRisk?.change || 0,
      status: summary?.portfolioAtRisk?.status || "Healthy",
    },
    overdueLoans: {
      count: summary?.overdueLoans?.count || 0,
      change: summary?.overdueLoans?.change || 0,
      status: summary?.overdueLoans?.status || "Monitor",
    },
  };

  const totalSignups = analyticsResponse?.distribution?.totalSignups || 0;
  const totalL1 = signupGrowthData.reduce((sum: number, d: any) => sum + d.l1, 0);
  const totalGraduated = signupGrowthData.reduce((sum: number, d: any) => sum + d.graduated, 0);

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-20">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8"
        >
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Activity className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">Business Intelligence</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-foreground">Analytics Hub</h1>
            <p className="text-muted-foreground mt-1 font-medium">Monitoring ecosystem health and portfolio performance</p>
          </div>
          
          <div className="flex items-center gap-3 bg-muted/30 p-1.5 rounded-2xl border backdrop-blur-sm">
            {["1m", "3m", "6m", "1y"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black uppercase transition-all",
                  timeRange === range 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Top Tier Metrics: KPI Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
           <div className="xl:col-span-8">
              <KpiCards data={kpiData} />
           </div>
           <div className="xl:col-span-4 h-full">
              <LoanBookWidget 
                activeDebt={kpiData.activeDebt.volume} 
                activeLoansCount={summary?.totalActiveLoans || 0} 
                trendData={summary?.principalTrend || []}
                graduationRate={summary?.graduationRate || 0}
                activeAgents={summary?.activeAgents || 0}
                isLoading={isAnalyticsLoading}
              />
           </div>
        </div>

        {/* Liquidity & Repayment Channels Section */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
           {/* Liquidity Velocity Chart */}
           <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="xl:col-span-8 h-full"
           >
              <div className="bg-white border border-[#efefef] rounded-[24px] p-6 shadow-sm overflow-hidden h-full">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[#fce8f3]">
                      <TrendingUp className="w-5 h-5 text-[#e91e8c]" strokeWidth={2.2} />
                    </div>
                    <div>
                      <div className="text-[15px] font-black text-[#1a1a2e]">Liquidity Velocity</div>
                      <div className="text-[11px] text-[#aaa] font-bold uppercase tracking-tight">Disbursement vs Collection Flow</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black tracking-[0.08em] uppercase text-[#b0a8c0]">Repaid (6M)</div>
                    <div className="text-[22px] font-black text-[#1a1a2e] font-mono tracking-tighter">
                      GHS {(revenueData.reduce((s, r) => s + r.repaid, 0) / 1000).toFixed(1)}K
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mb-6 mt-2 ml-1">
                  <div className="flex items-center gap-2 text-[12px] font-bold text-[#666]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#e91e8c]" />
                    Disbursed
                  </div>
                  <div className="flex items-center gap-2 text-[12px] font-bold text-[#666]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1abc9c]" />
                    Collected
                  </div>
                </div>

                <div className="h-[280px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDis" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e91e8c" stopOpacity={0.08} />
                          <stop offset="95%" stopColor="#e91e8c" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorRep" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1abc9c" stopOpacity={0.07} />
                          <stop offset="95%" stopColor="#1abc9c" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f4" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#aaa', fontSize: 11, fontWeight: 'bold' }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#aaa', fontSize: 11, fontWeight: 'bold' }} 
                        tickFormatter={(v) => v === 0 ? "0" : `${(v / 1000).toFixed(1)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #efefef",
                          borderRadius: "12px",
                          padding: "10px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                        }}
                        itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                        formatter={(v: number) => [`GHS ${v.toLocaleString()}`, ""]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="disbursed" 
                        stroke="#e91e8c" 
                        strokeWidth={2.5} 
                        fill="url(#colorDis)" 
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="repaid" 
                        stroke="#1abc9c" 
                        strokeWidth={2.5} 
                        fill="url(#colorRep)" 
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
           </motion.div>

           {/* Repayment Channels Card */}
           <div className="xl:col-span-4 h-full">
              <RepaymentChannelStats data={repaymentDataRaw} isLoading={isRepaymentLoading} />
           </div>
        </div>

        {/* Secondary Insights: Map & Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <SignupGrowthChart data={signupGrowthData} totalL1={totalL1} totalGraduated={totalGraduated} />
           <GeographicMap data={geographicData} totalSignups={totalSignups} />
        </div>

        {/* Demographics Segment */}
        <div className="rounded-3xl bg-white/5 border border-white/10 p-1">
           <DistributionCharts 
              networkData={networkData}
              genderData={genderData}
              purposeData={purposeData}
              totalDisbursements={(analyticsResponse?.disbursementPerNetwork || []).reduce((sum: number, n: any) => sum + (n.volume || 0), 0)}
              writeOffs={analyticsResponse?.writeOffs || { count: 0, volume: 0 }}
              isLoading={isAnalyticsLoading}
           />
        </div>

        {/* Detailed Performance: Tier Matrix */}
        <div className="pt-4">
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8">
                 <TierBreakdownWidget 
                    data={tierMetricsData} 
                    isLoading={isAnalyticsLoading}
                 />
              </div>
              <div className="lg:col-span-4">
                 <TierDistributionPie data={tierPieData} />
              </div>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
