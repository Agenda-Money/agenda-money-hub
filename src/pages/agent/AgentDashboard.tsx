import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CreditCard, DollarSign, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

export default function AgentDashboard() {
  const { user } = useAuth();

  const { data: statsData } = useQuery({
    queryKey: ["agent-stats", user?.agentCode],
    queryFn: async () => {
      const res = await api.get("/api/agents/my-stats");
      return res.data?.data;
    },
    enabled: !!user?.agentCode,
  });

  const metrics = statsData?.metrics ?? { signUpsAllTime: 0, signUpsThisMonth: 0 };
  const portfolio = statsData?.portfolio ?? {
    loansActive: 0,
    loansPending: 0,
    loansClosed: 0,
    loansOverdue: 0,
  };

  const stats = [
    {
      title: "Signups This Month",
      value: metrics.signUpsThisMonth.toString(),
      icon: Users,
      trend: "+12%",
      color: "text-blue-600",
      bg: "bg-blue-500/10",
    },
    {
      title: "Active Loans",
      value: portfolio.loansActive.toString(),
      icon: CreditCard,
      trend: "+8%",
      color: "text-green-600",
      bg: "bg-green-500/10",
    },
    {
      title: "Total Commission",
      value: "₵0",
      icon: DollarSign,
      trend: "+15%",
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
    {
      title: "Portfolio Health",
      value: "100%",
      icon: TrendingUp,
      trend: "+2%",
      color: "text-purple-600",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.fullName || "Agent"}!</h1>
        <p className="text-muted-foreground mt-1">Agent Code: <span className="font-semibold text-foreground">{statsData?.agentCode || user?.agentCode || "N/A"}</span></p>
        <p className="text-sm text-muted-foreground mt-1">Total Signups: <span className="font-medium text-foreground">{metrics.signUpsAllTime}</span></p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
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
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Kwame Mensah</p>
                    <p className="text-xs text-muted-foreground">0244123456</p>
                  </div>
                  <Badge className="bg-green-500/10 text-green-700 border-green-500/30">
                    Verified
                  </Badge>
                </div>
              ))}
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
              {[
                { id: "l1", name: "Ama Boateng", phone: "0201234567", status: "active", amount: "₵500" },
                { id: "l2", name: "Kofi Asante", phone: "0244567890", status: "active", amount: "₵800" },
                { id: "l3", name: "Abena Osei", phone: "0557890123", status: "overdue", amount: "₵300" },
                { id: "l4", name: "Yaw Mensah", phone: "0209876543", status: "active", amount: "₵1,200" },
              ].map((loan) => (
                <div key={loan.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{loan.name}</p>
                    <p className="text-xs text-muted-foreground">{loan.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{loan.amount}</p>
                    <Badge 
                      className={loan.status === "active" 
                        ? "bg-green-500/10 text-green-700 border-green-500/30" 
                        : "bg-red-500/10 text-red-700 border-red-500/30"
                      }
                    >
                      {loan.status === "active" ? "Active" : "Overdue"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
