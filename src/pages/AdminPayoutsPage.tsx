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

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";

export default function AdminPayoutsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("REQUESTED");
  const [requesterType, setRequesterType] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [page, setPage] = useState(1);

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
    mutationFn: (id: string) => approveAdminPayoutRequest(id),
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
    mutationFn: ({ id, ref }: { id: string; ref?: string }) => markAdminPayoutPaid(id, ref),
    onSuccess: () => {
      toast({ title: "Paid", description: "Payout marked as paid." });
      queryClient.invalidateQueries({ queryKey: ["adminPayouts"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Action Failed", description: getFriendlyErrorMessage(error) });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "REQUESTED": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Requested</Badge>;
      case "APPROVED": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Approved</Badge>;
      case "PAID": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold">Paid</Badge>;
      case "REJECTED": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-1 sm:px-0">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">Payout Management</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-lg">Approve and track node rewards and agent commissions.</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-white/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/40 shadow-sm flex-1 sm:flex-none text-center sm:text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">In this view</p>
                <p className="text-lg sm:text-xl font-black text-gray-900">GHS {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
             </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
           {[
             { label: "Pending", count: payouts.filter((p:any)=>p.status === 'REQUESTED').length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
             { label: "Approved", count: payouts.filter((p:any)=>p.status === 'APPROVED').length, icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-50" },
             { label: "Paid", count: payouts.filter((p:any)=>p.status === 'PAID').length, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
             { label: "Total", count: pagination.total || payouts.length, icon: Filter, color: "text-gray-600", bg: "bg-gray-50" },
           ].map((stat, i) => (
             <Card key={i} className="border-none shadow-sm bg-white/40 backdrop-blur-xl border border-white/40 hover:shadow-md transition-all group overflow-hidden">
                <CardContent className="p-4 sm:p-6 relative">
                   <div className={cn("w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                      <stat.icon className="w-4 h-4 sm:w-6 sm:h-6" />
                   </div>
                   <p className="text-[9px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                   <p className="text-xl sm:text-3xl font-black text-gray-900 mt-0.5 sm:mt-1">{stat.count}</p>
                </CardContent>
             </Card>
           ))}
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6 bg-white/40 backdrop-blur-md p-4 sm:p-6 rounded-[24px] sm:rounded-[28px] border border-white/40 shadow-sm">
          <div className="space-y-1.5 flex-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 sm:h-12 border-none bg-white/80 shadow-none rounded-xl font-bold text-xs sm:text-sm">
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
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Requester</label>
            <Select value={requesterType} onValueChange={setRequesterType}>
              <SelectTrigger className="h-10 sm:h-12 border-none bg-white/80 shadow-none rounded-xl font-bold text-xs sm:text-sm">
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
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Source</label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-10 sm:h-12 border-none bg-white/80 shadow-none rounded-xl font-bold text-xs sm:text-sm">
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

        <div className="bg-white/40 backdrop-blur-xl rounded-[24px] sm:rounded-[32px] border border-white/40 shadow-xl overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50 text-[10px] uppercase font-black tracking-widest">
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
                    <TableCell colSpan={7} className="h-64 text-center bg-white/20">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Hydrating queue...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : payouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center bg-white/20">
                      <div className="flex flex-col items-center gap-3">
                        <Filter className="h-8 w-8 text-gray-200" />
                        <p className="font-bold text-gray-900 uppercase tracking-widest">Empty Queue</p>
                        <p className="text-xs text-gray-400">Try adjusting your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  payouts.map((payout: any) => (
                    <TableRow key={payout._id || payout.id} className="group border-b border-white/10 hover:bg-white/60 transition-colors">
                      <TableCell className="font-medium text-gray-500 py-6 pl-8">
                        {format(new Date(payout.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 font-black text-gray-400 text-xs">
                            {payout.requesterName?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-black text-gray-900">{payout.requesterName}</div>
                            <div className="text-[10px] text-muted-foreground font-black tracking-widest uppercase">{payout.requesterMsisdn}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "capitalize border-none px-3 py-1 font-bold text-[10px] tracking-wider",
                          payout.requesterType === 'AGENT' ? "bg-indigo-50 text-indigo-700" : "bg-sky-50 text-sky-700"
                        )}>
                          {payout.requesterType.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize border-none bg-gray-50 text-gray-500 font-bold text-[10px] tracking-wider">
                          {payout.source.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-gray-900 text-base">
                        GHS {payout.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
                      <TableCell className="pr-8 text-right">
                        <PayoutActions 
                           payout={payout} 
                           onApprove={approveMutation.mutate} 
                           onReject={({ id, reason }) => rejectMutation.mutate({ id, reason })}
                           onMarkPaid={markPaidMutation.mutate}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-white/10">
            {isLoading ? (
               <div className="p-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hydrating...</p>
               </div>
            ) : payouts.length === 0 ? (
               <div className="p-12 text-center">
                  <Filter className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-900 uppercase tracking-widest">Empty Queue</p>
               </div>
            ) : (
               payouts.map((payout: any) => (
                  <div key={payout._id || payout.id} className="p-5 space-y-4 hover:bg-white/40 transition-colors">
                     <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-black text-gray-400 text-xs">
                              {payout.requesterName?.substring(0, 2).toUpperCase()}
                           </div>
                           <div>
                              <div className="font-bold text-gray-900 text-sm">{payout.requesterName}</div>
                              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{format(new Date(payout.createdAt), "MMM d, yyyy")}</div>
                           </div>
                        </div>
                        <PayoutActions 
                           payout={payout} 
                           onApprove={approveMutation.mutate} 
                           onReject={({ id, reason }) => rejectMutation.mutate({ id, reason })}
                           onMarkPaid={markPaidMutation.mutate}
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-4 bg-white/20 p-3 rounded-2xl border border-white/20">
                        <div className="space-y-0.5">
                           <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Amount</p>
                           <p className="font-black text-gray-900 text-sm">GHS {payout.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="space-y-0.5">
                           <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status</p>
                           <div>{getStatusBadge(payout.status)}</div>
                        </div>
                        <div className="space-y-0.5">
                           <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Details</p>
                           <div className="flex flex-wrap gap-1">
                              <Badge className="text-[8px] h-4 px-1 leading-none font-black tracking-tighter bg-indigo-50 text-indigo-700 border-none">{payout.source}</Badge>
                              <Badge className="text-[8px] h-4 px-1 leading-none font-black tracking-tighter bg-sky-50 text-sky-700 border-none">{payout.requesterType}</Badge>
                           </div>
                        </div>
                        <div className="space-y-0.5">
                           <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Contact</p>
                           <p className="text-[10px] font-black text-gray-700">{payout.requesterMsisdn}</p>
                        </div>
                     </div>
                  </div>
               ))
            )}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-8 py-6 bg-white/20 border-t border-white/20">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest order-2 sm:order-1">
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
    </DashboardLayout>
  );
}

function PayoutActions({ payout, onApprove, onReject, onMarkPaid }: any) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-white/80 shrink-0">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 min-w-[200px]">
        <DropdownMenuLabel className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-3 py-2">Queue Actions</DropdownMenuLabel>
        {payout.status === "REQUESTED" && (
          <>
            <DropdownMenuItem className="rounded-xl font-bold py-3 px-4 focus:bg-emerald-50 focus:text-emerald-700" onClick={() => onApprove(payout._id || payout.id)}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve Request
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="rounded-xl font-bold py-3 px-4 focus:bg-red-50 text-red-600 focus:text-red-700"
              onClick={() => {
                const reason = prompt("Reason for rejection:");
                if (reason) onReject({ id: payout._id || payout.id, reason });
              }}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject Request
            </DropdownMenuItem>
          </>
        )}
        {payout.status === "APPROVED" && (
          <DropdownMenuItem className="rounded-xl font-bold py-3 px-4 focus:bg-[#EC1B84] focus:text-white" onClick={() => onMarkPaid({ id: payout._id || payout.id })}>
            <DollarSign className="w-4 h-4 mr-2" />
            Mark as Paid
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="my-1 bg-gray-50" />
        <DropdownMenuItem className="rounded-xl font-bold py-3 px-4">View Profile</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
