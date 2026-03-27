import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Layers } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";

interface TierData {
  name: string;
  value: number;
  color: string;
}

interface TierDistributionPieProps {
  data: TierData[];
}

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return percent > 0.05 ? (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

const legendFormatter = (value: string) => (
  <span className="text-sm">{value}</span>
);

export function TierDistributionPie({ data }: Readonly<TierDistributionPieProps>) {
  const totalUsers = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card className="h-full">
        <CardHeader className="border-b bg-gradient-to-r from-secondary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <CardTitle className="text-lg">Users Across Loan Tiers</CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  animationBegin={200}
                  animationDuration={800}
                >
                  {data.map((entry) => (
                    <Cell 
                      key={entry.name} 
                      fill={entry.color}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} users`,
                    name
                  ]}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={legendFormatter}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Tier breakdown list */}
          <div className="mt-4 pt-4 border-t grid grid-cols-5 gap-2">
            {data.map((tier) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div 
                  className="h-2 w-full rounded-full mb-1"
                  style={{ backgroundColor: tier.color }}
                />
                <p className="text-xs font-medium">{tier.name}</p>
                <p className="text-sm font-bold">{tier.value.toLocaleString()}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold">{totalUsers.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
