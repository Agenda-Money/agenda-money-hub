import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, PhoneCall, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

interface LoanInfo {
  id: string;
  user: string;
  amount: number;
  remaining: number;
  dueDate: string;
}

const MoMoAvatar = () => (
  <div className="h-10 w-10 rounded-full bg-[#fce4ec] flex items-center justify-center text-[#c2185b] font-bold text-[10px] tracking-tight shrink-0">
    MoMo
  </div>
);

import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  getRecentRepayments, 
  getAdminLoans, 
  recordManualRepayment,
  getEligibleLoans,
  getCollectionActivities
} from "@/lib/api";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";

export default function RepaymentsPage() {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [loanReference, setLoanReference] = useState("");
  const [debouncedPhone, setDebouncedPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  
  const [period, setPeriod] = useState("monthly");
  const [limit, setLimit] = useState(10);
  const [source, setSource] = useState<string | undefined>(undefined);
  
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "collections" ? "agent-collections" : "record";
  const [activeMainTab, setActiveMainTab] = useState(initialTab);

  useEffect(() => {
    if (searchParams.get("tab") === "collections") {
      setActiveMainTab("agent-collections");
      setSource("collections");
    }
  }, [searchParams]);

  const { data: recentRepayments, isLoading: isLoadingRecent, isFetching: isFetchingMore } = useQuery({
    queryKey: ["recent-repayments", period, limit, source],
    queryFn: async () => {
      const res = await getRecentRepayments({ period, limit, source });
      return res.data || [];
    },
  });

  const groupedRepayments = recentRepayments?.reduce((acc: any, rep: any) => {
    if (!rep.paidAt) return acc;
    const dateStr = format(new Date(rep.paidAt), "MMM d, yyyy");
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(rep);
    return acc;
  }, {} as Record<string, any[]>);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPhone(phone), 400);
    return () => clearTimeout(timer);
  }, [phone]);

  const { data: eligibleLoansRes, isLoading: isCheckingLoans } = useQuery({
    queryKey: ["eligible-loans", debouncedPhone],
    queryFn: async () => {
      const res = await getEligibleLoans(debouncedPhone);
      return res;
    },
    enabled: debouncedPhone.trim().length >= 9,
  });

  const eligibleLoans = eligibleLoansRes?.loans || [];

  const mutation = useMutation({
    mutationFn: (data: any) => recordManualRepayment(data),
    onSuccess: (data) => {
      setSubmitted(true);
      setResultData(data.data || data); // Store result for receipt
      toast.success(data.message || "Payment recorded successfully");
    },
    onError: (error: any) => {
      toast.error(getFriendlyErrorMessage(error));
    }
  });

  const generateReference = () => {
    const adminId = user?.id ? String(user.id).substring(0, 4) : "ADM";
    const dateStr = format(new Date(), "yyyyMMdd");
    const timestamp = Date.now().toString().slice(-4);
    setReference(`MAN-${dateStr}-${adminId.toUpperCase()}-${timestamp}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!phone && !loanReference) || !amount || !method || !reference) {
      toast.error("Please fill in required fields. Phone or Loan Reference is required.");
      return;
    }
    
    mutation.mutate({
      msisdn: phone || undefined,
      loanReference: loanReference || undefined,
      amount: parseFloat(amount),
      method: method.toUpperCase(),
      reference,
      notes
    });
  };

  if (submitted && resultData) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto mt-12 bg-card rounded-xl shadow-sm border border-border p-6 animate-fade-in">
          <div className="text-center pt-8 pb-8">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Payment Recorded!
            </h2>
            <p className="text-muted-foreground mb-6">
              {resultData.message || `Successfully recorded GHS ${Number(amount || 0).toFixed(2)} repayment`}
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 text-left mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                 <div>
                   <p className="text-muted-foreground">Status</p>
                   <Badge variant="outline" className="bg-success/5 text-success border-success/20 mt-1">
                     {resultData.status || "SUCCESS"}
                   </Badge>
                 </div>
                 <div>
                   <p className="text-muted-foreground">Repayment ID</p>
                   <p className="font-mono text-xs mt-1">{resultData.repaymentId || "N/A"}</p>
                 </div>
                 <div>
                   <p className="text-muted-foreground">Wallet Balance</p>
                   <p className="font-medium text-lg text-primary">GHS{resultData.walletBalance ?? "0.00"}</p>
                 </div>
                 <div>
                   <p className="text-muted-foreground">Remaining Loan Balance</p>
                   <p className="font-bold text-lg">GHS{resultData.remainingBalance ?? "0.00"}</p>
                 </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSubmitted(false);
                  setPhone("");
                  setLoanReference("");
                  setAmount("");
                  setMethod("");
                  setReference("");
                  setNotes("");
                  setResultData(null);
                }}
              >
                New Repayment
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-[480px] md:max-w-6xl mx-auto pb-12 transition-all duration-300">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Loan Repayments</h1>
          <p className="text-muted-foreground mt-1">Manage loan repayments and view history</p>
        </div>

        <Tabs value={activeMainTab} onValueChange={(val) => {
          setActiveMainTab(val);
          if (val === "organic") setSource("organic");
          else if (val === "agent-collections") setSource("collections");
          else setSource(undefined);
        }} className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="record">Record Payment</TabsTrigger>
            <TabsTrigger value="organic">Organic Payments</TabsTrigger>
            <TabsTrigger value="agent-collections">Agent Collections</TabsTrigger>
            <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="record">
            <div className="max-w-xl mx-auto lg:mx-0">
              <Card>
                <CardHeader><CardTitle>Repayment Details</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" placeholder="e.g. 2335..." value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="loanReference">Loan Reference</Label>
                        <Input id="loanReference" placeholder="e.g. LN-..." value={loanReference} onChange={(e) => setLoanReference(e.target.value)} />
                      </div>
                    </div>
                    {isCheckingLoans ? (
                      <div className="text-xs text-muted-foreground animate-pulse">Checking eligible loans...</div>
                    ) : eligibleLoans.length > 0 ? (
                      <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Select Eligible Loan</p>
                        <div className="space-y-2">
                          {eligibleLoans.map((loan: any) => {
                            const ref = loan.loanCode || loan.loanReference || loan._id;
                            const balance = loan.outstandingBalance ?? loan.remainingBalance ?? loan.amount ?? loan.principal ?? 0;
                            return (
                              <div 
                                key={ref}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                                  loanReference === ref
                                    ? "bg-pink-50 border-pink-200 text-pink-900"
                                    : "bg-background border-border hover:border-pink-200"
                                )}
                                onClick={() => {
                                  setLoanReference(ref);
                                  setAmount(balance.toString());
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold">{ref}</span>
                                  <span className="text-xs text-muted-foreground">Status: {loan.status || 'UNKNOWN'}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-bold text-emerald-600">GHS {Number(balance).toFixed(2)}</span>
                                  <p className="text-[10px] text-muted-foreground uppercase">Balance</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      debouncedPhone.length >= 9 && <div className="text-xs text-amber-600 font-medium">No eligible active/overdue loans found.</div>
                    )}
                    <div className="space-y-2">
                       <Label htmlFor="amount">Amount (GHS)</Label>
                       <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="method">Payment Method</Label>
                       <Select value={method} onValueChange={setMethod}>
                          <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                          <SelectContent><SelectItem value="momo">MoMo</SelectItem><SelectItem value="bank">Bank</SelectItem></SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="reference">Reference</Label>
                       <Input value={reference} onChange={(e) => setReference(e.target.value)} />
                       <Button variant="link" size="sm" onClick={generateReference} className="p-0 h-auto">Auto-generate</Button>
                    </div>
                    <Button type="submit" className="w-full" disabled={mutation.isPending}>
                       {mutation.isPending ? "Recording..." : "Record Payment"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="organic" className="mt-0">
            <RepaymentHistorySection 
              title="Organic Repayments" 
              subtitle="Customer-initiated payments"
              source="organic"
              isLoading={isLoadingRecent}
              repayments={recentRepayments}
              period={period}
              setPeriod={setPeriod}
              limit={limit}
              setLimit={setLimit}
              isFetchingMore={isFetchingMore}
            />
          </TabsContent>

          <TabsContent value="agent-collections" className="mt-0">
            <RepaymentHistorySection 
              title="Agent Collections" 
              subtitle="CSA-driven debt recovery"
              source="collections"
              isLoading={isLoadingRecent}
              repayments={recentRepayments}
              period={period}
              setPeriod={setPeriod}
              limit={limit}
              setLimit={setLimit}
              isFetchingMore={isFetchingMore}
              accentColor="text-pink-600"
            />
          </TabsContent>

          <TabsContent value="logs" className="mt-0">
            <CollectionLogsView />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function RepaymentHistorySection({ title, subtitle, source, isLoading, repayments, period, setPeriod, limit, setLimit, isFetchingMore, accentColor = "text-foreground" }: any) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
        <div>
          <h2 className={cn("text-2xl font-bold leading-tight", accentColor)}>{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px] h-10 rounded-xl bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Last 30 days</SelectItem>
            <SelectItem value="weekly">Last 7 days</SelectItem>
            <SelectItem value="24h">Last 24 hours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {source === "collections" && repayments && repayments.length > 0 && (
        <div className="bg-pink-500/5 border border-pink-500/10 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-pink-500/10 rounded-full flex items-center justify-center"><PhoneCall className="h-6 w-6 text-pink-600" /></div>
          <div>
            <p className="text-sm font-bold text-pink-900 dark:text-pink-100">₵{repayments.reduce((sum: number, r: any) => sum + (r.amountPaid || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} recovered</p>
            <p className="text-[11px] text-pink-600 font-black uppercase tracking-widest mt-0.5">{repayments.length} successful collections</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : !repayments || repayments.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-[2rem] border-2 border-dashed border-border/50">
          <p className="text-muted-foreground font-medium">No {title.toLowerCase()} found.</p>
        </div>
      ) : (
        <div className="space-y-8">
           <div className="hidden md:block bg-card rounded-[2rem] border border-border overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border bg-muted/30">
                  <TableHead className="pl-8 py-4">Beneficiary</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right pr-8">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repayments.map((rep: any) => (
                  <TableRow key={rep.repaymentId} className="hover:bg-muted/30 border-border group">
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-3">
                        <MoMoAvatar />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{rep.userName || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground font-mono">{rep.userMsisdn}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground/70">{rep.loanReference}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">{rep.paidAt ? format(new Date(rep.paidAt), "MMM d, h:mm a") : "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-tighter px-2", rep.collectionSource === 'collections' ? "bg-pink-500/10 text-pink-700 border-pink-200" : "bg-gray-100 text-gray-500 border-gray-200")}>
                        {rep.collectionSource === 'collections' ? (rep.assignedCsaName || 'CSA') : 'Organic'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-base font-bold text-emerald-600">₵{Number(rep.amountPaid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-1.5 py-0 h-4 border-none",
                          (rep.remainingBalance <= 0 || rep.type === 'FULL') ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"
                        )}>
                          {(rep.remainingBalance <= 0 || rep.type === 'FULL') ? 'Full' : 'Partial'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold opacity-60">₵{Number(rep.remainingBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span className="text-[9px] text-muted-foreground uppercase font-medium tracking-tighter">Remaining</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
           </div>
           <Button variant="outline" className="w-full rounded-2xl h-12" onClick={() => setLimit((l: number) => l + 10)} disabled={isFetchingMore}>{isFetchingMore ? "Loading..." : "Load More"}</Button>
        </div>
      )}
    </div>
  );
}

function CollectionLogsView() {
  const [page, setPage] = useState(1);
  const { data: logsRes, isLoading } = useQuery({
    queryKey: ["collection-activities", page],
    queryFn: () => getCollectionActivities({ page, limit: 15 }),
  });

  const logs = logsRes?.data || [];
  const total = logsRes?.pagination?.total || 0;

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted/20 rounded-xl border border-border" />
        ))}
      </div>
    );
  }

  const getOutcomeStyles = (outcome: string) => {
    const o = (outcome || '').toLowerCase();
    if (o.includes('promise')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (o.includes('paid') || o.includes('answered')) return 'bg-green-100 text-green-700 border-green-200';
    if (o.includes('number off') || o.includes('wrong number')) return 'bg-red-100 text-red-700 border-red-200';
    if (o.includes('other')) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between py-4 px-1">
        <h2 className="text-[22px] font-semibold text-foreground leading-tight">
          Collection logs
        </h2>
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Total: {total} items
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="pl-6">Borrower</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead className="pr-6">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length > 0 ? logs.map((log: any) => (
              <TableRow key={log._id} className="hover:bg-muted/30 border-border group align-top">
                <TableCell className="pl-6 py-5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-black text-gray-900 dark:text-gray-100">
                      {log.borrower?.name || log.userName || 'Unknown'}
                    </span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                      {format(new Date(log.createdAt), "MMM d, h:mm a")}
                    </span>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-1">
                      {log.borrower?.msisdn || log.userMsisdn}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                       <span className="text-[9px] font-mono font-bold bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-wider">
                         {log.loanReference}
                       </span>
                       <span className="text-[9px] font-bold text-pink-600/70 border-l border-pink-100 pl-1.5 flex items-center gap-1">
                         <PhoneCall size={10} /> {log.csaName || log.csaAgentName || 'Agent'}
                       </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-5">
                  <div className="flex flex-col items-start gap-1.5">
                    <Badge variant="outline" className={cn("text-[10px] font-black tracking-widest uppercase border border-none px-2 py-0.5", getOutcomeStyles(log.outcome || log.outcomeCode))}>
                      {log.outcomeLabel || log.outcome || 'Unknown'}
                    </Badge>
                    {log.callDuration && (
                      <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-tighter">
                        <Clock size={11} /> {log.callDuration}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="pr-6 py-5 max-w-[320px]">
                  {log.note || log.notes ? (
                    <div className="bg-gray-50/50 dark:bg-gray-800/30 border-l-2 border-pink-200 p-3 rounded-r-xl">
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic leading-relaxed">
                        "{log.note || log.notes}"
                      </p>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50 uppercase font-black tracking-widest italic opacity-50 px-1">No notes recorded</span>
                  )}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={3} className="h-40 text-center text-muted-foreground text-xs uppercase tracking-widest font-bold">
                  No collection logs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between px-1">
           <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
             Page {page} of {logsRes?.pagination?.pages || 1}
           </p>
           <div className="flex gap-2">
             <Button 
              variant="outline" 
              size="sm"
              className="h-8 text-[11px] font-bold uppercase tracking-widest border-border"
              onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo(0, 0); }}
              disabled={page === 1}
             >
               Previous
             </Button>
             <Button 
              variant="outline" 
              size="sm"
              className="h-8 text-[11px] font-bold uppercase tracking-widest border-border"
              onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
              disabled={page >= (logsRes?.pagination?.pages || 1)}
             >
               Next
             </Button>
           </div>
        </div>
      )}
    </div>
  );
}
