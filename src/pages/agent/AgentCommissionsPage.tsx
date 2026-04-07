import { useState, useEffect } from "react";
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
  Clock,
  AlertCircle,
  HelpCircle,
  AlertTriangle
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
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
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);

const safeFormatDate = (value: unknown, dateFormat: string, fallback = "-") => {
  if (!value) return fallback;
  if (!(typeof value === "string" || typeof value === "number" || value instanceof Date)) return fallback;
  const parsed = new Date(value);
  if (!isValid(parsed)) return fallback;
  return format(parsed, dateFormat);
};

const toNumber = (value: any): number => {
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

const formatGHS = (value: number) => {
  return new Intl.NumberFormat('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export default function AgentCommissionsPage() {
  const [mainTab, setMainTab] = useState<"commissions" | "network" >("commissions");
  const [historyTab, setHistoryTab] = useState<"all" | "earnings" | "deductions">("all");
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [showPendingPayoutErrorModal, setShowPendingPayoutErrorModal] = useState(false);
  const [nextEligibleDate, setNextEligibleDate] = useState<string | null>(null);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);
  const [optimisticPendingAmount, setOptimisticPendingAmount] = useState(0);
  
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

  // Commissions History with Pagination
  const { 
    data: infiniteHistoryData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading: isHistoryLoading 
  } = useInfiniteQuery({
    queryKey: ["agent-commissions-history", historyTab],
    queryFn: ({ pageParam = 1 }) => {
      const entryType = historyTab === "earnings" ? "EARNING" : historyTab === "deductions" ? "DEDUCTION" : undefined;
      return getAgentCommissions({ page: pageParam, limit: 10, entryType } as any);
    },
    getNextPageParam: (lastPage) => {
      const items = lastPage?.commissions?.items || lastPage?.data?.commissions?.items || lastPage?.items || lastPage?.commissions || lastPage?.data?.items || [];
      const pagination = lastPage?.pagination || lastPage?.commissions?.pagination || {};
      const total = pagination.total || lastPage?.commissions?.total || lastPage?.total || 0;
      const currentPage = pagination.page || lastPage?.commissions?.page || lastPage?.page || 1;
      const totalPages = pagination.pages || Math.ceil(total / 10);
      
      if (currentPage < totalPages) return currentPage + 1;
      // Fallback: if we got exactly 10 items, assume there might be more
      if (items.length === 10) return currentPage + 1;
      return undefined;
    },
    initialPageParam: 1,
  });

  const allHistory = asArray<any>(
    infiniteHistoryData?.pages?.flatMap(page => 
      asArray<any>(
        page?.commissions?.items || 
        page?.data?.commissions?.items || 
        page?.items || 
        page?.commissions || 
        page?.data?.items
      )
    ) || []
  );

  // Network Overview
  const { data: networkResponse, isLoading: isNetworkLoading } = useQuery({
    queryKey: ["agent-network-summary"],
    queryFn: async () => {
      return await getAgentNetworkSummary();
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
    onSuccess: () => {
      // Optimistically subtract the current balance
      const currentAvailable = toNumber(summary?.availableNow || summary?.netEarnings);
      setOptimisticPendingAmount(prev => prev + currentAvailable);
      
      toast({ title: "Success", description: "Your payout request has been submitted!" });
      setIsPayoutModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["agent-commissions-summary"] });
      queryClient.invalidateQueries({ queryKey: ["agent-commissions-history"] });
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      
      if (status === 429) {
        toast({
          variant: "destructive",
          title: "Cooldown Period",
          description: "You can only request a payout every 2 weeks. Please try again after your cooldown period has ended."
        });
      } else if (status === 409) {
        setShowPendingPayoutErrorModal(true);
        setIsPayoutModalOpen(false);
      } else if (status === 400 && error?.response?.data?.nextEligibleDate) {
        setNextEligibleDate(error.response.data.nextEligibleDate);
        setCooldownMessage(`Next payout: ${format(new Date(error.response.data.nextEligibleDate), "MMM d, yyyy")}`);
        toast({ 
          variant: "destructive", 
          title: "Payout Blocked", 
          description: `You are eligible for your next payout on ${format(new Date(error.response.data.nextEligibleDate), "MMM d, yyyy")}` 
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Request Failed", 
          description: getFriendlyErrorMessage(error)
        });
      }
    }
  });

  const handleRequestPayout = () => {
    if (toNumber(summary?.availableNow || summary?.netEarnings) > 0) {
       requestPayoutMutation.mutate();
    } else {
       toast({
         variant: "destructive",
         title: "No Balance",
         description: "You have no available balance for payout."
       });
    }
  };

  const summary = summaryResponse?.summary || summaryResponse?.data?.summary || summaryResponse?.data || summaryResponse || {};
  const network = networkResponse?.network || networkResponse?.data?.network || networkResponse?.data || networkResponse || {};
  const referredUsers = asArray<any>(referralsResponse?.users || referralsResponse?.data?.users || referralsResponse?.items);
  
  // MERGED HISTORY: Use the already calculated allHistory array
  const allHistoryItems = allHistory;
  
  const recentActivities = [
    ...asArray<any>(summaryResponse?.recentActivity || summary?.recentActivity || []),
    ...allHistoryItems.slice(0, 5) // Use some items from history as "recent" if summary is empty
  ];
  
  const mergedHistory = [...allHistoryItems];
  
  const pendingRequests = mergedHistory.filter((item: any) => {
    const type = (item.entryType || item.type || item.action || "").toUpperCase().replace('-', '_');
    const status = (item.status || "").toUpperCase();
    
    const isPayoutType = ["PAYOUT", "CASH_OUT", "WITHDRAWAL", "PENDING_PAYOUT"].includes(type);
    const isPendingStatus = ["REQUESTED", "PENDING", "APPROVED", "PROCESSING"].includes(status);
    
    return isPayoutType && isPendingStatus;
  });

  const hasPendingPayout = pendingRequests.length > 0;
  const historyPendingAmount = pendingRequests.reduce((acc: number, item: any) => acc + Math.abs(toNumber(item.amount || item.value)), 0);
  
  // Backend now provides these directly
  const totalEarned = toNumber(summary.totalEarned);
  const totalDeducted = toNumber(summary.totalDeducted || summary.defaultDeduction);
  const netBalance = toNumber(summary.netBalance);
  const displayAvailable = toNumber(summary.availableNow);
  const pendingPayouts = toNumber(summary.pendingPayouts);

  // Reset optimistic subtraction once history captures it
  useEffect(() => {
    if (historyPendingAmount > 0) {
       setOptimisticPendingAmount(0);
    }
  }, [historyPendingAmount]);
  
  const filteredHistory = mergedHistory.filter((item: any) => {
    if (historyTab === "earnings") return item.amount > 0;
    if (historyTab === "deductions") return item.amount < 0;
    return true;
  });

  const historySkeletons = ["history-skeleton-1", "history-skeleton-2", "history-skeleton-3"];
  const referralSkeletons = ["referral-skeleton-1", "referral-skeleton-2", "referral-skeleton-3", "referral-skeleton-4"];

  const renderHistoryIcon = (entryType: string) => {
    const type = entryType.toUpperCase();
    if (type === "SIGNUP" || type === "SIGNUP_COMMISSION") {
      return <Users className="w-5 h-5" />;
    }

    if (type === "REPAYMENT" || type === "REPAYMENT_COMMISSION") {
      return <ArrowUpRight className="w-5 h-5" />;
    }

    if (["DEFAULT_DEDUCTION", "MANUAL_DEDUCTION", "MANUAL_CORRECTION", "FRAUD_REVOCATION", "DEFAULT_PENALTY"].includes(type)) {
      return <AlertTriangle className="w-5 h-5" />;
    }

    return <ArrowDownRight className="w-5 h-5" />;
  };

  const getHistoryLabel = (entryType: string, personName?: string) => {
    const type = entryType.toUpperCase();
    const name = personName || "";
    
    if (type === "SIGNUP" || type === "SIGNUP_COMMISSION") {
      return (
        <>
          Bonus <span className="text-emerald-500 font-black">earned</span> from <span className="text-foreground">{name}</span>
        </>
      );
    }

    if (type === "REPAYMENT" || type === "REPAYMENT_COMMISSION") {
      return (
        <>
          Commission from <span className="text-foreground">{name}</span> repayment
        </>
      );
    }

    if (type === "CASH_OUT" || type === "PAYOUT") {
      return "Commission Payout";
    }

    if (type === "FRAUD_REVOCATION") {
      return "Fraud Revocation";
    }

    if (["DEFAULT_DEDUCTION", "MANUAL_DEDUCTION", "MANUAL_CORRECTION", "DEFAULT_PENALTY"].includes(type)) {
      return "Commission Deduction";
    }

    return "System Adjustment";
  };

  let historyContent;

  if (isHistoryLoading) {
    historyContent = historySkeletons.map((skeletonKey) => <Skeleton key={skeletonKey} className="h-16 w-full rounded-xl" />);
  } else if (filteredHistory.length === 0) {
    historyContent = (
      <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
        <Banknote className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="font-bold text-gray-900">No commissions yet</p>
        <p className="text-xs pt-1 max-w-[200px] mx-auto">
          {historyTab === "earnings" 
            ? "Sign-up bonuses are credited after the first disbursement." 
            : "Onboard users to start earning commissions!"}
        </p>
      </div>
    );
  } else {
    historyContent = (
      <div className="space-y-3">
        {filteredHistory.map((item: any, index: number) => {
          const entryType = (item.entryType || item.type || item.action || "DEDUCTION").toUpperCase();
          const amount = toNumber(item.amount);
          const isDeduction = ["DEFAULT_DEDUCTION", "MANUAL_DEDUCTION", "MANUAL_CORRECTION", "FRAUD_REVOCATION", "DEFAULT_PENALTY"].includes(entryType);

          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={item._id || item.id || item.reference || `${entryType}-${item.createdAt || item.date || index}`}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                  {renderHistoryIcon(entryType)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500 leading-tight">
                    {getHistoryLabel(entryType, item.personName || item.userName || item.name || item.customerName || item.borrowerName || item.referralName)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{safeFormatDate(item.createdAt || item.date, "MMM d, yyyy")}</span>
                    <span className="text-gray-300">&bull;</span>
                    <span className={cn(
                      "text-[9px] uppercase font-black px-1.5 py-0.5 rounded-sm",
                      item.status === "PAID" ? "bg-green-100 text-green-700" : 
                      isDeduction ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    )}>
                      {isDeduction ? "DEDUCTION" : 
                       (item.status || "").toUpperCase() === 'REQUESTED' || !item.status ? 'EARNED' : item.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className={cn(
                "text-sm font-black",
                amount > 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {amount > 0 ? "+" : "-"}GHS {formatGHS(Math.abs(amount))}
              </div>
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
              <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-6 z-10 relative">
                {isSummaryLoading ? (
                  <Skeleton className="h-12 w-48" />
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="text-4xl font-black text-pink-900">GHS {formatGHS(displayAvailable)}</div>
                        <p className="text-sm text-pink-600 font-medium">Available for payout (net earnings after deductions)</p>
                      </div>
                      
                      {hasPendingPayout && (
                        <div className="bg-white/60 backdrop-blur-sm border border-pink-200/50 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-left-4 duration-500 shadow-sm">
                           <Clock className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
                           <div className="text-[11px] text-pink-800 leading-relaxed font-medium">
                             <strong className="text-pink-900">Request under review</strong><br/>
                             Our finance team is currently processing your previous request. Please wait for it to be completed.
                           </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-full">
                              <Button 
                                onClick={() => setIsPayoutModalOpen(true)}
                                disabled={hasPendingPayout || displayAvailable <= 0 || (!!(summary?.lastPayoutRequestedAt || summary?.lastPayoutDate || summary?.lastPayoutAt) && (new Date().getTime() - new Date(summary.lastPayoutRequestedAt || summary.lastPayoutDate || summary.lastPayoutAt).getTime()) < 14 * 24 * 60 * 60 * 1000)}
                                className={cn(
                                  "h-16 px-10 rounded-2xl shadow-xl transition-all duration-300 min-w-[200px] font-black tracking-tight w-full",
                                  (hasPendingPayout || (!!(summary?.lastPayoutRequestedAt || summary?.lastPayoutDate || summary?.lastPayoutAt) && (new Date().getTime() - new Date(summary.lastPayoutRequestedAt || summary.lastPayoutDate || summary.lastPayoutAt).getTime()) < 14 * 24 * 60 * 60 * 1000))
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200" 
                                    : "bg-[#EC1B84] hover:bg-[#D01773] text-white shadow-pink-200/50 hover:scale-[1.02] active:scale-[0.98]"
                                )}
                              >
                                {hasPendingPayout ? "Processing Payout" : "Request Payout"}
                              </Button>
                            </div>
                          </TooltipTrigger>
                          {!!cooldownMessage && (
                            <TooltipContent>
                              <p>Payout requests are only allowed every 2 weeks.</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                      
                      {/* Cooldown logic handled via state */}
                      
                      {cooldownMessage ? (
                        <p className="text-[10px] text-gray-500 font-medium">{cooldownMessage}</p>
                      ) : displayAvailable > 0 && !hasPendingPayout ? (
                        <p className="text-[10px] text-emerald-600 font-bold">Payout available now</p>
                      ) : null}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Stats Breakdown */}
            <Card className="flex flex-col justify-center">
              <CardContent className="pt-6 space-y-4">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Earned</p>
                    {isSummaryLoading ? <Skeleton className="h-6 w-24" /> : <p className="text-xl font-bold text-gray-900">GHS {formatGHS(totalEarned)}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                   <div className="space-y-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Signups ({summary.counts?.signups || "0"})</p>
                      <p className="text-sm font-bold text-emerald-600">+GHS {formatGHS(toNumber(summary?.breakdown?.signupCommission || summary?.signupCommission))}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Repayments ({summary.counts?.repayments || "0"})</p>
                      <p className="text-sm font-bold text-blue-600">+GHS {formatGHS(toNumber(summary?.breakdown?.repaymentCommission || summary?.repaymentCommission))}</p>
                   </div>
                    <div className="space-y-1 col-span-2 pt-2 border-t border-gray-50">
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Total Deductions ({summary.counts?.defaults || 0} defaults)</p>
                       <p className="text-sm font-bold text-red-600">GHS {formatGHS(totalDeducted)}</p>
                    </div>
                   <div className="space-y-1 col-span-2 pt-2 border-t border-gray-100">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Net Balance (Available)</p>
                      <p className={cn(
                        "text-sm font-black",
                        netBalance >= 0 ? "text-emerald-600" : "text-red-600"
                      )}>
                        GHS {formatGHS(netBalance)}
                      </p>
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
              <div className="space-y-3">
                {historyContent}
                
                {hasNextPage && (
                  <div className="pt-4 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="text-xs font-bold rounded-lg border-gray-200 h-9 px-6 bg-white hover:bg-gray-50 text-gray-600"
                    >
                      {isFetchingNextPage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load More History"
                      )}
                    </Button>
                  </div>
                )}
              </div>
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
                       {network?.yourCode || network?.agentCode || summary?.agentCode || "------"}
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
                             <p className="text-2xl font-black text-gray-900">{toNumber(network?.referredUsers || network?.totalUsers || network?.totalReferrals || network?.totalCount).toFixed(0)}</p>
                          </div>
                          <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 flex flex-col justify-center">
                             <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight mb-1">Network Size</p>
                             <p className="text-2xl font-black text-blue-900">{toNumber(network?.totalNetwork || network?.networkSize || network?.activeUsers || network?.size).toFixed(0)}</p>
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
               <div className="text-3xl font-black text-[#EC1B84]">GHS {formatGHS(toNumber(summary?.availableNow || summary?.netEarnings))}</div>
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full h-14">
                    <Button 
                      onClick={handleRequestPayout} 
                      className="w-full bg-[#EC1B84] hover:bg-[#D01773] text-white rounded-[18px] h-14 font-black shadow-xl shadow-pink-200" 
                      disabled={
                        requestPayoutMutation.isPending || 
                        hasPendingPayout || 
                        displayAvailable <= 0 || 
                        (!!(summary?.lastPayoutRequestedAt || summary?.lastPayoutDate || summary?.lastPayoutAt) && 
                        (new Date().getTime() - new Date(summary.lastPayoutRequestedAt || summary.lastPayoutDate || summary.lastPayoutAt).getTime()) < 1209600000)
                      }
                    >
                      {requestPayoutMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Payout"}
                    </Button>
                  </div>
                </TooltipTrigger>
                {cooldownMessage && (
                  <TooltipContent>
                    <p>{cooldownMessage}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Payout Error Modal */}
      <Dialog open={showPendingPayoutErrorModal} onOpenChange={setShowPendingPayoutErrorModal}>
        <DialogContent className="sm:max-w-md bg-white rounded-[32px] p-8 border-none shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
          
          <div className="flex flex-col items-center text-center space-y-6 relative z-10 pt-4">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center animate-pulse">
               <Clock className="w-10 h-10 text-blue-500" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-gray-900">Verification in progress</h3>
              <p className="text-gray-500 text-base leading-relaxed max-w-xs mx-auto">
                You already have a pending payout request.
              </p>
            </div>

            <Button 
              onClick={() => setShowPendingPayoutErrorModal(false)}
              className="w-full bg-gray-900 hover:bg-black text-white rounded-2xl h-14 font-black transition-all"
            >
              Got it, thanks!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
