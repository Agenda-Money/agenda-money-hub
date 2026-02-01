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

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
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

// Mock data for charts
const revenueData = [
  { month: "Jul", revenue: 12500, disbursed: 45000, repaid: 38000 },
  { month: "Aug", revenue: 15200, disbursed: 52000, repaid: 44000 },
  { month: "Sep", revenue: 18100, disbursed: 61000, repaid: 52000 },
  { month: "Oct", revenue: 21300, disbursed: 72000, repaid: 61000 },
  { month: "Nov", revenue: 19800, disbursed: 68000, repaid: 58000 },
  { month: "Dec", revenue: 24500, disbursed: 85000, repaid: 72000 },
  { month: "Jan", revenue: 28900, disbursed: 98000, repaid: 84000 },
];

const signupGrowthData = [
  { date: "Jul", l1Users: 120, graduatedNodes: 15, total: 135 },
  { date: "Aug", l1Users: 145, graduatedNodes: 22, total: 167 },
  { date: "Sep", l1Users: 180, graduatedNodes: 28, total: 208 },
  { date: "Oct", l1Users: 210, graduatedNodes: 35, total: 245 },
  { date: "Nov", l1Users: 195, graduatedNodes: 42, total: 237 },
  { date: "Dec", l1Users: 250, graduatedNodes: 55, total: 305 },
  { date: "Jan", l1Users: 280, graduatedNodes: 68, total: 348 },
];

const geographicData = [
  { name: "Greater Accra", signups: 1250, percentage: 35, color: "hsl(330, 86%, 52%)" },
  { name: "Ashanti", signups: 890, percentage: 25, color: "hsl(175, 100%, 36%)" },
  { name: "Northern", signups: 520, percentage: 15, color: "hsl(38, 92%, 50%)" },
  { name: "Upper East", signups: 380, percentage: 11, color: "hsl(160, 84%, 39%)" },
  { name: "Western", signups: 285, percentage: 8, color: "hsl(217, 91%, 60%)" },
  { name: "Central", signups: 215, percentage: 6, color: "hsl(280, 65%, 60%)" },
];

const tierData = [
  { name: "L1", value: 1850, color: "hsl(330, 86%, 52%)" },
  { name: "L2", value: 920, color: "hsl(175, 100%, 36%)" },
  { name: "L3", value: 480, color: "hsl(38, 92%, 50%)" },
  { name: "L4", value: 195, color: "hsl(160, 84%, 39%)" },
  { name: "L5", value: 95, color: "hsl(217, 91%, 60%)" },
];

const repaymentMethodData = [
  { method: "MoMo (Self)", count: 680, amount: 125000 },
  { method: "MoMo (Agent)", count: 95, amount: 28000 },
  { method: "Bank", count: 220, amount: 85000 },
  { method: "Cash", count: 150, amount: 42000 },
];

const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState("6m");

  // Fetch dashboard stats
  const { data: responseData } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("/api/admin/dashboard/stats");
      return res.data;
    },
  });

  // Mock KPI data (would come from API)
  const kpiData = {
    disbursementToday: responseData?.disbursementToday || 45200,
    disbursementWeek: responseData?.disbursementWeek || 285000,
    collectionRate: responseData?.collectionRate || 92.4,
    portfolioAtRisk: responseData?.portfolioAtRisk || 3.8,
    totalActiveDebt: responseData?.totalActiveDebt || 1250000,
    overdueLoans: responseData?.overdueLoans || 24,
  };

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
            totalL1={1380}
            totalGraduated={265}
          />

          {/* Geographic Map */}
          <GeographicMap 
            data={geographicData}
            totalSignups={3540}
          />
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
                        name="Repaid (₵)"
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
            <TabsTrigger value="repayments">Repayment Methods</TabsTrigger>
          </TabsList>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Monthly revenue, interest, and fee income</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        fill="url(#colorRevenue)"
                        strokeWidth={2}
                        name="Revenue (₵)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="repayments">
            <Card>
              <CardHeader>
                <CardTitle>Repayment Methods</CardTitle>
                <CardDescription>How users are making repayments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={repaymentMethodData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                      <XAxis type="number" className="text-xs fill-muted-foreground" />
                      <YAxis dataKey="method" type="category" className="text-xs fill-muted-foreground" width={100} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Transactions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
