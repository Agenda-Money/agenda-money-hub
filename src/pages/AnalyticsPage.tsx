import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import { KpiCards } from "@/components/analytics/KpiCards";
import { SignupGrowthChart } from "@/components/analytics/SignupGrowthChart";
import { GeographicMap } from "@/components/analytics/GeographicMap";
import { TierDistributionPie } from "@/components/analytics/TierDistributionPie";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line
} from "recharts";

const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState("6m");
  const skeletonKeys = useMemo(() => ["one", "two", "three", "four", "five", "six"], []);

  const { data: analyticsResponse, isLoading } = useQuery({
    queryKey: ["admin-analytics", timeRange],
    queryFn: async () => {
      const res = await api.get("/api/admin/analytics", { params: { range: timeRange } });
      return res.data?.data;
    },
  });

  const growthData = useMemo(() => {
    const entries = analyticsResponse?.growth ?? [];
    const merged = new Map<string, { month: string; l1: number; graduated: number; sort: number }>();

    entries.forEach((item: any) => {
      const month = item?._id?.month ?? "Unknown";
      const sort = item?._id?.sortOrder ?? 0;
      const existing = merged.get(month) ?? { month, l1: 0, graduated: 0, sort };

      if (item?._id?.isGraduated) {
        existing.graduated += item?.count ?? 0;
      } else {
        existing.l1 += item?.count ?? 0;
      }

      existing.sort = sort ?? existing.sort;
      merged.set(month, existing);
    });

    return Array.from(merged.values()).sort((a, b) => a.sort - b.sort);
  }, [analyticsResponse]);

  const liquidityData = useMemo(() => {
    const items = analyticsResponse?.liquidity ?? [];
    return items
      .map((item: any) => ({
        month: item?._id?.month ?? "",
        disbursed: item?.disbursed ?? 0,
        repaid: item?.repaid ?? 0,
        sort: item?._id?.sort ?? 0,
      }))
      .sort((a: any, b: any) => a.sort - b.sort);
  }, [analyticsResponse]);

  const totalL1 = useMemo(() => {
    if (typeof analyticsResponse?.distribution?.totalSignups === "number") {
      return analyticsResponse.distribution.totalSignups;
    }

    const lastPoint = growthData.at(-1);
    return lastPoint ? lastPoint.l1 : 0;
  }, [analyticsResponse, growthData]);

  const totalGraduated = useMemo(() => {
    const lastPoint = growthData.at(-1);
    return lastPoint ? lastPoint.graduated : 0;
  }, [growthData]);

  const regionPalette = useMemo(() => [
    "#e91e63",
    "#00e676",
    "#ffb300",
    "#42a5f5",
    "#ab47bc",
    "#26c6da",
  ], []);

  const geographicData = useMemo(() => {
    const regions = analyticsResponse?.distribution?.regions ?? [];
    return regions.map((region: any, index: number) => ({
      name: region?.region ?? "Unknown",
      signups: region?.count ?? 0,
      percentage: Number(region?.percentage ?? 0),
      color: regionPalette[index % regionPalette.length],
    }));
  }, [analyticsResponse, regionPalette]);

  const tierData = useMemo(() => {
    const tiers = analyticsResponse?.distribution?.tiers ?? [];
    return tiers.map((tier: any, index: number) => ({
      name: `L${tier?._id ?? index + 1}`,
      value: tier?.count ?? 0,
      color: regionPalette[index % regionPalette.length],
    }));
  }, [analyticsResponse, regionPalette]);

  const totalSignups = analyticsResponse?.distribution?.totalSignups ?? 0;
  const disbursedWeek = analyticsResponse?.summary?.disbursedWeek ?? 0;

  const kpiData = {
    disbursedToday: {
      amount: analyticsResponse?.summary?.disbursedToday?.amount ?? 0,
      change: analyticsResponse?.summary?.disbursedToday?.change ?? 0,
    },
    disbursedWeek,
    activeDebt: analyticsResponse?.summary?.activeDebt ?? 0,
    collectionRate: {
      percentage: analyticsResponse?.summary?.collectionRate?.percentage ?? 0,
      status: analyticsResponse?.summary?.collectionRate?.status,
    },
    portfolioAtRisk: {
      percentage: analyticsResponse?.summary?.portfolioAtRisk?.percentage ?? 0,
      status: analyticsResponse?.summary?.portfolioAtRisk?.status,
    },
    overdueLoans: analyticsResponse?.summary?.overdueLoans ?? 0,
  };

  const repaymentMethodData = analyticsResponse?.repaymentMethods ?? [];

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
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {skeletonKeys.map((key) => (
              <Skeleton key={key} className="h-[110px] w-full" />
            ))}
          </div>
        ) : (
          <KpiCards data={kpiData} />
        )}

        {/* Visual Trends Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Signup Growth Chart */}
          {isLoading ? (
            <Skeleton className="h-[420px] w-full" />
          ) : (
            <SignupGrowthChart 
              data={growthData}
              totalL1={totalL1}
              totalGraduated={totalGraduated}
            />
          )}

          {/* Geographic Map */}
          {isLoading ? (
            <Skeleton className="h-[420px] w-full" />
          ) : (
            <GeographicMap 
              data={geographicData}
              totalSignups={totalSignups}
            />
          )}
        </div>

        {/* Tier Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            <Skeleton className="h-[420px] w-full" />
          ) : (
            <TierDistributionPie data={tierData} />
          )}

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
                  {isLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={liquidityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d314d" />
                        <XAxis dataKey="month" className="text-xs fill-muted-foreground" axisLine={false} tickLine={false} />
                        <YAxis className="text-xs fill-muted-foreground" axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="disbursed" name="Disbursed" stroke="#e91e63" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="repaid" name="Closed" stroke="#00e676" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Detailed Charts Tabs */}
        <Tabs defaultValue="repayments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="repayments">Repayment Methods</TabsTrigger>
          </TabsList>

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
