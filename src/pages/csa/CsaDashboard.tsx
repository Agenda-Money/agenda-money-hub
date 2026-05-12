import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, SlidersHorizontal, RefreshCw, AlertTriangle, TrendingUp, Download,
  ChevronDown, ChevronUp, Copy, Phone, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import csaApi from '@/lib/csaApi';
import { LoanCard } from '@/components/csa/LoanCard';
import { LoanDrawer } from '@/components/csa/LoanDrawer';
import { getBucketMeta, formatGHS, BUCKET_ORDER, formatOutcome, outcomeColor } from '@/lib/bucketUtils';
import { useAuth } from '@/contexts/AuthContext';
import { getCsaPerformance } from '@/lib/api';

const NETWORKS = [
  { label: 'MTN', value: 'MTN' },
  { label: 'Telecel', value: 'VODAFONE' },
  { label: 'AirtelTigo', value: 'ARTLTIGO' },
];
const REGIONS = [
  'Greater Accra', 'Ashanti', 'Central', 'Eastern', 'Western', 'Northern',
  'Upper East', 'Upper West', 'Volta', 'Bono', 'Ahafo', 'Bono East', 'Oti',
  'Savannah', 'North East', 'Western North',
];

const downloadCsv = (rows: any[], bucketLabel: string) => {
  const headers = [
    'Customer Name', 'MSISDN', 'Assigned Agent', 'Loan Amount', 'Outstanding',
    'Total Due', 'Disbursement Date', 'Due Date', 'DD Bucket',
    'Last Payment Date', 'Payment Type', 'Last Call Outcome', 'Last Updated Date',
  ];
  const escape = (v: any) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => [
      r.customerName ?? r.user?.fullName ?? '',
      r.msisdn ?? r.userMsisdn ?? '',
      r.assignedAgent ?? r.currentAssignedAgent?.name ?? '',
      r.loanAmount ?? r.principal ?? '',
      (r.totalPayable ?? 0) - (r.amountRepaid ?? 0),
      r.totalDue ?? r.totalPayable ?? '',
      r.disbursedAt ? new Date(r.disbursedAt).toLocaleDateString('en-GB') : '',
      r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-GB') : '',
      r.ddBucket === 0 ? 'DD0' : `DD${r.ddBucket}`,
      r.lastPaymentDate ? new Date(r.lastPaymentDate).toLocaleDateString('en-GB') : '',
      r.lastPaymentType ?? '',
      r.lastCallOutcome ?? r.lastActivity?.outcome ?? '',
      r.lastUpdatedDate
        ? new Date(r.lastUpdatedDate).toLocaleString('en-GB')
        : r.lastActivity?.createdAt
          ? new Date(r.lastActivity.createdAt).toLocaleString('en-GB')
          : '',
    ].map(escape).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `collections-${bucketLabel.replace(/\+/g, 'plus')}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

type SortKey = 'ddBucket' | 'outstanding' | 'dueDate' | 'disbursedAt' | 'lastPaymentDate' | 'amountRepaid';
type SortDir = 'asc' | 'desc';

export default function CsaDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeBucket = searchParams.has('bucket') ? Number(searchParams.get('bucket')) : 15;
  const search = searchParams.get('search') || '';
  const network = searchParams.get('network') || '';
  const region = searchParams.get('region') || '';
  const page = Number(searchParams.get('page')) || 1;

  const setActiveBucket = (b: number) =>
    setSearchParams((prev) => { prev.set('bucket', b.toString()); prev.set('page', '1'); return prev; });
  const setSearch = (s: string) =>
    setSearchParams((prev) => { if (s) prev.set('search', s); else prev.delete('search'); prev.set('page', '1'); return prev; });
  const setNetwork = (n: string) =>
    setSearchParams((prev) => { if (n) prev.set('network', n); else prev.delete('network'); prev.set('page', '1'); return prev; });
  const setRegion = (r: string) =>
    setSearchParams((prev) => { if (r) prev.set('region', r); else prev.delete('region'); prev.set('page', '1'); return prev; });
  const setPage = (updater: number | ((p: number) => number)) =>
    setSearchParams((prev) => {
      const current = Number(prev.get('page')) || 1;
      const next = typeof updater === 'function' ? updater(current) : updater;
      prev.set('page', next.toString());
      return prev;
    });

  const sortKey = (searchParams.get('sortKey') as SortKey) || 'ddBucket';
  const sortDir = (searchParams.get('sortDir') as SortDir) || 'desc';

  const [exporting, setExporting] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  const { data: bucketsData, isLoading: bucketsLoading, refetch: refetchBuckets } = useQuery({
    queryKey: ['csa-buckets'],
    queryFn: () => csaApi.get('/api/csa/collections/buckets').then((r) => r.data),
    refetchInterval: 2 * 60_000,
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['csa-personal-performance', user?.id],
    queryFn: () => getCsaPerformance({ agentId: user?.id, dateFrom: todayStr }),
    enabled: !!user?.id,
  });

  const myPerf = performanceData?.[0] || performanceData;

  const { data: loansData, isLoading: loansLoading, isFetching, refetch: refetchLoans } = useQuery({
    queryKey: ['csa-loans', activeBucket, page, search, network, region],
    queryFn: () =>
      csaApi.get('/api/csa/collections/loans', {
        params: { bucket: activeBucket, page, limit: 20, search: search || undefined, network: network || undefined, region: region || undefined },
      }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const buckets = (bucketsData as any)?.buckets ?? {};
  const loans: any[] = (loansData as any)?.data ?? [];
  const pagination = (loansData as any)?.pagination;

  const handleSort = (key: SortKey) => {
    setSearchParams((prev) => {
      prev.set('sortKey', key);
      prev.set('sortDir', sortKey === key && sortDir === 'desc' ? 'asc' : 'desc');
      return prev;
    }, { replace: true });
  };

  const sortedLoans = useMemo(() => {
    return [...loans].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === 'outstanding') {
        av = (a.totalPayable ?? 0) - (a.amountRepaid ?? 0);
        bv = (b.totalPayable ?? 0) - (b.amountRepaid ?? 0);
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [loans, sortKey, sortDir]);

  // For mobile card view — keep agent grouping
  const groupedLoans = useMemo(() => {
    const groups: Record<string, any[]> = {};
    loans.forEach((loan: any) => {
      const agentName =
        loan.currentAssignedAgent?.name ||
        loan.assignedAgent ||
        loan.user?.onboardingAgent?.name ||
        loan.referredBy?.name ||
        loan.onboardingAgent?.name ||
        loan.user?.referredByNodeCode ||
        'Unassigned';
      if (!groups[agentName]) groups[agentName] = [];
      groups[agentName].push(loan);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [loans]);

  const totalOverdue = BUCKET_ORDER.filter((b) => b > 0).reduce((sum, b) => sum + (buckets[b]?.count ?? 0), 0);
  const totalOutstanding = BUCKET_ORDER.filter((b) => b > 0).reduce((sum, b) => sum + (buckets[b]?.totalOutstanding ?? 0), 0);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await csaApi.get('/api/csa/collections/export', { params: { bucket: activeBucket } });
      const label = getBucketMeta(activeBucket).short.replace(/\s+/g, '');
      downloadCsv(res.data?.data ?? [], label);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Collections Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-semibold text-red-600">{totalOverdue.toLocaleString()}</span> overdue loans ·{' '}
            <span className="font-semibold">{formatGHS(totalOutstanding)}</span> outstanding
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-9 rounded-xl shadow-sm hover:bg-muted transition-all active:scale-95"
            onClick={() => { refetchBuckets(); refetchLoans(); }}
            disabled={isFetching || bucketsLoading}
          >
            <RefreshCw className={cn('h-3.5 w-3.5 transition-transform', (isFetching || bucketsLoading) && 'animate-spin')} />
            {isFetching || bucketsLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            size="sm"
            className="gap-2 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm active:scale-95 transition-all"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Personal Performance Stats */}
      <div className="bg-[#085041] dark:bg-[#063a2f] text-white rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4 border border-[#0F6E56]/30">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-[#9FE1CB]" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9FE1CB]/70">Performance Today</p>
            <p className="text-xs font-bold">My Personal Effectiveness</p>
          </div>
        </div>
        {performanceLoading ? (
          <div className="flex gap-6 animate-pulse">
            <div className="h-4 w-20 bg-white/10 rounded" />
            <div className="h-4 w-20 bg-white/10 rounded" />
            <div className="h-4 w-20 bg-white/10 rounded" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-tighter">Calls made today:</span>
              <span className="text-sm font-black text-white">{myPerf?.totalCallsMade ?? 0}</span>
            </div>
            <div className="flex items-center gap-2 border-l border-white/10 pl-8">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-tighter">Successful collections:</span>
              <span className="text-sm font-black text-white">{myPerf?.successfulCollections ?? 0}</span>
            </div>
            <div className="flex items-center gap-2 border-l border-white/10 pl-8">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-tighter">My conversion rate:</span>
              <span className={cn(
                'text-sm font-black px-2 py-0.5 rounded-lg',
                (myPerf?.conversionRate ?? 0) >= 20 ? 'bg-green-500/20 text-green-400' :
                  (myPerf?.conversionRate ?? 0) >= 10 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400',
              )}>
                {Number(myPerf?.conversionRate ?? 0).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bucket tabs */}
      <div className="flex items-stretch gap-2 mb-2 h-[76px]">
        <CustomBucketPopover onSearch={setActiveBucket} />
        <ScrollArea className="flex-1 whitespace-nowrap rounded-2xl bg-card border border-border/50 shadow-sm p-1">
          <div className="flex w-max space-x-2 px-2 py-1 items-center h-full">
            {!BUCKET_ORDER.includes(activeBucket) && (
              <motion.button
                key={activeBucket}
                className={cn(
                  'relative flex flex-col items-center px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all duration-200 min-w-[72px]',
                  `${getBucketMeta(activeBucket).color} ${getBucketMeta(activeBucket).textColor} border-transparent shadow-md shrink-0`,
                )}
              >
                <span className="font-extrabold text-sm">{getBucketMeta(activeBucket).short}</span>
                <span className="text-[10px] font-semibold mt-0.5 opacity-80">
                  {loansLoading ? '...' : pagination?.total ?? 0}
                </span>
              </motion.button>
            )}
            {BUCKET_ORDER.map((bucket) => {
              const meta = getBucketMeta(bucket);
              const count = buckets[bucket]?.count ?? 0;
              const isActive = activeBucket === bucket;
              return (
                <motion.button
                  key={bucket}
                  onClick={() => setActiveBucket(bucket)}
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  className={cn(
                    'relative flex flex-col items-center px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all duration-200 min-w-[72px]',
                    isActive
                      ? `${meta.color} ${meta.textColor} border-transparent shadow-md`
                      : 'bg-transparent border-border text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <span className="font-extrabold text-sm">{meta.short}</span>
                  {bucketsLoading ? (
                    <span className="text-[10px] opacity-60 mt-0.5">—</span>
                  ) : (
                    <span className={cn('text-[10px] font-semibold mt-0.5', isActive ? 'opacity-80' : count > 0 ? 'text-foreground' : 'opacity-40')}>
                      {count}
                    </span>
                  )}
                  {!isActive && count > 0 && bucket >= 5 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </motion.button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-2" />
        </ScrollArea>
      </div>

      {/* Selected bucket info bar */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeBucket}
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="flex items-center justify-between bg-muted/30 rounded-2xl px-4 py-3 border border-border/50"
        >
          <div className="flex items-center gap-3">
            <div className={cn('w-2.5 h-2.5 rounded-full', getBucketMeta(activeBucket).color)} />
            <div>
              <p className="text-sm font-bold text-foreground">{getBucketMeta(activeBucket).label}</p>
              <p className="text-xs text-muted-foreground">{getBucketMeta(activeBucket).description}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-extrabold text-foreground">
              {(!BUCKET_ORDER.includes(activeBucket) ? pagination?.total ?? 0 : buckets[activeBucket]?.count ?? 0).toLocaleString()} loans
            </p>
            <p className="text-xs text-muted-foreground">
              {!BUCKET_ORDER.includes(activeBucket)
                ? formatGHS(loans.reduce((sum: number, l: any) => sum + (l.totalPayable - l.amountRepaid), 0))
                : formatGHS(buckets[activeBucket]?.totalOutstanding ?? 0)}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone or reference..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10 h-10 rounded-xl"
          />
        </div>
        <Select value={network} onValueChange={(v) => { setNetwork(v === 'ALL' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[140px] h-10 rounded-xl">
            <SelectValue placeholder="Network" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Networks</SelectItem>
            {NETWORKS.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={region} onValueChange={(v) => { setRegion(v === 'ALL' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-xl">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Regions</SelectItem>
            {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Loan display */}
      {loansLoading ? (
        <>
          {/* Desktop skeleton */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-border/50 bg-card shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {['Borrower', 'Phone', 'Bucket', 'Disbursed', 'Due Date', 'Outstanding', 'Repaid', 'Last Payment', 'Pay Type', 'OD Days', 'Region', 'Last Activity', 'Agent', 'Action'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    {Array(14).fill(null).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <Skeleton className="h-4 w-20 rounded" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile skeleton */}
          <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <Skeleton className="h-5 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-lg" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </>
      ) : loans.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-muted-foreground opacity-40" />
          </div>
          <p className="text-base font-semibold text-foreground">No loans in this bucket</p>
          <p className="text-sm text-muted-foreground mt-1">Try another bucket or clear your filters</p>
        </motion.div>
      ) : (
        <>
          {/* Desktop table */}
          <div className={cn('hidden md:block', isFetching && 'opacity-60 pointer-events-none transition-opacity')}>
            <LoanTable
              loans={sortedLoans}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              onOpenLoan={setSelectedLoanId}
            />
          </div>

          {/* Mobile card grid — keep agent grouping */}
          <div className={cn('md:hidden space-y-2', isFetching && 'opacity-60 pointer-events-none transition-opacity')}>
            {groupedLoans.map(([agentName, agentLoans]) => (
              <AgentLoanGroup
                key={agentName}
                agentName={agentName}
                loans={agentLoans}
                onOpenLoan={setSelectedLoanId}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-xl" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" className="rounded-xl" disabled={!pagination?.hasNextPage} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      <LoanDrawer loanId={selectedLoanId} onClose={() => setSelectedLoanId(null)} />
    </div>
  );
}

// ── Desktop table ─────────────────────────────────────────────────────────────

const SORTABLE_COLS: { key: SortKey; label: string }[] = [
  { key: 'ddBucket', label: 'OD Days' },
  { key: 'outstanding', label: 'Outstanding' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'disbursedAt', label: 'Disbursed' },
  { key: 'lastPaymentDate', label: 'Last Payment' },
  { key: 'amountRepaid', label: 'Repaid' },
];

function SortIcon({ colKey, sortKey, sortDir }: { colKey: string; sortKey: string; sortDir: SortDir }) {
  if (colKey !== sortKey) return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />;
  return sortDir === 'asc'
    ? <ArrowUp className="h-3 w-3 ml-1 inline text-primary" />
    : <ArrowDown className="h-3 w-3 ml-1 inline text-primary" />;
}

function paymentTypeBadge(type: string | null) {
  if (!type) return <span className="text-muted-foreground text-[10px]">None</span>;
  const cls = type === 'full'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-amber-100 text-amber-700 border-amber-200';
  return <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize', cls)}>{type}</span>;
}

function LoanTable({
  loans, sortKey, sortDir, onSort, onOpenLoan,
}: {
  loans: any[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  onOpenLoan: (id: string) => void;
}) {
  const copyPhone = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    toast.success('Copied');
  };

  const isSortable = (key: string): key is SortKey => SORTABLE_COLS.some((c) => c.key === key);

  const thCls = (key?: string) => cn(
    'px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap select-none',
    key && isSortable(key) && 'cursor-pointer hover:text-foreground transition-colors',
    key && key === sortKey && 'text-primary',
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/50 bg-card shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            <th className={cn(thCls(), 'sticky left-0 z-20 bg-muted border-r border-border/40')}>Borrower</th>
            <th className={thCls()}>Phone</th>
            <th className={thCls('ddBucket')} onClick={() => onSort('ddBucket')}>
              Bucket <SortIcon colKey="ddBucket" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className={thCls('disbursedAt')} onClick={() => onSort('disbursedAt')}>
              Disbursed <SortIcon colKey="disbursedAt" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className={thCls('dueDate')} onClick={() => onSort('dueDate')}>
              Due Date <SortIcon colKey="dueDate" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className={thCls('outstanding')} onClick={() => onSort('outstanding')}>
              Outstanding <SortIcon colKey="outstanding" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className={thCls('amountRepaid')} onClick={() => onSort('amountRepaid')}>
              Repaid <SortIcon colKey="amountRepaid" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className={thCls('lastPaymentDate')} onClick={() => onSort('lastPaymentDate')}>
              Last Payment <SortIcon colKey="lastPaymentDate" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className={thCls()}>Pay Type</th>
            <th className={thCls()}>OD Days</th>
            <th className={thCls()}>Region</th>
            <th className={thCls()}>Last Activity</th>
            <th className={thCls()}>Agent</th>
            <th className={thCls()}>Action</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan: any) => {
            const meta = getBucketMeta(loan.ddBucket);
            const outstanding = (loan.totalPayable ?? 0) - (loan.amountRepaid ?? 0);
            const name = loan.user?.fullName ?? loan.userMsisdn;
            const agentName =
              loan.currentAssignedAgent?.name ||
              loan.assignedAgent ||
              loan.user?.onboardingAgent?.name ||
              loan.referredBy?.name ||
              loan.onboardingAgent?.name ||
              loan.user?.referredByNodeCode ||
              '—';

            return (
              <tr
                key={loan.loanId}
                onClick={() => onOpenLoan(loan.loanId)}
                className="border-b border-border/30 cursor-pointer hover:bg-muted/40 transition-colors group"
              >
                {/* Borrower */}
                <td className="sticky left-0 z-10 bg-card group-hover:bg-accent border-r border-border/40 px-3 py-2.5 min-w-[140px] transition-colors">
                  <p className="font-semibold text-foreground truncate max-w-[160px] group-hover:text-primary transition-colors">{name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{loan.loanReference}</p>
                </td>

                {/* Phone */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-foreground">{loan.userMsisdn}</span>
                    <button
                      onClick={(e) => copyPhone(e, loan.userMsisdn)}
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </td>

                {/* Bucket badge */}
                <td className="px-3 py-2.5">
                  <span className={cn('text-[10px] font-extrabold px-2.5 py-1 rounded-full border whitespace-nowrap', meta.badgeBg)}>
                    {meta.label}
                  </span>
                </td>

                {/* Disbursed */}
                <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                  {loan.disbursedAt ? format(new Date(loan.disbursedAt), 'dd MMM yy') : '—'}
                </td>

                {/* Due Date */}
                <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                  {loan.dueDate ? format(new Date(loan.dueDate), 'dd MMM yy') : '—'}
                </td>

                {/* Outstanding */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="text-sm font-bold text-primary">{formatGHS(outstanding)}</span>
                </td>

                {/* Amount Repaid */}
                <td className="px-3 py-2.5 whitespace-nowrap text-xs text-emerald-600 font-semibold">
                  {loan.amountRepaid > 0 ? formatGHS(loan.amountRepaid) : '—'}
                </td>

                {/* Last Payment Date */}
                <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                  {loan.lastPaymentDate ? format(new Date(loan.lastPaymentDate), 'dd MMM yy') : '—'}
                </td>

                {/* Payment Type */}
                <td className="px-3 py-2.5">{paymentTypeBadge(loan.lastPaymentType)}</td>

                {/* OD Days */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {loan.ddBucket > 0 ? (
                    <span className={cn('text-xs font-bold', loan.ddBucket >= 5 ? 'text-red-600' : 'text-amber-600')}>
                      {loan.ddBucket}d
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>

                {/* Region */}
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {loan.user?.region ?? '—'}
                </td>

                {/* Last Activity */}
                <td className="px-3 py-2.5 min-w-[140px]">
                  {loan.lastActivity ? (
                    <div>
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', outcomeColor(loan.lastActivity.outcome))}>
                        {formatOutcome(loan.lastActivity.outcome)}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(loan.lastActivity.createdAt), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic">No contact</span>
                  )}
                </td>

                {/* Agent */}
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap min-w-[160px] max-w-[200px]">
                  <span className="truncate block">{agentName}</span>
                </td>

                {/* Action */}
                <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { window.location.href = `tel:${loan.userMsisdn}`; onOpenLoan(loan.loanId); }}
                      className="flex items-center gap-1 text-[10px] font-bold text-white bg-pink-600 hover:bg-pink-700 px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
                    >
                      <Phone className="h-3 w-3" />
                      Call
                    </button>
                    <button
                      onClick={() => onOpenLoan(loan.loanId)}
                      className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Mobile card group ─────────────────────────────────────────────────────────

function AgentLoanGroup({ agentName, loans, onOpenLoan }: { agentName: string; loans: any[]; onOpenLoan: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="space-y-3 mb-6 bg-card/50 p-2 rounded-2xl border border-border/50">
      <div
        className="flex items-center justify-between bg-muted/60 p-3 rounded-xl cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-foreground text-sm">{agentName}</h3>
          <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{loans.length}</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 pb-2">
              {loans.map((loan: any, i: number) => (
                <LoanCard key={loan.loanId} loan={loan} onOpen={onOpenLoan} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Custom bucket popover ─────────────────────────────────────────────────────

function CustomBucketPopover({ onSearch }: { onSearch: (bucket: number) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'overdue' | 'upcoming'>('overdue');
  const [days, setDays] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!days) return;
    const num = Number(days);
    const bucket = mode === 'overdue' ? Math.abs(num) : -Math.abs(num);
    onSearch(bucket);
    setOpen(false);
    setDays('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-full rounded-2xl border-dashed border-2 px-6 flex flex-col items-center justify-center shrink-0 min-h-[68px] min-w-[90px] hover:bg-muted/50 transition-colors bg-transparent border-primary/40 text-primary">
          <SlidersHorizontal className="h-4 w-4 mb-1" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Custom</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 rounded-2xl" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-sm text-foreground">Custom Range</h4>
            <p className="text-xs text-muted-foreground">Search for a specific day</p>
          </div>
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-9 rounded-xl">
              <TabsTrigger value="overdue" className="text-xs rounded-lg">Overdue</TabsTrigger>
              <TabsTrigger value="upcoming" className="text-xs rounded-lg">Upcoming</TabsTrigger>
            </TabsList>
          </Tabs>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="number"
                min="0"
                placeholder="e.g. 20"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="h-9 rounded-xl pr-10 text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">days</span>
            </div>
            <Button type="submit" size="sm" className="h-9 rounded-xl bg-primary text-primary-foreground font-bold shrink-0 px-4">
              Go
            </Button>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}
