import { AlertCircle, Banknote, BookOpen, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/analytics/KpiCard";
import { fCount, fGHS, fPct } from "@/components/analytics/analytics.helpers";
import { usePortfolio, type PortfolioSnapshot } from "@/components/analytics/portfolio";

/**
 * The portfolio figures, shared by the dashboard home and the Analytics page so
 * the two can never disagree.
 *
 * Two rules this component keeps:
 *   1. A figure is never shown without what it means. Each card states its
 *      definition, in the server's words, and the default rate says it is a
 *      reporting definition.
 *   2. The default rate is never shown alone. Beside it sit the system's own
 *      DEFAULTED figure and the full set of past-due bands, because a default
 *      threshold of many months can read near zero while a large share of the
 *      book is late.
 */

interface HeroProps {
  snapshot: PortfolioSnapshot;
}

export function PortfolioHero({ snapshot }: Readonly<HeroProps>) {
  const { allTimeDisbursement, loanBook, defaultRate, systemDefaulted, definitions } = snapshot;

  return (
    <div className="grid grid-cols-1 gap-[14px] md:grid-cols-3" data-testid="portfolio-hero">
      <KpiCard
        label="All-time disbursement"
        value={fGHS(allTimeDisbursement.valueDisbursed)}
        subtext={`${fCount(allTimeDisbursement.loans)} loans paid out`}
        status="green"
        icon={<Banknote className="h-5 w-5" />}
      />
      <KpiCard
        label="Loan book"
        value={fGHS(loanBook.outstanding)}
        subtext={`Still owed across ${fCount(loanBook.loans)} loans`}
        status="green"
        icon={<BookOpen className="h-5 w-5" />}
      />
      <KpiCard
        label={`Default rate (over ${defaultRate.afterDays} days)`}
        value={fPct(defaultRate.shareOfBookPct)}
        subtext={`${fCount(defaultRate.loans)} loans over ${defaultRate.afterDays} days past due. Marked DEFAULTED in system: ${fPct(systemDefaulted.shareOfBookPct)} (${fCount(systemDefaulted.loans)} loans)`}
        status="neutral"
        icon={<ShieldCheck className="h-5 w-5" />}
      />
    </div>
  );
}

export function PortfolioBands({ snapshot }: Readonly<HeroProps>) {
  const { bands, pastDue, loanBook, systemDefaulted, definitions } = snapshot;

  return (
    <section className="space-y-3 rounded-[14px] border border-border/60 bg-card p-5" aria-labelledby="bands-heading" data-testid="portfolio-bands">
      <div className="space-y-1">
        <h2 id="bands-heading" className="text-sm font-semibold">
          Loan book by days past due
        </h2>
        <p className="text-xs text-muted-foreground">{definitions.pastDue}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Band</th>
              <th className="py-2 pr-4 text-right font-medium">Loans</th>
              <th className="py-2 pr-4 text-right font-medium">Still owed</th>
              <th className="py-2 text-right font-medium">Share of book</th>
            </tr>
          </thead>
          <tbody>
            {bands.map((b) => (
              <tr key={b.key} className="border-b last:border-0" data-testid={`band-${b.key}`}>
                <td className="py-2 pr-4">
                  {b.label}
                  {b.isDefault && <span className="ml-2 text-[11px] text-muted-foreground">default</span>}
                </td>
                <td className="py-2 pr-4 text-right font-mono tabular-nums">{fCount(b.loans)}</td>
                <td className="py-2 pr-4 text-right font-mono tabular-nums">{fGHS(b.outstanding)}</td>
                <td className="py-2 text-right font-mono tabular-nums">{fPct(b.shareOfBookPct)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium" data-testid="band-total">
              <td className="py-2 pr-4">Loan book</td>
              <td className="py-2 pr-4 text-right font-mono tabular-nums">{fCount(loanBook.loans)}</td>
              <td className="py-2 pr-4 text-right font-mono tabular-nums">{fGHS(loanBook.outstanding)}</td>
              <td className="py-2 text-right font-mono tabular-nums">100.0%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <dl className="grid gap-3 border-t pt-3 text-xs sm:grid-cols-2" data-testid="portfolio-summary-lines">
        <div>
          <dt className="font-medium text-foreground">Past due, any length</dt>
          <dd className="text-muted-foreground">
            {fCount(pastDue.loans)} loans, {fGHS(pastDue.outstanding)}, {fPct(pastDue.shareOfBookPct)} of the book
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Marked DEFAULTED in our system</dt>
          <dd className="text-muted-foreground">
            {fCount(systemDefaulted.loans)} loans, {fGHS(systemDefaulted.outstanding)}, {fPct(systemDefaulted.shareOfBookPct)} of the book
          </dd>
        </div>
      </dl>

      <details className="text-xs text-muted-foreground" data-testid="portfolio-definitions">
        <summary className="cursor-pointer font-medium text-foreground">How these figures are defined</summary>
        <dl className="mt-2 space-y-2">
          <div>
            <dt className="font-medium text-foreground">Loan book</dt>
            <dd>{definitions.loanBook}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Default rate</dt>
            <dd>{definitions.defaultRate}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Marked DEFAULTED in our system</dt>
            <dd>{definitions.systemDefault}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}

/** Loading and failure states for anything that needs the snapshot. */
export function PortfolioHealth({ showBands = true }: Readonly<{ showBands?: boolean }>) {
  const q = usePortfolio();

  if (q.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full" />
        {showBands && <Skeleton className="h-56 w-full" />}
      </div>
    );
  }

  if (q.error || !q.data) {
    return (
      <div
        className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        role="alert"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Could not load the portfolio figures.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PortfolioHero snapshot={q.data} />
      {showBands && <PortfolioBands snapshot={q.data} />}
    </div>
  );
}
