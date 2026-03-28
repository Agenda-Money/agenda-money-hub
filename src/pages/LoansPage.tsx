import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useQueries } from "@tanstack/react-query";
import { getAdminLoans } from "@/lib/api";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Clock, CheckCircle, AlertTriangle, Check, XCircle, Loader2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface Loan {
  id: string;
  reference: string;
  user: string;
  userId?: string;
  phone: string;
  amount: number;
  tenure: string;
  dueDate: string;
  status: "PENDING" | "DISBURSING" | "ACTIVE" | "REPAID" | "OVERDUE" | "DEFAULTED" | "REJECTED" | "DUE TODAY" | "AWAITING_ENDORSEMENT";
  nodeCode: string;
  kycStatus?: string;
  selfieUrl?: string;
  tier?: string | number;
  guaranteedBy?: string;
  guaranteedByName?: string;
  guaranteedByMsisdn?: string;
  guaranteedAt?: string;
}



const statusConfig = {
  PENDING: { label: "Pending", icon: Clock, color: "bg-warning/10 text-warning border-warning/20" },
  DISBURSING: { label: "Disbursing", icon: Loader2, color: "bg-info/10 text-info border-info/20" },
  ACTIVE: { label: "Active", icon: CheckCircle, color: "bg-info/10 text-info border-info/20" },
  REPAID: { label: "Closed", icon: Check, color: "bg-success/10 text-success border-success/20" },
  OVERDUE: { label: "Overdue", icon: AlertTriangle, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  DEFAULTED: { label: "Defaulted", icon: XCircle, color: "bg-destructive/10 text-destructive border-destructive/20" },
  REJECTED: { label: "Rejected", icon: XCircle, color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  AWAITING_ENDORSEMENT: { label: "Awaiting Node", icon: Clock, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  "DUE TODAY": { label: "Due Today", icon: AlertTriangle, color: "bg-warning/10 text-warning border-warning/20" },
};

import { LoanReviewModal } from "@/components/loans/LoanReviewModal";

function LoansTable({ loans, onLoanClick }: Readonly<{ loans: Loan[]; onLoanClick: (loan: Loan) => void }>) {
  if (loans.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-sm p-12 text-center">
        <p className="text-muted-foreground">No loans found</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block bg-card rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Reference</th>
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
                const normalizedStatus = (loan.status || "PENDING").toUpperCase() as keyof typeof statusConfig;
                const config = statusConfig[normalizedStatus];
                if (!config) {
                  console.warn(`Unexpected loan status: ${loan.status}`);
                }
                const displayConfig = config ?? statusConfig.PENDING;
                return (
                  <tr
                    key={loan.id}
                    onClick={() => onLoanClick(loan)}
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors duration-150 animate-fade-in cursor-pointer"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{loan.reference}</td>
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
      </div>
      
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {loans.map((loan, index) => {
          const normalizedStatus = (loan.status || "PENDING").toUpperCase() as keyof typeof statusConfig;
          const config = statusConfig[normalizedStatus];
          const displayConfig = config ?? statusConfig.PENDING;
          const StatusIcon = displayConfig.icon;
          return (
            <div
              key={loan.id}
              role="button"
              tabIndex={0}
              onClick={() => onLoanClick(loan)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (e.key === ' ') {
                    e.preventDefault();
                  }
                  onLoanClick(loan);
                }
              }}
              className="w-full text-left bg-card rounded-xl p-4 shadow-sm border border-border space-y-3 animate-fade-in cursor-pointer active:bg-muted/50"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Header with ID and Status */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground">{loan.reference}</p>
                  <h3 className="font-semibold text-foreground">{loan.user}</h3>
                  <p className="text-sm text-muted-foreground">{loan.phone}</p>
                </div>
                <Badge variant="outline" className={cn("font-medium flex items-center gap-1", displayConfig.color)}>
                  <StatusIcon className={cn("h-3 w-3", loan.status === "DISBURSING" && "animate-spin")} />
                  {loan.status ?? "Unknown"}
                </Badge>
              </div>

              {/* Loan Details Grid */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">Amount</span>
                  <span className="font-semibold text-foreground">₵{loan.amount.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">Tenure</span>
                  <span className="font-medium text-foreground">{loan.tenure}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">Due Date</span>
                  <span className="font-medium text-foreground">
                    {new Date(loan.dueDate).toLocaleDateString("en-GB")}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button variant="outline" size="sm" className="h-8" onClick={(e) => e.stopPropagation()}>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
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

// Robust date parser for mixed backend date formats (e.g. DD/MM/YYYY)
function parseDateRobust(dateStr: string | undefined | null): Date {
  if (!dateStr) return new Date("Invalid");
  
  // Test if it's already an ISO or valid standard date
  const standardDate = new Date(dateStr);
  if (!isNaN(standardDate.getTime())) return standardDate;

  // Try parsing DD/MM/YYYY or DD-MM-YYYY
  const regex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const match = dateStr.match(regex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const year = parseInt(match[3], 10);
    return new Date(year, month, day);
  }
  
  return new Date("Invalid");
}

export default function LoansPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  // Reset page and filter when tab changes
  useEffect(() => {
    setPage(1);
    if (currentTab !== "all") {
       setStatusFilter("all");
    }
  }, [currentTab]);

  // Main loans query
  const { data: loansData, isLoading } = useQuery({
    queryKey: ["loans", page, currentTab, statusFilter],
    queryFn: async () => {
      // Special handling for merged "Closed" tab
      if (currentTab === "closed") {
        const [closedRes, repaidRes] = await Promise.all([
          getAdminLoans({ status: "closed", page, limit: 10 }),
          getAdminLoans({ status: "repaid", page, limit: 10 })
        ]);

        const closedLoans = closedRes.data || closedRes.loans || [];
        const repaidLoans = repaidRes.data || repaidRes.loans || [];
        
        // Merge and sort by date descending
        const mergedLoans = [...closedLoans, ...repaidLoans].sort((a: any, b: any) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Combine pagination totals
        const totalClosed = closedRes.pagination?.total || 0;
        const totalRepaid = repaidRes.pagination?.total || 0;
        
        return {
          loans: mergedLoans,
          pagination: {
            total: totalClosed + totalRepaid,
            page: page,
            pages: Math.ceil((totalClosed + totalRepaid) / 10)
          }
        };
      }

      // Standard behavior for other tabs
      const params: any = { page, limit: 10 };
      
      if (currentTab === "all" && statusFilter !== "all") {
        params.status = statusFilter;
      } else if (currentTab !== "all") {
        params.status = currentTab;
      }
      
      const res = await getAdminLoans(params);
      return res;
    },
    placeholderData: (previousData) => previousData,
  });

  // Parallel queries for status counts
  const statusQueries = useQueries({
    queries: ["pending", "active", "closed", "overdue", "repaid"].map((status) => ({
      queryKey: ["loans-count", status],
      queryFn: async () => {
        const res = await getAdminLoans({ status, limit: 1 });
        return res.pagination?.total || 0;
      },
      staleTime: 60000, 
    })),
  });

  const [pendingCount, activeCount, closedCountRaw, overdueCount, repaidCount] = statusQueries.map(q => q.data ?? 0);
  
  // Combine closed and repaid counts
  const closedCount = (Number(closedCountRaw) || 0) + (Number(repaidCount) || 0);

  const rawLoans = loansData?.loans || [];
  const totalLoans = loansData?.pagination?.total || 0;
  const totalPages = loansData?.pagination?.pages || 1;
  const currentPage = loansData?.pagination?.page || 1;

  // Map API fields strictly based on user provided structure
  const loans: Loan[] = rawLoans.map((l: any) => {
    const tenureValue = l.tenureDays === null || l.tenureDays === undefined
      ? (l.tenure ?? "N/A")
      : `${l.tenureDays} days`;

    let computedStatus = l.status?.toUpperCase() ?? "PENDING";
    
    if (import.meta.env.DEV) {

    }

    // Dynamically check dates since backend cron may not have run
    if (computedStatus === "ACTIVE" && (l.dueDate || l.repaymentDate)) {
      const dateString = l.dueDate || l.repaymentDate;
      const due = parseDateRobust(dateString);
      due.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (import.meta.env.DEV) {

      }

      if (!isNaN(due.getTime())) {
        if (due.getTime() < today.getTime()) {
          computedStatus = "OVERDUE";
        } else if (due.getTime() === today.getTime()) {
          computedStatus = "DUE TODAY";
        }
      }
      if (import.meta.env.DEV) {

      }
    }

    const mappedLoan = {
    id: l.id ?? l._id ?? l.loanReference, // Prioritize DB ID for API calls, only falling back when null/undefined
    reference: l.loanReference ?? "N/A",
    user: l.user?.fullName  ?? l.user ?? "Unknown User", 
    userId: l.user?._id ?? l.userId ?? "", // Extract ID
    phone: l.userMsisdn ?? l.phone ?? "",
    amount: l.principal ?? l.amount ?? 0,
    tenure: tenureValue,
    dueDate: l.dueDate ?? l.repaymentDate ?? new Date().toISOString(),
    status: computedStatus as Loan["status"],
    // Add Node Code mapping (Personal > Referrer > N/A)
    nodeCode: l.user?.personalNodeCode || l.user?.nodeCode || "N/A",
    kycStatus: l.user?.kycStatus || l.user?.kyc?.kycStatus || l.user?.onboardingData?.kycStatus || "Unknown",
    selfieUrl: l.user?.selfieUrl || l.user?.kyc?.selfieUrl || l.user?.kycData?.selfieUrl || l.user?.onboardingData?.selfieUrl || "",
    tier: l.user?.currentTier || l.user?.tier || 1,
    guaranteedBy: l.guaranteedBy,
    guaranteedByName: l.guaranteedByName,
    guaranteedByMsisdn: l.guaranteedByMsisdn,
    guaranteedAt: l.guaranteedAt,
    guarantorApprovedAt: l.guarantorApprovedAt,
    createdAt: l.createdAt
    };


    return mappedLoan;
  });

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

        {/* Controls Row (Tabs + Filter) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs value={currentTab} onValueChange={(val) => navigate(val === "all" ? "/loans" : `/loans/${val}`)} className="w-full sm:w-auto">
            <TabsList className="bg-muted p-1 overflow-x-auto flex flex-nowrap shrink-0 snap-x">
              <TabsTrigger value="all" className="data-[state=active]:bg-card whitespace-nowrap snap-start shrink-0">All Loans</TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-card whitespace-nowrap snap-start shrink-0">Pending</TabsTrigger>
              <TabsTrigger value="active" className="data-[state=active]:bg-card whitespace-nowrap snap-start shrink-0">Active</TabsTrigger>
              <TabsTrigger value="closed" className="data-[state=active]:bg-card whitespace-nowrap snap-start shrink-0">Closed</TabsTrigger>
              <TabsTrigger value="overdue" className="data-[state=active]:bg-card whitespace-nowrap snap-start shrink-0">Overdue</TabsTrigger>
            </TabsList>
            <div className="mt-4 hidden sm:block"> {/* Hidden div to structure tabs better */} </div> 
          </Tabs>

          {/* Detailed Status Filter (Only visible on All Loans tab) */}
          {currentTab === "all" && (
            <div className="flex items-center gap-2 w-full sm:w-[220px]">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full rounded-xl bg-card border-border">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="AWAITING_ENDORSEMENT">Awaiting Node</SelectItem>
                  <SelectItem value="DISBURSING">Disbursing</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="DEFAULTED">Defaulted</SelectItem>
                  <SelectItem value="REPAID">Repaid</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Tabs value={currentTab} className="space-y-4">
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
