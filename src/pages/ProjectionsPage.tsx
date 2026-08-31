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
  BarChart, Bar, Cell, PieChart, Pie, Legend, AreaChart, Area,
} from "recharts";
import {
  SlidersHorizontal, Users, TrendingUp, Landmark, Calculator, UsersRound, Repeat,
  Plus, Trash2, ShieldAlert, Boxes, ReceiptText, Cpu, Wallet, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetFooter,
} from "@/components/ui/sheet";
import { KpiCard } from "@/components/analytics/KpiCard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import { cn } from "@/lib/utils";
import {
  PROJECTION_ASSUMPTION_FIELDS, PROJECTION_ASSUMPTION_GROUP_LABELS,
  type ProjectionAssumptionGroup,
} from "@/lib/projectionConstants";
import {
  getProjectionAssumptions, updateProjectionAssumptions, getProjectionGrowth,
  listDebtEntries, createDebtEntry, deleteDebtEntry,
  listDepreciationEntries, createDepreciationEntry, deleteDepreciationEntry,
  listCapexEntries, createCapexEntry, listSubscriptionEntries, createSubscriptionEntry,
  listSalaryEntries, createSalaryEntry, deleteSalaryEntry, getProjectionExpenditure,
  getProjectionCommercials, getProjectionPnl, getProjectionBs, getProjectionCashflow,
  type ProjectionAssumptions, type LenderType, type DebtRegion, type DebtFeeStructure,
  type DepreciationAssetCategory, type PnlMonth, type BsYear, type CashflowYear,
} from "@/api/projections.api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PAYROLL_DEPARTMENTS } from "@/lib/constants";

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

const FUNNEL_COLORS = ["#378ADD", "#5BA3E5", "#7FBCED", "#1D9E75", "#0EA5E9"];

