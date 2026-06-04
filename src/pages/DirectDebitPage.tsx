import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import {
  RefreshCw, MoreHorizontal, TrendingUp, AlertCircle, Clock,
  PauseCircle, XCircle, CheckCircle2, Zap, CalendarClock,
  Users, CreditCard, ChevronDown,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDirectDebitStats, listMandates, getDelinquent,
  cancelMandate, pauseMandate, resumeMandate, triggerDebit,
  forceDebit, syncMandate, setupMandateForLoan, bulkTrigger, bulkForceDebit,
  type DirectDebitMandate, type DelinquentCustomer,
} from "@/api/direct-debit.api";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string }> = {
  ACTIVE:           { label: "Active",           color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  PENDING_APPROVAL: { label: "Pending Approval", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  PAUSED:           { label: "Paused",           color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  DEBIT_FAILED:     { label: "Debit Failed",     color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  CANCELLED:        { label: "Cancelled",        color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  EXPIRED:          { label: "Expired",          color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  NO_MANDATE:       { label: "No Mandate",       color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", meta.color)}>
      {meta.label}
    </span>
  );
}

function fmt(date?: string) {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy HH:mm");
}

function fmtGhs(n?: number) {
  if (n === undefined || n === null) return "—";
  return `GHS ${n.toFixed(2)}`;
}

// ── Force Debit Dialog ─────────────────────────────────────────────────────────

function ForceDebitDialog({
  open, onOpenChange, msisdn, loanRef, outstanding,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  msisdn: string;
  loanRef?: string;
  outstanding?: number;
  onSuccess: () => void;
}) {
  const minDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const [debitDate, setDebitDate] = useState(minDate);
  const [debitTime, setDebitTime] = useState("08:00");
  const [amount, setAmount] = useState(outstanding?.toFixed(2) ?? "");

  const mut = useMutation({
    mutationFn: () => forceDebit(msisdn, debitDate, debitTime, amount ? parseFloat(amount) : undefined),
    onSuccess: () => {
      toast.success(`One-time debit scheduled for ${debitDate}`);
      onOpenChange(false);
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to schedule debit"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule One-Time Debit</DialogTitle>
          <DialogDescription>
            {loanRef ? `Loan ${loanRef} · ` : ""}{msisdn}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Debit Date <span className="text-muted-foreground text-xs">(min 24h from now)</span></Label>
            <Input type="date" min={minDate} value={debitDate} onChange={e => setDebitDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Debit Time</Label>
            <Input type="time" value={debitTime} onChange={e => setDebitTime(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Amount (GHS) <span className="text-muted-foreground text-xs">defaults to outstanding balance</span></Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder={outstanding?.toFixed(2) ?? "0.00"}
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !debitDate}>
            {mut.isPending ? "Scheduling..." : "Schedule Debit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Stats Tab ──────────────────────────────────────────────────────────────────

function StatsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["dd-stats"],
    queryFn: getDirectDebitStats,
    refetchInterval: 30_000,
  });

  const stat = data?.mandates;
  const debit = data?.debits;

  const cards = [
    { label: "Active Mandates",    value: stat?.active,          icon: CheckCircle2, color: "text-green-600" },
    { label: "Pending Approval",   value: stat?.pendingApproval, icon: Clock,        color: "text-yellow-600" },
    { label: "Paused",             value: stat?.paused,          icon: PauseCircle,  color: "text-orange-500" },
    { label: "Debit Failed",       value: stat?.debitFailed,     icon: AlertCircle,  color: "text-red-600" },
    { label: "Cancelled/Expired",  value: (stat?.cancelled ?? 0) + (stat?.expired ?? 0), icon: XCircle, color: "text-gray-500" },
    { label: "Total Mandates",     value: stat?.total,           icon: Users,        color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn("h-4 w-4", color)} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-bold">{isLoading ? "—" : (value ?? 0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Debit Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-green-600">{isLoading ? "—" : (debit?.totalSuccessful ?? 0)}</p>
              <p className="text-sm text-muted-foreground mt-1">Successful Debits</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-600">{isLoading ? "—" : (debit?.totalFailed ?? 0)}</p>
              <p className="text-sm text-muted-foreground mt-1">Failed Debits</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">
                {isLoading ? "—" : debit?.successRate !== null ? `${debit?.successRate}%` : "—"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Success Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Mandates Tab ───────────────────────────────────────────────────────────────

function MandatesTab() {
  const qc = useQueryClient();
  const { canWrite } = useAuth();
  const [statusFilter, setStatusFilter] = useState("");
  const [msisdnSearch, setMsisdnSearch] = useState("");
  const [page, setPage] = useState(1);
  const [forceDebitTarget, setForceDebitTarget] = useState<DirectDebitMandate | null>(null);
  const [cancelTarget, setCancelTarget] = useState<DirectDebitMandate | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["dd-mandates", statusFilter, msisdnSearch, page],
    queryFn: () => listMandates({ status: statusFilter || undefined, msisdn: msisdnSearch || undefined, page, limit: 20 }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["dd-mandates"] });

  const pauseMut = useMutation({ mutationFn: (msisdn: string) => pauseMandate(msisdn), onSuccess: () => { toast.success("Mandate paused"); invalidate(); } });
  const resumeMut = useMutation({ mutationFn: (msisdn: string) => resumeMandate(msisdn), onSuccess: () => { toast.success("Mandate resumed"); invalidate(); } });
  const triggerMut = useMutation({ mutationFn: (msisdn: string) => triggerDebit(msisdn), onSuccess: () => { toast.success("Retry triggered"); invalidate(); } });
  const syncMut = useMutation({ mutationFn: (msisdn: string) => syncMandate(msisdn), onSuccess: () => { toast.success("Synced"); invalidate(); } });
  const cancelMut = useMutation({
    mutationFn: ({ msisdn, reason }: { msisdn: string; reason: string }) => cancelMandate(msisdn, reason),
    onSuccess: () => { toast.success("Mandate cancelled"); setCancelTarget(null); invalidate(); },
  });

  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by phone..."
          value={msisdnSearch}
          onChange={e => { setMsisdnSearch(e.target.value); setPage(1); }}
          className="w-48"
        />
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_META).filter(([k]) => k !== "NO_MANDATE").map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <th className="px-4 py-3 text-left font-medium">Network</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Loan Ref</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Last Debit</th>
              <th className="px-4 py-3 text-left font-medium">Retries</th>
              {canWrite && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No mandates found</td></tr>
            ) : rows.map((m) => (
              <tr key={m._id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{m.msisdn}</td>
                <td className="px-4 py-3">{m.channel}</td>
                <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-3 font-mono text-xs">{m.currentLoanReference ?? "—"}</td>
                <td className="px-4 py-3">{fmtGhs(m.currentDebitAmount)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{fmt(m.lastDebitAt)}</td>
                <td className="px-4 py-3">{m.retryCount}</td>
                {canWrite && (
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {m.status === "DEBIT_FAILED" && (
                          <DropdownMenuItem onClick={() => triggerMut.mutate(m.msisdn)}>
                            <Zap className="h-3.5 w-3.5 mr-2 text-orange-500" /> Retry Failed Debit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setForceDebitTarget(m)}>
                          <CalendarClock className="h-3.5 w-3.5 mr-2 text-blue-500" /> Force Debit on Date
                        </DropdownMenuItem>
                        {m.status === "ACTIVE" && (
                          <DropdownMenuItem onClick={() => pauseMut.mutate(m.msisdn)}>
                            <PauseCircle className="h-3.5 w-3.5 mr-2" /> Pause
                          </DropdownMenuItem>
                        )}
                        {m.status === "PAUSED" && (
                          <DropdownMenuItem onClick={() => resumeMut.mutate(m.msisdn)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500" /> Resume
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => syncMut.mutate(m.msisdn)}>
                          <RefreshCw className="h-3.5 w-3.5 mr-2" /> Sync from ITC
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => { setCancelTarget(m); setCancelReason(""); }}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-2" /> Cancel Mandate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{pagination.total} mandates</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="px-2 py-1">Page {page} / {pagination.pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Force Debit Dialog */}
      {forceDebitTarget && (
        <ForceDebitDialog
          open={!!forceDebitTarget}
          onOpenChange={v => !v && setForceDebitTarget(null)}
          msisdn={forceDebitTarget.msisdn}
          loanRef={forceDebitTarget.currentLoanReference}
          outstanding={forceDebitTarget.currentDebitAmount}
          onSuccess={invalidate}
        />
      )}

      {/* Cancel Confirm Dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={v => !v && setCancelTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Mandate</DialogTitle>
            <DialogDescription>This will permanently stop all direct debits for {cancelTarget?.msisdn}.</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label>Reason (optional)</Label>
            <Input value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="e.g. Customer request" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Back</Button>
            <Button
              variant="destructive"
              disabled={cancelMut.isPending}
              onClick={() => cancelTarget && cancelMut.mutate({ msisdn: cancelTarget.msisdn, reason: cancelReason })}
            >
              {cancelMut.isPending ? "Cancelling..." : "Cancel Mandate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Delinquent Tab ─────────────────────────────────────────────────────────────

function DelinquentTab() {
  const qc = useQueryClient();
  const { canWrite } = useAuth();
  const [mandateFilter, setMandateFilter] = useState("");
  const [networkFilter, setNetworkFilter] = useState("");
  const [minDays, setMinDays] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [forceDebitTarget, setForceDebitTarget] = useState<DelinquentCustomer | null>(null);
  const [bulkDateOpen, setBulkDateOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [bulkTime, setBulkTime] = useState("08:00");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dd-delinquent", mandateFilter, networkFilter, minDays, page],
    queryFn: () => getDelinquent({
      mandateStatus: mandateFilter || undefined,
      network: networkFilter || undefined,
      minDaysOverdue: minDays ? parseInt(minDays) : undefined,
      page,
      limit: 50,
    }),
  });

  const rows = data?.data ?? [];
  const summary = data?.summary;
  const pagination = data?.pagination;

  const toggleRow = (msisdn: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(msisdn) ? next.delete(msisdn) : next.add(msisdn);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map(r => r.userMsisdn)));
    }
  };

  const bulkTriggerMut = useMutation({
    mutationFn: () => bulkTrigger(Array.from(selected)),
    onSuccess: (res) => {
      toast.success(`${res.triggered} retry debits triggered`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["dd-delinquent"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Bulk trigger failed"),
  });

  const bulkForceMut = useMutation({
    mutationFn: () => bulkForceDebit(Array.from(selected), bulkDate, bulkTime),
    onSuccess: (res) => {
      toast.success(`${res.scheduled} debits scheduled for ${bulkDate}`);
      setBulkDateOpen(false);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["dd-delinquent"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Bulk force debit failed"),
  });

  const setupMut = useMutation({
    mutationFn: (loanRef: string) => setupMandateForLoan(loanRef),
    onSuccess: () => { toast.success("Standing order request sent — customer will be prompted to approve"); refetch(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Setup failed"),
  });

  const triggerRowMut = useMutation({
    mutationFn: (msisdn: string) => triggerDebit(msisdn),
    onSuccess: () => { toast.success("Retry triggered"); refetch(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Trigger failed"),
  });

  const minDate = format(addDays(new Date(), 1), "yyyy-MM-dd");

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      {summary && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: `${summary.noMandate} No Mandate`, color: "bg-slate-100 text-slate-700" },
            { label: `${summary.debitFailed} Debit Failed`, color: "bg-red-100 text-red-700" },
            { label: `${summary.pendingApproval} Pending Approval`, color: "bg-yellow-100 text-yellow-700" },
            { label: `${summary.active} Active`, color: "bg-green-100 text-green-700" },
          ].map(c => (
            <span key={c.label} className={cn("px-2.5 py-1 rounded-full text-xs font-medium", c.color)}>{c.label}</span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Min days overdue" type="number" value={minDays} onChange={e => { setMinDays(e.target.value); setPage(1); }} className="w-40" />
        <Select value={networkFilter} onValueChange={v => { setNetworkFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All networks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All networks</SelectItem>
            {["MTN", "VODAFONE", "AIRTELTIGO"].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mandateFilter} onValueChange={v => { setMandateFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All mandate statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All mandate statuses</SelectItem>
            {Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar */}
      {canWrite && selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium text-primary">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkTriggerMut.mutate()} disabled={bulkTriggerMut.isPending}>
            <Zap className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
            {bulkTriggerMut.isPending ? "Triggering..." : "Retry Failed Debits"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulkDateOpen(true)}>
            <CalendarClock className="h-3.5 w-3.5 mr-1.5 text-blue-500" /> Force Debit on Date
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {canWrite && (
                <th className="px-4 py-3">
                  <Checkbox
                    checked={rows.length > 0 && selected.size === rows.length}
                    onCheckedChange={toggleAll}
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left font-medium">Borrower</th>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <th className="px-4 py-3 text-left font-medium">Outstanding</th>
              <th className="px-4 py-3 text-left font-medium">Days Overdue</th>
              <th className="px-4 py-3 text-left font-medium">Network</th>
              <th className="px-4 py-3 text-left font-medium">Mandate</th>
              {canWrite && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No delinquent customers match these filters</td></tr>
            ) : rows.map((r) => (
              <tr key={r.loanId} className={cn("hover:bg-muted/30 transition-colors", selected.has(r.userMsisdn) && "bg-primary/5")}>
                {canWrite && (
                  <td className="px-4 py-3">
                    <Checkbox checked={selected.has(r.userMsisdn)} onCheckedChange={() => toggleRow(r.userMsisdn)} />
                  </td>
                )}
                <td className="px-4 py-3">
                  <p className="font-medium truncate max-w-[140px]">{r.borrowerName || "—"}</p>
                  <p className="text-xs text-muted-foreground font-mono">{r.loanReference}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{r.userMsisdn}</td>
                <td className="px-4 py-3 font-semibold text-red-600">{fmtGhs(r.outstanding)}</td>
                <td className="px-4 py-3">
                  <span className={cn("font-medium", r.daysOverdue > 30 ? "text-red-600" : "text-orange-600")}>
                    {r.daysOverdue}d
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{r.network}</td>
                <td className="px-4 py-3"><StatusBadge status={r.mandateStatus} /></td>
                {canWrite && (
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                          Actions <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => setForceDebitTarget(r)}>
                          <CalendarClock className="h-3.5 w-3.5 mr-2 text-blue-500" /> Force Debit on Date
                        </DropdownMenuItem>
                        {r.mandateStatus === "DEBIT_FAILED" && (
                          <DropdownMenuItem onClick={() => triggerRowMut.mutate(r.userMsisdn)}>
                            <Zap className="h-3.5 w-3.5 mr-2 text-orange-500" /> Retry Failed Debit
                          </DropdownMenuItem>
                        )}
                        {r.mandateStatus === "NO_MANDATE" && (
                          <DropdownMenuItem onClick={() => setupMut.mutate(r.loanReference)}>
                            <CreditCard className="h-3.5 w-3.5 mr-2 text-green-500" /> Send Standing Order Request
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{pagination.total} customers</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="px-2 py-1">Page {page} / {pagination.pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Force debit for single row */}
      {forceDebitTarget && (
        <ForceDebitDialog
          open={!!forceDebitTarget}
          onOpenChange={v => !v && setForceDebitTarget(null)}
          msisdn={forceDebitTarget.userMsisdn}
          loanRef={forceDebitTarget.loanReference}
          outstanding={forceDebitTarget.outstanding}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["dd-delinquent"] })}
        />
      )}

      {/* Bulk force debit date picker */}
      <Dialog open={bulkDateOpen} onOpenChange={setBulkDateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bulk Force Debit</DialogTitle>
            <DialogDescription>{selected.size} customers · one-time pull on chosen date</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Debit Date <span className="text-muted-foreground text-xs">(min 24h from now)</span></Label>
              <Input type="date" min={minDate} value={bulkDate} onChange={e => setBulkDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Debit Time</Label>
              <Input type="time" value={bulkTime} onChange={e => setBulkTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDateOpen(false)}>Cancel</Button>
            <Button onClick={() => bulkForceMut.mutate()} disabled={bulkForceMut.isPending || !bulkDate}>
              {bulkForceMut.isPending ? "Scheduling..." : `Schedule ${selected.size} Debits`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DirectDebitPage() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const validTabs = ["overview", "mandates", "delinquent"];
  const activeTab = validTabs.includes(tab ?? "") ? tab! : "overview";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Direct Debit</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            ITC UniWallet standing orders — mandate management and delinquent collection
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={val => navigate(`/admin/direct-debit/${val}`)}>
          <TabsList className="bg-muted p-1 flex overflow-x-auto w-full sm:w-fit no-scrollbar">
            <TabsTrigger value="overview" className="data-[state=active]:bg-card">Overview</TabsTrigger>
            <TabsTrigger value="mandates" className="data-[state=active]:bg-card">Mandates</TabsTrigger>
            <TabsTrigger value="delinquent" className="data-[state=active]:bg-card">Delinquent Customers</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4"><StatsTab /></TabsContent>
          <TabsContent value="mandates" className="mt-4"><MandatesTab /></TabsContent>
          <TabsContent value="delinquent" className="mt-4"><DelinquentTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
