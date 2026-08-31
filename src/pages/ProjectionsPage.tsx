// src/pages/ProjectionsPage.tsx
//
// The "Plan" section of the finance subdomain — a 5-year financial
// projection model (customer growth, unit economics, debt schedule,
// salaries, depreciation, projected P&L/BS/Cashflow), distinct from the
// Actuals dashboard in FinancePage.tsx. See the implementation plan for why
// this is a parallel module rather than an extension of the Actuals one.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { SlidersHorizontal, Users, TrendingUp, Landmark, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import {
  PROJECTION_ASSUMPTION_FIELDS, PROJECTION_ASSUMPTION_GROUP_LABELS,
  type ProjectionAssumptionGroup,
} from "@/lib/projectionConstants";
import { getProjectionAssumptions, updateProjectionAssumptions, type ProjectionAssumptions } from "@/api/projections.api";

const chartTheme = {
  grid: "#33415533",
  tick: "#94a3b8",
  tooltipBorder: "hsl(var(--border))",
  tooltipBg: "hsl(var(--card))",
};

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-card px-3 py-2 text-xs shadow-lg" style={{ borderColor: chartTheme.tooltipBorder }}>
      {label && <p className="font-semibold mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.stroke }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

function fmtValue(value: number, unit: string): string {
  if (unit === "percent") return `${(value * 100).toFixed(2)}%`;
  if (unit === "ghs") return `GHS ${value.toLocaleString("en-GH", { maximumFractionDigits: 2 })}`;
  return value.toLocaleString("en-GH", { maximumFractionDigits: 4 });
}

function toRawValue(displayValue: string, unit: string): number {
  const n = Number(displayValue);
  if (unit === "percent") return n / 100;
  return n;
}

const GROUP_ORDER: ProjectionAssumptionGroup[] = ["commercial", "pnl", "bs"];
const GROUP_ICON: Record<ProjectionAssumptionGroup, any> = {
  commercial: Users,
  pnl: TrendingUp,
  bs: Landmark,
};

export function ProjectionsAssumptionsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: assumptions, isLoading } = useQuery({ queryKey: ["projection-assumptions"], queryFn: getProjectionAssumptions });
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [changeNote, setChangeNote] = useState("");

  const mut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateProjectionAssumptions(payload),
    onSuccess: (updated) => {
      toast({ title: `Assumptions saved — version ${updated.version}` });
      setEdits({});
      setChangeNote("");
      qc.setQueryData(["projection-assumptions"], updated);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to save", description: getFriendlyErrorMessage(e) }),
  });

  const driverChartData = useMemo(() => {
    if (!assumptions) return [];
    return assumptions.monthlyDrivers.map((d) => ({
      month: `M${d.monthIndex}`,
      agents: d.salesAgents,
      avgLoanNC: d.avgLoanSizeNewCustomer,
      avgLoanRC: d.avgLoanAmountReturningCustomer,
    }));
  }, [assumptions]);

  const hasEdits = Object.keys(edits).length > 0;

  const handleSave = () => {
    if (!assumptions) return;
    const payload: Record<string, unknown> = {};
    for (const [field, raw] of Object.entries(edits)) {
      const config = PROJECTION_ASSUMPTION_FIELDS.find((f) => f.id === field);
      if (!config) continue;
      payload[field] = toRawValue(raw, config.unit);
    }
    if (changeNote.trim()) payload.changeNote = changeNote.trim();
    mut.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-muted-foreground" /> Assumptions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `Version ${assumptions?.version} — drives every projected sheet in the Plan section.`}
          </p>
        </div>
        {hasEdits && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="What changed and why? (optional)"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              className="w-64"
            />
            <Button onClick={handleSave} disabled={mut.isPending}>
              {mut.isPending ? "Saving…" : `Save ${Object.keys(edits).length} change${Object.keys(edits).length === 1 ? "" : "s"}`}
            </Button>
          </div>
        )}
      </div>

      {isLoading || !assumptions ? (
        <div className="h-64 w-full rounded-lg bg-muted/50 animate-pulse" />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            {GROUP_ORDER.map((group) => {
              const Icon = GROUP_ICON[group];
              const fields = PROJECTION_ASSUMPTION_FIELDS.filter((f) => f.group === group);
              return (
                <Card key={group}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" /> {PROJECTION_ASSUMPTION_GROUP_LABELS[group]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {fields.map((f) => {
                      const currentRaw = (assumptions as any)[f.id] as number;
                      const displayDefault = f.unit === "percent" ? (currentRaw * 100).toString() : currentRaw.toString();
                      const value = edits[f.id] ?? displayDefault;
                      const isEdited = edits[f.id] !== undefined;
                      return (
                        <div key={f.id} className="space-y-1">
                          <Label className="text-xs text-muted-foreground font-normal">{f.label}</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="any"
                              value={value}
                              onChange={(e) => setEdits((prev) => ({ ...prev, [f.id]: e.target.value }))}
                              className={isEdited ? "border-primary/50 bg-primary/5" : ""}
                            />
                            <span className="text-xs text-muted-foreground w-14 shrink-0">
                              {f.unit === "percent" ? "%" : f.unit === "ghs" ? "GHS" : f.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4 text-muted-foreground" /> Growth ramp (60 months)</CardTitle>
              <CardDescription>Sales agent headcount and average loan sizes — the two inputs that grow month over month rather than staying constant. Editing this ramp is coming in a later phase; shown here read-only for now.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={driverChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTheme.tick }} interval={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="agents" name="Sales agents" stroke="#378ADD" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="avgLoanNC" name="Avg loan (new)" stroke="#1D9E75" strokeWidth={2} dot={false} yAxisId={0} hide />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Coming-soon placeholders ────────────────────────────────────────────
// The Plan section ships phase by phase (see the implementation plan) —
// these keep the nav honest (no dead 404s) until each phase's real page
// lands, then get swapped out one at a time.

function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <Card>
        <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-2">
          <Calculator className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="font-medium">Coming in a later phase</p>
          <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProjectionsSummaryPage() {
  return <ComingSoonPage title="Plan Summary" description="The executive rollup — 5-year customer, revenue, and profitability trajectory — once the full projection engine is wired up." />;
}

export function ProjectionsGrowthPage() {
  return <ComingSoonPage title="Growth" description="Customer growth funnel and unit-economics engine, built once Assumptions has real numbers to work from." />;
}

export function ProjectionsDebtPage() {
  return <ComingSoonPage title="Debt Schedule" description="Lender-by-lender commitment fees and debt summary. Superadmin-only once it ships — real people's loan terms." />;
}

export function ProjectionsExpenditurePage() {
  return <ComingSoonPage title="Expenditure" description="Salaries, OpEx, depreciation, and digital-platform costs, rolled into the projected Expenditure Schedule." />;
}

export function ProjectionsStatementsPage() {
  return <ComingSoonPage title="Statements" description="Projected P&L, Balance Sheet, and Cashflow, once the engine composes everything above it." />;
}
