import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Clock, PlayCircle, ShieldCheck, Zap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import {
  getRetryReport, getRetryRuns, getRetrySchedule, setRetryLive, setRetrySchedule,
  type RetryPlan, type RetryRun, type RetryVerdict,
} from "@/api/orchard.api";
import { cn } from "@/lib/utils";
import { money, skipReasonLabel, slotLabel } from "@/lib/orchard-insights";

const SCHEDULE_KEY = ["orchard-retry-schedule"];
const RUNS_KEY = ["orchard-retry-runs"];

const OUTCOME_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  LOAN_NOT_ELIGIBLE: "Loan no longer owed",
  REFUSED: "Orchard refused",
  ERROR: "Could not send",
};

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

function RunRow({ run }: { run: RetryRun }) {
  const [open, setOpen] = useState(false);
  const submitted = run.attempts.filter((a) => a.outcome === "SUBMITTED").length;
  const problems = run.attempts.length - submitted;
  const live = run.mode === "LIVE";

  return (
    <>
      <tr className="hover:bg-muted/30">
        <td className="px-4 py-2 text-xs">{format(new Date(run.createdAt), "dd MMM HH:mm")}</td>
        <td className="px-4 py-2">
          <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold", live ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400")}>
            {live ? "Live" : "Report"}
          </span>
        </td>
        <td className="px-4 py-2 text-xs">{slotLabel(run.slotHour)}</td>
        <td className="px-4 py-2 text-right">{run.considered}</td>
        <td className="px-4 py-2 text-right">{run.wouldRetry}</td>
        <td className="px-4 py-2 text-right font-semibold">{live ? submitted : "—"}</td>
        <td className="px-4 py-2 text-xs">
          {run.abortedReason ? (
            <span className="text-red-600" title={run.abortedReason}>Stopped itself</span>
          ) : run.capped ? (
            <span className="text-amber-600">Hit the per-run limit</span>
          ) : problems > 0 ? (
            <span className="text-amber-600">{problems} not submitted</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-2 text-right">
          {run.attempts.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? "Hide" : "Who"}
            </Button>
          )}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} className="px-4 pb-3 bg-muted/20">
            {run.abortedReason && <p className="text-xs text-red-600 py-2">{run.abortedReason}</p>}
            <ul className="text-xs divide-y">
              {run.attempts.map((a, i) => (
                <li key={`${a.customer}-${i}`} className="flex items-center justify-between py-1.5 gap-3">
                  <span className="font-mono">{a.customer} · {a.loanReference ?? "—"}</span>
                  <span>{money(a.amount)}</span>
                  <span className={a.outcome === "SUBMITTED" ? "text-green-700" : "text-amber-700"} title={a.detail}>
                    {OUTCOME_LABEL[a.outcome] ?? a.outcome}
                  </span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * The automatic debit retry, with two switches.
 *
 * LIVE charges customers: once a day it debits the mandate of each overdue loan
 * that Orchard confirms is active, at an hour that moves one hour later each day.
 * REPORT only writes down who it would have charged. Both start off.
 */
export function RetryReportTab() {
  const qc = useQueryClient();
  const { canWrite } = useAuth();
  const [confirmLive, setConfirmLive] = useState(false);

  const { data: schedule, isLoading } = useQuery({ queryKey: SCHEDULE_KEY, queryFn: getRetrySchedule });
  const { data: runs } = useQuery({ queryKey: RUNS_KEY, queryFn: () => getRetryRuns(20), refetchInterval: 60_000 });

  const done = () => {
    qc.invalidateQueries({ queryKey: SCHEDULE_KEY });
    qc.invalidateQueries({ queryKey: RUNS_KEY });
  };

  const toggleReport = useMutation({
    mutationFn: (enabled: boolean) => setRetrySchedule(enabled),
    onSuccess: (s) => {
      toast.success(s.enabled ? "Scheduled retry report is on" : "Scheduled retry report is off");
      done();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not change the setting"),
  });

  const toggleLive = useMutation({
    mutationFn: (enabled: boolean) => setRetryLive(enabled),
    onSuccess: (s) => {
      toast.success(s.enabled ? "Automatic retry is ON. Customers will be charged." : "Automatic retry is off");
      setConfirmLive(false);
      done();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not change the setting"),
  });

  const run = useMutation({
    mutationFn: getRetryReport,
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not build the report"),
  });

  const liveOn = schedule?.live.enabled === true;

  return (
    <div className="space-y-6">
      <Card className={cn(liveOn && "border-red-300 dark:border-red-900")}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className={cn("h-4 w-4", liveOn ? "text-red-600" : "text-muted-foreground")} />
            Automatic retry
            <span className={cn("ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", liveOn ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400")}>
              {liveOn ? "ON · charging customers" : "OFF"}
            </span>
          </CardTitle>
          <CardDescription>
            Once a day it debits each overdue loan whose mandate Orchard says is active. The hour moves one hour later
            every day, so over 24 days every hour of the day gets tried.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{liveOn ? "On" : "Off"}</p>
              {schedule?.live.updatedBy && (
                <p className="text-xs text-muted-foreground">
                  Last changed by {schedule.live.updatedBy}
                  {schedule.live.updatedAt ? ` on ${format(new Date(schedule.live.updatedAt), "dd MMM yyyy HH:mm")}` : ""}
                </p>
              )}
            </div>
            <Switch
              aria-label="Charge customers with the automatic retry"
              checked={liveOn}
              disabled={isLoading || toggleLive.isPending || !canWrite}
              onCheckedChange={(v) => (v ? setConfirmLive(true) : toggleLive.mutate(false))}
            />
          </div>

          {schedule && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs font-medium flex items-center gap-1.5 mb-2">
                <Clock className="h-3.5 w-3.5" /> Retry hour (Accra time)
              </p>
              <div className="flex flex-wrap gap-2">
                {schedule.upcomingSlots.map((s, i) => (
                  <div key={s.date} className={cn("rounded-md border px-3 py-1.5 text-xs", i === 0 ? "bg-card font-semibold" : "text-muted-foreground")}>
                    {i === 0 ? "Today" : format(new Date(`${s.date}T00:00:00Z`), "EEE d MMM")}
                    <span className="ml-2">{slotLabel(s.hour)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Runs every hour and attempts each mandate once, on the first run at or after that day's hour, so a late
                run still makes the day.
              </p>
            </div>
          )}

          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
            <li>Never past the mandate's end date: after that the customer no longer permits a debit.</li>
            <li>Never on a loan that is repaid, or for more than is owed.</li>
            <li>Skips mandates Orchard is already retrying (a debit in the last 4 hours).</li>
            <li>At most 30 debits an hour, and it stops itself and alerts if Orchard refuses 5 in a row.</li>
            <li>Gives up after 24 of its own attempts on a mandate and leaves it for a person.</li>
          </ul>
        </CardContent>
      </Card>

      <AlertDialog open={confirmLive} onOpenChange={setConfirmLive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start charging customers automatically?</AlertDialogTitle>
            <AlertDialogDescription>
              From the next hourly run, each overdue loan with an active mandate is debited once a day. Today's hour is{" "}
              {schedule ? slotLabel(schedule.todaySlotHour) : "shown above"}; anything that qualifies after it is tried
              the same day. Money moves when this is on, and a wrong debit is refunded by hand.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              disabled={toggleLive.isPending}
              onClick={(e) => {
                e.preventDefault();
                toggleLive.mutate(true);
              }}
            >
              {toggleLive.isPending ? "Turning on..." : "Turn on and charge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" /> Report only
          </CardTitle>
          <CardDescription>
            Writes down who the retry would charge each day, at the retry hour, without charging anyone. It stands in for
            the automatic retry while that is off, and is ignored once it is on.
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
            disabled={isLoading || toggleReport.isPending || !canWrite}
            onCheckedChange={(v) => toggleReport.mutate(v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What it has done</CardTitle>
          <CardDescription>Each hourly run that did something, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">When</th>
                  <th className="px-4 py-2 text-left font-medium">Mode</th>
                  <th className="px-4 py-2 text-left font-medium">Hour</th>
                  <th className="px-4 py-2 text-right font-medium">Looked at</th>
                  <th className="px-4 py-2 text-right font-medium">Qualified</th>
                  <th className="px-4 py-2 text-right font-medium">Charged</th>
                  <th className="px-4 py-2 text-left font-medium">Note</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y">
                {!runs || runs.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Nothing yet.</td></tr>
                ) : runs.map((r) => <RunRow key={r._id} run={r} />)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Check who qualifies right now</CardTitle>
          <CardDescription>
            Checks every active mandate against its loan and asks Orchard for the status of those that pass. It never
            charges anyone, whatever the switches say. It can take a few seconds.
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
