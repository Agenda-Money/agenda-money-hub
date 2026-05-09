import React, { useState } from 'react';
import { useCsaPerformance } from './analytics.hooks';
import { DateRange } from './analytics.types';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PhoneCall, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  ComposedChart,
} from "recharts";
import { safeNum, fGHS, fPct } from "./analytics.helpers";

export function SectionHead({ title }: { title: string }) {
  return (
    <div className="mb-6 mt-12 flex items-center gap-3">
      <h2 className="m-0 text-sm font-semibold uppercase tracking-widest text-foreground">{title}</h2>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function SectionError({ section, onRetry }: { section: string; onRetry?: () => void }) {
  return (
    <Card className="mb-6 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-4 shadow-sm">
      <p className="m-0 text-[13px] font-medium text-red-700 dark:text-red-300">Could not load {section} - try refreshing</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-red-500/20 bg-background px-4 py-1.5 text-[12px] font-semibold text-red-700 shadow-sm transition-colors hover:bg-muted dark:text-red-300"
        >
          Refresh
        </button>
      )}
    </Card>
  );
}

export function PanelHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="m-0 text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
      {right && <div className="text-[11px] text-muted-foreground">{right}</div>}
    </div>
  );
}

const tierBarColor = (rate: number) => {
  if (rate >= 80) return "bg-[#1D9E75]";
  if (rate >= 50) return "bg-[#FAC775]";
  return "bg-[#A32D2D]";
};

