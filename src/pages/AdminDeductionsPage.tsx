import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getAdminDeductions, 
  confirmDeduction, 
  reverseDeduction,
  createManualDeduction,
  getAdminAuditLogs
} from "@/lib/api";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  User,
  ExternalLink
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";

export default function AdminDeductionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [msisdnFilter, setMsisdnFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isManualSheetOpen, setIsManualSheetOpen] = useState(false);
  const [selectedDeduction, setSelectedDeduction] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Manual deduction form state
  const [manualData, setManualData] = useState({
    agentMsisdn: "",
    amount: "",
    reason: "",
    loanReference: ""
  });

  const { data, isLoading } = useQuery({
    queryKey: ["adminDeductions", activeTab, page, msisdnFilter, typeFilter, statusFilter],
    queryFn: async () => {
      const params: any = { page, limit: 10 };
      if (activeTab === "pending") {
        params.status = "PENDING_CONFIRMATION";
      } else {
        if (typeFilter !== "all") {
          params.type = typeFilter;
          params.deductionType = typeFilter;
        }
        if (statusFilter !== "all") params.status = statusFilter;
      }
      if (msisdnFilter) params.msisdn = msisdnFilter;
      
      return getAdminDeductions(params);
    }
  });

  const deductions = data?.items || [];
  const pagination = data?.pagination || { total: 0, pages: 1 };

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmDeduction(id),
    onSuccess: () => {
      toast({ title: "Confirmed", description: "Deduction has been confirmed and balance updated." });
      queryClient.invalidateQueries({ queryKey: ["adminDeductions"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Confirmation Failed", description: getFriendlyErrorMessage(error) });
    }
  });

  const reverseMutation = useMutation({
    mutationFn: (id: string) => reverseDeduction(id),
    onSuccess: () => {
      toast({ title: "Reversed", description: "Deduction has been reversed." });
      queryClient.invalidateQueries({ queryKey: ["adminDeductions"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Reversal Failed", description: getFriendlyErrorMessage(error) });
    }
  });

  const manualMutation = useMutation({
    mutationFn: (data: any) => createManualDeduction(data),
    onSuccess: () => {
      toast({ title: "Created", description: "Manual deduction created — pending confirmation." });
      setIsManualSheetOpen(false);
      setManualData({ agentMsisdn: "", amount: "", reason: "", loanReference: "" });
      queryClient.invalidateQueries({ queryKey: ["adminDeductions"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Creation Failed", description: getFriendlyErrorMessage(error) });
    }
  });

  const downloadCSV = () => {
    if (!deductions || deductions.length === 0) return;
    
    const headers = ["Date", "Agent Name", "MSISDN", "Type", "Amount", "Status", "Reason", "Loan Ref"];
    const rows = deductions.map((d: any) => [
      format(new Date(d.createdAt), "yyyy-MM-dd HH:mm"),
      d.agentName || "Unknown",
      d.agentMsisdn,
      d.deductionType,
      d.amount,
      d.status,
      `"${d.reason?.replace(/"/g, '""') || ""}"`,
      d.linkedLoanReference || d.loanReference || ""
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `deductions_export_${format(new Date(), "yyyyMMdd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-4 sm:px-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">Agent Deductions</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-lg">Manage agent penalties, fraud revocations, and manual corrections.</p>
          </div>
          <Sheet open={isManualSheetOpen} onOpenChange={setIsManualSheetOpen}>
            <SheetTrigger asChild>
              <Button className="bg-[#EC1B84] hover:bg-[#D01773] text-white rounded-xl h-12 px-6 font-black gap-2 shadow-lg shadow-pink-200/50">
                <Plus className="w-5 h-5" />
                Manual Deduction
              </Button>
            </SheetTrigger>
            <Button 
              variant="outline"
              onClick={downloadCSV}
              disabled={deductions.length === 0}
              className="h-12 rounded-xl border-border/60 px-6 font-black gap-2 hover:bg-muted/40"
            >
              <ExternalLink className="w-4 h-4" />
              Export CSV
            </Button>
            <SheetContent className="sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="text-2xl font-black">Manual Deduction</SheetTitle>
                <SheetDescription>
                  Create a manual correction for an agent's balance. This will remain pending until confirmed.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 py-8">
                <div className="space-y-2">
                  <Label htmlFor="agent-msisdn" className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Agent MSISDN</Label>
                  <Input 
                    id="agent-msisdn" 
                    placeholder="233XXXXXXXXX" 
                    value={manualData.agentMsisdn}
                    onChange={(e) => setManualData({ ...manualData, agentMsisdn: e.target.value })}
                    className="h-12 rounded-xl border-border/60 bg-background focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount (GHS)</Label>
                  <Input 
                    id="amount" 
                    type="number"
                    placeholder="0.00" 
                    value={manualData.amount}
                    onChange={(e) => setManualData({ ...manualData, amount: e.target.value })}
                    className="h-12 rounded-xl border-border/60 bg-background focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loan-ref" className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loan Reference (Optional)</Label>
                  <Input 
                    id="loan-ref" 
                    placeholder="LOAN-12345" 
                    value={manualData.loanReference}
                    onChange={(e) => setManualData({ ...manualData, loanReference: e.target.value })}
                    className="h-12 rounded-xl border-border/60 bg-background focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason" className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reason (Required)</Label>
                  <Textarea 
                    id="reason" 
                    placeholder="Describe why this deduction is being made..." 
                    value={manualData.reason}
                    onChange={(e) => setManualData({ ...manualData, reason: e.target.value })}
                    className="min-h-[120px] resize-none rounded-xl border-border/60 bg-background focus-visible:ring-primary/20"
                  />
                </div>
              </div>
              <SheetFooter>
                <Button 
                  className="w-full h-14 bg-[#EC1B84] hover:bg-[#D01773] text-white font-black text-lg rounded-2xl"
                  disabled={!manualData.agentMsisdn || !manualData.amount || !manualData.reason || manualMutation.isPending}
                  onClick={() => manualMutation.mutate({
                    agentMsisdn: manualData.agentMsisdn,
                    amount: parseFloat(manualData.amount),
                    reason: manualData.reason,
                    linkedLoanReference: manualData.loanReference,
                    type: "MANUAL_CORRECTION"
                  })}
                >
                  {manualMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Create Deduction
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          {selectedDeduction && (
            <DeductionDetailDrawer 
              item={selectedDeduction} 
              open={isDetailOpen} 
              onOpenChange={setIsDetailOpen} 
            />
          )}
          <TabsList className="h-14 rounded-2xl border border-border/60 bg-muted/30 p-1.5 backdrop-blur-md">
            <TabsTrigger value="pending" className="h-full rounded-xl px-8 text-xs font-black uppercase tracking-widest transition-all active:scale-95 data-[state=active]:bg-background data-[state=active]:shadow-lg">
              Pending Confirmation
              {activeTab === "pending" && deductions.length > 0 && (
                <span className="ml-2 bg-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{deductions.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="h-full rounded-xl px-8 text-xs font-black uppercase tracking-widest transition-all active:scale-95 data-[state=active]:bg-background data-[state=active]:shadow-lg">
              All Deductions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
             {isLoading ? (
               <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-border/60 bg-card">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Loading pending queue...</p>
               </div>
             ) : deductions.length === 0 ? (
               <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-border/60 bg-card">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  <p className="font-black uppercase tracking-widest text-foreground">Queue Clear</p>
                  <p className="text-sm text-muted-foreground">No deductions awaiting confirmation.</p>
               </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {deductions.map((item: any) => (
                      <DeductionActionCard 
                         key={item._id} 
                         item={item}
                         onConfirm={() => confirmMutation.mutate(item._id)}
                         onReverse={() => reverseMutation.mutate(item._id)}
                         onSelect={(d: any) => {
                           setSelectedDeduction(d);
                           setIsDetailOpen(true);
                         }}
                         isPending={confirmMutation.isPending || reverseMutation.isPending}
                      />
                   ))}
                </div>
             )}
          </TabsContent>

          <TabsContent value="all" className="space-y-6">
            <div className="flex flex-col items-stretch gap-4 rounded-[28px] border border-border/60 bg-muted/30 p-4 shadow-sm backdrop-blur-md sm:flex-row sm:items-center">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Filter by Agent MSISDN..." 
                    className="h-12 rounded-xl border border-border/50 bg-background/80 pl-10 font-medium shadow-none"
                    value={msisdnFilter}
                    onChange={(e) => setMsisdnFilter(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-12 rounded-xl border border-border/50 bg-background/80 font-bold shadow-none">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="DEFAULT_PENALTY">Default Penalty</SelectItem>
                      <SelectItem value="FRAUD_REVOCATION">Fraud Revocation</SelectItem>
                      <SelectItem value="MANUAL_CORRECTION">Manual Correction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-12 rounded-xl border border-border/50 bg-background/80 font-bold shadow-none">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="PENDING_CONFIRMATION">Pending</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="REVERSED">Reversed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </div>

            <div className="overflow-hidden rounded-[32px] border border-border/60 bg-card shadow-xl backdrop-blur-xl">
               <Table>
                  <TableHeader className="h-12 bg-muted/30 text-[10px] uppercase font-black tracking-widest">
                     <TableRow>
                        <TableHead className="pl-8">Date</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="pr-8 text-right">Actions</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {isLoading ? (
                        <TableRow>
                           <TableCell colSpan={6} className="h-64 text-center">
                              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                           </TableCell>
                        </TableRow>
                     ) : deductions.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={6} className="h-64 text-center">
                               <p className="font-bold text-muted-foreground">No deductions found</p>
                            </TableCell>
                         </TableRow>
                      ) : (
                         deductions.map((item: any) => (
                           <DeductionRow 
                            key={item._id} 
                            item={item} 
                            onSelect={(d: any) => {
                              setSelectedDeduction(d);
                              setIsDetailOpen(true);
                            }}
                           />
                         ))
                      )}
                   </TableBody>
                </Table>

                {pagination?.pages > 1 && (
                 <div className="flex items-center justify-between border-t border-border/40 bg-muted/10 px-8 py-6">
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Page {page} of {pagination.pages}</span>
                   <div className="flex gap-2">
                     <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-xl h-10 px-4 font-bold">Previous</Button>
                     <Button variant="outline" size="sm" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)} className="rounded-xl h-10 px-4 font-bold">Next</Button>
                   </div>
                 </div>
                )}
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function DeductionActionCard({ item, onConfirm, onReverse, onSelect, isPending }: any) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isReverseOpen, setIsReverseOpen] = useState(false);

  return (
    <Card 
      className="group cursor-pointer rounded-3xl border border-border/60 bg-card shadow-sm transition-all backdrop-blur-md hover:shadow-md"
      onClick={() => onSelect(item)}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4 text-xs">
          <Badge className="border-none bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 hover:bg-amber-500/10 dark:text-amber-300">
             {item.deductionType?.replace('_', ' ') || item.type?.replace('_', ' ')}
          </Badge>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {format(new Date(item.createdAt), "MMM d, HH:mm")}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <User className="h-3.5 w-3.5 text-muted-foreground" />
               <span className="font-black text-foreground">{item.agentName || "Unknown Agent"}</span>
            </div>
            <p className="pl-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.agentMsisdn}</p>
          </div>

          <div className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-border/50 bg-muted/10 p-4 shadow-sm">
             <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
             <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Deduction Amount</p>
                <p className="text-xl font-black text-red-600">-GHS {item.amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
             </div>
             {(item.linkedLoanReference || item.loanReference) && (
               <div className="text-right">
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Ref</p>
                  <p className="text-[10px] font-bold text-foreground">{item.linkedLoanReference || item.loanReference}</p>
               </div>
             )}
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
             <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Reason</p>
             <p className="line-clamp-2 text-xs font-medium italic leading-relaxed text-foreground">"{item.reason || "No reason provided"}"</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="h-12 flex-1 rounded-xl border-border/60 font-bold text-muted-foreground transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300"
              onClick={(e) => {
                e.stopPropagation();
                setIsReverseOpen(true);
              }}
              disabled={isPending}
            >
              Reverse
            </Button>
            <Button 
              className="flex-1 rounded-xl h-12 font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100"
              onClick={(e) => {
                e.stopPropagation();
                setIsConfirmOpen(true);
              }}
              disabled={isPending}
            >
              Confirm
            </Button>
          </div>
        </div>

        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
           <DialogContent className="rounded-2xl" onClick={(e) => e.stopPropagation()}>
              <DialogHeader>
                 <DialogTitle className="text-xl font-black">Confirm Deduction</DialogTitle>
                 <DialogDescription>
                    This will permanently debit the agent's commission balance by <span className="font-bold text-red-600">GHS {item.amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>.
                 </DialogDescription>
              </DialogHeader>
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl space-y-2">
                 <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-emerald-700">Current Balance</span>
                    <span className="text-emerald-900">GHS {item.balanceBeforeDeduction?.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm font-black border-t border-emerald-200 pt-2">
                    <span className="text-emerald-800">Balance After</span>
                    <span className="text-emerald-900">GHS {((item.balanceBeforeDeduction || 0) - item.amount).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                 </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0 mt-4">
                 <Button variant="outline" onClick={() => setIsConfirmOpen(false)} className="h-12 rounded-xl font-bold flex-1">Cancel</Button>
                 <Button 
                    className="h-12 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                    onClick={() => {
                       onConfirm();
                       setIsConfirmOpen(false);
                    }}
                 >
                    Apply Deduction
                 </Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>

        <Dialog open={isReverseOpen} onOpenChange={setIsReverseOpen}>
           <DialogContent className="rounded-2xl" onClick={(e) => e.stopPropagation()}>
              <DialogHeader>
                 <DialogTitle className="text-xl font-black">Reverse Deduction</DialogTitle>
                 <DialogDescription>
                    Are you sure you want to cancel this pending deduction? No balance changes will be applied.
                 </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0 mt-4">
                 <Button variant="outline" onClick={() => setIsReverseOpen(false)} className="h-12 rounded-xl font-bold flex-1">Keep Pending</Button>
                 <Button 
                    variant="destructive" 
                    className="h-12 rounded-xl font-black flex-1"
                    onClick={() => {
                       onReverse();
                       setIsReverseOpen(false);
                    }}
                 >
                    Reverse Deduction
                 </Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function DeductionRow({ item, onSelect }: any) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case "DEFAULT_PENALTY": return "bg-red-500/10 text-red-700 dark:text-red-300";
      case "FRAUD_REVOCATION": return "bg-red-800 text-white";
      case "MANUAL_CORRECTION": return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_CONFIRMATION": return <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 uppercase text-[9px] font-black text-amber-700 dark:text-amber-300">Pending</Badge>;
      case "CONFIRMED": return <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 uppercase text-[9px] font-black text-emerald-700 dark:text-emerald-300">Confirmed</Badge>;
      case "REVERSED": return <Badge variant="outline" className="border-border bg-muted uppercase text-[9px] font-black text-muted-foreground">Reversed</Badge>;
      default: return <Badge variant="outline" className="text-[9px] font-black">{status}</Badge>;
    }
  };

  return (
      <TableRow className="group cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/30" onClick={() => onSelect(item)}>
        <TableCell className="pl-8 font-medium text-muted-foreground">
           {format(new Date(item.createdAt), "MMM d, yyyy")}
        </TableCell>
        <TableCell>
           <div className="font-black text-foreground">{item.agentName || "Unknown"}</div>
           <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.agentMsisdn}</div>
        </TableCell>
        <TableCell>
           <Badge className={cn("border-none px-2 py-0.5 font-bold text-[9px] tracking-tight", getTypeColor(item.deductionType || item.type))}>
              {(item.deductionType || item.type || "").replace('_', ' ')}
           </Badge>
        </TableCell>
        <TableCell className="font-black text-red-600">
           -GHS {item.amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </TableCell>
        <TableCell>{getStatusBadge(item.status)}</TableCell>
        <TableCell className="pr-8 text-right">
           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
              <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
           </Button>
        </TableCell>
      </TableRow>
  );
}

function DeductionDetailDrawer({ item, open, onOpenChange }: any) {
  const { data: audits, isLoading } = useQuery({
    queryKey: ["auditLogs", item?.agentMsisdn],
    queryFn: () => getAdminAuditLogs({ 
      targetId: item.agentMsisdn, 
      targetType: 'api', 
      limit: 10 
    }),
    enabled: !!item && open
  });

  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-8">
          <Badge className="mb-2 w-fit border-none bg-pink-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-pink-700 hover:bg-pink-500/10 dark:text-pink-300">
             {((item.deductionType || item.type || "DEDUCTION") as string)?.replace('_', ' ')}
          </Badge>
          <SheetTitle className="flex items-center gap-2 text-3xl font-black text-foreground">
            Deduction Details
          </SheetTitle>
          <SheetDescription className="font-bold tracking-tight text-muted-foreground">
            Comprehensive audit view for ID: {item._id}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8 pb-12">
           {/* Summary Section */}
           <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                 <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Agent Name</p>
                 <p className="font-black text-foreground">{item.agentName || "Unknown Agent"}</p>
                 <p className="mt-0.5 text-xs font-bold text-muted-foreground">{item.agentMsisdn}</p>
              </div>
              <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100">
                 <p className="text-[10px] font-black uppercase text-red-400 tracking-widest mb-1">Amount</p>
                 <p className="text-xl font-black text-red-600">-GHS {item.amount?.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                 <p className="text-xs font-bold text-red-400 mt-1 uppercase tracking-tighter">{item.status}</p>
              </div>
           </div>

           {/* Reason Card */}
           <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-muted/20 p-6">
              <div className="absolute bottom-0 left-0 top-0 w-1.5 bg-border" />
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detailed Reason</p>
              <p className="text-sm font-medium italic leading-relaxed text-foreground">
                 "{item.reason || "No reason provided."}"
              </p>
           </div>

           {/* Financial Context */}
           <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                 <Info className="w-3.5 h-3.5" />
                 Financial Impact
              </h3>
              <div className="divide-y divide-border/40 rounded-2xl border border-border/50 bg-card shadow-sm">
                 <div className="p-4 flex justify-between items-center text-sm">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Balance Before</span>
                    <span className="font-black text-foreground">GHS {item.balanceBeforeDeduction?.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}</span>
                 </div>
                 <div className="p-4 flex justify-between items-center text-sm">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Balance After</span>
                    <span className="font-black text-emerald-600">GHS {item.balanceAfterDeduction?.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}</span>
                 </div>
                 {(item.linkedLoanReference || item.loanReference) && (
                   <div className="p-4 flex justify-between items-center text-sm">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Loan Reference</span>
                      <span className="font-black text-pink-600 underline cursor-pointer">{item.linkedLoanReference || item.loanReference}</span>
                   </div>
                 )}
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                 <Clock className="w-3.5 h-3.5" />
                 Audit Trail
              </h3>
              <div className="space-y-3">
                 {isLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" /></div>
                 ) : audits?.data?.length === 0 ? (
                    <p className="py-4 text-center text-xs italic text-muted-foreground">No specific audit entries found for this ID.</p>
                 ) : (
                    audits?.data?.map((log: any) => (
                       <div key={log._id} className="group flex gap-4 rounded-2xl border border-border/40 bg-muted/10 p-4 transition-colors hover:bg-muted/20">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border/40 bg-card shadow-sm">
                             <Badge variant="outline" className="flex h-6 w-6 items-center justify-center rounded-md p-0 text-[8px] font-black uppercase text-muted-foreground">{log.action?.[0]}</Badge>
                          </div>
                          <div className="flex-1">
                             <div className="flex justify-between items-start">
                                 <p className="text-xs font-black text-foreground">{log.action}</p>
                                 <p className="text-[10px] font-bold tracking-tighter text-muted-foreground">{format(new Date(log.createdAt), "MMM d, HH:mm")}</p>
                             </div>
                             <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{log.resource} • {log.ipAddress || "Internal"}</p>
                             <p className="text-[9px] font-bold text-pink-600 mt-1 uppercase tracking-widest">Actor ID: {log.userId?.substring(0,8)}</p>
                          </div>
                       </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
