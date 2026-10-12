import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertTriangle, CalendarX2, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { getMandateExpiryRisk, getRenewalNotices, setRenewalNotices } from "@/api/orchard.api";
import { RenewMandateDialog, type RenewTarget } from "@/components/orchard/RenewMandateDialog";
import { cn } from "@/lib/utils";
import { canRenew, expiryBadge, money, TONE_CLASS, loanStatusTone } from "@/lib/orchard-insights";

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
const NOTICES_KEY = ["orchard-renewal-notices"];

/** The switch for the texts that tell customers their auto-repay is ending, with the wording. */
function NoticesCard() {
  const qc = useQueryClient();
  const { canWrite } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: NOTICES_KEY, queryFn: getRenewalNotices });
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => setRenewalNotices(enabled),
    onSuccess: (s) => {
      toast.success(s.enabled ? "Customers will be texted" : "Renewal texts are off");
      qc.invalidateQueries({ queryKey: NOTICES_KEY });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not change the setting"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Text customers before it ends</CardTitle>
        <CardDescription>
          Once each, at 09:10 daily: five days before the end, and again when it has ended, only while money is owed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium">{data?.enabled ? "On" : "Off"}</p>
          <Switch
            aria-label="Text customers when their auto-repay is ending"
            checked={data?.enabled === true}
            disabled={isLoading || toggle.isPending || !canWrite}
            onCheckedChange={(v) => toggle.mutate(v)}
          />
        </div>
        <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
          <p className="font-medium">What they receive</p>
          <p className="font-mono">Agenda Money: auto-repay for loan AM-123 ends 20 Oct. GHS 120.00 is still due. Pay on *415*102# or call (our support number) to renew.</p>
          <p className="font-mono">Agenda Money: auto-repay for loan AM-123 has ended. GHS 120.00 is still due. Pay on *415*102# or call (our support number).</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExpiryRiskTab() {
  const { canWrite } = useAuth();
  const [renewTarget, setRenewTarget] = useState<RenewTarget | null>(null);
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
              {canWrite && <th className="px-4 py-3 text-right font-medium">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={canWrite ? 6 : 5} className="px-4 py-10 text-center text-muted-foreground">
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
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        {canRenew({ state: r.state, daysLeft: r.daysLeft }, "ACTIVE", r.outstanding) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setRenewTarget({
                                msisdn: r.msisdn,
                                customerName: r.customerName,
                                loanReference: r.loanReference,
                                owed: r.outstanding,
                              })
                            }
                          >
                            Renew
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground" title="Renewing now would end it early">Not yet</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <NoticesCard />
      <RenewMandateDialog target={renewTarget} onClose={() => setRenewTarget(null)} />
    </div>
  );
}
