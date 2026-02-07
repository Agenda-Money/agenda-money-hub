import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface SignupDataPoint {
  month: string;
  l1: number;
  graduated: number;
  sort: number;
}

interface SignupGrowthChartProps {
  data: SignupDataPoint[];
  totalL1: number;
  totalGraduated: number;
}

export function SignupGrowthChart({ data, totalL1, totalGraduated }: Readonly<SignupGrowthChartProps>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Sign-up Growth</CardTitle>
                <CardDescription>New users over time (L1 vs Graduated Nodes)</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1.5">
                <div className="h-2 w-2 rounded-full bg-primary" />
                L1: {totalL1.toLocaleString()}
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <div className="h-2 w-2 rounded-full bg-success" />
                Graduated: {totalGraduated.toLocaleString()}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorL1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e91e63" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#e91e63" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGraduated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e676" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00e676" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d314d" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="l1"
                  stroke="#e91e63"
                  fill="url(#colorL1)"
                  strokeWidth={2}
                  name="L1 Users"
                />
                <Area
                  type="monotone"
                  dataKey="graduated"
                  stroke="#00e676"
                  fill="url(#colorGraduated)"
                  fillOpacity={0}
                  strokeWidth={2}
                  name="Graduated Nodes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
