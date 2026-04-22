import React from "react";
import { ArrowDownRight, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  churnRate: number;
}

export function ChurnRateCard({ churnRate }: Props) {
  return (
    <div className="group bg-card rounded-xl p-6 shadow-sm border border-border/50 hover:border-destructive/30 transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Churn Rate</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent>
                <p>% of customers who repaid a loan but did not take a new one within 90 days</p>
                <p className="text-[10px] opacity-70 mt-1">Fixed window — unaffected by global date filter</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
          <ArrowDownRight className="h-5 w-5 text-destructive" />
        </div>
      </div>
      
      <div className="mt-4">
        <p className="text-3xl font-bold text-amber-500 dark:text-red-400">{churnRate.toFixed(1)}%</p>
      </div>
    </div>
  );
}
