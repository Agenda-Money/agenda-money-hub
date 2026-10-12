import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { PlayCircle, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import {
  getRetryReport, getRetrySchedule, setRetrySchedule,
  type RetryPlan, type RetryVerdict,
} from "@/api/orchard.api";
import { money, skipReasonLabel } from "@/lib/orchard-insights";

const SCHEDULE_KEY = ["orchard-retry-schedule"];

function VerdictTable({ rows, empty, showCharge }: { rows: RetryVerdict[]; empty: string; showCharge?: boolean }) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Customer</th>
            <th className="px-4 py-2 text-left font-medium">Loan</th>
            {showCharge && <th className="px-4 py-2 text-right font-medium">Would charge</th>}
            <th className="px-4 py-2 text-right font-medium">Still owed</th>
            <th className="px-4 py-2 text-left font-medium">Why</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr><td colSpan={showCharge ? 5 : 4} className="px-4 py-6 text-center text-muted-foreground">{empty}</td></tr>
          ) : rows.map((v) => (
            <tr key={v.uniqRefId}>
              <td className="px-4 py-2 font-mono text-xs">{v.customer}</td>
              <td className="px-4 py-2 font-mono text-xs">{v.loanReference ?? "—"}</td>
              {showCharge && <td className="px-4 py-2 text-right">{money(v.chargeAmount)}</td>}
              <td className="px-4 py-2 text-right">{money(v.outstanding)}</td>
              <td className="px-4 py-2 text-xs text-muted-foreground">{v.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportResult({ plan }: { plan: RetryPlan }) {
  const skipped = Object.entries(plan.skipped).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active mandates looked at", value: plan.considered },
          { label: "Would be retried", value: plan.wouldRetry.length },
          { label: "Need a person", value: plan.needsAPerson.length },
          { label: "Orchard lookups made", value: plan.statusChecks },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold mt-1">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">As of {format(new Date(plan.asOf), "dd MMM yyyy HH:mm")}. Nothing was charged.</p>

      <div>
        <h3 className="text-sm font-semibold mb-2">Would be retried</h3>
        <VerdictTable rows={plan.wouldRetry} showCharge empty="No mandate qualifies for a retry right now." />
      </div>

      {plan.needsAPerson.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Need a person to look at them</h3>
          <VerdictTable rows={plan.needsAPerson} empty="" />
        </div>
      )}

      {skipped.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Why the others were left alone</h3>
          <ul className="rounded-md border divide-y text-sm">
            {skipped.map(([code, n]) => (
              <li key={code} className="flex items-center justify-between px-4 py-2">
                <span>{skipReasonLabel(code)}</span>
                <span className="font-semibold">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * The automatic debit retry, as a REPORT. It lists which mandates a retry would be
 * made for and why the rest are left alone. Nothing here, and nothing the schedule
 * switch controls, submits a debit.
 */
export function RetryReportTab() {
  const qc = useQueryClient();
  const { canWrite } = useAuth();

  const { data: schedule, isLoading } = useQuery({ queryKey: SCHEDULE_KEY, queryFn: getRetrySchedule });

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => setRetrySchedule(enabled),
    onSuccess: (s) => {
      toast.success(s.enabled ? "Scheduled retry report is on" : "Scheduled retry report is off");
      qc.invalidateQueries({ queryKey: SCHEDULE_KEY });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not change the setting"),
  });

  const run = useMutation({
    mutationFn: getRetryReport,
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not build the report"),
  });

  return (
    <div className="space-y-6">
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Report only. This never charges a customer.</AlertTitle>
        <AlertDescription>
          It shows which mandates an automatic retry would be made for, so you can judge the idea before anything is made
          live. Going live is a separate step that needs refunds in place first.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheduled report</CardTitle>
          <CardDescription>
            When on, the report runs at 08:05, 13:05 and 18:05 and writes its findings to the server log. Switching it on
            or off cannot move money.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{schedule?.enabled ? "On" : "Off"}</p>
            {schedule?.updatedBy && (
              <p className="text-xs text-muted-foreground">
                Last changed by {schedule.updatedBy}
                {schedule.updatedAt ? ` on ${format(new Date(schedule.updatedAt), "dd MMM yyyy HH:mm")}` : ""}
              </p>
            )}
          </div>
          <Switch
            aria-label="Run the retry report on a schedule"
            checked={schedule?.enabled === true}
            disabled={isLoading || toggle.isPending || !canWrite}
            onCheckedChange={(v) => toggle.mutate(v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run it now</CardTitle>
          <CardDescription>
            Checks every active mandate against its loan and asks Orchard for the status of those that pass. It can take a
            few seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" size="sm" onClick={() => run.mutate()} disabled={run.isPending}>
            <PlayCircle className="h-3.5 w-3.5 mr-2" />
            {run.isPending ? "Building report..." : "Run report now"}
          </Button>
          {run.data && <ReportResult plan={run.data} />}
        </CardContent>
      </Card>
    </div>
  );
}
