import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FraudFlag } from "@/lib/fraud";

interface Props {
  flag: FraudFlag | null;
  decision: "CONFIRMED" | "DISMISSED" | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (note: string) => void;
}

/**
 * Confirm or dismiss a flag.
 *
 * A dismissal cannot be submitted without a reason. The reasons are the only
 * thing that shows why a rule keeps firing on people it should not, which is
 * what decides whether it gets tightened or retired. A confirmation may carry a
 * note but does not need one.
 */
export function DecideDialog({ flag, decision, pending, onCancel, onSubmit }: Props) {
  const [note, setNote] = useState("");
  const dismissing = decision === "DISMISSED";
  const blocked = dismissing && note.trim().length === 0;

  return (
    <Dialog
      open={!!flag && !!decision}
      onOpenChange={(open) => {
        if (!open && !pending) {
          setNote("");
          onCancel();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dismissing ? "Dismiss this flag" : "Confirm this as fraud"}</DialogTitle>
          <DialogDescription>
            {flag?.summary}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="fraud-note">
            {dismissing ? "Why is this not a concern? (required)" : "Note (optional)"}
          </Label>
          <Textarea
            id="fraud-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              dismissing
                ? "e.g. spoke to the customer, the reference is her mother"
                : "e.g. customer unreachable, number switched off"
            }
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            This cannot be changed afterwards. It is also how the rule learns whether it is right.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setNote("");
              onCancel();
            }}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant={dismissing ? "default" : "destructive"}
            disabled={blocked || pending}
            onClick={() => {
              onSubmit(note.trim());
              setNote("");
            }}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {dismissing ? "Dismiss" : "Confirm fraud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
