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
import api from "@/lib/api";
import { toast } from "sonner";

export default function AgentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [customersPage, setCustomersPage] = useState(1);

  // Fetch Agent Profile
  const { data: agentDataResponse, isLoading: isAgentLoading, error: agentError } = useQuery({
    queryKey: ["agent", id],
    queryFn: async () => {
      const res = await api.get(`/api/admin/agents/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const agentDataRaw = agentDataResponse?.data?.agent || agentDataResponse?.data || agentDataResponse || {};
  const portfolioRaw = agentDataResponse?.data?.portfolio || null;

  const nodeCode = agentDataRaw.agentCode || agentDataRaw.nodeCode || "—";

  // Fetch Agent Customers (Paginated)
  const { data: customersResponse, isLoading: isCustomersLoading } = useQuery({
    queryKey: ["agent-customers", nodeCode, customersPage, searchTerm],
    queryFn: async () => {
      if (!nodeCode || nodeCode === "—") return { data: { directory: [], pagination: { pages: 1, total: 0 } } };
      const params: any = { 
        page: customersPage, 
        limit: 10
      };
      if (searchTerm) params.search = searchTerm;
      const res = await api.get(`/api/admin/agents/${nodeCode}/portfolio`, { params });
      return res.data;
    },
    enabled: !!nodeCode && nodeCode !== "—",
  });

  const rawCustomers = customersResponse?.data?.directory || [];
  const customersPagination = customersResponse?.data?.pagination || { pages: 1, total: 0 };

  // Map API data to UI structure
  const agent = {
    id: agentDataRaw._id || agentDataRaw.id || id,
    name: agentDataRaw.fullName || agentDataRaw.agentName || (agentDataRaw.firstName ? `${agentDataRaw.firstName} ${agentDataRaw.surname || ""}`.trim() : "—"),
    email: agentDataRaw.email || "—",
    phone: agentDataRaw.phoneNumber || agentDataRaw.phone || agentDataRaw.msisdn || "—",
    nodeCode: agentDataRaw.agentCode || agentDataRaw.nodeCode || "—",
    status: agentDataRaw.status === "inactive" || agentDataRaw.isActive === false ? "inactive" : "active",
    joinedAt: agentDataRaw.createdAt ? new Date(agentDataRaw.createdAt).toLocaleDateString('en-GB') : "—",
    address: agentDataRaw.address || "—",
    location: agentDataRaw.location || agentDataRaw.region || "—",
    totalTransactions: portfolioRaw?.totalTransactions || agentDataRaw.totalTransactions || 0,
    signUpsAllTime: portfolioRaw?.metrics?.signUpsAllTime ?? agentDataRaw.totalSignUps ?? agentDataRaw.signUpsAllTime ?? agentDataRaw.activeUsers ?? 0,
    signUpsThisMonth: portfolioRaw?.metrics?.signUpsThisMonth ?? agentDataRaw.signUpsThisMonth ?? 0,
    loansActive: portfolioRaw?.portfolio?.loansActive ?? portfolioRaw?.loansActive ?? agentDataRaw.loansActive ?? 0,
    loansPending: portfolioRaw?.portfolio?.loansPending ?? portfolioRaw?.loansPending ?? agentDataRaw.loansPending ?? 0,
    loansClosed: portfolioRaw?.portfolio?.loansClosed ?? portfolioRaw?.loansClosed ?? agentDataRaw.loansClosed ?? 0,
    loansOverdue: portfolioRaw?.portfolio?.loansOverdue ?? portfolioRaw?.loansOverdue ?? agentDataRaw.loansOverdue ?? 0,
    selfieUrl: agentDataRaw.selfieUrl,
    ghanaCardFrontUrl: agentDataRaw.ghanaCardFrontUrl,
    ghanaCardBackUrl: agentDataRaw.ghanaCardBackUrl,
    ghanaCardNumber: agentDataRaw.ghanaCardNumber || "—",
    customers: rawCustomers.map((c: any) => ({
      id: c.id || c._id,
      fullName: c.fullName || "—",
      phone: c.phoneNumber || c.phone || c.msisdn || "—",
      kycStatus: c.kycStatus || "pending",
      loanStatus: c.loanStatus || "none",
      loanAmount: c.loanAmount || 0,
      joinedAt: c.onboardedDate ? new Date(c.onboardedDate).toLocaleDateString('en-GB') : "—"
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
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden border-2 sm:border-4 border-background shadow-sm shrink-0">
                      <img src={agent.selfieUrl} alt={agent.name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
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
                    <Badge variant="secondary" className="bg-muted/60 text-muted-foreground px-2.5 py-0.5">Joined {agent.joinedAt}</Badge>
                  </div>
                </div>
              </div>

               <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:w-[350px] shrink-0">
                   <div className="p-4 sm:p-3 rounded-xl sm:rounded-lg border bg-muted/20 flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1.5 sm:mb-1">
                        <UserPlus className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">Total Signups</span>
                      </div>
                      <p className="text-2xl sm:text-xl font-bold text-foreground">{agent.signUpsAllTime}</p>
                   </div>
                   <div className="p-4 sm:p-3 rounded-xl sm:rounded-lg border bg-muted/20 flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1.5 sm:mb-1">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">This Month</span>
                      </div>
                      <p className="text-2xl sm:text-xl font-bold text-foreground">{agent.signUpsThisMonth}</p>
                   </div>
               </div>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="overview" className="space-y-4 w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-max lg:inline-grid">
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
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                       <div className="p-4 rounded-xl border bg-blue-50/50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900 flex flex-col">
                          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Active Loans</p>
                          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-auto">{agent.loansActive}</p>
                       </div>
                       <div className="p-4 rounded-xl border bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900 flex flex-col">
                          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-1">Pending Loans</p>
                          <p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-auto">{agent.loansPending}</p>
                       </div>
                       <div className="p-4 rounded-xl border bg-green-50/50 dark:bg-green-950/10 border-green-100 dark:border-green-900 flex flex-col">
                           <div className="flex items-center gap-1.5 mb-1">
                             <CheckCircle2 className="h-4 w-4 text-green-600" />
                             <p className="text-sm text-green-600 dark:text-green-400 font-medium">Closed / Repaid</p>
                           </div>
                          <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-auto">{agent.loansClosed}</p>
                       </div>
                       <div className="p-4 rounded-xl border bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900 flex flex-col">
                           <div className="flex items-center gap-1.5 mb-1">
                             <AlertCircle className="h-4 w-4 text-red-600" />
                             <p className="text-sm text-red-600 dark:text-red-400 font-medium">Overdue Loans</p>
                           </div>
                          <p className="text-3xl font-bold text-red-700 dark:text-red-300 mt-auto">{agent.loansOverdue}</p>
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
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCustomersPage(1); // Reset to page 1 on search
                      }}
                    />
                  </div>
                 </div>
               </CardHeader>
               <CardContent>
                 <div className="space-y-3">
                   {agent.customers.length > 0 ? agent.customers.map((c: any) => (
                      <div 
                        key={c.id} 
                        onClick={() => navigate(`/users/${c.id}`)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50 gap-4 sm:gap-2 cursor-pointer active:translate-y-[1px]"
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
                    )) : isCustomersLoading ? (
                      <div className="space-y-3">
                         {[1,2,3].map(i => <div key={i} className="h-16 w-full bg-muted animate-pulse rounded-xl" />)}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/10">
                        <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="font-medium">No customers found</p>
                        <p className="text-xs max-w-[200px] mx-auto mt-1 opacity-70">There are no users tied to node code {agent.nodeCode} yet.</p>
                      </div>
                    )}
                  </div>

                  {/* Customer Pagination */}
                  {customersPagination.pages > 1 && (
                    <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {customersPage} of {customersPagination.pages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomersPage(p => Math.max(1, p - 1))}
                          disabled={customersPage === 1 || isCustomersLoading}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomersPage(p => Math.min(customersPagination.pages, p + 1))}
                          disabled={customersPage === customersPagination.pages || isCustomersLoading}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
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
                         {agent.ghanaCardFrontUrl ? (
                           <a href={agent.ghanaCardFrontUrl} target="_blank" rel="noreferrer" className="block w-full aspect-[1.6/1] rounded-xl overflow-hidden border-2 border-muted hover:border-primary transition-colors">
                              <img src={agent.ghanaCardFrontUrl} alt="Ghana Card Front" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                           </a>
                        ) : (
                           <div className="w-full aspect-[1.6/1] rounded-xl border-2 border-dashed border-muted flex items-center justify-center bg-muted/20">
                              <p className="text-sm text-muted-foreground">Not uploaded</p>
                           </div>
                        )}
                     </div>
                     <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Ghana Card (Back)</p>
                         {agent.ghanaCardBackUrl ? (
                           <a href={agent.ghanaCardBackUrl} target="_blank" rel="noreferrer" className="block w-full aspect-[1.6/1] rounded-xl overflow-hidden border-2 border-muted hover:border-primary transition-colors">
                              <img src={agent.ghanaCardBackUrl} alt="Ghana Card Back" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                           </a>
                        ) : (
                           <div className="w-full aspect-[1.6/1] rounded-xl border-2 border-dashed border-muted flex items-center justify-center bg-muted/20">
                              <p className="text-sm text-muted-foreground">Not uploaded</p>
                           </div>
                        )}
                     </div>
                  </div>
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commissions" className="space-y-6 m-0">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-pink-50/50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-900 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-pink-700 dark:text-pink-400 flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    Estimated Next Payout
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-pink-900 dark:text-pink-100">GHS {(agent.signUpsThisMonth * 10).toFixed(2)}</div>
                  <p className="text-xs text-pink-600 dark:text-pink-400 mt-1 font-medium">Based on signups this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 bg-muted/40 rounded-t-xl">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Total Earned (All Time)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-3xl font-bold text-foreground">GHS {(agent.signUpsAllTime * 10).toFixed(2)}</div>
                  <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> Historical tracking
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 bg-red-50/50 dark:bg-red-950/20 rounded-t-xl">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Pending Deductions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-3xl font-bold text-foreground">GHS {(agent.loansOverdue * 10).toFixed(2)}</div>
                  <p className="text-xs text-destructive font-medium mt-1 flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3" /> From defaults (-10 GHS each)
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Commission History</CardTitle>
                <CardDescription>Recent earnings and deductions for {agent.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-xl bg-muted/20">
                  <Banknote className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
                  <p className="text-sm font-medium text-foreground">Awaiting Detailed Ledger</p>
                  <p className="text-xs text-muted-foreground max-w-[250px] mt-1">
                    Specific commission line items will appear here once the new endpoint is connected.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
