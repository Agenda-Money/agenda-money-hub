// Near-term liquidity for the admin dashboard.
//
// The question is "will there be enough float this week", and the repayment
// total does not answer it. A borrower who repays on time is promoted a tier,
// so they come back eligible for more than they just paid back. Serving the
// same people again therefore costs more than they return, and the difference
// is what has to be funded.
//
// Three figures rather than one, deliberately. A single number here would be a
// guess presented as a fact, and the spread between them is itself the useful
// information: how exposed the week is to everyone turning up at once.
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fGHS, fCount, safeNum } from "./analytics.helpers";
import { useCashflowProjection } from "./analytics.hooks";

interface CashflowProjectionData {
  window: { from: string; to: string; days: number };
  due: {
    loans: number;
    borrowers: number;
    expectedInflow: number;
    byDay: Array<{ date: string; loans: number; amount: number }>;
  };
  reapplication: {
    grossOutflow: number;
    outflowAtCurrentTier: number;
    promotedBorrowers: number;
    observedTakeUpRate: number | null;
    takeUpSample: number;
    expectedOutflow: number | null;
  };
  net: { grossRequirement: number; expectedRequirement: number | null };
}

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });

/**
 * The compact version for the main dashboard: what is due, what it costs to
 * serve it again, and the gap. Everything else lives on the Analytics page.
 */
export function CashflowProjectionCard({ days = 7 }: Readonly<{ days?: number }>) {
  const { data, loading, error } = useCashflowProjection(days);
  const d = data as CashflowProjectionData | undefined;

  if (error) {
    return (
      <Card className="p-4 sm:p-6">
        <p className="text-xs font-bold text-red-500">Could not load the cashflow projection.</p>
      </Card>
    );
  }

  const requirement = d?.net.expectedRequirement ?? d?.net.grossRequirement ?? 0;
  const isExpected = d?.net.expectedRequirement != null;
  // A surplus is the good case and should not read as a funding need.
  const shortfall = requirement > 0;

  return (
    <Card className="p-4 sm:p-6 w-full min-w-0">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Cash required · next {d?.window.days ?? days} days
          </p>
          <p
            className={cn(
              "text-2xl sm:text-3xl font-black mt-1 tabular-nums",
              shortfall ? "text-pink-600" : "text-emerald-600",
            )}
          >
            {loading && !d ? "—" : fGHS(Math.abs(requirement))}
          </p>
          <p className="text-[11px] font-medium text-gray-500 mt-1">
            {loading && !d
              ? "Working it out…"
              : shortfall
                ? `to serve ${fCount(d?.due.borrowers)} borrowers coming back`
                : "surplus — repayments exceed what re-lending would cost"}
            {isExpected && d?.reapplication.observedTakeUpRate != null && (
              <> · at the observed {(d.reapplication.observedTakeUpRate * 100).toFixed(0)}% return rate</>
            )}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Falling due</p>
          <p className="text-xl font-black text-gray-900 dark:text-gray-100 tabular-nums mt-1">
            {loading && !d ? "—" : fCount(d?.due.loans)}
          </p>
          <p className="text-[11px] font-medium text-gray-500">{fGHS(d?.due.expectedInflow)} in</p>
        </div>
      </div>

      {d && (
        <div className="mt-4 pt-4 border-t grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Figure label="Repayments in" value={fGHS(d.due.expectedInflow)} />
          <Figure
            label="Re-lending out"
            value={fGHS(d.reapplication.expectedOutflow ?? d.reapplication.grossOutflow)}
            hint={d.reapplication.expectedOutflow != null ? "expected" : "if all return"}
          />
          <Figure
            label="If all return"
            value={fGHS(d.net.grossRequirement)}
            hint="worst case"
          />
        </div>
      )}

      {/* The promotion rule is why outflow exceeds inflow, and it is not
          obvious from the numbers alone — so it is stated rather than left to
          be inferred. */}
      {d && d.reapplication.promotedBorrowers > 0 && (
        <p className="text-[11px] font-medium text-gray-500 mt-3">
          {fCount(d.reapplication.promotedBorrowers)} of these borrowers move up a tier if they repay
          on time, so they return eligible for more than they paid back.
        </p>
      )}
    </Card>
  );
}

function Figure({ label, value, hint }: Readonly<{ label: string; value: string; hint?: string }>) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-sm font-black text-gray-900 dark:text-gray-100 tabular-nums mt-0.5 truncate">
        {value}
      </p>
      {hint && <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{hint}</p>}
    </div>
  );
}

