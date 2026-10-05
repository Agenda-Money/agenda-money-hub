import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ruleTitle } from "@/lib/fraud";

interface Finding {
  rule: string;
  severity: "low" | "medium";
  message: string;
}

interface Props {
  /** The applicant's number. Nothing is requested without one. */
  msisdn?: string;
  /** Only look while the modal is actually open. */
  enabled: boolean;
}

/**
 * What a reviewer should know about this applicant, shown beside KYC.
 *
 * Renders nothing when there are no findings, and nothing at all if the check
 * cannot be loaded. It never shows a green tick or a "no concerns" line: these
 * are a few narrow checks, and an empty result is not evidence the applicant is
 * fine, so reassuring the reviewer would be worse than saying nothing.
 *
 * Failing quietly is deliberate too. The fraud endpoints are admin-only, so a
 * viewer opening a loan gets a 403 here, and a missing banner must never get in
 * the way of reviewing the loan itself.
 */
export function ApplicantFraudChecks({ msisdn, enabled }: Props) {
  const { data } = useQuery({
    queryKey: ["fraud-applicant-checks", msisdn],
    enabled: enabled && !!msisdn,
    queryFn: async () => {
      const res = await api.get(`/api/admin/fraud/applicants/${encodeURIComponent(msisdn as string)}/checks`);
      return (res.data?.data?.findings ?? []) as Finding[];
    },
    retry: false,
    // Reviewing is a one-off look, but a reviewer re-opening the same loan a
    // minute later should not wait on it again.
    staleTime: 60_000,
  });

  if (!data || data.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10"
      data-testid="applicant-fraud-checks"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
        <ShieldAlert className="h-4 w-4" />
        Worth checking before you approve
      </div>

      <ul className="space-y-2">
        {data.map((f, i) => (
          <li key={`${f.rule}-${i}`} className="text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{ruleTitle(f.rule)}</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  f.severity === "medium"
                    ? "border-amber-400 text-amber-800"
                    : "border-slate-300 text-slate-600",
                )}
              >
                {f.severity === "medium" ? "Medium" : "Low"}
              </Badge>
            </div>
            <p className="text-muted-foreground">{f.message}</p>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-muted-foreground">
        These cover the reference number and who referred them. They are prompts to call, not a verdict.
      </p>
    </div>
  );
}
