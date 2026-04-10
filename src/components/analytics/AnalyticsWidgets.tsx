import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { 
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, ComposedChart 
} from "recharts";
import { fPct, safeNum, fGHS, fCount } from './analytics.helpers';
import type { TelcoDisbursementRow } from './analytics.types';

/* ── Section Header ───────────────────────────────────── */
export function SectionHead({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 mt-12">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-800 m-0">{title}</h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/* ── Section Error ───────────────────────────────────── */
export function SectionError({ section, onRetry }: { section: string; onRetry?: () => void }) {
  return (
    <Card className="bg-[#FCEBEB] border-[#F7C1C1] rounded-xl p-4 flex items-center justify-between mb-6 shadow-sm">
      <p className="text-[13px] font-medium text-[#A32D2D] m-0">Could not load {section} — try refreshing</p>
      {onRetry && (
        <button onClick={onRetry} className="text-[12px] font-semibold px-4 py-1.5 rounded-lg bg-white border border-[#F7C1C1] text-[#791F1F] hover:bg-neutral-50 transition-colors shadow-sm">
          Refresh
        </button>
      )}
    </Card>
  );
}

/* ── Panel Header Helper ─────────────────────────────── */
export function PanelHead({ title, right }: { title: string, right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[12px] font-semibold uppercase tracking-widest text-neutral-500 m-0">{title}</h3>
      {right && <div className="text-[11px] text-muted-foreground">{right}</div>}
    </div>
  );
}

/* ── Section 2: Tier Breakdown Tables ───────────────── */
const tierBarColor = (rate: number) => {
  if (rate >= 80) return 'bg-[#1D9E75]'; // green
  if (rate >= 50) return 'bg-[#FAC775]'; // amber
  return 'bg-[#A32D2D]';                 // red
};

function TierTable({ title, data, valueKey }: { title: string, data: any[], valueKey: string }) {
  // Sort data by tier ascending (e.g., T1, T2)
  const sorted = [...data].sort((a, b) => safeNum(a.tier) - safeNum(b.tier));
  
  return (
    <div className="flex-1 bg-white border rounded-[14px] p-5 shadow-sm">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-4">{title}</h4>
      <div className="space-y-3">
        {sorted.map(row => {
          const rate = safeNum(row[valueKey] || row.rate);
          return (
            <div key={row.tier} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="font-semibold text-neutral-800 w-6">T{row.tier}</span>
              <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${tierBarColor(rate)}`} style={{ width: `${Math.min(rate, 100)}%` }} />
              </div>
              <span className="font-semibold tabular-nums text-neutral-700 w-10 text-right">{rate.toFixed(1)}%</span>
            </div>
          );
        })}
        {sorted.length === 0 && <p className="text-xs text-muted-foreground py-2">No data available</p>}
      </div>
    </div>
  );
}

export function TierBreakdownTables({ repayment, defaultRate, collection }: { repayment?: any[], defaultRate?: any[], collection?: any[] }) {
  return (
    <div className="flex flex-col md:flex-row gap-4 w-full mt-4">
      <TierTable title="Repayment Rate" data={repayment || []} valueKey="rate" />
      <TierTable title="Default Rate" data={defaultRate || []} valueKey="rate" />
      <TierTable title="Collection Rate" data={collection || []} valueKey="rate" />
    </div>
  );
}

/* ── Section 3: Distribution (Signup Growth) ────────── */
export function ChartSignupGrowth({ data }: { data: any[] }) {
  if (!data?.length) return <div className="h-[260px] flex items-center justify-center text-sm text-neutral-400">No data available</div>;

  // Format incoming data. Assuming backend gives edgeCount and graduatedCount optionally, or just count and isGraduated.
  const grouped = data.reduce((acc: any, curr: any) => {
    const m = curr.month || 'Unknown';
    if (!acc[m]) acc[m] = { month: m, edgeCount: 0, graduatedCount: 0, rawMonth: m };
    
    // If exact fields are provided
    if (curr.edgeCount !== undefined) acc[m].edgeCount += safeNum(curr.edgeCount);
    if (curr.graduatedCount !== undefined) acc[m].graduatedCount += safeNum(curr.graduatedCount);
    
    // If legacy fields format
    if (curr.edgeCount === undefined && curr.count !== undefined) {
      if (curr.isGraduated) acc[m].graduatedCount += safeNum(curr.count);
      else acc[m].edgeCount += safeNum(curr.count);
    }
    
    return acc;
  }, {});
  
  const chartData = Object.values(grouped).sort((a: any, b: any) => a.rawMonth.localeCompare(b.rawMonth)).map((d: any) => {
    const mStr = d.month || '';
    return { ...d, monthFormat: mStr.length > 5 ? mStr.slice(5) : mStr };
  });

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EFE8" />
          <XAxis dataKey="monthFormat" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888780' }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888780' }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E8E6E0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
          <Line type="monotone" dataKey="edgeCount" name="Edge users" stroke="#378ADD" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="graduatedCount" name="Graduated nodes" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Section 3: Distribution (Tier Horizontal Bars) ─── */
export function ChartTierDistribution({ data }: { data: any[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!data?.length) return <div className="h-[260px] flex items-center justify-center text-sm text-neutral-400">No data available</div>;

  const sorted = [...data].sort((a, b) => safeNum(a.tier) - safeNum(b.tier));
  const displayData = expanded ? sorted : sorted.slice(0, 5);
  const hasMore = sorted.length > displayData.length;

  return (
    <div className="flex flex-col w-full mt-4 gap-4">
      {displayData.map((d, i) => {
        const pct = safeNum(d.percentage);
        return (
          <div key={i} className="flex flex-col gap-1.5 w-full">
            <div className="flex justify-between items-center w-full mb-1">
              <span className="font-bold text-[12px] text-neutral-800">T{d.tier}</span>
              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px]">
                <span className="font-semibold text-neutral-700">{pct.toFixed(1)}%</span>
                <span className="text-neutral-500">{safeNum(d.userCount).toLocaleString()} users</span>
                <span className="text-neutral-500 bg-neutral-100 rounded px-1.5 py-0.5">Avg {fGHS(d.avgLoanSize)}</span>
              </div>
            </div>
            <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-[#1D9E75] h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        );
      })}
      {hasMore && (
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="mt-2 w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-semibold uppercase tracking-wider rounded-lg transition-colors"
        >
          {expanded ? "Show Less" : "Show More"}
        </button>
      )}
    </div>
  );
}

/* ── Section 3: Distribution (Geographic List) ──────── */
export function GeographicList({ data }: { data: any[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!data?.length) return <div className="h-[260px] flex items-center justify-center text-sm text-neutral-400">No data available</div>;

  const sorted = [...data].sort((a, b) => safeNum(b.userCount) - safeNum(a.userCount));
  
  // Exclude 'Unknown' or empty regions from the default collapsed view
  const isKnown = (region: string) => region && region.toLowerCase().trim() !== 'unknown';
  
  const displayData = expanded 
    ? sorted 
    : sorted.filter(r => isKnown(r.region)).slice(0, 5);

  const hasMore = sorted.length > displayData.length;

  const getRepaymentPill = (rate: number) => {
    if (rate >= 80) return "bg-[#E1F5EE] text-[#085041]";
    if (rate >= 50) return "bg-[#FAC775] text-[#633806]";
    return "bg-[#FCEBEB] text-[#791F1F]";
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between px-1 sm:px-2 pb-2 border-b text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
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
            <div key={i} className="flex items-center justify-between py-2 sm:py-2.5 px-1 sm:px-2 hover:bg-neutral-50 rounded-lg transition-colors overflow-hidden">
              <span className="text-[11px] sm:text-[12px] font-medium text-neutral-800 truncate pr-2 flex-1">{row.region || "Unknown"}</span>
              <div className="flex items-center justify-end gap-2 sm:gap-6 shrink-0">
                <span className="text-[11px] sm:text-[12px] font-semibold tabular-nums w-8 sm:w-12 text-right">{safeNum(row.userCount).toLocaleString()}</span>
                <span className={`text-[10px] sm:text-[11px] font-bold tabular-nums px-2 py-1 rounded-full w-12 sm:w-14 text-center ${getRepaymentPill(rate)}`}>
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
          className="mt-4 w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-semibold uppercase tracking-wider rounded-lg transition-colors"
        >
          {expanded ? "Show Less" : "Show More"}
        </button>
      )}
    </div>
  );
}

/* ── Section 4: Volume (Disbursement vs Collection) ─── */
export function ChartDisbColl({ data }: { data: any[] }) {
  if (!data?.length) return <div className="h-[280px] flex items-center justify-center text-sm text-neutral-400">No data available</div>;
  
  const formattedData = data.map(d => ({
    ...d,
    monthShort: d.month?.slice(0, 3) || '', // "Jan", "Feb" etc per spec. Assuming backend sends full string or YYYY-MM. 
    // Fallback if it's YYYY-MM
    displayMonth: d.month?.includes('-') ? new Date(d.month + '-01').toLocaleString('en-US', { month: 'short' }) : (d.month || '').slice(0,3)
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barGap={2} barSize={20}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EFE8" />
          <XAxis dataKey="displayMonth" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888780' }} dy={10} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888780' }} />
          <Tooltip cursor={{ fill: '#F5F4F0' }} contentStyle={{ borderRadius: 12, border: '1px solid #E8E6E0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
          
          <Bar yAxisId="left" dataKey="disbursed" name="Disbursed (GHS)" fill="#1D9E75" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="left" dataKey="collected" name="Collected (GHS)" fill="#378ADD" radius={[4, 4, 0, 0]} />
          <Line yAxisId="left" type="monotone" dataKey="net" name="Net Flow" stroke="#2C2C2A" strokeWidth={1.5} dot={{ r: 2, fill: '#2C2C2A' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Section 4: Volume (Repayment Channels) ─────────── */
function telcoBarColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('mtn')) return '#FFCC00';
  if (n.includes('telecel') || n.includes('vodafone')) return '#E40000';
  if (n.includes('tigo') || n.includes('airtel') || n.includes('at ')) return '#003399';
  return '#1D9E75';
}

function TelcoDisbursementTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TelcoDisbursementRow }> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-[#E8E6E0] bg-white px-3 py-2 shadow-md text-[12px]">
      <div className="font-semibold text-neutral-800">{row.network}</div>
      <div className="text-neutral-600 mt-1">Volume: {fGHS(row.volumeGHS)}</div>
      <div className="text-neutral-600">Loans: {fCount(row.loanCount)}</div>
      {safeNum(row.sharePercent) > 0 && (
        <div className="text-neutral-600">Share of volume: {safeNum(row.sharePercent).toFixed(1)}%</div>
      )}
    </div>
  );
}

/** Horizontal bars: disbursement value by mobile money network (Telco). */
export function ChartTelcoDisbursements({ data }: { data: TelcoDisbursementRow[] | undefined }) {
  const rows = (data || []).filter((r) => r.network && (safeNum(r.volumeGHS) > 0 || safeNum(r.loanCount) > 0));
  if (!rows.length) {
    return <div className="h-[280px] flex items-center justify-center text-sm text-neutral-400">No data available</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={rows} margin={{ top: 4, right: 16, left: 0, bottom: 4 }} barCategoryGap={12}>
            <CartesianGrid strokeDasharray="3 3" horizontal stroke="#F1EFE8" vertical={false} />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#888780' }}
              tickFormatter={(v) => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                return `${v}`;
              }}
            />
            <YAxis
              type="category"
              dataKey="network"
              width={88}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#2C2C2A' }}
            />
            <Tooltip content={TelcoDisbursementTooltip} cursor={{ fill: '#F5F4F0' }} />
            <Bar dataKey="volumeGHS" name="Disbursed" radius={[0, 6, 6, 0]} barSize={18}>
              {rows.map((entry) => (
                <Cell key={entry.network} fill={telcoBarColor(entry.network)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-lg border border-[#E8E6E0] overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-neutral-50 text-neutral-500 uppercase tracking-wider text-left">
              <th className="px-3 py-2 font-semibold">Telco</th>
              <th className="px-3 py-2 font-semibold text-right">Loans</th>
              <th className="px-3 py-2 font-semibold text-right">Volume</th>
              <th className="px-3 py-2 font-semibold text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.network} className="border-t border-[#F1EFE8] text-neutral-800">
                <td className="px-3 py-2 font-medium">{r.network}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fCount(r.loanCount)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold">{fGHS(r.volumeGHS)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-neutral-600">
                  {safeNum(r.sharePercent) > 0 ? `${safeNum(r.sharePercent).toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RepaymentChannels({ data }: { data: any }) {
  const channels = data?.channels || [];
  if (!channels.length) return <div className="p-8 text-center text-sm text-neutral-400">No data available</div>;

  const methodEq = (c: any, m: string) => String(c.method || c.channel || '').toLowerCase() === m;
  const app = channels.find((c: any) => methodEq(c, 'app')) || { method: 'app', transactionCount: 0, volumeGHS: 0, percentage: 0 };
  const ussd = channels.find((c: any) => methodEq(c, 'ussd')) || { method: 'ussd', transactionCount: 0, volumeGHS: 0, percentage: 0 };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* APP Card */}
      <div className="bg-[#E1F5EE] border border-[#9FE1CB] rounded-[14px] p-5">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#0F6E56] mb-3">Mobile App</h4>
        <div className="mb-4">
          <span className="text-[24px] font-semibold text-[#085041] tabular-nums leading-none">
            {fPct(app.percentage ?? app.percent)}
          </span>
          <span className="text-[12px] text-[#0F6E56] ml-2 font-medium">of total</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[12px] text-[#0F6E56]">
            <span>Volume</span>
            <span className="font-semibold">{fGHS(app.volumeGHS)}</span>
          </div>
          <div className="flex justify-between text-[12px] text-[#0F6E56]">
            <span>Transactions</span>
            <span className="font-semibold">{safeNum(app.transactionCount).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* USSD Card */}
      <div className="bg-[#E6F1FB] border border-[#B5D4F4] rounded-[14px] p-5">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#185FA5] mb-3">USSD</h4>
        <div className="mb-4">
          <span className="text-[24px] font-semibold text-[#0C447C] tabular-nums leading-none">
            {fPct(ussd.percentage ?? ussd.percent)}
          </span>
          <span className="text-[12px] text-[#185FA5] ml-2 font-medium">of total</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[12px] text-[#185FA5]">
            <span>Volume</span>
            <span className="font-semibold">{fGHS(ussd.volumeGHS)}</span>
          </div>
          <div className="flex justify-between text-[12px] text-[#185FA5]">
            <span>Transactions</span>
            <span className="font-semibold">{safeNum(ussd.transactionCount).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Alias for legacy AnalyticsDashboard imports */
export const ChartChannels = RepaymentChannels;
