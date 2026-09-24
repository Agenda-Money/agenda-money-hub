import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosInstance } from 'axios';
import { AlertCircle, BadgeCheck, Loader2, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

/**
 * Collections-campaign settlement, shared by the admin loan view and the
 * collections portal.
 *
 * Both surfaces need the same thing and must not drift: the figures here decide
 * how much gets written off, and an agent quoting one number while the system
 * applies another is the failure worth designing against.
 *
 * The panel offers no amount field and no cohort choice. The cohort is derived
 * from the loan's own dates server-side, and the amount from its principal and
 * interest, so settling is a clerical act rather than a financial judgement —
 * which is what makes it safe for a collections agent to do with no admin
 * present. Money has to already be recorded against the loan; agents have no way
 * to record a payment, so cash still has to reach an admin first.
 */

export type SettlementQuote = {
  loanReference: string;
  msisdn: string;
  cohort: 1 | 2;
  daysInDefault: number;
  status: string;
  principal: number;
  interest: number;
  campaignTarget: number;
  alreadyPaid: number;
  outstandingUnderCampaign: number;
  wouldWaive: number;
  currentTier: number;
  tierAfterSettlement: number;
  readyToSettle: boolean;
};

const ghs = (n: number) =>
  `GHS ${Number(n ?? 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COHORT_TERMS: Record<1 | 2, string> = {
  1: 'Penalties waived. Pays principal + interest. Tier unchanged.',
  2: 'Penalties and interest waived. Pays principal only. Drops two tiers.',
};

interface Props {
  loanReference: string;
  /** Either the admin api client or csaApi — whichever the surface is authed as. */
  client: AxiosInstance;
  /** '/api/admin/loans' or '/api/csa/collections/loans'. */
  basePath: string;
  /** Query keys to refresh once a loan is settled. */
  invalidateKeys?: unknown[][];
  onSettled?: () => void;
}

export function CampaignSettlementPanel({
  loanReference,
  client,
  basePath,
  invalidateKeys = [],
  onSettled,
}: Props) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');

  const url = `${basePath}/${encodeURIComponent(loanReference)}/campaign-settlement`;

  const { data, isLoading, error } = useQuery({
    queryKey: ['campaign-settlement', loanReference],
    queryFn: () => client.get(url).then((r) => r.data?.data as SettlementQuote),
    enabled: !!loanReference,
    retry: false,
  });

  const settle = useMutation({
    mutationFn: () => client.post(url, { reason: reason.trim() || undefined }),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? 'Loan settled under the campaign.');
      qc.invalidateQueries({ queryKey: ['campaign-settlement', loanReference] });
      for (const key of invalidateKeys) qc.invalidateQueries({ queryKey: key });
      setReason('');
      onSettled?.();
    },
    // The server refuses for good reasons — short payment, already settled,
    // already closed — and says which. Surfacing its message rather than a
    // generic failure is the difference between an agent knowing to collect
    // another GHS 150 and an agent thinking the system is broken.
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Could not settle this loan.'),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-lg border p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  // A loan with no due date, or already closed, has no campaign position. Say so
  // plainly rather than showing an empty panel.
  if (error || !data) {
    const message =
      (error as any)?.response?.data?.message ??
      'Campaign settlement is not available for this loan.';
    return (
      <div className="flex items-start gap-2 rounded-lg border border-muted bg-muted/30 p-4 text-sm text-muted-foreground">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  const settled = data.status === 'REPAID';

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Scale className="h-4 w-4 text-primary" />
          Campaign settlement
        </div>
        <Badge variant={data.cohort === 1 ? 'default' : 'secondary'}>
          Cohort {data.cohort} · {data.daysInDefault}d in default
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">{COHORT_TERMS[data.cohort]}</p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Campaign asks</dt>
        <dd className="text-right font-semibold">{ghs(data.campaignTarget)}</dd>

        <dt className="text-muted-foreground">Received so far</dt>
        <dd className="text-right">{ghs(data.alreadyPaid)}</dd>

        <dt className="text-muted-foreground">Still to collect</dt>
        <dd
          className={cn(
            'text-right font-semibold',
            data.outstandingUnderCampaign > 0 ? 'text-amber-600' : 'text-emerald-600',
          )}
        >
          {ghs(data.outstandingUnderCampaign)}
        </dd>

        <dt className="text-muted-foreground">Would be waived</dt>
        <dd className="text-right">{ghs(data.wouldWaive)}</dd>

        <dt className="text-muted-foreground">Tier</dt>
        <dd className="text-right">
          {data.currentTier}
          {data.tierAfterSettlement !== data.currentTier && (
            <span className="text-amber-600"> → {data.tierAfterSettlement}</span>
          )}
        </dd>
      </dl>

      {settled ? (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
          <BadgeCheck className="h-4 w-4 shrink-0" />
          Already settled. The customer can re-apply.
        </div>
      ) : !data.readyToSettle ? (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Collect {ghs(data.outstandingUnderCampaign)} more before this can be settled. Once the
            payment is recorded against the loan, this button turns on.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor={`settle-reason-${loanReference}`} className="text-xs">
              Note (optional)
            </Label>
            <Input
              id={`settle-reason-${loanReference}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. paid by MoMo, confirmed on call"
            />
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full" disabled={settle.isPending}>
                {settle.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Settle and close · waive {ghs(data.wouldWaive)}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Settle {data.loanReference}?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-sm">
                    <p>
                      {ghs(data.alreadyPaid)} has been received. Closing this writes off{' '}
                      <strong>{ghs(data.wouldWaive)}</strong> and the customer becomes able to
                      re-apply
                      {data.tierAfterSettlement !== data.currentTier
                        ? ` at tier ${data.tierAfterSettlement}.`
                        : ' at the same tier.'}
                    </p>
                    <p className="text-muted-foreground">This cannot be undone.</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => settle.mutate()}>
                  Settle and close
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
