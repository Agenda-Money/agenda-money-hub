import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Banknote, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  Wallet,
  Users,
  CheckCircle2,
  Copy,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getAgentCommissionSummary,
  getAgentCommissions,
  getAgentNetworkSummary, 
  getAgentReferrals, 
  requestAgentRewardPayout 
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useSocket } from "@/hooks/useSocket";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isValid } from "date-fns";

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);

const safeFormatDate = (value: unknown, dateFormat: string, fallback = "-") => {
  if (!value) return fallback;
  if (!(typeof value === "string" || typeof value === "number" || value instanceof Date)) return fallback;
  const parsed = new Date(value);
  if (!isValid(parsed)) return fallback;
  return format(parsed, dateFormat);
};

const toNumber = (value: unknown) => {
  let normalized = 0;
  if (typeof value === "number") {
    normalized = value;
  } else if (typeof value === "string") {
    normalized = Number.parseFloat(value);
  } else if (typeof value === "boolean") {
    normalized = value ? 1 : 0;
  }
  return Number.isFinite(normalized) ? normalized : 0;
};

export default function AgentCommissionsPage() {
  const [mainTab, setMainTab] = useState<"commissions" | "network">("commissions");
  const [historyTab, setHistoryTab] = useState<"all" | "earnings" | "deductions">("all");
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

  useSocket(wsUrl, (message: any) => {
    if (message?.type === "COMMISSION_PAYOUT_APPROVED") {
      queryClient.invalidateQueries({ queryKey: ["agent-commissions-summary"] });
      queryClient.invalidateQueries({ queryKey: ["agent-commissions-history"] });
      toast({ title: "Payout Approved", description: "Your commission payout was approved." });
    }
  });

  // Commission Summary
  const { data: summaryResponse, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["agent-commissions-summary"],
    queryFn: () => getAgentCommissionSummary(),
  });

  // Commissions History
  const { data: historyResponse, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["agent-commissions-history"],
    queryFn: () => getAgentCommissions({ limit: 200 }),
  });

  // Network Overview
  const { data: networkResponse, isLoading: isNetworkLoading } = useQuery({
    queryKey: ["agent-network-summary"],
    queryFn: async () => {
      const res = await getAgentNetworkSummary();
      return res.data;
    }
  });

  // Detailed Referrals
  const { data: referralsResponse, isLoading: isReferralsLoading } = useQuery({
    queryKey: ["agent-referrals"],
    queryFn: async () => {
      const res = await getAgentReferrals();
      return res.data;
    }
  });

  const requestPayoutMutation = useMutation({
    mutationFn: () => requestAgentRewardPayout(),
    onSuccess: (res: any) => {
      toast({ title: "Payout Requested", description: res.message || "Your payout request has been successfully submitted." });
      setIsPayoutModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["agent-commissions-summary"] });
      queryClient.invalidateQueries({ queryKey: ["agent-commissions-history"] });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Request Failed", 
        description: error?.response?.data?.message || "Could not process payout request." 
      });
    }
  });

  const handleRequestPayout = () => {
    if (toNumber(summary?.netEarnings) > 0) {
       requestPayoutMutation.mutate();
    } else {
       toast({
         variant: "destructive",
         title: "No Balance",
         description: "You have no available balance for payout."
       });
    }
  };

  const summary = summaryResponse?.summary || summaryResponse?.data?.summary || summaryResponse?.data || {};
  const network = networkResponse || {};
  const referredUsers = asArray<any>(referralsResponse?.users || referralsResponse?.data?.users || referralsResponse?.items);
  const allHistory = asArray<any>(
    historyResponse?.commissions?.items ||
    historyResponse?.data?.commissions?.items ||
    historyResponse?.items ||
    historyResponse?.commissions ||
    historyResponse?.data?.items
  );
  
  const filteredHistory = allHistory.filter((item: any) => {
    if (historyTab === "earnings") return item.amount > 0;
    if (historyTab === "deductions") return item.amount < 0;
    return true;
  });

  const historySkeletons = ["history-skeleton-1", "history-skeleton-2", "history-skeleton-3"];
  const referralSkeletons = ["referral-skeleton-1", "referral-skeleton-2", "referral-skeleton-3", "referral-skeleton-4"];

  const renderHistoryIcon = (entryType: string) => {
    if (entryType === "SIGNUP") {
      return <Users className="w-5 h-5" />;
    }

    if (entryType === "REPAYMENT") {
      return <ArrowUpRight className="w-5 h-5" />;
    }

    return <ArrowDownRight className="w-5 h-5" />;
  };

  const getHistoryLabel = (entryType: string) => {
    if (entryType === "SIGNUP") {
      return "Registration Bonus";
    }

    if (entryType === "REPAYMENT") {
      return "Repayment Bonus";
    }

    return "Deduction";
  };

  let historyContent;

  if (isHistoryLoading) {
    historyContent = historySkeletons.map((skeletonKey) => <Skeleton key={skeletonKey} className="h-16 w-full rounded-xl" />);
  } else if (filteredHistory.length === 0) {
    historyContent = (
      <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
        <Banknote className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="font-medium">No activity found yet.</p>
        <p className="text-xs pt-1">Onboard users to start earning commission!</p>
      </div>
    );
  } else {
    historyContent = (
      <div className="space-y-3">
        {filteredHistory.map((item: any, index: number) => {
          const entryType = item.type || item.action || "DEDUCTION";

          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={item._id || item.id || item.reference || `${entryType}-${item.createdAt || item.date || index}`}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.amount > 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                  {renderHistoryIcon(entryType)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{getHistoryLabel(entryType)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{safeFormatDate(item.createdAt || item.date, "MMM d, yyyy")}</span>
                    <span className="text-gray-300">&bull;</span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-gray-100 text-gray-600">{item.status || 'PAID'}</span>
                  </div>
                </div>
              </div>
              <div className={`text-sm font-bold ${item.amount > 0 ? "text-green-600" : "text-red-600"}`}>{item.amount > 0 ? "+" : ""}GHS {Math.abs(item.amount).toFixed(2)}</div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  let referralsContent;

  if (isReferralsLoading) {
    referralsContent = referralSkeletons.map((skeletonKey) => <Skeleton key={skeletonKey} className="h-20 w-full rounded-2xl" />);
  } else if (referredUsers.length === 0) {
    referralsContent = (
      <div className="text-center py-16 bg-gray-50/50 rounded-3xl border border-gray-100 border-dashed">
        <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900">No Referrals Yet</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-[240px] mx-auto">
          Share your code with potential users to grow your network and earn commissions.
        </p>
        <Button
          onClick={() => {
            if (network?.yourCode) {
              navigator.clipboard.writeText(network.yourCode);
              toast({ title: "Copied!", description: "Agent code copied." });
            }
          }}
          className="mt-6 bg-[#EC1B84] hover:bg-[#D01773] text-white font-bold rounded-xl"
        >
          <Copy className="w-4 h-4 mr-2" /> Copy Code
        </Button>
      </div>
    );
  } else {
    referralsContent = (
      <div className="space-y-3">
        {referredUsers.map((user: any, index: number) => {
          const statusColor = getStatusColor(user.lastLoanStatus || 'NONE');

          return (
            <div key={user.msisdn || `${user.name || 'referral'}-${index}`} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:border-[#EC1B84]/20 hover:shadow-lg hover:shadow-pink-500/5 transition-all gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center font-bold text-lg border border-gray-100">
                  {user.name?.[0] || 'U'}
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-gray-900">{user.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-500">{user.msisdn}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-[11px] font-medium text-gray-400">Joined {safeFormatDate(user.joinedDate, "MMM yyyy")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 md:min-w-[300px]">
                <div className="text-center md:text-right">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Loans</p>
                  <p className="text-sm font-bold text-gray-900">{user.loanCount || 0} Total</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Latest Status</p>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${statusColor}`}>
                    {user.lastLoanStatus || 'NONE'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function getStatusColor(status: string) {
    switch (status.toUpperCase()) {
      case 'REPAID': return 'bg-green-100 text-green-700';
      case 'ACTIVE': return 'bg-blue-100 text-blue-700';
      case 'OVERDUE': return 'bg-red-100 text-red-700';
      case 'DISBURSING': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      
      {/* Header & Main Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Agent Performance</h1>
          <p className="text-muted-foreground mt-1">Manage your commissions and network.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
          <button 
            onClick={() => setMainTab("commissions")}
            className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${mainTab === "commissions" ? "bg-white shadow-sm text-[#EC1B84]" : "text-gray-500 hover:text-gray-700"}`}
          >
            Commissions
          </button>
          <button 
            onClick={() => setMainTab("network")}
            className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${mainTab === "network" ? "bg-white shadow-sm text-[#EC1B84]" : "text-gray-500 hover:text-gray-700"}`}
          >
            My Network
          </button>
        </div>
      </div>

      {mainTab === "commissions" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Available to Payout */}
            <Card className="bg-gradient-to-br from-pink-50 to-pink-100/50 border-pink-200 shadow-sm relative overflow-hidden md:col-span-2">
              <div className="absolute right-0 top-0 w-64 h-64 bg-pink-400/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-pink-700 flex items-center gap-2 z-10">
                  <Wallet className="w-5 h-5" />
                  Available for Payout
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-10 relative">
                {isSummaryLoading ? (
                  <Skeleton className="h-12 w-48" />
                ) : (
                  <>
                    <div>
                      <div className="text-4xl font-black text-pink-900">GHS {toNumber(summary?.netEarnings).toFixed(2)}</div>
                      <p className="text-sm text-pink-600 mt-1 font-medium">Available for payout (pending admin approval)</p>
                    </div>
                    <Button 
                      onClick={() => setIsPayoutModalOpen(true)}
                      disabled={toNumber(summary?.netEarnings) <= 0}
                      className="bg-[#EC1B84] hover:bg-[#D01773] text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-pink-200"
                    >
                      Request Payout
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Stats Breakdown */}
            <Card className="flex flex-col justify-center">
              <CardContent className="pt-6 space-y-4">
                <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Earned</p>
                   {isSummaryLoading ? <Skeleton className="h-6 w-24" /> : <p className="text-xl font-bold text-gray-900">GHS {toNumber(summary?.netEarnings).toFixed(2)}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-4">
                   <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mb-0.5">Signups</p>
                    <p className="text-sm font-bold text-green-600">GHS {toNumber(summary?.signupCommission).toFixed(0)}</p>
                   </div>
                   <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mb-0.5">Repayments</p>
                    <p className="text-sm font-bold text-blue-600">GHS {toNumber(summary?.repaymentCommission).toFixed(0)}</p>
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Commission History</CardTitle>
                  <CardDescription>All your earnings and deductions.</CardDescription>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button onClick={() => setHistoryTab("all")} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${historyTab === "all" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>All</button>
                  <button onClick={() => setHistoryTab("earnings")} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${historyTab === "earnings" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>Earnings</button>
                  <button onClick={() => setHistoryTab("deductions")} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${historyTab === "deductions" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>Deductions</button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">{historyContent}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {mainTab === "network" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
           <div className="grid gap-4 md:grid-cols-3">
              {/* Agent Share Card */}
                <Card className="bg-gradient-to-br from-[#EC1B84] via-[#F472B6] to-[#F9A8D4] text-white border-none shadow-lg overflow-hidden relative">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-white/15 rounded-full blur-2xl -mr-10 -mt-10"></div>
                 <CardHeader className="pb-0">
                    <CardTitle className="text-xs text-pink-50/80 font-bold uppercase tracking-widest">Your Agent Code</CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 pt-2 relative z-10">
                    <div className="text-3xl font-mono tracking-widest font-black text-white mb-6">
                       {network?.yourCode || "------"}
                    </div>
                    <Button 
                       onClick={() => {
                            if (network?.yourCode) {
                              navigator.clipboard.writeText(network.yourCode);
                             toast({ title: "Copied!", description: "Agent code copied to clipboard." });
                          }
                       }}
                        className="w-full bg-white/20 hover:bg-white/30 text-white border-none font-bold backdrop-blur-md h-12 rounded-xl"
                    >
                       <Copy className="w-4 h-4 mr-2" /> Copy & Share
                    </Button>
                 </CardContent>
              </Card>

              {/* Network Stats */}
              <Card className="md:col-span-2 overflow-hidden">
                 <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-gray-900">Network Overview</CardTitle>
                 </CardHeader>
                 <CardContent>
                    {isNetworkLoading ? (
                       <div className="grid grid-cols-3 gap-4">
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-20 w-full" />
                       </div>
                    ) : (
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-center">
                             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight mb-1">Total Users</p>
                             <p className="text-2xl font-black text-gray-900">{network?.referredUsers || 0}</p>
                          </div>
                          <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 flex flex-col justify-center">
                             <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight mb-1">Network Size</p>
                             <p className="text-2xl font-black text-blue-900">{network?.totalNetwork || 0}</p>
                          </div>
                          <div className="hidden sm:flex flex-col justify-center bg-pink-50/30 rounded-2xl p-4 border border-pink-100 group">
                             <p className="text-[10px] text-pink-600 font-bold uppercase tracking-tight mb-1 flex items-center justify-between">
                                Referral Earnings
                                <TrendingUp className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                             </p>
                              <p className="text-2xl font-black text-[#EC1B84]">GHS {toNumber(summary?.netEarnings).toFixed(0)}</p>
                          </div>
                       </div>
                    )}
                 </CardContent>
              </Card>
           </div>

           {/* Referrals Detailed Table/List */}
           <Card className="shadow-sm border-none bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
               <div>
                  <CardTitle>My Referrals</CardTitle>
                  <CardDescription>Detailed list of all users onboarded.</CardDescription>
               </div>
               <div className="hidden sm:flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-bold rounded-lg border-gray-200">
                     <Calendar className="w-3.5 h-3.5 mr-2" /> Recent
                  </Button>
               </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">{referralsContent}</div>
            </CardContent>
           </Card>
        </div>
      )}

      {/* Payout Modal */}
      <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-[32px] p-8 border-none shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-pink-50 rounded-full blur-3xl opacity-50"></div>
          
          <DialogHeader className="text-left mb-6 relative z-10">
            <DialogTitle className="text-2xl font-black text-gray-900 flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-[#EC1B84]" />
               </div>
               Request Payout
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-base mt-3 leading-relaxed">
               Ready to cash out your commissions? Your earnings will be sent to your registered MoMo number.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 relative z-10">
             <div className="bg-gray-50 rounded-[24px] p-6 border border-gray-100">
                <p className="text-sm font-medium text-gray-500 mb-1">Payout Amount</p>
               <div className="text-3xl font-black text-[#EC1B84]">GHS {toNumber(summary?.netEarnings).toFixed(2)}</div>
             </div>

             <div className="space-y-4">
                <div className="flex items-start gap-4">
                   <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-blue-600" />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-gray-900">Timeline</p>
                       <p className="text-xs text-gray-500 mt-0.5">Processed within 24-48 hours after approval</p>
                   </div>
                </div>
                <div className="flex items-start gap-4">
                   <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-gray-900">Approval</p>
                       <p className="text-xs text-gray-500 mt-0.5">Pending admin approval</p>
                   </div>
                </div>
             </div>
          </div>

          <DialogFooter className="mt-10 flex flex-col-reverse sm:flex-row gap-4 relative z-10">
            <Button variant="secondary" onClick={() => setIsPayoutModalOpen(false)} className="w-full rounded-[18px] h-14 font-bold bg-gray-100 hover:bg-gray-200 border-none text-gray-600" disabled={requestPayoutMutation.isPending}>
              Maybe Later
            </Button>
            <Button onClick={handleRequestPayout} className="w-full bg-[#EC1B84] hover:bg-[#D01773] text-white rounded-[18px] h-14 font-black shadow-xl shadow-pink-200" disabled={requestPayoutMutation.isPending}>
              {requestPayoutMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
