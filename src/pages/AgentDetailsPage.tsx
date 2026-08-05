import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, User, MapPin, Briefcase, Calendar, Phone, Mail, Hash, UserPlus, Clock, FileText, AlertCircle, CheckCircle2, Search, Banknote, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { SecureKycImage } from "@/components/common/SecureKycImage";

import { useQuery } from "@tanstack/react-query";
import { getAdminAgentDetails, getAdminAgentCommissions, getAdminDeductions } from "@/lib/api";
import { formatAmount, formatNumber } from "@/lib/utils";
import { toast } from "sonner";

const formatGHS = (amount: number | string | undefined | null) => {
  const val = Number(amount) || 0;
  return new Intl.NumberFormat('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
};

const toNumber = (val: any) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(val) || 0;
};

export default function AgentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [commPage, setCommPage] = useState(1);

  // Fetch Agent Profile
  const { data: agentDataResponse, isLoading: isAgentLoading, error: agentError } = useQuery({
    queryKey: ["agent", id],
    queryFn: async () => {
      const res = await getAdminAgentDetails(id!);
      return res;
    },
    enabled: !!id,
  });

  // Fetch Agent Commissions
  const { data: commissionResponse, isLoading: isCommissionLoading } = useQuery({
    queryKey: ["agent-commissions", id, commPage],
    queryFn: () => getAdminAgentCommissions(id!, { page: commPage, limit: 50 }),
    enabled: !!id,
  });

  const agentDataRawForPhone = agentDataResponse?.data?.agent || agentDataResponse?.data || agentDataResponse || {};
  const agentPhone = agentDataRawForPhone.phoneNumber || agentDataRawForPhone.phone || agentDataRawForPhone.msisdn;

  // Fetch Default Penalty Deductions (Contractor Agreement §7.0) for this agent
  const { data: deductionsResponse, isLoading: isDeductionsLoading } = useQuery({
    queryKey: ["agent-default-deductions", agentPhone],
    queryFn: () => getAdminDeductions({ agentMsisdn: agentPhone, deductionType: "DEFAULT_PENALTY", limit: 50 }),
    enabled: !!agentPhone,
  });

  const agentDataRaw = agentDataResponse?.data?.agent || agentDataResponse?.data || agentDataResponse || {};
  const portfolioRaw = agentDataResponse?.data?.portfolio || null;
  const statsRaw = agentDataRaw.stats || {};

  // Map API data to UI structure
  const agent = {
    id: agentDataRaw._id || agentDataRaw.id || id,
    name: agentDataRaw.fullName || agentDataRaw.agentName || (agentDataRaw.firstName ? `${agentDataRaw.firstName} ${agentDataRaw.surname || ""}`.trim() : "—"),
    email: agentDataRaw.email || "—",
    phone: agentDataRaw.phoneNumber || agentDataRaw.phone || agentDataRaw.msisdn || "—",
    nodeCode: agentDataRaw.agentCode || agentDataRaw.nodeCode || "—",
    status: agentDataRaw.status === "inactive" || agentDataRaw.isActive === false ? "inactive" : "active",
    role: agentDataRaw.role || "agent",
    joinedAt: agentDataRaw.createdAt ? new Date(agentDataRaw.createdAt).toLocaleDateString('en-GB') : "—",
    address: agentDataRaw.address || "—",
    location: agentDataRaw.location || agentDataRaw.region || "—",
    totalTransactions: portfolioRaw?.totalTransactions || agentDataRaw.totalTransactions || 0,
    signUpsAllTime: statsRaw.totalSignups ?? portfolioRaw?.metrics?.signUpsAllTime ?? agentDataRaw.totalSignups ?? agentDataRaw.signUpsAllTime ?? 0,
    signUpsThisMonth: statsRaw.signupsThisMonth ?? portfolioRaw?.metrics?.signUpsThisMonth ?? agentDataRaw.signupsThisMonth ?? agentDataRaw.signUpsThisMonth ?? 0,
    loansActive: statsRaw.activeLoans ?? portfolioRaw?.portfolio?.loansActive ?? agentDataRaw.activeLoans ?? 0,
    loansPending: statsRaw.pendingLoans ?? portfolioRaw?.portfolio?.loansPending ?? agentDataRaw.loansPending ?? 0,
    loansClosed: statsRaw.closedLoans ?? portfolioRaw?.portfolio?.loansClosed ?? agentDataRaw.loansClosed ?? 0,
    loansOverdue: statsRaw.overdueLoans ?? portfolioRaw?.portfolio?.loansOverdue ?? agentDataRaw.loansOverdue ?? 0,
    loansDefaulted: statsRaw.defaultedLoans ?? portfolioRaw?.metrics?.loansDefaulted ?? agentDataRaw.defaultedLoans ?? 0,
    selfieUrl: agentDataRaw.selfieUrl,
    ghanaCardFrontUrl: agentDataRaw.ghanaCardFrontUrl,
    ghanaCardBackUrl: agentDataRaw.ghanaCardBackUrl,
    ghanaCardNumber: agentDataRaw.ghanaCardNumber || "—",
    customers: (portfolioRaw?.customers || agentDataRaw.customers || []).map((c: any) => ({
      id: c._id || c.id,
      fullName: c.fullName || "—",
      phone: c.phone || c.msisdn || c.phoneNumber || "—",
      kycStatus: c.kycStatus || "pending",
      loanStatus: c.loanStatus || "none",
      loanAmount: c.loanAmount || 0,
      joinedAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB') : "—"
    }))
  };

  const isLoading = isAgentLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-9 w-24 bg-muted rounded-md" />
          <div className="h-48 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (agentError || !agent.id || agent.id === 'undefined') {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Button 
            variant="ghost" 
            className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/agents")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Agents
          </Button>
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="text-6xl">⚠️</div>
              <h2 className="text-2xl font-bold">Agent Not Found</h2>
              <p className="text-muted-foreground">
                The agent you're looking for doesn't exist or there was an error loading their data.
              </p>
              <Button onClick={() => navigate("/agents")}>Back to Agents List</Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const filteredCustomers = (agent.customers ?? []).filter((c: any) => {
    const fullName = (c.fullName ?? "").toLowerCase();
    const phone = c.phone ?? "";
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || phone.toLowerCase().includes(term);
  });


  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24 lg:pb-6">
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/agents")}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Agents
            </Button>
          </div>

          <div className="bg-card p-5 sm:p-6 rounded-2xl shadow-sm border border-border">
            <div className="flex flex-col lg:flex-row justify-between gap-6">
              <div className="flex items-start gap-4 sm:gap-5 min-w-0">
                  {agent.selfieUrl ? (
                    <SecureKycImage
                      imageUrl={agent.selfieUrl}
                      label="Agent Selfie"
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 sm:border-4 border-background shadow-sm shrink-0"
                    />
                 ) : (
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl sm:text-3xl font-bold shrink-0">
                      {agent.name.charAt(0)}
                    </div>
                 )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1.5">
                     <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{agent.name}</h1>
                     {agent.nodeCode !== "—" && (
                         <Badge variant="outline" className="font-mono bg-blue-50 text-blue-700 border-blue-200">{agent.nodeCode}</Badge>
                     )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-muted-foreground mb-3">
                    <span className="truncate">{agent.phone}</span>
                    {agent.email !== "—" && (
                       <>
                         <span className="hidden sm:inline">•</span>
                         <span className="truncate">{agent.email}</span>
                       </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={agent.status === "active" ? "default" : "secondary"} className={cn("px-2.5 py-0.5", agent.status === "active" ? "bg-emerald-500 hover:bg-emerald-600 shadow-sm text-white" : "")}>
                       {agent.status}
                    </Badge>
                    <Badge variant="outline" className={cn(
                      "px-2.5 py-0.5 font-bold uppercase tracking-widest text-[10px]",
                      agent.role === 'manager' ? "bg-purple-50 text-purple-700 border-purple-200" :
                      agent.role === 'supervisor' ? "bg-blue-50 text-blue-700 border-blue-200" :
                      "bg-slate-50 text-slate-700 border-slate-200"
                    )}>
                      {agent.role}
                    </Badge>
                    <Badge variant="secondary" className="bg-muted/60 text-muted-foreground px-2.5 py-0.5">Joined {agent.joinedAt}</Badge>
                  </div>
                </div>
              </div>

               <div className="flex flex-col gap-4 shrink-0 lg:w-[350px]">

                 <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-4 sm:p-3 rounded-xl sm:rounded-lg border bg-muted/20 flex flex-col justify-center">
                       <div className="flex items-center gap-2 text-muted-foreground mb-1.5 sm:mb-1">
                         <UserPlus className="h-4 w-4" />
                         <span className="text-xs font-medium uppercase tracking-wider">Total Signups</span>
                       </div>
                        <p className="text-2xl sm:text-xl font-bold text-foreground">{formatNumber(agent.signUpsAllTime)}</p>
                    </div>
                    <div className="p-4 sm:p-3 rounded-xl sm:rounded-lg border bg-muted/20 flex flex-col justify-center">
                       <div className="flex items-center gap-2 text-muted-foreground mb-1.5 sm:mb-1">
                         <Clock className="h-4 w-4" />
                         <span className="text-xs font-medium uppercase tracking-wider">This Month</span>
                       </div>
                        <p className="text-2xl sm:text-xl font-bold text-foreground">{formatNumber(agent.signUpsThisMonth)}</p>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="overview" className="space-y-4 w-full">
          <TabsList className="grid w-full grid-cols-3 sm:w-max sm:inline-grid overflow-x-auto no-scrollbar">
            <TabsTrigger className="min-w-[120px]" value="overview">Overview</TabsTrigger>
            <TabsTrigger className="min-w-[120px]" value="profile">Profile & KYC</TabsTrigger>
            <TabsTrigger className="min-w-[120px]" value="commissions">Commissions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6 m-0">
             {/* Loan Portfolio */}
             <Card>
                <CardHeader className="pb-4">
                   <CardTitle className="text-lg flex items-center gap-2">
                     <FileText className="h-5 w-5 text-muted-foreground" />
                     Network Loan Portfolio
                   </CardTitle>
                   <CardDescription>Aggregate status of loans tied to this agent's node code.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                       <div className="p-4 rounded-xl border bg-blue-50/50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900 flex flex-col">
                          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Active Loans</p>
                          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-auto">{formatNumber(agent.loansActive)}</p>
                       </div>
                       <div className="p-4 rounded-xl border bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900 flex flex-col">
                          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-1">Pending Loans</p>
                          <p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-auto">{formatNumber(agent.loansPending)}</p>
                       </div>
                       <div className="p-4 rounded-xl border bg-green-50/50 dark:bg-green-950/10 border-green-100 dark:border-green-900 flex flex-col">
                           <div className="flex items-center gap-1.5 mb-1">
                             <CheckCircle2 className="h-4 w-4 text-green-600" />
                             <p className="text-sm text-green-600 dark:text-green-400 font-medium">Closed / Repaid</p>
                           </div>
                           <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-auto">{formatNumber(agent.loansClosed)}</p>
                       </div>
                       <div className="p-4 rounded-xl border bg-orange-50/50 dark:bg-orange-950/10 border-orange-100 dark:border-orange-900 flex flex-col">
                           <div className="flex items-center gap-1.5 mb-1">
                             <AlertCircle className="h-4 w-4 text-orange-600" />
                             <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Overdue Loans</p>
                           </div>
                           <p className="text-3xl font-bold text-orange-700 dark:text-orange-300 mt-auto">{formatNumber(agent.loansOverdue)}</p>
                       </div>
                       <div className="p-4 rounded-xl border bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900 flex flex-col">
                           <div className="flex items-center gap-1.5 mb-1">
                             <AlertCircle className="h-4 w-4 text-red-600" />
                             <p className="text-sm text-red-600 dark:text-red-400 font-medium">Defaulted Loans</p>
                           </div>
                           <p className="text-3xl font-bold text-red-700 dark:text-red-300 mt-auto">{formatNumber(agent.loansDefaulted)}</p>
                       </div>
                    </div>
                </CardContent>
             </Card>

             {/* Customers List */}
             <Card>
               <CardHeader className="pb-4">
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                   <div>
                     <CardTitle className="text-lg">Customer Directory</CardTitle>
                     <CardDescription>Users onboarded by this agent</CardDescription>
                   </div>
                   <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
                      className="pl-9 h-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                 </div>
               </CardHeader>
               <CardContent>
                 <div className="space-y-3">
                   {filteredCustomers.length > 0 ? filteredCustomers.map((c: any) => (
                      <div 
                        key={c.id} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50 gap-4 sm:gap-2 cursor-pointer group"
                        onClick={() => navigate(`/users/${c.id}`)}
                      >
                         <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                               <p className="font-semibold text-foreground leading-none mb-1.5">{c.fullName}</p>
                               <p className="text-xs text-muted-foreground flex items-center gap-1">
                                 <Phone className="h-3 w-3" /> {c.phone}
                               </p>
                            </div>
                         </div>
                         <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/2">
                            <div className="flex items-center gap-2">
                               {c.kycStatus === 'verified' ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-700 border-none shadow-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Verified</Badge>
                               ) : (
                                  <Badge variant="outline" className="text-amber-600 border-amber-200">Pending KYC</Badge>
                               )}
                            </div>
                            <div className="text-right min-w-[80px]">
                               {c.loanStatus === 'active' || c.loanStatus === 'overdue' ? (
                                  <>
                                   <p className="font-bold text-sm">₵{c.loanAmount}</p>
                                   <Badge variant="outline" className={cn("text-[10px] h-4 leading-none mt-1", c.loanStatus === 'overdue' ? "text-red-500 border-red-200" : "text-blue-500 border-blue-200")}>{c.loanStatus.toUpperCase()}</Badge>
                                  </>
                               ) : c.loanStatus === 'repaid' ? (
                                  <>
                                   <p className="font-bold text-sm text-muted-foreground">₵{c.loanAmount}</p>
                                   <Badge variant="outline" className="text-[10px] h-4 leading-none mt-1 text-emerald-600 border-emerald-200">CLOSED</Badge>
                                  </>
                               ) : (
                                 <p className="text-xs text-muted-foreground font-medium">No Loan</p>
                               )}
                            </div>
                         </div>
                      </div>
                   )) : (
                     <div className="text-center py-12 text-muted-foreground">
                       <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-20" />
                       <p>No customers found.</p>
                     </div>
                   )}
                 </div>
               </CardContent>
             </Card>
          </TabsContent>
          
          <TabsContent value="profile" className="space-y-6 m-0">
            <Card>
              <CardHeader>
                <CardTitle>Contact & Location</CardTitle>
                <CardDescription>Address and regional details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-medium uppercase tracking-wider">Email Address</span>
                    </div>
                    <p className="font-medium text-foreground">{agent.email}</p>
                  </div>
                  <div className="space-y-1 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-medium uppercase tracking-wider">Region</span>
                    </div>
                    <p className="font-medium text-foreground">{agent.location}</p>
                  </div>
                  <div className="space-y-1 p-4 rounded-xl bg-muted/30 border border-border/50 sm:col-span-2">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Hash className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-medium uppercase tracking-wider">Full Address</span>
                    </div>
                    <p className="font-medium text-foreground">{agent.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
               <CardHeader>
                 <CardTitle>KYC Documents</CardTitle>
                 <CardDescription>Identity verification files</CardDescription>
               </CardHeader>
               <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                           <p className="text-sm font-medium text-muted-foreground">Ghana Card (Front)</p>
                           <p className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded-md">{agent.ghanaCardNumber}</p>
                        </div>
                        <SecureKycImage
                          imageUrl={agent.ghanaCardFrontUrl}
                          label="Ghana Card (Front)"
                          className="w-full aspect-[1.6/1]"
                        />
                     </div>
                     <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Ghana Card (Back)</p>
                        <SecureKycImage
                          imageUrl={agent.ghanaCardBackUrl}
                          label="Ghana Card (Back)"
                          className="w-full aspect-[1.6/1]"
                        />
                     </div>
                  </div>
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commissions" className="space-y-6 m-0">
            {/* Main Summary Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {/* Available Balance Card */}
                <Card className="bg-[#EC1B84]/5 dark:bg-[#EC1B84]/10 border-[#EC1B84]/20 dark:border-[#EC1B84]/30 shadow-sm relative overflow-hidden group">
                   <div className="absolute right-[-10px] top-[-10px] opacity-10 transition-transform group-hover:scale-110 duration-500">
                     <Banknote className="w-24 h-24 text-[#EC1B84]" />
                   </div>
                   <CardHeader className="pb-2">
                     <CardTitle className="text-xs font-black uppercase tracking-widest text-[#EC1B84] flex items-center gap-2">
                       <Banknote className="w-3.5 h-3.5" />
                       Net Balance (Available)
                     </CardTitle>
                   </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className={cn(
                        "text-3xl font-black tracking-tight",
                        toNumber(commissionResponse?.data?.summary?.netBalance) >= 0 ? "text-gray-900 dark:text-gray-100" : "text-red-600 dark:text-red-400"
                      )}>
                        GHS {formatGHS(commissionResponse?.data?.summary?.netBalance ?? (agent.signUpsAllTime * 10 - agent.loansOverdue * 10))}
                      </p>
                      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-tight">Current account value</p>
                    </div>
                  </CardContent>
               </Card>

               {/* Earnings Card */}
               <Card className="flex flex-col justify-center">
                  <CardContent className="pt-6 space-y-4">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Earned</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-gray-100 font-mono">GHS {formatGHS(commissionResponse?.data?.summary?.totalEarned ?? agent.signUpsAllTime * 10)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                       <div className="space-y-1">
                          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight">Signups</p>
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">+GHS {formatGHS(commissionResponse?.data?.summary?.breakdown?.signupCommission ?? agent.signUpsAllTime * 10)}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight">Repayments</p>
                          <p className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">+GHS {formatGHS(commissionResponse?.data?.summary?.breakdown?.repaymentCommission ?? 0)}</p>
                       </div>
                    </div>
                  </CardContent>
               </Card>

               {/* Deductions Card */}
               <Card className="flex flex-col justify-center bg-red-50/20 dark:bg-red-950/10 border-red-100 dark:border-red-900">
                  <CardContent className="pt-6 space-y-4">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Deductions</p>
                        <p className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">GHS {formatGHS(commissionResponse?.data?.summary?.totalDeducted ?? agent.loansOverdue * 10)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-1 sm:gap-2 border-t border-red-50 dark:border-red-900/50 pt-4">
                       <div className="space-y-1">
                          <p className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight">Defaults</p>
                          <p className="text-[11px] font-black text-red-700 dark:text-red-400 font-mono">GHS {formatGHS(commissionResponse?.data?.summary?.breakdown?.defaultDeductions ?? agent.loansOverdue * 10)}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight">Fraud</p>
                          <p className="text-[11px] font-black text-red-700 dark:text-red-400 font-mono">GHS {formatGHS(commissionResponse?.data?.summary?.breakdown?.fraudRevocations ?? 0)}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight">Manual</p>
                          <p className="text-[11px] font-black text-red-700 dark:text-red-400 font-mono">GHS {formatGHS(commissionResponse?.data?.summary?.breakdown?.manualCorrections ?? 0)}</p>
                       </div>
                    </div>
                  </CardContent>
               </Card>

               {/* Paid Out Card */}
               <Card className="flex flex-col justify-center bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900">
                  <CardContent className="pt-6 space-y-4">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Paid Out</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">GHS {formatGHS(commissionResponse?.data?.summary?.totalPaidOut ?? 0)}</p>
                        <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-tight">Already sent via payout</p>
                    </div>
                    <div className="border-t border-emerald-50 dark:border-emerald-900/50 pt-4">
                       <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight">Pending Payout</p>
                       <p className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">GHS {formatGHS(commissionResponse?.data?.summary?.pendingPayouts ?? 0)}</p>
                    </div>
                  </CardContent>
               </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Commission History</CardTitle>
                <CardDescription>Recent earnings and deductions for {agent.name}</CardDescription>
              </CardHeader>
              <CardContent>
                {isCommissionLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : (() => {
                  const data = commissionResponse?.data || commissionResponse;
                  const ledger = data?.ledger || data?.items || [];
                  return ledger.length > 0;
                })() ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                        <tr>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Type</th>
                          <th className="px-4 py-3 font-medium">Related To</th>
                          <th className="px-4 py-3 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y border-t">
                        {(() => {
                           const data = commissionResponse?.data || commissionResponse;
                           const ledger = data?.ledger || data?.items || [];
                           return ledger;
                        })().map((item: any) => (
                          <tr key={item._id || item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              {new Date(item.createdAt).toLocaleDateString("en-GB")}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={cn(
                                "capitalize text-[10px] px-1.5 py-0",
                                item.type === 'SIGNUP' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800" :
                                item.type === 'REPAYMENT' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" :
                                "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
                              )}>
                                {item.type.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {item.relatedName || item.sourceName || item.deductionReason || (
                                item.type === 'SIGNUP' ? "New Signup" :
                                item.type === 'REPAYMENT' ? "Loan Repayment" :
                                item.type === 'PAYOUT' ? "Commission Payout" :
                                "System Adjustment"
                              )}
                            </td>
                            <td className={cn(
                              "px-4 py-3 text-right font-black font-mono",
                              item.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                            )}>
                              {item.amount >= 0 ? "+" : "-"}GHS {formatGHS(Math.abs(item.amount))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-xl bg-muted/20">
                    <Banknote className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
                    <p className="text-[sm] font-medium text-foreground">No commission history</p>
                    <p className="text-xs text-muted-foreground max-w-[250px] mt-1">
                      Earnings and deductions will appear here once transactions are recorded.
                    </p>
                  </div>
                )}

                {/* Unified Pagination Logic */}
                {(() => {
                  const data = commissionResponse?.data || commissionResponse;
                  const pagination = data?.pagination;
                  
                  // Support both nested pagination object and flat metadata
                  const totalPages = Number(pagination?.pages || data?.totalPages || data?.pages || 1);
                  const currentPage = Number(pagination?.current || data?.page || commPage);
                  
                  if (totalPages <= 1) return null;
                  
                  return (
                    <div className="flex items-center justify-center gap-3 pt-6 border-t mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1 || isCommissionLoading}
                        onClick={() => {
                          setCommPage(p => Math.max(1, p - 1));
                          // Scroll to top of the list when page changes
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="h-9 px-4 rounded-lg font-bold text-xs"
                      >
                        ← Previous
                      </Button>
                      
                      <div className="flex items-center px-4 h-9 bg-muted/30 rounded-lg border text-xs font-mono font-bold">
                        {currentPage} / {totalPages}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages || isCommissionLoading}
                        onClick={() => {
                          setCommPage(p => p + 1);
                          // Scroll to top of the list when page changes
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="h-9 px-4 rounded-lg font-bold text-xs"
                      >
                        Next →
                      </Button>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Default Penalty Deductions — Contractor Agreement §7.0 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Default Penalty Deductions
                </CardTitle>
                <CardDescription>
                  30% of unpaid loan value, applied per Contractor Agreement §7.0 for loans that fully defaulted
                  (zero repayment, 14+ days past due). Each row links to the loan that triggered it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isDeductionsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : (deductionsResponse?.items || []).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                        <tr>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Loan / Borrower</th>
                          <th className="px-4 py-3 font-medium text-right">Principal</th>
                          <th className="px-4 py-3 font-medium text-right">Total Payable</th>
                          <th className="px-4 py-3 font-medium text-right">Repaid</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium text-right">Deduction</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y border-t">
                        {(deductionsResponse?.items || []).map((item: any) => (
                          <tr key={item._id} className="hover:bg-muted/30 transition-colors align-top">
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                              {new Date(item.createdAt).toLocaleDateString("en-GB")}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-mono text-xs font-bold text-foreground">{item.linkedLoanReference || "—"}</p>
                              <p className="text-xs text-muted-foreground">{item.loan?.borrowerName || "Unknown borrower"}</p>
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {item.loan ? `GHS ${formatGHS(item.loan.principal)}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {item.loan ? `GHS ${formatGHS(item.loan.totalPayable)}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {item.loan ? `GHS ${formatGHS(item.loan.amountRepaid)}` : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={cn(
                                "text-[10px] px-1.5 py-0",
                                item.status === "CONFIRMED" ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" :
                                item.status === "REVERSED" ? "bg-muted text-muted-foreground" :
                                "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                              )}>
                                {item.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-black font-mono text-red-600 dark:text-red-400">
                              -GHS {formatGHS(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-xl bg-muted/20">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3 opacity-60" />
                    <p className="text-sm font-medium text-foreground">No default penalty deductions</p>
                    <p className="text-xs text-muted-foreground max-w-[280px] mt-1">
                      This agent has no §7.0 full-default penalties on record.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
