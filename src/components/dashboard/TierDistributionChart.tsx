import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const data = [
  { name: "Tier L1", value: 2450, color: "#94A3B8" },
  { name: "Tier L2", value: 1830, color: "#00B4A6" },
  { name: "Tier L3", value: 1240, color: "#E91E8C" },
  { name: "Tier L4", value: 680, color: "#10B981" },
  { name: "Tier L5", value: 320, color: "#F59E0B" },
];

export function TierDistributionChart() {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-card rounded-xl shadow-sm p-6 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">User Tiers</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Distribution across loan tiers
        </p>
      </div>
      
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
              formatter={(value: number) => [
                `${value.toLocaleString()} users (${((value / total) * 100).toFixed(1)}%)`,
                "",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mt-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-muted-foreground">
              {item.name}: {item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
