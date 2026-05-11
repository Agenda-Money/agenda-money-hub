import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, CreditCard, TrendingUp, UserPlus, Activity, Clock, ChevronRight, CalendarClock, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  getAgentPortfolio,
  getAgentMyStats,
  getAgentCommissionSummary,
  getAgentPendingEndorsements,
  getAgentCommissions,
  getAgentDuePayments,
} from "@/lib/api";
import { cn, toNumber } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { startOfWeek, endOfWeek } from "date-fns";

interface AgentDashboardData {
  agentName?: string;
  fullName?: string;
  agentCode: string;
  totalSignups?: number;
  signupsThisMonth?: number;
  activeLoans?: number;
  data?: any;
  portfolio?: any;
  stats: {
    totalSignups: number;
    signups_this_month?: number;
    total_signups?: number;
    signupsThisMonth: number;
    activeLoans: number;
    active_loans?: number;
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

  const { data: pendingEndorsements = [] } = useQuery({
    queryKey: ["agent-pending-endorsements-list"],
    queryFn: async () => {
      const res = await getAgentPendingEndorsements();
      const data = res.data || res || {};
      const list = data.endorsements || data.loans || (Array.isArray(data) ? data : []);
      return Array.isArray(list) ? list : [];
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

  const { data: duePayments } = useQuery({
    queryKey: ["agent-due-payments", user?.email],
    queryFn: async () => {
      const res = await getAgentDuePayments();
      return res.data || res;
    },
    enabled: !!user?.email,
    refetchInterval: 5 * 60_000,
  });

  const dueToday: any[] = duePayments?.dueToday ?? [];
  const upcoming: any[] = duePayments?.upcoming ?? [];

  const groupedUpcoming = upcoming.reduce((acc: any, loan: any) => {
    const bucket = loan.ddBucket;
    if (!acc[bucket]) acc[bucket] = [];
    acc[bucket].push(loan);
    return acc;
  }, {});

  const sortedBuckets = Object.keys(groupedUpcoming).sort((a, b) => Number(b) - Number(a));

  useSocket(wsUrl, (message) => {
    if (message?.type === "KYC_VERIFIED_SUCCESS" || message?.type === "LOAN_ENDORSED") {
      refetchDashboard();
    }
  });

  const totalOutstandingToday = dueToday.reduce((sum, loan) => sum + (Number(loan.outstanding) || Number(loan.totalPayable) || 0), 0);
  const totalOutstandingUpcoming = upcoming.reduce((sum, loan) => sum + (Number(loan.outstanding) || Number(loan.totalPayable) || 0), 0);

  const stats = {
    totalSignups: toNumber(dashboardData?.totalSignups || dashboardData?.stats?.totalSignups || dashboardData?.stats?.total_signups || dashboardData?.data?.stats?.totalSignups || (typeof portfolioStats?.total === 'number' ? portfolioStats.total : 0)),
    signupsThisMonth: toNumber(dashboardData?.signupsThisMonth || dashboardData?.stats?.signupsThisMonth || dashboardData?.stats?.signups_this_month || 0),
    activeLoans: typeof portfolioStats?.activeLoans === 'number' ? portfolioStats.activeLoans : toNumber(dashboardData?.activeLoans || dashboardData?.stats?.activeLoans || dashboardData?.stats?.active_loans || dashboardData?.portfolio?.loansActive || dashboardData?.data?.stats?.activeLoans || 0),
    pendingEndorsements: pendingEndorsements.length,
    portfolioHealth: dashboardData?.stats?.portfolioHealth ?? 100,
  };
  const recentSignups = dashboardData?.recentSignups ?? [];

  const actionFeed = [
    ...pendingEndorsements.map((e: any) => ({
      id: e._id || e.id,
      fullName: e.user?.fullName || e.fullName || "Unknown Client",
      msisdn: e.user?.msisdn || e.msisdn || e.userMsisdn,
      selfieUrl: e.user?.selfieUrl || e.selfieUrl,
      kycStatus: e.user?.kycStatus || e.kycStatus || "verified",
      type: "ENDORSEMENT",
      loanAmount: e.amount || e.principal,
      reference: e.loanReference || e.reference
    })),
    ...recentSignups.map((s: any) => ({
      id: s._id || s.id,
      fullName: s.fullName,
      msisdn: s.msisdn,
      selfieUrl: s.selfieUrl,
      kycStatus: s.kycStatus,
      type: "NEW_CLIENT"
    }))
  ].slice(0, 8);

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
            Welcome back, <span className="text-foreground font-bold">{dashboardData?.agentName?.split(' ')[0] || dashboardData?.fullName?.split(' ')[0] || user?.fullName?.split(' ')[0] || "Pearson"}</span>. You have {stats.pendingEndorsements} approvals waiting.
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

      {/* Due Payments Section */}
      {(dueToday.length > 0 || upcoming.length > 0) && (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-black tracking-tight">Due Payments</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Due Today */}
            <Card className="border-none shadow-xl shadow-black/5 bg-card/50 backdrop-blur-xl overflow-hidden border border-white/20">
              <CardHeader className="pb-2 pt-4 px-5">
                 <div className="flex items-center justify-between">
                   <div>
                     <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Due Today (DD0)</CardTitle>
                     <p className="text-[10px] font-bold text-red-600/70 mt-0.5">TOTAL: GHS {totalOutstandingToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                   </div>
                   <Badge className="bg-red-500 text-white font-black text-xs px-2 shadow-sm">{dueToday.length}</Badge>
                 </div>
              </CardHeader>
              <CardContent className="p-0">
                {dueToday.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-5 pb-4 opacity-60">No loans due today.</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {dueToday.map((loan: any) => (
                      <div key={loan.loanId} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="text-sm font-bold text-foreground">{loan.fullName || loan.userMsisdn}</p>
                          <p className="text-xs text-muted-foreground">{loan.userMsisdn} · {loan.loanReference}</p>
                        </div>
                         <div className="text-right">
                           <p className="text-sm font-black text-foreground">GHS {(loan.outstanding ?? loan.totalPayable).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                           <div className="flex items-center justify-end gap-1 mt-0.5">
                             {loan.status && (
                               <Badge 
                                 variant="outline" 
                                 className={cn(
                                   "text-[9px] font-black uppercase py-0 px-1 border-0",
                                   loan.status === 'overdue' ? "bg-red-100 text-red-700" :
                                   loan.status === 'partial_repaid' ? "bg-amber-100 text-amber-700" :
                                   "bg-blue-100 text-blue-700"
                                 )}
                               >
                                 {loan.status === 'partial_repaid' ? 'Partial' : loan.status}
                               </Badge>
                             )}
                             <Badge variant="outline" className="text-[9px] font-black border-red-200 text-red-600 py-0 px-1">TODAY</Badge>
                           </div>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Reminders (DD-2 and DD-3) */}
            <Card className="border-none shadow-xl shadow-black/5 bg-card/50 backdrop-blur-xl overflow-hidden border border-white/20">
              <CardHeader className="pb-2 pt-4 px-5">
                 <div className="flex items-center justify-between">
                   <div>
                     <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                       <Bell className="h-3.5 w-3.5" /> Upcoming Reminders
                     </CardTitle>
                     <p className="text-[10px] font-bold text-amber-600/70 mt-0.5">TOTAL: GHS {totalOutstandingUpcoming.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                   </div>
                   <Badge className="bg-amber-500 text-white font-black text-xs px-2 shadow-sm">{upcoming.length}</Badge>
                 </div>
              </CardHeader>
              <CardContent className="p-0">
                 {upcoming.length === 0 ? (
                   <p className="text-sm text-muted-foreground px-5 pb-4 opacity-60">No upcoming payments in the next 3 days.</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {sortedBuckets.map((bucketStr) => {
                      const bucketLoans = groupedUpcoming[bucketStr];
                      const bucket = Number(bucketStr);
                      const label = bucket === -1 ? "Due Tomorrow" : bucket === -2 ? "Due in 2 days" : `Due in ${Math.abs(bucket)} days`;
                      
                      return (
                        <div key={bucketStr} className="space-y-0">
                          <div className="bg-muted/30 px-5 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-y border-border/10">
                            {label}
                          </div>
                          {bucketLoans.map((loan: any) => (
                            <div key={loan.loanId} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                              <div>
                                <p className="text-sm font-bold text-foreground">{loan.fullName || loan.userMsisdn}</p>
                                <p className="text-xs text-muted-foreground">{loan.userMsisdn} · {loan.loanReference}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-black text-foreground">GHS {(loan.outstanding ?? loan.totalPayable).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                  {loan.status && (
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "text-[9px] font-black uppercase py-0 px-1 border-0",
                                        loan.status === 'partial_repaid' ? "bg-amber-100 text-amber-700" :
                                        loan.status === 'overdue' ? "bg-red-100 text-red-700" :
                                        "bg-blue-100 text-blue-700"
                                      )}
                                    >
                                      {loan.status === 'partial_repaid' ? 'Partial' : loan.status}
                                    </Badge>
                                  )}
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] font-black py-0 px-1",
                                      bucket === -1 ? "border-amber-300 text-amber-700" :
                                      bucket === -2 ? "border-amber-200 text-amber-600" :
                                      "border-emerald-200 text-emerald-600"
                                    )}
                                  >
                                    {label.toLowerCase()}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

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
                 {actionFeed.length > 0 ? (
                    actionFeed.map((item) => (
                      <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-muted/30 transition-all group">
                         <div className="flex items-center gap-4">
                            <Dialog>
                               <DialogTrigger asChild>
                                 <div className="relative cursor-pointer hover:opacity-80 transition-opacity">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-pink flex items-center justify-center text-primary-foreground font-black text-sm border-2 border-white shadow-sm shrink-0">
                                      {item.selfieUrl ? (
                                        <img src={item.selfieUrl} alt={item.fullName} className="w-full h-full object-cover" />
                                      ) : (
                                        item.fullName?.charAt(0) || "?"
                                      )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-card rounded-full flex items-center justify-center p-0.5 shadow-sm border border-border/20">
                                      <div className={cn(
                                        "w-full h-full rounded-full",
                                        item.kycStatus?.toLowerCase() === "verified" ? "bg-emerald-500" : "bg-amber-500"
                                      )} />
                                    </div>
                                 </div>
                               </DialogTrigger>
                               <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-transparent border-none shadow-none flex justify-center">
                                 <DialogHeader className="sr-only">
                                   <DialogTitle>Client Selfie</DialogTitle>
                                   <DialogDescription>Full size view of client selfie</DialogDescription>
                                 </DialogHeader>
                                 {item.selfieUrl ? (
                                   <img src={item.selfieUrl} alt={item.fullName} className="max-w-full max-h-[80vh] object-contain rounded-xl" />
                                 ) : (
                                   <div className="w-64 h-64 rounded-full bg-gradient-pink flex items-center justify-center text-primary-foreground font-bold text-6xl shadow-xl">
                                     {item.fullName?.charAt(0) || "?"}
                                   </div>
                                 )}
                               </DialogContent>
                             </Dialog>
                            <div>
                               <p className="font-bold text-base text-foreground flex items-center gap-2">
                                 {item.fullName}
                                 <Badge 
                                   variant="outline" 
                                   className={cn(
                                     "text-[10px] font-black uppercase py-0 px-2 h-4",
                                     item.type === "ENDORSEMENT" ? "border-amber-200 text-amber-600 bg-amber-50" : "border-primary/20 text-primary bg-primary/5"
                                   )}
                                 >
                                   {item.type === "ENDORSEMENT" ? "Endorsement" : "New Client"}
                                 </Badge>
                               </p>
                               <p className="text-xs font-medium text-muted-foreground opacity-70">
                                 {item.type === "ENDORSEMENT" 
                                   ? `Needs your approval for GHS ${item.loanAmount} loan` 
                                   : `Recently onboarded • ${item.msisdn}`}
                               </p>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <Button 
                              size="sm" 
                              className={cn(
                                "h-9 px-4 rounded-xl font-bold hidden sm:flex",
                                item.type === "ENDORSEMENT" ? "bg-amber-500 hover:bg-amber-600" : "bg-primary hover:bg-primary/90"
                              )}
                              onClick={() => navigate(item.type === "ENDORSEMENT" ? "/agent/endorsements" : "/agent/portfolio")}
                            >
                              {item.type === "ENDORSEMENT" ? "Approve" : "View"}
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
