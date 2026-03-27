import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, CreditCard, TrendingUp, UserPlus, Activity, Clock, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { 
  getAgentPortfolio, 
  getAgentMyStats, 
  getAgentCommissionSummary, 
  getAgentPendingEndorsements, 
  getAgentCommissions 
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { startOfWeek, endOfWeek } from "date-fns";

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
  // Fetch full customer directory for accurate customer count and active loans
  const { data: portfolioStats } = useQuery({
    queryKey: ["agent-portfolio", user?.email],
    queryFn: async () => {
      const res = await getAgentPortfolio({ page: 1, limit: 1000 });
      let directory = [];
      const data = res.data || res;
      if (data?.directory) directory = data.directory;
      else if (Array.isArray(data?.data)) directory = data.data;
      else if (Array.isArray(data)) directory = data;
      // Total signups = directory length
      const total = directory.length;
      // Active loans = count of users with loanStatus === 'active'
      const activeLoans = directory.filter((u) => (u.loanStatus || '').toLowerCase() === 'active').length;
      return { total, activeLoans };
    },
    enabled: !!user?.email,
  });
  const navigate = useNavigate();
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

  const { data: dashboardDataRaw, refetch: refetchDashboard } = useQuery<AgentDashboardData>({
    queryKey: ["agent-dashboard-stats", user?.email],
    queryFn: async () => {
      const res = await getAgentMyStats();
      return res.data || res;
    },
    enabled: !!user?.email,
  });
  const dashboardData = dashboardDataRaw;



  const { data: commissionsData } = useQuery({
    queryKey: ["agent-commissions-summary"],
    queryFn: async () => {
      const res = await getAgentCommissionSummary();
      const data = res.data || res || {};
      return data.summary || data;
    },
    enabled: !!user?.email,
  });

  const { data: pendingEndorsementsCount } = useQuery({
    queryKey: ["agent-pending-endorsements-count"],
    queryFn: async () => {
      const res = await getAgentPendingEndorsements();
      const data = res.data || res || {};
      const list = data.endorsements || data.loans || (Array.isArray(data) ? data : []);
      return Array.isArray(list) ? list.length : 0;
    },
    enabled: !!user?.email,
  });

  const { data: weeklyCommissions } = useQuery({
    queryKey: ["agent-commissions-weekly", user?.email],
    queryFn: async () => {
      const now = new Date();
      const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const end = endOfWeek(now, { weekStartsOn: 1 });
      const res = await getAgentCommissions({ 
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit: 1000 
      });
      const data = res;
      const items = data?.commissions?.items || data?.data?.commissions?.items || data?.items || data?.commissions || data?.data?.items || [];
      return Array.isArray(items) ? items : [];
    },
    enabled: !!user?.email,
  });

  const earningsThisWeek = (weeklyCommissions || []).reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

  useSocket(wsUrl, (message) => {
    if (message?.type === "KYC_VERIFIED_SUCCESS" || message?.type === "LOAN_ENDORSED") {
      refetchDashboard();
    }
  });

  const stats = {
    totalSignups: typeof portfolioStats?.total === 'number' ? portfolioStats.total : (dashboardData?.stats?.totalSignups ?? 0),
    signupsThisMonth: dashboardData?.stats?.signupsThisMonth ?? 0,
    activeLoans: typeof portfolioStats?.activeLoans === 'number' ? portfolioStats.activeLoans : (dashboardData?.stats?.activeLoans ?? 0),
    pendingEndorsements: pendingEndorsementsCount ?? 0,
    portfolioHealth: dashboardData?.stats?.portfolioHealth ?? 100,
  };
  const recentSignups = dashboardData?.recentSignups ?? [];

  const statCards = [
    {
      title: "Active Loans",
      value: stats.activeLoans.toString(),
      icon: CreditCard,
      trend: "+5%",
      trendUp: true,
      gradient: "from-blue-500 to-indigo-600",
    },
    {
      title: "Total Signups",
      value: stats.totalSignups.toString(),
      icon: Users,
      trend: "+12%",
      trendUp: true,
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      title: "Pending Endorsements",
      value: stats.pendingEndorsements.toString(),
      icon: Clock,
      trend: "Urgent",
      trendUp: false,
      isAlert: true,
      gradient: "from-[#EC1B84] to-[#C1106A]",
      highlight: true
    },
    {
      title: "Earnings This Week",
      value: `GHS ${earningsThisWeek.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      trend: "Calculated",
      trendUp: true,
      gradient: "from-amber-500 to-orange-600",
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 sm:space-y-8 pb-12"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Welcome back, <span className="text-foreground font-bold">{dashboardData?.agentName?.split(' ')[0] || user?.fullName?.split(' ')[0] || "Pearson"}</span>. You have {stats.pendingEndorsements} approvals waiting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            className="h-12 px-6 rounded-2xl font-bold border-2 hover:bg-muted/50 hidden sm:flex"
            onClick={() => navigate("/agent/portfolio")}
          >
            My Portfolio
          </Button>
          <Button 
            onClick={() => navigate("/agent/onboard")}
            className="h-12 px-8 rounded-2xl bg-gradient-pink hover:opacity-90 shadow-pink font-bold flex-1 sm:flex-none"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Onboard Client
          </Button>

        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="group"
          >
            <Card className={cn(
               "border-none shadow-xl shadow-black/5 hover:shadow-2xl transition-all duration-300 overflow-hidden h-full bg-card/50 backdrop-blur-xl border border-white/10",
               stat.highlight && "ring-2 ring-primary/20 bg-primary/5"
            )}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "p-3 rounded-2xl bg-gradient-to-br text-white shadow-lg",
                    stat.gradient
                  )}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div className={cn(
                    "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                    stat.isAlert 
                      ? "text-white bg-[#EC1B84] shadow-pink" 
                      : stat.trendUp 
                        ? "text-emerald-600 bg-emerald-50" 
                        : "text-blue-600 bg-blue-50"
                  )}>
                    {stat.trend}
                  </div>
                </div>
                <p className="text-3xl font-black text-foreground tracking-tight">{stat.value}</p>
                <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-wider opacity-60">{stat.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Main 3-Column Layout (Logic: Grid 12 cols, center 8, right 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* CENTER COLUMN: Action Feed & Recent Items */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Action Feed (Attention Required) */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4 px-1">
               <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                 Attention Required
                 <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
               </h3>
               <Button variant="ghost" size="sm" className="text-xs font-bold text-primary hover:bg-primary/5">
                 Mark all read
               </Button>
            </div>
            
            <Card className="border-none shadow-xl shadow-black/5 bg-card/50 backdrop-blur-xl overflow-hidden border border-white/20">
              <CardContent className="p-0 divide-y divide-border/50">
                 {recentSignups.length > 0 ? (
                    recentSignups.slice(0, 6).map((signup, index) => (
                      <div key={signup._id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-muted/30 transition-all group">
                         <div className="flex items-center gap-4">
                            <div className="relative">
                               <div className="w-12 h-12 rounded-2xl bg-gradient-pink flex items-center justify-center text-primary-foreground font-black text-lg">
                                 {signup.fullName?.charAt(0) || "?"}
                               </div>
                               <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-card rounded-full flex items-center justify-center p-0.5 shadow-sm border border-border/50">
                                 <div className={cn(
                                   "w-full h-full rounded-full animate-pulse",
                                   signup.kycStatus?.toLowerCase() === "verified" ? "bg-emerald-500" : "bg-amber-500"
                                 )} />
                               </div>
                            </div>
                            <div>
                               <p className="font-bold text-base text-foreground flex items-center gap-2">
                                 {signup.fullName}
                                 <Badge variant="outline" className="text-[10px] font-black uppercase py-0 px-2 h-4 border-primary/20 text-primary">NEW CLIENT</Badge>
                               </p>
                               <p className="text-xs font-medium text-muted-foreground opacity-70">
                                 Submitted loan request • {signup.msisdn}
                               </p>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <Button 
                              size="sm" 
                              className="h-9 px-4 rounded-xl font-bold bg-primary hover:bg-primary/90 hidden sm:flex"
                              onClick={() => navigate(`/agent/endorsements`)}
                            >
                              Review
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                               <ChevronRight className="h-4 w-4" />
                            </Button>
                         </div>
                      </div>
                    ))
                 ) : (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-muted/50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-border/50">
                       <Activity className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <p className="font-bold text-foreground">All caught up!</p>
                    <p className="text-sm text-muted-foreground mt-1">No pending actions at the moment.</p>
                  </div>
                 )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* RIGHT SIDEBAR: Health & Commissions */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Portfolio Health Widget */}
          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-xl shadow-black/5 bg-card/80 backdrop-blur-xl overflow-hidden border border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground opacity-60">Portfolio Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="flex items-center justify-center py-4 relative">
                    {/* Simple SVG Gauge */}
                    <svg className="w-32 h-32 transform -rotate-90">
                       <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/30" />
                       <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={Math.PI * 116} strokeDashoffset={Math.PI * 116 * (1 - stats.portfolioHealth / 100)} className="text-primary" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <span className="text-2xl font-black text-foreground">{stats.portfolioHealth}%</span>
                       <span className="text-[10px] font-bold text-muted-foreground uppercase">Stable</span>
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                       <span className="font-bold text-muted-foreground">Repayment Trend (7d)</span>
                       <span className="text-emerald-500 font-bold flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          +2.4%
                       </span>
                    </div>
                    {/* Mock Trend Line */}
                    <div className="h-10 flex items-end gap-1 px-1">
                       {[40, 60, 45, 70, 85, 65, 95].map((h, i) => (
                          <div key={i} className="flex-1 bg-primary/20 rounded-t-[2px] hover:bg-primary transition-colors cursor-help" style={{ height: `${h}%` }} />
                       ))}
                    </div>
                 </div>
              </CardContent>
            </Card>
          </motion.div>


        </div>

      </div>
    </motion.div>
  );
}
