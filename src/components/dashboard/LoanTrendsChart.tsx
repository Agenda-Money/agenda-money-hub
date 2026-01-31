import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const data = [
  { month: "Jan", disbursed: 45000, repaid: 42000 },
  { month: "Feb", disbursed: 52000, repaid: 48000 },
  { month: "Mar", disbursed: 48000, repaid: 51000 },
  { month: "Apr", disbursed: 61000, repaid: 55000 },
  { month: "May", disbursed: 55000, repaid: 58000 },
  { month: "Jun", disbursed: 67000, repaid: 62000 },
  { month: "Jul", disbursed: 72000, repaid: 68000 },
];

export function LoanTrendsChart() {
  return (
    <div className="bg-card rounded-xl shadow-sm p-6 animate-fade-in border border-border/50 hover:shadow-md transition-all duration-300">
      <div className="mb-4">
        <h2 className="text-base font-bold text-foreground">Performance Trends</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Disbursed vs Repaid over time
        </p>
      </div>
      
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E91E8C" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#E91E8C" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRepaid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00B4A6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00B4A6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dy={3}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₵${(value / 1000).toFixed(0)}k`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                padding: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`₵${value.toLocaleString()}`, ""]}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Area
              type="monotone"
              dataKey="disbursed"
              stroke="#E91E8C"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorDisbursed)"
              name="Disbursed"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="repaid"
              stroke="#00B4A6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRepaid)"
              name="Repaid"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center justify-start gap-6 mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary shadow-sm" />
          <p className="text-xs font-semibold text-foreground">Disbursed</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-info shadow-sm" />
          <p className="text-xs font-semibold text-foreground">Repaid</p>
        </div>
      </div>
    </div>
  );
}
