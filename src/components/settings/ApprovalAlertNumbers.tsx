import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listApprovalAlerts, setApprovalAlert, type ApprovalAlertAdmin } from "@/api/twoStepDisbursement.api";

const errorText = (err: unknown) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not save that number.";

/** The same number in any usual spelling, so "unchanged" is not fooled by +233 versus 0. */
const digits = (s: string) => s.replace(/\D/g, "").replace(/^0/, "233");

function Row({ admin, canWrite }: Readonly<{ admin: ApprovalAlertAdmin; canWrite: boolean }>) {
  const qc = useQueryClient();
  const [value, setValue] = useState(admin.phone ? `+${admin.phone}` : "");

  // Follow the saved value when the list reloads after a save.
  useEffect(() => {
    setValue(admin.phone ? `+${admin.phone}` : "");
  }, [admin.phone]);

  const save = useMutation({
    mutationFn: (phone: string) => setApprovalAlert(admin.adminId, phone),
    onSuccess: (_d, phone) => {
      toast.success(phone ? `Saved. ${admin.fullName} will be texted.` : `Cleared. ${admin.fullName} will not be texted.`);
      qc.invalidateQueries({ queryKey: ["approval-alert-numbers"] });
    },
    onError: (err) => toast.error(errorText(err)),
  });

  const changed = digits(value) !== digits(admin.phone ? `+${admin.phone}` : "");

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between" data-testid={`alert-row-${admin.adminId}`}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{admin.fullName}</p>
        <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          aria-label={`Alert number for ${admin.fullName}`}
          inputMode="tel"
          placeholder="+233…"
          value={value}
          disabled={!canWrite || save.isPending}
          onChange={(e) => setValue(e.target.value)}
          className="w-44"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!canWrite || !changed || save.isPending}
          onClick={() => save.mutate(value.trim())}
        >
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </li>
  );
}

/**
 * The phone numbers texted when a loan has its first approval.
 *
 * One number per admin account, so the admin who approved first can be left out
 * and only the others are texted. An admin with no number is simply not texted;
 * the approver is told when nobody could be, so they can speak to the other admin.
 */
export function ApprovalAlertNumbers({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const admins = useQuery({
    queryKey: ["approval-alert-numbers"],
    queryFn: listApprovalAlerts,
    retry: false,
  });

  return (
    <div className="space-y-2" data-testid="approval-alert-numbers">
      <div>
        <p className="text-sm font-medium">Who is texted</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          When one admin gives the first approval, the other admins are texted to give the final one. The admin who
          approved first is never texted. An admin with no number is not texted.
        </p>
      </div>

      {admins.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {admins.error && <p className="text-sm text-destructive">Could not load the admins.</p>}

      {admins.data && admins.data.length === 0 && (
        <p className="text-sm text-muted-foreground">No admin accounts found.</p>
      )}

      {admins.data && admins.data.length > 0 && (
        <>
          <ul className="divide-y rounded-md border px-3">
            {admins.data.map((a) => (
              <Row key={a.adminId} admin={a} canWrite={canWrite} />
            ))}
          </ul>
          {admins.data.filter((a) => a.phone).length < 2 && (
            <p className="text-xs text-amber-700" data-testid="alert-numbers-warning">
              Fewer than two admins have a number saved. A first approval would text nobody, or only one person.
            </p>
          )}
        </>
      )}
    </div>
  );
}
