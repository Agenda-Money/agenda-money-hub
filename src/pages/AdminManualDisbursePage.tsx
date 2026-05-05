import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  ArrowRight, 
  User, 
  Phone, 
  Banknote, 
  Calendar,
  Clock,
  History,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminLoans, manualDisburseLoan } from "@/lib/api";
import { ManualDisbursementRequest, LoanSearchResult } from "@/types/disbursement";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";

const formatGHS = (amount: number) => {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(amount);
};

export default function AdminManualDisbursePage() {
  const queryClient = useQueryClient();
  const [loanRef, setLoanRef] = useState("");
  const [selectedLoan, setSelectedLoan] = useState<LoanSearchResult | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const [formData, setFormData] = useState<ManualDisbursementRequest>({
    disbursementReference: "",
    momoMsisdn: "",
    momoNetwork: "MTN",
    amount: undefined,
    disbursedAt: new Date().toISOString().slice(0, 16), // datetime-local format
    notes: "Offline MoMo push by Ops",
    sendSms: true
  });

  // Search Query
  const { data: searchData, isLoading: isSearching, refetch: performSearch } = useQuery({
    queryKey: ["loan-search", loanRef],
    queryFn: () => getAdminLoans({ search: loanRef, limit: 10 }),
    enabled: false, // Manual trigger
  });

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!loanRef.trim()) return;
    
    const { data } = await performSearch();
    const items = data?.loans || data?.items || data?.data || [];
    const match = items.find((l: any) => l.loanReference === loanRef.trim() || l._id === loanRef.trim());
    
    if (match) {
      setSelectedLoan({
        ...match,
        userFullName: match.user?.fullName || match.userFullName,
        userMsisdn: match.user?.msisdn || match.userMsisdn
      });
      setFormData(prev => ({
        ...prev,
        momoMsisdn: (match.user?.msisdn || match.userMsisdn || match.phone || "").toString(),
        momoNetwork: match.network || "MTN",
        amount: match.disbursementAmount || match.amount,
        disbursementReference: `MANUAL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-OPS-${Math.floor(Math.random() * 1000)}`
      }));
      setIdempotencyKey(crypto.randomUUID());
    } else {
      toast.error("Loan not found. Please check the reference.");
      setSelectedLoan(null);
    }
  };

  const disburseMutation = useMutation({
    mutationFn: (data: ManualDisbursementRequest) => manualDisburseLoan(selectedLoan?._id || "", data, idempotencyKey),
    onSuccess: (res) => {
      toast.success("Disbursement recorded successfully!");
      // If code 200, it was already recorded
      if (res.status === 200) {
        toast.info("Disbursement was already recorded (idempotent).");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-loans"] });
      setIsConfirmOpen(false);
      setSelectedLoan(null);
      setLoanRef("");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || "Failed to record disbursement";
      toast.error(msg);
      // Do NOT reset idempotency key on network failure/error so user can retry safely
    }
  });

  const confirmSubmit = () => {
    disburseMutation.mutate({
      ...formData,
      amount: formData.amount,
      disbursedAt: new Date(formData.disbursedAt || "").toISOString()
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 p-6">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#EC1B84]">
            <Send className="w-6 h-6" />
            <h1 className="text-3xl font-black tracking-tight uppercase">Manual Disbursement</h1>
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            Record a loan disbursement that was performed offline via MoMo push.
          </p>
        </header>

        {/* Step 1: Search */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-white to-gray-50/50">
          <CardHeader>
            <CardTitle className="text-lg">Step 1: Locate Loan</CardTitle>
            <CardDescription>Enter the Loan Reference or Mongo ID to pre-fill details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  className="pl-10 h-12 text-lg font-mono border-2 focus:border-[#EC1B84] transition-all"
                  placeholder="e.g. AM-20240403-1234"
                  value={loanRef}
                  onChange={(e) => setLoanRef(e.target.value)}
                />
              </div>
              <Button 
                type="submit" 
                className="h-12 px-8 bg-[#EC1B84] hover:bg-[#D01675] text-white font-bold"
                disabled={isSearching}
              >
                {isSearching ? <RefreshCw className="animate-spin h-5 w-5" /> : "FIND LOAN"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {selectedLoan && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Step 2: Loan Summary */}
            <Card className="border-none shadow-lg bg-zinc-900 text-white">
              <CardHeader className="border-b border-white/10 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-[#EC1B84] font-black uppercase tracking-widest text-xs mb-1">
                      Loan Details
                    </CardTitle>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                       {selectedLoan.loanReference}
                       <Badge status={selectedLoan.status} />
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-white/60 text-[10px] uppercase font-bold tracking-tighter">Amount Due</p>
                    <p className="text-xl font-black">{formatGHS(selectedLoan.totalPayable || 0)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-white/40 flex items-center gap-1.5 uppercase text-[10px] font-bold">
                      <User className="w-3 h-3" /> Borrower
                    </p>
                    <p className="font-bold">{selectedLoan.userFullName || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white/40 flex items-center gap-1.5 uppercase text-[10px] font-bold">
                      <Phone className="w-3 h-3" /> Phone
                    </p>
                    <p className="font-mono">{selectedLoan.userMsisdn || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white/40 flex items-center gap-1.5 uppercase text-[10px] font-bold">
                      <Banknote className="w-3 h-3" /> Principal
                    </p>
                    <p className="font-bold">{formatGHS(selectedLoan.principal || 0)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white/40 flex items-center gap-1.5 uppercase text-[10px] font-bold">
                      <Clock className="w-3 h-3" /> Tenure
                    </p>
                    <p className="font-bold">{selectedLoan.tenureDays} Days</p>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
                  <p className="text-xs font-bold text-white/40 uppercase">Guarantor Info</p>
                  <p className="text-sm">
                    {selectedLoan.guarantorName || "No Guarantor"}
                    {selectedLoan.guarantorMsisdn && <span className="ml-2 text-white/60 font-mono">({selectedLoan.guarantorMsisdn})</span>}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Calendar className="w-3 h-3" />
                  Requested on {format(new Date(selectedLoan.createdAt), "PPP p")}
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Disbursement Form */}
            <Card className="border-none shadow-xl border-t-4 border-t-[#EC1B84]">
              <CardHeader>
                <CardTitle className="text-lg">Step 2: Record Offline Payout</CardTitle>
                <CardDescription>Funds must have been ALREADY sent to the user.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
                    Disbursement Reference (e.g. Batch ID)
                  </Label>
                  <Input 
                    value={formData.disbursementReference}
                    onChange={(e) => setFormData(prev => ({ ...prev, disbursementReference: e.target.value }))}
                    className="h-10 font-mono bg-muted/30"
                    placeholder="Enter unique reference"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
                      MoMo Phone (Target)
                    </Label>
                    <Input 
                      value={formData.momoMsisdn}
                      onChange={(e) => setFormData(prev => ({ ...prev, momoMsisdn: e.target.value }))}
                      className="h-10 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
                      Network
                    </Label>
                    <select 
                      className="w-full h-10 px-3 bg-white border rounded-md text-sm"
                      value={formData.momoNetwork}
                      onChange={(e) => setFormData(prev => ({ ...prev, momoNetwork: e.target.value }))}
                    >
                      <option value="MTN">MTN</option>
                      <option value="VODAFONE">Vodafone</option>
                      <option value="AIRTELTIGO">AirtelTigo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
                      Amount Disbursed (GHS)
                    </Label>
                    <Input 
                      type="number"
                      value={formData.amount || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || undefined }))}
                      className="h-10 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
                      Disbursement Date
                    </Label>
                    <Input 
                      type="datetime-local"
                      value={formData.disbursedAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, disbursedAt: e.target.value }))}
                      className="h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
                    Notes / Reconciliation Info
                  </Label>
                  <Input 
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="h-10 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-blue-800 text-[10px] font-medium leading-tight">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Borrower will receive an automated SMS confirming disbursement once you submit this form.</span>
                </div>

                <Button 
                  className="w-full h-12 bg-zinc-900 hover:bg-black text-white font-black text-lg shadow-lg hover:shadow-[#EC1B84]/20 transition-all group"
                  onClick={() => setIsConfirmOpen(true)}
                >
                  CONFIRM & RECORD
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {!selectedLoan && !isSearching && (
           <div className="py-20 text-center space-y-4 text-muted-foreground opacity-50">
              <History className="w-16 h-16 mx-auto" />
              <p className="text-lg">Enter a loan reference above to begin the manual record process.</p>
           </div>
        )}

        {/* Confirmation Modal */}
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
           <DialogContent className="max-w-md">
              <DialogHeader>
                 <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                    <ShieldCheck className="w-8 h-8 text-[#EC1B84]" />
                    Final Confirmation
                 </DialogTitle>
                 <DialogDescription>
                    Please verify the details before committing to the ledger. This action will mark the loan as <strong>ACTIVE</strong>.
                 </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 p-4 bg-muted/50 rounded-2xl border border-border/50">
                 <div className="flex justify-between items-center">
                    <span className="text-xs uppercase font-bold text-muted-foreground">Disbursement</span>
                    <span className="text-lg font-black text-[#EC1B84]">{formatGHS(formData.amount ?? 0)}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Recipient Msisdn</span>
                    <span className="font-mono font-bold">{formData.momoMsisdn}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-mono text-xs">{formData.disbursementReference}</span>
                 </div>
                 <div className="pt-2 border-t flex items-center gap-2 text-[10px] text-muted-foreground italic">
                    <AlertCircle className="w-3 h-3" />
                    Idempotency Key: {idempotencyKey.slice(0, 13)}...
                 </div>
              </div>

              <DialogFooter className="gap-2">
                 <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>CANCEL</Button>
                 <Button 
                   className="bg-[#EC1B84] hover:bg-[#D01675] text-white font-bold px-8 shadow-xl"
                   onClick={confirmSubmit}
                   disabled={disburseMutation.isPending}
                 >
                    {disburseMutation.isPending ? "RECORDING..." : "COMMIT RECORD"}
                 </Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function Badge({ status }: { status: string }) {
  const configs: Record<string, { label: string, color: string }> = {
    pending: { label: "PENDING", color: "bg-amber-100 text-amber-700 border-amber-200" },
    active: { label: "ACTIVE", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    overdue: { label: "OVERDUE", color: "bg-red-100 text-red-700 border-red-200" },
    closed: { label: "CLOSED", color: "bg-gray-100 text-gray-700 border-gray-200" },
    rejected: { label: "REJECTED", color: "bg-zinc-100 text-zinc-700 border-zinc-200" },
  };

  const config = configs[status.toLowerCase()] || { label: status, color: "bg-muted" };

  return (
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-black border", config.color)}>
      {config.label}
    </span>
  );
}
