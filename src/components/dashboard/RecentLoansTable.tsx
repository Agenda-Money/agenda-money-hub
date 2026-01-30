import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface Loan {
  id: string;
  userId: string;
  user: string;
  phone: string;
  amount: number;
  tenure: string;
  status: "pending" | "active" | "overdue" | "closed" | "repaid";
  date: string;
}

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";

const statusConfig = {
  pending: {
    badge: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    row: "bg-amber-500/5 hover:bg-amber-500/10",
    label: "Pending",
  },
  active: {
    badge: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    row: "bg-blue-500/5 hover:bg-blue-500/10",
    label: "Active",
  },
  repaid: {
    badge: "bg-green-500/10 text-green-700 border-green-500/30",
    row: "bg-green-500/5 hover:bg-green-500/10",
    label: "Repaid",
  },
  overdue: {
    badge: "bg-red-500/10 text-red-700 border-red-500/30",
    row: "bg-red-500/5 hover:bg-red-500/10",
    label: "Overdue",
  },
  closed: {
    badge: "bg-gray-500/10 text-gray-700 border-gray-500/30",
    row: "bg-gray-500/5 hover:bg-gray-500/10",
    label: "Closed",
  },
};

function getStatusConfig(status: string) {
  const key = status?.toLowerCase() ?? "pending";
  return statusConfig[key as keyof typeof statusConfig] ?? statusConfig.pending;
}

function formatTenure(tenureStr: string): string {
  if (tenureStr === "N/A" || !tenureStr) return tenureStr;
  const days = Number.parseInt(tenureStr);
  return days === 1 ? "1 day" : tenureStr;
}

export function RecentLoansTable() {
  const navigate = useNavigate();

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["recent-loans"],
    queryFn: async () => {
      const res = await api.get("/api/admin/dashboard/recent-loans");
      return res.data;
    },
  });

  // Handle wrapped { success: true, data: [...] } or direct array
  const rawLoans = Array.isArray(responseData) ? responseData : responseData?.data || [];
  
  const loans: Loan[] = rawLoans.map((l: any) => ({
    id: l.loanReference ?? l.id ?? l._id,
    userId: l.user?._id ?? "",
    user: l.user?.fullName ?? "Unknown User",
    phone: l.userMsisdn ?? "",
    amount: l.principal ?? 0,
    tenure: l.tenureDays == null ? "N/A" : `${l.tenureDays} days`,
    status: (l.status?.toLowerCase() ?? "pending") as "pending" | "active" | "overdue" | "closed" | "repaid",
    date: l.disbursedAt ?? l.createdAt,
  }));

  if (isLoading) {
    return <div className="p-8 text-center bg-card rounded-xl">Loading recent loans...</div>;
  }

  return (
    <div className="bg-card rounded-xl shadow-sm animate-fade-in border border-border/50 overflow-hidden">
      <div className="p-5 border-b border-border/50 flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Recent Loans</h2>
        <Button 
          variant="ghost" 
          className="text-xs text-primary hover:text-primary/80 h-auto p-0"
          onClick={() => navigate("/loans")}
        >
          View All →
        </Button>
      </div>
      
      <div className="divide-y divide-border/20">
        {loans.slice(0, 6).map((loan: Loan) => {
          const config = getStatusConfig(loan.status);
          return (
            <button 
              key={loan.id}
              onClick={() => navigate(`/users/${loan.userId}`)}
              className={cn(
                "w-full px-5 py-3.5 text-left transition-all duration-150 group",
                config.row
              )}
              type="button"
            >
              {/* Primary row: Amount + Status + User info */}
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{loan.user}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{loan.phone || "N/A"}</p>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-base font-bold text-foreground">₵{(loan.amount || 0).toLocaleString()}</span>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs whitespace-nowrap", config.badge)}
                  >
                    {config.label}
                  </Badge>
                </div>
              </div>
              
              {/* Secondary row: Tenure + Action hint */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground font-medium">{formatTenure(loan.tenure)}</span>
                <Eye className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors opacity-0 group-hover:opacity-100" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