/**
 * The full breakdown for the Analytics page: the three scenarios side by side,
 * the basis of the expected figure, and the day-by-day shape of the week.
 */
export function CashflowProjectionPanel({ days = 7 }: Readonly<{ days?: number }>) {
  const { data, loading, error } = useCashflowProjection(days);
  const d = data as CashflowProjectionData | undefined;

  if (error) {
    return (
      <Card className="p-4 sm:p-6">
        <p className="text-xs font-bold text-red-500">Could not load the cashflow projection.</p>
      </Card>
    );
  }
  if (!d) {
    return (
      <Card className="p-4 sm:p-6">
        <p className="text-xs font-bold text-gray-400">{loading ? "Loading…" : "No data."}</p>
      </Card>
    );
  }

  const peak = Math.max(...d.due.byDay.map((x) => x.amount), 1);

  return (
    <Card className="p-4 sm:p-6 w-full min-w-0 space-y-6">
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-gray-100">
          Cashflow · next {d.window.days} days
        </h3>
        <p className="text-[11px] font-medium text-gray-500 mt-1">
          {fCount(d.due.loans)} loans from {fCount(d.due.borrowers)} borrowers fall due, returning{" "}
          {fGHS(d.due.expectedInflow)}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Scenario
          label="If all return"
          out={d.reapplication.grossOutflow}
          net={d.net.grossRequirement}
          note="every borrower re-applies at the ceiling they would then qualify for"
        />
        <Scenario
          label="Expected"
          out={d.reapplication.expectedOutflow}
          net={d.net.expectedRequirement}
          note={
            d.reapplication.observedTakeUpRate != null
              ? `${(d.reapplication.observedTakeUpRate * 100).toFixed(0)}% of the last ${fCount(
                  d.reapplication.takeUpSample,
                )} repayers came back within 14 days`
              : `not enough repayment history yet — ${fCount(
                  d.reapplication.takeUpSample,
                )} repayers in 90 days, and this needs 20`
          }
          highlight
        />
        <Scenario
          label="If none are promoted"
          out={d.reapplication.outflowAtCurrentTier}
          net={d.reapplication.outflowAtCurrentTier - d.due.expectedInflow}
          note="the floor, reached only if every borrower repays late and holds their tier"
        />
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
          Repayments by day
        </p>
        {d.due.byDay.length === 0 ? (
          <p className="text-[11px] font-medium text-gray-400">Nothing falls due in this window.</p>
        ) : (
          <div className="flex items-end gap-2 h-28 bg-pink-50/20 dark:bg-gray-800/20 p-3 rounded-2xl overflow-x-auto">
            {d.due.byDay.map((day) => (
              <div key={day.date} className="flex-1 min-w-[36px] flex flex-col items-center gap-1.5 group">
                <span className="text-[9px] font-bold text-gray-500 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                  {fGHS(day.amount)}
                </span>
                <div
                  className="w-full rounded-t-lg bg-pink-200 dark:bg-gray-700 group-hover:bg-pink-500 transition-colors"
                  style={{ height: `${(day.amount / peak) * 100}%`, minHeight: "6px" }}
                />
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter whitespace-nowrap">
                  {dayLabel(day.date)}
                </span>
                <span className="text-[8px] font-bold text-gray-400 tabular-nums">{day.loans}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function Scenario({
  label,
  out,
  net,
  note,
  highlight,
}: Readonly<{
  label: string;
  out: number | null;
  net: number | null;
  note: string;
  highlight?: boolean;
}>) {
  const unavailable = out == null || net == null;
  return (
    <div
      className={cn(
        "p-3 rounded-2xl border min-w-0",
        highlight
          ? "border-pink-200 bg-pink-50/40 dark:border-pink-900/40 dark:bg-pink-900/10"
          : "border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50",
      )}
    >
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-lg font-black text-gray-900 dark:text-gray-100 tabular-nums mt-1">
        {unavailable ? "—" : fGHS(safeNum(net))}
      </p>
      <p className="text-[10px] font-bold text-gray-500 mt-0.5">
        {unavailable ? "unavailable" : `${fGHS(safeNum(out))} out`}
      </p>
      <p className="text-[10px] font-medium text-gray-400 mt-2 leading-snug">{note}</p>
    </div>
  );
}
