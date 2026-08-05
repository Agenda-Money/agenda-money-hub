import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { getAdminLoanDetail } from "@/lib/api";
import {
  Calendar,
  Clock,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  ArrowDownLeft,
  Loader2,
  Shield,
  CreditCard,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LoanDetailSheetProps {
  loanId: string | null;
  onClose: () => void;
}

const fmt = (n: number) => n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtDateTime = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE:               { label: "Active",          className: "bg-blue-100 text-blue-700 border-blue-200" },
  REPAID:               { label: "Repaid",          className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  OVERDUE:              { label: "Overdue",         className: "bg-red-100 text-red-700 border-red-200" },
  DEFAULTED:            { label: "Defaulted",       className: "bg-red-100 text-red-800 border-red-300" },
  PARTIAL_REPAID:       { label: "Partial",         className: "bg-amber-100 text-amber-700 border-amber-200" },
  PENDING:              { label: "Pending",         className: "bg-gray-100 text-gray-600 border-gray-200" },
  AWAITING_ENDORSEMENT: { label: "Awaiting",        className: "bg-purple-100 text-purple-700 border-purple-200" },
  DISBURSING:           { label: "Disbursing",      className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  DISBURSING_INIT:      { label: "Initiating",      className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  DISBURSEMENT_REVIEW:  { label: "Review Needed",   className: "bg-orange-100 text-orange-700 border-orange-200" },
  REJECTED:             { label: "Rejected",        className: "bg-gray-100 text-gray-500 border-gray-200" },
};

export default function LoanDetailSheet({ loanId, onClose }: LoanDetailSheetProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["loan-detail", loanId],
    queryFn: () => getAdminLoanDetail(loanId!),
    enabled: !!loanId,
    staleTime: 30_000,
  });

  const loan = data?.loan;
  const repayments: any[] = data?.repayments ?? [];
  const summary = data?.summary;

  const status = (loan?.status ?? "").toUpperCase();
  const statusCfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-gray-100 text-gray-600 border-gray-200" };

  const isOverdue = status === "OVERDUE" || status === "DEFAULTED" || (loan?.daysOverdue ?? 0) > 0;
  const isRepaid = status === "REPAID";

  const tenureDays = loan?.tenureDays ?? 0;
  const daysElapsed = loan?.daysElapsed ?? 0;
  const daysRemaining = loan?.daysRemaining ?? null;
  const daysOverdue = loan?.daysOverdue ?? 0;

  // Timeline: how far along the tenure window we are (capped at 100%)
  const timelinePercent = tenureDays > 0
    ? Math.min(100, Math.round((daysElapsed / tenureDays) * 100))
    : 0;

  return (
    <Sheet open={!!loanId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[520px] p-0 flex flex-col overflow-hidden bg-white dark:bg-gray-950"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-base font-black font-mono text-gray-900 dark:text-gray-100 truncate">
                {loan?.loanReference ?? "Loading…"}
              </SheetTitle>
              <SheetDescription className="text-xs text-gray-400 mt-0.5">
                Created {fmtDate(loan?.createdAt)}
              </SheetDescription>
            </div>
            {loan && (
              <Badge
                variant="outline"
                className={cn("shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border", statusCfg.className)}
              >
                {statusCfg.label}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
              <p className="text-xs font-semibold uppercase tracking-widest">Loading loan data…</p>
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-400 px-6">
              <AlertTriangle className="h-8 w-8" />
              <p className="text-sm font-semibold">Failed to load loan details</p>
            </div>
          )}

          {loan && (
            <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-800">

              {/* ── Overdue banner ── */}
              {isOverdue && daysOverdue > 0 && (
                <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">
                    {daysOverdue} day{daysOverdue !== 1 ? "s" : ""} overdue
                  </p>
                </div>
              )}

              {/* ── Tenure timeline ── */}
              <div className="px-6 py-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Loan Timeline</p>
                <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {fmtDate(loan.disbursedAt ?? loan.createdAt)}
                  </span>
                  <span>{tenureDays}d tenure</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {fmtDate(loan.dueDate)}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isRepaid ? "bg-emerald-500" :
                      isOverdue ? "bg-red-500" :
                      "bg-pink-500"
                    )}
                    style={{ width: `${isRepaid ? 100 : timelinePercent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2.5 text-[10px] font-bold text-gray-400">
                  {isRepaid ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Settled
                    </span>
                  ) : isOverdue ? (
                    <span className="text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {daysOverdue}d overdue
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Day {daysElapsed}
                    </span>
                  )}
                  {!isRepaid && daysRemaining !== null && !isOverdue && (
                    <span>{daysRemaining}d remaining</span>
                  )}
                </div>
              </div>

              {/* ── Balance / repayment progress ── */}
              <div className="px-6 py-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Repayment Progress</p>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Balance Due</p>
                    <p className={cn(
                      "text-3xl font-black font-mono",
                      isRepaid ? "text-emerald-600" : isOverdue ? "text-red-600" : "text-gray-900 dark:text-gray-100"
                    )}>
                      ₵{fmt(summary?.balanceRemaining ?? 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Due</p>
                    <p className="text-base font-black font-mono text-gray-600 dark:text-gray-300">₵{fmt(summary?.totalDue ?? 0)}</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isRepaid ? "bg-emerald-500" : "bg-pink-500"
                    )}
                    style={{ width: `${summary?.progressPercent ?? 0}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400">
                  <span className="text-pink-600">₵{fmt(summary?.totalPaid ?? 0)} paid</span>
                  <span>{summary?.progressPercent ?? 0}%</span>
                </div>
              </div>

              {/* ── Financial breakdown ── */}
              <div className="px-6 py-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Financial Breakdown</p>
                <div className="space-y-2.5">
                  {[
                    { label: "Principal",         value: loan.principal,         icon: CreditCard,    color: "text-gray-900 dark:text-gray-100" },
                    { label: "Interest",          value: loan.interestAmount,    icon: TrendingUp,    color: "text-amber-600" },
                    { label: "Processing Fee",    value: loan.processingFee,     icon: Zap,           color: "text-gray-500" },
                    { label: "Amount Disbursed",  value: loan.disbursementAmount,icon: ArrowDownLeft, color: "text-blue-600" },
                    { label: "Total Payable",     value: loan.totalPayable,      icon: Wallet,        color: "text-pink-600" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2.5 text-xs text-gray-500 font-semibold">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {label}
                      </div>
                      <p className={cn("text-sm font-black font-mono", color)}>
                        ₵{fmt(Number(value ?? 0))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Loan meta ── */}
              <div className="px-6 py-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Loan Details</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {[
                    { label: "Purpose",   value: loan.purpose },
                    { label: "Network",   value: loan.network },
                    { label: "Tier",      value: `L${loan.tier}` },
                    { label: "Tenure",    value: `${loan.tenureDays} days` },
                    { label: "Disbursed", value: fmtDate(loan.disbursedAt) },
                    { label: "Due Date",  value: fmtDate(loan.dueDate) },
                    ...(loan.momoResolvedName ? [{ label: "MoMo Name", value: loan.momoResolvedName }] : []),
                    ...(loan.guaranteedByName ? [{ label: "Guarantor", value: loan.guaranteedByName }] : []),
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                      <p className="text-xs font-black text-gray-800 dark:text-gray-200 mt-0.5">{value ?? "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── MoMo name match indicator ── */}
              {loan.momoNameMatch !== null && loan.momoNameMatch !== undefined && (
                <div className="px-6 py-4">
                  <div className={cn(
                    "flex items-center gap-2.5 text-xs font-bold rounded-xl px-4 py-3 border",
                    loan.momoNameMatch
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  )}>
                    <Shield className="h-4 w-4 shrink-0" />
                    {loan.momoNameMatch
                      ? "MoMo name matched account holder"
                      : "MoMo name did NOT match — flagged during onboarding"}
                  </div>
                </div>
              )}

              {/* ── Repayment history ── */}
              <div className="px-6 py-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                  Payment History{repayments.length > 0 ? ` · ${repayments.length}` : ""}
                </p>
                {repayments.length === 0 ? (
                  <div className="text-center py-8 text-gray-300 dark:text-gray-600">
                    <Wallet className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-xs font-semibold">No payments recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...repayments].reverse().map((r: any, i: number) => (
                      <div
                        key={r._id ?? i}
                        className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
                      >
                        <div className="w-8 h-8 shrink-0 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-black text-emerald-600 font-mono">
                              +₵{fmt(Number(r.amount))}
                            </p>
                            <span className="text-[10px] font-bold text-gray-400 shrink-0">
                              {fmtDateTime(r.paidAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                              {r.method?.replace("_", " ") ?? "MoMo"}
                            </span>
                            {r.collectionSource === "csa_collected" && (
                              <span className="text-[10px] font-bold text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                                CSA
                              </span>
                            )}
                            {r.isRebateApplied && (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                Rebate
                              </span>
                            )}
                            {r.reference && (
                              <span className="text-[10px] font-mono text-gray-400 truncate max-w-[140px]">
                                {r.reference}
                              </span>
                            )}
                          </div>
                          {r.notes && (
                            <p className="text-[10px] text-gray-400 mt-1 italic">{r.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Disbursement provider + reference */}
              {(loan.disbursementReference || loan.paystackDisbursementRef) && (
                <div className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Disbursement Ref</p>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded",
                      loan.disbursementProvider === "ORCHARD"
                        ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                        : "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                    )}>
                      {loan.disbursementProvider === "ORCHARD" ? "Orchard" : "Paystack"}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all">
                    {loan.disbursementReference ?? loan.paystackDisbursementRef}
                  </p>
                </div>
              )}

              {/* Bottom spacer */}
              <div className="h-8" />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
