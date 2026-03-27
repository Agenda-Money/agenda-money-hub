import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Layers, CheckCircle2, AlertCircle, RefreshCw, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TierMetrics {
  tier: string;
  repaymentRate: number;
  defaultRate: number;
  retentionRate: number;
}

interface TierBreakdownWidgetProps {
  data: TierMetrics[];
  isLoading?: boolean;
}

export function TierBreakdownWidget({ data, isLoading }: Readonly<TierBreakdownWidgetProps>) {
  if (isLoading) {
    return (
      <Card className="h-full animate-pulse border-none shadow-xl bg-card/50">
        <CardHeader className="h-20 bg-muted/20" />
        <CardContent className="h-64 bg-muted/10 p-6" />
      </Card>
    );
  }

  return (
    <Card className="h-full border-none shadow-xl bg-card/50 backdrop-blur-xl border border-white/10 overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-secondary/5 to-transparent pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <CardTitle className="text-lg font-black tracking-tight uppercase">Tier Performance Matrix</CardTitle>
              <CardDescription className="text-xs font-medium italic">Efficiency & loyalty metrics by applicant level</CardDescription>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground opacity-40" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Drill down into tier-specific behavior</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tier Level</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Repayment Rate</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Default Rate</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((tier, idx) => (
                <motion.tr 
                  key={tier.tier}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="group hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-secondary/20 flex items-center justify-center font-black text-secondary text-sm">
                        {String(tier.tier).replace("Tier ", "")}
                      </div>
                      <span className="font-bold text-sm tracking-tight">{tier.tier}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-emerald-500">{tier.repaymentRate}%</span>
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="h-1 w-24 bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${tier.repaymentRate}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-rose-500">{tier.defaultRate}%</span>
                        <AlertCircle className="h-3 w-3 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="h-1 w-24 bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${tier.defaultRate}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-blue-500">{tier.retentionRate}%</span>
                        <RefreshCw className="h-3 w-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="h-1 w-24 bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${tier.retentionRate}%` }} />
                      </div>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
