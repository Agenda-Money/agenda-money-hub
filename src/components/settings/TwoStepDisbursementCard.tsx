import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { toast } from "sonner";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { getTwoStepDisbursement, setTwoStepDisbursement } from "@/api/twoStepDisbursement.api";
import { ApprovalAlertNumbers } from "@/components/settings/ApprovalAlertNumbers";

const errorText = (err: unknown) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not change that setting.";

const when = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : null;

/**
 * Turns two-step disbursement on or off.
 *
 * On: the first admin's approval is recorded and sends nothing; a different
 * admin's approval sends the money. Off: one approval sends it, as before.
 *
 * Both directions ask first, because this is a control on how money leaves the
 * business. Who changed it last, and when, is shown on the card, and the change
 * is written to the audit log.
 */
export function TwoStepDisbursementCard({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<boolean | null>(null);

  const state = useQuery({
    queryKey: ["two-step-disbursement"],
    queryFn: getTwoStepDisbursement,
    retry: false,
  });

  const change = useMutation({
    mutationFn: setTwoStepDisbursement,
    onSuccess: (_d, enabled) => {
      toast.success(
        enabled
          ? "Two-step disbursement is on. Loans now need two different admins."
          : "Two-step disbursement is off. One approval sends the money.",
      );
      setConfirming(null);
      qc.invalidateQueries({ queryKey: ["two-step-disbursement"] });
      qc.invalidateQueries({ queryKey: ["loans"] });
    },
    onError: (err) => {
      toast.error(errorText(err));
      setConfirming(null);
      qc.invalidateQueries({ queryKey: ["two-step-disbursement"] });
    },
  });

  const enabled = state.data?.enabled === true;
  const lastChange = state.data?.updatedBy && state.data.updatedBy !== "SYSTEM"
    ? `Last changed by ${state.data.updatedBy}${when(state.data.updatedAt) ? ` on ${when(state.data.updatedAt)}` : ""}.`
    : null;

  return (
    <Card data-testid="two-step-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-muted-foreground" />
            Two-step disbursement
          </CardTitle>
          {!state.isLoading && !state.error && (
            <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "On" : "Off"}</Badge>
          )}
        </div>
        <CardDescription>
          A loan needs approval from two different admins before money is sent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {state.error && <p className="text-sm text-destructive">Could not load this setting.</p>}

        {!state.isLoading && !state.error && (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Require a second admin</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {enabled
                    ? "The first approval waits on the Loans page under 2nd approval. A different admin gives the final approval, and only that one sends the money."
                    : "One admin's approval sends the money."}
                </p>
              </div>
              <Switch
                aria-label="Require a second admin"
                checked={enabled}
                disabled={!canWrite || change.isPending}
                onCheckedChange={(next) => setConfirming(next)}
              />
            </div>

            {lastChange && <p className="text-xs text-muted-foreground" data-testid="two-step-last-change">{lastChange}</p>}

            <ApprovalAlertNumbers canWrite={canWrite} />

            {enabled && (
              <p className="text-xs">
                <Link to="/loans/second-approval" className="font-medium text-primary hover:underline">
                  See loans waiting for a second approval
                </Link>
              </p>
            )}
          </>
        )}
      </CardContent>

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && !change.isPending && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirming ? "Turn on two-step disbursement?" : "Turn off two-step disbursement?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirming
                ? "From now on, the first admin to approve a loan only records their approval. A different admin must approve it before any money is sent. Loans already waiting need two approvals too."
                : "From now on, a single approval sends the money. Loans that already have a first approval will be sent by whoever approves next."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={change.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={change.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (confirming !== null) change.mutate(confirming);
              }}
            >
              {change.isPending ? "Saving…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
