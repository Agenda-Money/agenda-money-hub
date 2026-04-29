import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Phone, Send, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import csaApi from '@/lib/csaApi';
import { formatOutcome, outcomeColor } from '@/lib/bucketUtils';

export default function CsaActivityPage() {
  const { data: statsData } = useQuery({
    queryKey: ['csa-me-stats'],
    queryFn: () => csaApi.get('/api/csa/collections/stats/me').then((r) => r.data),
    staleTime: 30_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['csa-my-activities'],
    queryFn: () => csaApi.get('/api/csa/collections/my-activities').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const activities = data?.activities ?? [];
  const stats = statsData?.today;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">My Activity</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Today's call log</p>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Calls Logged", value: stats?.callsLogged ?? 0, icon: Phone, color: 'text-primary' },
          { label: "SMS Sent", value: stats?.smsSent ?? 0, icon: Send, color: 'text-sky-600' },
          { label: "Promises Made", value: stats?.promisesMade ?? 0, icon: Clock, color: 'text-blue-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 text-center">
            <Icon className={cn('h-5 w-5 mx-auto mb-1', color)} />
            <p className="text-2xl font-extrabold text-foreground">{value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Activity list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Phone className="h-10 w-10 text-muted-foreground opacity-30 mb-3" />
          <p className="text-base font-semibold text-foreground">No calls logged yet today</p>
          <p className="text-sm text-muted-foreground mt-1">Start logging calls from the Collections dashboard</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((a: any, i: number) => (
            <motion.div
              key={a._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-2xl p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('text-[10px] font-bold px-2.5 py-0.5 rounded-full border', outcomeColor(a.outcome))}>
                    {formatOutcome(a.outcome)}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">{a.contactTarget}</span>
                  {a.smsSent && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-sky-600">
                      <Send className="h-3 w-3" />SMS
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(a.createdAt), 'HH:mm')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">{a.loanReference}</span>
                <span>{a.userMsisdn}</span>
              </div>
              {a.note && (
                <p className="text-xs text-muted-foreground border-l-2 border-border pl-2 italic">{a.note}</p>
              )}
              {a.promisedPaymentDate && (
                <p className="text-xs font-medium text-blue-600">
                  Promised: {format(new Date(a.promisedPaymentDate), 'dd MMM yyyy')}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
