import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { confirmOrchardOtp, renewOrchardMandate, resendOrchardOtp } from "@/api/orchard.api";
import { money } from "@/lib/orchard-insights";

export interface RenewTarget {
  msisdn: string;
  customerName?: string | null;
  loanReference: string;
  owed: number;
}

type Step = "confirm" | "code" | "done";

const reasonOf = (e: any, fallback: string) => e?.response?.data?.message || fallback;

/**
 * Renews a mandate that has ended, or is about to, in two steps: start it (which
 * sends the customer a new code and replaces the old mandate) then enter the code
 * they read out. Nothing is collected until the code is confirmed.
 */
export function RenewMandateDialog({ target, onClose }: { target: RenewTarget | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("confirm");
  const [code, setCode] = useState("");

  // A fresh start each time it is opened for someone.
  useEffect(() => {
    if (target) {
      setStep("confirm");
      setCode("");
    }
  }, [target?.msisdn]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["orchard-mandates"] });
    qc.invalidateQueries({ queryKey: ["orchard-expiry-risk"] });
  };

  const start = useMutation({
    mutationFn: () => renewOrchardMandate(target!.msisdn),
    onSuccess: () => {
      toast.success("A new code was sent to the customer");
      setStep("code");
      refresh();
    },
    onError: (e) => toast.error(reasonOf(e, "Could not start the renewal")),
  });

  const confirm = useMutation({
    mutationFn: () => confirmOrchardOtp(target!.msisdn, code.trim()),
    onSuccess: (res) => {
      const accepted = ["000", "015", "027", "127"].includes(String(res?.data?.response?.resp_code));
      if (!accepted) {
        toast.error(res?.data?.response?.resp_desc || "Orchard did not accept that code");
        return;
      }
      toast.success("Renewed. Collection is back on.");
      setStep("done");
      refresh();
    },
    onError: (e) => toast.error(reasonOf(e, "Could not confirm the code")),
  });

  const resend = useMutation({
    mutationFn: () => resendOrchardOtp(target!.msisdn),
    onSuccess: () => toast.success("Code sent again"),
    onError: (e) => toast.error(reasonOf(e, "Could not resend the code")),
  });

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        {target && step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Renew auto-repay</DialogTitle>
              <DialogDescription>
                {target.customerName ?? target.msisdn} · loan {target.loanReference} · still owes {money(target.owed)}
              </DialogDescription>
            </DialogHeader>
            <ul className="text-sm space-y-2 list-disc pl-5">
              <li>The customer gets a new code on their phone. They have to approve it for collection to resume.</li>
              <li>It asks for what is owed now ({money(target.owed)}) and tries daily, for up to 200 days.</li>
              <li>
                The current mandate ends as soon as you start, because Orchard keeps only one per customer. If they
                never give you the code, they will have no auto-repay at all.
              </li>
            </ul>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Back</Button>
              <Button disabled={start.isPending} onClick={() => start.mutate()}>
                {start.isPending ? "Sending the code..." : "Send the customer a code"}
              </Button>
            </DialogFooter>
          </>
        )}

        {target && step === "code" && (
          <>
            <DialogHeader>
              <DialogTitle>Enter the code</DialogTitle>
              <DialogDescription>
                A code was sent to {target.msisdn}. Ask for it on a call you place yourself to the number on file, and
                never ask for it by text or from a number you did not call.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-1">
              <Label htmlFor="renew-code">Code from the customer</Label>
              <Input
                id="renew-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="The digits they read out"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" disabled={resend.isPending} onClick={() => resend.mutate()}>
                Send it again
              </Button>
              <Button disabled={confirm.isPending || code.trim().length < 4} onClick={() => confirm.mutate()}>
                {confirm.isPending ? "Checking..." : "Confirm the code"}
              </Button>
            </DialogFooter>
          </>
        )}

        {target && step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle>Renewed</DialogTitle>
              <DialogDescription>
                Auto-repay for {target.customerName ?? target.msisdn} is back on. The first debit is tomorrow.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
