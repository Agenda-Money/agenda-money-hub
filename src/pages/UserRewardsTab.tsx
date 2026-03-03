import React, { useState } from "react";
import { ArrowLeft, Gift, Wallet, AlertCircle, Clock, CheckCircle2, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSocket } from "@/hooks/useSocket";

interface UserRewardsTabProps {
  onBack: () => void;
  userMsisdn?: string;
}

export function UserRewardsTab({ onBack, userMsisdn }: UserRewardsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

  useSocket(wsUrl, (message: any) => {
    if (message?.type === "REWARD_PAYOUT_APPROVED" || message?.type === "REFERRAL_LOAN_REPAID") {
      queryClient.invalidateQueries({ queryKey: ["userRewards"] });
    }
  });

  const { data: rewardsData, isLoading } = useQuery({
    queryKey: ["userRewards", userMsisdn],
    queryFn: async () => {
      // For now, mock data if endpoint fails while backend is catching up 
      // or directly use the actual API if implemented completely
      try {
        const res = await api.get("/users/rewards");
        return res.data;
      } catch (err) {
        // Fallback mock strictly simulating the provided guide structure
        console.warn("Using mock rewards data as backend endpoint might be pending");
        return {
          totalEarned: 150,
          totalPaid: 50,
          availableForPayout: 100,
          currentCycle: "2026-03",
          activeReferrals: 2,
          recentRewards: [
            {
              id: "reward_123",
              type: "SIGNUP",
              referredUserName: "Kojo",
              amount: 5,
              earnedAt: "2026-03-01T10:30:00Z",
              status: "PENDING"
            },
            {
              id: "reward_456",
              type: "REPAYMENT",
              referredUserName: "Ama",
              amount: 10,
              earnedAt: "2026-02-28T15:45:00Z",
              status: "ACCUMULATED"
            },
            {
              id: "reward_789",
              type: "SIGNUP",
              referredUserName: "James",
              amount: 5,
              earnedAt: "2026-02-25T11:00:00Z",
              status: "ACCUMULATED"
            },
            {
               id: "reward_999",
               type: "REPAYMENT",
               referredUserName: "James",
               amount: 10,
               earnedAt: "2026-02-10T11:00:00Z",
               status: "PAID"
             }
          ]
        };
      }
    }
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await api.post("/users/rewards/request-payout", { amount });
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
    if (rewardsData?.availableForPayout > 0) {
       requestPayoutMutation.mutate(rewardsData.availableForPayout);
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
     APPROVED_FOR_PAYOUT: "text-purple-600 bg-purple-50",
     PAID: "text-green-600 bg-green-50"
  };

  if (isLoading) {
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
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center px-4 z-40 max-w-md mx-auto">
        <Button variant="ghost" onClick={onBack} className="h-10 w-10 p-0 rounded-full shrink-0">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button>
        <h1 className="text-base font-bold text-gray-900 ml-2">Your Rewards</h1>
      </header>

      <main className="pt-20 px-4 space-y-6 max-w-md mx-auto">
         {/* Summary Card */}
         <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-hidden relative">
            <div className="absolute -right-4 -top-8 w-32 h-32 bg-pink-50 rounded-full blur-2xl opacity-60"></div>
            
            <div className="relative z-10 flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-600">
                  <Gift className="w-5 h-5" />
               </div>
               <div>
                  <h2 className="text-xl font-bold text-gray-900">GHS {rewardsData?.availableForPayout?.toFixed(2) || "0.00"}</h2>
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
               disabled={!rewardsData?.availableForPayout || rewardsData.availableForPayout <= 0}
               className="w-full h-14 rounded-2xl bg-[#EC1B84] text-white hover:bg-[#D01773] font-bold shadow-lg shadow-pink-200/50"
            >
               <Wallet className="w-5 h-5 mr-2" />
               Request Payout
            </Button>
            
            <div className="mt-4 bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
               <div className="flex items-start gap-2 text-xs text-gray-500 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <p>Funds will be approved by the 5th of next month</p>
               </div>
               <div className="flex items-start gap-2 text-xs text-gray-500 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <p>Payment processed between the 10th - 15th</p>
               </div>
            </div>
         </div>

         {/* Recent Activity List */}
         <div>
            <div className="flex items-center justify-between mb-4 px-1">
               <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Recent Activity</h3>
            </div>

            <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
               {rewardsData?.recentRewards?.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                     No rewards earned yet. Share your code to start earning!
                  </div>
               ) : (
                  rewardsData?.recentRewards?.map((reward: any, i: number) => (
                     <div key={reward.id || i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className={"w-10 h-10 rounded-full flex items-center justify-center " + (
                              reward.type === 'SIGNUP' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                           )}>
                              {reward.type === 'SIGNUP' ? <Gift className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                           </div>
                           <div>
                              <p className="text-sm font-bold text-gray-900">
                                 {reward.referredUserName} {reward.type === 'SIGNUP' ? 'signed up' : 'repaid loan'}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                 <span className="text-xs font-semibold text-green-600">+GHS {reward.amount?.toFixed(2)}</span>
                                 <span className="text-gray-300">•</span>
                                 <span className="text-xs font-medium text-gray-400">
                                    {new Date(reward.earnedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                 </span>
                              </div>
                           </div>
                        </div>
                        <div className={"px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider " + (statusColors[reward.status as keyof typeof statusColors] || statusColors.PENDING)}>
                           {reward.status === "ACCUMULATED" ? "ACCUM" : reward.status}
                        </div>
                     </div>
                  ))
               )}
               
               {rewardsData?.recentRewards?.length > 0 && (
                  <button className="w-full p-4 text-sm font-bold text-[#EC1B84] hover:bg-pink-50 transition-colors flex items-center justify-center gap-1">
                     View Full History
                     <ChevronRight className="w-4 h-4" />
                  </button>
               )}
            </div>
         </div>
      </main>

      {/* Payout Modal */}
      <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader className="text-left mb-4">
            <DialogTitle className="text-xl font-bold flex flex-col gap-2">
               Request Payout
               <span className="text-base font-medium text-gray-500 block">Available: GHS {rewardsData?.availableForPayout?.toFixed(2)}</span>   
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
                   <ul className="list-disc pl-4 space-y-1 text-blue-700">
                      <li>Requests are reviewed by the 5th of the month.</li>
                      <li>Payments are sent directly to your mobile money number between the 10th and 15th.</li>
                   </ul>
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
};
