import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useQueries } from "@tanstack/react-query";
import api from "@/lib/api";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Clock, CheckCircle, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Loan {
  id: string;
  reference: string;
  user: string;
  phone: string;
  amount: number;
  tenure: string;
  dueDate: string;
  status: "pending" | "active" | "overdue" | "closed";
}



const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "bg-warning/10 text-warning border-warning/20" },
  active: { label: "Active", icon: CheckCircle, color: "bg-info/10 text-info border-info/20" },
  overdue: { label: "Overdue", icon: AlertTriangle, color: "bg-destructive/10 text-destructive border-destructive/20" },
  closed: { label: "Closed", icon: Check, color: "bg-success/10 text-success border-success/20" },
};

import { LoanReviewModal } from "@/components/loans/LoanReviewModal";

function LoansTable({ loans, onLoanClick }: { loans: Loan[]; onLoanClick: (loan: Loan) => void }) {
  return (
    <div className="bg-card rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Loan ID</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">User</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Amount</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Tenure</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Due Date</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Status</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan, index) => {
              const config = statusConfig[loan.status];
              if (!config) {
                console.warn(`Unexpected loan status: ${loan.status}`);
              }
              const displayConfig = config ?? statusConfig.pending;
              return (
                <tr
                  key={loan.id}
                  onClick={() => onLoanClick(loan)}
                  className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors duration-150 animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{loan.id}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{loan.user}</p>
                      <p className="text-xs text-muted-foreground">{loan.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">₵{loan.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{loan.tenure}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(loan.dueDate).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={cn("font-medium capitalize", displayConfig.color)}>
                      {loan.status ?? "Unknown"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {loans.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-muted-foreground">No loans found</p>
        </div>
      )}
    </div>
  );
}

const StatusCard = ({ title, count, type }: { title: string, count: number | string, type: "pending" | "active" | "closed" | "overdue" }) => {
  const styles = {
    pending: "border-warning text-warning bg-warning/5",
    active: "border-info text-info bg-info/5",
    closed: "border-success text-success bg-success/5",
    overdue: "border-destructive text-destructive bg-destructive/5",
  };

  return (
    <div className={cn("bg-card rounded-xl p-4 shadow-sm border-l-4", styles[type])}>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
    </div>
  );
};

export default function LoansPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);

  // Determine default tab from URL path
  const getTabFromPath = () => {
    const path = location.pathname;
    if (path.includes("/pending")) return "pending";
    if (path.includes("/active")) return "active";
    if (path.includes("/overdue")) return "overdue";
    if (path.includes("/closed")) return "closed";
    return "all";
  };

  const currentTab = getTabFromPath();

  // Reset page when tab changes
  useEffect(() => {
    setPage(1);
  }, [currentTab]);

  const { data: loansData, isLoading } = useQuery({
    queryKey: ["loans", page, currentTab],
    queryFn: async () => {
      const params: any = { page, limit: 10 };
      if (currentTab !== "all") {
        params.status = currentTab;
      }
      
      const res = await api.get("/api/admin/loans", { params });
      return res.data;
    },
    placeholderData: (previousData) => previousData,
  });

  // Parallel queries for status counts
  const statusQueries = useQueries({
    queries: ["pending", "active", "closed", "overdue"].map((status) => ({
      queryKey: ["loans-count", status],
      queryFn: async () => {
        const res = await api.get("/api/admin/loans", { params: { status, limit: 1 } });
        return res.data?.pagination?.total || 0;
      },
      staleTime: 60000, // Cache for 1 minute
    })),
  });

  const [pendingCount, activeCount, closedCount, overdueCount] = statusQueries.map(q => q.data ?? "-");

  const rawLoans = loansData?.loans || [];
  const totalLoans = loansData?.pagination?.total || 0;
  const totalPages = loansData?.pagination?.pages || 1;
  const currentPage = loansData?.pagination?.page || 1;

  // Map API fields strictly based on user provided structure
  const loans: Loan[] = rawLoans.map((l: any) => ({
    id: l.id ?? l._id ?? l.loanReference, // Prioritize DB ID for API calls, only falling back when null/undefined
    reference: l.loanReference ?? "N/A",
    user: l.user?.fullName  ?? l.user ?? "Unknown User", 
    phone: l.userMsisdn ?? l.phone ?? "",
    amount: l.principal ?? l.amount ?? 0,
    tenure: l.tenureDays != null ? `${l.tenureDays} days` : (l.tenure ?? "N/A"),
    dueDate: l.dueDate ?? l.repaymentDate ?? new Date().toISOString(),
    status: (l.status?.toLowerCase() ?? "pending") as any,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Loans</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor all loan applications</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatusCard title="Pending Approval" count={pendingCount} type="pending" />
          <StatusCard title="Active Loans" count={activeCount} type="active" />
          <StatusCard title="Closed Loans" count={closedCount} type="closed" />
          <StatusCard title="Overdue" count={overdueCount} type="overdue" />
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={(val) => navigate(val === "all" ? "/loans" : `/loans/${val}`)} className="space-y-4">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-card">All Loans</TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-card">Pending</TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-card">Active</TabsTrigger>
            <TabsTrigger value="closed" className="data-[state=active]:bg-card">Closed</TabsTrigger>
            <TabsTrigger value="overdue" className="data-[state=active]:bg-card">Overdue</TabsTrigger>
          </TabsList>

          <TabsContent value={currentTab} className="mt-0">
            <div className="space-y-4">
              <LoansTable 
                loans={loans} 
                onLoanClick={(loan) => setSelectedLoan(loan)}
              />
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {loans.length} of {totalLoans} loans
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoading}
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages || isLoading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <LoanReviewModal 
          loan={selectedLoan} 
          isOpen={!!selectedLoan} 
          onOpenChange={(open) => !open && setSelectedLoan(null)} 
        />
      </div>
    </DashboardLayout>
  );
}
