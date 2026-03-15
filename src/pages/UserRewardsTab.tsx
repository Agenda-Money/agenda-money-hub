import React, { useState, useEffect } from "react";
import { ArrowLeft, Gift, Wallet, AlertCircle, Clock, CheckCircle2, ChevronRight, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserRewardsSummary, getUserRewardsHistory, requestRewardPayout } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSocket } from "@/hooks/useSocket";
import { formatDistanceToNow } from "date-fns";

import { cn } from "@/lib/utils";

const toNumber = (value: unknown) => {
  let normalized = 0;
  if (typeof value === "number") {
    normalized = value;
  } else if (typeof value === "string") {
    normalized = Number.parseFloat(value);
  }
  return Number.isFinite(normalized) ? normalized : 0;
};

interface UserRewardsTabProps {
  onBack: () => void;
  userMsisdn?: string;
}

export function UserRewardsTab({ onBack, userMsisdn }: UserRewardsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [showPendingPayoutErrorModal, setShowPendingPayoutErrorModal] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [allHistory, setAllHistory] = useState<any[]>([]);
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

  useSocket(wsUrl, (message: any) => {
    if (message?.type === "REWARD_PAYOUT_APPROVED" || message?.type === "REFERRAL_LOAN_REPAID") {
      queryClient.invalidateQueries({ queryKey: ["userRewards"] });
    }
  });

  const { data: rewardsResponse, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["userRewards", userMsisdn],
    queryFn: async () => {
      const res = await getUserRewardsSummary();
      return res.data;
    }
  });

  const rewardsData = rewardsResponse;

  const { data: historyData, isLoading: isHistoryLoading, isFetching: isFetchingNextPage } = useQuery({
    queryKey: ["userRewardsHistory", historyPage],
    queryFn: async () => {
      const res = await getUserRewardsHistory(historyPage, 20);
      return res.data;
    },
    enabled: showFullHistory
  });

  useEffect(() => {
    if (historyData?.rewards) {
      if (historyPage === 1) {
        setAllHistory(historyData.rewards);
      } else {
        setAllHistory(prev => [...prev, ...historyData.rewards]);
      }
    }
  }, [historyData, historyPage]);

  const hasPendingPayout = allHistory.some((item: any) => {
    const type = (item.type || item.action || "").toUpperCase();
    const status = (item.status || "").toUpperCase();
    const isPayoutType = ["PAYOUT", "CASH_OUT", "REWARD"].includes(type);
    const isPendingStatus = ["REQUESTED", "PENDING", "APPROVED", "PROCESSING"].includes(status);
    return isPayoutType && isPendingStatus;
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async () => {
      const res = await requestRewardPayout();
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: "Payout Requested",
        description: "Your payout request has been successfully submitted.",
      });
      setIsPayoutModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["userRewards"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || "";
      if (errorMessage.toLowerCase().includes("pending")) {
        setShowPendingPayoutErrorModal(true);
        setIsPayoutModalOpen(false);
      } else {
        toast({
          variant: "destructive",
          title: "Request Failed",
          description: errorMessage || "Could not process payout request.",
        });
      }
    }
  });

  const handleRequestPayout = () => {
    if (rewardsData?.availableNow > 0) {
       requestPayoutMutation.mutate();
    } else {
       toast({
         title: "No Funds Available",
         description: "You do not have any available balance to request a payout.",
       });
    }
  };

  const statusColors = {
     REQUESTED: "text-amber-600 bg-amber-50",
     APPROVED: "text-blue-600 bg-blue-50",
     PAID: "text-green-600 bg-green-50",
     REJECTED: "text-red-600 bg-red-50",
     PENDING: "text-gray-400 bg-gray-50",
     PROCESSING: "text-blue-600 bg-blue-50"
  };

  const renderRewardItem = (reward: any, i: number) => {
    const isSignup = reward.event === 'signed up' || reward.action === 'signed up' || reward.type === 'SIGNUP';
    const amount = toNumber(reward.amount);
    
    return (
      <div key={reward.id || i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
         <div className="flex items-center gap-3">
            <div className={cn(
               "w-10 h-10 rounded-full flex items-center justify-center",
               isSignup ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
            )}>
               {isSignup ? <Gift className="w-5 h-5" /> : <Download className="w-5 h-5" />}
            </div>
            <div>
               <p className="text-sm font-bold text-gray-900">
                  {reward.userName || reward.clientName || reward.referralName || "Someone"} {isSignup ? "signed up" : "repaid loan"}
               </p>
               <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn(
                    "text-xs font-semibold",
                    amount > 0 ? "text-green-600" : "text-gray-400"
                  )}>
                    {amount > 0 ? `+GHS ${amount.toFixed(2)}` : "Pending Disbursement"}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs font-medium text-gray-400">
                     {formatDistanceToNow(new Date(reward.date || reward.createdAt), { addSuffix: true })}
                  </span>
               </div>
            </div>
         </div>
         <div className={cn(
            "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
            statusColors[reward.status as keyof typeof statusColors] || statusColors.PENDING
         )}>
            {reward.status?.replace(/_/g, " ") || "PENDING"}
         </div>
      </div>
    );
  };

  if (isSummaryLoading && !showFullHistory) {
    return (
      <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
         <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-32" />
         </div>
         <Skeleton className="h-[200px] w-full rounded-2xl" />
         <Skeleton className="h-[300px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 animate-in fade-in slide-in-from-right-8 duration-500">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center px-4 z-50 max-w-md mx-auto">
        <Button variant="ghost" onClick={showFullHistory ? () => setShowFullHistory(false) : onBack} className="h-10 w-10 p-0 rounded-full shrink-0">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button>
        <h1 className="text-base font-bold text-gray-900 ml-2">
          {showFullHistory ? "Rewards History" : "Your Rewards"}
        </h1>
      </header>

      <main className="pt-20 px-4 space-y-6 max-w-md mx-auto">
         {!showFullHistory ? (
           <>
             {/* Summary Card */}
             <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-hidden relative">
                <div className="absolute -right-4 -top-8 w-32 h-32 bg-pink-50 rounded-full blur-2xl opacity-60"></div>
                
                <div className="relative z-10 flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-600">
                      <Gift className="w-5 h-5" />
                   </div>
                   <div>
                      <h2 className="text-xl font-bold text-gray-900">GHS {rewardsData?.availableNow?.toFixed(2) || "0.00"}</h2>
                      <p className="text-sm font-medium text-gray-500">Available Now</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 mb-6">
                   <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Earned</p>
                      <p className="text-base font-bold text-gray-900">GHS {rewardsData?.totalEarned?.toFixed(2) || "0.00"}</p>
                   </div>
                   <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Paid</p>
                      <p className="text-base font-bold text-gray-600">GHS {rewardsData?.totalPaid?.toFixed(2) || "0.00"}</p>
                   </div>
                </div>

                <div className="space-y-4 mb-6">
                    {hasPendingPayout && (
                      <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in zoom-in duration-500 shadow-sm shadow-pink-100/30">
                         <Clock className="w-5 h-5 text-[#EC1B84] shrink-0 mt-0.5" />
                         <div className="text-[11px] text-pink-900 leading-relaxed">
                            <p className="font-bold text-sm text-pink-950 mb-1">Wait, we're on it!</p>
                            Your previous payout request is still pending. We're working as fast as we can to get your cash to you!
                         </div>
                      </div>
                    )}

                    <Button 
                       onClick={() => setIsPayoutModalOpen(true)}
                       disabled={hasPendingPayout || !rewardsData?.availableNow || rewardsData.availableNow <= 0 || requestPayoutMutation.isPending}
                       className={cn(
                          "w-full h-16 rounded-2xl font-black transition-all duration-300 shadow-lg",
                          hasPendingPayout 
                            ? "bg-gray-50 text-gray-400 border border-gray-100 shadow-none cursor-not-allowed" 
                            : "bg-[#EC1B84] text-white hover:bg-[#D01773] shadow-pink-200/50 hover:scale-[1.01]"
                       )}
                    >
                       <Wallet className="w-5 h-5 mr-2" />
                       {requestPayoutMutation.isPending ? "Processing..." : hasPendingPayout ? "Processing Payout" : "Request Payout"}
                    </Button>
                 </div>
                

             </div>

             {/* Recent Activity List */}
             <div className="pb-8">
                <div className="flex items-center justify-between mb-4 px-1">
                   <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Recent Activity</h3>
                </div>

                <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                   {!rewardsData?.recentActivity || rewardsData.recentActivity.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm">
                         No rewards earned yet. Share your code to start earning!
                      </div>
                   ) : (
                      rewardsData.recentActivity.map((reward: any, i: number) => renderRewardItem(reward, i))
                   )}
                   
                   {rewardsData?.recentActivity?.length > 0 && (
                      <button 
                        onClick={() => setShowFullHistory(true)}
                        className="w-full p-4 text-sm font-bold text-[#EC1B84] hover:bg-pink-50 transition-colors flex items-center justify-center gap-1"
                      >
                         View Full History
                         <ChevronRight className="w-4 h-4" />
                      </button>
                   )}
                </div>
             </div>
           </>
         ) : (
           /* Full History View */
           <div className="space-y-4 pb-20">
              <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                 {allHistory.length === 0 && !isHistoryLoading ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                       No reward history found.
                    </div>
                 ) : (
                    allHistory.map((reward: any, i: number) => renderRewardItem(reward, i))
                 )}
              </div>

              {historyData?.pagination && historyPage < historyData.pagination.pages && (
                <Button 
                  variant="outline" 
                  onClick={() => setHistoryPage(prev => prev + 1)}
                  className="w-full h-12 rounded-xl text-gray-600 font-bold"
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More History"
                  )}
                </Button>
              )}
              
              {isHistoryLoading && allHistory.length === 0 && (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              )}
           </div>
         )}
      </main>

      {/* Payout Modal */}
      <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader className="text-left mb-4">
            <DialogTitle className="text-xl font-bold flex flex-col gap-2">
               Request Payout
               <span className="text-base font-medium text-gray-500 block">Available: GHS {rewardsData?.availableNow?.toFixed(2)}</span>   
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              You are about to request a payout for your accumulated rewards.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
             <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 text-sm font-medium text-blue-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="space-y-1">
                   <p><strong>Processing Timeline:</strong></p>
                   {rewardsData?.payoutInfo ? (
                     <ul className="list-disc pl-4 space-y-1 text-blue-700">
                        <li>Requests are reviewed by the {rewardsData.payoutInfo.approvalDate}.</li>
                        <li>Payments are sent directly between the {rewardsData.payoutInfo.paymentWindow}.</li>
                     </ul>
                   ) : (
                     <ul className="list-disc pl-4 space-y-1 text-blue-700">
                        <li>Requests are reviewed by the 5th of the month.</li>
                        <li>Payments are sent directly between the 10th and 15th.</li>
                     </ul>
                   )}
                </div>
             </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
            <Button variant="outline" onClick={() => setIsPayoutModalOpen(false)} className="w-full rounded-xl h-12" disabled={requestPayoutMutation.isPending}>
              Cancel
            </Button>
            <Button 
               onClick={handleRequestPayout} 
               className="w-full bg-[#EC1B84] hover:bg-[#D01773] text-white rounded-xl h-12 font-bold"
               disabled={requestPayoutMutation.isPending}
            >
              {requestPayoutMutation.isPending ? "Processing..." : "Confirm Request"}
            </Button>
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
                We've already received your payout request and our finance team is currently reviewing it.
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
