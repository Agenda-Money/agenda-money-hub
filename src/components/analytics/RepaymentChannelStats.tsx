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

interface ChannelStat {
  count: number;
  volume: number;
  percentage: number;
}

interface ChannelData {
  ussd: ChannelStat;
  app: ChannelStat;
  total: number;
}

interface RepaymentChannelStatsProps {
  data: ChannelData | null;
  isLoading?: boolean;
}

const RADIAN = Math.PI / 180;

const formatCurrency = (value: number) => {
  const formatted = new Intl.NumberFormat('en-GH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
  return `GHS ${formatted}`;
};

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
    { name: "USSD", value: data.ussd.count, color: "#1abc9c" }, // Note: Spec shows USSD as pink in cards but teal in donut? 
    { name: "App", value: data.app.count, color: "#1abc9c" }     // Re-checking spec: stroke="#1abc9c" for donut.
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <div className="bg-white border border-[#efefef] rounded-[24px] p-6 shadow-sm">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[#fce8f3] shrink-0">
              <Activity className="w-4 h-4 text-[#e91e8c]" strokeWidth={2.2} />
            </div>
            <div className="text-[17px] font-black text-[#1a1a2e] leading-tight">
              Repayment<br />Channels
            </div>
          </div>
          <div className="bg-[#fce8f3] color-[#b5185a] text-[11px] font-black tracking-[0.06em] uppercase px-2.5 py-1 rounded-full text-[#b5185a]">
            Live data
          </div>
        </div>
        <div className="text-[12px] text-[#999] mb-6 font-medium">Split between USSD and Mobile App</div>

        <div className="flex items-center gap-5 mb-6">
          <div className="relative w-20 h-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%" cy="50%"
                  innerRadius={28} outerRadius={36}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#1abc9c" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-base font-black text-[#1a1a2e] font-mono leading-none">{data.total}</span>
              <span className="text-[9px] text-[#aaa] font-black uppercase tracking-[0.06em]">Total</span>
            </div>
          </div>
          <div className="flex-grow">
            <div className="text-[11px] text-[#999] font-black uppercase mb-2">Channel breakdown</div>
            <div className="flex justify-between items-center text-[12px] font-medium mb-1.5">
              <span className="text-[#c2185b]">USSD Gateway</span>
              <span className="font-black text-[#1a1a2e]">{Math.round(data.ussd.percentage)}%</span>
            </div>
            <div className="flex justify-between items-center text-[12px] font-medium">
              <span className="text-[#0f7a50]">Mobile App</span>
              <span className="font-black text-[#1a1a2e]">{Math.round(data.app.percentage)}%</span>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {/* USSD Card */}
          <div className="bg-[#fdf4fb] border border-[#f5d9ef] rounded-[16px] p-4 group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-[13px] font-black text-[#1a1a2e]">
                <span className="bg-[#fce8f3] rounded-[8px] p-1.5 flex transition-transform group-hover:scale-110">
                  <Hash className="w-3.5 h-3.5 text-[#c2185b]" strokeWidth={2.5} />
                </span>
                USSD Gateway
              </div>
              <div className="text-[20px] font-black text-[#c2185b] font-mono tracking-tighter">
                {Math.round(data.ussd.percentage)}%
              </div>
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold mb-1">
              <span className="text-[#999]">Processed via shortcode</span>
              <span className="text-[#c2185b] font-black">{data.ussd.count.toLocaleString()} transactions</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold">
              <span className="text-[#999]">Transaction volume</span>
              <span className="text-[#c2185b] font-black">{formatCurrency(data.ussd.volume)}</span>
            </div>
          </div>

          {/* Mobile Card */}
          <div className="bg-[#f0fdf7] border border-[#c3f0de] rounded-[16px] p-4 group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-[13px] font-black text-[#1a1a2e]">
                <span className="bg-[#e3faf1] rounded-[8px] p-1.5 flex transition-transform group-hover:scale-110">
                  <Smartphone className="w-3.5 h-3.5 text-[#0f7a50]" strokeWidth={2.5} />
                </span>
                Mobile Application
              </div>
              <div className="text-[20px] font-black text-[#0f7a50] font-mono tracking-tighter">
                {Math.round(data.app.percentage)}%
              </div>
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold mb-1">
              <span className="text-[#999]">Direct app payments</span>
              <span className="text-[#0f7a50] font-black">{data.app.count.toLocaleString()} transactions</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold">
              <span className="text-[#999]">Transaction volume</span>
              <span className="text-[#0f7a50] font-black">{formatCurrency(data.app.volume)}</span>
            </div>
            {data.app.percentage > 0 && (
              <div className="mt-3 h-[5px] bg-[#1abc9c]/20 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${data.app.percentage}%` }}
                  className="h-full bg-[#1abc9c] rounded-full" 
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#f5fff9] border border-[#c3f0de] rounded-[16px] px-5 py-3 flex items-center justify-between">
        <span className="text-[11px] text-[#999] font-bold uppercase tracking-tight">Calculated from all repayment transactions</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#1abc9c] animate-pulse" />
          <span className="text-[12px] font-black text-[#0f7a50] uppercase tracking-tighter">System healthy</span>
        </div>
      </div>
    </motion.div>
  );
}
