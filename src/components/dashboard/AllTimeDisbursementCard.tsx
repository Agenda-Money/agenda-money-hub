import React from "react";
import { formatMoney, formatCount } from "@/utils/format";
import { Banknote } from "lucide-react";

interface Props {
  totalCount: number;
  totalValue: number;
}

export function AllTimeDisbursementCard({ totalCount, totalValue }: Props) {
  return (
    <div className="group bg-card rounded-xl p-6 shadow-sm border border-border/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">All-time Disbursement</h3>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Banknote className="h-5 w-5 text-primary" />
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground font-medium flex justify-between items-center bg-muted/50 px-3 py-2 rounded-md">
          <span>Total Loans:</span>
          <span className="text-foreground font-bold">{formatCount(totalCount)}</span>
        </div>
        <div className="text-sm text-muted-foreground font-medium flex justify-between items-center bg-muted/50 px-3 py-2 rounded-md">
          <span>Total Value:</span>
          <span className="text-foreground font-bold">{formatMoney(totalValue)}</span>
        </div>
      </div>
    </div>
  );
}
