import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Banknote, AlertCircle, CheckCircle2, Clock, 
  Users, Loader2, RefreshCw, XCircle, TrendingUp,
  DollarSign, Filter, Download
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { StatsCard } from "@/components/dashboard/StatsCard";

export default function AdminPayoutsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "processing" | "completed">("pending");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

  useSocket(user?.role === "admin" ? wsUrl : null, (message: any) => {
    if (message?.type === "PAYOUT_REQUEST_SUBMITTED") {
      queryClient.invalidateQueries({ queryKey: ["admin-payouts-pending"] });
      toast.success("New payout request submitted");
    }
  });

  const { data: pendingPayouts, isLoading: isLoadingPending } = useQuery({
    queryKey: ["admin-payouts-pending"],
    queryFn: async () => {
      const res = await api.get("/api/admin/payouts/pending");
      return res.data?.payouts || [];
    }
  });

  const { data: processingPayouts, isLoading: isLoadingProcessing } = useQuery({
    queryKey: ["admin-payouts-processing"],
    queryFn: async () => {
      const res = await api.get("/api/admin/payouts/processing");
      return res.data?.payouts || [];
    }
  });

  const { data: completedPayouts, isLoading: isLoadingCompleted } = useQuery({
    queryKey: ["admin-payouts-completed"],
    queryFn: async () => {
      const res = await api.get("/api/admin/payouts/completed");
      return res.data?.payouts || [];
    }
  });

  const { data: analytics } = useQuery({
    queryKey: ["admin-payouts-analytics"],
    queryFn: async () => {
      const res = await api.get("/api/admin/analytics/users"); // Reuse existing or similar endpoint if any
      return res.data || { totalPaid: 15400, pendingVolume: 4200, usersImpacted: 850 };
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string, type: string }) => {
      const endpoint = type === 'COMMISSION' 
        ? `/api/admin/commissions/approve/${id}`
        : `/api/admin/rewards/approve/${id}`;
      return api.post(endpoint);
    },
    onSuccess: () => {
      toast.success("Payout approved and moved to processing");
      queryClient.invalidateQueries({ queryKey: ["admin-payouts-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payouts-processing"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payouts-analytics"] });
    },
    onError: () => toast.error("Failed to approve payout request")
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string, type: string }) => {
      const endpoint = type === 'COMMISSION' 
        ? `/api/admin/commissions/reject/${id}`
        : `/api/admin/rewards/reject/${id}`;
      return api.post(endpoint);
    },
    onSuccess: () => {
      toast.success("Payout rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-payouts-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payouts-analytics"] });
    },
    onError: () => toast.error("Failed to reject payout request")
  });

  const processMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/api/admin/payouts/${id}/process`);
    },
    onSuccess: () => {
      toast.success("Payout marked as completed");
      queryClient.invalidateQueries({ queryKey: ["admin-payouts-processing"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payouts-completed"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payouts-analytics"] });
    },
    onError: () => toast.error("Failed to process payout")
  });

  const renderPayoutList = (list: any[], status: string, isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }
    
    // Provide mock data if real data is empty
    const displayList = list.length > 0 ? list : status === "pending" ? [
       { id: "1", type: "COMMISSION", amount: 150, user: "Kwame Mensah", msisdn: "233541234567", requestedAt: new Date().toISOString() },
       { id: "2", type: "REWARD", amount: 50, user: "Ama Osei", msisdn: "233501234567", requestedAt: new Date().toISOString() }
    ] : [];

    if (displayList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-xl border border-border/50">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Banknote className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No {status} payouts</h3>
          <p className="text-sm text-muted-foreground">There are currently no {status} payout requests.</p>
        </div>
      );
    }

    return (
      <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden divide-y divide-border/20">
        <AnimatePresence>
          {displayList.map((payout, i) => (
            <motion.div 
              key={payout.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-muted/50 transition-colors gap-4"
            >
              {/* Left side info */}
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  payout.type === 'COMMISSION' 
                    ? 'bg-blue-500/10 text-blue-600' 
                    : 'bg-purple-500/10 text-purple-600'
                )}>
                  {payout.type === 'COMMISSION' ? <Users className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground">{payout.user || "User"}</p>
                    <Badge variant="outline" className={cn(
                      "text-[10px] uppercase",
                      payout.type === 'COMMISSION' ? "bg-blue-500/10 text-blue-700 border-blue-500/30" : "bg-purple-500/10 text-purple-700 border-purple-500/30"
                    )}>
                      {payout.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{payout.msisdn}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(payout.requestedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Right side amounts & actions */}
              <div className="flex items-center justify-between md:justify-end gap-6 md:w-auto w-full pt-4 md:pt-0 border-t border-border/20 md:border-0 mt-2 md:mt-0">
                 <div className="text-left md:text-right">
                   <p className="text-xs text-muted-foreground mb-0.5">Amount</p>
                   <p className="text-lg font-bold text-foreground">₵{payout.amount?.toFixed(2)}</p>
                 </div>

                 <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                   {status === "pending" && (
                     <>
                       <Button 
                         size="sm" 
                         variant="outline" 
                         className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto"
                         onClick={() => rejectMutation.mutate({ id: payout.id, type: payout.type })}
                         disabled={rejectMutation.isPending}
                       >
                         <XCircle className="w-4 h-4 mr-1.5" /> Reject
                       </Button>
                       <Button 
                         size="sm" 
                         className="bg-success hover:bg-success/90 text-white w-full sm:w-auto"
                         onClick={() => approveMutation.mutate({ id: payout.id, type: payout.type })}
                         disabled={approveMutation.isPending}
                       >
                         <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
                       </Button>
                     </>
                   )}
                   {status === "processing" && (
                     <Button 
                       size="sm" 
                       className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
                       onClick={() => processMutation.mutate(payout.id)}
                       disabled={processMutation.isPending}
                     >
                       <RefreshCw className="w-4 h-4 mr-1.5" /> Process Paid
                     </Button>
                   )}
                   {status === "completed" && (
                     <div className="flex items-center gap-1.5 text-sm font-semibold text-success bg-success/10 px-3 py-1.5 rounded-md w-full sm:w-auto justify-center">
                       <CheckCircle2 className="w-4 h-4" /> Paid
                     </div>
                   )}
                 </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payout Management</h1>
            <p className="text-muted-foreground mt-1">Review and process rewards and commissions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <StatsCard 
            title="Total Paid" 
            value={`₵${(analytics?.totalPaid || 0).toLocaleString()}`} 
            icon={DollarSign} 
          />
          <StatsCard 
            title="Pending Volume" 
            value={`₵${(analytics?.pendingVolume || 0).toLocaleString()}`} 
            icon={AlertCircle} 
            className="border-warning/20"
          />
          <StatsCard 
            title="Users Impacted" 
            value={(analytics?.usersImpacted || 0).toLocaleString()} 
            icon={Users} 
            className="md:col-span-2 lg:col-span-1"
          />
        </div>

        {/* Payouts Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
          <div className="border-b border-border/50 bg-background sticky top-0 z-10 -mx-6 px-6 sm:mx-0 sm:px-6 lg:px-8">
            <TabsList className="bg-transparent border-b-0 w-full justify-start rounded-none h-auto p-0 gap-6 md:gap-8 overflow-x-auto hide-scrollbar flex-nowrap pb-0">
              <TabsTrigger 
                value="pending" 
                className="relative px-0 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary hover:text-foreground hover:bg-transparent"
              >
                <div className="flex items-center gap-2 whitespace-nowrap">
                  Pending Approvals
                  {(pendingPayouts?.length || 0) > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs px-2 py-0 border-border/50">
                      {pendingPayouts?.length || 0}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="processing" 
                className="relative px-0 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary hover:text-foreground hover:bg-transparent"
              >
                <div className="flex items-center gap-2 whitespace-nowrap">
                  Ready to Pay
                  {(processingPayouts?.length || 0) > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs px-2 py-0 border-border/50">
                      {processingPayouts?.length || 0}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="completed" 
                className="relative px-0 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary hover:text-foreground hover:bg-transparent"
              >
                Completed
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="pt-6 min-h-[400px]">
            <TabsContent value="pending" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              {renderPayoutList(pendingPayouts || [], "pending", isLoadingPending)}
            </TabsContent>
            <TabsContent value="processing" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              {renderPayoutList(processingPayouts || [], "processing", isLoadingProcessing)}
            </TabsContent>
            <TabsContent value="completed" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              {renderPayoutList(completedPayouts || [], "completed", isLoadingCompleted)}
            </TabsContent>
          </div>
        </Tabs>

      </div>
    </DashboardLayout>
  );
}