function TierTable({ title, data, valueKey }: { title: string; data: any[]; valueKey: string }) {
  const sorted = [...data].sort((a, b) => safeNum(a.tier) - safeNum(b.tier));

  return (
    <div className="flex-1 rounded-[14px] border border-border/60 bg-card p-5 shadow-sm">
      <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <div className="space-y-3">
        {sorted.map((row) => {
          const rate = safeNum(row[valueKey] || row.rate);
          return (
            <div key={row.tier} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="w-6 font-semibold text-foreground">T{row.tier}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${tierBarColor(rate)}`} style={{ width: `${Math.min(rate, 100)}%` }} />
              </div>
              <span className="w-10 text-right font-semibold tabular-nums text-foreground">{rate.toFixed(1)}%</span>
            </div>
          );
        })}
        {sorted.length === 0 && <p className="py-2 text-xs text-muted-foreground">No data available</p>}
      </div>
    </div>
  );
}

export function TierBreakdownTables({ repayment, defaultRate, collection }: { repayment?: any[]; defaultRate?: any[]; collection?: any[] }) {
  return (
    <div className="mt-4 flex w-full flex-col gap-4 md:flex-row">
      <TierTable title="Repayment Rate" data={repayment || []} valueKey="rate" />
      <TierTable title="Default Rate" data={defaultRate || []} valueKey="rate" />
      <TierTable title="Collection Rate" data={collection || []} valueKey="rate" />
    </div>
  );
}

const chartTheme = {
  grid: "#33415533",
  tick: "#94a3b8",
  tooltipBg: "hsl(var(--card))",
  tooltipBorder: "hsl(var(--border))",
};

export function ChartSignupGrowth({ data }: { data: any[] }) {
  if (!data?.length) return <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">No data available</div>;

  const grouped = data.reduce((acc: any, curr: any) => {
    const m = curr.month || "Unknown";
    if (!acc[m]) acc[m] = { month: m, edgeCount: 0, graduatedCount: 0, rawMonth: m };
    if (curr.edgeCount !== undefined) acc[m].edgeCount += safeNum(curr.edgeCount);
    if (curr.graduatedCount !== undefined) acc[m].graduatedCount += safeNum(curr.graduatedCount);
    if (curr.edgeCount === undefined && curr.count !== undefined) {
      if (curr.isGraduated) acc[m].graduatedCount += safeNum(curr.count);
      else acc[m].edgeCount += safeNum(curr.count);
    }
    return acc;
  }, {});

  const chartData = Object.values(grouped)
    .sort((a: any, b: any) => a.rawMonth.localeCompare(b.rawMonth))
    .map((d: any) => {
      const mStr = d.month || "";
      return { ...d, monthFormat: mStr.length > 5 ? mStr.slice(5) : mStr };
    });

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
          <XAxis dataKey="monthFormat" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${chartTheme.tooltipBorder}`, backgroundColor: chartTheme.tooltipBg, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
          <Line type="monotone" dataKey="edgeCount" name="Edge users" stroke="#378ADD" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="graduatedCount" name="Graduated nodes" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartTierDistribution({ data }: { data: any[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!data?.length) return <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">No data available</div>;

  const sorted = [...data].sort((a, b) => safeNum(a.tier) - safeNum(b.tier));
  const displayData = expanded ? sorted : sorted.slice(0, 5);
  const hasMore = sorted.length > displayData.length;

  return (
    <div className="mt-4 flex w-full flex-col gap-4">
      {displayData.map((d, i) => {
        const pct = safeNum(d.percentage);
        return (
          <div key={i} className="flex w-full flex-col gap-1.5">
            <div className="mb-1 flex w-full items-center justify-between">
              <span className="text-[12px] font-bold text-foreground">T{d.tier}</span>
              <div className="flex items-center gap-2 text-[10px] sm:gap-3 sm:text-[11px]">
                <span className="font-semibold text-foreground">{pct.toFixed(1)}%</span>
                <span className="text-muted-foreground">{safeNum(d.userCount).toLocaleString()} users</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">Avg {fGHS(d.avgLoanSize)}</span>
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-[#1D9E75] transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        );
      })}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 w-full rounded-lg bg-muted py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/80"
        >
          {expanded ? "Show Less" : "Show More"}
        </button>
      )}
    </div>
  );
}

export function GeographicList({ data }: { data: any[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!data?.length) return <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">No data available</div>;

  const sorted = [...data].sort((a, b) => safeNum(b.userCount) - safeNum(a.userCount));
  const isKnown = (region: string) => region && region.toLowerCase().trim() !== "unknown";
  const displayData = expanded ? sorted : sorted.filter((r) => isKnown(r.region)).slice(0, 5);
  const hasMore = sorted.length > displayData.length;

  const getRepaymentPill = (rate: number) => {
    if (rate >= 80) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    if (rate >= 50) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    return "bg-red-500/15 text-red-700 dark:text-red-300";
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between border-b px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-2">
        <span>Region</span>
        <div className="flex items-center gap-4 sm:gap-10">
          <span>Users</span>
          <span>Repayment R.</span>
        </div>
      </div>
      <div className="space-y-1">
        {displayData.map((row, i) => {
          const rate = safeNum(row.repaymentRate);
          return (
            <div key={i} className="flex items-center justify-between overflow-hidden rounded-lg px-1 py-2 transition-colors hover:bg-muted/40 sm:px-2 sm:py-2.5">
              <span className="flex-1 truncate pr-2 text-[11px] font-medium text-foreground sm:text-[12px]">{row.region || "Unknown"}</span>
              <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-6">
                <span className="w-8 text-right text-[11px] font-semibold tabular-nums sm:w-12 sm:text-[12px]">{safeNum(row.userCount).toLocaleString()}</span>
                <span className={`w-12 rounded-full px-2 py-1 text-center text-[10px] font-bold tabular-nums sm:w-14 sm:text-[11px] ${getRepaymentPill(rate)}`}>
                  {rate.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 w-full rounded-lg bg-muted py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/80"
        >
          {expanded ? "Show Less" : "Show More"}
        </button>
      )}
    </div>
  );
}

export function ChartDisbColl({ data }: { data: any[] }) {
  if (!data?.length) return <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">No data available</div>;

  const formattedData = data.map((d) => ({
    ...d,
    monthShort: d.month?.slice(0, 3) || '', // "Jan", "Feb" etc per spec. Assuming backend sends full string or YYYY-MM. 
    // Fallback if it's YYYY-MM
    displayMonth: d.month?.includes('-') ? new Date(d.month + '-01').toLocaleString('en-US', { month: 'long' }) : (d.month || '').slice(0,3)
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barGap={2} barSize={20}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
          <XAxis dataKey="displayMonth" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} dy={10} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} />
          <Tooltip cursor={{ fill: "rgba(148,163,184,0.08)" }} contentStyle={{ borderRadius: 12, border: `1px solid ${chartTheme.tooltipBorder}`, backgroundColor: chartTheme.tooltipBg, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
          <Bar yAxisId="left" dataKey="disbursed" name="Disbursed (GHS)" fill="#1D9E75" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="left" dataKey="collected" name="Collected (GHS)" fill="#378ADD" radius={[4, 4, 0, 0]} />
          <Line yAxisId="left" type="monotone" dataKey="net" name="Net Flow" stroke="#cbd5e1" strokeWidth={1.5} dot={{ r: 2, fill: "#cbd5e1" }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RepaymentChannels({ data }: { data: any }) {
  const channels = data?.channels || [];
  if (!channels.length) return <div className="p-8 text-center text-sm text-muted-foreground">No data available</div>;

  const app = channels.find((c: any) => c.method === "app") || { method: "app", transactionCount: 0, volumeGHS: 0, percentage: 0 };
  const ussd = channels.find((c: any) => c.method === "ussd") || { method: "ussd", transactionCount: 0, volumeGHS: 0, percentage: 0 };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-[14px] border border-emerald-500/20 bg-emerald-500/10 p-5">
        <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Mobile App</h4>
        <div className="mb-4">
          <span className="text-[24px] font-semibold leading-none tabular-nums text-emerald-900 dark:text-emerald-100">{fPct(app.percentage)}</span>
          <span className="ml-2 text-[12px] font-medium text-emerald-700 dark:text-emerald-300">of total</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[12px] text-emerald-700 dark:text-emerald-300">
            <span>Volume</span>
            <span className="font-semibold">{fGHS(app.volumeGHS)}</span>
          </div>
          <div className="flex justify-between text-[12px] text-emerald-700 dark:text-emerald-300">
            <span>Transactions</span>
            <span className="font-semibold">{safeNum(app.transactionCount).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-sky-500/20 bg-sky-500/10 p-5">
        <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">USSD</h4>
        <div className="mb-4">
          <span className="text-[24px] font-semibold leading-none tabular-nums text-sky-900 dark:text-sky-100">{fPct(ussd.percentage)}</span>
          <span className="ml-2 text-[12px] font-medium text-sky-700 dark:text-sky-300">of total</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[12px] text-sky-700 dark:text-sky-300">
            <span>Volume</span>
            <span className="font-semibold">{fGHS(ussd.volumeGHS)}</span>
          </div>
          <div className="flex justify-between text-[12px] text-sky-700 dark:text-sky-300">
            <span>Transactions</span>
            <span className="font-semibold">{safeNum(ussd.transactionCount).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Section 6: CSA Performance Table ───────────────── */
export function CsaPerformanceTable({ range }: { range?: DateRange }) {
  const { data, loading, error, refetch } = useCsaPerformance(range);

  if (error) return <SectionError section="CSA Performance" onRetry={refetch} />;
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[14px] p-5 shadow-sm space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-gray-50 dark:bg-gray-800 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const agents = Array.isArray(data) ? data : [];

  const getConvColor = (rate: number) => {
    if (rate >= 20) return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900";
    if (rate >= 10) return "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900";
    return "text-red-600 bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900";
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[14px] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Agent Name</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Calls Made</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Success Coll.</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Conv. Rate</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right pr-10">Amt Collected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {agents.length > 0 ? agents.map((agent: any, i: number) => (
              <tr key={agent.agentId || i} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-4">
                  <span className="text-[13px] font-black text-gray-900 dark:text-gray-100">{agent.agentName || 'Unknown Agent'}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-[13px] font-bold text-gray-600 dark:text-gray-400 font-mono">{agent.totalCallsMade ?? 0}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-[13px] font-bold text-gray-600 dark:text-gray-400 font-mono">{agent.successfulCollections ?? 0}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <Badge variant="outline" className={cn("font-black px-3 py-1 text-[11px] border-none", getConvColor(agent.conversionRate ?? 0))}>
                    {(agent.conversionRate ?? 0).toFixed(1)}%
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right pr-10">
                  <span className="text-[13px] font-black text-emerald-600 dark:text-emerald-400 font-mono">{fGHS(agent.totalAmountCollected ?? 0)}</span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm font-bold text-gray-400 italic">No CSA performance data found in this period</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

