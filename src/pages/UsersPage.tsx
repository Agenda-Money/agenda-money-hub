import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search, Download, UserPlus, ChevronRight, ChevronUp, ChevronDown,
  ChevronsUpDown, X, Ban, CheckCircle, Users, ShieldAlert, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CampaignGenerationModal } from "@/components/users/CampaignGenerationModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminUsers, bulkActionUsers, exportAdminUsers } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface User {
  id: string;
  phone: string;
  name: string;
  tier: string;
  role: string;
  activeLoan: boolean;
  status: "active" | "blocked";
  joinedAt: string;
}

const tierColors: Record<string, string> = {
  L1: "bg-muted text-muted-foreground border-muted",
  L2: "bg-info/10 text-info border-info/20",
  L3: "bg-primary/10 text-primary border-primary/20",
  L4: "bg-success/10 text-success border-success/20",
  L5: "bg-warning/10 text-warning border-warning/20",
  L6: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  L7: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  L8: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  L9: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  L10: "bg-emerald-600 text-white font-bold",
};

type SortField = "joinedAt" | "tier" | "name";
type SortOrder = "asc" | "desc";

function SortIcon({ field, sortBy, sortOrder }: { field: SortField; sortBy: SortField; sortOrder: SortOrder }) {
  if (sortBy !== field) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return sortOrder === "asc"
    ? <ChevronUp className="h-3 w-3 ml-1 text-primary" />
    : <ChevronDown className="h-3 w-3 ml-1 text-primary" />;
}

function StatChip({ label, value, icon, color }: {
  label: string; value: string | number; icon: React.ReactNode; color: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border", color)}>
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</span>
      <span className="text-sm font-black tabular-nums">{value}</span>
    </div>
  );
}

