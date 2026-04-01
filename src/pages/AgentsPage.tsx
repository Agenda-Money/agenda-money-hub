import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, FileText, AlertCircle, CheckCircle2, Clock, MapPin, Phone, Mail, User, Camera, IdCard, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  getAdminAgents, 
  getPendingAgentApplications, 
  approveAgentApplication, 
  rejectAgentApplication, 
  getAdminAgentPortfolio 
} from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import { io } from "socket.io-client";
import { SecureKycImage } from "@/components/common/SecureKycImage";

interface Agent {
  id: string;
  name: string;
  email: string;
  nodeCode: string;
  status: "active" | "inactive";
  location: string;
  totalTransactions: number;
  signUpsAllTime: number;
  signUpsThisMonth: number;
  loansActive: number;
  loansPending: number;
  loansClosed: number;
  loansOverdue: number;
}

interface PendingAgent {
  _id: string;
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  region: string;
  address: string;
  ghanaCardNumber: string;
  selfieUrl: string;
  ghanaCardFrontUrl: string;
  ghanaCardBackUrl: string;
  createdAt?: string;
}

const ImagePlaceholder = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="aspect-[3/2] rounded-xl bg-muted/50 border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-2">
    <Icon className="h-10 w-10 text-muted-foreground/40" />
    <span className="text-xs text-muted-foreground/60">{label}</span>
  </div>
);

const baseApiUrl = import.meta.env.VITE_API_URL || "";

