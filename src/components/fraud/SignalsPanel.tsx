import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Lock } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ruleHint, ruleTitle, type SignalRow, type SignalsResponse } from "@/lib/fraud";

interface Props {
  /** Takes the reviewer to the Privacy notice tab. */
  onOpenNotice: () => void;
}

type Pending =
  | { kind: "capture"; enable: boolean }
  | { kind: "rule"; row: SignalRow; live: boolean };

const errorText = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

/**
 * Every fraud signal, whether it is on, and the switch.
 *
 * Two kinds of switch. Device capture is a data-collection decision: it starts
 * recording a device ID, address and browser for every customer who signs in,
 * so it cannot be turned on until a privacy notice is published. A rule going
 * live is a workload decision: its waiting findings join the review queue, so
 * the confirmation says how many.
 */
export function SignalsPanel({ onOpenNotice }: Props) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<Pending | null>(null);

  const signals = useQuery({
    queryKey: ["fraud-signals"],
    queryFn: async () => (await api.get("/api/admin/fraud/signals")).data.data as SignalsResponse,
    retry: false,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["fraud-signals"] });
    qc.invalidateQueries({ queryKey: ["fraud-flags"] });
    qc.invalidateQueries({ queryKey: ["fraud-scorecard"] });
  };

  const setCapture = useMutation({
    mutationFn: async (enabled: boolean) =>
      api.put("/api/admin/fraud/signals/device-capture", { enabled }),
    onSuccess: (_r, enabled) => {
      toast.success(enabled ? "Device capture is on." : "Device capture is off.");
      setPending(null);
      refresh();
    },
    onError: (err) => {
      toast.error(errorText(err, "Could not change device capture."));
      setPending(null);
      refresh();
    },
  });

  const setRule = useMutation({
    mutationFn: async (input: { rule: string; live: boolean }) =>
      (await api.put(`/api/admin/fraud/signals/rules/${input.rule}`, { live: input.live })).data
        .data as { flagsMoved: number },
    onSuccess: (data, input) => {
      toast.success(
        input.live
          ? `${ruleTitle(input.rule)} is live.${data.flagsMoved ? ` ${data.flagsMoved} waiting ${data.flagsMoved === 1 ? "flag has" : "flags have"} joined the queue.` : ""}`
          : `${ruleTitle(input.rule)} is back in testing.`,
      );
      setPending(null);
      refresh();
    },
    onError: (err) => {
      toast.error(errorText(err, "Could not change that rule."));
      setPending(null);
      refresh();
    },
  });

  if (signals.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (signals.error || !signals.data) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{errorText(signals.error, "Could not load the signals.")}</span>
      </div>
    );
  }

  const { deviceCapture, rules } = signals.data;
  const busy = setCapture.isPending || setRule.isPending;
  const canEnableCapture = deviceCapture.noticePublished;

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border p-4" aria-labelledby="capture-heading">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 id="capture-heading" className="text-base font-semibold">
                Device capture
              </h2>
              <Badge variant={deviceCapture.enabled ? "default" : "secondary"}>
                {deviceCapture.enabled ? "On" : "Off"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Records a device ID, internet address and browser against each customer who signs in. The two
              device signals below cannot find anything until this has been on for a while.
            </p>
          </div>
          <Switch
            aria-label="Device capture"
            checked={deviceCapture.enabled}
            disabled={busy || (!deviceCapture.enabled && !canEnableCapture)}
            onCheckedChange={(enable) => setPending({ kind: "capture", enable })}
          />
        </div>

        <dl className="grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="flex gap-1">
            <dt>Privacy notice</dt>
            <dd className="text-foreground">
              {deviceCapture.noticePublished ? `Published, version ${deviceCapture.noticeVersion}` : "Not published"}
            </dd>
          </div>
          <div className="flex gap-1">
            <dt>Recorded so far</dt>
            <dd className="text-foreground">
              {deviceCapture.sightings} {deviceCapture.sightings === 1 ? "device sighting" : "device sightings"}
            </dd>
          </div>
        </dl>

        {!deviceCapture.noticePublished && (
          <div className="flex items-center justify-between gap-3 rounded-md bg-muted/60 p-3 text-xs">
            <span className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Capture cannot be turned on until customers have been told about it. Publish the privacy notice first.
            </span>
            <Button variant="outline" size="sm" onClick={onOpenNotice}>
              Open privacy notice
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="rules-heading">
        <div className="space-y-1">
          <h2 id="rules-heading" className="text-base font-semibold">
            Rules
          </h2>
          <p className="text-sm text-muted-foreground">
            A rule in testing records what it finds but shows nothing in the review queue. Turn it on once you
            have seen what it would flag and the team can keep up with the volume.
          </p>
        </div>

        <ul className="divide-y rounded-lg border">
          {rules.map((row) => {
            const waitingOnCapture = row.needsDeviceCapture && !deviceCapture.enabled;
            return (
              <li key={row.rule} className="flex items-start justify-between gap-4 p-4" data-testid={`signal-${row.rule}`}>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{ruleTitle(row.rule)}</span>
                    <Badge variant={row.live ? "default" : "secondary"}>{row.live ? "Live" : "Testing"}</Badge>
                    {row.pinned && <Badge variant="outline">Live in code</Badge>}
                    {waitingOnCapture && <Badge variant="outline">Waiting for device capture</Badge>}
                  </div>
                  {ruleHint(row.rule) && <p className="text-xs text-muted-foreground">{ruleHint(row.rule)}</p>}
                  <p className="text-xs text-muted-foreground">
                    {row.live
                      ? `${row.shownOpen} open in the queue`
                      : row.hiddenOpen > 0
                        ? `${row.hiddenOpen} open finding${row.hiddenOpen === 1 ? "" : "s"} waiting, hidden until this is on`
                        : "Nothing waiting"}
                  </p>
                </div>
                <Switch
                  aria-label={ruleTitle(row.rule)}
                  checked={row.live}
                  disabled={busy || row.pinned}
                  onCheckedChange={(live) => setPending({ kind: "rule", row, live })}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && !busy && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === "capture"
                ? pending.enable
                  ? "Turn on device capture?"
                  : "Turn off device capture?"
                : pending?.live
                  ? `Turn on “${pending ? ruleTitle(pending.row.rule) : ""}”?`
                  : `Move “${pending?.kind === "rule" ? ruleTitle(pending.row.rule) : ""}” back to testing?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === "capture" &&
                (pending.enable
                  ? `From now on, every customer who signs in has a device ID, internet address and browser recorded for fraud review. Customers will see privacy notice version ${deviceCapture.noticeVersion} on the sign-in page.`
                  : "Nothing new will be recorded, and the notice disappears from the sign-in page. What was already recorded stays until it expires.")}
              {pending?.kind === "rule" &&
                (pending.live
                  ? pending.row.hiddenOpen > 0
                    ? `${pending.row.hiddenOpen} open ${pending.row.hiddenOpen === 1 ? "finding" : "findings"} that ${pending.row.hiddenOpen === 1 ? "is" : "are"} hidden now will join the review queue straight away.`
                    : "New findings from this rule will appear in the review queue."
                  : `Its ${pending.row.shownOpen} open ${pending.row.shownOpen === 1 ? "flag" : "flags"} will be hidden from the queue. Decisions already made are kept.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                if (!pending) return;
                if (pending.kind === "capture") setCapture.mutate(pending.enable);
                else setRule.mutate({ rule: pending.row.rule, live: pending.live });
              }}
            >
              {busy ? "Saving…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
