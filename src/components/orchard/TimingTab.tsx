import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getRepaymentTiming, type TimingBucket } from "@/api/orchard.api";
import { cn } from "@/lib/utils";
import { busiestSentence, hourLabel, money, ordinal, weekdayName } from "@/lib/orchard-insights";

/** A row of plain CSS bars. Each one says its own value, so it reads without hovering. */
function Bars({
  rows, label, tick, className,
}: {
  rows: TimingBucket[];
  label: (key: number) => string;
  tick?: (key: number) => boolean;
  className?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className={cn("flex items-end gap-1 h-36", className)} role="img" aria-label="Payments per slot">
      {rows.map((r) => (
        <div key={r.key} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full" title={`${label(r.key)}: ${r.count} payment${r.count === 1 ? "" : "s"}, ${money(r.amount)}`}>
          <span className="text-[9px] text-muted-foreground leading-none mb-0.5">{r.count > 0 ? r.count : ""}</span>
          <div
            className={cn("w-full rounded-t", r.count > 0 ? "bg-primary/70" : "bg-muted")}
            style={{ height: `${Math.max(2, (r.count / max) * 100)}%` }}
          />
          <span className="text-[9px] text-muted-foreground mt-1 h-3 leading-none">{!tick || tick(r.key) ? label(r.key) : ""}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * When successful repayments land, in Accra time. Shown for customer-chosen
 * payments by default: auto-debit lands when we or Orchard tried, which describes
 * our schedule and not the customer's habits.
 */
export function TimingTab() {
  const [days, setDays] = useState("90");
  const [customerOnly, setCustomerOnly] = useState(true);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["orchard-repayment-timing", days],
    queryFn: () => getRepaymentTiming(Number(days)),
  });

  if (isLoading) return <Skeleton className="h-72 rounded-xl" />;
  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load this report</AlertTitle>
        <AlertDescription>Try again in a moment.</AlertDescription>
      </Alert>
    );
  }

  const view = customerOnly ? data.customerChosen : data.all;
  const hourSentence = busiestSentence(view.byHour, hourLabel);
  const daySentence = busiestSentence(view.byDayOfMonth, (k) => `the ${ordinal(k)}`);
  const weekSentence = busiestSentence(view.byWeekday, weekdayName);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border p-0.5 bg-muted/40" role="group" aria-label="Which payments to include">
          {[
            { v: true, label: "Customer-chosen only" },
            { v: false, label: "All payments" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={customerOnly === o.v}
              onClick={() => setCustomerOnly(o.v)}
              className={cn("px-3 py-1.5 text-xs rounded", customerOnly === o.v ? "bg-card shadow-sm font-semibold" : "text-muted-foreground")}
            >
              {o.label}
            </button>
          ))}
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="180">Last 180 days</SelectItem>
            <SelectItem value="365">Last 365 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.lowSample && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Too few payments to call this a pattern</AlertTitle>
          <AlertDescription>
            Only {data.customerChosenSampleSize} payments here were chosen by the customer. With so few, the busiest hour
            can just be chance. Treat it as a hint, and don't set retry times from it yet.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>What this can and cannot tell you</AlertTitle>
        <AlertDescription>
          It shows when customers pay, which is when they have money. It cannot see anyone's wallet. Customer-chosen leaves
          out auto-debit, agent and admin-recorded payments, because those land when we tried, not when the customer paid.
          Times are Accra time (UTC).
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Busiest hour", value: hourSentence },
          { label: "Busiest day of the month", value: daySentence },
          { label: "Busiest weekday", value: weekSentence },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-base font-semibold mt-1">{c.value ?? "Not enough payments"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By hour of the day</CardTitle>
          <CardDescription>
            {customerOnly ? data.customerChosenSampleSize : data.sampleSize} payments in the last {data.days} days
          </CardDescription>
        </CardHeader>
        <CardContent><Bars rows={view.byHour} label={hourLabel} tick={(h) => h % 3 === 0} /></CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">By day of the week</CardTitle></CardHeader>
          <CardContent><Bars rows={view.byWeekday} label={(k) => weekdayName(k).slice(0, 3)} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">By day of the month</CardTitle></CardHeader>
          <CardContent><Bars rows={view.byDayOfMonth} label={(k) => String(k)} tick={(k) => k === 1 || k % 5 === 0} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How these payments came in</CardTitle>
          <CardDescription>Every successful repayment in the period, by channel</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {data.byChannel.map((c) => (
              <li key={c.channel} className="flex items-center justify-between py-2">
                <span className="capitalize">{c.channel.replace("_", "-")}</span>
                <span className="text-muted-foreground">{c.count} · {money(c.amount)}</span>
              </li>
            ))}
            {data.byChannel.length === 0 && <li className="py-2 text-muted-foreground">No repayments in this period.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
