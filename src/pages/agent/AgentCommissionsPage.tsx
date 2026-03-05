import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Banknote, 
  TrendingUp, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Info,
  Loader2,
  Wallet,
  Users,
  CheckCircle2,
  Share2,
  Copy,
  UserCheck,
  ChevronDown,
  Calendar,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { 
  getAgentRewardsSummary, 
  getAgentRewardsHistory, 
  getAgentNetworkSummary, 
  getAgentReferrals, 
  requestAgentRewardPayout 
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useSocket } from "@/hooks/useSocket";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

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

  // Rewards Summary
  const { data: rewardsResponse, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["agent-commissions-summary"],
    queryFn: async () => {
      const res = await getAgentRewardsSummary();
      return res.data;
    }
  });

  // Commissions History with Pagination
  const { 
    data: historyData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading: isHistoryLoading 
  } = useInfiniteQuery({
    queryKey: ["agent-commissions-history"],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await getAgentRewardsHistory(pageParam, 10);
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.pages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
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
    if ((rewardsResponse?.availableNow || 0) > 0) {
       requestPayoutMutation.mutate();
    } else {
       toast({
         variant: "destructive",
         title: "No Balance",
         description: "You have no available balance for payout."
       });
    }
  };

  const allHistory = historyData?.pages.flatMap(page => page.rewards) || [];
  
  const filteredHistory = allHistory.filter((item: any) => {
    if (historyTab === "earnings") return item.amount > 0;
    if (historyTab === "deductions") return item.amount < 0;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'REPAID': return 'bg-green-100 text-green-700';
      case 'ACTIVE': return 'bg-blue-100 text-blue-700';
      case 'OVERDUE': return 'bg-red-100 text-red-700';
      case 'DISBURSING': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

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
                      <div className="text-4xl font-black text-pink-900">GHS {(rewardsResponse?.availableNow || 0).toFixed(2)}</div>
                      <p className="text-sm text-pink-600 mt-1 font-medium">Ready to claim for {rewardsResponse?.currentCycle || 'this cycle'}</p>
                    </div>
                    <Button 
                      onClick={() => setIsPayoutModalOpen(true)}
                      disabled={!rewardsResponse?.availableNow || rewardsResponse.availableNow <= 0}
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
                   {isSummaryLoading ? <Skeleton className="h-6 w-24" /> : <p className="text-xl font-bold text-gray-900">GHS {(rewardsResponse?.totalEarned || 0).toFixed(2)}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-4">
                   <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mb-0.5">Signups</p>
                      <p className="text-sm font-bold text-green-600">GHS {(rewardsResponse?.signupCommission || 0).toFixed(0)}</p>
                   </div>
                   <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mb-0.5">Repayments</p>
                      <p className="text-sm font-bold text-blue-600">GHS {(rewardsResponse?.repaymentCommission || 0).toFixed(0)}</p>
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
                {isHistoryLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                     <Banknote className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                     <p className="font-medium">No activity found yet.</p>
                     <p className="text-xs pt-1">Onboard users to start earning commission!</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                       {filteredHistory.map((item: any, index: number) => (
                         <motion.div 
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: index * 0.05 }}
                           key={item.id || index} 
                           className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-all"
                         >
                           <div className="flex items-center gap-4">
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.amount > 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                               {item.action === 'SIGNUP' ? <Users className="w-5 h-5" /> : item.action === 'REPAYMENT' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                             </div>
                             <div>
                               <p className="text-sm font-bold text-gray-900">{item.action === 'SIGNUP' ? 'Registration Bonus' : item.action === 'REPAYMENT' ? 'Repayment Bonus' : 'Deduction'}</p>
                               <div className="flex items-center gap-2 mt-0.5">
                                 <span className="text-xs text-gray-500">{item.date ? format(new Date(item.date), "MMM d, yyyy") : '-'}</span>
                                 <span className="text-gray-300">&bull;</span>
                                 <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-gray-100 text-gray-600`}>{item.status || 'PAID'}</span>
                               </div>
                             </div>
                           </div>
                           <div className={`text-sm font-bold ${item.amount > 0 ? "text-green-600" : "text-red-600"}`}>{item.amount > 0 ? "+" : ""}GHS {Math.abs(item.amount).toFixed(2)}</div>
                         </motion.div>
                       ))}
                    </div>
                    {hasNextPage && (
                       <Button 
                         variant="ghost" 
                         onClick={() => fetchNextPage()} 
                         disabled={isFetchingNextPage}
                         className="w-full mt-4 text-gray-500 font-bold hover:bg-gray-50"
                       >
                         {isFetchingNextPage ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load More Activity"}
                       </Button>
                    )}
                  </>
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
              <Card className="bg-[#1A1A1A] text-white border-none shadow-lg overflow-hidden relative">
                 <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                 <CardHeader className="pb-0">
                    <CardTitle className="text-xs text-gray-400 font-bold uppercase tracking-widest">Your Agent Code</CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 pt-2 relative z-10">
                    <div className="text-3xl font-mono tracking-widest font-black text-white mb-6">
                       {networkResponse?.yourCode || "------"}
                    </div>
                    <Button 
                       onClick={() => {
                          if (networkResponse?.yourCode) {
                             navigator.clipboard.writeText(networkResponse.yourCode);
                             toast({ title: "Copied!", description: "Agent code copied to clipboard." });
                          }
                       }}
                       className="w-full bg-white/10 hover:bg-white/20 text-white border-none font-bold backdrop-blur-md h-12 rounded-xl"
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
                             <p className="text-2xl font-black text-gray-900">{networkResponse?.referredUsers || 0}</p>
                          </div>
                          <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 flex flex-col justify-center">
                             <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight mb-1">Network Size</p>
                             <p className="text-2xl font-black text-blue-900">{networkResponse?.totalNetwork || 0}</p>
                          </div>
                          <div className="hidden sm:flex flex-col justify-center bg-pink-50/30 rounded-2xl p-4 border border-pink-100 group">
                             <p className="text-[10px] text-pink-600 font-bold uppercase tracking-tight mb-1 flex items-center justify-between">
                                Referral Earnings
                                <TrendingUp className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                             </p>
                             <p className="text-2xl font-black text-[#EC1B84]">GHS {(rewardsResponse?.totalEarned || 0).toFixed(0)}</p>
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
               <div className="space-y-3">
                 {isReferralsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
                 ) : !referralsResponse?.users || referralsResponse.users.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50/50 rounded-3xl border border-gray-100 border-dashed">
                       <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                       <h3 className="text-lg font-bold text-gray-900">No Referrals Yet</h3>
                       <p className="text-sm text-gray-500 mt-1 max-w-[240px] mx-auto">
                          Share your code with potential users to grow your network and earn commissions.
                       </p>
                       <Button 
                          onClick={() => {
                             if (networkResponse?.yourCode) {
                                navigator.clipboard.writeText(networkResponse.yourCode);
                                toast({ title: "Copied!", description: "Agent code copied." });
                             }
                          }}
                          className="mt-6 bg-gray-900 hover:bg-black text-white font-bold rounded-xl"
                       >
                          <Copy className="w-4 h-4 mr-2" /> Copy Code
                       </Button>
                    </div>
                 ) : (
                    <div className="space-y-3">
                       {referralsResponse.users.map((user: any, index: number) => {
                          const statusColor = getStatusColor(user.lastLoanStatus || 'NONE');
                          return (
                            <div key={user.msisdn || index} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:border-[#EC1B84]/20 hover:shadow-lg hover:shadow-pink-500/5 transition-all gap-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center font-bold text-lg border border-gray-100">
                                  {user.name?.[0] || 'U'}
                                </div>
                                <div className="space-y-1">
                                  <h4 className="font-bold text-gray-900">{user.name}</h4>
                                  <div className="flex items-center gap-2">
                                     <span className="text-xs font-mono text-gray-500">{user.msisdn}</span>
                                     <span className="text-gray-300">•</span>
                                     <span className="text-[11px] font-medium text-gray-400">Joined {user.joinedDate ? format(new Date(user.joinedDate), "MMM yyyy") : '-'}</span>
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
                 )}
               </div>
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
                <div className="text-3xl font-black text-[#EC1B84]">GHS {(rewardsResponse?.availableNow || 0).toFixed(2)}</div>
             </div>

             <div className="space-y-4">
                <div className="flex items-start gap-4">
                   <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-blue-600" />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-gray-900">Timeline</p>
                      <p className="text-xs text-gray-500 mt-0.5">{rewardsResponse?.payoutInfo?.paymentWindow || 'Processed within 24-48 hours'}</p>
                   </div>
                </div>
                <div className="flex items-start gap-4">
                   <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-gray-900">Approval</p>
                      <p className="text-xs text-gray-500 mt-0.5">{rewardsResponse?.payoutInfo?.approvalDate || 'Processed automatically'}</p>
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
