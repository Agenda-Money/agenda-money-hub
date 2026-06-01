import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  XCircle,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScoreBreakdown {
  repaymentHistory: number;
  creditHistoryLength: number;
  recentInquiries: number;
  deviceConsistency: number;
  locationConsistency: number;
  appInstallBehaviour: number;
  formCompletionTime: number;
  formEdits: number;
  copyPaste: number;
  abandonment: number;
  tcsWillingness: number;
  kycAccuracy: number;
  socioEconomic: number;
  callLogsBehaviour: number;
  momoTransactions: number;
  bluetooth: number;
  networkEdges: number;
  fileAppTypes: number;
  ipReputation: number;
  velocityChecks: number;
  syntheticIdentity: number;
  regionalRisk: number;
  seasonality: number;
}

interface DataCompleteness {
  hasRepaymentHistory: boolean;
  hasKycVerified: boolean;
  hasSmsData: boolean;
  hasContactData: boolean;
  hasLocationData: boolean;
  hasDeviceData: boolean;
  hasNetworkConnections: boolean;
  completenessScore: number;
}

export interface AgendaScoreData {
  totalScore: number;
  label: string;
  loanCeilingPct: number;
  breakdown: ScoreBreakdown;
  dataCompleteness: DataCompleteness;
  flags: string[];
  triggeredBy: string;
  calculatedAt: string;
  version: string;
}

