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
    msisdn: "",
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
      setManualData({ msisdn: "", amount: "", reason: "", loanReference: "" });
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
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">Agent Deductions</h1>
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
              className="rounded-xl h-12 px-6 font-black border-gray-200 hover:bg-gray-50 gap-2"
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
                  <Label htmlFor="agent-msisdn" className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Agent MSISDN</Label>
                  <Input 
                    id="agent-msisdn" 
                    placeholder="233XXXXXXXXX" 
                    value={manualData.msisdn}
                    onChange={(e) => setManualData({ ...manualData, msisdn: e.target.value })}
                    className="h-12 rounded-xl border-gray-200 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Amount (GHS)</Label>
                  <Input 
                    id="amount" 
                    type="number"
                    placeholder="0.00" 
                    value={manualData.amount}
                    onChange={(e) => setManualData({ ...manualData, amount: e.target.value })}
                    className="h-12 rounded-xl border-gray-200 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loan-ref" className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Loan Reference (Optional)</Label>
                  <Input 
                    id="loan-ref" 
                    placeholder="LOAN-12345" 
                    value={manualData.loanReference}
                    onChange={(e) => setManualData({ ...manualData, loanReference: e.target.value })}
                    className="h-12 rounded-xl border-gray-200 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Reason (Required)</Label>
                  <Textarea 
                    id="reason" 
                    placeholder="Describe why this deduction is being made..." 
                    value={manualData.reason}
                    onChange={(e) => setManualData({ ...manualData, reason: e.target.value })}
                    className="min-h-[120px] rounded-xl border-gray-200 focus:border-primary resize-none"
                  />
                </div>
              </div>
              <SheetFooter>
                <Button 
                  className="w-full h-14 bg-[#EC1B84] hover:bg-[#D01773] text-white font-black text-lg rounded-2xl"
                  disabled={!manualData.msisdn || !manualData.amount || !manualData.reason || manualMutation.isPending}
                  onClick={() => manualMutation.mutate({
                    borrowerMsisdn: manualData.msisdn,
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
          <TabsList className="bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/40 h-14">
            <TabsTrigger value="pending" className="rounded-xl px-8 h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg active:scale-95 transition-all">
              Pending Confirmation
              {activeTab === "pending" && deductions.length > 0 && (
                <span className="ml-2 bg-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{deductions.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-xl px-8 h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg active:scale-95 transition-all">
              All Deductions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
             {isLoading ? (
               <div className="h-64 flex flex-col items-center justify-center gap-3 bg-white/40 rounded-3xl border border-white/40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading pending queue...</p>
               </div>
             ) : deductions.length === 0 ? (
               <div className="h-64 flex flex-col items-center justify-center gap-3 bg-white/40 rounded-3xl border border-white/40">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  <p className="font-black text-gray-900 uppercase tracking-widest">Queue Clear</p>
                  <p className="text-sm text-gray-400">No deductions awaiting confirmation.</p>
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white/40 backdrop-blur-md p-4 rounded-[28px] border border-white/40 shadow-sm">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Filter by Agent MSISDN..." 
                    className="pl-10 h-12 border-none bg-white rounded-xl shadow-none font-medium"
                    value={msisdnFilter}
                    onChange={(e) => setMsisdnFilter(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-12 border-none bg-white rounded-xl shadow-none font-bold">
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
                    <SelectTrigger className="h-12 border-none bg-white rounded-xl shadow-none font-bold">
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

            <div className="bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/40 shadow-xl overflow-hidden">
               <Table>
                  <TableHeader className="bg-gray-50/50 text-[10px] uppercase font-black tracking-widest h-12">
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
                               <p className="font-bold text-gray-400">No deductions found</p>
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
                 <div className="flex items-center justify-between px-8 py-6 bg-white/20 border-t border-white/20">
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Page {page} of {pagination.pages}</span>
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
      className="border-none bg-white/60 backdrop-blur-md rounded-3xl shadow-sm hover:shadow-md transition-all group border border-white/40 cursor-pointer"
      onClick={() => onSelect(item)}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4 text-xs">
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-3 py-1 font-black text-[10px] tracking-wider uppercase">
             {item.deductionType?.replace('_', ' ') || item.type?.replace('_', ' ')}
          </Badge>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {format(new Date(item.createdAt), "MMM d, HH:mm")}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <User className="w-3.5 h-3.5 text-gray-400" />
               <span className="font-black text-gray-900">{item.agentName || "Unknown Agent"}</span>
            </div>
            <p className="text-[10px] text-gray-400 font-bold tracking-widest pl-5 uppercase">{item.agentMsisdn}</p>
          </div>

          <div className="bg-white/80 p-4 rounded-2xl flex justify-between items-center border border-white/40 shadow-sm relative overflow-hidden">
             <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
             <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Deduction Amount</p>
                <p className="text-xl font-black text-red-600">-GHS {item.amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
             </div>
             {(item.linkedLoanReference || item.loanReference) && (
               <div className="text-right">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ref</p>
                  <p className="text-[10px] font-bold text-gray-900">{item.linkedLoanReference || item.loanReference}</p>
               </div>
             )}
          </div>

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
             <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Reason</p>
             <p className="text-xs text-gray-700 font-medium leading-relaxed italic line-clamp-2">"{item.reason || "No reason provided"}"</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1 rounded-xl h-12 font-bold border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
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
      case "DEFAULT_PENALTY": return "bg-red-100 text-red-700";
      case "FRAUD_REVOCATION": return "bg-red-800 text-white";
      case "MANUAL_CORRECTION": return "bg-amber-100 text-amber-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_CONFIRMATION": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase text-[9px] font-black">Pending</Badge>;
      case "CONFIRMED": return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 uppercase text-[9px] font-black">Confirmed</Badge>;
      case "REVERSED": return <Badge variant="outline" className="bg-gray-50 text-gray-400 border-gray-200 uppercase text-[9px] font-black">Reversed</Badge>;
      default: return <Badge variant="outline" className="text-[9px] font-black">{status}</Badge>;
    }
  };

  return (
      <TableRow className="group border-b border-white/10 hover:bg-white/60 transition-colors cursor-pointer" onClick={() => onSelect(item)}>
        <TableCell className="pl-8 font-medium text-gray-500">
           {format(new Date(item.createdAt), "MMM d, yyyy")}
        </TableCell>
        <TableCell>
           <div className="font-black text-gray-900">{item.agentName || "Unknown"}</div>
           <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.agentMsisdn}</div>
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
           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-gray-900">
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
          <Badge className="w-fit mb-2 bg-pink-100 text-pink-700 hover:bg-pink-100 border-none px-3 py-1 font-black text-[10px] tracking-wider uppercase">
             {((item.deductionType || item.type || "DEDUCTION") as string)?.replace('_', ' ')}
          </Badge>
          <SheetTitle className="text-3xl font-black text-gray-900 flex items-center gap-2">
            Deduction Details
          </SheetTitle>
          <SheetDescription className="text-gray-400 font-bold tracking-tight">
            Comprehensive audit view for ID: {item._id}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8 pb-12">
           {/* Summary Section */}
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                 <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Agent Name</p>
                 <p className="font-black text-gray-900">{item.agentName || "Unknown Agent"}</p>
                 <p className="text-xs font-bold text-gray-400 mt-0.5">{item.agentMsisdn}</p>
              </div>
              <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100">
                 <p className="text-[10px] font-black uppercase text-red-400 tracking-widest mb-1">Amount</p>
                 <p className="text-xl font-black text-red-600">-GHS {item.amount?.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                 <p className="text-xs font-bold text-red-400 mt-1 uppercase tracking-tighter">{item.status}</p>
              </div>
           </div>

           {/* Reason Card */}
           <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-200" />
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Detailed Reason</p>
              <p className="text-sm text-gray-700 font-medium leading-relaxed italic">
                 "{item.reason || "No reason provided."}"
              </p>
           </div>

           {/* Financial Context */}
           <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                 <Info className="w-3.5 h-3.5" />
                 Financial Impact
              </h3>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                 <div className="p-4 flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-bold uppercase text-[10px]">Balance Before</span>
                    <span className="font-black text-gray-900">GHS {item.balanceBeforeDeduction?.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}</span>
                 </div>
                 <div className="p-4 flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-bold uppercase text-[10px]">Balance After</span>
                    <span className="font-black text-emerald-600">GHS {item.balanceAfterDeduction?.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}</span>
                 </div>
                 {(item.linkedLoanReference || item.loanReference) && (
                   <div className="p-4 flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-bold uppercase text-[10px]">Loan Reference</span>
                      <span className="font-black text-pink-600 underline cursor-pointer">{item.linkedLoanReference || item.loanReference}</span>
                   </div>
                 )}
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                 <Clock className="w-3.5 h-3.5" />
                 Audit Trail
              </h3>
              <div className="space-y-3">
                 {isLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-gray-200" /></div>
                 ) : audits?.data?.length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-4">No specific audit entries found for this ID.</p>
                 ) : (
                    audits?.data?.map((log: any) => (
                       <div key={log._id} className="flex gap-4 p-4 rounded-2xl border border-gray-50 bg-gray-50/20 group hover:bg-gray-50/50 transition-colors">
                          <div className="bg-white w-10 h-10 rounded-xl border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                             <Badge variant="outline" className="h-6 w-6 rounded-md p-0 flex items-center justify-center text-[8px] font-black uppercase text-gray-400">{log.action?.[0]}</Badge>
                          </div>
                          <div className="flex-1">
                             <div className="flex justify-between items-start">
                                <p className="text-xs font-black text-gray-900">{log.action}</p>
                                <p className="text-[10px] text-gray-400 font-bold tracking-tighter">{format(new Date(log.createdAt), "MMM d, HH:mm")}</p>
                             </div>
                             <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{log.resource} • {log.ipAddress || "Internal"}</p>
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
