import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import {
  listAccountingAdmins,
  setAccountingRole,
  type AccountingAdmin,
  type AccountingRole,
} from "@/api/accounting.api";

/** What each role can do, shown beside the picker so nobody assigns one blind. */
export const ROLE_SUMMARY: Record<AccountingRole | "none", { label: string; can: string }> = {
  uploader: {
    label: "Uploader",
    can: "Enters expenses and can ask for one to be deleted. Can never approve.",
  },
  approver: {
    label: "Approver",
    can: "Approves or rejects expenses other people entered, and changes settings. Does not enter expenses.",
  },
  viewer: { label: "Viewer", can: "Read-only." },
  none: {
    label: "Not assigned",
    can: "Keeps the access they had before roles: read, enter, ask for deletion, change settings. Cannot approve.",
  },
};

const NONE = "none";

/**
 * Who holds which accounting role. Only a superadmin gets here: the server
 * refuses everyone else, and the menu entry is hidden from them.
 */
export function AccessPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const admins = useQuery({
    queryKey: ["accounting-access-admins"],
    queryFn: listAccountingAdmins,
    retry: false,
  });

  const change = useMutation({
    mutationFn: (input: { admin: AccountingAdmin; role: AccountingRole | null }) =>
      setAccountingRole(input.admin._id, input.role),
    onSuccess: (_d, input) => {
      toast({
        title: input.role
          ? `${input.admin.fullName} is now ${ROLE_SUMMARY[input.role].label.toLowerCase()}`
          : `${input.admin.fullName} has no accounting role`,
      });
      qc.invalidateQueries({ queryKey: ["accounting-access-admins"] });
      qc.invalidateQueries({ queryKey: ["accounting-access-me"] });
    },
    onError: (e: unknown) =>
      toast({ variant: "destructive", title: "Could not change the role", description: getFriendlyErrorMessage(e) }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What each role can do</CardTitle>
          <CardDescription>
            Whoever enters an expense can never approve it. A role takes effect on the person&apos;s next
            action, without them signing in again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(ROLE_SUMMARY) as (AccountingRole | "none")[]).map((key) => (
              <div key={key} className="space-y-0.5">
                <dt className="text-sm font-medium">{ROLE_SUMMARY[key].label}</dt>
                <dd className="text-xs text-muted-foreground">{ROLE_SUMMARY[key].can}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {admins.isLoading && <Skeleton className="h-48 w-full" />}

      {admins.error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{getFriendlyErrorMessage(admins.error)}</span>
        </div>
      )}

      {admins.data && (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Account type</TableHead>
                  <TableHead>Accounting role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.data.map((a) => (
                  <TableRow key={a._id} data-testid={`admin-${a._id}`}>
                    <TableCell>
                      <div className="font-medium">{a.fullName}</div>
                      <div className="text-xs text-muted-foreground">{a.email}</div>
                    </TableCell>
                    <TableCell className="capitalize">{a.role}</TableCell>
                    <TableCell>
                      <Select
                        value={a.accountingRole ?? NONE}
                        disabled={change.isPending}
                        onValueChange={(v) =>
                          change.mutate({ admin: a, role: v === NONE ? null : (v as AccountingRole) })
                        }
                      >
                        <SelectTrigger className="w-[180px]" aria-label={`Accounting role for ${a.fullName}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>{ROLE_SUMMARY.none.label}</SelectItem>
                          <SelectItem value="uploader">{ROLE_SUMMARY.uploader.label}</SelectItem>
                          <SelectItem value="approver">{ROLE_SUMMARY.approver.label}</SelectItem>
                          <SelectItem value="viewer">{ROLE_SUMMARY.viewer.label}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {admins.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      No admins found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
