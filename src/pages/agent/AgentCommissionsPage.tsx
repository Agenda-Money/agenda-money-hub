import { useState } from "react";
import { motion } from "framer-motion";
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
  UserCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useSocket } from "@/hooks/useSocket";

export default function AgentCommissionsPage() {
  const [mainTab, setMainTab] = useState<"commissions" | "network">("commissions");
  const [historyTab, setHistoryTab] = useState<"all" | "earnings" | "deductions">("all");
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

  useSocket(wsUrl, (message: any) => {
    if (message?.type === "COMMISSION_PAYOUT_APPROVED") {
      queryClient.invalidateQueries({ queryKey: ["agent-commissions"] });
      toast({ title: "Payout Approved", description: "Your commission payout was approved." });
    }
  });

  const { data: commissionData, isLoading: isCommissionLoading } = useQuery({
    queryKey: ["agent-commissions"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/agents/commissions");
        return res.data;
      } catch (err) {
        console.warn("Using mock commission data");
        return {
          agentCode: "SAM541",
          totalEarned: 450,
          totalPaid: 200,
          availableForPayout: 250,
          currentCycle: "2026-03",
          recentCommissions: [
            { id: "comm_123", type: "SIGNUP", referredUserName: "Kojo", amount: 5, earnedAt: "2026-03-01T10:30:00Z", status: "PENDING" },
            { id: "comm_456", type: "REPAYMENT", referredUserName: "Ama", amount: 10, earnedAt: "2026-02-28T15:45:00Z", status: "ACCUMULATED" }
          ]
        };
      }
    }
  });

  const { data: networkData, isLoading: isNetworkLoading } = useQuery({
    queryKey: ["agent-network"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/agents/network");
        return res.data;
      } catch (err) {
        console.warn("Using mock network data");
        return {
          agentCode: "SAM541",
          totalReferrals: 25,
          activeReferrals: 18,
          paidOffReferrals: 7,
          recentReferrals: [
             { id: "user_123", fullName: "Kojo Mensah", msisdn: "233501234567", status: "NODE", loanAmount: 200, loanStatus: "DISBURSING", earnedCommission: 15, hasBeenEndorsed: true },
             { id: "user_456", fullName: "Ama Osei", msisdn: "233502345678", status: "NODE", loanAmount: 150, loanStatus: "ACTIVE", earnedCommission: 5, hasBeenEndorsed: false }
          ]
        };
      }
    }
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await api.post("/api/agents/commissions/request-payout", { amount });
      return res.data;
    },
    onSuccess: () => {
      toast({ title: "Payout Requested", description: "Your payout request has been successfully submitted." });
      setIsPayoutModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["agent-commissions"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Request Failed", description: error?.response?.data?.message || "Could not process payout request." });
    }
  });

  const handleRequestPayout = () => {
    if (commissionData?.availableForPayout > 0) {
       requestPayoutMutation.mutate(commissionData.availableForPayout);
    }
  };

  const filteredHistory = commissionData?.recentCommissions?.filter((item: any) => {
    if (historyTab === "earnings") return item.amount > 0;
    if (historyTab === "deductions") return item.amount < 0;
    return true;
  }) || [];

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
                {isCommissionLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-pink-400 mt-2" />
                ) : (
                  <>
                    <div>
                      <div className="text-4xl font-black text-pink-900">GHS {commissionData?.availableForPayout?.toFixed(2) || "0.00"}</div>
                      <p className="text-sm text-pink-600 mt-1 font-medium">Ready to claim for {commissionData?.currentCycle || 'this cycle'}</p>
                    </div>
                    <Button 
                      onClick={() => setIsPayoutModalOpen(true)}
                      disabled={!commissionData?.availableForPayout || commissionData.availableForPayout <= 0}
                      className="bg-[#EC1B84] hover:bg-[#D01773] text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-pink-200"
                    >
                      Request Payout
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Total Earned / Paid */}
            <Card className="flex flex-col justify-center">
              <CardContent className="pt-6 space-y-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Earned</p>
                  {isCommissionLoading ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : <p className="text-2xl font-bold text-gray-900">GHS {commissionData?.totalEarned?.toFixed(2) || "0.00"}</p>}
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Paid Out</p>
                  {isCommissionLoading ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : <p className="text-xl font-bold text-green-600">GHS {commissionData?.totalPaid?.toFixed(2) || "0.00"}</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest commissions and deductions.</CardDescription>
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
                {isCommissionLoading ? (
                  <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground"><p>No activity found.</p></div>
                ) : (
                  filteredHistory.map((item: any, index: number) => (
                    <motion.div key={item.id || index} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.amount > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                          {item.type === 'SIGNUP' ? <Users className="w-5 h-5" /> : item.type === 'REPAYMENT' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{item.referredUserName} {item.type === 'SIGNUP' ? 'signed up' : 'repaid loan'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">{new Date(item.earnedAt).toLocaleDateString()}</span>
                            <span className="text-gray-300">&bull;</span>
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${item.status === 'PAID' ? 'bg-green-100 text-green-700' : item.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{item.status === "ACCUMULATED" ? "ACCUM" : item.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`text-sm font-bold ${item.amount > 0 ? "text-green-600" : "text-red-600"}`}>{item.amount > 0 ? "+" : ""}GHS {Math.abs(item.amount).toFixed(2)}</div>
                    </motion.div>
                  ))
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
                 <CardContent className="p-6 relative z-10 h-full flex flex-col justify-center">
                    <p className="text-gray-400 text-sm font-medium mb-1">Your Agent Code</p>
                    <div className="text-3xl font-mono tracking-widest font-black text-white mb-6">
                       {networkData?.agentCode || "------"}
                    </div>
                    <Button 
                       onClick={() => {
                          if (networkData?.agentCode) {
                             navigator.clipboard.writeText(networkData.agentCode);
                             toast({ title: "Copied!", description: "Agent code copied to clipboard." });
                          }
                       }}
                       className="w-full bg-white/10 hover:bg-white/20 text-white border-none font-bold backdrop-blur-md"
                    >
                       <Copy className="w-4 h-4 mr-2" /> Copy to Share
                    </Button>
                 </CardContent>
              </Card>

              {/* Stats Card */}
              <Card className="md:col-span-2">
                 <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-gray-900">Network Stats</CardTitle>
                 </CardHeader>
                 <CardContent>
                    {isNetworkLoading ? (
                       <Loader2 className="h-6 w-6 animate-spin text-gray-400 my-4" />
                    ) : (
                       <div className="grid grid-cols-3 gap-4">
                          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                             <p className="text-xs text-gray-500 font-medium mb-1">Total Referred</p>
                             <p className="text-2xl font-black text-gray-900">{networkData?.totalReferrals || 0}</p>
                          </div>
                          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                             <p className="text-xs text-blue-600 font-medium mb-1">Active Loans</p>
                             <p className="text-2xl font-black text-blue-900">{networkData?.activeReferrals || 0}</p>
                          </div>
                          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                             <p className="text-xs text-green-600 font-medium mb-1">Repaid</p>
                             <p className="text-2xl font-black text-green-900">{networkData?.paidOffReferrals || 0}</p>
                          </div>
                       </div>
                    )}
                    <div className="mt-4 bg-pink-50 text-pink-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between border border-pink-100">
                       <span>Potential Earnings Waitlist:</span>
                       <strong className="font-black text-pink-900">GHS {((networkData?.activeReferrals || 0) * 10).toFixed(2)}</strong>
                    </div>
                 </CardContent>
              </Card>
           </div>

           {/* Referrals List */}
           <Card className="shadow-sm">
            <CardHeader>
               <CardTitle>Recent Referrals</CardTitle>
               <CardDescription>Users onboarded using your code.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-3">
                 {isNetworkLoading ? (
                   <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                 ) : networkData?.recentReferrals?.length === 0 ? (
                   <div className="text-center py-8 text-muted-foreground"><p>No referrals yet.</p></div>
                 ) : (
                   networkData?.recentReferrals?.map((user: any, index: number) => (
                     <div key={user.id || index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:shadow-md transition-all gap-4">
                       <div className="flex items-start gap-3">
                         <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                           {user.fullName?.[0] || 'U'}
                         </div>
                         <div>
                           <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-gray-900">{user.fullName}</p>
                              {user.status === "NODE" && <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Node User</span>}
                           </div>
                           <p className="text-xs text-gray-500 font-mono mt-0.5">{user.msisdn}</p>
                           <div className="flex items-center gap-2 mt-2 text-xs">
                              <span className="text-gray-600 font-medium">Loan: GHS {user.loanAmount}</span>
                              <span className="text-gray-300">•</span>
                              <span className={`font-bold ${user.loanStatus === 'ACTIVE' || user.loanStatus === 'DISBURSING' ? 'text-amber-600' : 'text-green-600'}`}>{user.loanStatus}</span>
                           </div>
                         </div>
                       </div>
                       
                       <div className="bg-gray-50 p-3 rounded-lg flex flex-col items-end shrink-0 sm:min-w-[140px]">
                          <p className="text-xs text-gray-500 font-medium mb-1">Commission Earned</p>
                          <p className="font-black text-gray-900">GHS {user.earnedCommission?.toFixed(2)}</p>
                          <div className="mt-2 text-[10px] font-bold uppercase flex items-center gap-1">
                             {user.hasBeenEndorsed ? (
                                <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Endorsed</span>
                             ) : (
                                <span className="text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Pend. Endorse</span>
                             )}
                          </div>
                       </div>
                     </div>
                   ))
                 )}
               </div>
            </CardContent>
           </Card>
        </div>
      )}

      {/* Payout Modal */}
      <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader className="text-left mb-4">
            <DialogTitle className="text-xl font-bold flex flex-col gap-2">
               Request Payout
               <span className="text-base font-medium text-gray-500 block">Available: GHS {commissionData?.availableForPayout?.toFixed(2)}</span>   
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              You are about to request a payout for your accumulated commissions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
             <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 text-sm font-medium text-blue-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="space-y-1">
                   <p><strong>Processing Timeline:</strong></p>
                   <ul className="list-disc pl-4 space-y-1 text-blue-700">
                      <li>Requests are reviewed by the 5th of the month.</li>
                      <li>Payments are sent directly to your registered MoMo number between the 10th and 15th.</li>
                   </ul>
                </div>
             </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
            <Button variant="outline" onClick={() => setIsPayoutModalOpen(false)} className="w-full rounded-xl h-12" disabled={requestPayoutMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleRequestPayout} className="w-full bg-[#EC1B84] hover:bg-[#D01773] text-white rounded-xl h-12 font-bold" disabled={requestPayoutMutation.isPending}>
              {requestPayoutMutation.isPending ? "Processing..." : `Confirm Request`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
