import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getAdminPayoutRequests, 
  approveAdminPayoutRequest, 
  rejectAdminPayoutRequest, 
  markAdminPayoutPaid 
} from "@/lib/api";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Loader2,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminPayoutsPage() {
  const { toast } = useToast();
  const { canWrite } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("REQUESTED");
  const [requesterType, setRequesterType] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");
  const [markPaidReason, setMarkPaidReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["adminPayouts", status, requesterType, source, page],
    queryFn: async () => {
      const params: any = { status, page, limit: 20 };
      if (requesterType !== "all") params.requesterType = requesterType;
      if (source !== "all") params.source = source;
      const res = await getAdminPayoutRequests(params);
      return res.data;
    }
  });

  const { items: payouts = [], pagination = { total: 0, pages: 1 } } = data || {};

  // Calculate local stats based on the data if available, 
  // or show summary if we had a dedicated endpoint. 
  // For now, let's show filtered summary
  const totalAmount = payouts.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  const approveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => approveAdminPayoutRequest(id, reason),
    onSuccess: () => {
      toast({ title: "Approved", description: "Payout request approved." });
      queryClient.invalidateQueries({ queryKey: ["adminPayouts"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Approval Failed", description: getFriendlyErrorMessage(error) });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectAdminPayoutRequest(id, reason),
    onSuccess: () => {
      toast({ title: "Rejected", description: "Payout request rejected." });
      queryClient.invalidateQueries({ queryKey: ["adminPayouts"] });
    },
    onError: (error: any) => {
       toast({ variant: "destructive", title: "Rejection Failed", description: getFriendlyErrorMessage(error) });
    }
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, reason, ref }: { id: string; reason: string; ref?: string }) => markAdminPayoutPaid(id, ref),
    onSuccess: () => {
      toast({ title: "Paid", description: "Payment confirmed — agent balance updated" });
      queryClient.invalidateQueries({ queryKey: ["adminPayouts"] });
      setIsMarkPaidModalOpen(false);
      setSelectedPayout(null);
      setPaymentRef("");
      setMarkPaidReason("");
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Action Failed", description: getFriendlyErrorMessage(error) });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "REQUESTED": return <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">Requested</Badge>;
      case "APPROVED": return <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300">Approved</Badge>;
      case "PAID": return <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300">Paid</Badge>;
      case "REJECTED": return <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-1 sm:px-0">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">Agent Withdrawals</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-lg">Approve and track node rewards and agent commissions.</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex-1 rounded-2xl border border-border/60 bg-card px-4 py-2 text-center shadow-sm sm:flex-none sm:text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">In this view</p>
                <p className="text-lg sm:text-xl font-black text-foreground">GHS {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
             </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
           {[
             { label: "Pending", count: payouts.filter((p:any)=>p.status === 'REQUESTED').length, icon: Clock, color: "text-amber-600 dark:text-amber-300", bg: "bg-amber-500/10" },
             { label: "Approved", count: payouts.filter((p:any)=>p.status === 'APPROVED').length, icon: CheckCircle2, color: "text-blue-600 dark:text-blue-300", bg: "bg-blue-500/10" },
             { label: "Paid", count: payouts.filter((p:any)=>p.status === 'PAID').length, icon: DollarSign, color: "text-emerald-600 dark:text-emerald-300", bg: "bg-emerald-500/10" },
             { label: "Total", count: pagination.total || payouts.length, icon: Filter, color: "text-muted-foreground", bg: "bg-muted/50" },
           ].map((stat, i) => (
             <Card key={i} className="overflow-hidden border border-border/60 bg-card shadow-sm transition-all group hover:shadow-md">
                <CardContent className="p-4 sm:p-6 relative">
                   <div className={cn("w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                      <stat.icon className="w-4 h-4 sm:w-6 sm:h-6" />
                   </div>
                   <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                   <p className="mt-0.5 text-xl font-black text-foreground sm:mt-1 sm:text-3xl">{stat.count}</p>
                </CardContent>
             </Card>
           ))}
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col items-stretch gap-3 rounded-[20px] border border-border/60 bg-muted/30 p-3 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:gap-4 lg:gap-6 lg:p-6 sm:rounded-[28px]">
          <div className="space-y-1.5 flex-1">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 rounded-xl border border-border/50 bg-background/80 text-xs font-bold shadow-none sm:h-12 sm:text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                <SelectItem value="REQUESTED">Requested</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 flex-1">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Requester</label>
            <Select value={requesterType} onValueChange={setRequesterType}>
              <SelectTrigger className="h-10 rounded-xl border border-border/50 bg-background/80 text-xs font-bold shadow-none sm:h-12 sm:text-sm">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="USER">User (Node)</SelectItem>
                <SelectItem value="AGENT">Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 flex-1">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Source</label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-10 rounded-xl border border-border/50 bg-background/80 text-xs font-bold shadow-none sm:h-12 sm:text-sm">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="REWARD">Reward</SelectItem>
                <SelectItem value="COMMISSION">Commission</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-border/60 bg-card shadow-xl backdrop-blur-xl sm:rounded-[32px]">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30 text-[10px] uppercase font-black tracking-widest">
                <TableRow>
                  <TableHead className="pl-8 h-12">Date</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px] pr-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center bg-muted/10">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Hydrating queue...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : payouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center bg-muted/10">
                      <div className="flex flex-col items-center gap-3">
                        <Filter className="h-8 w-8 text-muted-foreground/40" />
                        <p className="font-bold uppercase tracking-widest text-foreground">Empty Queue</p>
                        <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  payouts.map((payout: any) => (
                    <TableRow key={payout._id || payout.id} className="group border-b border-border/40 transition-colors hover:bg-muted/30">
                      <TableCell className="py-6 pl-8 font-medium text-muted-foreground">
                        {format(new Date(payout.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-xs font-black text-muted-foreground">
                            {payout.requesterName?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-black text-foreground">{payout.requesterName}</div>
                            <div className="text-[10px] text-muted-foreground font-black tracking-widest uppercase">{payout.requesterMsisdn}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "capitalize border-none px-3 py-1 font-bold text-[10px] tracking-wider",
                          payout.requesterType === 'AGENT' ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" : "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                        )}>
                          {payout.requesterType.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize border-none bg-muted/50 text-muted-foreground font-bold text-[10px] tracking-wider">
                          {payout.source.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-base font-black text-foreground">
                        GHS {payout.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
                      <TableCell className="pr-8 text-right">
                         <PayoutActions 
                            payout={payout} 
                            onApprove={({ id, reason }: any) => approveMutation.mutate({ id, reason })} 
                            onReject={({ id, reason }: any) => rejectMutation.mutate({ id, reason })}
                            onMarkPaidClick={() => {
                              setSelectedPayout(payout);
                              setIsMarkPaidModalOpen(true);
                            }}
                           isViewer={!canWrite}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="block divide-y divide-border/30 md:hidden">
            {isLoading ? (
               <div className="p-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hydrating...</p>
               </div>
            ) : payouts.length === 0 ? (
               <div className="p-12 text-center">
                  <Filter className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-bold uppercase tracking-widest text-foreground">Empty Queue</p>
               </div>
            ) : (
               payouts.map((payout: any) => (
                  <div key={payout._id || payout.id} className="space-y-4 p-5 transition-colors hover:bg-muted/20">
                     <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                           <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 text-xs font-black text-muted-foreground">
                              {payout.requesterName?.substring(0, 2).toUpperCase()}
                           </div>
                           <div>
                              <div className="text-sm font-bold text-foreground">{payout.requesterName}</div>
                              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{format(new Date(payout.createdAt), "MMM d, yyyy")}</div>
                           </div>
                        </div>
                         <PayoutActions 
                            payout={payout} 
                            onApprove={({ id, reason }: any) => approveMutation.mutate({ id, reason })} 
                            onReject={({ id, reason }: any) => rejectMutation.mutate({ id, reason })}
                            onMarkPaidClick={() => {
                              setSelectedPayout(payout);
                              setIsMarkPaidModalOpen(true);
                            }}
                            isViewer={!canWrite}
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border/40 bg-muted/20 p-3">
                        <div className="space-y-0.5">
                           <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Amount</p>
                           <p className="text-sm font-black text-foreground">GHS {payout.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="space-y-0.5">
                           <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Status</p>
                           <div>{getStatusBadge(payout.status)}</div>
                        </div>
                        <div className="space-y-0.5">
                           <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Details</p>
                           <div className="flex flex-wrap gap-1">
                              <Badge className="h-4 border-none bg-indigo-500/10 px-1 text-[8px] leading-none font-black tracking-tighter text-indigo-700 dark:text-indigo-300">{payout.source}</Badge>
                              <Badge className="h-4 border-none bg-sky-500/10 px-1 text-[8px] leading-none font-black tracking-tighter text-sky-700 dark:text-sky-300">{payout.requesterType}</Badge>
                           </div>
                        </div>
                        <div className="space-y-0.5">
                           <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Contact</p>
                           <p className="text-[10px] font-black text-foreground">{payout.requesterMsisdn}</p>
                        </div>
                     </div>
                  </div>
               ))
            )}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex flex-col items-center justify-between gap-4 border-t border-border/40 bg-muted/10 px-4 py-6 sm:flex-row sm:px-8">
              <div className="order-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:order-1">
                Page {page} of {pagination.pages}
              </div>
              <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 1} 
                  onClick={() => setPage(p => p - 1)}
                  className="flex-1 sm:flex-none h-10 rounded-xl font-bold text-xs"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === pagination.pages} 
                  onClick={() => setPage(p => p + 1)}
                  className="flex-1 sm:flex-none h-10 rounded-xl font-bold text-xs"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mark as Paid Confirmation Modal */}
      <Dialog open={isMarkPaidModalOpen} onOpenChange={setIsMarkPaidModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Confirm Payment</DialogTitle>
            <DialogDescription>
              Verify the payout details before marking as paid.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayout && (
            <div className="space-y-6 py-4">
              <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-muted-foreground">Agent</span>
                  <span className="font-bold text-foreground">{selectedPayout.requesterName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-muted-foreground">MSISDN</span>
                  <span className="font-bold text-foreground">{selectedPayout.requesterMsisdn}</span>
                </div>
                <div className="flex justify-between items-center border-t border-border/40 pt-2 text-sm">
                  <span className="font-medium text-muted-foreground">Amount</span>
                  <span className="text-lg font-black text-[#EC1B84]">GHS {selectedPayout.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
                <p className="text-xs font-medium leading-relaxed text-amber-700 dark:text-amber-300">
                  Warning: This will deduct <span className="font-bold text-amber-800 dark:text-amber-200">GHS {selectedPayout.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> from the agent's available commission balance.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reason" className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reason/Notes (Required)</Label>
                  <Input 
                    id="reason"
                    placeholder="e.g. Bank transfer completed" 
                    value={markPaidReason}
                    onChange={(e) => setMarkPaidReason(e.target.value)}
                    className="h-12 rounded-xl border-border/60 bg-background focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ref" className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Payment Reference (Optional)</Label>
                  <Input 
                    id="ref"
                    placeholder="e.g. TXN-123456" 
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="h-12 rounded-xl border-border/60 bg-background focus-visible:ring-primary/20"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsMarkPaidModalOpen(false)} className="h-12 rounded-xl font-bold flex-1">
              Cancel
            </Button>
            <Button 
              onClick={() => markPaidMutation.mutate({ id: selectedPayout._id || selectedPayout.id, reason: markPaidReason, ref: paymentRef })}
              disabled={!markPaidReason.trim() || markPaidMutation.isPending}
              className="h-12 rounded-xl font-black bg-[#EC1B84] hover:bg-[#D01773] text-white flex-1"
            >
              {markPaidMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function PayoutActions({ payout, onApprove, onReject, onMarkPaidClick, isViewer }: any) {
  if (isViewer) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 w-10 shrink-0 rounded-xl hover:bg-muted/60">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 min-w-[200px]">
        <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Queue Actions</DropdownMenuLabel>
        {payout.status === "REQUESTED" && (
          <>
            <DropdownMenuItem 
              className="rounded-xl px-4 py-3 font-bold focus:bg-emerald-500/10 focus:text-emerald-700 dark:focus:text-emerald-300" 
              onClick={() => {
                const reason = prompt("Describe the reason for approval (required):");
                if (reason?.trim()) onApprove({ id: payout._id || payout.id, reason });
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve Request
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="rounded-xl px-4 py-3 font-bold text-red-600 focus:bg-red-500/10 focus:text-red-700 dark:text-red-300 dark:focus:text-red-300"
              onClick={() => {
                const reason = prompt("Reason for rejection:");
                if (reason?.trim()) onReject({ id: payout._id || payout.id, reason });
              }}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject Request
            </DropdownMenuItem>
          </>
        )}
        {payout.status === "APPROVED" && (
          <DropdownMenuItem 
            className="rounded-xl font-bold py-3 px-4 focus:bg-[#EC1B84] focus:text-white" 
            onClick={() => onMarkPaidClick()}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Mark as Paid
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="my-1 bg-border/50" />
        <DropdownMenuItem className="rounded-xl font-bold py-3 px-4">View Profile</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