export default function UsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeLoanFilter, setActiveLoanFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortField>("joinedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const [jumpPage, setJumpPage] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to page 1 + clear selection on any filter/sort change
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [debouncedSearch, tierFilter, statusFilter, roleFilter, activeLoanFilter, sortBy, sortOrder]);

  const buildParams = useCallback((overrides?: Record<string, any>) => {
    const params: any = { page, limit: 10, sortBy, sortOrder };
    if (debouncedSearch) params.search = debouncedSearch;
    if (tierFilter !== "all") params.tier = tierFilter.slice(1); // "L4" → "4"
    if (statusFilter !== "all") params.isBlocked = statusFilter === "blocked" ? "true" : "false";
    if (roleFilter !== "all") params.userRole = roleFilter;
    if (activeLoanFilter !== "all") params.hasActiveLoan = activeLoanFilter;
    return { ...params, ...overrides };
  }, [page, debouncedSearch, tierFilter, statusFilter, roleFilter, activeLoanFilter, sortBy, sortOrder]);

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["users", page, debouncedSearch, tierFilter, statusFilter, roleFilter, activeLoanFilter, sortBy, sortOrder],
    queryFn: () => getAdminUsers(buildParams()),
    placeholderData: (prev) => prev,
  });

  // Parallel summary counts (cheap — limit:1)
  const { data: totalData } = useQuery({
    queryKey: ["users-count", "total"],
    queryFn: () => getAdminUsers({ page: 1, limit: 1 }),
    staleTime: 60_000,
  });
  const { data: blockedData } = useQuery({
    queryKey: ["users-count", "blocked"],
    queryFn: () => getAdminUsers({ page: 1, limit: 1, isBlocked: "true" }),
    staleTime: 60_000,
  });
  const { data: activeLoanData } = useQuery({
    queryKey: ["users-count", "activeLoan"],
    queryFn: () => getAdminUsers({ page: 1, limit: 1, hasActiveLoan: "true" }),
    staleTime: 60_000,
  });

  const rawUsers = responseData?.users ?? [];
  const totalPages = responseData?.pagination?.pages ?? 1;
  const totalCount = responseData?.pagination?.total ?? 0;
  const overallTotal = totalData?.pagination?.total ?? 0;
  const blockedCount = blockedData?.pagination?.total ?? 0;
  const activeCount = overallTotal - blockedCount;
  const activeLoanCount = activeLoanData?.pagination?.total ?? 0;

  const users: User[] = rawUsers.map((u: any) => ({
    id: u._id,
    phone: u.msisdn,
    name: u.fullName,
    tier: `L${u.currentTier ?? 1}`,
    role: u.userRole ?? "EDGE",
    activeLoan: Boolean(u.hasActiveLoan),
    status: u.isBlocked ? "blocked" : "active",
    joinedAt: u.createdAt,
  }));

  const hasActiveFilters =
    !!debouncedSearch || tierFilter !== "all" || statusFilter !== "all" ||
    roleFilter !== "all" || activeLoanFilter !== "all";

  const clearFilters = () => {
    setSearchInput("");
    setTierFilter("all");
    setStatusFilter("all");
    setRoleFilter("all");
    setActiveLoanFilter("all");
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortOrder(o => o === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortOrder("desc"); }
  };

  const allSelected = users.length > 0 && users.every(u => selectedIds.has(u.id));
  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(users.map(u => u.id)));
  };
  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bulkMutation = useMutation({
    mutationFn: ({ action, ids }: { action: "block" | "unblock"; ids: string[] }) =>
      bulkActionUsers(action, ids, "Bulk action by admin"),
    onSuccess: (_, { action, ids }) => {
      toast({ title: `${ids.length} user${ids.length !== 1 ? "s" : ""} ${action === "block" ? "blocked" : "unblocked"}` });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users-count"] });
    },
    onError: () => toast({ title: "Bulk action failed", variant: "destructive" }),
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportAdminUsers(buildParams({ page: undefined, limit: undefined }));
      toast({ title: "Export downloaded" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const getVisiblePages = (current: number, total: number): number[] => {
    const count = Math.min(5, total);
    let start = Math.max(1, current - 2);
    if (start + count - 1 > total) start = Math.max(1, total - count + 1);
    return Array.from({ length: count }, (_, i) => start + i);
  };

  const handleJumpPage = () => {
    const n = parseInt(jumpPage, 10);
    if (n >= 1 && n <= totalPages) { setPage(n); setJumpPage(""); }
  };

  const fmtDate = (iso: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-24 lg:pb-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {overallTotal > 0 ? `${overallTotal.toLocaleString()} total users` : "Manage platform users"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button className="bg-primary hover:bg-primary/90 flex-1 sm:flex-none" onClick={() => setIsCampaignModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Campaign
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleExport} disabled={isExporting}>
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting…" : "Export CSV"}
            </Button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="flex flex-wrap gap-2">
          <StatChip label="Total" value={overallTotal.toLocaleString()} icon={<Users className="h-4 w-4" />} color="bg-card border-border text-foreground" />
          <StatChip label="Active" value={activeCount.toLocaleString()} icon={<Activity className="h-4 w-4" />} color="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" />
          <StatChip label="Blocked" value={blockedCount.toLocaleString()} icon={<ShieldAlert className="h-4 w-4" />} color="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300" />
          <StatChip label="Active Loan" value={activeLoanCount.toLocaleString()} icon={<Activity className="h-4 w-4" />} color="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300" />
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl p-3 sm:p-4 shadow-sm border border-border space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or phone…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-[110px] h-10"><SelectValue placeholder="Tier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={`L${n}`}>Tier L{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[110px] h-10"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[110px] h-10"><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="EDGE">Edge</SelectItem>
                  <SelectItem value="NODE">Node</SelectItem>
                </SelectContent>
              </Select>

              <Select value={activeLoanFilter} onValueChange={setActiveLoanFilter}>
                <SelectTrigger className="w-[130px] h-10"><SelectValue placeholder="Loan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Loan</SelectItem>
                  <SelectItem value="true">Has Active Loan</SelectItem>
                  <SelectItem value="false">No Active Loan</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-10 px-3 text-muted-foreground" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>
          {totalCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {totalCount.toLocaleString()} result{totalCount !== 1 ? "s" : ""}{hasActiveFilters ? " matching filters" : ""}
            </p>
          )}
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-primary">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2 ml-auto">
              <Button size="sm" variant="destructive" className="h-8"
                onClick={() => bulkMutation.mutate({ action: "block", ids: Array.from(selectedIds) })}
                disabled={bulkMutation.isPending}>
                <Ban className="h-3.5 w-3.5 mr-1.5" /> Block
              </Button>
              <Button size="sm" variant="outline" className="h-8 border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700"
                onClick={() => bulkMutation.mutate({ action: "unblock", ids: Array.from(selectedIds) })}
                disabled={bulkMutation.isPending}>
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Unblock
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelectedIds(new Set())}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden md:block bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-muted-foreground" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("name")}>
                    <span className="flex items-center">Name / Phone<SortIcon field="name" sortBy={sortBy} sortOrder={sortOrder} /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("tier")}>
                    <span className="flex items-center">Tier<SortIcon field="tier" sortBy={sortBy} sortOrder={sortOrder} /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Active Loan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("joinedAt")}>
                    <span className="flex items-center">Joined<SortIcon field="joinedAt" sortBy={sortBy} sortOrder={sortOrder} /></span>
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-4 rounded bg-muted animate-pulse" style={{ width: j === 1 ? "140px" : "60px" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-sm text-muted-foreground">
                      No users found{hasActiveFilters ? " matching your filters" : ""}
                    </td>
                  </tr>
                ) : users.map((user, index) => (
                  <tr
                    key={user.id}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors duration-100 animate-fade-in cursor-pointer",
                      selectedIds.has(user.id) ? "bg-primary/5" : "hover:bg-muted/40"
                    )}
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(user.id)} onChange={() => toggleOne(user.id)} className="rounded border-muted-foreground" />
                    </td>
                    <td className="px-4 py-3" onClick={() => navigate(`/users/${user.id}`)}>
                      <p className="text-sm font-semibold text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{user.phone}</p>
                    </td>
                    <td className="px-4 py-3" onClick={() => navigate(`/users/${user.id}`)}>
                      <Badge variant="outline" className={cn("text-xs font-bold", tierColors[user.tier] ?? tierColors.L1)}>{user.tier}</Badge>
                    </td>
                    <td className="px-4 py-3" onClick={() => navigate(`/users/${user.id}`)}>
                      <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", user.role === "NODE" ? "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" : "bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800")}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3" onClick={() => navigate(`/users/${user.id}`)}>
                      <Badge variant="outline" className={cn("text-xs font-medium", user.activeLoan ? "bg-info/10 text-info border-info/20" : "bg-muted text-muted-foreground border-muted")}>
                        {user.activeLoan ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3" onClick={() => navigate(`/users/${user.id}`)}>
                      <Badge variant="outline" className={cn("text-xs font-medium capitalize", user.status === "active" ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20")}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap" onClick={() => navigate(`/users/${user.id}`)}>
                      {fmtDate(user.joinedAt)}
                    </td>
                    <td className="px-4 py-3" onClick={() => navigate(`/users/${user.id}`)}>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Desktop Pagination */}
          <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground order-2 sm:order-1">
              Page {page} of {totalPages} · {totalCount.toLocaleString()} result{totalCount !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1.5 order-1 sm:order-2 flex-wrap justify-center">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              {getVisiblePages(page, totalPages).map(n => (
                <Button key={n} size="sm" variant={page === n ? "default" : "outline"} className={page === n ? "bg-primary text-primary-foreground" : ""} onClick={() => setPage(n)}>
                  {n}
                </Button>
              ))}
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              <div className="flex items-center gap-1 ml-1">
                <Input className="w-14 h-8 text-xs text-center px-1" placeholder="Go" value={jumpPage} onChange={e => setJumpPage(e.target.value)} onKeyDown={e => e.key === "Enter" && handleJumpPage()} />
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={handleJumpPage}>Go</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-4 border border-border animate-pulse space-y-3">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="grid grid-cols-3 gap-2">{[1, 2, 3].map(j => <div key={j} className="h-6 rounded bg-muted" />)}</div>
              </div>
            ))
          ) : users.length === 0 ? (
            <p className="text-center py-16 text-sm text-muted-foreground">
              No users found{hasActiveFilters ? " matching your filters" : ""}
            </p>
          ) : users.map(user => (
            <div
              key={user.id}
              onClick={() => navigate(`/users/${user.id}`)}
              className={cn("bg-card rounded-xl p-4 border cursor-pointer transition-colors space-y-3", selectedIds.has(user.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(user.id)}
                    onChange={e => { e.stopPropagation(); toggleOne(user.id); }}
                    onClick={e => e.stopPropagation()}
                    className="rounded border-muted-foreground shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{user.phone}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("shrink-0 text-xs font-medium capitalize", user.status === "active" ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20")}>
                  {user.status}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Tier</p>
                  <Badge variant="outline" className={cn("text-[10px] font-bold w-fit", tierColors[user.tier] ?? tierColors.L1)}>{user.tier}</Badge>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Role</p>
                  <Badge variant="outline" className={cn("text-[10px] font-bold uppercase w-fit", user.role === "NODE" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-sky-50 text-sky-700 border-sky-200")}>{user.role}</Badge>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Active Loan</p>
                  <Badge variant="outline" className={cn("text-[10px] font-medium w-fit", user.activeLoan ? "bg-info/10 text-info border-info/20" : "bg-muted text-muted-foreground border-muted")}>
                    {user.activeLoan ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-[10px] text-muted-foreground">Joined {fmtDate(user.joinedAt)}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))}

          {/* Mobile Pagination */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground tabular-nums">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>

      </div>

      <CampaignGenerationModal open={isCampaignModalOpen} onOpenChange={setIsCampaignModalOpen} />
    </DashboardLayout>
  );
}
