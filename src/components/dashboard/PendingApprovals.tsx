import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PendingLoan {
  id: string;
  user: string;
  phone: string;
  amount: number;
  tier: string;
  date: string;
  tenor: string;
  repaymentDate: string;
  loansToDate: number;
  repaymentRate: number;
  creditScore: number;
  nodeCode: string;
  userStatus: "Node" | "Edge";
}

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

const tierConfig: Record<string, { badge: string; emphasis: string; order: number }> = {
  L1: {
    badge: "bg-red-500/10 text-red-700 border-red-500/30 font-bold",
    emphasis: "border-l-4 border-l-red-500 bg-red-500/5",
    order: 1,
  },
  L2: {
    badge: "bg-orange-500/10 text-orange-700 border-orange-500/30 font-semibold",
    emphasis: "border-l-4 border-l-orange-500 bg-orange-500/5",
    order: 2,
  },
  L3: {
    badge: "bg-primary/10 text-primary border-primary/30",
    emphasis: "border-l-4 border-l-primary bg-primary/5",
    order: 3,
  },
  L4: {
    badge: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    emphasis: "border-l-4 border-l-blue-500 bg-blue-500/5",
    order: 4,
  },
  L5: {
    badge: "bg-green-500/10 text-green-700 border-green-500/30",
    emphasis: "border-l-4 border-l-green-500 bg-green-500/5",
    order: 5,
  },
};

function getTierConfig(tier: string = "L1") {
  return tierConfig[tier] ?? tierConfig.L1;
}

import { LoanReviewModal } from "@/components/loans/LoanReviewModal";

export function PendingApprovals() {
  const [selectedLoan, setSelectedLoan] = useState<PendingLoan | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const { data: responseData } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const res = await api.get("/api/admin/dashboard/pending-approvals");
      const rawData = res.data?.data || res.data || [];
      
      // Map API fields strictly
      const mappedLoans = (Array.isArray(rawData) ? rawData : []).map((l: any) => {
        const rawTier = l.tier ? String(l.tier) : "L1";
        const normalizedTier = rawTier.startsWith("L") ? rawTier : `L${rawTier}`;
        
        return {
          ...l,
          id: l.id ?? l._id ?? l.loanReference,
          reference: l.loanReference ?? l.reference ?? l.loanId ?? "N/A",
          user: l.user?.fullName ?? l.user ?? "Unknown User",
          phone: l.userMsisdn ?? l.phone ?? "",
          amount: l.principal ?? l.amount ?? 0,
          tier: normalizedTier,
          date: l.createdAt ?? l.requestedAt,
          tenor: l.tenureDays == null ? (l.tenure ?? l.tenor ?? "N/A") : `${l.tenureDays} days`,
          repaymentDate: l.dueDate ?? l.repaymentDate,
          loansToDate: l.loansToDate ?? 0,
          repaymentRate: l.repaymentRate ?? 100,
          creditScore: l.creditScore ?? 700,
          nodeCode: l.nodeCode ?? "N/A",
          userStatus: l.userStatus ?? "Node",
          status: (l.status?.toUpperCase() ?? "PENDING")
        };
      });

      return mappedLoans.filter((l: any) => l.status === "PENDING");
    },
  });

  const pendingLoans = (responseData || [])
    .filter((loan: any) => !approvedIds.has(loan.id) && !rejectedIds.has(loan.id))
    .sort((a: any, b: any) => getTierConfig(a.tier).order - getTierConfig(b.tier).order);

  const handleApprove = (e: React.MouseEvent, loanId: string) => {
    e.stopPropagation();
    setApprovedIds(new Set([...approvedIds, loanId]));
    toast.info("Quick-approve is preview only. Final approval happens in the full loan details view.");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // Future: Implement API call to approve loan
  };

  const handleReject = (e: React.MouseEvent, loanId: string) => {
    e.stopPropagation();
    setRejectedIds(new Set([...rejectedIds, loanId]));
    toast.info("Quick-reject is preview only. Final rejection happens in the full loan details view.");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // Future: Implement API call to reject loan
  };

  const totalPending = (responseData || []).length;
  const actionsNeeded = pendingLoans.length;

  return (
    <div className="bg-card rounded-xl shadow-sm animate-fade-in border border-border/50 overflow-hidden">
      <div className="p-5 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-bold text-foreground">Pending Approvals</h2>
        </div>
        <Badge className="bg-amber-500/20 text-amber-700 border border-amber-500/30 text-sm font-semibold px-2.5 py-1">
          {actionsNeeded} action{actionsNeeded === 1 ? "" : "s"}
        </Badge>
      </div>
      
      {actionsNeeded === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <p className="text-sm">All pending approvals processed ✓</p>
        </div>
      ) : (
        <div className="divide-y divide-border/20">
          {pendingLoans.slice(0, 5).map((loan: any, index: number) => {
            const tierInfo = getTierConfig(loan.tier);
            return (
              <button
                key={loan.id}
                onClick={() => setSelectedLoan(loan)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedLoan(loan);
                  }
                }}
                className={cn(
                  "w-full px-5 py-3.5 transition-all duration-150 cursor-pointer group hover:bg-muted/30 text-left",
                  tierInfo.emphasis
                )}
                type="button"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Primary row: Amount + Tier + User */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{loan.user}</p>
                    <p className="text-xs text-muted-foreground mt-1">{loan.phone}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-lg font-bold text-foreground">₵{(loan.amount || 0).toLocaleString()}</span>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs whitespace-nowrap", tierInfo.badge)}
                    >
                      {loan.tier}
                    </Badge>
                  </div>
                </div>
                
                {/* Secondary row: Tenure + Credit Score + Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground font-medium">{loan.tenor}</span>
                    <span className="text-muted-foreground">Score: {loan.creditScore}</span>
                  </div>
                  
                  {/* Inline Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-green-600 hover:bg-green-500/10"
                      onClick={(e) => handleApprove(e, loan.id)}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-red-600 hover:bg-red-500/10"
                      onClick={(e) => handleReject(e, loan.id)}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {totalPending > 5 && (
        <div className="p-4 border-t border-border/50 text-center">
          <Button 
            variant="ghost" 
            className="text-xs text-primary hover:text-primary/80"
            onClick={() => navigate("/loans/pending")}
          >
            View All {totalPending} Pending
          </Button>
        </div>
      )}
      
      {selectedLoan && (
        <LoanReviewModal
          loan={selectedLoan}
          isOpen={!!selectedLoan}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedLoan(null);
            }
          }}
        />
      )}
    </div>
  );
}