export function ProjectionsGrowthPage() {
  const { data, isLoading } = useQuery({ queryKey: ["projection-growth"], queryFn: getProjectionGrowth });
  const { data: commercialsData, isLoading: commercialsLoading } = useQuery({ queryKey: ["projection-commercials"], queryFn: getProjectionCommercials });

  const months = data?.months ?? [];
  const commercialsMonths = commercialsData?.months ?? [];
  const latestCommercials = commercialsMonths[0];
  const commercialsChartData = commercialsMonths.slice(0, 24).map((m) => ({
    name: m.month, Revenue: m.totalRevenue, "Direct Cost": Math.abs(m.totalDirectCost), "Gross Profit": m.grossProfit,
  }));
  const marginChartData = commercialsMonths.slice(0, 24).map((m) => ({ name: m.month, margin: m.grossMargin * 100 }));
  const latest = months[months.length - 1];
  const year1 = months[11];
  const year5 = months[59] ?? months[months.length - 1];

  const funnelData = latest ? [
    { stage: "Sales agents", value: latest.salesAgents },
    { stage: "Nodes/day", value: Math.round(latest.nodesPerDay) },
    { stage: "Connections/mo", value: Math.round(latest.connectionsPerMonth) },
    { stage: "Potential customers", value: Math.round(latest.potentialCustomersPerMonth) },
    { stage: "New customers/mo", value: Math.round(latest.customersPerMonth) },
  ] : [];

  const growthChartData = months.map((m) => ({
    name: m.month,
    customerBase: Math.round(m.customerBase),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" /> Growth
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Customer acquisition funnel and 5-year customer base trajectory.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Customer Base (latest month)"
          value={isLoading || !latest ? "—" : latest.customerBase.toLocaleString("en-GH", { maximumFractionDigits: 0 })}
          subtext={latest ? `Month ${latest.monthIndex} of the horizon` : ""}
          status="neutral"
          icon={<UsersRound className="h-4 w-4" />}
          loading={isLoading}
        />
        <KpiCard
          label="Customer Base (year 1)"
          value={isLoading || !year1 ? "—" : year1.customerBase.toLocaleString("en-GH", { maximumFractionDigits: 0 })}
          subtext="Month 12"
          status="neutral"
          icon={<Users className="h-4 w-4" />}
          loading={isLoading}
        />
        <KpiCard
          label="Customer Base (year 5)"
          value={isLoading || !year5 ? "—" : year5.customerBase.toLocaleString("en-GH", { maximumFractionDigits: 0 })}
          subtext={`Month ${year5?.monthIndex ?? 60}`}
          status="neutral"
          icon={<Repeat className="h-4 w-4" />}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Total revenue (this month)"
          value={commercialsLoading || !latestCommercials ? "—" : fmtGhs(latestCommercials.totalRevenue)}
          subtext="Fee + interest revenue"
          status="neutral"
          icon={<Wallet className="h-4 w-4" />}
          loading={commercialsLoading}
        />
        <KpiCard
          label="Gross profit (this month)"
          value={commercialsLoading || !latestCommercials ? "—" : fmtGhs(latestCommercials.grossProfit)}
          subtext="Revenue minus direct cost"
          status={latestCommercials && latestCommercials.grossProfit < 0 ? "red" : "green"}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={commercialsLoading}
        />
        <KpiCard
          label="Gross margin (this month)"
          value={commercialsLoading || !latestCommercials ? "—" : `${(latestCommercials.grossMargin * 100).toFixed(1)}%`}
          subtext="Gross profit ÷ total revenue"
          status={latestCommercials && latestCommercials.grossMargin < 0 ? "red" : "green"}
          icon={<Calculator className="h-4 w-4" />}
          loading={commercialsLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-muted-foreground" /> Commercials Reworked — revenue vs. direct cost</CardTitle>
            <CardDescription>24 month view</CardDescription>
          </CardHeader>
          <CardContent>
            {commercialsLoading ? (
              <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commercialsChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTheme.tick }} interval={2} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} />
                    <Tooltip content={<ChartTooltip formatter={fmtGhs} />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Revenue" fill="#378ADD" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Direct Cost" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Gross Profit" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4 text-muted-foreground" /> Gross margin trend</CardTitle>
          </CardHeader>
          <CardContent>
            {commercialsLoading ? (
              <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={marginChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="marginFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1D9E75" stopOpacity={0.6} /><stop offset="95%" stopColor="#1D9E75" stopOpacity={0.05} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTheme.tick }} interval={2} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />} />
                    <Area type="monotone" dataKey="margin" name="Gross margin" stroke="#1D9E75" strokeWidth={2} fill="url(#marginFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> Acquisition funnel</CardTitle>
            <CardDescription>Latest projected month</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#33415533" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis type="category" dataKey="stage" axisLine={false} tickLine={false} width={110} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {funnelData.map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /> Customer base — 5 year trajectory</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415533" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} interval={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip />
                    <Line type="monotone" dataKey="customerBase" name="Customer base" stroke="#1D9E75" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const DEBT_STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  planned: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  repaid: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const REGION_COLORS: Record<string, string> = { local: "#378ADD", foreign: "#1D9E75" };

function fmtGhs(n: number): string {
  return `GHS ${n.toLocaleString("en-GH", { maximumFractionDigits: 0 })}`;
}

function useIsSuperadmin() {
  const { user } = useAuth();
  return user?.role === "superadmin" || user?.role === "super_admin";
}

export function ProjectionsDebtPage() {
  const isSuperadmin = useIsSuperadmin();

  if (!isSuperadmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Debt Schedule</h1>
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-2">
            <ShieldAlert className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="font-medium">Superadmin access required</p>
            <p className="text-sm text-muted-foreground max-w-sm">Lender terms are personal financial data. This page is restricted to superadmins.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ProjectionsDebtPageContent />;
}

function ProjectionsDebtPageContent() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [form, setForm] = useState({
    lenderName: "", lenderType: "individual" as LenderType, region: "local" as DebtRegion,
    principal: "", feeStructure: "rate_based" as DebtFeeStructure,
    fixedAnnualAmount: "", overrideMonthlyRate: "", disbursedMonth: "",
  });

  const { data, isLoading } = useQuery({ queryKey: ["projection-debt"], queryFn: listDebtEntries });
  const entries = data?.data ?? [];
  const commitmentFees = data?.commitmentFees ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["projection-debt"] });

  const createMut = useMutation({
    mutationFn: createDebtEntry,
    onSuccess: () => {
      toast({ title: "Lender added" });
      setIsSheetOpen(false);
      setForm({ lenderName: "", lenderType: "individual", region: "local", principal: "", feeStructure: "rate_based", fixedAnnualAmount: "", overrideMonthlyRate: "", disbursedMonth: "" });
      invalidate();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to add lender", description: getFriendlyErrorMessage(e) }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDebtEntry,
    onSuccess: () => { toast({ title: "Lender removed" }); invalidate(); },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to remove", description: getFriendlyErrorMessage(e) }),
  });

  const activeEntries = entries.filter((e) => e.status === "active");
  const totalPrincipal = activeEntries.reduce((sum, e) => sum + e.principal, 0);
  const localPrincipal = activeEntries.filter((e) => e.region === "local").reduce((sum, e) => sum + e.principal, 0);
  const foreignPrincipal = totalPrincipal - localPrincipal;
  const latestFee = commitmentFees[0]?.totalMonthlyFee ?? 0;

  const donutData = [
    { name: "Local", value: localPrincipal },
    { name: "Foreign", value: foreignPrincipal },
  ].filter((d) => d.value > 0);

  const feeChartData = commitmentFees.slice(0, 24).map((m) => ({ name: m.month, fee: m.totalMonthlyFee }));

  const canSubmit = form.lenderName.trim() && Number(form.principal) > 0 && form.disbursedMonth &&
    (form.feeStructure === "rate_based" || Number(form.fixedAnnualAmount) > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Landmark className="h-5 w-5 text-muted-foreground" /> Debt Schedule
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Lender-by-lender terms and projected commitment fees. Superadmin only.</p>
        </div>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Lender</Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Add Lender</SheetTitle>
              <SheetDescription>Feeds the commitment-fee schedule and the debt-ask comparison metric.</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Lender name</Label>
                <Input value={form.lenderName} onChange={(e) => setForm((f) => ({ ...f, lenderName: e.target.value }))} placeholder="e.g. Jane Doe" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.lenderType} onValueChange={(v) => setForm((f) => ({ ...f, lenderType: v as LenderType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="institutional">Institutional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select value={form.region} onValueChange={(v) => setForm((f) => ({ ...f, region: v as DebtRegion }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="foreign">Foreign</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Principal (GHS)</Label>
                <Input type="number" value={form.principal} onChange={(e) => setForm((f) => ({ ...f, principal: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Fee structure</Label>
                <Select value={form.feeStructure} onValueChange={(v) => setForm((f) => ({ ...f, feeStructure: v as DebtFeeStructure }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rate_based">Rate-based (monthly)</SelectItem>
                    <SelectItem value="fixed_annual">Fixed annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.feeStructure === "fixed_annual" ? (
                <div className="space-y-2">
                  <Label>Fixed annual amount (GHS)</Label>
                  <Input type="number" value={form.fixedAnnualAmount} onChange={(e) => setForm((f) => ({ ...f, fixedAnnualAmount: e.target.value }))} placeholder="0.00" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Override monthly rate (optional, %)</Label>
                  <Input type="number" step="any" value={form.overrideMonthlyRate} onChange={(e) => setForm((f) => ({ ...f, overrideMonthlyRate: e.target.value }))} placeholder="Uses the assumptions default if blank" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Disbursed month</Label>
                <Input type="month" value={form.disbursedMonth} onChange={(e) => setForm((f) => ({ ...f, disbursedMonth: e.target.value }))} />
              </div>
            </div>
            <SheetFooter>
              <Button
                disabled={!canSubmit || createMut.isPending}
                onClick={() => createMut.mutate({
                  lenderName: form.lenderName.trim(),
                  lenderType: form.lenderType,
                  region: form.region,
                  principal: Number(form.principal),
                  feeStructure: form.feeStructure,
                  fixedAnnualAmount: form.fixedAnnualAmount ? Number(form.fixedAnnualAmount) : undefined,
                  overrideMonthlyRate: form.overrideMonthlyRate ? Number(form.overrideMonthlyRate) / 100 : undefined,
                  disbursedMonth: form.disbursedMonth,
                })}
              >
                {createMut.isPending ? "Adding…" : "Add Lender"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Active principal" value={isLoading ? "—" : fmtGhs(totalPrincipal)} subtext={`${activeEntries.length} active lender${activeEntries.length === 1 ? "" : "s"}`} status="neutral" icon={<Landmark className="h-4 w-4" />} loading={isLoading} />
        <KpiCard label="Current monthly commitment fee" value={isLoading ? "—" : fmtGhs(latestFee)} subtext="This month across all lenders" status="neutral" icon={<Calculator className="h-4 w-4" />} loading={isLoading} />
        <KpiCard label="Local vs foreign" value={isLoading ? "—" : `${fmtGhs(localPrincipal)} / ${fmtGhs(foreignPrincipal)}`} subtext="Active principal split" status="neutral" icon={<Boxes className="h-4 w-4" />} loading={isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /> Commitment fees — 24 month view</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={feeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTheme.tick }} interval={2} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} />
                    <Tooltip content={<ChartTooltip formatter={fmtGhs} />} />
                    <Line type="monotone" dataKey="fee" name="Commitment fee" stroke="#378ADD" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Boxes className="h-4 w-4 text-muted-foreground" /> Debt by region</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || donutData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">{isLoading ? "Loading…" : "No active debt"}</div>
            ) : (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {donutData.map((d) => <Cell key={d.name} fill={REGION_COLORS[d.name.toLowerCase()]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtGhs(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lenders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lender</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead>Fee structure</TableHead>
                <TableHead>Disbursed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e._id}>
                  <TableCell className="font-medium">{e.lenderName}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{e.lenderType}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{e.region}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{fmtGhs(e.principal)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.feeStructure === "fixed_annual" ? `Fixed ${fmtGhs(e.fixedAnnualAmount ?? 0)}/yr` : `Rate-based${e.overrideMonthlyRate ? ` (${(e.overrideMonthlyRate * 100).toFixed(2)}%/mo)` : ""}`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{e.disbursedMonth}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("capitalize", DEBT_STATUS_STYLE[e.status])}>{e.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMut.mutate(e._id)} disabled={deleteMut.isPending}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && entries.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No lenders yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

const DEPRECIATION_CATEGORY_LABEL: Record<DepreciationAssetCategory, string> = {
  software_digital_platform: "Software / Digital Platform",
  motor_vehicle: "Motor Vehicle",
  computers_accessories: "Computers & Accessories",
  office_equipment: "Office Equipment",
};

export function ProjectionsExpenditurePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [depSheetOpen, setDepSheetOpen] = useState(false);
  const [capexSheetOpen, setCapexSheetOpen] = useState(false);
  const [subSheetOpen, setSubSheetOpen] = useState(false);

  const [depForm, setDepForm] = useState({ category: "office_equipment" as DepreciationAssetCategory, description: "", costBasis: "", usefulLifeMonths: "36", acquiredMonth: "" });
  const [capexForm, setCapexForm] = useState({ item: "", costAmount: "", currency: "GHS" as "GHS" | "EUR" | "USD", fxRateToGhs: "", plannedMonth: "" });
  const [subForm, setSubForm] = useState({ item: "", monthlyAmount: "", currency: "GHS" as "GHS" | "EUR" | "USD", fxRateToGhs: "", effectiveFrom: "" });

  const { data: depData, isLoading: depLoading } = useQuery({ queryKey: ["projection-depreciation"], queryFn: listDepreciationEntries });
  const { data: capexData, isLoading: capexLoading } = useQuery({ queryKey: ["projection-capex"], queryFn: listCapexEntries });
  const { data: subData, isLoading: subLoading } = useQuery({ queryKey: ["projection-subscriptions"], queryFn: listSubscriptionEntries });
  const { data: expenditureData, isLoading: expenditureLoading } = useQuery({ queryKey: ["projection-expenditure"], queryFn: getProjectionExpenditure });

  const depEntries = depData?.data ?? [];
  const capexEntries = capexData ?? [];
  const subEntries = subData?.data ?? [];
  const subSchedule = subData?.schedule ?? [];

  const invalidateDep = () => qc.invalidateQueries({ queryKey: ["projection-depreciation"] });

  const createDepMut = useMutation({
    mutationFn: createDepreciationEntry,
    onSuccess: () => { toast({ title: "Asset added" }); setDepSheetOpen(false); setDepForm({ category: "office_equipment", description: "", costBasis: "", usefulLifeMonths: "36", acquiredMonth: "" }); invalidateDep(); },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to add asset", description: getFriendlyErrorMessage(e) }),
  });
  const deleteDepMut = useMutation({
    mutationFn: deleteDepreciationEntry,
    onSuccess: () => { toast({ title: "Asset removed" }); invalidateDep(); },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to remove", description: getFriendlyErrorMessage(e) }),
  });

  const createCapexMut = useMutation({
    mutationFn: createCapexEntry,
    onSuccess: () => {
      toast({ title: "CapEx item added", description: "A matching depreciation entry was created automatically." });
      setCapexSheetOpen(false);
      setCapexForm({ item: "", costAmount: "", currency: "GHS", fxRateToGhs: "", plannedMonth: "" });
      qc.invalidateQueries({ queryKey: ["projection-capex"] });
      invalidateDep();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to add CapEx item", description: getFriendlyErrorMessage(e) }),
  });

  const createSubMut = useMutation({
    mutationFn: createSubscriptionEntry,
    onSuccess: () => {
      toast({ title: "Subscription added" });
      setSubSheetOpen(false);
      setSubForm({ item: "", monthlyAmount: "", currency: "GHS", fxRateToGhs: "", effectiveFrom: "" });
      qc.invalidateQueries({ queryKey: ["projection-subscriptions"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to add subscription", description: getFriendlyErrorMessage(e) }),
  });

  const totalCapex = capexEntries.reduce((sum, c) => sum + (c.currency === "GHS" ? c.costAmount : c.costAmount * (c.fxRateToGhs ?? 1)), 0);
  const currentMonthlySubs = subSchedule[0]?.total ?? 0;
  const activeAssets = depEntries.filter((d) => d.status === "active");
  const currentMonthlyDep = activeAssets.reduce((sum, a) => sum + a.costBasis / a.usefulLifeMonths, 0);

  const subsChartData = subSchedule.slice(0, 24).map((m) => ({ name: m.month, total: m.total }));

  const expenditureMonths = expenditureData?.months ?? [];
  const expenditureChartData = expenditureMonths.slice(0, 24).map((m) => ({
    name: m.month, Personnel: m.personnel, "Director's Remuneration": m.directorsRemuneration,
    Subscriptions: m.subscriptions, Depreciation: m.depreciation,
  }));
  const currentExpenditureTotal = expenditureMonths[0]?.total ?? 0;

  const needsFx = (c: string) => c !== "GHS";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-muted-foreground" /> Expenditure
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Salaries, digital-platform CapEx, subscriptions, and depreciation — rolled into the projected Expenditure Schedule.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard label="Total expenditure (this month)" value={expenditureLoading ? "—" : fmtGhs(currentExpenditureTotal)} subtext="Personnel + subscriptions + depreciation" status="neutral" icon={<Wallet className="h-4 w-4" />} loading={expenditureLoading} />
        <KpiCard label="Total platform CapEx" value={capexLoading ? "—" : fmtGhs(totalCapex)} subtext={`${capexEntries.length} item${capexEntries.length === 1 ? "" : "s"}`} status="neutral" icon={<Cpu className="h-4 w-4" />} loading={capexLoading} />
        <KpiCard label="Monthly subscriptions" value={subLoading ? "—" : fmtGhs(currentMonthlySubs)} subtext="Current month" status="neutral" icon={<Repeat className="h-4 w-4" />} loading={subLoading} />
        <KpiCard label="Monthly depreciation" value={depLoading ? "—" : fmtGhs(currentMonthlyDep)} subtext={`${activeAssets.length} active asset${activeAssets.length === 1 ? "" : "s"}`} status="neutral" icon={<Boxes className="h-4 w-4" />} loading={depLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-muted-foreground" /> Expenditure Schedule — 24 month view</CardTitle>
          <CardDescription>Personnel, director's remuneration, subscriptions, and depreciation, stacked.</CardDescription>
        </CardHeader>
        <CardContent>
          {expenditureLoading ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={expenditureChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expPersonnel" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#378ADD" stopOpacity={0.7} /><stop offset="95%" stopColor="#378ADD" stopOpacity={0.05} /></linearGradient>
                    <linearGradient id="expDirectors" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.7} /><stop offset="95%" stopColor="#F59E0B" stopOpacity={0.05} /></linearGradient>
                    <linearGradient id="expSubs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1D9E75" stopOpacity={0.7} /><stop offset="95%" stopColor="#1D9E75" stopOpacity={0.05} /></linearGradient>
                    <linearGradient id="expDep" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#94A3B8" stopOpacity={0.7} /><stop offset="95%" stopColor="#94A3B8" stopOpacity={0.05} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTheme.tick }} interval={2} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} />
                  <Tooltip content={<ChartTooltip formatter={fmtGhs} />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="Personnel" stackId="1" stroke="#378ADD" fill="url(#expPersonnel)" />
                  <Area type="monotone" dataKey="Director's Remuneration" stackId="1" stroke="#F59E0B" fill="url(#expDirectors)" />
                  <Area type="monotone" dataKey="Subscriptions" stackId="1" stroke="#1D9E75" fill="url(#expSubs)" />
                  <Area type="monotone" dataKey="Depreciation" stackId="1" stroke="#94A3B8" fill="url(#expDep)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /> Subscription cost — 24 month view</CardTitle>
        </CardHeader>
        <CardContent>
          {subLoading ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={subsChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTheme.tick }} interval={2} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} />
                  <Tooltip content={<ChartTooltip formatter={fmtGhs} />} />
                  <Line type="monotone" dataKey="total" name="Subscriptions" stroke="#1D9E75" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4 text-muted-foreground" /> Digital Platform CapEx</CardTitle>
              <CardDescription>Each item auto-creates a paired depreciation entry.</CardDescription>
            </div>
            <Sheet open={capexSheetOpen} onOpenChange={setCapexSheetOpen}>
              <SheetTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Add</Button></SheetTrigger>
              <SheetContent className="sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Add CapEx Item</SheetTitle>
                  <SheetDescription>Creates a matching depreciation asset (36-month default useful life) automatically.</SheetDescription>
                </SheetHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Input value={capexForm.item} onChange={(e) => setCapexForm((f) => ({ ...f, item: e.target.value }))} placeholder="e.g. Core platform build" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Cost</Label>
                      <Input type="number" value={capexForm.costAmount} onChange={(e) => setCapexForm((f) => ({ ...f, costAmount: e.target.value }))} placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select value={capexForm.currency} onValueChange={(v) => setCapexForm((f) => ({ ...f, currency: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GHS">GHS</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {needsFx(capexForm.currency) && (
                    <div className="space-y-2">
                      <Label>FX rate to GHS</Label>
                      <Input type="number" step="any" value={capexForm.fxRateToGhs} onChange={(e) => setCapexForm((f) => ({ ...f, fxRateToGhs: e.target.value }))} placeholder="e.g. 15.20" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Planned month</Label>
                    <Input type="month" value={capexForm.plannedMonth} onChange={(e) => setCapexForm((f) => ({ ...f, plannedMonth: e.target.value }))} />
                  </div>
                </div>
                <SheetFooter>
                  <Button
                    disabled={!capexForm.item.trim() || !Number(capexForm.costAmount) || !capexForm.plannedMonth || createCapexMut.isPending}
                    onClick={() => createCapexMut.mutate({
                      item: capexForm.item.trim(), costAmount: Number(capexForm.costAmount), currency: capexForm.currency,
                      fxRateToGhs: capexForm.fxRateToGhs ? Number(capexForm.fxRateToGhs) : undefined, plannedMonth: capexForm.plannedMonth,
                    })}
                  >
                    {createCapexMut.isPending ? "Adding…" : "Add CapEx Item"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Cost (GHS)</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {capexEntries.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell>{c.item}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmtGhs(c.currency === "GHS" ? c.costAmount : c.costAmount * (c.fxRateToGhs ?? 1))}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{c.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {!capexLoading && capexEntries.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No CapEx items yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Repeat className="h-4 w-4 text-muted-foreground" /> Subscriptions</CardTitle>
              <CardDescription>Recurring platform costs, feeds the Expenditure Schedule.</CardDescription>
            </div>
            <Sheet open={subSheetOpen} onOpenChange={setSubSheetOpen}>
              <SheetTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Add</Button></SheetTrigger>
              <SheetContent className="sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Add Subscription</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Input value={subForm.item} onChange={(e) => setSubForm((f) => ({ ...f, item: e.target.value }))} placeholder="e.g. Cloud hosting" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Monthly amount</Label>
                      <Input type="number" value={subForm.monthlyAmount} onChange={(e) => setSubForm((f) => ({ ...f, monthlyAmount: e.target.value }))} placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select value={subForm.currency} onValueChange={(v) => setSubForm((f) => ({ ...f, currency: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GHS">GHS</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {needsFx(subForm.currency) && (
                    <div className="space-y-2">
                      <Label>FX rate to GHS</Label>
                      <Input type="number" step="any" value={subForm.fxRateToGhs} onChange={(e) => setSubForm((f) => ({ ...f, fxRateToGhs: e.target.value }))} placeholder="e.g. 15.20" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Effective from</Label>
                    <Input type="month" value={subForm.effectiveFrom} onChange={(e) => setSubForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
                  </div>
                </div>
                <SheetFooter>
                  <Button
                    disabled={!subForm.item.trim() || !Number(subForm.monthlyAmount) || !subForm.effectiveFrom || createSubMut.isPending}
                    onClick={() => createSubMut.mutate({
                      item: subForm.item.trim(), monthlyAmount: Number(subForm.monthlyAmount), currency: subForm.currency,
                      fxRateToGhs: subForm.fxRateToGhs ? Number(subForm.fxRateToGhs) : undefined, effectiveFrom: subForm.effectiveFrom,
                    })}
                  >
                    {createSubMut.isPending ? "Adding…" : "Add Subscription"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Monthly (GHS)</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {subEntries.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell>{s.item}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmtGhs(s.currency === "GHS" ? s.monthlyAmount : s.monthlyAmount * (s.fxRateToGhs ?? 1))}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{s.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {!subLoading && subEntries.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No subscriptions yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2"><Boxes className="h-4 w-4 text-muted-foreground" /> Depreciation schedule</CardTitle>
          <Sheet open={depSheetOpen} onOpenChange={setDepSheetOpen}>
            <SheetTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Asset</Button></SheetTrigger>
            <SheetContent className="sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Add Depreciable Asset</SheetTitle>
                <SheetDescription>Straight-line depreciation over the useful life you set.</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={depForm.category} onValueChange={(v) => setDepForm((f) => ({ ...f, category: v as DepreciationAssetCategory }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DEPRECIATION_CATEGORY_LABEL).map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={depForm.description} onChange={(e) => setDepForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. Company vehicle" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Cost basis (GHS)</Label>
                    <Input type="number" value={depForm.costBasis} onChange={(e) => setDepForm((f) => ({ ...f, costBasis: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Useful life (months)</Label>
                    <Input type="number" value={depForm.usefulLifeMonths} onChange={(e) => setDepForm((f) => ({ ...f, usefulLifeMonths: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Acquired month</Label>
                  <Input type="month" value={depForm.acquiredMonth} onChange={(e) => setDepForm((f) => ({ ...f, acquiredMonth: e.target.value }))} />
                </div>
              </div>
              <SheetFooter>
                <Button
                  disabled={!depForm.description.trim() || !Number(depForm.costBasis) || !Number(depForm.usefulLifeMonths) || !depForm.acquiredMonth || createDepMut.isPending}
                  onClick={() => createDepMut.mutate({
                    category: depForm.category, description: depForm.description.trim(), costBasis: Number(depForm.costBasis),
                    usefulLifeMonths: Number(depForm.usefulLifeMonths), acquiredMonth: depForm.acquiredMonth,
                  })}
                >
                  {createDepMut.isPending ? "Adding…" : "Add Asset"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead><TableHead>Category</TableHead>
                <TableHead className="text-right">Cost basis</TableHead><TableHead className="text-right">Monthly dep.</TableHead>
                <TableHead>Acquired</TableHead><TableHead>Status</TableHead><TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {depEntries.map((d) => (
                <TableRow key={d._id}>
                  <TableCell>{d.description}</TableCell>
                  <TableCell className="text-muted-foreground">{DEPRECIATION_CATEGORY_LABEL[d.category]}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{fmtGhs(d.costBasis)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{fmtGhs(d.costBasis / d.usefulLifeMonths)}</TableCell>
                  <TableCell className="text-muted-foreground">{d.acquiredMonth}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{d.status}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteDepMut.mutate(d._id)} disabled={deleteDepMut.isPending}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!depLoading && depEntries.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No depreciable assets yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SalariesSection />
    </div>
  );
}

function SalariesSection() {
  const isSuperadmin = useIsSuperadmin();

  if (!isSuperadmin) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> Salaries</CardTitle></CardHeader>
        <CardContent className="py-10 flex flex-col items-center justify-center text-center gap-2">
          <ShieldAlert className="h-7 w-7 text-muted-foreground/40 mb-1" />
          <p className="font-medium text-sm">Superadmin access required</p>
          <p className="text-xs text-muted-foreground max-w-sm">Individual compensation is personal data — this section is restricted to superadmins. The totals above already include salaries in aggregate.</p>
        </CardContent>
      </Card>
    );
  }

  return <SalariesSectionContent />;
}

function SalariesSectionContent() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({ staffName: "", role: "", department: PAYROLL_DEPARTMENTS[0] as string, isDirector: false, monthlySalary: "", otherStaffCostMonthly: "", effectiveFrom: "" });

  const { data, isLoading } = useQuery({ queryKey: ["projection-salaries"], queryFn: listSalaryEntries });
  const entries = data?.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["projection-salaries"] });

  const createMut = useMutation({
    mutationFn: createSalaryEntry,
    onSuccess: () => {
      toast({ title: "Staff member added" });
      setSheetOpen(false);
      setForm({ staffName: "", role: "", department: PAYROLL_DEPARTMENTS[0], isDirector: false, monthlySalary: "", otherStaffCostMonthly: "", effectiveFrom: "" });
      invalidate();
      qc.invalidateQueries({ queryKey: ["projection-expenditure"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to add", description: getFriendlyErrorMessage(e) }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteSalaryEntry,
    onSuccess: () => { toast({ title: "Staff member removed" }); invalidate(); qc.invalidateQueries({ queryKey: ["projection-expenditure"] }); },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to remove", description: getFriendlyErrorMessage(e) }),
  });

  const activeStaff = entries.filter((e) => e.status === "active");
  const totalMonthly = activeStaff.reduce((sum, e) => sum + e.monthlySalary + e.otherStaffCostMonthly, 0);
  const canSubmit = form.staffName.trim() && form.role.trim() && Number(form.monthlySalary) > 0 && form.effectiveFrom;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> Salaries</CardTitle>
          <CardDescription>Superadmin only — named staff compensation, rolled into Personnel Expenses above.</CardDescription>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Staff</Button></SheetTrigger>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Add Staff Member</SheetTitle>
              <SheetDescription>A raise or departure should be a new row (or edit status), not overwriting history.</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Staff name</Label>
                <Input value={form.staffName} onChange={(e) => setForm((f) => ({ ...f, staffName: e.target.value }))} placeholder="e.g. Ama Owusu" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="e.g. Field Agent Lead" />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYROLL_DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isDirector} onChange={(e) => setForm((f) => ({ ...f, isDirector: e.target.checked }))} className="h-4 w-4 rounded border-input" />
                Director (routes to Director's Remuneration, not Personnel)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Monthly salary (GHS)</Label>
                  <Input type="number" value={form.monthlySalary} onChange={(e) => setForm((f) => ({ ...f, monthlySalary: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Other cost (optional)</Label>
                  <Input type="number" value={form.otherStaffCostMonthly} onChange={(e) => setForm((f) => ({ ...f, otherStaffCostMonthly: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Effective from</Label>
                <Input type="month" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
              </div>
            </div>
            <SheetFooter>
              <Button
                disabled={!canSubmit || createMut.isPending}
                onClick={() => createMut.mutate({
                  staffName: form.staffName.trim(), role: form.role.trim(), department: form.department, isDirector: form.isDirector,
                  monthlySalary: Number(form.monthlySalary), otherStaffCostMonthly: form.otherStaffCostMonthly ? Number(form.otherStaffCostMonthly) : undefined,
                  effectiveFrom: form.effectiveFrom,
                })}
              >
                {createMut.isPending ? "Adding…" : "Add Staff Member"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Total active monthly cost: <span className="font-mono tabular-nums font-medium text-foreground">{fmtGhs(totalMonthly)}</span> across {activeStaff.length} staff member{activeStaff.length === 1 ? "" : "s"}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Department</TableHead>
              <TableHead className="text-right">Monthly cost</TableHead><TableHead>Effective from</TableHead>
              <TableHead>Status</TableHead><TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e._id}>
                <TableCell className="font-medium">{e.staffName}{e.isDirector && <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">Director</Badge>}</TableCell>
                <TableCell className="text-muted-foreground">{e.role}</TableCell>
                <TableCell className="text-muted-foreground">{e.department}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{fmtGhs(e.monthlySalary + e.otherStaffCostMonthly)}</TableCell>
                <TableCell className="text-muted-foreground">{e.effectiveFrom}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{e.status}</Badge></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMut.mutate(e._id)} disabled={deleteMut.isPending}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && entries.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No staff added yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const PNL_ROWS: Array<{ label: string; key: keyof PnlMonth; bold?: boolean; indent?: boolean; percent?: boolean }> = [
  { label: "Revenue", key: "revenue", bold: true },
  { label: "Direct Cost", key: "directCost", indent: true },
  { label: "Gross Profit", key: "grossProfit", bold: true },
  { label: "Gross Margin %", key: "grossMarginPct", percent: true, indent: true },
  { label: "Operating Expenses", key: "operatingExpenses", indent: true },
  { label: "Operating Income", key: "operatingIncome", bold: true },
  { label: "Operating Income %", key: "operatingIncomePct", percent: true, indent: true },
  { label: "Other Income", key: "otherIncome", indent: true },
  { label: "Profit Before Tax", key: "profitBeforeTax", bold: true },
  { label: "CIT (Corporate Tax)", key: "cit", indent: true },
  { label: "Profit After Tax", key: "profitAfterTax", bold: true },
  { label: "PAT %", key: "patPct", percent: true, indent: true },
];

export function ProjectionsStatementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-muted-foreground" /> Statements
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Projected P&L, Balance Sheet, and Cashflow.</p>
      </div>

      <Tabs defaultValue="pnl">
        <TabsList>
          <TabsTrigger value="pnl">P&amp;L</TabsTrigger>
          <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
        </TabsList>
        <TabsContent value="pnl" className="mt-6"><PnlStatementTab /></TabsContent>
        <TabsContent value="bs" className="mt-6"><BsStatementTab /></TabsContent>
        <TabsContent value="cashflow" className="mt-6"><CashflowStatementTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function IntegrityBadge({ balanced, deltaGhs }: { balanced: boolean; deltaGhs: number }) {
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
      balanced ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    )}>
      {balanced ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
      {balanced ? "Balance sheet balances (Assets = Equity + Liabilities)" : `Imbalance detected: ${fmtGhs(Math.abs(deltaGhs))} — see engine simplifications`}
    </div>
  );
}

function PnlStatementTab() {
  const { data, isLoading } = useQuery({ queryKey: ["projection-pnl"], queryFn: getProjectionPnl });
  const months = data?.months ?? [];
  const latest = months[0];

  const trendChartData = months.slice(0, 24).map((m) => ({
    name: m.month, Revenue: m.revenue, "Operating Expenses": Math.abs(m.operatingExpenses), "Profit After Tax": m.profitAfterTax,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard label="Revenue (this month)" value={isLoading || !latest ? "—" : fmtGhs(latest.revenue)} subtext="Fee + interest revenue" status="neutral" icon={<Wallet className="h-4 w-4" />} loading={isLoading} />
        <KpiCard label="Gross profit (this month)" value={isLoading || !latest ? "—" : fmtGhs(latest.grossProfit)} subtext={latest ? `${(latest.grossMarginPct * 100).toFixed(1)}% margin` : ""} status={latest && latest.grossProfit < 0 ? "red" : "green"} icon={<TrendingUp className="h-4 w-4" />} loading={isLoading} />
        <KpiCard label="Profit after tax (this month)" value={isLoading || !latest ? "—" : fmtGhs(latest.profitAfterTax)} subtext={latest ? `${(latest.patPct * 100).toFixed(1)}% of revenue` : ""} status={latest && latest.profitAfterTax < 0 ? "red" : "green"} icon={<Calculator className="h-4 w-4" />} loading={isLoading} />
        <KpiCard label="Loss carryforward" value={isLoading || !latest ? "—" : fmtGhs(latest.cumulativeLossCarryforward)} subtext="Offsets future taxable profit" status={latest && latest.cumulativeLossCarryforward > 0 ? "amber" : "neutral"} icon={<ShieldAlert className="h-4 w-4" />} loading={isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /> Revenue, OpEx & Profit After Tax — 24 month view</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTheme.tick }} interval={2} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} />
                  <Tooltip content={<ChartTooltip formatter={fmtGhs} />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Revenue" stroke="#378ADD" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Operating Expenses" stroke="#EF4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Profit After Tax" stroke="#1D9E75" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">P&L — latest month{latest ? ` (${latest.month})` : ""}</CardTitle>
          <CardDescription>Operating Expenses covers Personnel, Director's Remuneration, Subscriptions, and Depreciation — the source model's smaller fixed OpEx lines (insurance, utilities, etc.) aren't modeled as separate projection inputs yet.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !latest ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableBody>
                {PNL_ROWS.map((r) => {
                  const raw = latest[r.key] as number;
                  return (
                    <TableRow key={r.label} className={cn(r.bold && "border-t-2")}>
                      <TableCell className={cn(r.bold && "font-bold", r.indent && "pl-6 text-muted-foreground")}>{r.label}</TableCell>
                      <TableCell className={cn("text-right font-mono tabular-nums", r.bold && "font-bold", raw < 0 && "text-muted-foreground")}>
                        {r.percent ? `${(raw * 100).toFixed(1)}%` : fmtGhs(raw)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const BS_ROWS: Array<{ label: string; key: keyof BsYear; bold?: boolean; indent?: boolean }> = [
  { label: "Cash and Cash Equivalents", key: "cash", indent: true },
  { label: "Loans and Advances", key: "loansAndAdvances", indent: true },
  { label: "Trade and Other Receivables", key: "tradeReceivables", indent: true },
  { label: "Total Current Assets", key: "totalCurrentAssets", bold: true },
  { label: "PPE (Net Book Value)", key: "ppeNetBookValue", indent: true },
  { label: "Total Non-Current Assets", key: "totalNonCurrentAssets", bold: true },
  { label: "Total Assets", key: "totalAssets", bold: true },
  { label: "Stated Capital", key: "statedCapital", indent: true },
  { label: "Retained Earnings", key: "retainedEarnings", indent: true },
  { label: "Total Equity", key: "totalEquity", bold: true },
  { label: "Non-Current Liabilities", key: "nonCurrentLiabilities", indent: true },
  { label: "Current Liabilities", key: "currentLiabilities", indent: true },
  { label: "Total Equity & Liabilities", key: "totalEquityAndLiabilities", bold: true },
];

function BsStatementTab() {
  const { data, isLoading } = useQuery({ queryKey: ["projection-bs"], queryFn: getProjectionBs });
  const years = data?.years ?? [];
  const latest = years[years.length - 1];

  const trendChartData = years.map((y) => ({ name: `Year ${y.yearIndex}`, "Total Assets": y.totalAssets, "Total Equity & Liabilities": y.totalEquityAndLiabilities }));

  return (
    <div className="space-y-6">
      {data && <IntegrityBadge balanced={data.integrityCheck.balanced} deltaGhs={data.integrityCheck.deltaGhs} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Total assets (year 5)" value={isLoading || !latest ? "—" : fmtGhs(latest.totalAssets)} subtext={latest ? `Through ${latest.endMonth}` : ""} status="neutral" icon={<Landmark className="h-4 w-4" />} loading={isLoading} />
        <KpiCard label="Total equity (year 5)" value={isLoading || !latest ? "—" : fmtGhs(latest.totalEquity)} subtext="Stated capital + retained earnings" status={latest && latest.totalEquity < 0 ? "red" : "green"} icon={<Boxes className="h-4 w-4" />} loading={isLoading} />
        <KpiCard label="Cash (year 5)" value={isLoading || !latest ? "—" : fmtGhs(latest.cash)} subtext="Closing balance" status={latest && latest.cash < 0 ? "red" : "green"} icon={<Wallet className="h-4 w-4" />} loading={isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /> Total Assets vs. Total Equity &amp; Liabilities — 5 year view</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} />
                  <Tooltip content={<ChartTooltip formatter={fmtGhs} />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Total Assets" fill="#378ADD" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Total Equity & Liabilities" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Balance Sheet — by year</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading || years.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line item</TableHead>
                  {years.map((y) => <TableHead key={y.yearIndex} className="text-right">Year {y.yearIndex}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {BS_ROWS.map((r) => (
                  <TableRow key={r.label} className={cn(r.bold && "border-t-2")}>
                    <TableCell className={cn(r.bold && "font-bold", r.indent && "pl-6 text-muted-foreground")}>{r.label}</TableCell>
                    {years.map((y) => {
                      const raw = y[r.key] as number;
                      return (
                        <TableCell key={y.yearIndex} className={cn("text-right font-mono tabular-nums", r.bold && "font-bold", raw < 0 && "text-muted-foreground")}>
                          {fmtGhs(raw)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const CASHFLOW_ROWS: Array<{ label: string; key: keyof CashflowYear; bold?: boolean; indent?: boolean }> = [
  { label: "Profit After Tax", key: "profitAfterTax", indent: true },
  { label: "Depreciation Add-back", key: "depreciationAddBack", indent: true },
  { label: "Change in Trade Receivables", key: "changeInTradeReceivables", indent: true },
  { label: "Change in Loans & Advances", key: "changeInLoansAndAdvances", indent: true },
  { label: "Net Cash from Operations", key: "netCashFromOperations", bold: true },
  { label: "CapEx", key: "capex", indent: true },
  { label: "Net Cash from Investing", key: "netCashFromInvesting", bold: true },
  { label: "New Debt Drawn", key: "newDebtDrawn", indent: true },
  { label: "Dividends Paid", key: "dividendsPaid", indent: true },
  { label: "Net Cash from Financing", key: "netCashFromFinancing", bold: true },
  { label: "Net Change in Cash", key: "netChangeInCash", bold: true },
  { label: "Opening Cash", key: "openingCash", indent: true },
  { label: "Closing Cash", key: "closingCash", bold: true },
];

function CashflowStatementTab() {
  const { data, isLoading } = useQuery({ queryKey: ["projection-cashflow"], queryFn: getProjectionCashflow });
  const years = data?.years ?? [];
  const latest = years[years.length - 1];

  const trendChartData = years.map((y) => ({ name: `Year ${y.yearIndex}`, closingCash: y.closingCash }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Net cash from operations (year 5)" value={isLoading || !latest ? "—" : fmtGhs(latest.netCashFromOperations)} subtext="PAT + depreciation − working capital" status={latest && latest.netCashFromOperations < 0 ? "red" : "green"} icon={<TrendingUp className="h-4 w-4" />} loading={isLoading} />
        <KpiCard label="Net change in cash (year 5)" value={isLoading || !latest ? "—" : fmtGhs(latest.netChangeInCash)} subtext="Operating + investing + financing" status={latest && latest.netChangeInCash < 0 ? "red" : "green"} icon={<Wallet className="h-4 w-4" />} loading={isLoading} />
        <KpiCard label="Closing cash (year 5)" value={isLoading || !latest ? "—" : fmtGhs(latest.closingCash)} subtext="End-of-horizon cash balance" status={latest && latest.closingCash < 0 ? "red" : "green"} icon={<Landmark className="h-4 w-4" />} loading={isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /> Closing cash balance — 5 year view</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#378ADD" stopOpacity={0.6} /><stop offset="95%" stopColor="#378ADD" stopOpacity={0.05} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} />
                  <Tooltip content={<ChartTooltip formatter={fmtGhs} />} />
                  <Area type="monotone" dataKey="closingCash" name="Closing cash" stroke="#378ADD" strokeWidth={2} fill="url(#cashFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cashflow — by year</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading || years.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line item</TableHead>
                  {years.map((y) => <TableHead key={y.yearIndex} className="text-right">Year {y.yearIndex}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {CASHFLOW_ROWS.map((r) => (
                  <TableRow key={r.label} className={cn(r.bold && "border-t-2")}>
                    <TableCell className={cn(r.bold && "font-bold", r.indent && "pl-6 text-muted-foreground")}>{r.label}</TableCell>
                    {years.map((y) => {
                      const raw = y[r.key] as number;
                      return (
                        <TableCell key={y.yearIndex} className={cn("text-right font-mono tabular-nums", r.bold && "font-bold", raw < 0 && "text-muted-foreground")}>
                          {fmtGhs(raw)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
