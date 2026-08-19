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
  Filter, Search, Download, X, ChevronUp, ChevronDown, Calendar, SlidersHorizontal,
  ShieldCheck, CircleDollarSign, Ban,
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
  status: "PENDING" | "DISBURSING" | "ACTIVE" | "REPAID" | "CLOSED" | "OVERDUE" | "DEFAULTED" | "REJECTED" | "DUE TODAY" | "AWAITING_ENDORSEMENT";
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
  AWAITING_MANDATE: { label: "Awaiting Mandate", icon: ShieldCheck, color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
  DISBURSING_INIT: { label: "Initiating", icon: Loader2, color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  DISBURSING: { label: "Disbursing", icon: Loader2, color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  DISBURSEMENT_REVIEW: { label: "Review Required", icon: AlertTriangle, color: "bg-red-500/10 text-red-600 border-red-300" },
  ACTIVE: { label: "Active", icon: CheckCircle, color: "bg-green-600/10 text-green-700 border-green-500/20" },
  REPAID: { label: "Closed", icon: Check, color: "bg-blue-600/10 text-blue-700 border-blue-500/20" },
  CLOSED: { label: "Closed", icon: Check, color: "bg-blue-600/10 text-blue-700 border-blue-500/20" },
  PARTIAL_REPAID: { label: "Partially Repaid", icon: CircleDollarSign, color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  OVERDUE: { label: "Overdue", icon: AlertTriangle, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  DEFAULTED: { label: "Defaulted", icon: XCircle, color: "bg-destructive/10 text-destructive border-destructive/20" },
  REJECTED: { label: "Rejected", icon: XCircle, color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  CANCELLED: { label: "Cancelled", icon: Ban, color: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20" },
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

  const SortTh = ({ label, field }: { label: string; field: string }) => (
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
      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Reference</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">User</th>
                <SortTh label="Amount" field="amount" />
                <SortTh label="Applied" field="appliedAt" />
                <SortTh label="Disbursed" field="disbursedAt" />
                <SortTh label="Due Date" field="dueDate" />
                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Status</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan, index) => {
                const key = (loan.status || "PENDING").toUpperCase() as keyof typeof statusConfig;
                const cfg = statusConfig[key] ?? statusConfig.PENDING;
                return (
                  <tr
                    key={loan.id}
                    onClick={() => onLoanClick(loan)}
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-6 py-4 text-sm font-mono font-medium text-foreground">{loan.reference}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-foreground">{loan.user}</p>
                      <p className="text-xs text-muted-foreground">{loan.phone}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">₵{loan.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(loan.appliedAt)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(loan.disbursedAt)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(loan.dueDate)}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={cn("font-medium text-xs", cfg.color)}>{cfg.label}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
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
      <div className="md:hidden space-y-3 w-full min-w-0">
        {loans.map((loan, index) => {
          const key = (loan.status || "PENDING").toUpperCase() as keyof typeof statusConfig;
          const cfg = statusConfig[key] ?? statusConfig.PENDING;
          const StatusIcon = cfg.icon;
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
              className="bg-card rounded-xl p-4 border border-border space-y-3 cursor-pointer active:bg-muted/50 animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 w-full min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center bg-primary/10 border border-primary/20">
                     <span className="text-sm font-bold text-primary">{loan.user ? loan.user.charAt(0).toUpperCase() : "?"}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{loan.user}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{loan.reference} <span className="opacity-50 mx-1">•</span> {loan.phone}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("flex items-center gap-1.5 shrink-0 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border-border/50", cfg.color)}>
                  <StatusIcon className={cn("h-3 w-3", loan.status === "DISBURSING" && "animate-spin")} />
                  {cfg.label}
                </Badge>
              </div>

              {/* Stats Receipt */}
              <div className="bg-muted/30 rounded-xl p-3 border border-border/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Amount</span>
                  <span className="text-sm font-bold text-foreground">₵{loan.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Applied</span>
                  <span className="text-xs font-medium text-foreground">{formatDate(loan.appliedAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Due Date</span>
                  <span className="text-xs font-medium text-foreground">{formatDate(loan.dueDate)}</span>
                </div>
              </div>

              {/* Action row */}
              <div className="pt-1 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {loan.disbursedAt && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate pr-2">
                      <Check className="h-3 w-3 text-green-500 shrink-0" />
                      <span className="truncate">Disbursed {formatDate(loan.disbursedAt)}</span>
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 gap-1.5 px-3 rounded-full shrink-0" onClick={(e) => { e.stopPropagation(); onLoanClick(loan); }}>
                  Details
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

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
  const [showFilters, setShowFilters] = useState(false);

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
    if (currentTab === "all" && statusFilter !== "all") params.status = statusFilter;
    else if (statusForTab) params.status = statusForTab;
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
      l.tenureDays == null ? (l.tenure ?? "N/A") : `${l.tenureDays} days`;

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
      kycStatus: l.user?.kycStatus || l.user?.kyc?.kycStatus || "Unknown",
      selfieUrl: l.user?.selfieUrl || l.user?.kyc?.selfieUrl || "",
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

  const hasExtraFilters = !!(dateFrom || dateTo || statusFilter !== "all");
  const hasFilters = !!(debouncedSearch || hasExtraFilters);

  const clearFilters = () => {
    setSearchInput("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
  };

  // Stat strip config — defined after counts are available
  const statItems = [
    { label: "Pending",      count: pendingCount,      dot: "bg-amber-400",  card: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800",    text: "text-amber-700 dark:text-amber-400" },
    { label: "Awaiting Node",count: awaitingNodeCount, dot: "bg-purple-500", card: "bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800", text: "text-purple-700 dark:text-purple-400" },
    { label: "Active",       count: activeCount,       dot: "bg-green-500",  card: "bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-800",     text: "text-green-700 dark:text-green-400" },
    { label: "Closed",       count: closedCount,       dot: "bg-blue-500",   card: "bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800",         text: "text-blue-700 dark:text-blue-400" },
    { label: "Overdue",      count: overdueCount,      dot: "bg-orange-500", card: "bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800", text: "text-orange-700 dark:text-orange-400" },
    { label: "Defaulted",    count: defaultedCount,    dot: "bg-red-500",    card: "bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800",             text: "text-red-700 dark:text-red-400" },
  ];

  // Page buttons (desktop)
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
  const pageButtons: number[] = [];
  for (let i = startPage; i <= endPage; i++) pageButtons.push(i);

  const STATUS_OPTIONS = [
    { value: "all", label: "All Statuses" },
    { value: "PENDING", label: "Pending" },
    { value: "AWAITING_MANDATE", label: "Awaiting Mandate" },
    { value: "AWAITING_ENDORSEMENT", label: "Awaiting Node" },
    { value: "DISBURSING", label: "Disbursing" },
    { value: "ACTIVE", label: "Active" },
    { value: "PARTIAL_REPAID", label: "Partially Repaid" },
    { value: "OVERDUE", label: "Overdue" },
    { value: "DEFAULTED", label: "Defaulted" },
    { value: "REPAID,CLOSED", label: "Closed" },
    { value: "REJECTED", label: "Rejected" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 w-full min-w-0">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground">Loans</h1>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm hidden sm:block">
              Manage and monitor all loan applications
            </p>
          </div>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            size="sm"
            variant="outline"
            className="shrink-0 h-9 gap-1.5 border-border"
          >
            {isExporting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            <span>Export</span>
          </Button>
        </div>

        {/* ── Stat strip — mobile: grid, desktop: grid ── */}
        {/* Mobile */}
        <div className="sm:hidden w-full">
          <div className="grid grid-cols-3 gap-2 w-full pb-1">
            {statItems.map((s) => (
              <div
                key={s.label}
                className={cn(
                  "w-full rounded-2xl border p-2.5 shadow-sm",
                  s.card,
                )}
              >
                <div className="flex items-center gap-1 mb-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
                  <span className={cn("text-[10px] font-semibold leading-tight line-clamp-1", s.text)}>
                    {s.label}
                  </span>
                </div>
                <p className="text-xl font-bold text-foreground leading-none">{s.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statItems.map((s) => (
            <div key={s.label} className={cn("rounded-xl border p-4 shadow-sm", s.card)}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className={cn("h-2 w-2 rounded-full shrink-0", s.dot)} />
                <span className={cn("text-xs font-semibold", s.text)}>{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.count}</p>
            </div>
          ))}
        </div>

        {/* ── Search + filter toggle (mobile) ─────────────────── */}
        <div className="flex items-center gap-2 w-full min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search reference, name or phone…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-9 bg-card rounded-xl h-10"
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

          {/* Mobile filter toggle */}
          <Button
            variant={hasExtraFilters ? "default" : "outline"}
            size="icon"
            className="sm:hidden h-10 w-10 shrink-0 relative"
            onClick={() => setShowFilters((f) => !f)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {hasExtraFilters && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary border border-background" />
            )}
          </Button>
        </div>

        {/* ── Tabs + desktop status filter ────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full min-w-0">
          <Tabs
            value={currentTab}
            onValueChange={(val) => navigate(val === "all" ? "/loans" : `/loans/${val}`)}
            className="flex-1 w-full min-w-0"
          >
            <TabsList className="bg-muted p-1 grid grid-cols-4 sm:flex sm:flex-nowrap w-full h-auto gap-1">
              {[
                { value: "all",          label: "All" },
                { value: "pending",      label: "Pending" },
                { value: "awaiting-node",label: "Awaiting" },
                { value: "active",       label: "Active" },
                { value: "overdue",      label: "Overdue" },
                { value: "closed",       label: "Closed" },
                { value: "defaulted",    label: "Defaulted" },
              ].map(({ value, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="data-[state=active]:bg-card whitespace-nowrap shrink-0 text-xs sm:text-sm px-3 py-1.5"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Desktop status filter (always visible) */}
          {currentTab === "all" && (
            <div className="hidden sm:flex items-center gap-2 w-[220px] shrink-0">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full rounded-xl bg-card border-border">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* ── Filter panel (mobile: collapsible, desktop: always visible) ── */}
        <div className={cn(
          "flex-col gap-3 p-4 sm:p-0 rounded-xl border border-dashed border-border sm:border-0 sm:rounded-none",
          showFilters ? "flex" : "hidden sm:flex",
        )}>
          {/* Mobile status filter */}
          {currentTab === "all" && (
            <div className="sm:hidden flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 rounded-xl bg-card border-border">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date range */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full min-w-0">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2 shrink-0">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground whitespace-nowrap">Applied:</span>
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground flex-1 sm:flex-none sm:w-36 min-w-0"
                />
                <span className="text-muted-foreground text-sm shrink-0">–</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground flex-1 sm:flex-none sm:w-36 min-w-0"
                />
              </div>
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="shrink-0 text-muted-foreground hover:text-foreground self-start sm:self-auto"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────── */}
        <Tabs value={currentTab} className="w-full min-w-0">
          <TabsContent value={currentTab} className="mt-0 w-full min-w-0">
            <div className="space-y-4 w-full min-w-0">
              <LoansTable
                loans={loans}
                onLoanClick={(loan) => setSelectedLoan(loan)}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />

              {/* ── Pagination ─────────────────────────────────── */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">
                  {isLoading
                    ? "Loading…"
                    : `Showing ${loans.length} of ${totalLoans} loan${totalLoans !== 1 ? "s" : ""}`}
                </p>

                {totalPages > 1 && (
                  <>
                    {/* Mobile */}
                    <div className="flex sm:hidden items-center gap-3">
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground whitespace-nowrap font-medium">
                        {currentPage} / {totalPages}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}>
                        Next
                      </Button>
                    </div>

                    {/* Desktop */}
                    <div className="hidden sm:flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>
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
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}>
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
                  </>
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
