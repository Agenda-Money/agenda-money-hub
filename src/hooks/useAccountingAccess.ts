import { useQuery } from "@tanstack/react-query";
import { getMyAccountingAccess, type AccountingPermission } from "@/api/accounting.api";

/**
 * What the signed-in admin may do in the accounting portal.
 *
 * Asked of the server, not worked out here. The server is what enforces it, so
 * the screen only ever mirrors its answer: showing a button the server would
 * refuse is a wasted click, and hiding one it would allow is a lockout.
 *
 * While the answer is loading, or if it fails, nothing is allowed. That errs
 * towards hiding a button, never towards offering an action that may be refused.
 */
export function useAccountingAccess() {
  const q = useQuery({
    queryKey: ["accounting-access-me"],
    queryFn: getMyAccountingAccess,
    staleTime: 60_000,
    retry: false,
  });

  const granted = new Set<AccountingPermission>(q.data?.permissions ?? []);
  return {
    isLoading: q.isLoading,
    accountingRole: q.data?.accountingRole ?? null,
    can: (permission: AccountingPermission) => granted.has(permission),
  };
}
