import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, TrendingUp } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

import { KpiCards } from "@/components/analytics/KpiCards";
import { SignupGrowthChart } from "@/components/analytics/SignupGrowthChart";
import { GeographicMap } from "@/components/analytics/GeographicMap";
import { TierDistributionPie } from "@/components/analytics/TierDistributionPie";
import { RepaymentChannelStats } from "@/components/analytics/RepaymentChannelStats";

import { useQuery } from "@tanstack/react-query";
import { getAdminDashboardStats, getAdminAnalytics, getAdminRepaymentChannels } from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar
} from "recharts";

const ANALYTICS_COLORS = [
  "hsl(330, 86%, 52%)", // Pink
  "hsl(175, 100%, 36%)", // Green/Teal
  "hsl(38, 92%, 50%)",  // Yellow
  "hsl(160, 84%, 39%)", // Sage
  "hsl(217, 91%, 60%)", // Blue
  "hsl(280, 65%, 60%)", // Purple
  "hsl(10, 80%, 60%)",  // Red
  "hsl(190, 90%, 50%)", // Sky
];

const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState("6m");

  // Fetch full analytics data
  const { data: analyticsResponse } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const res = await getAdminAnalytics();
      return res.data || res;
    },
  });

  // Fetch dashboard stats (legacy fallback/supplement)
  const { data: responseData } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await getAdminDashboardStats();
      return res;
    },
  });

  const summary = analyticsResponse?.summary;
  const growth = analyticsResponse?.growth || [];
  const distribution = analyticsResponse?.distribution || {};
  const liquidity = analyticsResponse?.liquidity || [];

  // Fetch Repayment Channel Analytics
  const { data: repaymentChannelResponse } = useQuery({
    queryKey: ["admin", "repayment-analytics"],
    queryFn: getAdminRepaymentChannels,
  });

  const repaymentDataRaw = repaymentChannelResponse?.data || { ussd: { count: 0, percent: 0 }, app: { count: 0, percent: 0 }, total: 0 };

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

  // Map Liquidity Data
  const revenueData = liquidity.map((l: any) => ({
    month: l._id.month,
    revenue: (l.repaid || 0) * 0.1, // Heuristic for revenue if not explicit
    disbursed: l.disbursed || 0,
    repaid: l.repaid || 0,
  }));

  // Map Tiers Data
  const tierData = (distribution.tiers || []).map((t: any, idx: number) => ({
    name: t._id || "Unknown",
    value: t.count || 0,
    color: ANALYTICS_COLORS[idx % ANALYTICS_COLORS.length]
  }));

  // Map Geographic Data
  const geographicData = (distribution.regions || []).map((r: any, idx: number) => ({
    name: r.region || "Unknown",
    signups: r.count || 0,
    percentage: r.percentage || 0,
    color: ANALYTICS_COLORS[idx % ANALYTICS_COLORS.length]
  }));

  // Real KPI data from summary
  const kpiData = {
    disbursedToday: {
      amount: summary?.disbursedToday?.amount || responseData?.disbursementToday || 0,
      change: summary?.disbursedToday?.change || responseData?.disbursementTodayChange || 0,
    },
    disbursedWeek: responseData?.disbursementWeek || 0,
    activeDebt: summary?.activeDebt || responseData?.totalActiveDebt || 0,
    collectionRate: {
      percentage: summary?.collectionRate?.percentage || responseData?.collectionRate || 0,
      status: summary?.collectionRate?.status || responseData?.collectionRateStatus,
    },
    portfolioAtRisk: {
      percentage: summary?.portfolioAtRisk?.percentage || responseData?.portfolioAtRisk || 0,
      status: summary?.portfolioAtRisk?.status || responseData?.portfolioAtRiskStatus,
    },
    overdueLoans: summary?.overdueLoans || responseData?.overdueLoans || 0,
  };

  const totalSignups = distribution.totalSignups || 0;
  const totalL1 = signupGrowthData.reduce((sum: number, d: any) => sum + d.l1, 0);
  const totalGraduated = signupGrowthData.reduce((sum: number, d: any) => sum + d.graduated, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <Activity className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Analytics Dashboard</h1>
              <p className="text-sm text-muted-foreground">Ecosystem pulse & business intelligence</p>
            </div>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">Last Month</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* KPI Cards */}
        <KpiCards data={kpiData} />

        {/* Visual Trends Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Signup Growth Chart */}
          <SignupGrowthChart 
            data={signupGrowthData}
            totalL1={totalL1}
            totalGraduated={totalGraduated}
          />

          {/* Geographic Map */}
          <GeographicMap 
            data={geographicData}
            totalSignups={totalSignups}
          />
        </div>

        {/* Repayment Channels (Moved above Tier Distribution) */}
        <div className="w-full">
           <RepaymentChannelStats data={repaymentDataRaw} />
        </div>

        {/* Tier Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TierDistributionPie data={tierData} />

          {/* Revenue & Disbursement Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="h-full">
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Disbursement vs Collection</CardTitle>
                    <CardDescription>Liquidity tracker over time</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorRepaid" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                      <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                      <YAxis className="text-xs fill-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="disbursed"
                        stroke="hsl(var(--primary))"
                        fill="url(#colorDisbursed)"
                        strokeWidth={2}
                        name="Disbursed (₵)"
                      />
                      <Area
                        type="monotone"
                        dataKey="repaid"
                        stroke="hsl(var(--success))"
                        fill="url(#colorRepaid)"
                        strokeWidth={2}
                        name="Collection (₵)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Detailed Charts Tabs */}
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="performance">
             <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-2xl bg-muted/20">
                <Activity className="h-10 w-10 text-muted-foreground mb-3 opacity-20" />
                <p className="text-sm font-medium text-foreground">Advanced Performance Metrics</p>
                <p className="text-xs text-muted-foreground max-w-[250px] mt-1">
                  Additional deep-dive performance charts will appear here as more data is collected.
                </p>
             </div>
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
