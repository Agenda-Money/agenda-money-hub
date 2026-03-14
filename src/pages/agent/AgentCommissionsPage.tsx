import { useState } from "react";
import { motion } from "framer-motion";
import { Banknote, ArrowUpRight, ArrowDownRight, Loader2, Wallet, Users, CheckCircle2, Copy, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAgentCommissionSummary, getAgentCommissions, getAgentNetworkSummary, getAgentReferrals, requestAgentRewardPayout } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useSocket } from "@/hooks/useSocket";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, isValid } from "date-fns";
import { cn } from "@/lib/utils";

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);
const safeFormatDate = (value: unknown, dateFormat: string, fallback = "-") => {
  if (!value || !(typeof value === "string" || typeof value === "number" || value instanceof Date)) return fallback;
  const parsed = new Date(value);
  return isValid(parsed) ? format(parsed, dateFormat) : fallback;
};
const toNumber = (value: unknown) => {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : 0;
  return Number.isFinite(n) ? n : 0;
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

  const { data: summaryResponse, isLoading: isSummaryLoading } = useQuery({ queryKey: ["agent-commissions-summary"], queryFn: () => getAgentCommissionSummary() });
  const { data: historyResponse, isLoading: isHistoryLoading } = useQuery({ queryKey: ["agent-commissions-history"], queryFn: () => getAgentCommissions({ limit: 200 }) });
  const { data: networkResponse, isLoading: isNetworkLoading } = useQuery({ queryKey: ["agent-network-summary"], queryFn: async () => { const res = await getAgentNetworkSummary(); return res.data; } });
  const { data: referralsResponse, isLoading: isReferralsLoading } = useQuery({ queryKey: ["agent-referrals"], queryFn: async () => { const res = await getAgentReferrals(); return res.data; } });

  const requestPayoutMutation = useMutation({
    mutationFn: () => requestAgentRewardPayout(),
    onSuccess: (res: any) => { toast({ title: "Payout Requested", description: res.message || "Submitted successfully." }); setIsPayoutModalOpen(false); queryClient.invalidateQueries({ queryKey: ["agent-commissions-summary"] }); },
    onError: (error: any) => { toast({ variant: "destructive", title: "Failed", description: error?.response?.data?.message || "Could not process." }); },
  });

  const handleRequestPayout = () => {
    if (toNumber(summary?.netEarnings) > 0) requestPayoutMutation.mutate();
    else toast({ variant: "destructive", title: "No Balance", description: "Nothing to pay out." });
  };

  const summary = summaryResponse?.summary || summaryResponse?.data?.summary || summaryResponse?.data || {};
  const network = networkResponse || {};
  const referredUsers = asArray<any>(referralsResponse?.users || referralsResponse?.data?.users || referralsResponse?.items);
  const allHistory = asArray<any>(historyResponse?.commissions?.items || historyResponse?.data?.commissions?.items || historyResponse?.items || historyResponse?.commissions || historyResponse?.data?.items);
  const filteredHistory = allHistory.filter((item: any) => {
    if (historyTab === "earnings") return item.amount > 0;
    if (historyTab === "deductions") return item.amount < 0;
    return true;
  });

  const tabCls = (active: boolean) => cn("px-4 py-1.5 text-xs font-medium rounded-md transition-all", active ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Performance</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Commissions & network</p>
        </div>
        <div className="flex bg-muted p-0.5 rounded-lg w-fit">
          <button onClick={() => setMainTab("commissions")} className={tabCls(mainTab === "commissions")}>Commissions</button>
          <button onClick={() => setMainTab("network")} className={tabCls(mainTab === "network")}>Network</button>
        </div>
      </div>

      {mainTab === "commissions" && (
        <div className="space-y-4 animate-fade-in">
          {/* Payout Card */}
          <Card className="bg-background-pink-subtle border-primary/10 overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                {isSummaryLoading ? <Skeleton className="h-10 w-40" /> : (
                  <>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" />Available for Payout</p>
                      <p className="text-3xl font-bold text-foreground mt-1">GHS {toNumber(summary?.netEarnings).toFixed(2)}</p>
                      <div className="flex gap-4 mt-2">
                        <span className="text-[10px] text-muted-foreground">Signups: <strong className="text-emerald-600">GHS {toNumber(summary?.signupCommission).toFixed(0)}</strong></span>
                        <span className="text-[10px] text-muted-foreground">Repayments: <strong className="text-primary">GHS {toNumber(summary?.repaymentCommission).toFixed(0)}</strong></span>
                      </div>
                    </div>
                    <Button onClick={() => setIsPayoutModalOpen(true)} disabled={toNumber(summary?.netEarnings) <= 0} className="bg-gradient-pink hover:opacity-90 shadow-pink h-10 px-6 rounded-xl text-sm">
                      Request Payout
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader className="pb-2 px-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base">History</CardTitle>
                <div className="flex bg-muted p-0.5 rounded-lg">
                  {(["all", "earnings", "deductions"] as const).map(t => (
                    <button key={t} onClick={() => setHistoryTab(t)} className={tabCls(historyTab === t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4">
              {isHistoryLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(k => <Skeleton key={k} className="h-14 w-full rounded-xl" />)}</div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Banknote className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm font-medium">No activity yet</p>
                  <p className="text-xs mt-0.5">Onboard users to start earning!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredHistory.map((item: any, index: number) => {
                    const entryType = item.type || item.action || "DEDUCTION";
                    const isPositive = item.amount > 0;
                    return (
                      <motion.div
                        key={item._id || item.id || `${entryType}-${index}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", isPositive ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive")}>
                            {entryType === "SIGNUP" ? <Users className="w-3.5 h-3.5" /> : isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{entryType === "SIGNUP" ? "Signup Bonus" : entryType === "REPAYMENT" ? "Repayment Bonus" : "Deduction"}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{safeFormatDate(item.createdAt || item.date, "MMM d, yyyy")}</span>
                              <Badge variant="secondary" className="text-[8px] px-1.5 py-0">{item.status || "PAID"}</Badge>
                            </div>
                          </div>
                        </div>
                        <span className={cn("text-sm font-bold", isPositive ? "text-emerald-600" : "text-destructive")}>
                          {isPositive ? "+" : ""}GHS {Math.abs(item.amount).toFixed(2)}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {mainTab === "network" && (
        <div className="space-y-4 animate-fade-in">
          {/* Agent Code Card */}
          <Card className="bg-gradient-pink border-0 text-primary-foreground overflow-hidden">
            <CardContent className="p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">Your Agent Code</p>
              <p className="text-2xl font-mono font-bold tracking-widest mt-1">{network?.yourCode || "------"}</p>
              <Button
                onClick={() => { if (network?.yourCode) { navigator.clipboard.writeText(network.yourCode); toast({ title: "Copied!" }); } }}
                className="mt-3 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 h-9 rounded-lg text-xs"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Code
              </Button>
            </CardContent>
          </Card>

          {/* Network Stats */}
          <div className="grid grid-cols-3 gap-2">
            {isNetworkLoading ? [1, 2, 3].map(k => <Skeleton key={k} className="h-20 rounded-xl" />) : (
              <>
                <Card className="border shadow-sm"><CardContent className="p-3 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium">Users</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{network?.referredUsers || 0}</p>
                </CardContent></Card>
                <Card className="border shadow-sm"><CardContent className="p-3 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium">Network</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{network?.totalNetwork || 0}</p>
                </CardContent></Card>
                <Card className="border shadow-sm"><CardContent className="p-3 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium">Earned</p>
                  <p className="text-xl font-bold text-primary mt-0.5">GHS {toNumber(summary?.netEarnings).toFixed(0)}</p>
                </CardContent></Card>
              </>
            )}
          </div>

          {/* Referrals List */}
          <Card>
            <CardHeader className="pb-2 px-4">
              <CardTitle className="text-base">My Referrals</CardTitle>
              <CardDescription className="text-xs">Users onboarded through your code</CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              {isReferralsLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(k => <Skeleton key={k} className="h-16 rounded-xl" />)}</div>
              ) : referredUsers.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No referrals yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Share your code to grow your network</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {referredUsers.map((user: any, index: number) => {
                    const statusMap: Record<string, string> = { REPAID: "border-emerald-500/30 text-emerald-600 bg-emerald-500/5", ACTIVE: "border-primary/30 text-primary bg-primary/5", OVERDUE: "border-destructive/30 text-destructive bg-destructive/5" };
                    const statusCls = statusMap[user.lastLoanStatus?.toUpperCase()] || "";
                    return (
                      <motion.div key={user.msisdn || index} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-xs shrink-0">{user.name?.[0] || "U"}</div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{user.name}</p>
                            <span className="text-[10px] text-muted-foreground">{user.msisdn} · {safeFormatDate(user.joinedDate, "MMM yyyy")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-medium text-muted-foreground">{user.loanCount || 0} loans</span>
                          {user.lastLoanStatus && (
                            <Badge variant="outline" className={cn("text-[9px]", statusCls)}>{user.lastLoanStatus}</Badge>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payout Modal */}
      <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
        <DialogContent className="sm:max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Request Payout</DialogTitle>
            <DialogDescription className="text-xs">Your earnings will be sent to your MoMo number.</DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-xl p-4 my-2">
            <p className="text-xs text-muted-foreground">Payout Amount</p>
            <p className="text-2xl font-bold text-primary mt-0.5">GHS {toNumber(summary?.netEarnings).toFixed(2)}</p>
          </div>
          <p className="text-[11px] text-muted-foreground">Processed within 24-48h after admin approval.</p>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button variant="outline" onClick={() => setIsPayoutModalOpen(false)} className="h-10 rounded-xl" disabled={requestPayoutMutation.isPending}>Cancel</Button>
            <Button onClick={handleRequestPayout} className="h-10 rounded-xl bg-gradient-pink hover:opacity-90" disabled={requestPayoutMutation.isPending}>
              {requestPayoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
