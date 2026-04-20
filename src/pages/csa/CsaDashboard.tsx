import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import csaApi from '@/lib/csaApi';
import { LoanCard } from '@/components/csa/LoanCard';
import { LoanDrawer } from '@/components/csa/LoanDrawer';
import { getBucketMeta, formatGHS, BUCKET_ORDER } from '@/lib/bucketUtils';

const NETWORKS = [
  { label: 'MTN', value: 'MTN' },
  { label: 'Telecel', value: 'VODAFONE' },
  { label: 'AirtelTigo', value: 'ARTLTIGO' },
];
const REGIONS = ['Greater Accra', 'Ashanti', 'Central', 'Eastern', 'Western', 'Northern', 'Upper East', 'Upper West', 'Volta', 'Bono', 'Ahafo', 'Bono East', 'Oti', 'Savannah', 'North East', 'Western North'];

export default function CsaDashboard() {
  const [activeBucket, setActiveBucket] = useState<number>(8);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [network, setNetwork] = useState('');
  const [region, setRegion] = useState('');
  const [page, setPage] = useState(1);

  const { data: bucketsData, isLoading: bucketsLoading, refetch: refetchBuckets } = useQuery({
    queryKey: ['csa-buckets'],
    queryFn: () => csaApi.get('/api/csa/collections/buckets').then((r) => r.data),
    refetchInterval: 2 * 60_000,
  });

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

  const totalOverdue = BUCKET_ORDER.filter(b => b > 0).reduce((sum, b) => sum + (buckets[b]?.count ?? 0), 0);
  const totalOutstanding = BUCKET_ORDER.filter(b => b > 0).reduce((sum, b) => sum + (buckets[b]?.totalOutstanding ?? 0), 0);

  const handleBucketChange = (b: number) => {
    setActiveBucket(b);
    setPage(1);
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
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 self-start h-9 rounded-xl shadow-sm hover:bg-muted transition-all active:scale-95" 
          onClick={() => { refetchBuckets(); refetchLoans(); }}
          disabled={isFetching || bucketsLoading}
        >
          <RefreshCw className={cn("h-3.5 w-3.5 transition-transform", (isFetching || bucketsLoading) && "animate-spin")} />
          {isFetching || bucketsLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Bucket tabs */}
      <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="flex gap-2 pb-2 min-w-max">
          {BUCKET_ORDER.map((bucket) => {
            const meta = getBucketMeta(bucket);
            const count = buckets[bucket]?.count ?? 0;
            const isActive = activeBucket === bucket;

            return (
              <motion.button
                key={bucket}
                onClick={() => handleBucketChange(bucket)}
                whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                className={cn(
                  'relative flex flex-col items-center px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all duration-200 min-w-[72px]',
                  isActive
                    ? `${meta.color} ${meta.textColor} border-transparent shadow-md`
                    : 'bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground',
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
            <p className="text-sm font-extrabold text-foreground">{(buckets[activeBucket]?.count ?? 0).toLocaleString()} loans</p>
            <p className="text-xs text-muted-foreground">{formatGHS(buckets[activeBucket]?.totalOutstanding ?? 0)}</p>
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
          <div className={cn('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4', isFetching && 'opacity-60 pointer-events-none transition-opacity')}>
            {loans.map((loan: any, i: number) => (
              <LoanCard key={loan.loanId} loan={loan} onOpen={setSelectedLoanId} index={i} />
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
                <Button variant="outline" size="sm" className="rounded-xl" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Loan drawer */}
      <LoanDrawer loanId={selectedLoanId} onClose={() => setSelectedLoanId(null)} />
    </div>
  );
}
