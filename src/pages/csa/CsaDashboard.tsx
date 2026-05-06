import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, RefreshCw, AlertTriangle, TrendingUp, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import csaApi from '@/lib/csaApi';
import { LoanCard } from '@/components/csa/LoanCard';
import { LoanDrawer } from '@/components/csa/LoanDrawer';
import { getBucketMeta, formatGHS, BUCKET_ORDER } from '@/lib/bucketUtils';
import { useAuth } from '@/contexts/AuthContext';
import { getCsaPerformance } from '@/lib/api';
import { format } from 'date-fns';

const NETWORKS = [
  { label: 'MTN', value: 'MTN' },
  { label: 'Telecel', value: 'VODAFONE' },
  { label: 'AirtelTigo', value: 'ARTLTIGO' },
];
const REGIONS = ['Greater Accra', 'Ashanti', 'Central', 'Eastern', 'Western', 'Northern', 'Upper East', 'Upper West', 'Volta', 'Bono', 'Ahafo', 'Bono East', 'Oti', 'Savannah', 'North East', 'Western North'];

const downloadCsv = (rows: any[], bucketLabel: string) => {
  const headers = ['Customer Name', 'MSISDN', 'Assigned Agent', 'Loan Amount', 'Outstanding', 'Total Due', 'Due Date', 'DD Bucket', 'Last Call Outcome', 'Last Updated Date'];
  const escape = (v: any) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => [
      r.customerName,
      r.msisdn,
      r.assignedAgent ?? r.agentName ?? '',
      r.loanAmount,
      r.outstanding ?? '',
      r.totalDue,
      r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-GB') : '',
      r.ddBucket === 0 ? 'DD0' : `DD${r.ddBucket}`,
      r.lastCallOutcome ?? '',
      r.lastUpdatedDate ? new Date(r.lastUpdatedDate).toLocaleString('en-GB') : ''
    ].map(escape).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `collections-${bucketLabel}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export default function CsaDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeBucket = searchParams.has('bucket') ? Number(searchParams.get('bucket')) : 15;
  const search = searchParams.get('search') || '';
  const network = searchParams.get('network') || '';
  const region = searchParams.get('region') || '';
  const page = Number(searchParams.get('page')) || 1;

  const setActiveBucket = (b: number) => {
    setSearchParams(prev => { prev.set('bucket', b.toString()); prev.set('page', '1'); return prev; });
  };
  const setSearch = (s: string) => {
    setSearchParams(prev => { if (s) prev.set('search', s); else prev.delete('search'); prev.set('page', '1'); return prev; });
  };
  const setNetwork = (n: string) => {
    setSearchParams(prev => { if (n) prev.set('network', n); else prev.delete('network'); prev.set('page', '1'); return prev; });
  };
  const setRegion = (r: string) => {
    setSearchParams(prev => { if (r) prev.set('region', r); else prev.delete('region'); prev.set('page', '1'); return prev; });
  };
  const setPage = (updater: number | ((p: number) => number)) => {
    setSearchParams(prev => {
      const current = Number(prev.get('page')) || 1;
      const next = typeof updater === 'function' ? updater(current) : updater;
      prev.set('page', next.toString());
      return prev;
    });
  };

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
    enabled: !!user?.id
  });

  const myPerf = performanceData?.[0] || performanceData; // Backend might return array or single object

  const { data: loansData, isLoading: loansLoading, isFetching, refetch: refetchLoans } = useQuery({
    queryKey: ['csa-loans', activeBucket, page, search, network, region],
    queryFn: () => csaApi.get('/api/csa/collections/loans', {
      params: { bucket: activeBucket, page, limit: 18, search: search || undefined, network: network || undefined, region: region || undefined },
    }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const buckets = (bucketsData as any)?.buckets ?? {};
  const loans = (loansData as any)?.data ?? [];
  const pagination = (loansData as any)?.pagination;

  const groupedLoans = useMemo(() => {
    const groups: Record<string, any[]> = {};
    loans.forEach((loan: any) => {
      const agentName = 
        loan.currentAssignedAgent?.fullName ||
        loan.currentAssignedAgent?.agentName ||
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

  const totalOverdue = BUCKET_ORDER.filter(b => b > 0).reduce((sum, b) => sum + (buckets[b]?.count ?? 0), 0);
  const totalOutstanding = BUCKET_ORDER.filter(b => b > 0).reduce((sum, b) => sum + (buckets[b]?.totalOutstanding ?? 0), 0);



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
            <span className="font-semibold text-red-600">{totalOverdue.toLocaleString()}</span> overdue loans · <span className="font-semibold">{formatGHS(totalOutstanding)}</span> outstanding
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
            <RefreshCw className={cn("h-3.5 w-3.5 transition-transform", (isFetching || bucketsLoading) && "animate-spin")} />
            {isFetching || bucketsLoading ? "Refreshing..." : "Refresh"}
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
               <span className={cn("text-sm font-black px-2 py-0.5 rounded-lg", 
                  (myPerf?.conversionRate ?? 0) >= 20 ? "bg-green-500/20 text-green-400" :
                  (myPerf?.conversionRate ?? 0) >= 10 ? "bg-amber-500/20 text-amber-400" :
                  "bg-red-500/20 text-red-400"
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
                `${getBucketMeta(activeBucket).color} ${getBucketMeta(activeBucket).textColor} border-transparent shadow-md shrink-0`
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

      {/* Loan grid */}
      {loansLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <Skeleton className="h-5 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
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
          <div className="space-y-2">
            {groupedLoans.map(([agentName, agentLoans]) => (
              <AgentLoanGroup 
                key={agentName} 
                agentName={agentName} 
                loans={agentLoans} 
                onOpenLoan={setSelectedLoanId} 
                isFetching={isFetching} 
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Showing {((page - 1) * 18) + 1}–{Math.min(page * 18, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-xl" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" className="rounded-xl" disabled={!pagination?.hasNextPage} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Loan drawer */}
      <LoanDrawer 
        loanId={selectedLoanId} 
        onClose={() => setSelectedLoanId(null)} 
      />
    </div>
  );
}

function AgentLoanGroup({ agentName, loans, onOpenLoan, isFetching }: { agentName: string, loans: any[], onOpenLoan: (id: string) => void, isFetching: boolean }) {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <div className="space-y-3 mb-6 bg-card/50 p-2 rounded-2xl border border-border/50">
      <div 
        className="flex items-center justify-between bg-muted/60 p-3 rounded-xl cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-foreground text-sm">{agentName}</h3>
          <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
            {loans.length}
          </span>
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
            <div className={cn('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pt-1 pb-2', isFetching && 'opacity-60 pointer-events-none transition-opacity')}>
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
