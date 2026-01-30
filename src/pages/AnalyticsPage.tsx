import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Users, CreditCard, Banknote, AlertTriangle, DollarSign, Calendar, Layers, PieChart as PieChartIcon } from "lucide-react";
import { useState } from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { TierDistributionChart } from "@/components/dashboard/TierDistributionChart";
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
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const revenueData = [
  { month: "Jul", revenue: 12500, disbursed: 45000, repaid: 38000 },
  { month: "Aug", revenue: 15200, disbursed: 52000, repaid: 44000 },
  { month: "Sep", revenue: 18100, disbursed: 61000, repaid: 52000 },
  { month: "Oct", revenue: 21300, disbursed: 72000, repaid: 61000 },
  { month: "Nov", revenue: 19800, disbursed: 68000, repaid: 58000 },
  { month: "Dec", revenue: 24500, disbursed: 85000, repaid: 72000 },
  { month: "Jan", revenue: 28900, disbursed: 98000, repaid: 84000 },
];

const userGrowthData = [
  { month: "Jul", newUsers: 120, activeUsers: 450, churned: 15 },
  { month: "Aug", newUsers: 145, activeUsers: 520, churned: 22 },
  { month: "Sep", newUsers: 180, activeUsers: 610, churned: 18 },
  { month: "Oct", newUsers: 210, activeUsers: 720, churned: 25 },
  { month: "Nov", newUsers: 195, activeUsers: 815, churned: 30 },
  { month: "Dec", newUsers: 250, activeUsers: 945, churned: 28 },
  { month: "Jan", newUsers: 280, activeUsers: 1120, churned: 35 },
];

const defaultRateData = [
  { month: "Jul", rate: 4.2, count: 18 },
  { month: "Aug", rate: 3.8, count: 22 },
  { month: "Sep", rate: 3.5, count: 25 },
  { month: "Oct", rate: 4.1, count: 32 },
  { month: "Nov", rate: 3.9, count: 30 },
  { month: "Dec", rate: 3.2, count: 28 },
  { month: "Jan", rate: 2.8, count: 26 },
];

const loansByTierData = [
  { name: "Tier L1", value: 450, color: "hsl(var(--primary))" },
  { name: "Tier L2", value: 320, color: "hsl(var(--secondary-teal))" },
  { name: "Tier L3", value: 180, color: "hsl(var(--chart-3))" },
  { name: "Tier L4", value: 95, color: "hsl(var(--chart-4))" },
  { name: "Tier L5", value: 45, color: "hsl(var(--chart-5))" },
];

const repaymentMethodData = [
  { method: "MoMo (Self)", count: 680, amount: 125000 },
  { method: "MoMo (Agent)", count: 95, amount: 28000 },
  { method: "Bank", count: 220, amount: 85000 },
  { method: "Cash", count: 150, amount: 42000 },
];

const networkData = [
  { name: "MTN", value: 65, color: "#FFCB05" },
  { name: "Telecel", value: 25, color: "#E20074" },
  { name: "AT", value: 5, color: "#0000FF" },
  { name: "Bank", value: 5, color: "#333333" },
];

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  prefix?: string;
}

interface DashboardStats {
  loanBook: string;
  activeLoans: string;
  repaymentEfficiency: string;
  defaultRate: string;
  totalLoansCumulative: string;
  totalDisbursedCumulative: string;
  disbursedThisMonth: string;
  avgLoanSize: string;
  interestIncome: string;
  feeIncome: string;
  lossDefaults: string;
}

