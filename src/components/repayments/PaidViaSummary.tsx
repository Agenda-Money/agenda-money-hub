import { cn } from "@/lib/utils";
import {
  VIA_STYLE, summariseByVia, type PaidViaCode, type RepaymentRow,
} from "@/lib/repayment-via";

/**
 * One chip per way money came in, with a count and an amount, that also filters the
 * list. Built from the rows loaded, so it says so rather than claiming a total.
 */
export function PaidViaSummary({
  rows, active, onChange,
}: {
  rows: RepaymentRow[];
  active: PaidViaCode | "ALL";
  onChange: (code: PaidViaCode | "ALL") => void;
}) {
  const summary = summariseByVia(rows);
  if (summary.length === 0) return null;
  const total = rows.reduce((s, r) => s + Number(r.amountPaid ?? 0), 0);

  const chip = (selected: boolean) =>
    cn(
      "rounded-2xl border px-3 py-2 text-left transition-colors",
      selected ? "ring-2 ring-primary/40" : "hover:bg-muted/40",
    );
  const money = (n: number) => `₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by how the payment came in">
        <button type="button" onClick={() => onChange("ALL")} className={cn(chip(active === "ALL"), "bg-card border-border")} aria-pressed={active === "ALL"}>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">All</p>
          <p className="text-sm font-bold">{rows.length} · {money(total)}</p>
        </button>
        {summary.map((s) => (
          <button
            key={s.code}
            type="button"
            onClick={() => onChange(active === s.code ? "ALL" : s.code)}
            className={cn(chip(active === s.code), VIA_STYLE[s.code])}
            aria-pressed={active === s.code}
          >
            <p className="text-[10px] font-bold uppercase">{s.label}</p>
            <p className="text-sm font-bold">{s.count} · {money(s.amount)}</p>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Counts cover the payments loaded below. A * means the channel was worked out from the payment log because
        the payment did not record it.
      </p>
    </div>
  );
}
