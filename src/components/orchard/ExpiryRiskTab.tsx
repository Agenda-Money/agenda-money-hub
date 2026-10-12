import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, CalendarX2, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMandateExpiryRisk } from "@/api/orchard.api";
import { cn } from "@/lib/utils";
import { expiryBadge, money, TONE_CLASS, loanStatusTone } from "@/lib/orchard-insights";

export const EXPIRY_QUERY_KEY = ["orchard-expiry-risk"];

export function useExpiryRisk() {
  return useQuery({
    queryKey: EXPIRY_QUERY_KEY,
    queryFn: () => getMandateExpiryRisk(),
    refetchInterval: 5 * 60_000,
  });
}

/**
 * Mandates that have run out, or are about to, while the loan still owes money.
 * A mandate runs for a fixed window and then Orchard stops debiting whether or not
 * the loan is paid, and our own record keeps saying ACTIVE, so this is the only
 * place that says collection has quietly stopped.
 */
export function ExpiryRiskTab() {
  const { data, isLoading, isError } = useExpiryRisk();

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load this report</AlertTitle>
        <AlertDescription>Try again in a moment. Nothing was changed.</AlertDescription>
      </Alert>
    );
  }

  const { summary, rows } = data;
  const cards = [
    { label: "Ended, money still owed", value: summary.endedWithMoneyOwed.mandates, sub: money(summary.endedWithMoneyOwed.owed), icon: CalendarX2, tone: "text-red-600" },
    { label: `Ending within ${data.withinDays} days`, value: summary.endingSoonWithMoneyOwed.mandates, sub: money(summary.endingSoonWithMoneyOwed.owed), icon: Clock, tone: "text-amber-600" },
    { label: "Ending within 3 days", value: summary.within3Days, sub: "act first", icon: AlertTriangle, tone: "text-orange-600" },
    { label: "Ending within 7 days", value: summary.within7Days, sub: "", icon: Clock, tone: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-5">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Why this matters</AlertTitle>
        <AlertDescription className="space-y-1">
          <p>
            Each mandate lasts a fixed window from its start. When it ends, Orchard stops debiting even though the loan
            may not be paid, and the status here still reads Active.
          </p>
          <p>
            These are the loans where automatic collection has stopped, or is about to, and nothing has replaced it. Those
            customers need a new mandate or another way of paying.
          </p>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, sub, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn("h-4 w-4", tone)} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-bold">{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Customer</th>
              <th className="px-4 py-3 text-left font-medium">Loan</th>
              <th className="px-4 py-3 text-right font-medium">Still owed</th>
              <th className="px-4 py-3 text-left font-medium">Mandate end</th>
              <th className="px-4 py-3 text-left font-medium">State</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No mandate is running out while money is owed.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const badge = expiryBadge({ state: r.state, daysLeft: r.daysLeft }, r.outstanding);
                return (
                  <tr key={`${r.msisdn}-${r.loanReference}`} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.customerName ?? "Unknown"}</div>
                      <div className="font-mono text-xs text-muted-foreground">{r.msisdn}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">{r.loanReference}</div>
                      <span className={cn("inline-flex px-2 py-0.5 mt-1 rounded-full text-[10px] font-medium", TONE_CLASS[loanStatusTone(r.loanStatus)])}>
                        {r.loanStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{money(r.outstanding)}</td>
                    <td className="px-4 py-3 text-xs">{format(new Date(r.endDate), "dd MMM yyyy")}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", TONE_CLASS[badge.tone])}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