const MetricCard = ({ title, value, change, icon, prefix = "" }: MetricCardProps) => {
  const isPositive = change >= 0;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">
              {prefix}{value}
            </p>
            <div className={`flex items-center gap-1 text-sm ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>{isPositive ? "+" : ""}{change}% vs last month</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function normalizeStatsResponse(responseData: unknown): DashboardStats | undefined {
  if (!responseData || typeof responseData !== "object") {
    return undefined;
  }

  if ("success" in responseData) {
    const wrapped = responseData as { success: boolean; data?: DashboardStats };
    return wrapped.success && wrapped.data ? wrapped.data : undefined;
  }

  if ("data" in responseData) {
    const wrapped = responseData as { data: DashboardStats };
    return wrapped.data ?? undefined;
  }

  return responseData as DashboardStats;
}

const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState("6m");

  // Fetch dashboard stats for financial data
  const { data: responseData } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("/api/admin/dashboard/stats");
      return res.data;
    },
  });

  const stats = normalizeStatsResponse(responseData);

  const data = stats ?? {
    totalLoansCumulative: "N/A",
    totalDisbursedCumulative: "N/A",
    disbursedThisMonth: "N/A",
    avgLoanSize: "N/A",
    interestIncome: "N/A",
    feeIncome: "N/A",
    lossDefaults: "N/A",
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics & Financial Review</h1>
            <p className="text-muted-foreground">Detailed financial insights, loan performance, and revenue trends</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">Last Month</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Financial Review Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Financial Review</h2>
            <p className="text-muted-foreground mb-6">Complete overview of portfolio performance and financials</p>
          </div>

          {/* Performance Overview */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Portfolio Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard
                title="Total Loans (Cumulative)"
                value={data.totalLoansCumulative}
                icon={Layers}
                trend={{ value: 15.3, isPositive: true }}
              />
              <StatsCard
                title="Total Disbursed (All Time)"
                value={data.totalDisbursedCumulative === "N/A" ? "N/A" : `₵${data.totalDisbursedCumulative}`}
                icon={DollarSign}
                trend={{ value: 10.8, isPositive: true }}
              />
              <StatsCard
                title="Disbursed This Month"
                value={data.disbursedThisMonth === "N/A" ? "N/A" : `₵${data.disbursedThisMonth}`}
                icon={Calendar}
                trend={{ value: 5.2, isPositive: true }}
              />
            </div>
          </div>

          {/* Financial Metrics */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Revenue & Income</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Avg. Loan Size"
                value={data.avgLoanSize === "N/A" ? "N/A" : `₵${data.avgLoanSize}`}
                icon={DollarSign}
                trend={{ value: 2.5, isPositive: true }}
              />
              <StatsCard
                title="Interest Income"
                value={data.interestIncome === "N/A" ? "N/A" : `₵${data.interestIncome}`}
                icon={TrendingUp}
                trend={{ value: 12, isPositive: true }}
              />
              <StatsCard
                title="Fee Income"
                value={data.feeIncome === "N/A" ? "N/A" : `₵${data.feeIncome}`}
                icon={PieChartIcon}
                trend={{ value: 8.5, isPositive: true }}
              />
              <StatsCard
                title="Loss (Defaults)"
                value={data.lossDefaults === "N/A" ? "N/A" : `₵${data.lossDefaults}`}
                icon={TrendingDown}
                trend={{ value: 1.2, isPositive: false }}
              />
            </div>
          </div>

          {/* Tier Distribution */}
          <div className="mt-6">
            <TierDistributionChart />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Revenue"
            value="140,300"
            change={18.2}
            prefix="₵"
            icon={<Banknote className="h-6 w-6 text-primary" />}
          />
          <MetricCard
            title="Active Loans"
            value="1,245"
            change={12.5}
            icon={<CreditCard className="h-6 w-6 text-primary" />}
          />
          <MetricCard
            title="Total Users"
            value="3,420"
            change={24.8}
            icon={<Users className="h-6 w-6 text-primary" />}
          />
          <MetricCard
            title="Default Rate"
            value="2.8%"
            change={-15.2}
            icon={<AlertTriangle className="h-6 w-6 text-primary" />}
          />
        </div>

        {/* Charts Tabs */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">Revenue & Loans</TabsTrigger>
            <TabsTrigger value="users">User Growth</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Revenue Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Revenue & Disbursement Trends</CardTitle>
                  <CardDescription>Monthly revenue, loans disbursed, and repayments</CardDescription>
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
                          <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--secondary-teal))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--secondary-teal))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                        <YAxis className="text-xs fill-muted-foreground" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="disbursed"
                          stroke="hsl(var(--secondary-teal))"
                          fill="url(#colorDisbursed)"
                          name="Disbursed (₵)"
                        />
                        <Area
                          type="monotone"
                          dataKey="repaid"
                          stroke="hsl(var(--chart-3))"
                          fill="none"
                          strokeDasharray="5 5"
                          name="Repaid (₵)"
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--primary))"
                          fill="url(#colorRevenue)"
                          name="Revenue (₵)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Loans by Tier */}
              <Card>
                <CardHeader>
                  <CardTitle>Loans by Tier</CardTitle>
                  <CardDescription>Distribution of active loans across tiers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={loansByTierData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {loansByTierData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Repayment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Repayment Methods</CardTitle>
                  <CardDescription>How users are making repayments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={repaymentMethodData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs fill-muted-foreground" />
                        <YAxis dataKey="method" type="category" className="text-xs fill-muted-foreground" width={80} />
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
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Growth Trends</CardTitle>
                <CardDescription>New registrations, active users, and churn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
                      <Line
                        type="monotone"
                        dataKey="activeUsers"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                        name="Active Users"
                      />
                      <Line
                        type="monotone"
                        dataKey="newUsers"
                        stroke="hsl(var(--secondary-teal))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--secondary-teal))" }}
                        name="New Users"
                      />
                      <Line
                        type="monotone"
                        dataKey="churned"
                        stroke="hsl(var(--destructive))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: "hsl(var(--destructive))" }}
                        name="Churned"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Default Rate Trends</CardTitle>
                    <CardDescription>Monthly default rate percentage and count</CardDescription>
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Filter Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="l1">Tier L1</SelectItem>
                      <SelectItem value="l2">Tier L2</SelectItem>
                      <SelectItem value="l3">Tier L3</SelectItem>
                      <SelectItem value="l4">Tier L4</SelectItem>
                      <SelectItem value="l5">Tier L5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={defaultRateData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                      <YAxis yAxisId="left" className="text-xs fill-muted-foreground" />
                      <YAxis yAxisId="right" orientation="right" className="text-xs fill-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="count" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Default Count" />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="rate"
                        stroke="hsl(var(--destructive))"
                        strokeWidth={2}
                        name="Default Rate (%)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>


            <div className="grid gap-4 md:grid-cols-2">
               <Card>
                <CardHeader>
                  <CardTitle>Disbursement Networks</CardTitle>
                   <CardDescription>Market share by network provider</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                     <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={networkData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {networkData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
               </Card>
               
               <Card>
                <CardHeader>
                  <CardTitle>Repayment Networks</CardTitle>
                   <CardDescription>Market share by network provider</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                     <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={networkData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {networkData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
               </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
