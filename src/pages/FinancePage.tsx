import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  DollarSign, TrendingDown, TrendingUp, Wallet, Percent,
  Plus, Trash2, CheckCircle2, XCircle, Clock, AlertTriangle,
  Receipt, LayoutGrid, ArrowLeftRight, PieChart as PieChartIcon,
  Paperclip, Loader2, ExternalLink, Activity, Download,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, ComposedChart, Line, Area,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/analytics/KpiCard";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { uploadToStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import { EXPENSE_CATEGORIES, PAYROLL_DEPARTMENTS, type LedgerCategoryId } from "@/lib/constants";
import {
  getAccountingSettings, updateAccountingSettings,
  listLedgerEntries, createLedgerEntry, requestLedgerDeletion, approveLedgerDeletion, rejectLedgerDeletion,
  getPnl, getPnlTrend, getChannelBreakdown, getCashflow,
  type LedgerEntry,
} from "@/api/accounting.api";

function fmtGhs(n?: number) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function humanizeStatus(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

// Shared chart theme — matches the Analytics dashboard's recharts styling.
const chartTheme = {
  grid: "#33415533",
  tick: "#94a3b8",
  tooltipBg: "hsl(var(--card))",
  tooltipBorder: "hsl(var(--border))",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#1D9E75",
  PARTIAL_REPAID: "#378ADD",
  OVERDUE: "#FAC775",
  DEFAULTED: "#F97316",
  LOSS: "#A32D2D",
};

const CATEGORY_COLORS = ["#378ADD", "#1D9E75", "#FAC775", "#A855F7", "#F97316", "#EC4899", "#0EA5E9"];

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-card px-3 py-2 text-xs shadow-lg" style={{ borderColor: chartTheme.tooltipBorder }}>
      {label && <p className="font-semibold mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <Input
      type="month"
      value={month}
      onChange={(e) => onChange(e.target.value)}
      className="w-40"
    />
  );
}

// ── Overview ─────────────────────────────────────────────────────────────

