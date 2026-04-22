import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, ComposedChart 
} from "recharts";
import { fPct, safeNum, fGHS } from './analytics.helpers';

/* ── Section Header ───────────────────────────────────── */
export function SectionHead({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 mt-12">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 m-0">{title}</h2>
      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

/* ── Section Error ───────────────────────────────────── */
export function SectionError({ section, onRetry }: { section: string; onRetry?: () => void }) {
  return (
    <Card className="bg-red-50 dark:bg-red-950/10 border-red-100 dark:border-red-900 rounded-xl p-4 flex items-center justify-between mb-6 shadow-sm">
      <p className="text-[13px] font-bold text-red-700 dark:text-red-400 m-0">Could not load {section} — try refreshing</p>
      {onRetry && (
        <button onClick={onRetry} className="text-[12px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-neutral-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
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
      <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 m-0">{title}</h3>
      {right && <div className="text-[11px] font-bold text-muted-foreground">{right}</div>}
    </div>
  );
}

/* ── Section 2: Tier Breakdown Tables ───────────────── */
const tierBarColor = (rate: number) => {
  if (rate >= 80) return 'bg-emerald-500'; // green
  if (rate >= 50) return 'bg-amber-400';   // amber
  return 'bg-red-500';                    // red
};

function TierTable({ title, data, valueKey }: { title: string, data: any[], valueKey: string }) {
  // Sort data by tier ascending (e.g., T1, T2)
  const sorted = [...data].sort((a, b) => safeNum(a.tier) - safeNum(b.tier));
  
  return (
    <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[14px] p-5 shadow-sm">
      <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-4">{title}</h4>
      <div className="space-y-3">
        {sorted.map(row => {
          const rate = safeNum(row[valueKey] || row.rate);
          return (
            <div key={row.tier} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="font-black text-gray-900 dark:text-gray-100 w-6">T{row.tier}</span>
              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${tierBarColor(rate)}`} style={{ width: `${Math.min(rate, 100)}%` }} />
              </div>
              <span className="font-black tabular-nums text-gray-700 dark:text-gray-300 w-10 text-right font-mono">{rate.toFixed(1)}%</span>
            </div>
          );
        })}
        {sorted.length === 0 && <p className="text-xs text-muted-foreground py-2 font-bold italic">No data available</p>}
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
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800/50" />
          <XAxis dataKey="monthFormat" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: 'currentColor' }} className="text-gray-400 dark:text-gray-500" dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: 'currentColor' }} className="text-gray-400 dark:text-gray-500" />
          <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12, backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }} itemStyle={{ fontWeight: 800 }} />
          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 10 }} />
          <Line type="monotone" dataKey="edgeCount" name="Edge users" stroke="#378ADD" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="graduatedCount" name="Graduated nodes" stroke="#10b981" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 5 }} />
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
              <span className="font-black text-[12px] text-gray-900 dark:text-gray-100">T{d.tier}</span>
              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px]">
                <span className="font-black text-gray-700 dark:text-gray-300 font-mono">{pct.toFixed(1)}%</span>
                <span className="text-gray-400 dark:text-gray-500 font-bold uppercase text-[9px] tracking-wide">{safeNum(d.userCount).toLocaleString()} members</span>
                <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 rounded px-1.5 py-0.5 font-bold uppercase text-[9px]">Avg {fGHS(d.avgLoanSize)}</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        );
      })}
      {hasMore && (
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="mt-2 w-full py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-colors"
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
      <div className="flex items-center justify-between px-1 sm:px-2 pb-2 border-b border-gray-100 dark:border-gray-800 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
        <span>Region</span>
        <div className="flex items-center gap-4 sm:gap-10">
          <span>Members</span>
          <span>Repayment</span>
        </div>
      </div>
      <div className="space-y-1">
        {displayData.map((row, i) => {
          const rate = safeNum(row.repaymentRate);
          return (
            <div key={i} className="flex items-center justify-between py-2 sm:py-2.5 px-1 sm:px-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors overflow-hidden group">
              <span className="text-[11px] sm:text-[12px] font-black text-gray-700 dark:text-gray-300 truncate pr-2 flex-1">{row.region || "Unknown"}</span>
              <div className="flex items-center justify-end gap-2 sm:gap-6 shrink-0">
                <span className="text-[11px] sm:text-[12px] font-black tabular-nums w-8 sm:w-12 text-right text-gray-900 dark:text-gray-100">{safeNum(row.userCount).toLocaleString()}</span>
                <span className={`text-[9px] sm:text-[10px] font-black tabular-nums px-2.5 py-1 rounded-full w-12 sm:w-14 text-center uppercase tracking-wider ${getRepaymentPill(rate)}`}>
                  {rate.toFixed(0)}%
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
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800/50" />
          <XAxis dataKey="displayMonth" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: 'currentColor' }} className="text-gray-400 dark:text-gray-500" dy={10} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: 'currentColor' }} className="text-gray-400 dark:text-gray-500" />
          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12, backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }} />
          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 10 }} />
          
          <Bar yAxisId="left" dataKey="disbursed" name="Disbursed" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="left" dataKey="collected" name="Collected" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Line yAxisId="left" type="monotone" dataKey="net" name="Net Flow" stroke="currentColor" strokeWidth={2} dot={{ r: 0 }} className="text-gray-900 dark:text-gray-100" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Section 4: Volume (Repayment Channels) ─────────── */
export function RepaymentChannels({ data }: { data: any }) {
  const channels = data?.channels || [];
  if (!channels.length) return <div className="p-8 text-center text-sm text-neutral-400">No data available</div>;

  const app = channels.find((c: any) => c.method === 'app') || { method: 'app', transactionCount: 0, volumeGHS: 0, percentage: 0 };
  const ussd = channels.find((c: any) => c.method === 'ussd') || { method: 'ussd', transactionCount: 0, volumeGHS: 0, percentage: 0 };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* APP Card */}
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-[14px] p-5">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-3">Mobile App</h4>
        <div className="mb-4">
          <span className="text-[24px] font-black text-emerald-900 dark:text-emerald-100 tabular-nums leading-none font-mono">
            {fPct(app.percentage)}
          </span>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 ml-2 uppercase tracking-tight">of total</span>
        </div>
        <div className="space-y-1.5 pt-4 border-t border-emerald-100/50 dark:border-emerald-900/50">
          <div className="flex justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-tight">
            <span>Volume</span>
            <span className="font-black font-mono">₵{fGHS(app.volumeGHS)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-tight">
            <span>Entries</span>
            <span className="font-black font-mono">{safeNum(app.transactionCount).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* USSD Card */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-[14px] p-5">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400 mb-3">USSD Protocol</h4>
        <div className="mb-4">
          <span className="text-[24px] font-black text-blue-900 dark:text-blue-100 tabular-nums leading-none font-mono">
            {fPct(ussd.percentage)}
          </span>
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-500 ml-2 uppercase tracking-tight">of total</span>
        </div>
        <div className="space-y-1.5 pt-4 border-t border-blue-100/50 dark:border-blue-900/50">
          <div className="flex justify-between text-[11px] text-blue-700 dark:text-blue-400 font-bold uppercase tracking-tight">
            <span>Volume</span>
            <span className="font-black font-mono">₵{fGHS(ussd.volumeGHS)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-blue-700 dark:text-blue-400 font-bold uppercase tracking-tight">
            <span>Entries</span>
            <span className="font-black font-mono">{safeNum(ussd.transactionCount).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