interface AgendaScoreSheetProps {
  score: AgendaScoreData | null;
  open: boolean;
  onClose: () => void;
  customerName?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const WEIGHTS: Record<keyof ScoreBreakdown, number> = {
  repaymentHistory:    15,
  creditHistoryLength:  2,
  recentInquiries:      2,
  deviceConsistency:    4,
  locationConsistency:  3,
  appInstallBehaviour:  1,
  formCompletionTime:   1,
  formEdits:            1,
  copyPaste:            1,
  abandonment:          1,
  tcsWillingness:       1,
  kycAccuracy:         10,
  socioEconomic:        6,
  callLogsBehaviour:    5,
  momoTransactions:     8,
  bluetooth:            1,
  networkEdges:        10,
  fileAppTypes:         2,
  ipReputation:         2,
  velocityChecks:       2,
  syntheticIdentity:    5,
  regionalRisk:         5,
  seasonality:          5,
};

const VARIABLE_LABELS: Record<keyof ScoreBreakdown, string> = {
  repaymentHistory:    "Repayment History",
  creditHistoryLength: "Credit History Length",
  recentInquiries:     "Recent Loan Inquiries",
  deviceConsistency:   "Device Consistency",
  locationConsistency: "Location Consistency",
  appInstallBehaviour: "App Install Behaviour",
  formCompletionTime:  "Form Completion Time",
  formEdits:           "Form Edits",
  copyPaste:           "Copy-Paste Behaviour",
  abandonment:         "Abandonment Pattern",
  tcsWillingness:      "T&Cs Willingness",
  kycAccuracy:         "KYC Accuracy",
  socioEconomic:       "Socio-Economic Profile",
  callLogsBehaviour:   "Call Logs Behaviour",
  momoTransactions:    "MoMo Transaction History",
  bluetooth:           "Bluetooth Presence",
  networkEdges:        "Network & Referral Quality",
  fileAppTypes:        "App Type Profile",
  ipReputation:        "IP Reputation",
  velocityChecks:      "Application Velocity",
  syntheticIdentity:   "Synthetic Identity Risk",
  regionalRisk:        "Regional Risk",
  seasonality:         "Seasonal Risk",
};

type CategoryKey = "repayment" | "kyc" | "network" | "momo" | "device" | "risk";

const CATEGORIES: { key: CategoryKey; label: string; variables: (keyof ScoreBreakdown)[] }[] = [
  {
    key: "repayment",
    label: "Repayment & Credit",
    variables: ["repaymentHistory", "creditHistoryLength", "recentInquiries"],
  },
  {
    key: "kyc",
    label: "KYC & Identity",
    variables: ["kycAccuracy", "syntheticIdentity"],
  },
  {
    key: "network",
    label: "Network & Socio-Economic",
    variables: ["networkEdges", "socioEconomic"],
  },
  {
    key: "momo",
    label: "MoMo & Call Activity",
    variables: ["momoTransactions", "callLogsBehaviour"],
  },
  {
    key: "device",
    label: "Device & Behaviour",
    variables: [
      "deviceConsistency",
      "locationConsistency",
      "appInstallBehaviour",
      "formCompletionTime",
      "formEdits",
      "copyPaste",
      "abandonment",
      "tcsWillingness",
      "bluetooth",
      "fileAppTypes",
    ],
  },
  {
    key: "risk",
    label: "Risk Signals",
    variables: ["ipReputation", "velocityChecks", "regionalRisk", "seasonality"],
  },
];

const COMPLETENESS_LABELS: Record<keyof Omit<DataCompleteness, "completenessScore">, string> = {
  hasRepaymentHistory:  "Repayment history",
  hasKycVerified:       "KYC verified",
  hasSmsData:           "SMS data",
  hasContactData:       "Contact data",
  hasLocationData:      "Location data",
  hasDeviceData:        "Device data",
  hasNetworkConnections: "Network connections",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreMeta(score: number): { color: string; bg: string; label: string } {
  if (score >= 75) return { color: "text-emerald-500", bg: "bg-emerald-500", label: "Excellent" };
  if (score >= 55) return { color: "text-teal-400",   bg: "bg-teal-400",   label: "Good" };
  if (score >= 35) return { color: "text-amber-400",  bg: "bg-amber-400",  label: "Fair" };
  if (score >= 20) return { color: "text-orange-500", bg: "bg-orange-500", label: "Poor" };
  return              { color: "text-rose-500",   bg: "bg-rose-500",   label: "High Risk" };
}

function variableRatio(earned: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(1, earned / max);
}

function VariableBar({ label, earned, max }: { label: string; earned: number; max: number }) {
  const ratio = variableRatio(earned, max);
  const pct = Math.round(ratio * 100);
  const meta = scoreMeta(ratio >= 0.75 ? 75 : ratio >= 0.55 ? 55 : ratio >= 0.35 ? 35 : ratio >= 0.2 ? 20 : 0);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium tabular-nums">
          {earned.toFixed(1)}<span className="text-muted-foreground">/{max}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", meta.bg)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AgendaScoreSheet({ score, open, onClose, customerName }: AgendaScoreSheetProps) {
  if (!score) return null;

  const meta = scoreMeta(score.totalScore);
  const circumference = 2 * Math.PI * 40;
  const strokeDasharray = `${(score.totalScore / 100) * circumference} ${circumference}`;

  const triggeredLabel: Record<string, string> = {
    loan_application: "Loan application",
    repayment:        "Repayment",
    batch:            "Weekly batch",
    manual:           "Manual trigger",
    scheduled:        "Scheduled refresh",
    kyc_change:       "KYC change",
    signal_received:  "Signal received",
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* ── Header ── */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-pink-50/60 to-transparent dark:from-pink-950/20">
          <SheetTitle className="text-base font-semibold">
            Agenda Score
            {customerName && <span className="text-muted-foreground font-normal ml-2">· {customerName}</span>}
          </SheetTitle>

          {/* Big gauge */}
          <div className="flex items-center gap-6 pt-3">
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
                <motion.circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeLinecap="round"
                  className={meta.color}
                  initial={{ strokeDasharray: `0 ${circumference}` }}
                  animate={{ strokeDasharray }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-2xl font-black", meta.color)}>{score.totalScore}</span>
                <span className="text-[10px] text-muted-foreground">/ 100</span>
              </div>
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className={cn("text-lg font-bold", meta.color)}>{meta.label}</div>
              <div className="text-xs text-muted-foreground">
                Loan ceiling: <span className="font-semibold text-foreground">{score.loanCeilingPct}%</span> of tier max
              </div>
              <div className="text-xs text-muted-foreground">
                Scored <span className="font-medium text-foreground">{formatDistanceToNow(new Date(score.calculatedAt), { addSuffix: true })}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Trigger: <span className="font-medium text-foreground">{triggeredLabel[score.triggeredBy] ?? score.triggeredBy}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-5 space-y-6">

          {/* ── Flags ── */}
          {score.flags.length > 0 && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
                <AlertTriangle className="h-4 w-4" />
                Risk Flags
              </div>
              <ul className="space-y-1">
                {score.flags.map((f, i) => (
                  <li key={i} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Data Completeness ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Data Completeness</p>
              <span className="text-xs font-bold tabular-nums">{score.dataCompleteness.completenessScore}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${score.dataCompleteness.completenessScore}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {(Object.keys(COMPLETENESS_LABELS) as (keyof typeof COMPLETENESS_LABELS)[]).map((key) => {
                const present = score.dataCompleteness[key];
                return (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    {present
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
                    <span className={present ? "text-foreground" : "text-muted-foreground/50"}>
                      {COMPLETENESS_LABELS[key]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Score Breakdown by Category ── */}
          <div className="space-y-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Score Breakdown</p>

            {CATEGORIES.map((cat) => {
              const catEarned = cat.variables.reduce((s, v) => s + (score.breakdown[v] ?? 0), 0);
              const catMax = cat.variables.reduce((s, v) => s + WEIGHTS[v], 0);

              return (
                <div key={cat.key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">{cat.label}</p>
                    <span className="text-xs font-mono text-muted-foreground tabular-nums">
                      {catEarned.toFixed(1)}<span className="opacity-50">/{catMax}</span>
                    </span>
                  </div>
                  <div className="pl-3 border-l-2 border-muted space-y-3">
                    {cat.variables.map((variable) => (
                      <VariableBar
                        key={variable}
                        label={VARIABLE_LABELS[variable]}
                        earned={score.breakdown[variable] ?? 0}
                        max={WEIGHTS[variable]}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Footer ── */}
          <p className="text-[10px] text-muted-foreground/50 text-center pb-2">
            v{score.version} · Score expires after 7 days and is recalculated on repayment or KYC change
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