export default function AgentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedAgentIdForReject, setSelectedAgentIdForReject] = useState<string | null>(null);
  const [expandedPendingId, setExpandedPendingId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Socket Connection
  useEffect(() => {
    const socket = io(baseApiUrl || window.location.origin, {
      path: "/socket.io/",
      reconnectionAttempts: 5,
      auth: { token: localStorage.getItem("token") || sessionStorage.getItem("token") },
    });

    socket.on("NEW_AGENT_APPLICATION", () => {
      toast.info("A new agent application was just submitted!", { icon: "🔔" });
      queryClient.invalidateQueries({ queryKey: ["agents", "pending"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, baseApiUrl]);

  // All Agents Query
  const { data: responseData } = useQuery({
    queryKey: ["agents", searchTerm],
    queryFn: async () => {
      const params: any = { limit: 100 }; 
      if (searchTerm) params.search = searchTerm;
      const res = await getAdminAgents(params);
      return res;
    },
  });

  // Pending Agents Query
  const { data: pendingData, isLoading: isPendingLoading } = useQuery({
    queryKey: ["agents", "pending"],
    queryFn: async () => {
      const res = await getPendingAgentApplications();
      return res;
    },
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: ({ agentId, reason }: { agentId: string; reason: string }) => approveAgentApplication(agentId, reason),
    onSuccess: () => {
      toast.success("Agent application successfully approved!");
      queryClient.invalidateQueries({ queryKey: ["agents", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["agents", searchTerm] });
    },
    onError: (error: any) => {
      toast.error(getFriendlyErrorMessage(error));
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: ({ agentId, reason }: { agentId: string; reason: string }) => rejectAgentApplication(agentId, reason),
    onSuccess: (data) => {
      toast.success(data.message || "Agent application successfully rejected.");
      setIsRejectModalOpen(false);
      setRejectReason("");
      setSelectedAgentIdForReject(null);
      queryClient.invalidateQueries({ queryKey: ["agents", "pending"] });
    },
    onError: (error: any) => {
      toast.error(getFriendlyErrorMessage(error));
    },
  });

  const rawAgents = responseData?.data ?? [];
  const pendingAgents: PendingAgent[] = pendingData?.data ?? [];

  // Parallel queries to fetch individual agent details/portfolios for the list view
  const agentDetailsQueries = useQueries({
    queries: rawAgents.map((a: any) => {
      const id = a.agent?.id || a.agent?._id || a.id || a._id;
      const nodeCode = a.agent?.agentCode || a.agent?.nodeCode || a.agentCode || a.nodeCode;
      
      return {
        queryKey: ["agent-portfolio-minimal", nodeCode || id],
        queryFn: async () => {
          if (!nodeCode) return null;
          // Fetch only the portfolio/metrics for the list view
          const res = await getAdminAgentPortfolio(nodeCode, { limit: 1 });
          return res;
        },
        enabled: !!nodeCode,
        staleTime: 1000 * 60 * 5, // Cache for 5 mins
      };
    }),
  });

  const agents: Agent[] = rawAgents.map((a: any, index: number) => {
    // Basic data from list view
    const agentBase = a.agent || a;
    
    // Enriched data from individual portfolio query
    const detailData: any = agentDetailsQueries[index]?.data;
    const agentData = detailData?.agent || agentBase;
    const portfolioData = detailData?.portfolio || null;
    const metricsData = detailData?.metrics || portfolioData?.metrics || null;
    
    return {
      id: agentData.id ?? agentData._id,
      name: agentData.agentName ?? agentData.fullName ?? (agentData.firstName ? `${agentData.firstName} ${agentData.surname || ""}`.trim() : "Unknown"),
      email: agentData.email ?? "—",
      nodeCode: agentData.agentCode ?? agentData.nodeCode ?? "—",
      status: agentData.isActive === false || agentData.status === "inactive" ? "inactive" : "active",
      location: agentData.region ?? agentData.location ?? "—",
      totalTransactions: metricsData?.totalTransactions ?? portfolioData?.totalTransactions ?? agentData.totalTransactions ?? 0,
      signUpsAllTime: metricsData?.signUpsAllTime ?? portfolioData?.metrics?.signUpsAllTime ?? agentData.totalSignUps ?? agentData.signUpsAllTime ?? agentData.activeUsers ?? 0,
      signUpsThisMonth: metricsData?.signUpsThisMonth ?? portfolioData?.metrics?.signUpsThisMonth ?? agentData.signUpsThisMonth ?? 0,
      loansActive: metricsData?.loansActive ?? portfolioData?.portfolio?.loansActive ?? portfolioData?.loansActive ?? agentData.loansActive ?? 0,
      loansPending: metricsData?.loansPending ?? portfolioData?.portfolio?.loansPending ?? portfolioData?.loansPending ?? agentData.loansPending ?? 0,
      loansClosed: metricsData?.loansClosed ?? portfolioData?.portfolio?.loansClosed ?? portfolioData?.loansClosed ?? agentData.loansClosed ?? 0,
      loansOverdue: metricsData?.loansOverdue ?? portfolioData?.portfolio?.loansOverdue ?? portfolioData?.loansOverdue ?? agentData.loansOverdue ?? 0,
    };
  });

  const filteredAgents = agents;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Agents</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage your network and review new agent applications
            </p>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-muted/50 border shadow-sm flex overflow-x-auto no-scrollbar w-fit">
            <TabsTrigger value="all" className="whitespace-nowrap px-6">All Agents</TabsTrigger>
            <TabsTrigger value="pending" className="whitespace-nowrap px-6">
              Pending Approvals
              {pendingAgents.length > 0 && (
                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-xs text-white shrink-0">
                  {pendingAgents.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 m-0">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>All Agents</CardTitle>
                    <CardDescription>
                      List of registered agents and their node codes
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search agents..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent Name</TableHead>
                        <TableHead>Node Code</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Loans Active</TableHead>
                        <TableHead className="text-right">Loans Pending</TableHead>
                        <TableHead className="text-right">Loans Overdue</TableHead>
                        <TableHead className="text-right">Total Signups</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAgents.map((agent) => (
                        <TableRow 
                          key={agent.id} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => navigate(`/agents/${agent.id}`)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{agent.name}</span>
                              <span className="text-xs text-muted-foreground font-normal">
                                {agent.email}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {agent.nodeCode}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={agent.status === "active" ? "default" : "secondary"}
                              className={
                                agent.status === "active"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : "bg-gray-500 hover:bg-gray-600"
                              }
                            >
                              {agent.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{agent.location}</TableCell>
                          <TableCell className="text-right font-medium text-blue-600">
                             {agent.loansActive}
                          </TableCell>
                          <TableCell className="text-right font-medium text-amber-600">
                             {agent.loansPending}
                          </TableCell>
                          <TableCell className="text-right font-medium text-destructive">
                             {agent.loansOverdue}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {agent.signUpsAllTime.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {filteredAgents.map((agent) => (
                    <div
                      key={agent.id}
                      onClick={() => navigate(`/agents/${agent.id}`)}
                      className="bg-card rounded-xl p-4 shadow-sm border border-border space-y-3 cursor-pointer active:bg-muted/50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-foreground">{agent.name}</h3>
                          <p className="text-sm text-muted-foreground">{agent.email}</p>
                        </div>
                        <Badge variant="outline" className="font-mono">
                          {agent.nodeCode}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                           <Badge
                              variant={agent.status === "active" ? "default" : "secondary"}
                              className={
                                agent.status === "active"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : "bg-gray-500 hover:bg-gray-600"
                              }
                            >
                              {agent.status}
                            </Badge>
                            <span className="text-muted-foreground text-xs">{agent.location}</span>
                        </div>
                        <div className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-primary text-xs font-bold">
                             Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4 m-0">
            {isPendingLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : pendingAgents.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card border-dashed">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <UserPlus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">No Pending Approvals</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  There are currently no agent applications awaiting review.
                </p>
              </div>
            ) : (
                <div className="space-y-4">
                 {pendingAgents.map((agent) => {
                    const isExpanded = expandedPendingId === agent._id;
                    return (
                    <motion.div
                      key={agent._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <Card className="overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md">
                        {/* Compact Clickable Header */}
                        <div 
                           className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer bg-card hover:bg-muted/20 transition-colors"
                           onClick={() => setExpandedPendingId(isExpanded ? null : agent._id)}
                        >
                           <div className="flex items-center gap-4">
                             <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-background shadow-sm shrink-0">
                                <SecureKycImage 
                                  userId={agent._id} 
                                  imageType="selfie" 
                                  label={`${agent.firstName} Selfie`} 
                                  className="h-full w-full" 
                                />
                             </div>
                             <div>
                               <h4 className="font-bold text-base text-foreground">
                                 {agent.firstName} {agent.surname}
                               </h4>
                               <p className="text-sm text-muted-foreground">{agent.region} • {agent.phone}</p>
                             </div>
                           </div>
                           
                           <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                             <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                               <Clock className="w-3.5 h-3.5 mr-1" />
                               Pending Review
                             </Badge>
                             <Button variant="ghost" size="icon" className="shrink-0 pointer-events-none rounded-full">
                               {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                             </Button>
                           </div>
                        </div>

                        {/* Collapsible Content */}
                        <AnimatePresence>
                          {isExpanded && (
                             <motion.div
                               initial={{ height: 0, opacity: 0 }}
                               animate={{ height: "auto", opacity: 1 }}
                               exit={{ height: 0, opacity: 0 }}
                               transition={{ duration: 0.3, ease: "easeInOut" }}
                             >
                                <div className="p-5 sm:p-6 border-t bg-muted/5 space-y-8">
                                  {/* Top Personal Summary grid */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                       <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone Number</span>
                                       <p className="font-medium text-sm flex items-center gap-1"><Phone className="h-3 w-3" /> {agent.phone}</p>
                                    </div>
                                    <div className="space-y-1">
                                       <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email Address</span>
                                       <p className="font-medium text-sm flex items-center gap-1 truncate" title={agent.email}><Mail className="h-3 w-3" /> {agent.email}</p>
                                    </div>
                                    <div className="space-y-1">
                                       <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Region</span>
                                       <p className="font-medium text-sm flex items-center gap-1"><MapPin className="h-3 w-3" /> {agent.region}</p>
                                    </div>
                                     <div className="space-y-1">
                                       <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</span>
                                       <p className="font-medium text-sm truncate" title={agent.address}>{agent.address}</p>
                                    </div>
                                  </div>

                                  {/* Selfie & ID Comparison */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Live Selfie */}
                                    <div className="space-y-3">
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                          <Camera className="h-4 w-4" />
                                          Agent Selfie
                                        </div>
                                      </div>
                                      {agent.selfieUrl ? (
                                        <SecureKycImage 
                                          userId={agent._id} 
                                          imageType="selfie" 
                                          label="Agent selfie" 
                                          className="w-full aspect-[3/2]" 
                                        />
                                      ) : (
                                        <ImagePlaceholder icon={Camera} label="No selfie uploaded" />
                                      )}
                                    </div>

                                    {/* Ghana Card Front */}
                                    <div className="space-y-3">
                                       <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                         <IdCard className="h-4 w-4" />
                                         Ghana Card (Front)
                                       </div>
                                      {agent.ghanaCardFrontUrl ? (
                                        <SecureKycImage 
                                          userId={agent._id} 
                                          imageType="front" 
                                          label="Ghana Card front" 
                                          className="w-full aspect-[1.586]" 
                                        />
                                      ) : (
                                        <ImagePlaceholder icon={IdCard} label="No ID uploaded" />
                                      )}
                                    </div>

                                    {/* Ghana Card Back */}
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                        <IdCard className="h-4 w-4" />
                                        Ghana Card (Back)
                                      </div>
                                      {agent.ghanaCardBackUrl ? (
                                        <SecureKycImage 
                                          userId={agent._id} 
                                          imageType="back" 
                                          label="Ghana Card back" 
                                          className="w-full aspect-[1.586]" 
                                        />
                                      ) : (
                                        <ImagePlaceholder icon={IdCard} label="No ID uploaded" />
                                      )}
                                    </div>
                                  </div>

                                  {/* Verification Checks & Actions */}
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pt-6 border-t mt-8">
                                    <div className="space-y-1">
                                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ghana Card Number</span>
                                      <p className="font-mono text-sm font-bold bg-muted w-fit px-3 py-1.5 rounded-md border">
                                        {agent.ghanaCardNumber || "Not provided"}
                                      </p>
                                    </div>
                                    
                                    <div className="flex gap-3 w-full sm:w-auto">
                                      <Button 
                                        variant="outline"
                                        className="flex-1 sm:flex-none text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => {
                                           setSelectedAgentIdForReject(agent._id);
                                           setIsRejectModalOpen(true);
                                        }}
                                        disabled={rejectMutation.isPending || approveMutation.isPending}
                                      >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Reject
                                      </Button>
                                      <Button 
                                        className="flex-1 sm:flex-none bg-success hover:bg-success/90 text-success-foreground shadow-sm px-8"
                                        onClick={() => {
                                          approveMutation.mutate({ agentId: agent._id, reason: "Agent application approved via admin dashboard" });
                                        }}
                                        disabled={approveMutation.isPending || rejectMutation.isPending}
                                      >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        {approveMutation.isPending ? "Approving..." : "Approve Agent"}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                             </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    </motion.div>
                  )})}
               </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Reject Modal */}
        <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Reject Agent Application
              </DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting this application. This reason will be sent to the applicant.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <textarea
                className="w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="e.g. The Ghana Card photo is too blurry to read the card number. Please re-apply with a clearer photo."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                   if (!selectedAgentIdForReject) return;
                   if (!rejectReason.trim()) { toast.error("Reason is required"); return; }
                   rejectMutation.mutate({ agentId: selectedAgentIdForReject, reason: rejectReason.trim() });
                }}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
              >
                {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
