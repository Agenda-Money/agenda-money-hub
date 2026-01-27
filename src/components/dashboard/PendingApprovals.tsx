import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

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

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

const tierColors: Record<string, string> = {
  L1: "bg-muted text-muted-foreground",
  L2: "bg-info/10 text-info",
  L3: "bg-primary/10 text-primary",
  L4: "bg-success/10 text-success",
  L5: "bg-warning/10 text-warning",
};

import { LoanReviewModal } from "@/components/loans/LoanReviewModal";

export function PendingApprovals() {
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const res = await api.get("/api/admin/dashboard/pending-approvals");
      const rawData = res.data?.data || res.data || [];
      
      // Map API fields strictly
      const mappedLoans = (Array.isArray(rawData) ? rawData : []).map((l: any) => ({
        ...l, // Spread original fields as fallback
        id: l.id || l._id || l.loanReference, // Prioritize DB ID for API calls
        reference: l.loanReference || l.reference || l.loanId || "N/A",
        user: l.user?.fullName  || l.user || "Unknown User", // Handle both object and string
        phone: l.userMsisdn || l.phone || "",
        amount: l.principal || l.amount || 0,
        tier: l.tier ? `L${l.tier}` : "L1", // Ensure Lx format
        date: l.createdAt || l.requestedAt,
        tenor: l.tenureDays ? `${l.tenureDays} days` : l.tenure || l.tenor || "N/A",
        repaymentDate: l.dueDate || l.repaymentDate,
        loansToDate: l.loansToDate || 0,
        repaymentRate: l.repaymentRate || 100,
        creditScore: l.creditScore || 700,
        nodeCode: l.nodeCode || "N/A",
        userStatus: l.userStatus || "Node",
        status: (l.status?.toUpperCase() || "PENDING")
      }));

      // Client-side filter for extra safety
      return mappedLoans.filter((l: any) => l.status === "PENDING");
    },
  });

  const pendingLoans = responseData || [];

  return (
    <div className="bg-card rounded-xl shadow-sm animate-fade-in">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Pending Approvals</h2>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {pendingLoans.length} pending
          </Badge>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {pendingLoans.slice(0, 4).map((loan: any, index: number) => (
          <div 
            key={loan.id} 
            onClick={() => setSelectedLoan(loan)}
            className="cursor-pointer"
          >
            <div
              className="p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-all duration-200"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-foreground">{loan.user}</p>
                  <p className="text-sm text-muted-foreground">{loan.phone}</p>
                </div>
                <Badge variant="outline" className={tierColors[loan.tier]}>
                  {loan.tier}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-foreground">
                    ₵{loan.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{loan.date}</p>
                </div>
                <div className="flex items-center gap-2">
                   <Button size="sm" variant="ghost" className="h-8 text-muted-foreground">
                      Review
                   </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <LoanReviewModal 
        loan={selectedLoan} 
        isOpen={!!selectedLoan} 
        onOpenChange={(open) => !open && setSelectedLoan(null)} 
      />
      
      <div className="p-4 border-t border-border">
        <Button 
          variant="ghost" 
          className="w-full text-primary hover:text-primary/80"
          onClick={() => navigate("/loans/pending")}
        >
          View All Pending
        </Button>
      </div>
    </div>
  );
}
