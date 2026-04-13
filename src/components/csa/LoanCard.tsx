import { motion } from 'framer-motion';
import { Phone, MapPin, Wifi, UserCheck, MessageSquare, PhoneCall } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBucketMeta, formatGHS, formatOutcome, outcomeColor } from '@/lib/bucketUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface LoanCardProps {
  loan: {
    loanId: string;
    loanReference: string;
    userMsisdn: string;
    network: string;
    totalPayable: number;
    amountRepaid: number;
    dueDate: string;
    ddBucket: number;
    status: string;
    guarantorName: string | null;
    guarantorMsisdn: string | null;
    user: { fullName: string; region: string } | null;
    lastActivity: { outcome: string; createdAt: string; csaName: string } | null;
  };
  onOpen: (loanId: string) => void;
  index: number;
}

export function LoanCard({ loan, onOpen, index }: LoanCardProps) {
  const meta = getBucketMeta(loan.ddBucket);
  const outstanding = loan.totalPayable - loan.amountRepaid;
  const name = loan.user?.fullName ?? loan.userMsisdn;
  const region = loan.user?.region;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer group"
      onClick={() => onOpen(loan.loanId)}
    >
      {/* Severity stripe */}
      <div className={cn('h-1.5 w-full', meta.color)} />

      <div className="p-4 space-y-3">
        {/* Top row: name + bucket badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground truncate text-[15px] group-hover:text-primary transition-colors">
              {name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{loan.userMsisdn}</span>
            </div>
          </div>
          <span className={cn(
            'shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-wider',
            meta.badgeBg,
          )}>
            {meta.label}
          </span>
        </div>

        {/* Amount */}
        <div className="bg-muted/40 rounded-xl px-3 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Outstanding</p>
            <p className="text-base font-extrabold text-foreground">{formatGHS(outstanding)}</p>
          </div>
          {loan.ddBucket > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Overdue</p>
              <p className={cn('text-sm font-bold', loan.ddBucket >= 5 ? 'text-red-600' : 'text-amber-600')}>
                {loan.ddBucket >= 8 ? '8+ days' : `${loan.ddBucket} day${loan.ddBucket > 1 ? 's' : ''}`}
              </p>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {region && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />{region}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Wifi className="h-3 w-3" />{loan.network}
          </span>
          {loan.guarantorName && (
            <span className="flex items-center gap-1">
              <UserCheck className="h-3 w-3" />{loan.guarantorName}
            </span>
          )}
        </div>

        {/* Last activity */}
        {loan.lastActivity ? (
          <div className="flex items-center gap-2 pt-0.5">
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', outcomeColor(loan.lastActivity.outcome))}>
              {formatOutcome(loan.lastActivity.outcome)}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              by {loan.lastActivity.csaName}
            </span>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic pt-0.5">No contact yet</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            className="flex-1 h-8 text-xs font-semibold rounded-lg"
            onClick={() => onOpen(loan.loanId)}
          >
            <PhoneCall className="h-3.5 w-3.5 mr-1.5" />
            Log Call
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs rounded-lg"
            onClick={() => onOpen(loan.loanId)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
