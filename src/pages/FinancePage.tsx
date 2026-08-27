import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  DollarSign, TrendingDown, TrendingUp, Wallet, Percent,
  Plus, Trash2, CheckCircle2, XCircle, Clock, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import { EXPENSE_CATEGORIES, PAYROLL_DEPARTMENTS, type LedgerCategoryId } from "@/lib/constants";
import {
  getAccountingSettings, updateAccountingSettings,
  listLedgerEntries, createLedgerEntry, requestLedgerDeletion, approveLedgerDeletion, rejectLedgerDeletion,
  getPnl, getChannelBreakdown,
  type LedgerEntry,
} from "@/api/accounting.api";

function fmtGhs(n?: number) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function humanizeStatus(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

// ── Metric tile — deliberately no red/green traffic-lighting on financial
// figures (a business being down 2% isn't an alarm; that pattern trains
// people to stop trusting the color). ─────────────────────────────────────
function MetricTile({ label, value, icon: Icon, sub }: { label: string; value: string; icon: any; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <Input
      type="month"
      value={month}
      onChange={(e) => onChange(e.target.value)}
      className="w-40"
    />
  );
}

// ── Overview ─────────────────────────────────────────────────────────────

function OverviewTab({ month }: { month: string }) {
  const { data: pnl, isLoading } = useQuery({ queryKey: ["accounting-pnl", month], queryFn: () => getPnl(month) });

  const activeLoan = pnl?.portfolio.find((p) => p.status === "ACTIVE");
  const lossLoan = pnl?.portfolio.find((p) => p.status === "LOSS");
  const totalOutstanding = pnl?.portfolio.reduce((s, p) => s + p.outstandingValue, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile label="Revenue" value={isLoading ? "—" : fmtGhs(pnl?.revenue.total)} icon={TrendingUp} sub={pnl ? `${pnl.revenue.repaidLoanCount} loans settled` : undefined} />
        <MetricTile label="Gross Margin" value={isLoading ? "—" : fmtGhs(pnl?.grossMargin)} icon={DollarSign} />
        <MetricTile label="Cost of Funds" value={isLoading ? "—" : fmtGhs(pnl?.directCosts.costOfFunds)} icon={Percent} sub={pnl ? `${pnl.directCosts.costOfFundsRatePercent}% of ${fmtGhs(pnl.directCosts.totalDisbursedThisMonth)} disbursed` : undefined} />
        <MetricTile label="Loan Book (outstanding)" value={isLoading ? "—" : fmtGhs(totalOutstanding)} icon={Wallet} />
      </div>
      {lossLoan && lossLoan.count > 0 && (
        <Card className="border-amber-200">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm">
              <span className="font-bold">{lossLoan.count}</span> loan{lossLoan.count === 1 ? "" : "s"} classified as loss this period — {fmtGhs(lossLoan.outstandingValue)} outstanding.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── P&L ──────────────────────────────────────────────────────────────────

function PnlTab({ month }: { month: string }) {
  const { data: pnl, isLoading } = useQuery({ queryKey: ["accounting-pnl", month], queryFn: () => getPnl(month) });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!pnl) return null;

  const rows: { label: string; value: number; bold?: boolean }[] = [
    { label: "Interest revenue", value: pnl.revenue.interest },
    { label: "Fee revenue", value: pnl.revenue.fee },
    { label: "Total revenue", value: pnl.revenue.total, bold: true },
    { label: "Cost of funds", value: -pnl.directCosts.costOfFunds },
    { label: "Direct ledger costs", value: -pnl.directCosts.ledgerDirect },
    { label: "Total direct costs", value: -pnl.directCosts.total, bold: true },
    { label: "Indirect costs (OpEx)", value: -pnl.indirectCosts.total, bold: true },
    { label: "Gross margin", value: pnl.grossMargin, bold: true },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">P&amp;L — {format(new Date(`${month}-01`), "MMMM yyyy")}</CardTitle>
          <CardDescription>Revenue recognized in the month a loan settles, not the month it was disbursed.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.label}>
                  <TableCell className={cn(r.bold && "font-bold")}>{r.label}</TableCell>
                  <TableCell className={cn("text-right", r.bold && "font-bold", r.value < 0 && "text-muted-foreground")}>{fmtGhs(r.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pnl.indirectCosts.byCategory.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Indirect costs by category</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Category</TableHead><TableHead>Department</TableHead><TableHead className="text-right">Amount</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {pnl.indirectCosts.byCategory.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>{EXPENSE_CATEGORIES.find((e) => e.id === c._id.category)?.label ?? c._id.category}</TableCell>
                    <TableCell>{c._id.department ?? "—"}</TableCell>
                    <TableCell className="text-right">{fmtGhs(c.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Portfolio ────────────────────────────────────────────────────────────

function PortfolioTab({ month }: { month: string }) {
  const { data: pnl, isLoading } = useQuery({ queryKey: ["accounting-pnl", month], queryFn: () => getPnl(month) });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Portfolio composition</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Status</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Outstanding value</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {pnl?.portfolio.map((p) => (
                <TableRow key={p.status}>
                  <TableCell>{humanizeStatus(p.status)}</TableCell>
                  <TableCell className="text-right">{p.count}</TableCell>
                  <TableCell className="text-right">{fmtGhs(p.outstandingValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ── Channels ─────────────────────────────────────────────────────────────

function ChannelsTab({ month }: { month: string }) {
  const { data: disbursement, isLoading: l1 } = useQuery({ queryKey: ["accounting-channels", "disbursement", month], queryFn: () => getChannelBreakdown("disbursement", month) });
  const { data: collection, isLoading: l2 } = useQuery({ queryKey: ["accounting-channels", "collection", month], queryFn: () => getChannelBreakdown("collection", month) });

  const renderTable = (rows: { _id: { channel?: string; provider?: string }; count: number; volume: number }[] | undefined, loading: boolean) => (
    loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
      <Table>
        <TableHeader>
          <TableRow><TableHead>Channel</TableHead><TableHead>Provider</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Volume</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {rows?.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{r._id.channel ?? "—"}</TableCell>
              <TableCell>{r._id.provider ?? "—"}</TableCell>
              <TableCell className="text-right">{r.count}</TableCell>
              <TableCell className="text-right">{fmtGhs(r.volume)}</TableCell>
            </TableRow>
          ))}
          {rows?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No data for this period</TableCell></TableRow>}
        </TableBody>
      </Table>
    )
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Disbursements (outflow)</CardTitle></CardHeader>
        <CardContent>{renderTable(disbursement?.breakdown, l1)}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Repayments (inflow)</CardTitle></CardHeader>
        <CardContent>{renderTable(collection?.breakdown, l2)}</CardContent>
      </Card>
    </div>
  );
}

// ── Ledger ───────────────────────────────────────────────────────────────

function LedgerTab({ month }: { month: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { canWrite, canDelete } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [form, setForm] = useState({ category: "" as LedgerCategoryId | "", department: "", description: "", amount: "", periodMonth: month });
  const [deleteTarget, setDeleteTarget] = useState<LedgerEntry | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [approvalTarget, setApprovalTarget] = useState<{ entry: LedgerEntry; action: "approve" | "reject" } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ledger-entries", month],
    queryFn: () => listLedgerEntries({ periodMonth: month, limit: 100 }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ledger-entries"] });

  const createMut = useMutation({
    mutationFn: createLedgerEntry,
    onSuccess: () => {
      toast({ title: "Entry created" });
      setIsSheetOpen(false);
      setForm({ category: "", department: "", description: "", amount: "", periodMonth: month });
      invalidate();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to create entry", description: getFriendlyErrorMessage(e) }),
  });

  const requestDeleteMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => requestLedgerDeletion(id, reason),
    onSuccess: () => {
      toast({ title: "Deletion requested — pending superadmin approval" });
      setDeleteTarget(null);
      setDeleteReason("");
      invalidate();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to request deletion", description: getFriendlyErrorMessage(e) }),
  });

  const approveMut = useMutation({
    mutationFn: approveLedgerDeletion,
    onSuccess: () => { toast({ title: "Deletion approved" }); setApprovalTarget(null); invalidate(); },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to approve", description: getFriendlyErrorMessage(e) }),
  });

  const rejectMut = useMutation({
    mutationFn: rejectLedgerDeletion,
    onSuccess: () => { toast({ title: "Deletion rejected — entry restored" }); setApprovalTarget(null); invalidate(); },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to reject", description: getFriendlyErrorMessage(e) }),
  });

  const selectedCategory = EXPENSE_CATEGORIES.find((c) => c.id === form.category);
  const canSubmit = form.category && form.description.trim() && Number(form.amount) > 0 && form.periodMonth && (!selectedCategory?.requiresDepartment || form.department);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canWrite && (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> New Entry</Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md">
              <SheetHeader>
                <SheetTitle>New Ledger Entry</SheetTitle>
                <SheetDescription>The category drives which P&amp;L line this flows into automatically.</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as LedgerCategoryId, department: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCategory?.requiresDepartment && (
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger>
                      <SelectContent>
                        {PAYROLL_DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. August SMS gateway subscription" />
                </div>
                <div className="space-y-2">
                  <Label>Amount (GHS)</Label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Input type="month" value={form.periodMonth} onChange={(e) => setForm((f) => ({ ...f, periodMonth: e.target.value }))} />
                </div>
              </div>
              <SheetFooter>
                <Button
                  disabled={!canSubmit || createMut.isPending}
                  onClick={() => createMut.mutate({
                    category: form.category as LedgerCategoryId,
                    department: form.department ? (form.department as any) : undefined,
                    description: form.description.trim(),
                    amount: Number(form.amount),
                    periodMonth: form.periodMonth,
                  })}
                >
                  {createMut.isPending ? "Creating…" : "Create Entry"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell>{EXPENSE_CATEGORIES.find((c) => c.id === entry.category)?.label ?? entry.category}{entry.department ? ` — ${entry.department}` : ""}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell className="capitalize">{entry.costType}</TableCell>
                    <TableCell className="text-right">{fmtGhs(entry.amount)}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                        entry.status === "active" && "bg-green-100 text-green-800",
                        entry.status === "pending_deletion" && "bg-amber-100 text-amber-800",
                      )}>
                        {entry.status === "pending_deletion" && <Clock className="h-3 w-3" />}
                        {humanizeStatus(entry.status).replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {entry.status === "active" && canWrite && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(entry)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {entry.status === "pending_deletion" && canDelete && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => setApprovalTarget({ entry, action: "approve" })}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setApprovalTarget({ entry, action: "reject" })}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {data?.data.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No ledger entries for this period</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Deletion</DialogTitle>
            <DialogDescription>This doesn't delete the entry — it flags it for a superadmin to approve or reject.</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label>Reason</Label>
            <Textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="e.g. Duplicate entry" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!deleteReason.trim() || requestDeleteMut.isPending}
              onClick={() => deleteTarget && requestDeleteMut.mutate({ id: deleteTarget._id, reason: deleteReason.trim() })}
            >
              {requestDeleteMut.isPending ? "Requesting…" : "Request Deletion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!approvalTarget} onOpenChange={(v) => !v && setApprovalTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{approvalTarget?.action === "approve" ? "Approve Deletion" : "Reject Deletion"}</DialogTitle>
            <DialogDescription>
              {approvalTarget?.action === "approve"
                ? "This permanently removes the entry from active reporting."
                : "The entry reverts to active and stays in the ledger."}
            </DialogDescription>
          </DialogHeader>
          {approvalTarget?.entry.deletionReason && (
            <p className="text-sm text-muted-foreground">Reason given: "{approvalTarget.entry.deletionReason}"</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalTarget(null)}>Cancel</Button>
            <Button
              variant={approvalTarget?.action === "approve" ? "destructive" : "default"}
              disabled={approveMut.isPending || rejectMut.isPending}
              onClick={() => {
                if (!approvalTarget) return;
                if (approvalTarget.action === "approve") approveMut.mutate(approvalTarget.entry._id);
                else rejectMut.mutate(approvalTarget.entry._id);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Settings (cost of funds rate) ───────────────────────────────────────

function SettingsCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { canWrite } = useAuth();
  const { data: settings } = useQuery({ queryKey: ["accounting-settings"], queryFn: getAccountingSettings });
  const [rate, setRate] = useState<string>("");

  const mut = useMutation({
    mutationFn: (costOfFundsRatePercent: number) => updateAccountingSettings({ costOfFundsRatePercent }),
    onSuccess: () => { toast({ title: "Cost of funds rate updated" }); qc.invalidateQueries({ queryKey: ["accounting-settings"] }); qc.invalidateQueries({ queryKey: ["accounting-pnl"] }); },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to update", description: getFriendlyErrorMessage(e) }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cost of funds</CardTitle>
        <CardDescription>Monthly rate applied to that month's total disbursed principal. Current: {settings?.costOfFundsRatePercent ?? "—"}%/month.</CardDescription>
      </CardHeader>
      {canWrite && (
        <CardContent className="flex items-end gap-3">
          <div className="space-y-2">
            <Label>New rate (%)</Label>
            <Input type="number" step="0.1" placeholder={String(settings?.costOfFundsRatePercent ?? "")} value={rate} onChange={(e) => setRate(e.target.value)} className="w-32" />
          </div>
          <Button disabled={!rate || mut.isPending} onClick={() => mut.mutate(Number(rate))}>{mut.isPending ? "Saving…" : "Update"}</Button>
        </CardContent>
      )}
    </Card>
  );
}

// ── Pages — one per /finance/* route, FinanceLayout provides the shell ──

function PageHeader({ title, month, onMonth }: { title: string; month: string; onMonth: (m: string) => void }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <MonthPicker month={month} onChange={onMonth} />
    </div>
  );
}

export function FinanceOverviewPage() {
  const [month, setMonth] = useState(currentMonth());
  return (
    <div>
      <PageHeader title="Overview" month={month} onMonth={setMonth} />
      <div className="space-y-6">
        <OverviewTab month={month} />
        <SettingsCard />
      </div>
    </div>
  );
}

export function FinancePnlPage() {
  const [month, setMonth] = useState(currentMonth());
  return (
    <div>
      <PageHeader title="P&L" month={month} onMonth={setMonth} />
      <PnlTab month={month} />
    </div>
  );
}

export function FinanceLedgerPage() {
  const [month, setMonth] = useState(currentMonth());
  return (
    <div>
      <PageHeader title="Ledger" month={month} onMonth={setMonth} />
      <LedgerTab month={month} />
    </div>
  );
}

export function FinanceChannelsPage() {
  const [month, setMonth] = useState(currentMonth());
  return (
    <div>
      <PageHeader title="Channels" month={month} onMonth={setMonth} />
      <ChannelsTab month={month} />
    </div>
  );
}

export function FinancePortfolioPage() {
  const [month, setMonth] = useState(currentMonth());
  return (
    <div>
      <PageHeader title="Portfolio" month={month} onMonth={setMonth} />
      <PortfolioTab month={month} />
    </div>
  );
}
