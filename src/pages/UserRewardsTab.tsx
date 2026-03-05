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

interface UserRewardsTabProps {
  onBack: () => void;
  userMsisdn?: string;
}

export function UserRewardsTab({ onBack, userMsisdn }: UserRewardsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
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
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: error?.response?.data?.message || "Could not process payout request.",
      });
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
     PENDING: "text-amber-600 bg-amber-50",
     ACCUMULATED: "text-blue-600 bg-blue-50",
     APPROVED_FOR_PAYOUT: "text-orange-600 bg-orange-50",
     PAID: "text-green-600 bg-green-50"
  };

  const renderRewardItem = (reward: any, i: number) => (
    <div key={reward.id || i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
       <div className="flex items-center gap-3">
          <div className={"w-10 h-10 rounded-full flex items-center justify-center " + (
             (reward.event === 'signed up' || reward.action === 'signed up') ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
          )}>
             {(reward.event === 'signed up' || reward.action === 'signed up') ? <Gift className="w-5 h-5" /> : <Download className="w-5 h-5" />}
          </div>
          <div>
             <p className="text-sm font-bold text-gray-900">
                {reward.referralName || "Someone"} {reward.event || reward.action}
             </p>
             <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-semibold text-green-600">+GHS {reward.amount?.toFixed(2)}</span>
                <span className="text-gray-300">•</span>
                <span className="text-xs font-medium text-gray-400">
                   {formatDistanceToNow(new Date(reward.date), { addSuffix: true })}
                </span>
             </div>
          </div>
       </div>
       <div className={"px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider " + (statusColors[reward.status as keyof typeof statusColors] || statusColors.PENDING)}>
          {reward.status === "ACCUMULATED" ? "ACCUM" : reward.status.replace(/_/g, " ")}
       </div>
    </div>
  );

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

                <Button 
                   onClick={() => setIsPayoutModalOpen(true)}
                   disabled={!rewardsData?.availableNow || rewardsData.availableNow <= 0 || requestPayoutMutation.isPending}
                   className="w-full h-14 rounded-2xl bg-[#EC1B84] text-white hover:bg-[#D01773] font-bold shadow-lg shadow-pink-200/50"
                >
                   <Wallet className="w-5 h-5 mr-2" />
                   {requestPayoutMutation.isPending ? "Processing..." : "Request Payout"}
                </Button>
                
                {rewardsData?.payoutInfo && (
                  <div className="mt-4 bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
                     <div className="flex items-start gap-2 text-xs text-gray-500 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <p>Funds will be approved by the {rewardsData.payoutInfo.approvalDate}</p>
                     </div>
                     <div className="flex items-start gap-2 text-xs text-gray-500 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <p>Payment window: {rewardsData.payoutInfo.paymentWindow}</p>
                     </div>
                  </div>
                )}
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
    </div>
  );
}
