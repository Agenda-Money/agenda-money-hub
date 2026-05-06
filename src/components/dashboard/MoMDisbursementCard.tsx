import React, { useState } from "react";
import { formatMoney, formatCount } from "@/utils/format";
import { MomDisbursementPoint } from "@/types/analytics";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DateRangeFilter } from "./DateRangeFilter";
import { DatePreset } from "@/hooks/useDateFilter";

interface Props {
  data: MomDisbursementPoint[];
  preset: DatePreset;
  startDate: Date;
  endDate: Date;
  applyPreset: (p: DatePreset) => void;
  setStartDate: (d: Date) => void;
  setEndDate: (d: Date) => void;
  currency?: string;
}

export function MoMDisbursementCard({
  data,
  preset,
  startDate,
  endDate,
  applyPreset,
  setStartDate,
  setEndDate,
  currency = "₵"
}: Props) {
  const [toggle, setToggle] = useState<"value" | "count">("value");

  const latest = data.length > 0 ? data[data.length - 1] : null;
  // Only show growth delta if we have at least 2 months to compare
  const delta = (data.length > 1 && latest) 
    ? (toggle === "value" ? latest.momValueGrowth : latest.momCountGrowth) 
    : null;
  const hasDelta = delta !== null;
  const isPositive = delta != null && delta >= 0;

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50 col-span-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">MoM Disbursement Growth</h2>
          <DateRangeFilter
            preset={preset}
            startDate={startDate}
            endDate={endDate}
            applyPreset={applyPreset}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
          />
        </div>
        
        <div className="flex flex-col sm:items-end gap-3 mt-4 md:mt-0 w-full md:w-auto">
          <div className="p-1 bg-muted rounded-lg flex flex-wrap border border-border/50 w-full sm:w-fit">
            <button
              onClick={() => setToggle("value")}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                toggle === "value" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              By Value ({currency})
            </button>
            <button
              onClick={() => setToggle("count")}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                toggle === "count" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              By Count
            </button>
          </div>
          
          {hasDelta && (
            <div className="flex items-center gap-2">
              {isPositive ? (
                <div className="flex items-center gap-1.5 bg-success/10 px-2 py-1 rounded">
                  <span className="text-success text-xs font-bold">▲ {delta.toFixed(2)}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-destructive/10 px-2 py-1 rounded">
                  <span className="text-destructive text-xs font-bold">▼ {Math.abs(delta).toFixed(2)}%</span>
                </div>
              )}
              <span className="text-xs font-medium text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>
      </div>

      <div className="h-[320px] w-full mt-4">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No data available for the selected period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="disbursementGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 600 }} 
                dy={10} 
                tickFormatter={(val) => {
                  try {
                    const [y, m] = val.split('-');
                    const date = new Date(parseInt(y), parseInt(m) - 1);
                    return date.toLocaleString('en-US', { month: 'short' }); 
                  } catch (e) {
                    return val;
                  }
                }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 600 }} 
                tickFormatter={(value) => toggle === "value" ? `${currency}${formatCount(value)}` : formatCount(value)} 
                width={80}
              />
              <Tooltip 
                cursor={{ stroke: '#14b8a6', strokeWidth: 2, strokeDasharray: '4 4' }}
                contentStyle={{ 
                  borderRadius: "12px", 
                  border: "1px solid #E5E7EB",
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  padding: '12px'
                }}
                labelStyle={{ fontWeight: 800, marginBottom: '4px', color: '#111827' }}
                labelFormatter={(label) => {
                  try {
                    const [y, m] = label.split('-');
                    const date = new Date(parseInt(y), parseInt(m) - 1);
                    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                  } catch (e) {
                    return label;
                  }
                }}
                formatter={(val: number) => {
                  return [toggle === "value" ? formatMoney(val) : formatCount(val), toggle === "value" ? "Value Disbursed" : "Loans Disbursed"]
                }}
              />
              <Area 
                type="monotone" 
                dataKey={toggle} 
                stroke="#14b8a6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#disbursementGradient)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
