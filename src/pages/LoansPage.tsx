import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useQueries } from "@tanstack/react-query";
import api from "@/lib/api";
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
      <div className="md:hidden space-y-4 w-full pl-2 pr-6 overflow-x-hidden">
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
              className="w-full text-left bg-card rounded-xl p-4 shadow-sm border border-border space-y-3 animate-fade-in cursor-pointer active:bg-muted/50"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Header with ID and Status */}
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 w-full">
                    <p className="text-[10px] text-muted-foreground truncate font-mono">{loan.reference}</p>
                    <Badge variant="outline" className={cn("font-medium flex items-center gap-1 shrink-0 text-[10px] px-1.5 py-0", displayConfig.color)}>
                      <StatusIcon className={cn("h-3 w-3", loan.status === "DISBURSING" && "animate-spin")} />
                      {loan.status ?? "Unknown"}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-foreground truncate mt-0.5">{loan.user}</h3>
                  <p className="text-xs text-muted-foreground truncate">{loan.phone}</p>
                </div>
              </div>

              {/* Loan Details Grid */}
              <div className="grid grid-cols-2 gap-3 pb-1 border-b border-border/50">
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold opacity-70">Amount</span>
                  <span className="font-bold text-foreground text-sm">₵{loan.amount.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold opacity-70">Tenure</span>
                  <span className="font-bold text-foreground text-sm">{loan.tenure}</span>
                </div>
              </div>

              {/* Bottom Row: Due Date + View Button */}
              <div className="pt-1 flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold opacity-70">Due Date</span>
                  <span className="font-bold text-foreground text-[11px] truncate">
                    {new Date(loan.dueDate).toLocaleDateString("en-GB")}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-3 text-xs font-bold text-primary hover:bg-primary/5 flex items-center gap-1.5 shrink-0" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoanClick(loan);
                  }}
                >
                  <Eye className="h-3.5 w-3.5" />
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
    <div className={cn("bg-card rounded-xl p-4 shadow-sm border-l-4 w-full min-w-0", styles[type])}>
      <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
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
          api.get("/api/admin/loans", { params: { status: "closed", page, limit: 10 } }),
          api.get("/api/admin/loans", { params: { status: "repaid", page, limit: 10 } })
        ]);

        const closedLoans = closedRes.data?.loans || [];
        const repaidLoans = repaidRes.data?.loans || [];
        
        // Merge and sort by date descending
        const mergedLoans = [...closedLoans, ...repaidLoans].sort((a: any, b: any) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Combine pagination totals
        const totalClosed = closedRes.data?.pagination?.total || 0;
        const totalRepaid = repaidRes.data?.pagination?.total || 0;
        
        return {
          loans: mergedLoans, // Note: pagination is imperfect here as it's 2 pages combined, but better than broken
          pagination: {
            total: totalClosed + totalRepaid,
            page: page,
            pages: Math.ceil((totalClosed + totalRepaid) / 10) // Approx total pages
          }
        };
      }

      // Standard behavior for other tabs
      const params: any = { page, limit: 10 };
      
      // Detailed status filter applied only on the "All Loans" tab
      if (currentTab === "all" && statusFilter !== "all") {
        params.status = statusFilter;
      } else if (currentTab !== "all") {
        params.status = currentTab;
      }
      
      const res = await api.get("/api/admin/loans", { params });
      return res.data;
    },
    placeholderData: (previousData) => previousData,
  });

  // Parallel queries for status counts
  const statusQueries = useQueries({
    queries: ["pending", "active", "closed", "overdue", "repaid"].map((status) => ({
      queryKey: ["loans-count", status],
      queryFn: async () => {
        const res = await api.get("/api/admin/loans", { params: { status, limit: 1 } });
        return res.data?.pagination?.total || 0;
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
    guaranteedAt: l.guaranteedAt
    };


    return mappedLoan;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[390px] md:max-w-none mx-auto w-full px-0 md:px-0 overflow-x-hidden pb-20 md:pb-6">
        {/* Header */}
        <div className="pl-2 pr-6 md:px-0">
          <h1 className="text-3xl font-bold text-foreground font-heading">Loans</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Manage and monitor all loan applications</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pl-2 pr-6 md:px-0">
          <StatusCard title="Pending Approval" count={pendingCount} type="pending" />
          <StatusCard title="Active Loans" count={activeCount} type="active" />
          <StatusCard title="Closed Loans" count={closedCount} type="closed" />
          <StatusCard title="Overdue" count={overdueCount} type="overdue" />
        </div>

        {/* Controls Row (Tabs + Filter) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs 
            value={currentTab} 
            onValueChange={(val) => navigate(val === "all" ? "/loans" : `/loans/${val}`)} 
            className="w-full"
          >
            <TabsList 
              className="bg-transparent p-0 flex overflow-x-auto no-scrollbar w-full justify-start border-none ml-[-4px] pl-1 pr-8 md:ml-0 md:px-1 gap-2"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
              }}
            >
              <TabsTrigger value="all" className="whitespace-nowrap px-3 py-1.5 text-xs md:text-sm shrink-0 rounded-lg data-[state=active]:bg-muted data-[state=active]:shadow-none">All Loans</TabsTrigger>
              <TabsTrigger value="pending" className="whitespace-nowrap px-3 py-1.5 text-xs md:text-sm shrink-0 rounded-lg data-[state=active]:bg-muted data-[state=active]:shadow-none">Pending</TabsTrigger>
              <TabsTrigger value="active" className="whitespace-nowrap px-3 py-1.5 text-xs md:text-sm shrink-0 rounded-lg data-[state=active]:bg-muted data-[state=active]:shadow-none">Active</TabsTrigger>
              <TabsTrigger value="closed" className="whitespace-nowrap px-3 py-1.5 text-xs md:text-sm shrink-0 rounded-lg data-[state=active]:bg-muted data-[state=active]:shadow-none">Closed</TabsTrigger>
              <TabsTrigger value="overdue" className="whitespace-nowrap px-3 py-1.5 text-xs md:text-sm shrink-0 rounded-lg data-[state=active]:bg-muted data-[state=active]:shadow-none">Overdue</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Detailed Status Filter (Only visible on All Loans tab) */}
          {currentTab === "all" && (
            <div className="flex items-center gap-2 w-full sm:w-[220px] pl-2 pr-6 md:px-0">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full rounded-xl bg-card border-border h-11 text-sm font-medium">
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
                <div className="flex flex-col gap-4 items-center sm:flex-row sm:justify-between border-t border-border pt-4 px-4 sm:px-0">
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
