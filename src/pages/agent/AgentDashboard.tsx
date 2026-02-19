import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, CreditCard, DollarSign, TrendingUp, UserPlus, ArrowUpRight, Activity, AlertCircle, CheckCircle2 } from "lucide-react";
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
    ghanaCardFrontUrl?: string;
    ghanaCardBackUrl?: string;
    selfieUrl?: string;
  }[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function AgentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

  const { data: dashboardData, refetch: refetchDashboard } = useQuery<AgentDashboardData>({
    queryKey: ["agent-dashboard-stats", user?.email],
    queryFn: async () => {
      const res = await api.get("/api/agents/dashboard-stats");
      return res.data?.data;
    },
    enabled: !!user?.email,
  });

  useSocket(wsUrl, (message) => {
    if (message?.type === "KYC_VERIFIED_SUCCESS") {
      refetchDashboard();
    }
  });

  const stats = dashboardData?.stats ?? {
    totalSignups: 0,
    signupsThisMonth: 0,
    activeLoans: 0,
    totalCommission: 0,
    portfolioHealth: 100,
  };
  
  const recentSignups = dashboardData?.recentSignups ?? [];

  const statCards = [
    {
      title: "Total Signups",
      value: stats.totalSignups.toString(),
      icon: Users,
      trend: "+12%",
      trendUp: true,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Signups This Month",
      value: stats.signupsThisMonth.toString(),
      icon: UserPlus,
      trend: "+8%",
      trendUp: true,
      gradient: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Active Loans",
      value: stats.activeLoans.toString(),
      icon: CreditCard,
      trend: "+5%",
      trendUp: true,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      title: "Total Commission",
      value:
        typeof stats.totalCommission === "number"
          ? `₵${stats.totalCommission.toLocaleString()}`
          : String(stats.totalCommission ?? ""),
      icon: DollarSign,
      trend: "+15%",
      trendUp: true,
      gradient: "from-purple-500 to-purple-600",
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 sm:space-y-8"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Welcome back, {dashboardData?.agentName?.split(' ')[0] || user?.fullName?.split(' ')[0] || "Agent"}! 👋
          </h1>
          <div className="text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            <span>Agent Code:</span>
            <Badge variant="secondary" className="font-mono">
              {dashboardData?.agentCode || user?.agentCode || "N/A"}
            </Badge>
          </div>
        </div>
        <Button 
          onClick={() => navigate("/agent/onboard")}
          className="bg-gradient-pink hover:opacity-90 shadow-pink w-full sm:w-auto"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          New Onboarding
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="group"
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden h-full">
              <div className={cn("h-1 bg-gradient-to-r", stat.gradient)} />
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    "p-2.5 rounded-xl bg-gradient-to-br text-white shadow-lg",
                    stat.gradient
                  )}>
                    <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                    stat.trendUp 
                      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" 
                      : "text-red-600 bg-red-50 dark:bg-red-500/10"
                  )}>
                    <TrendingUp className={cn("h-3 w-3", !stat.trendUp && "rotate-180")} />
                    {stat.trend}
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Portfolio Health Banner */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary/10">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Portfolio Health</h3>
                  <p className="text-sm text-muted-foreground">Repayment performance of your customers</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{stats.portfolioHealth}%</p>
                  <p className="text-xs text-muted-foreground">Repayment Rate</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {/* Recent Signups */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Signups</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/agent/portfolio")}>
                  View All
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentSignups.length > 0 ? (
                recentSignups.slice(0, 5).map((signup, index: number) => (
                  <motion.div 
                    key={signup._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-pink flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                        {signup.fullName?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{signup.fullName}</p>
                        <p className="text-xs text-muted-foreground">{signup.msisdn}</p>
                      </div>
                    </div>
                    <Badge className={cn(
                      "shrink-0",
                      signup.kycStatus?.toLowerCase() === "verified" 
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400" 
                        : "bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-400"
                    )}>
                      {signup.kycStatus}
                    </Badge>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent signups yet</p>
                  <Button variant="link" size="sm" onClick={() => navigate("/agent/onboard")}>
                    Start onboarding
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