function pctChange(current: number, previous: number): number | undefined {
  if (previous === 0) return undefined;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function trendFromSeries(current?: number, previous?: number): { direction: "up" | "down" | "flat"; value: string; label: string } | undefined {
  if (current === undefined || previous === undefined) return undefined;
  const delta = pctChange(current, previous);
  if (delta === undefined) return undefined;
  return {
    direction: delta > 0.5 ? "up" : delta < -0.5 ? "down" : "flat",
    value: `${Math.abs(delta).toFixed(1)}%`,
    label: "vs. last month",
  };
}

function OverviewTab({ month }: { month: string }) {
  const { data: pnl, isLoading } = useQuery({ queryKey: ["accounting-pnl", month], queryFn: () => getPnl(month) });
  const { data: trend, isLoading: trendLoading } = useQuery({ queryKey: ["accounting-pnl-trend", month], queryFn: () => getPnlTrend(month, 6) });

  const lossLoan = pnl?.portfolio.find((p) => p.status === "LOSS");
  const totalOutstanding = pnl?.portfolio.reduce((s, p) => s + p.outstandingValue, 0) ?? 0;
  const marginPct = pnl && pnl.revenue.total > 0 ? (pnl.grossMargin / pnl.revenue.total) * 100 : undefined;

  const trendMonths = trend?.months ?? [];
  const thisMonthTrend = trendMonths[trendMonths.length - 1];
  const lastMonthTrend = trendMonths[trendMonths.length - 2];
  const revenueTrend = trendFromSeries(thisMonthTrend?.revenue, lastMonthTrend?.revenue);
  const marginTrend = trendFromSeries(thisMonthTrend?.grossMargin, lastMonthTrend?.grossMargin);

  const trendChartData = trendMonths.map((m) => ({
    name: format(new Date(`${m.month}-01`), "MMM"),
    revenue: m.revenue,
    grossMargin: m.grossMargin,
  }));

  const barData = pnl ? [
    { name: "Revenue", value: pnl.revenue.total, fill: "#378ADD" },
    { name: "Direct costs", value: pnl.directCosts.total, fill: "#FAC775" },
    { name: "Indirect costs", value: pnl.indirectCosts.total, fill: "#F97316" },
    { name: "Margin", value: pnl.grossMargin, fill: pnl.grossMargin >= 0 ? "#1D9E75" : "#A32D2D" },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Deliberately no red/green traffic-lighting on the KPI tone itself —
          a business being down this month isn't an alarm; that pattern
          trains people to stop trusting the color. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Revenue"
          value={isLoading ? "—" : fmtGhs(pnl?.revenue.total)}
          subtext={pnl ? `${pnl.revenue.repaidLoanCount} loans settled` : ""}
          trend={revenueTrend}
          status="neutral"
          icon={<TrendingUp className="h-4 w-4" />}
          loading={isLoading}
        />
        <KpiCard
          label="Gross Margin"
          value={isLoading ? "—" : fmtGhs(pnl?.grossMargin)}
          subtext={marginPct !== undefined ? `${marginPct.toFixed(1)}% of revenue` : ""}
          trend={marginTrend}
          status="neutral"
          icon={<DollarSign className="h-4 w-4" />}
          loading={isLoading}
        />
        <KpiCard
          label="Cost of Funds"
          value={isLoading ? "—" : fmtGhs(pnl?.directCosts.costOfFunds)}
          subtext={pnl ? `${pnl.directCosts.costOfFundsRatePercent}% of ${fmtGhs(pnl.directCosts.totalDisbursedThisMonth)} disbursed` : ""}
          status="neutral"
          icon={<Percent className="h-4 w-4" />}
          loading={isLoading}
        />
        <KpiCard
          label="Loan Book (outstanding)"
          value={isLoading ? "—" : fmtGhs(totalOutstanding)}
          subtext="Active + overdue + defaulted"
          status="neutral"
          icon={<Wallet className="h-4 w-4" />}
          loading={isLoading}
        />
      </div>

      {lossLoan && lossLoan.count > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/10">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-300 shrink-0" />
            <p className="text-sm">
              <span className="font-bold">{lossLoan.count}</span> loan{lossLoan.count === 1 ? "" : "s"} classified as loss this period — {fmtGhs(lossLoan.outstandingValue)} outstanding.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" /> Revenue &amp; margin trend</CardTitle>
          <CardDescription>Last 6 months, ending {format(new Date(`${month}-01`), "MMMM yyyy")}</CardDescription>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <div className="h-[240px] w-full rounded-lg bg-muted/50 animate-pulse" />
          ) : trendChartData.every((d) => d.revenue === 0 && d.grossMargin === 0) ? (
            <div className="h-[240px] flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-8 w-8 opacity-30" />
              No revenue recognized in this window yet
            </div>
          ) : (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#378ADD" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#378ADD" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip formatter={fmtGhs} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#378ADD" strokeWidth={2} fill="url(#revenueFill)" />
                  <Line type="monotone" dataKey="grossMargin" name="Gross margin" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-muted-foreground" /> Revenue vs. cost</CardTitle>
          <CardDescription>{format(new Date(`${month}-01`), "MMMM yyyy")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !pnl ? (
            <div className="h-[260px] w-full rounded-lg bg-muted/50 animate-pulse" />
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip formatter={fmtGhs} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── P&L ──────────────────────────────────────────────────────────────────

function PnlTab({ month }: { month: string }) {
  const { data: pnl, isLoading } = useQuery({ queryKey: ["accounting-pnl", month], queryFn: () => getPnl(month) });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!pnl) return null;

  const rows: { label: string; value: number; bold?: boolean; indent?: boolean }[] = [
    { label: "Interest revenue", value: pnl.revenue.interest, indent: true },
    { label: "Fee revenue", value: pnl.revenue.fee, indent: true },
    { label: "Total revenue", value: pnl.revenue.total, bold: true },
    { label: "Cost of funds", value: -pnl.directCosts.costOfFunds, indent: true },
    { label: "Direct ledger costs", value: -pnl.directCosts.ledgerDirect, indent: true },
    { label: "Total direct costs", value: -pnl.directCosts.total, bold: true },
    { label: "Indirect costs (OpEx)", value: -pnl.indirectCosts.total, bold: true },
    { label: "Gross margin", value: pnl.grossMargin, bold: true },
  ];

  const categoryData = pnl.indirectCosts.byCategory.map((c, i) => ({
    name: EXPENSE_CATEGORIES.find((e) => e.id === c._id.category)?.label ?? c._id.category,
    department: c._id.department,
    value: c.total,
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  const payrollByDept = pnl.indirectCosts.byCategory.filter((c) => c._id.category === "payroll");
  const payrollTotal = payrollByDept.reduce((s, c) => s + c.total, 0);
  const payrollRows = PAYROLL_DEPARTMENTS.map((dept) => ({
    dept,
    amount: payrollByDept.find((c) => c._id.department === dept)?.total ?? 0,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-muted-foreground" /> P&amp;L — {format(new Date(`${month}-01`), "MMMM yyyy")}</CardTitle>
          <CardDescription>Revenue recognized in the month a loan settles, not the month it was disbursed.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.label} className={cn(r.bold && "border-t-2")}>
                  <TableCell className={cn(r.bold && "font-bold", r.indent && "pl-6 text-muted-foreground")}>{r.label}</TableCell>
                  <TableCell className={cn("text-right font-mono tabular-nums", r.bold && "font-bold", r.value < 0 && "text-muted-foreground")}>{fmtGhs(r.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-muted-foreground" /> Indirect costs by category</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No indirect costs logged this period</div>
          ) : (
            <>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {categoryData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={fmtGhs} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {categoryData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                      {d.name}{d.department ? ` — ${d.department}` : ""}
                    </span>
                    <span className="font-mono tabular-nums">{fmtGhs(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-muted-foreground" /> Payroll by department</CardTitle>
          <CardDescription>Salaries logged as ledger entries with category "Payroll", grouped by department for this period.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Department</TableHead><TableHead className="text-right">Amount</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {payrollRows.map((r) => (
                <TableRow key={r.dept}>
                  <TableCell className={cn(r.amount === 0 && "text-muted-foreground")}>{r.dept}</TableCell>
                  <TableCell className={cn("text-right font-mono tabular-nums", r.amount === 0 && "text-muted-foreground")}>{fmtGhs(r.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2">
                <TableCell className="font-bold">Total payroll</TableCell>
                <TableCell className="text-right font-mono tabular-nums font-bold">{fmtGhs(payrollTotal)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Portfolio ────────────────────────────────────────────────────────────

function PortfolioTab({ month }: { month: string }) {
  const { data: pnl, isLoading } = useQuery({ queryKey: ["accounting-pnl", month], queryFn: () => getPnl(month) });

  const portfolio = pnl?.portfolio ?? [];
  const total = portfolio.reduce((s, p) => s + p.outstandingValue, 0);
  const chartData = portfolio.map((p) => ({
    name: humanizeStatus(p.status),
    status: p.status,
    value: p.outstandingValue,
    count: p.count,
    fill: STATUS_COLOR[p.status] ?? "#94a3b8",
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-muted-foreground" /> Composition</CardTitle>
          <CardDescription>By outstanding balance</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : chartData.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">No loans in the book</div>
          ) : (
            <>
              <div className="h-[240px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                      {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={fmtGhs} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-muted-foreground">Total book</span>
                  <span className="text-lg font-bold font-mono">{fmtGhs(total)}</span>
                </div>
              </div>
              <div className="space-y-1.5 mt-2">
                {chartData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                      {d.name}
                    </span>
                    <span className="font-mono tabular-nums">{d.count} loans</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader><CardTitle className="text-base">Portfolio composition</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Status</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Outstanding value</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {portfolio.map((p) => (
                  <TableRow key={p.status}>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[p.status] ?? "#94a3b8" }} />
                        {humanizeStatus(p.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{p.count}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmtGhs(p.outstandingValue)}</TableCell>
                  </TableRow>
                ))}
                {portfolio.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No loans in the book</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Channels ─────────────────────────────────────────────────────────────

function channelLabel(r: { channel?: string; provider?: string }) {
  const parts = [r.channel, r.provider].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Unknown";
}

function ChannelPanel({
  title, icon: Icon, rows, loading, barColor,
}: {
  title: string;
  icon: any;
  rows: { _id: { channel?: string; provider?: string }; count: number; volume: number }[] | undefined;
  loading: boolean;
  barColor: string;
}) {
  const chartData = (rows ?? [])
    .map((r) => ({ name: channelLabel(r._id), volume: r.volume, count: r.count }))
    .sort((a, b) => b.volume - a.volume);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /> {title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No data for this period</p>
        ) : (
          <div className="w-full" style={{ height: Math.max(160, chartData.length * 48) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartTheme.grid} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={110} tick={{ fontSize: 12, fill: chartTheme.tick }} />
                <Tooltip content={<ChartTooltip formatter={fmtGhs} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                <Bar dataKey="volume" radius={[0, 6, 6, 0]} fill={barColor} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow><TableHead>Channel</TableHead><TableHead>Provider</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Volume</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {rows?.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r._id.channel ?? "—"}</TableCell>
                <TableCell>{r._id.provider ?? "—"}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{r.count}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{fmtGhs(r.volume)}</TableCell>
              </TableRow>
            ))}
            {rows?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No data for this period</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ChannelsTab({ month }: { month: string }) {
  const { data: disbursement, isLoading: l1 } = useQuery({ queryKey: ["accounting-channels", "disbursement", month], queryFn: () => getChannelBreakdown("disbursement", month) });
  const { data: collection, isLoading: l2 } = useQuery({ queryKey: ["accounting-channels", "collection", month], queryFn: () => getChannelBreakdown("collection", month) });

  return (
    <div className="space-y-6">
      <ChannelPanel title="Disbursements (outflow)" icon={TrendingDown} rows={disbursement?.breakdown} loading={l1} barColor="#F97316" />
      <ChannelPanel title="Repayments (inflow)" icon={ArrowLeftRight} rows={collection?.breakdown} loading={l2} barColor="#1D9E75" />
    </div>
  );
}

// ── Cash flow ────────────────────────────────────────────────────────────

function CashflowTab({ month }: { month: string }) {
  const { data: cf, isLoading } = useQuery({ queryKey: ["accounting-cashflow", month], queryFn: () => getCashflow(month) });

  const chartData = (cf?.weeks ?? []).map((w) => ({
    name: w.weekLabel,
    inflow: w.expectedInflow,
    loanCount: w.loanCount,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Expected inflow"
          value={isLoading ? "—" : fmtGhs(cf?.weeks.reduce((s, w) => s + w.expectedInflow, 0))}
          subtext="Balance due this month, by week"
          status="neutral"
          icon={<TrendingUp className="h-4 w-4" />}
          loading={isLoading}
        />
        <KpiCard
          label="Known outflow"
          value={isLoading ? "—" : fmtGhs(cf?.knownOutflow.total)}
          subtext="Cost of funds + all ledger entries"
          status="neutral"
          icon={<TrendingDown className="h-4 w-4" />}
          loading={isLoading}
        />
        <KpiCard
          label="Net projected"
          value={isLoading ? "—" : fmtGhs(cf?.netProjected)}
          subtext="Expected inflow minus known outflow"
          status="neutral"
          icon={<Activity className="h-4 w-4" />}
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" /> Expected collections by week</CardTitle>
          <CardDescription>Outstanding balance on loans due each week — a forecast, not a guarantee; some will slip to overdue.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : chartData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No loans due this period</div>
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip formatter={fmtGhs} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                  <Bar dataKey="inflow" name="Expected inflow" radius={[6, 6, 0, 0]} fill="#378ADD" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Ledger ───────────────────────────────────────────────────────────────

function ReceiptCell({ receiptUrl }: { receiptUrl?: string }) {
  const signedUrl = useSignedUrl(receiptUrl);
  if (!receiptUrl) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <a
      href={signedUrl ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        signedUrl ? "text-primary hover:underline" : "text-muted-foreground pointer-events-none",
      )}
    >
      <Paperclip className="h-3 w-3" /> View <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function LedgerTab({ month }: { month: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { canWrite, canDelete } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [form, setForm] = useState({ category: "" as LedgerCategoryId | "", department: "", description: "", amount: "", periodMonth: month });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LedgerEntry | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [approvalTarget, setApprovalTarget] = useState<{ entry: LedgerEntry; action: "approve" | "reject" } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<LedgerCategoryId | "all">("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["ledger-entries", month, categoryFilter, departmentFilter],
    queryFn: () => listLedgerEntries({
      periodMonth: month,
      limit: 100,
      category: categoryFilter === "all" ? undefined : categoryFilter,
      department: departmentFilter === "all" ? undefined : (departmentFilter as any),
    }),
  });

  const visibleEntries = (data?.data ?? []).filter((e) =>
    !search.trim() || e.description.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const exportCsv = () => {
    const header = ["Category", "Department", "Description", "Cost Type", "Amount (GHS)", "Period", "Status"];
    const rows = visibleEntries.map((e) => [
      EXPENSE_CATEGORIES.find((c) => c.id === e.category)?.label ?? e.category,
      e.department ?? "",
      `"${e.description.replace(/"/g, '""')}"`,
      e.costType,
      e.amount.toFixed(2),
      e.periodMonth,
      e.status,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ledger-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ledger-entries"] });

  const createMut = useMutation({
    mutationFn: async (payload: Parameters<typeof createLedgerEntry>[0]) => {
      if (receiptFile) {
        setUploadingReceipt(true);
        const ext = receiptFile.name.split(".").pop() || "pdf";
        const upload = await uploadToStorage(receiptFile, `ledger/${Date.now()}-${payload.category}.${ext}`);
        setUploadingReceipt(false);
        if (!upload.success || !upload.key) {
          throw new Error(upload.error || "Receipt upload failed");
        }
        payload = { ...payload, receiptUrl: upload.key };
      }
      return createLedgerEntry(payload);
    },
    onSuccess: () => {
      toast({ title: "Entry created" });
      setIsSheetOpen(false);
      setForm({ category: "", department: "", description: "", amount: "", periodMonth: month });
      setReceiptFile(null);
      invalidate();
    },
    onError: (e: any) => { setUploadingReceipt(false); toast({ variant: "destructive", title: "Failed to create entry", description: getFriendlyErrorMessage(e) }); },
  });

  const requestDeleteMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => requestLedgerDeletion(id, reason),
    onSuccess: () => {
      toast({ title: "Deletion requested — pending superadmin approval" });
      setDeleteTarget(null);
      setDeleteReason("");
      invalidate();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to request deletion", description: getFriendlyErrorMessage(e) }),
  });

  const approveMut = useMutation({
    mutationFn: approveLedgerDeletion,
    onSuccess: () => { toast({ title: "Deletion approved" }); setApprovalTarget(null); invalidate(); },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to approve", description: getFriendlyErrorMessage(e) }),
  });

  const rejectMut = useMutation({
    mutationFn: rejectLedgerDeletion,
    onSuccess: () => { toast({ title: "Deletion rejected — entry restored" }); setApprovalTarget(null); invalidate(); },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to reject", description: getFriendlyErrorMessage(e) }),
  });

  const selectedCategory = EXPENSE_CATEGORIES.find((c) => c.id === form.category);
  const canSubmit = form.category && form.description.trim() && Number(form.amount) > 0 && form.periodMonth && (!selectedCategory?.requiresDepartment || form.department);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as LedgerCategoryId | "all")}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {categoryFilter === "payroll" && (
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="All departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {PAYROLL_DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Input
            placeholder="Search description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-[200px]"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={visibleEntries.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        {canWrite && (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> New Entry</Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md">
              <SheetHeader>
                <SheetTitle>New Ledger Entry</SheetTitle>
                <SheetDescription>The category drives which P&amp;L line this flows into automatically.</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as LedgerCategoryId, department: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCategory?.requiresDepartment && (
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger>
                      <SelectContent>
                        {PAYROLL_DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. August SMS gateway subscription" />
                </div>
                <div className="space-y-2">
                  <Label>Amount (GHS)</Label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Input type="month" value={form.periodMonth} onChange={(e) => setForm((f) => ({ ...f, periodMonth: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Receipt (optional)</Label>
                  <label className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors">
                    <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate text-muted-foreground">{receiptFile ? receiptFile.name : "Attach a receipt or invoice"}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>
              <SheetFooter>
                <Button
                  disabled={!canSubmit || createMut.isPending || uploadingReceipt}
                  onClick={() => createMut.mutate({
                    category: form.category as LedgerCategoryId,
                    department: form.department ? (form.department as any) : undefined,
                    description: form.description.trim(),
                    amount: Number(form.amount),
                    periodMonth: form.periodMonth,
                  })}
                >
                  {uploadingReceipt ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading receipt…</>) : createMut.isPending ? "Creating…" : "Create Entry"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEntries.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell>{EXPENSE_CATEGORIES.find((c) => c.id === entry.category)?.label ?? entry.category}{entry.department ? ` — ${entry.department}` : ""}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                        entry.costType === "direct" ? "bg-orange-500/15 text-orange-700 dark:text-orange-300" : "bg-sky-500/15 text-sky-700 dark:text-sky-300",
                      )}>
                        {entry.costType}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmtGhs(entry.amount)}</TableCell>
                    <TableCell><ReceiptCell receiptUrl={entry.receiptUrl} /></TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                        entry.status === "active" && "bg-green-100 text-green-800",
                        entry.status === "pending_deletion" && "bg-amber-100 text-amber-800",
                      )}>
                        {entry.status === "pending_deletion" && <Clock className="h-3 w-3" />}
                        {humanizeStatus(entry.status).replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {entry.status === "active" && canWrite && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(entry)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {entry.status === "pending_deletion" && canDelete && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => setApprovalTarget({ entry, action: "approve" })}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setApprovalTarget({ entry, action: "reject" })}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {visibleEntries.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{search.trim() ? "No entries match your search" : "No ledger entries for this period"}</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Deletion</DialogTitle>
            <DialogDescription>This doesn't delete the entry — it flags it for a superadmin to approve or reject.</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label>Reason</Label>
            <Textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="e.g. Duplicate entry" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!deleteReason.trim() || requestDeleteMut.isPending}
              onClick={() => deleteTarget && requestDeleteMut.mutate({ id: deleteTarget._id, reason: deleteReason.trim() })}
            >
              {requestDeleteMut.isPending ? "Requesting…" : "Request Deletion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!approvalTarget} onOpenChange={(v) => !v && setApprovalTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{approvalTarget?.action === "approve" ? "Approve Deletion" : "Reject Deletion"}</DialogTitle>
            <DialogDescription>
              {approvalTarget?.action === "approve"
                ? "This permanently removes the entry from active reporting."
                : "The entry reverts to active and stays in the ledger."}
            </DialogDescription>
          </DialogHeader>
          {approvalTarget?.entry.deletionReason && (
            <p className="text-sm text-muted-foreground">Reason given: "{approvalTarget.entry.deletionReason}"</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalTarget(null)}>Cancel</Button>
            <Button
              variant={approvalTarget?.action === "approve" ? "destructive" : "default"}
              disabled={approveMut.isPending || rejectMut.isPending}
              onClick={() => {
                if (!approvalTarget) return;
                if (approvalTarget.action === "approve") approveMut.mutate(approvalTarget.entry._id);
                else rejectMut.mutate(approvalTarget.entry._id);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Settings (cost of funds rate) ───────────────────────────────────────

function SettingsCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { canWrite } = useAuth();
  const { data: settings } = useQuery({ queryKey: ["accounting-settings"], queryFn: getAccountingSettings });
  const [rate, setRate] = useState<string>("");

  const mut = useMutation({
    mutationFn: (costOfFundsRatePercent: number) => updateAccountingSettings({ costOfFundsRatePercent }),
    onSuccess: () => { toast({ title: "Cost of funds rate updated" }); qc.invalidateQueries({ queryKey: ["accounting-settings"] }); qc.invalidateQueries({ queryKey: ["accounting-pnl"] }); },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to update", description: getFriendlyErrorMessage(e) }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cost of funds</CardTitle>
        <CardDescription>Monthly rate applied to that month's total disbursed principal. Current: {settings?.costOfFundsRatePercent ?? "—"}%/month.</CardDescription>
      </CardHeader>
      {canWrite && (
        <CardContent className="flex items-end gap-3">
          <div className="space-y-2">
            <Label>New rate (%)</Label>
            <Input type="number" step="0.1" placeholder={String(settings?.costOfFundsRatePercent ?? "")} value={rate} onChange={(e) => setRate(e.target.value)} className="w-32" />
          </div>
          <Button disabled={!rate || mut.isPending} onClick={() => mut.mutate(Number(rate))}>{mut.isPending ? "Saving…" : "Update"}</Button>
        </CardContent>
      )}
    </Card>
  );
}

// ── Pages — one per /finance/* route, FinanceLayout provides the shell ──

function PageHeader({ title, month, onMonth }: { title: string; month: string; onMonth: (m: string) => void }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <MonthPicker month={month} onChange={onMonth} />
    </div>
  );
}

export function FinanceOverviewPage() {
  const [month, setMonth] = useState(currentMonth());
  return (
    <div>
      <PageHeader title="Overview" month={month} onMonth={setMonth} />
      <div className="space-y-6">
        <OverviewTab month={month} />
        <SettingsCard />
      </div>
    </div>
  );
}

export function FinancePnlPage() {
  const [month, setMonth] = useState(currentMonth());
  return (
    <div>
      <PageHeader title="P&L" month={month} onMonth={setMonth} />
      <PnlTab month={month} />
    </div>
  );
}

export function FinanceLedgerPage() {
  const [month, setMonth] = useState(currentMonth());
  return (
    <div>
      <PageHeader title="Ledger" month={month} onMonth={setMonth} />
      <LedgerTab month={month} />
    </div>
  );
}

export function FinanceChannelsPage() {
  const [month, setMonth] = useState(currentMonth());
  return (
    <div>
      <PageHeader title="Channels" month={month} onMonth={setMonth} />
      <ChannelsTab month={month} />
    </div>
  );
}

export function FinanceCashflowPage() {
  const [month, setMonth] = useState(currentMonth());
  return (
    <div>
      <PageHeader title="Cash Flow" month={month} onMonth={setMonth} />
      <CashflowTab month={month} />
    </div>
  );
}

export function FinancePortfolioPage() {
  const [month, setMonth] = useState(currentMonth());
  return (
    <div>
      <PageHeader title="Portfolio" month={month} onMonth={setMonth} />
      <PortfolioTab month={month} />
    </div>
  );
}
