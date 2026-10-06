import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { DecideDialog } from "@/components/fraud/DecideDialog";
import { FlagCard } from "@/components/fraud/FlagCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MIN_DECISIONS_TO_TRUST,
  precisionLabel,
  ruleTitle,
  type FraudFlag,
  type FraudStatus,
  type RuleScore,
} from "@/lib/fraud";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

/**
 * Fraud review queue.
 *
 * Whoever works this decides each flag one way or the other, and that decision
 * is the only calibration the rules will ever get: there are no published
 * benchmarks for this market, so whether a rule is worth keeping can only be
 * read off how often reviewers confirm it. The Rule scorecard tab shows that.
 *
 * Rules still being tested are hidden by default. Showing them is for
 * calibration, to see how many flags a rule would produce before anyone is
 * asked to work its output.
 */

const PAGE_SIZE = 25;
type Tab = FraudStatus | "SCORECARD";

export default function FraudReviewPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("OPEN");
  const [includeShadow, setIncludeShadow] = useState(false);
  const [page, setPage] = useState(0);
  const [deciding, setDeciding] = useState<{ flag: FraudFlag; decision: "CONFIRMED" | "DISMISSED" } | null>(null);

  const isQueue = tab !== "SCORECARD";

  const flags = useQuery({
    queryKey: ["fraud-flags", tab, includeShadow, page],
    enabled: isQueue,
    queryFn: async () => {
      const res = await api.get("/api/admin/fraud/flags", {
        params: {
          status: tab,
          includeShadow: includeShadow ? "true" : undefined,
          limit: PAGE_SIZE,
          skip: page * PAGE_SIZE,
        },
      });
      return res.data as { rows: FraudFlag[]; total: number };
    },
    retry: false,
  });

  const scorecard = useQuery({
    queryKey: ["fraud-scorecard"],
    enabled: tab === "SCORECARD",
    queryFn: async () => (await api.get("/api/admin/fraud/scorecard")).data.data as RuleScore[],
    retry: false,
  });

  const decide = useMutation({
    mutationFn: async (input: { id: string; decision: "CONFIRMED" | "DISMISSED"; note: string }) => {
      const action = input.decision === "CONFIRMED" ? "confirm" : "dismiss";
      return api.post(`/api/admin/fraud/flags/${input.id}/${action}`, { note: input.note || undefined });
    },
    onSuccess: (_res, input) => {
      toast.success(input.decision === "CONFIRMED" ? "Marked as fraud." : "Dismissed.");
      setDeciding(null);
      qc.invalidateQueries({ queryKey: ["fraud-flags"] });
      qc.invalidateQueries({ queryKey: ["fraud-scorecard"] });
    },
    // The server refuses for real reasons: someone else already decided it, or a
    // dismissal had no reason. Its own message says which.
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Could not save that decision.");
      // A 409 means the list on screen is stale.
      qc.invalidateQueries({ queryKey: ["fraud-flags"] });
    },
  });

  const rows = flags.data?.rows ?? [];
  const total = flags.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const changeTab = (next: string) => {
    setTab(next as Tab);
    setPage(0);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">Fraud review</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Each flag is something a rule thought a person should look at. Decide every one: that is how
            the rules find out whether they are right.
          </p>
        </header>

        <Tabs value={tab} onValueChange={changeTab}>
          <TabsList>
            <TabsTrigger value="OPEN">Open</TabsTrigger>
            <TabsTrigger value="CONFIRMED">Confirmed</TabsTrigger>
            <TabsTrigger value="DISMISSED">Dismissed</TabsTrigger>
            <TabsTrigger value="SCORECARD">Rule scorecard</TabsTrigger>
          </TabsList>
        </Tabs>

        {isQueue && (
          <div className="flex items-center gap-2">
            <Switch
              id="include-shadow"
              checked={includeShadow}
              onCheckedChange={(v) => {
                setIncludeShadow(v);
                setPage(0);
              }}
            />
            <Label htmlFor="include-shadow" className="text-sm">
              Include rules still being tested
            </Label>
          </div>
        )}

        {isQueue && flags.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {isQueue && flags.error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {(flags.error as any)?.response?.data?.message ?? "Could not load the fraud queue."}
            </span>
          </div>
        )}

        {isQueue && flags.data && rows.length === 0 && (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            {tab === "OPEN"
              ? includeShadow
                ? "Nothing is waiting."
                : "Nothing is waiting. Rules still being tested are hidden; switch them on above to see what they would flag."
              : "Nothing here yet."}
          </div>
        )}

        {isQueue && rows.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">
              {total} {total === 1 ? "flag" : "flags"}, most serious first.
            </p>
            <div className="space-y-3">
              {rows.map((flag) => (
                <FlagCard
                  key={flag._id}
                  flag={flag}
                  onConfirm={(f) => setDeciding({ flag: f, decision: "CONFIRMED" })}
                  onDismiss={(f) => setDeciding({ flag: f, decision: "DISMISSED" })}
                />
              ))}
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page + 1} of {pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {tab === "SCORECARD" && (
          <section className="space-y-3">
            <p className="text-sm text-muted-foreground">
              How often reviewers agreed with each rule. Open flags are left out: they are undecided, not
              wrong. A figure on fewer than {MIN_DECISIONS_TO_TRUST} decisions is marked, because it says
              very little.
            </p>

            {scorecard.isLoading && <Skeleton className="h-40 w-full" />}
            {scorecard.error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Could not load the scorecard.</span>
              </div>
            )}
            {scorecard.data && scorecard.data.length === 0 && (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                No flags have been raised yet.
              </div>
            )}
            {scorecard.data && scorecard.data.length > 0 && (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Raised</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                      <TableHead className="text-right">Confirmed</TableHead>
                      <TableHead className="text-right">Dismissed</TableHead>
                      <TableHead>Agreed with</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scorecard.data.map((r) => (
                      <TableRow key={`${r.rule}-${r.live}`}>
                        <TableCell className="font-medium">{ruleTitle(r.rule)}</TableCell>
                        <TableCell>{r.live ? "Live" : "Testing"}</TableCell>
                        <TableCell className="text-right">{r.total}</TableCell>
                        <TableCell className="text-right">{r.open}</TableCell>
                        <TableCell className="text-right">{r.confirmed}</TableCell>
                        <TableCell className="text-right">{r.dismissed}</TableCell>
                        <TableCell>{precisionLabel(r)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        )}

        <DecideDialog
          flag={deciding?.flag ?? null}
          decision={deciding?.decision ?? null}
          pending={decide.isPending}
          onCancel={() => setDeciding(null)}
          onSubmit={(note) =>
            deciding && decide.mutate({ id: deciding.flag._id, decision: deciding.decision, note })
          }
        />
      </div>
    </DashboardLayout>
  );
}
