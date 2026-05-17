import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useQueries } from "@tanstack/react-query";
import { getAdminLoans, exportAdminLoans } from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Eye, Clock, CheckCircle, AlertTriangle, Check, XCircle, Loader2,
  Filter, Search, Download, X, ChevronUp, ChevronDown, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoanReviewModal } from "@/components/loans/LoanReviewModal";

interface Loan {
  id: string;
  reference: string;
  user: string;
  userId?: string;
  phone: string;
  amount: number;
  tenure: string;
  dueDate: string;
  appliedAt?: string;
  disbursedAt?: string;
  totalPayable?: number;
  amountRepaid?: number;
  status: "PENDING" | "DISBURSING" | "ACTIVE" | "REPAID" | "OVERDUE" | "DEFAULTED" | "REJECTED" | "DUE TODAY" | "AWAITING_ENDORSEMENT";
  nodeCode: string;
  kycStatus?: string;
  selfieUrl?: string;
  tier?: string | number;
  guaranteedBy?: string;
  guaranteedByName?: string;
  guaranteedByMsisdn?: string;
  guaranteedAt?: string;
  guarantorApprovedAt?: string;
  createdAt?: string;
  totalLoans?: number;
  loansToDate?: number;
}

const statusConfig = {
  PENDING: { label: "Pending", icon: Clock, color: "bg-warning/10 text-warning border-warning/20" },
  DISBURSING: { label: "Disbursing", icon: Loader2, color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  ACTIVE: { label: "Active", icon: CheckCircle, color: "bg-green-600/10 text-green-700 border-green-500/20" },
  REPAID: { label: "Closed", icon: Check, color: "bg-blue-600/10 text-blue-700 border-blue-500/20" },
  OVERDUE: { label: "Overdue", icon: AlertTriangle, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  DEFAULTED: { label: "Defaulted", icon: XCircle, color: "bg-destructive/10 text-destructive border-destructive/20" },
  REJECTED: { label: "Rejected", icon: XCircle, color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  AWAITING_ENDORSEMENT: { label: "Awaiting Node", icon: Clock, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  "DUE TODAY": { label: "Due Today", icon: AlertTriangle, color: "bg-warning/10 text-warning border-warning/20" },
};

const tabStatusMap: Record<string, string> = {
  pending: "PENDING",
  "awaiting-node": "AWAITING_ENDORSEMENT",
  active: "ACTIVE",
  overdue: "OVERDUE",
  closed: "REPAID,CLOSED",
  defaulted: "DEFAULTED",
};

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function SortIcon({ field, sortBy, sortOrder }: { field: string; sortBy: string; sortOrder: "asc" | "desc" }) {
  if (sortBy !== field) return <ChevronUp className="h-3 w-3 opacity-30" />;
  return sortOrder === "asc"
    ? <ChevronUp className="h-3 w-3 text-primary" />
    : <ChevronDown className="h-3 w-3 text-primary" />;
}

function LoansTable({ loans, onLoanClick, sortBy, sortOrder, onSort }: Readonly<{
  loans: Loan[];
  onLoanClick: (loan: Loan) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
}>) {
  if (loans.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-sm p-12 text-center">
        <p className="text-muted-foreground">No loans found</p>
      </div>
    );
  }

  const sortHeader = (label: string, field: string) => (
    <th
      className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon field={field} sortBy={sortBy} sortOrder={sortOrder} />
      </div>
    </th>
  );

  return (
    <>
      <div className="hidden md:block bg-card rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Reference</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">User</th>
                {sortHeader("Amount", "amount")}
                {sortHeader("Applied", "appliedAt")}
                {sortHeader("Disbursed", "disbursedAt")}
                {sortHeader("Due Date", "dueDate")}
                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Status</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan, index) => {
                const normalizedStatus = (loan.status || "PENDING").toUpperCase() as keyof typeof statusConfig;
                const displayConfig = statusConfig[normalizedStatus] ?? statusConfig.PENDING;
                return (
                  <tr
                    key={loan.id}
                    onClick={() => onLoanClick(loan)}
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors duration-150 animate-fade-in cursor-pointer"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-foreground font-mono">{loan.reference}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{loan.user}</p>
                        <p className="text-xs text-muted-foreground">{loan.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">₵{loan.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(loan.appliedAt)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(loan.disbursedAt)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(loan.dueDate)}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={cn("font-medium", displayConfig.color)}>
                        {displayConfig.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
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

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {loans.map((loan, index) => {
          const normalizedStatus = (loan.status || "PENDING").toUpperCase() as keyof typeof statusConfig;
          const displayConfig = statusConfig[normalizedStatus] ?? statusConfig.PENDING;
          const StatusIcon = displayConfig.icon;
          return (
            <div
              key={loan.id}
              role="button"
              tabIndex={0}
              onClick={() => onLoanClick(loan)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  if (e.key === " ") e.preventDefault();
                  onLoanClick(loan);
                }
              }}
              className="w-full text-left bg-card rounded-xl p-4 shadow-sm border border-border space-y-3 animate-fade-in cursor-pointer active:bg-muted/50"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground font-mono">{loan.reference}</p>
                  <h3 className="font-semibold text-foreground">{loan.user}</h3>
                  <p className="text-sm text-muted-foreground">{loan.phone}</p>
                </div>
                <Badge variant="outline" className={cn("font-medium flex items-center gap-1", displayConfig.color)}>
                  <StatusIcon className={cn("h-3 w-3", loan.status === "DISBURSING" && "animate-spin")} />
                  {displayConfig.label}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">Amount</span>
                  <span className="font-semibold text-foreground">₵{loan.amount.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">Applied</span>
                  <span className="font-medium text-foreground">{formatDate(loan.appliedAt)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">Due Date</span>
                  <span className="font-medium text-foreground">{formatDate(loan.dueDate)}</span>
                </div>
              </div>

              {loan.disbursedAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-600" />
                  Disbursed: {formatDate(loan.disbursedAt)}
                </p>
              )}

              <div className="pt-3 border-t border-border flex justify-end">
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

const StatusCard = ({
  title, count, type,
}: {
  title: string;
  count: number | string;
  type: "pending" | "awaiting" | "active" | "closed" | "overdue" | "defaulted";
}) => {
  const styles = {
    pending: "border-warning text-warning bg-warning/5",
    awaiting: "border-purple-500 text-purple-600 bg-purple-500/5",
    active: "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/20",
    closed: "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/20",
    overdue: "border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/20",
    defaulted: "border-destructive text-destructive bg-destructive/5",
  };
  return (
    <div className={cn("bg-card rounded-xl p-4 shadow-sm border-l-4", styles[type])}>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
    </div>
  );
};

function parseDateRobust(dateStr: string | undefined | null): Date {
  if (!dateStr) return new Date("Invalid");
  const standardDate = new Date(dateStr);
  if (!isNaN(standardDate.getTime())) return standardDate;
  const match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
  return new Date("Invalid");
}

export default function LoansPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("appliedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [jumpPage, setJumpPage] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const getTabFromPath = () => {
    const path = location.pathname;
    if (path.includes("/awaiting-node")) return "awaiting-node";
    if (path.includes("/defaulted")) return "defaulted";
    if (path.includes("/pending")) return "pending";
    if (path.includes("/active")) return "active";
    if (path.includes("/overdue")) return "overdue";
    if (path.includes("/closed")) return "closed";
    return "all";
  };

  const currentTab = getTabFromPath();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [currentTab, debouncedSearch, sortBy, sortOrder, dateFrom, dateTo, statusFilter]);

  const buildParams = useCallback(() => {
    const params: Record<string, any> = { page, limit: 10, sortBy, sortOrder };
    if (debouncedSearch) params.search = debouncedSearch;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    const statusForTab = tabStatusMap[currentTab];
    if (currentTab === "all" && statusFilter !== "all") {
      params.status = statusFilter;
    } else if (statusForTab) {
      params.status = statusForTab;
    }
    return params;
  }, [page, sortBy, sortOrder, debouncedSearch, dateFrom, dateTo, currentTab, statusFilter]);

  const { data: loansData, isLoading } = useQuery({
    queryKey: ["loans", page, currentTab, statusFilter, debouncedSearch, sortBy, sortOrder, dateFrom, dateTo],
    queryFn: () => getAdminLoans(buildParams()),
    placeholderData: (previousData) => previousData,
  });

  const statusQueries = useQueries({
    queries: ["PENDING", "AWAITING_ENDORSEMENT", "ACTIVE", "REPAID,CLOSED", "OVERDUE", "DEFAULTED"].map((status) => ({
      queryKey: ["loans-count", status],
      queryFn: async () => {
        const res = await getAdminLoans({ status, limit: 1 });
        return res.pagination?.total || 0;
      },
      staleTime: 60000,
    })),
  });

  const [pendingCount, awaitingNodeCount, activeCount, closedCount, overdueCount, defaultedCount] =
    statusQueries.map((q) => q.data ?? 0);

  const rawLoans = loansData?.loans || [];
  const totalLoans = loansData?.pagination?.total || 0;
  const totalPages = loansData?.pagination?.pages || 1;
  const currentPage = loansData?.pagination?.page || 1;

  const loans: Loan[] = rawLoans.map((l: any) => {
    const tenureValue =
      l.tenureDays === null || l.tenureDays === undefined ? (l.tenure ?? "N/A") : `${l.tenureDays} days`;

    let computedStatus = l.status?.toUpperCase() ?? "PENDING";

    if (computedStatus === "ACTIVE" && (l.dueDate || l.repaymentDate)) {
      const due = parseDateRobust(l.dueDate || l.repaymentDate);
      due.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!isNaN(due.getTime())) {
        if (due.getTime() < today.getTime()) computedStatus = "OVERDUE";
        else if (due.getTime() === today.getTime()) computedStatus = "DUE TODAY";
      }
    }

    const rawTier = l.currentTier ?? l.user?.currentTier ?? l.tier ?? l.user?.tier ?? 1;
    const tierNum = typeof rawTier === "string" ? rawTier.replace(/\D/g, "") || "1" : rawTier;

    return {
      id: l.id ?? l._id ?? l.loanReference,
      reference: l.loanReference ?? "N/A",
      user: l.user?.fullName ?? l.user ?? "Unknown User",
      userId: l.user?._id ?? l.userId ?? "",
      phone: l.userMsisdn ?? l.phone ?? "",
      amount: l.principal ?? l.amount ?? 0,
      tenure: tenureValue,
      dueDate: l.dueDate ?? l.repaymentDate ?? "",
      appliedAt: l.createdAt ?? "",
      disbursedAt: l.disbursedAt ?? "",
      totalPayable: l.totalPayable ?? 0,
      amountRepaid: l.amountRepaid ?? 0,
      status: computedStatus as Loan["status"],
      nodeCode: l.user?.personalNodeCode || l.user?.nodeCode || "N/A",
      kycStatus: l.user?.kycStatus || l.user?.kyc?.kycStatus || l.user?.onboardingData?.kycStatus || "Unknown",
      selfieUrl: l.user?.selfieUrl || l.user?.kyc?.selfieUrl || l.user?.kycData?.selfieUrl || "",
      tier: `L${tierNum}`,
      guaranteedBy: l.guaranteedBy,
      guaranteedByName: l.guaranteedByName,
      guaranteedByMsisdn: l.guaranteedByMsisdn,
      guaranteedAt: l.guaranteedAt,
      guarantorApprovedAt: l.guarantorApprovedAt,
      createdAt: l.createdAt,
      totalLoans: l.user?.totalLoansRepaid ?? l.user?.totalLoansTaken ?? l.user?.totalLoans ?? l.totalLoans ?? 0,
      loansToDate: l.user?.totalLoansRepaid ?? l.user?.totalLoansTaken ?? l.user?.totalLoans ?? l.loansToDate ?? 0,
    };
  });

  const handleSort = (field: string) => {
    if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortOrder("desc"); }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params: Record<string, any> = {};
      const statusForTab = tabStatusMap[currentTab];
      if (currentTab === "all" && statusFilter !== "all") params.status = statusFilter;
      else if (statusForTab) params.status = statusForTab;
      if (debouncedSearch) params.search = debouncedSearch;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      await exportAdminLoans(params);
    } finally {
      setIsExporting(false);
    }
  };

  const hasFilters = !!(debouncedSearch || dateFrom || dateTo || statusFilter !== "all");

  const clearFilters = () => {
    setSearchInput("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
  };

  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
  const pageButtons: number[] = [];
  for (let i = startPage; i <= endPage; i++) pageButtons.push(i);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Loans</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage and monitor all loan applications</p>
          </div>
          <Button onClick={handleExport} disabled={isExporting} variant="outline" size="sm" className="shrink-0">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatusCard title="Pending" count={pendingCount} type="pending" />
          <StatusCard title="Awaiting Node" count={awaitingNodeCount} type="awaiting" />
          <StatusCard title="Active" count={activeCount} type="active" />
          <StatusCard title="Closed" count={closedCount} type="closed" />
          <StatusCard title="Overdue" count={overdueCount} type="overdue" />
          <StatusCard title="Defaulted" count={defaultedCount} type="defaulted" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by reference, name or phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 bg-card rounded-xl"
          />
          {searchInput && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchInput("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Tabs + status filter */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Tabs
              value={currentTab}
              onValueChange={(val) => navigate(val === "all" ? "/loans" : `/loans/${val}`)}
              className="w-full sm:w-auto"
            >
              <TabsList className="bg-muted p-1 overflow-x-auto flex flex-nowrap shrink-0 snap-x">
                {[
                  { value: "all", label: "All" },
                  { value: "pending", label: "Pending" },
                  { value: "awaiting-node", label: "Awaiting Node" },
                  { value: "active", label: "Active" },
                  { value: "overdue", label: "Overdue" },
                  { value: "closed", label: "Closed" },
                  { value: "defaulted", label: "Defaulted" },
                ].map(({ value, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="data-[state=active]:bg-card whitespace-nowrap snap-start shrink-0 text-xs sm:text-sm"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

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

          {/* Date range */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Applied:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground"
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <Tabs value={currentTab} className="space-y-4">
          <TabsContent value={currentTab} className="mt-0">
            <div className="space-y-4">
              <LoansTable
                loans={loans}
                onLoanClick={(loan) => setSelectedLoan(loan)}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />

              {/* Pagination — always visible */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {loans.length} of {totalLoans} loan{totalLoans !== 1 ? "s" : ""}
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoading}
                    >
                      Previous
                    </Button>
                    {pageButtons.map((p) => (
                      <Button
                        key={p}
                        variant={p === currentPage ? "default" : "outline"}
                        size="sm"
                        className="w-9"
                        onClick={() => setPage(p)}
                        disabled={isLoading}
                      >
                        {p}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages || isLoading}
                    >
                      Next
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={jumpPage}
                      onChange={(e) => setJumpPage(e.target.value)}
                      placeholder="Go"
                      className="w-16 h-8 text-sm text-center ml-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const n = parseInt(jumpPage, 10);
                          if (n >= 1 && n <= totalPages) { setPage(n); setJumpPage(""); }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
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
