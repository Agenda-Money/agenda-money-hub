import {
  LineChart,
  Line,
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
    <div className="bg-card rounded-xl shadow-sm p-6 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Loan Trends</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Disbursed vs Repaid amounts over time
        </p>
      </div>
      
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E91E8C" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#E91E8C" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRepaid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00B4A6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00B4A6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="month"
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₵${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
              formatter={(value: number) => [`₵${value.toLocaleString()}`, ""]}
            />
            <Area
              type="monotone"
              dataKey="disbursed"
              stroke="#E91E8C"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorDisbursed)"
              name="Disbursed"
            />
            <Area
              type="monotone"
              dataKey="repaid"
              stroke="#00B4A6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRepaid)"
              name="Repaid"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">Disbursed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-info" />
          <span className="text-sm text-muted-foreground">Repaid</span>
        </div>
      </div>
    </div>
  );
}
