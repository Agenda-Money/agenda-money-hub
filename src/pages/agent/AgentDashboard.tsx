import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CreditCard, DollarSign, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";

export default function AgentDashboard() {
  const { user } = useAuth();
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

  const { data: dashboardStats, refetch: refetchDashboard } = useQuery({
    queryKey: ["agent-dashboard-stats", user?.email],
    queryFn: async () => {
      const res = await api.get("/api/agents/dashboard-stats");
      return res.data?.data;
    },
    enabled: !!user?.email,
  });

  // Set up socket listener for KYC verification events
  useSocket(wsUrl, (message) => {
    if (message?.type === "KYC_VERIFIED_SUCCESS") {
      // Refetch dashboard stats immediately when KYC is verified
      refetchDashboard();
    }
  });

  const stats = dashboardStats?.stats ?? {
    totalSignups: 0,
    signupsThisMonth: 0,
    activeLoans: 0,
    totalCommission: "₵0",
    portfolioHealth: "100%",
  };
  
  const recentSignups = dashboardStats?.recentSignups ?? [];

  const statCards = [
    {
      title: "Total Signups",
      value: stats.totalSignups?.toString() ?? "0",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
    },
    {
      title: "Signups This Month",
      value: stats.signupsThisMonth?.toString() ?? "0",
      icon: Users,
      color: "text-green-600",
      bg: "bg-green-500/10",
    },
    {
      title: "Active Loans",
      value: stats.activeLoans?.toString() ?? "0",
      icon: CreditCard,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
    {
      title: "Total Commission",
      value: stats.totalCommission ?? "₵0",
      icon: DollarSign,
      color: "text-purple-600",
      bg: "bg-purple-500/10",
    },
    {
      title: "Portfolio Health",
      value: stats.portfolioHealth ?? "100%",
      icon: TrendingUp,
      color: "text-indigo-600",
      bg: "bg-indigo-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {dashboardStats?.agentName || user?.fullName || "Agent"}!</h1>
        <p className="text-muted-foreground mt-1">Agent Code: <span className="font-semibold text-foreground">{dashboardStats?.agentCode || user?.agentCode || "N/A"}</span></p>
        <p className="text-sm text-muted-foreground mt-1">Total Signups: <span className="font-medium text-foreground">{stats.totalSignups ?? 0}</span></p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={cn("p-2 rounded-lg", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">Updated from live stats</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Signups */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Recent Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSignups.length > 0 ? (
                recentSignups.map((signup: any) => (
                  <div key={signup._id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{signup.fullName}</p>
                      <p className="text-xs text-muted-foreground">{signup.msisdn}</p>
                    </div>
                    <Badge className={
                      signup.kycStatus === "VERIFIED" 
                        ? "bg-green-500/10 text-green-700 border-green-500/30" 
                        : "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
                    }>
                      {signup.kycStatus}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No recent signups yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loan Health */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Loan Health Monitor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 🚀 Use data from backend instead of hardcoded list */}
              {dashboardStats?.loanHealthMonitor?.length > 0 ? (
                dashboardStats.loanHealthMonitor.map((loan: any) => (
                  <div key={loan.msisdn} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{loan.name}</p>
                      <p className="text-xs text-muted-foreground">{loan.msisdn}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">₵{loan.amount}</p>
                      <Badge 
                        className={loan.status.toLowerCase() === "active" 
                          ? "bg-green-500/10 text-green-700 border-green-500/30" 
                          : "bg-red-500/10 text-red-700 border-red-500/30"
                        }
                      >
                        {loan.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No active loans in your portfolio</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
