import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Smartphone, Hash, PieChart as PieChartIcon, Activity } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";
import { cn } from "@/lib/utils";

interface ChannelData {
  ussd: { count: number; percent: number };
  app: { count: number; percent: number };
  total: number;
}

interface RepaymentChannelStatsProps {
  data: ChannelData | null;
  isLoading?: boolean;
}

const RADIAN = Math.PI / 180;


export function RepaymentChannelStats({ data, isLoading }: Readonly<RepaymentChannelStatsProps>) {
  if (isLoading) {
    return (
      <Card className="h-full animate-pulse">
        <CardHeader className="h-24 bg-muted/20" />
        <CardContent className="h-64 bg-muted/10" />
      </Card>
    );
  }

  if (!data) return null;

  const chartData = [
    { name: "USSD Channel", value: data.ussd.count, percent: data.ussd.percent, color: "#EC1B84" },
    { name: "App Channel", value: data.app.count, percent: data.app.percent, color: "#00e676" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
    >
      <Card className="h-full overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur-xl border border-white/10">
        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <PieChartIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-black tracking-tight uppercase">Repayment Channels</CardTitle>
                <CardDescription className="text-xs font-medium">Split between USSD and Mobile App</CardDescription>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
              Live Data
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Chart Area */}
            <div className="h-[240px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={5}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1200}
                  >
                    {chartData.map((entry) => (
                      <Cell 
                        key={entry.name} 
                        fill={entry.color}
                        className="hover:opacity-80 transition-opacity cursor-pointer stroke-background"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.12)"
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} payments`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center Info */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-foreground">{data.total}</span>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Total</span>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="space-y-4">
              {/* USSD Card */}
              <motion.div 
                whileHover={{ x: 4 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-[#EC1B84]/10 to-transparent border border-[#EC1B84]/20 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-[#EC1B84] flex items-center justify-center text-white shadow-lg">
                      <Hash className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-sm">USSD Gateway</span>
                  </div>
                  <span className="text-xl font-black text-[#EC1B84]">{data.ussd.percent}%</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>Processed via Shortcode</span>
                  <span className="group-hover:text-foreground transition-colors">{data.ussd.count.toLocaleString()} transactions</span>
                </div>
                <div className="mt-3 h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${data.ussd.percent}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-[#EC1B84]"
                  />
                </div>
              </motion.div>

              {/* App Card */}
              <motion.div 
                whileHover={{ x: 4 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-[#00e676]/10 to-transparent border border-[#00e676]/20 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-[#00e676] flex items-center justify-center text-white shadow-lg">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-sm">Mobile Application</span>
                  </div>
                  <span className="text-xl font-black text-[#00e676]">{data.app.percent}%</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>Direct App Payments</span>
                  <span className="group-hover:text-foreground transition-colors">{data.app.count.toLocaleString()} transactions</span>
                </div>
                <div className="mt-3 h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${data.app.percent}%` }}
                    transition={{ duration: 1, delay: 0.7 }}
                    className="h-full bg-[#00e676]"
                  />
                </div>
              </motion.div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground opacity-60">
              <Activity className="h-3 w-3" />
              Calculated from all repayment transactions
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase text-emerald-500">System Healthy</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
