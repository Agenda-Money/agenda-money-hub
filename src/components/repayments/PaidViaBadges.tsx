import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  VIA_STYLE, sourceTags, viaLabel, viaOf, viaTitle, type RepaymentRow,
} from "@/lib/repayment-via";

/**
 * How a repayment actually came in (auto-debit, USSD, app, agent, admin), plus a
 * second tag when a collections agent or a campaign is behind it. Replaces the
 * old badge that said "Organic" for everything.
 */
export function PaidViaBadges({ row, className }: { row: RepaymentRow; className?: string }) {
  const via = viaOf(row);
  const tags = sourceTags(row);
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      <Badge
        variant="outline"
        title={viaTitle(via)}
        data-via={via.code}
        className={cn("text-[10px] font-bold uppercase tracking-tight px-2", VIA_STYLE[via.code])}
      >
        {viaLabel(via)}
        {via.basis === "traced" && <span className="ml-1 opacity-60" aria-label="worked out from the payment log">*</span>}
      </Badge>
      {tags.map((t) => (
        <Badge key={t} variant="outline" className="text-[10px] font-semibold px-2 bg-pink-500/5 text-pink-700 border-pink-200 dark:text-pink-300 dark:border-pink-900">
          {t}
        </Badge>
      ))}
    </div>
  );
}
