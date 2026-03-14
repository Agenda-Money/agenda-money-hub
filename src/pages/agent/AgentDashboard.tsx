import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, CreditCard, UserPlus, ArrowUpRight, Activity, TrendingUp, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface AgentDashboardData {
  agentName: string;
  agentCode: string;
  stats: {
    totalSignups: number;
    signupsThisMonth: number;
    activeLoans: number;
    totalCommission: number | string;
    portfolioHealth: number;
  };
  recentSignups: {
    _id: string;
    msisdn: string;
    fullName: string;
    kycStatus: string;
    createdAt: string;
  }[];
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function AgentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

  const { data: dashboardData, refetch: refetchDashboard } = useQuery({
    queryKey: ["agent-dashboard-stats", user?.email],
    queryFn: async () => {
      const res = await api.get("/api/agents/my-stats");
      return res.data?.data || res.data;
    },
    enabled: !!user?.email,
  });

  useSocket(wsUrl, (message) => {
    if (message?.type === "KYC_VERIFIED_SUCCESS") {
      refetchDashboard();
    }
  });

  const metrics = dashboardData?.metrics || { signUpsAllTime: 0, signUpsThisMonth: 0 };
  const portfolio = dashboardData?.portfolio || { loansActive: 0, loansClosed: 0, loansOverdue: 0 };

  const totalRelevantLoans = portfolio.loansActive + portfolio.loansClosed;
  const healthPercentage = totalRelevantLoans > 0
    ? Math.max(0, Math.round((1 - (portfolio.loansOverdue / totalRelevantLoans)) * 100))
    : 100;

  const recentSignups = dashboardData?.recentSignups ?? [];

  const statCards = [
    { title: "Total Signups", value: metrics.signUpsAllTime, icon: Users, accent: "text-primary" },
    { title: "This Month", value: metrics.signUpsThisMonth, icon: UserPlus, accent: "text-success" },
    { title: "Active Loans", value: portfolio.loansActive, icon: CreditCard, accent: "text-warning" },
    { title: "Health Score", value: `${healthPercentage}%`, icon: Activity, accent: "text-info" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Welcome, {dashboardData?.agentName?.split(" ")[0] || user?.fullName?.split(" ")[0] || "Agent"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">Agent Code:</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {dashboardData?.agentCode || user?.agentCode || "N/A"}
            </Badge>
          </div>
        </div>
        <Button
          onClick={() => navigate("/agent/onboard")}
          className="bg-gradient-pink hover:opacity-90 shadow-pink h-11 px-6 rounded-xl w-full sm:w-auto"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Onboard Client
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat, i) => (
          <motion.div key={stat.title} custom={i + 1} variants={fadeUp} initial="hidden" animate="visible">
            <Card className="border shadow-sm hover-lift h-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("p-2 rounded-xl bg-muted", stat.accent)}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Portfolio Health */}
      <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible">
        <Card className="border-primary/20 bg-background-pink-subtle">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Portfolio Health</p>
                  <p className="text-xs text-muted-foreground">Repayment rate of your clients</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{healthPercentage}%</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${healthPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-pink rounded-full"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Signups */}
      <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Signups</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/agent/portfolio")} className="text-xs">
                View All
                <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentSignups.length > 0 ? (
              recentSignups.slice(0, 5).map((signup: any, index: number) => (
                <motion.div
                  key={signup._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="flex items-center justify-between p-3 bg-muted/40 rounded-xl hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-pink flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
                      {signup.fullName?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{signup.fullName}</p>
                      <p className="text-xs text-muted-foreground">{signup.msisdn}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-[10px] font-semibold",
                      signup.kycStatus?.toLowerCase() === "verified"
                        ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5"
                        : "border-warning/30 text-warning bg-warning/5"
                    )}
                  >
                    {signup.kycStatus}
                  </Badge>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-10">
                <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent signups</p>
                <Button variant="link" size="sm" onClick={() => navigate("/agent/onboard")} className="mt-1 text-primary">
                  Onboard your first client
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
