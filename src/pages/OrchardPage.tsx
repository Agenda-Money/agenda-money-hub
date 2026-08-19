import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  RefreshCw, MoreHorizontal, AlertCircle, Clock,
  PauseCircle, XCircle, CheckCircle2, KeyRound,
  Users, Wallet, Zap,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAuth } from "@/contexts/AuthContext";
import {
  listOrchardMandates, suspendOrchardMandate, resumeOrchardMandate,
  cancelOrchardMandate, resendOrchardOtp, syncOrchardMandate,
  forceRetryOrchardDebit, checkOrchardWalletBalance,
  type OrchardMandate, type OrchardMandateStatus,
} from "@/api/orchard.api";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<OrchardMandateStatus, { label: string; color: string }> = {
  ACTIVE:       { label: "Active",       color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  PENDING_OTP:  { label: "Pending OTP",  color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  SUSPENDED:    { label: "Suspended",    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  CANCELLED:    { label: "Cancelled",    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  EXPIRED:      { label: "Expired",      color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

function StatusBadge({ status }: { status: OrchardMandateStatus }) {
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

// Turns "wallet_balance" / "walletBalance" into "Wallet balance" for any
// field Orchard's response happens to include beyond the standard
// resp_code/resp_desc/trans_id envelope — keeps this working even if the
// exact balance field name shifts, without falling back to a raw JSON dump.
function humanizeKey(key: string): string {
  const spaced = key.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const lower = spaced.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function formatBalanceValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}

function BalanceResult({ data }: { data: Record<string, unknown> }) {
  const { resp_code, resp_desc, trans_id, ...rest } = data;
  const otherEntries = Object.entries(rest).filter(([, v]) => v !== undefined);
  const succeeded = resp_code === "000" || resp_code === "027" || String(resp_code ?? "").startsWith("000");

  return (
    <div className="rounded-md border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
          succeeded ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
        )}>
          {succeeded ? "Success" : "Attention"}
        </span>
        {typeof resp_desc === "string" && <span className="text-sm">{resp_desc}</span>}
      </div>
      {otherEntries.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {otherEntries.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{humanizeKey(key)}</dt>
              <dd className="font-medium text-right">{formatBalanceValue(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {typeof trans_id === "string" && (
        <p className="text-xs text-muted-foreground font-mono pt-1 border-t">Ref: {trans_id}</p>
      )}
    </div>
  );
}

// DD+4: the mandate's start_date is set 4 days after the loan's actual due
// date (see AUTO_DEBIT_GRACE_DAYS in backend loan.service.ts), giving the
// borrower room to self-repay before auto-debit kicks in. Reversing that
// here recovers the loan's due date without a separate API call.
const AUTO_DEBIT_GRACE_DAYS = 4;

function fmtShortDate(date?: string) {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy");
}

function getLoanDueDate(startDate?: string): Date | undefined {
  if (!startDate) return undefined;
  const d = new Date(startDate);
  d.setDate(d.getDate() - AUTO_DEBIT_GRACE_DAYS);
  return d;
}

function getTriggerCountdown(startDate?: string): { label: string; tone: "muted" | "warning" | "done" } {
  if (!startDate) return { label: "—", tone: "muted" };
  const diffDays = Math.round((new Date(startDate).getTime() - Date.now()) / 86_400_000);
  if (diffDays > 0) return { label: `in ${diffDays} day${diffDays === 1 ? "" : "s"}`, tone: "muted" };
  if (diffDays === 0) return { label: "today", tone: "warning" };
  return { label: `${-diffDays} day${diffDays === -1 ? "" : "s"} ago`, tone: "done" };
}

// ── Overview Tab ───────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: mandates, isLoading } = useQuery({
    queryKey: ["orchard-mandates", "all"],
    queryFn: () => listOrchardMandates(),
    refetchInterval: 30_000,
  });

  const balanceMut = useMutation({
    mutationFn: checkOrchardWalletBalance,
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not reach Orchard"),
  });

  const counts = {
    active: mandates?.filter(m => m.status === "ACTIVE").length ?? 0,
    pendingOtp: mandates?.filter(m => m.status === "PENDING_OTP").length ?? 0,
    suspended: mandates?.filter(m => m.status === "SUSPENDED").length ?? 0,
    inactive: mandates?.filter(m => m.status === "CANCELLED" || m.status === "EXPIRED").length ?? 0,
    total: mandates?.length ?? 0,
  };

  const totalSuccessful = mandates?.reduce((sum, m) => sum + m.totalDebitsSuccessful, 0) ?? 0;
  const totalFailed = mandates?.reduce((sum, m) => sum + m.totalDebitsFailed, 0) ?? 0;
  const successRate = totalSuccessful + totalFailed > 0
    ? Math.round((totalSuccessful / (totalSuccessful + totalFailed)) * 100)
    : null;

  const cards = [
    { label: "Active Mandates",   value: counts.active,     icon: CheckCircle2, color: "text-green-600" },
    { label: "Pending OTP",       value: counts.pendingOtp, icon: Clock,        color: "text-yellow-600" },
    { label: "Suspended",        value: counts.suspended,  icon: PauseCircle,  color: "text-orange-500" },
    { label: "Cancelled/Expired", value: counts.inactive,   icon: XCircle,      color: "text-gray-500" },
    { label: "Total Mandates",   value: counts.total,      icon: Users,        color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn("h-4 w-4", color)} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-bold">{isLoading ? "—" : value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">Debit Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-green-600">{isLoading ? "—" : totalSuccessful}</p>
              <p className="text-sm text-muted-foreground mt-1">Successful Debits</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-600">{isLoading ? "—" : totalFailed}</p>
              <p className="text-sm text-muted-foreground mt-1">Failed Debits</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{isLoading ? "—" : successRate !== null ? `${successRate}%` : "—"}</p>
              <p className="text-sm text-muted-foreground mt-1">Success Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" /> Orchard Wallet Balance
          </CardTitle>
          <CardDescription>This wallet is topped up via bank transfer — the balance below won't reflect a same-day top-up</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" size="sm" onClick={() => balanceMut.mutate()} disabled={balanceMut.isPending}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-2", balanceMut.isPending && "animate-spin")} />
            {balanceMut.isPending ? "Checking..." : "Check Balance"}
          </Button>
          {balanceMut.data && <BalanceResult data={balanceMut.data} />}
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
  const [cancelTarget, setCancelTarget] = useState<OrchardMandate | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: mandates, isLoading } = useQuery({
    queryKey: ["orchard-mandates", statusFilter],
    queryFn: () => listOrchardMandates((statusFilter || undefined) as OrchardMandateStatus | undefined),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["orchard-mandates"] });

  const suspendMut = useMutation({ mutationFn: suspendOrchardMandate, onSuccess: () => { toast.success("Mandate suspended"); invalidate(); } });
  const resumeMut = useMutation({ mutationFn: resumeOrchardMandate, onSuccess: () => { toast.success("Mandate resumed"); invalidate(); } });
  const resendOtpMut = useMutation({ mutationFn: resendOrchardOtp, onSuccess: () => { toast.success("OTP resent to customer"); invalidate(); } });
  const syncMut = useMutation({ mutationFn: syncOrchardMandate, onSuccess: () => { toast.success("Synced from Orchard"); invalidate(); } });
  const forceRetryMut = useMutation({
    mutationFn: forceRetryOrchardDebit,
    onSuccess: () => { toast.success("Retry debit triggered"); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Retry failed"),
  });
  const cancelMut = useMutation({
    mutationFn: ({ msisdn, reason }: { msisdn: string; reason: string }) => cancelOrchardMandate(msisdn, reason),
    onSuccess: () => { toast.success("Mandate cancelled"); setCancelTarget(null); invalidate(); },
  });

  const rows = mandates ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <th className="px-4 py-3 text-left font-medium">Network</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Loan Ref</th>
              <th className="px-4 py-3 text-left font-medium">Amount / Cycle</th>
              <th className="px-4 py-3 text-left font-medium">Due Date / Auto-Debit (DD+4)</th>
              <th className="px-4 py-3 text-left font-medium">Last Debit</th>
              <th className="px-4 py-3 text-left font-medium">Orchard Retries</th>
              {canWrite && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No mandates found</td></tr>
            ) : rows.map((m) => {
              const dueDate = getLoanDueDate(m.startDate);
              const countdown = getTriggerCountdown(m.startDate);
              return (
              <tr key={m._id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{m.msisdn}</td>
                <td className="px-4 py-3">{m.network}</td>
                <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-3 font-mono text-xs">{m.currentLoanReference ?? "—"}</td>
                <td className="px-4 py-3">{fmtGhs(m.currentDebitAmount)}{m.cycle ? ` / ${m.cycle}` : ""}</td>
                <td className="px-4 py-3 text-xs">
                  <div className="text-muted-foreground">Due {dueDate ? fmtShortDate(dueDate.toISOString()) : "—"}</div>
                  <div className={cn(
                    "font-medium",
                    countdown.tone === "warning" && "text-orange-600 dark:text-orange-400",
                    countdown.tone === "done" && "text-muted-foreground",
                  )}>
                    Debit {fmtShortDate(m.startDate)} ({countdown.label})
                  </div>
                </td>
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
                        {m.status === "PENDING_OTP" && (
                          <DropdownMenuItem onClick={() => resendOtpMut.mutate(m.msisdn)}>
                            <KeyRound className="h-3.5 w-3.5 mr-2 text-blue-500" /> Resend OTP
                          </DropdownMenuItem>
                        )}
                        {m.status === "ACTIVE" && (
                          <DropdownMenuItem onClick={() => suspendMut.mutate(m.msisdn)}>
                            <PauseCircle className="h-3.5 w-3.5 mr-2" /> Suspend
                          </DropdownMenuItem>
                        )}
                        {m.status === "ACTIVE" && !!m.currentDebitAmount && (
                          <DropdownMenuItem onClick={() => forceRetryMut.mutate(m.msisdn)}>
                            <Zap className="h-3.5 w-3.5 mr-2 text-amber-500" /> Force Retry Debit
                          </DropdownMenuItem>
                        )}
                        {m.status === "SUSPENDED" && (
                          <DropdownMenuItem onClick={() => resumeMut.mutate(m.msisdn)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500" /> Resume
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => syncMut.mutate(m.msisdn)}>
                          <RefreshCw className="h-3.5 w-3.5 mr-2" /> Sync from Orchard
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
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!cancelTarget} onOpenChange={v => !v && setCancelTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Mandate</DialogTitle>
            <DialogDescription>This will permanently stop auto-debit for {cancelTarget?.msisdn}.</DialogDescription>
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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function OrchardPage() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const validTabs = ["overview", "mandates"];
  const activeTab = validTabs.includes(tab ?? "") ? tab! : "overview";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Orchard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Auto-debit mandates via Orchard (ANM Gateway) — recurring repayment collection
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={val => navigate(`/admin/orchard/${val}`)}>
          <TabsList className="bg-muted p-1 flex overflow-x-auto w-full sm:w-fit no-scrollbar">
            <TabsTrigger value="overview" className="data-[state=active]:bg-card">Overview</TabsTrigger>
            <TabsTrigger value="mandates" className="data-[state=active]:bg-card">Mandates</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
          <TabsContent value="mandates" className="mt-4"><MandatesTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
