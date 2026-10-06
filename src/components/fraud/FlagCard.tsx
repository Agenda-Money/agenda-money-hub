import { useState } from "react";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ruleHint, ruleTitle, SEVERITY_LABEL, type FraudFlag } from "@/lib/fraud";

const SEVERITY_STYLE: Record<FraudFlag["severity"], string> = {
  high: "border-red-300 bg-red-50 text-red-700",
  medium: "border-amber-300 bg-amber-50 text-amber-800",
  low: "border-slate-300 bg-slate-50 text-slate-700",
};

interface Props {
  flag: FraudFlag;
  onConfirm: (flag: FraudFlag) => void;
  onDismiss: (flag: FraudFlag) => void;
}

function fmt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-GH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * One flag, with what triggered it one click away.
 *
 * The summary is written to be acted on by itself. The evidence is the raw
 * facts the rule saw, kept behind a toggle so a reviewer can check the claim
 * before deciding, without every card being a wall of JSON.
 */
export function FlagCard({ flag, onConfirm, onDismiss }: Props) {
  const [open, setOpen] = useState(false);
  const decided = flag.status !== "OPEN";

  return (
    <article className="rounded-lg border bg-card p-4 space-y-3" data-testid="flag-card">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn("font-medium", SEVERITY_STYLE[flag.severity])}>
          {SEVERITY_LABEL[flag.severity]}
        </Badge>
        <span className="text-sm font-semibold">{ruleTitle(flag.rule)}</span>
        {flag.shadow && (
          <Badge variant="secondary" title="This rule is still being tested and is not part of the live queue">
            Testing
          </Badge>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{fmt(flag.createdAt)}</span>
      </div>

      <p className="text-sm">{flag.summary}</p>

      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        {flag.msisdn && (
          <div className="flex gap-1">
            <dt>Customer</dt>
            <dd className="font-mono text-foreground">{flag.msisdn}</dd>
          </div>
        )}
        {flag.loanReference && (
          <div className="flex gap-1">
            <dt>Loan</dt>
            <dd className="font-mono text-foreground">{flag.loanReference}</dd>
          </div>
        )}
        {flag.agentCode && (
          <div className="flex gap-1">
            <dt>Agent</dt>
            <dd className="font-mono text-foreground">{flag.agentCode}</dd>
          </div>
        )}
        {flag.subjectType === "device" && (
          <div className="flex gap-1">
            <dt>Device</dt>
            <dd className="font-mono text-foreground">{flag.subjectKey.slice(0, 8)}…</dd>
          </div>
        )}
        {flag.subjectType === "reference" && (
          <div className="flex gap-1">
            <dt>Reference number</dt>
            <dd className="font-mono text-foreground">{flag.subjectKey}</dd>
          </div>
        )}
      </dl>

      {ruleHint(flag.rule) && <p className="text-xs text-muted-foreground">{ruleHint(flag.rule)}</p>}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        aria-expanded={open}
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {open ? "Hide evidence" : "Show evidence"}
      </button>
      {open && (
        <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs" data-testid="flag-evidence">
          {JSON.stringify(flag.evidence, null, 2)}
        </pre>
      )}

      {decided ? (
        <div className="rounded-md bg-muted/50 p-3 text-xs">
          <span className="font-semibold">
            {flag.status === "CONFIRMED" ? "Confirmed" : "Dismissed"}
          </span>
          {flag.decidedByName ? ` by ${flag.decidedByName}` : ""}
          {flag.decidedAt ? ` on ${fmt(flag.decidedAt)}` : ""}
          {flag.decisionNote && <p className="mt-1 text-muted-foreground">{flag.decisionNote}</p>}
        </div>
      ) : (
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="destructive" onClick={() => onConfirm(flag)}>
            <Check className="mr-1 h-4 w-4" />
            Confirm fraud
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDismiss(flag)}>
            <X className="mr-1 h-4 w-4" />
            Dismiss
          </Button>
        </div>
      )}
    </article>
  );
}
