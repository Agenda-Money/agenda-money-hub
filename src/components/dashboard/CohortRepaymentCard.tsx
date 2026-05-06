import React, { useState } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { RefreshCcw, Info } from "lucide-react";
import { CohortData, CohortSummary } from "@/hooks/useCohortRepayment";
import { formatNumber, cn } from "@/lib/utils";

interface Props {
  data: CohortData[];
  summary: CohortSummary | null;
  isLoading: boolean;
  onRefresh: () => void;
  timeRange: '3' | '6' | 'all';
  onTimeRangeChange: (range: '3' | '6' | 'all') => void;
}

export function CohortRepaymentCard({
  data,
  summary,
  isLoading,
  onRefresh,
  timeRange,
  onTimeRangeChange
}: Props) {
  // No toggle needed as we only show repaymentRate now

  const latest = data.length > 0 ? data[data.length - 1] : null;
  const currentRate = latest ? latest.repaymentRate : 0;

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50 col-span-full transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-bold text-foreground">Repayment Rate</h2>
            <div className="group relative">
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg border border-border shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Performance grouped by loan disbursement month. Repayment Rate = (Repaid / Total Disbursed) %.
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit border border-border/50">
            {(['3', '6', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => onTimeRangeChange(r)}
                className={cn(
                  "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                  timeRange === r 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r === 'all' ? 'All Time' : `${r} Months`}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col sm:items-end gap-3 w-full md:w-auto">
          {/* Toggle removed as per request */}
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Avg Lifetime</span>
              <span className="text-sm font-black text-foreground">
                {summary?.averageRepaymentRate?.toFixed(1) ?? "0.0"}%
              </span>
            </div>
            <button 
              onClick={onRefresh}
              className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      <div className="h-[320px] w-full mt-4">
        {data.length === 0 && !isLoading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm font-bold italic opacity-50">
            No cohort data available for this range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="cohortDisplayName" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 700 }} 
                dy={10} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 700 }} 
                tickFormatter={(value) => `${value}%`} 
                width={40}
                domain={[0, 100]}
              />
              <Tooltip 
                cursor={{ stroke: "#10b981", strokeWidth: 2, strokeDasharray: '4 4' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border p-3 rounded-xl shadow-2xl backdrop-blur-md">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-8">
                            <span className="text-xs font-bold">Repayment Rate:</span>
                            <span className="text-xs font-black text-success">{d.repaymentRate.toFixed(1)}%</span>
                          </div>
                          <div className="pt-1 mt-1 border-t border-border/50">
                            <p className="text-[10px] font-bold text-muted-foreground">
                              {formatNumber(d.repaid)} of {formatNumber(d.totalDisbursed)} loans repaid
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="linear" 
                dataKey="repaymentRate" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={0.15} 
                fill="url(#rateGradient)" 
                dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
