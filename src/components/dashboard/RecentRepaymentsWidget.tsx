import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRecentRepayments } from "@/lib/api";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MoMoAvatar = () => (
  <div className="h-8 w-8 rounded-full bg-[#fce4ec] flex items-center justify-center text-[#c2185b] font-bold text-[8px] tracking-tight shrink-0">
    MoMo
  </div>
);

export function RecentRepaymentsWidget() {
  const [period, setPeriod] = useState("24h");

  const { data: recentRepayments, isLoading } = useQuery({
    queryKey: ["recent-repayments", period],
    queryFn: async () => {
      const res = await getRecentRepayments({ period, limit: 10 });
      return res.data || [];
    },
    refetchInterval: 60000, // Poll every 60s
  });

  return (
    <Card className="flex flex-col h-full border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Recent Repayments</CardTitle>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[110px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="weekly">Last 7 Days</SelectItem>
            <SelectItem value="monthly">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-muted/20 rounded-xl" />
            ))}
          </div>
        ) : !recentRepayments || recentRepayments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No recent repayments
          </div>
        ) : (
          <div className="space-y-3 mt-1">
            {recentRepayments.slice(0, 5).map((rep: any) => (
               <div 
                 key={rep.repaymentId} 
                 className="bg-card border border-border/50 rounded-xl p-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors"
               >
                 <MoMoAvatar />
                 <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                       <span className="text-sm font-medium text-foreground truncate">{rep.userName || "Unknown"}</span>
                       <span className="text-sm font-bold text-[#0f6e56]">₵{Number(rep.amountPaid ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] text-muted-foreground uppercase">{rep.loanReference}</span>
                       <div className="flex items-center gap-2">
                         <span className="text-[10px] text-muted-foreground">Bal: ₵{Number(rep.remainingBalance ?? 0).toFixed(2)}</span>
                         <Badge 
                           variant="outline" 
                           className={cn(
                             "h-4 px-1.5 text-[8px] font-semibold border-none rounded-full leading-none",
                             rep.isFullPayment 
                               ? "bg-[#e1f5ee] text-[#0f6e56]" 
                               : "bg-[#faeeda] text-[#854f0b]"
                           )}
                         >
                           {rep.isFullPayment ? "FULL" : "PARTIAL"}
                         </Badge>
                       </div>
                    </div>
                 </div>
               </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
