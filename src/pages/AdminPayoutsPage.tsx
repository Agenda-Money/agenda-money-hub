import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatsCard } from "@/components/dashboard/StatsCard";
import {
  approveAdminPayoutRequest,
  getAdminPayoutRequests,
  markAdminPayoutPaid,
  rejectAdminPayoutRequest,
} from "@/lib/api";

type PayoutTab = "pending" | "processing" | "completed";

type PayoutItem = {
  _id: string;
  requesterType: "USER" | "AGENT";
  source: "REWARD" | "COMMISSION";
  requesterName?: string;
  requesterMsisdn?: string;
  amount: number;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "PAID";
  reference?: string;
  requestedAt?: string;
};

const extractItems = (payload: any): PayoutItem[] => payload?.data?.items || payload?.items || [];

export default function AdminPayoutsPage() {
  const [activeTab, setActiveTab] = useState<PayoutTab>("pending");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

  const invalidatePayoutQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
  };

  useSocket(user?.role === "admin" ? wsUrl : null, (message: any) => {
    if (["PAYOUT_REQUEST_SUBMITTED", "REWARD_PAYOUT_REQUESTED", "COMMISSION_PAYOUT_REQUESTED"].includes(message?.type)) {
      invalidatePayoutQueries();
      toast.success("New payout request received");
    }
  });

  const pendingQuery = useQuery({
    queryKey: ["admin-payouts", "REQUESTED"],
    queryFn: () => getAdminPayoutRequests({ status: "REQUESTED", limit: 100 }),
  });

  const approvedQuery = useQuery({
    queryKey: ["admin-payouts", "APPROVED"],
    queryFn: () => getAdminPayoutRequests({ status: "APPROVED", limit: 100 }),
  });

  const paidQuery = useQuery({
    queryKey: ["admin-payouts", "PAID"],
    queryFn: () => getAdminPayoutRequests({ status: "PAID", limit: 100 }),
  });

  const pendingPayouts = extractItems(pendingQuery.data);
  const processingPayouts = extractItems(approvedQuery.data);
  const completedPayouts = extractItems(paidQuery.data);

  const analytics = useMemo(() => {
    const totalPaid = completedPayouts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const pendingVolume = pendingPayouts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const impactedSet = new Set(
      [...completedPayouts, ...processingPayouts, ...pendingPayouts]
        .map((item) => item.requesterMsisdn || item._id)
        .filter(Boolean)
    );

    return {
      totalPaid,
      pendingVolume,
      usersImpacted: impactedSet.size,
    };
  }, [completedPayouts, processingPayouts, pendingPayouts]);

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => approveAdminPayoutRequest(requestId),
    onSuccess: () => {
      toast.success("Payout request approved");
      invalidatePayoutQueries();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to approve payout request"),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) =>
      rejectAdminPayoutRequest(requestId, reason),
    onSuccess: () => {
      toast.success("Payout request rejected");
      invalidatePayoutQueries();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to reject payout request"),
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ requestId, paymentReference }: { requestId: string; paymentReference?: string }) =>
      markAdminPayoutPaid(requestId, paymentReference),
    onSuccess: () => {
      toast.success("Payout marked as paid");
      invalidatePayoutQueries();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to mark payout as paid"),
  });

  const renderPayoutList = (list: PayoutItem[], tab: PayoutTab, isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-xl border border-border/50">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Banknote className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No {tab} payouts</h3>
          <p className="text-sm text-muted-foreground">There are currently no {tab} payout requests.</p>
        </div>
      );
    }

    return (
      <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden divide-y divide-border/20">
        <AnimatePresence>
          {list.map((payout, i) => (
            <motion.div
              key={payout._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-muted/50 transition-colors gap-4"
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    payout.source === "COMMISSION" ? "bg-blue-500/10 text-blue-600" : "bg-purple-500/10 text-purple-600"
                  )}
                >
                  {payout.source === "COMMISSION" ? <Users className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{payout.requesterName || "N/A"}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase",
                        payout.source === "COMMISSION"
                          ? "bg-blue-500/10 text-blue-700 border-blue-500/30"
                          : "bg-purple-500/10 text-purple-700 border-purple-500/30"
                      )}
                    >
                      {payout.source}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {payout.requesterType}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{payout.requesterMsisdn || "-"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {payout.requestedAt ? new Date(payout.requestedAt).toLocaleString() : "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 md:w-auto w-full pt-4 md:pt-0 border-t border-border/20 md:border-0 mt-2 md:mt-0">
                <div className="text-left md:text-right">
                  <p className="text-xs text-muted-foreground mb-0.5">Amount</p>
                  <p className="text-lg font-bold text-foreground">₵{(Number(payout.amount) || 0).toFixed(2)}</p>
                  {payout.reference && <p className="text-[10px] text-muted-foreground mt-1">{payout.reference}</p>}
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {tab === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          const reason = globalThis.prompt("Reason for rejection", "Invalid account details")?.trim();
                          if (!reason) return;
                          rejectMutation.mutate({ requestId: payout._id, reason });
                        }}
                        disabled={rejectMutation.isPending || approveMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-1.5" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => approveMutation.mutate(payout._id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
                      </Button>
                    </>
                  )}

                  {tab === "processing" && (
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => {
                        const paymentReference = globalThis.prompt("Payment reference (optional)", "")?.trim();
                        markPaidMutation.mutate({ requestId: payout._id, paymentReference: paymentReference || undefined });
                      }}
                      disabled={markPaidMutation.isPending}
                    >
                      <RefreshCw className="w-4 h-4 mr-1.5" /> Mark Paid
                    </Button>
                  )}

                  {tab === "completed" && (
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-md">
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payout Management</h1>
            <p className="text-muted-foreground mt-1">Review and process user reward and agent commission requests.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" disabled>
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2" disabled>
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <StatsCard title="Total Paid" value={`₵${analytics.totalPaid.toLocaleString()}`} icon={DollarSign} />
          <StatsCard title="Pending Volume" value={`₵${analytics.pendingVolume.toLocaleString()}`} icon={AlertCircle} className="border-warning/20" />
          <StatsCard title="Users Impacted" value={analytics.usersImpacted.toLocaleString()} icon={Users} className="md:col-span-2 lg:col-span-1" />
        </div>

        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as PayoutTab)} className="w-full">
          <div className="border-b border-border/50 bg-background sticky top-0 z-10 -mx-6 px-6 sm:mx-0 sm:px-6 lg:px-8">
            <TabsList className="bg-transparent border-b-0 w-full justify-start rounded-none h-auto p-0 gap-6 md:gap-8 overflow-x-auto hide-scrollbar flex-nowrap pb-0">
              <TabsTrigger
                value="pending"
                className="relative px-0 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary hover:text-foreground hover:bg-transparent"
              >
                <div className="flex items-center gap-2 whitespace-nowrap">
                  Pending Approvals
                  {pendingPayouts.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs px-2 py-0 border-border/50">
                      {pendingPayouts.length}
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
                  {processingPayouts.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs px-2 py-0 border-border/50">
                      {processingPayouts.length}
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
              {renderPayoutList(pendingPayouts, "pending", pendingQuery.isLoading)}
            </TabsContent>
            <TabsContent value="processing" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              {renderPayoutList(processingPayouts, "processing", approvedQuery.isLoading)}
            </TabsContent>
            <TabsContent value="completed" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              {renderPayoutList(completedPayouts, "completed", paidQuery.isLoading)}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
