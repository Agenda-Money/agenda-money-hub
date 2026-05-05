import React from "react";
import { formatMoney, formatCount } from "@/utils/format";
import { BookOpen } from "lucide-react";

interface Props {
  count: number;
  value: number;
}

export function LoanBookCard({ count, value }: Props) {
  return (
    <div className="group bg-card rounded-xl p-6 shadow-sm border border-border/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Loan Book</h3>
          <p className="text-[10px] text-muted-foreground mt-1 tracking-tight">All loans — active, overdue, defaulted & closed</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground font-medium flex justify-between items-center bg-muted/50 px-3 py-2 rounded-md">
          <span>Total Loans:</span>
          <span className="text-foreground font-bold">{formatCount(count)}</span>
        </div>
        <div className="text-sm text-muted-foreground font-medium flex justify-between items-center bg-muted/50 px-3 py-2 rounded-md">
          <span>Total Principal:</span>
          <span className="text-foreground font-bold">{formatMoney(value)}</span>
        </div>
      </div>
    </div>
  );
}
