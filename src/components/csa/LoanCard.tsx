import { motion } from 'framer-motion';
import { Phone, MapPin, Wifi, UserCheck, MessageSquare, PhoneCall } from 'lucide-react';
import { differenceInDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { getBucketMeta, formatGHS, formatOutcome, outcomeColor, formatNetwork } from '@/lib/bucketUtils';
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
    user: { 
      fullName: string; 
      region: string; 
      onboardingAgent?: { name: string }; 
      referredByNodeCode?: string;
      isRepeatBorrower?: boolean 
    } | null;
    onboardingAgent?: { name: string };
    referredBy?: { name: string; code?: string };
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

  // Agent attribution fallback logic
  const agentName = 
    loan.user?.onboardingAgent?.name || 
    loan.referredBy?.name || 
    loan.onboardingAgent?.name || 
    loan.user?.referredByNodeCode;

  let exactDaysOverdue = loan.ddBucket;
  if (loan.ddBucket >= 8 && loan.dueDate) {
    const today = startOfDay(new Date());
    const due = startOfDay(new Date(loan.dueDate));
    const diff = differenceInDays(today, due);
    if (diff > 8) exactDaysOverdue = diff;
  }

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
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={cn(
              'text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-wider',
              meta.badgeBg,
            )}>
              {meta.label}
            </span>
            {agentName && (
              <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-bold border-[#378ADD]/20 bg-[#378ADD]/5 text-[#378ADD] whitespace-nowrap">
                {agentName}
              </Badge>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="bg-muted/40 rounded-xl px-3 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Outstanding</p>
            <p className="text-base font-extrabold text-foreground">{formatGHS(outstanding)}</p>
          </div>
          {loan.amountRepaid > 0 && (
            <div className="text-left px-2 border-l border-border/50 ml-2">
              <p className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold">Repaid</p>
              <p className="text-[13px] font-bold text-emerald-700">{formatGHS(loan.amountRepaid)}</p>
            </div>
          )}
          {loan.ddBucket > 0 && (
            <div className="text-right flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Overdue</p>
              <p className={cn('text-sm font-bold', loan.ddBucket >= 5 ? 'text-red-600' : 'text-amber-600')}>
                {exactDaysOverdue > 8 ? `${exactDaysOverdue} days` : loan.ddBucket >= 8 ? '8+ days' : `${loan.ddBucket} day${loan.ddBucket > 1 ? 's' : ''}`}
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
            <Wifi className="h-3 w-3" />{formatNetwork(loan.network, loan.userMsisdn)}
          </span>
          {loan.guarantorName && (
            <span className="flex items-center gap-1">
              <UserCheck className="h-3 w-3" />{loan.guarantorName}
              {loan.guarantorMsisdn && <span className="text-muted-foreground/70">· {loan.guarantorMsisdn}</span>}
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
            className="flex-1 h-8 text-[11px] font-black uppercase tracking-widest rounded-lg bg-pink-600 hover:bg-pink-700 shadow-sm"
            onClick={() => {
              window.location.href = `tel:${loan.userMsisdn}`;
              onOpen(loan.loanId);
            }}
          >
            <PhoneCall className="h-3 w-3 mr-1.5" />
            Call
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-[11px] font-black uppercase tracking-widest rounded-lg border-border"
            onClick={() => onOpen(loan.loanId)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
