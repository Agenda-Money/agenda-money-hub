import React from "react";
import { formatCount } from "@/utils/format";
import { Users, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  count: number;
  windowDays: number;
}

export function ActiveCustomersCard({ count, windowDays }: Props) {
  return (
    <div className="group bg-card rounded-xl p-6 shadow-sm border border-border/50 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active Customers</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Customers who took at least 1 loan in the last {windowDays} days</p>
                <p className="text-[10px] opacity-70 mt-1">Fixed window — unaffected by global date filter</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Users className="h-5 w-5 text-primary" />
        </div>
      </div>
      
      <div className="mt-4">
        <p className="text-3xl font-bold text-foreground">{formatCount(count)}</p>
      </div>
    </div>
  );
}
