import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { getCsaBuckets, getCsaLoans, exportCsaLoans } from "@/lib/api";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Search, ChevronDown, ChevronRight, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BucketSummary {
  count: number;
  totalOutstanding: number;
  lastInteractedAt: string | null;
}

interface LoanRow {
  loanId: string;
  loanReference: string;
  userMsisdn: string;
  network: string;
  principal: number;
  totalPayable: number;
  amountRepaid: number;
  dueDate: string;
  ddBucket: number;
  status: string;
  guarantorName: string | null;
  guarantorMsisdn: string | null;
  currentAssignedAgent: { id: string; name: string } | null;
  user: {
    fullName: string;
    region: string;
    address: string;
    employmentStatus: string;
    monthlyIncome: number;
  } | null;
  lastActivity: {
    outcome: string;
    createdAt: string;
    note?: string;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bucketLabel(bucket: number): string {
  if (bucket === 15) return "DD+15+";
  if (bucket > 0) return `DD+${bucket}`;
  if (bucket === 0) return "DD";
  return `DD${bucket}`;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatCurrency(amount: number): string {
  return `₵${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatOutcomeLabel(outcome: string | null): string {
  if (!outcome) return "—";
  return outcome
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function groupByAgent(loans: LoanRow[]): Map<string, LoanRow[]> {
  const map = new Map<string, LoanRow[]>();
  for (const loan of loans) {
    const key = loan.currentAssignedAgent?.name ?? "Unassigned";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(loan);
  }
  // Sort: alphabetically by agent name, Unassigned last
  return new Map(
    [...map.entries()].sort(([a], [b]) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    })
  );
}

function downloadCSV(rows: any[], filename: string) {
  const headers = [
    "Customer Name",
    "Phone",
    "Assigned Agent",
    "Loan Amount",
    "Total Due",
    "Outstanding",
    "Due Date",
    "DD Bucket",
    "Last Call Outcome",
    "Last Updated Date",
  ];

  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        escape(r.customerName),
        escape(r.msisdn),
        escape(r.assignedAgent),
        escape(r.loanAmount),
        escape(r.totalDue),
        escape(r.outstanding),
        escape(r.dueDate ? new Date(r.dueDate).toLocaleDateString("en-GB") : ""),
        escape(r.ddBucket),
        escape(formatOutcomeLabel(r.lastCallOutcome)),
        escape(
          r.lastUpdatedDate
            ? new Date(r.lastUpdatedDate).toLocaleString("en-GB")
            : ""
        ),
      ].join(",")
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const OVERDUE_BUCKETS = Array.from({ length: 15 }, (_, i) => i + 1);

function BucketCard({
  bucket,
  summary,
  isSelected,
  onClick,
}: {
  bucket: number;
  summary?: BucketSummary;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isOverdue = bucket > 0;
  const isCatchAll = bucket === 15;

  const borderColor = isSelected
    ? "border-primary"
    : isOverdue
      ? bucket >= 10
        ? "border-destructive/60"
        : "border-orange-400/60"
      : "border-border";

  const bgColor = isSelected
    ? "bg-primary/10"
    : isOverdue
      ? bucket >= 10
        ? "bg-destructive/5"
        : "bg-orange-50 dark:bg-orange-950/20"
      : "bg-card";

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border-2 p-3 text-left transition-all duration-150 hover:shadow-md w-full",
        bgColor,
        borderColor,
        isSelected && "shadow-md ring-1 ring-primary/30"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            "text-xs font-bold",
            isSelected
              ? "text-primary"
              : isOverdue
                ? bucket >= 10
                  ? "text-destructive"
                  : "text-orange-600 dark:text-orange-400"
                : "text-muted-foreground"
          )}
        >
          {bucketLabel(bucket)}
          {isCatchAll && (
            <span className="ml-0.5 text-[10px]">catch-all</span>
          )}
        </span>
        {(summary?.count ?? 0) > 0 && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] h-4 px-1",
              isOverdue
                ? bucket >= 10
                  ? "border-destructive/40 text-destructive"
                  : "border-orange-400/40 text-orange-600"
                : ""
            )}
          >
            {summary?.count}
          </Badge>
        )}
      </div>
      <p className="text-base font-bold text-foreground tabular-nums">
        {summary?.count ?? 0}
      </p>
      {isOverdue && (
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {summary?.totalOutstanding
            ? formatCurrency(summary.totalOutstanding)
            : "₵0.00"}
        </p>
      )}
      {isOverdue && (
        <div className="flex items-center gap-1 mt-1">
          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(summary?.lastInteractedAt ?? null)}
          </span>
        </div>
      )}
    </button>
  );
}

function LoanRowItem({ loan }: { loan: LoanRow }) {
  const outstanding = (loan.totalPayable ?? 0) - (loan.amountRepaid ?? 0);

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {loan.user?.fullName ?? loan.userMsisdn}
          </p>
          <p className="text-xs text-muted-foreground">{loan.userMsisdn}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground font-mono text-xs">
        {loan.loanReference}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-foreground tabular-nums">
        {formatCurrency(outstanding)}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {loan.dueDate
          ? new Date(loan.dueDate).toLocaleDateString("en-GB")
          : "—"}
      </td>
      <td className="px-4 py-3">
        {loan.lastActivity ? (
          <div>
            <Badge variant="outline" className="text-xs">
              {formatOutcomeLabel(loan.lastActivity.outcome)}
            </Badge>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatRelativeTime(loan.lastActivity.createdAt)}
            </p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No activity</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className="text-xs capitalize">
          {loan.network ?? "—"}
        </Badge>
      </td>
    </tr>
  );
}

function AgentGroup({
  agentName,
  loans,
  defaultOpen,
}: {
  agentName: string;
  loans: LoanRow[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-3">
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              {agentName}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {loans.length} account{loans.length !== 1 ? "s" : ""}
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Customer
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Loan Ref
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Outstanding
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Due Date
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Last Activity
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Network
                </th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <LoanRowItem key={loan.loanId} loan={loan} />
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CsaOverviewPage() {
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [network, setNetwork] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout((window as any).__csaSearchTimer);
    (window as any).__csaSearchTimer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  };

  const { data: bucketsResponse, isLoading: bucketsLoading } = useQuery({
    queryKey: ["csa-buckets"],
    queryFn: getCsaBuckets,
    refetchInterval: 60000,
  });

  const buckets: Record<number, BucketSummary> = bucketsResponse?.buckets ?? {};

  const {
    data: loansResponse,
    isLoading: loansLoading,
    isFetching: loansFetching,
  } = useQuery({
    queryKey: ["csa-loans", selectedBucket, page, debouncedSearch, network, region],
    queryFn: () =>
      getCsaLoans({
        bucket: selectedBucket!,
        page,
        limit: 50,
        search: debouncedSearch || undefined,
        network: network || undefined,
        region: region || undefined,
      }),
    enabled: selectedBucket !== null,
    placeholderData: (prev) => prev,
  });

  const loans: LoanRow[] = loansResponse?.data ?? [];
  const pagination = loansResponse?.pagination;

  const groupedLoans = useMemo(() => groupByAgent(loans), [loans]);

  const handleBucketSelect = (bucket: number) => {
    setSelectedBucket(bucket);
    setPage(1);
    setSearch("");
    setDebouncedSearch("");
    setNetwork("");
    setRegion("");
  };

  const handleExport = async () => {
    if (selectedBucket === null) return;
    setExporting(true);
    try {
      const response = await exportCsaLoans(selectedBucket);
      const rows = response?.data ?? [];
      const label = bucketLabel(selectedBucket).replace(/\+/g, "plus");
      downloadCSV(rows, `csa-export-${label}-${new Date().toISOString().split("T")[0]}.csv`);
    } finally {
      setExporting(false);
    }
  };

  const totalOverdue = Object.entries(buckets)
    .filter(([k]) => Number(k) > 0)
    .reduce((sum, [, v]) => sum + (v.count ?? 0), 0);

  const totalOutstanding = Object.entries(buckets)
    .filter(([k]) => Number(k) > 0)
    .reduce((sum, [, v]) => sum + (v.totalOutstanding ?? 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">CSA Overview</h1>
            <p className="text-muted-foreground mt-1">
              Overdue loan tracking and collection management
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <p className="text-muted-foreground text-xs">Total Overdue</p>
              <p className="font-bold text-lg text-foreground">{totalOverdue.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs">Total Outstanding</p>
              <p className="font-bold text-lg text-destructive">
                {formatCurrency(totalOutstanding)}
              </p>
            </div>
          </div>
        </div>

        {/* Bucket Cards */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Pre-Due
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 mb-4">
            {[-3, -2, -1, 0].map((b) => (
              <BucketCard
                key={b}
                bucket={b}
                summary={buckets[b]}
                isSelected={selectedBucket === b}
                onClick={() => handleBucketSelect(b)}
              />
            ))}
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Overdue — click any bucket to load accounts
          </p>
          {bucketsLoading ? (
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))" }}>
              {OVERDUE_BUCKETS.map((b) => (
                <Skeleton key={b} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))" }}>
              {OVERDUE_BUCKETS.map((b) => (
                <BucketCard
                  key={b}
                  bucket={b}
                  summary={buckets[b]}
                  isSelected={selectedBucket === b}
                  onClick={() => handleBucketSelect(b)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Loan List */}
        {selectedBucket !== null && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {bucketLabel(selectedBucket)} Accounts
                </h2>
                {pagination?.total !== undefined && (
                  <Badge variant="secondary">{pagination.total.toLocaleString()}</Badge>
                )}
                {loansFetching && !loansLoading && (
                  <span className="text-xs text-muted-foreground animate-pulse">
                    Refreshing...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9 h-9 text-sm"
                    placeholder="Search name, phone, ref..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </div>

                <Select value={network} onValueChange={(v) => { setNetwork(v === "all" ? "" : v); setPage(1); }}>
                  <SelectTrigger className="h-9 w-[110px] text-sm">
                    <SelectValue placeholder="Network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Networks</SelectItem>
                    <SelectItem value="MTN">MTN</SelectItem>
                    <SelectItem value="VODAFONE">Vodafone</SelectItem>
                    <SelectItem value="AIRTELTIGO">AirtelTigo</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  <Download className="h-4 w-4" />
                  {exporting ? "Exporting..." : "Export CSV"}
                </Button>
              </div>
            </div>

            {/* Agent-grouped loan list */}
            {loansLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : loans.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <p className="text-muted-foreground">
                  No accounts found in this bucket
                  {debouncedSearch ? " matching your search" : ""}
                </p>
              </div>
            ) : (
              <div>
                {[...groupedLoans.entries()].map(([agentName, agentLoans], index) => (
                  <AgentGroup
                    key={agentName}
                    agentName={agentName}
                    loans={agentLoans}
                    defaultOpen={index === 0}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.pages} &middot;{" "}
                  {pagination.total.toLocaleString()} accounts
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loansFetching}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page >= pagination.pages || loansFetching}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedBucket === null && (
          <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground text-sm">
              Select a bucket above to view accounts
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
