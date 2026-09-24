import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Loader2, Plus, Send, Trash2, TestTube2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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

/**
 * Collections campaign broadcast.
 *
 * Three steps in a deliberate order: preview the figures, prove the sender ID
 * arrives on a real handset, then send to the cohort. The middle step exists
 * because this campaign uses an unfamiliar sender ID precisely to get past
 * customers who have blocked the usual one, and whether it arrives is the one
 * thing no amount of checking the screen can tell you.
 */

const ENDPOINT = '/api/admin/loans/collections-campaign/sms';

const COHORT_COPY: Record<1 | 2, { label: string; terms: string; suggested: string }> = {
  1: {
    label: 'Cohort 1 — defaulted within 90 days',
    terms: 'Penalties waived. Pays principal + interest. Tier unchanged.',
    suggested:
      'Hi [firstname], all penalties on your loan have been waived. Pay GHS [amount] by 30 Sep to clear it and qualify to borrow again. Dial *415*102# to pay.',
  },
  2: {
    label: 'Cohort 2 — defaulted 91 days or more',
    terms: 'Penalties and interest waived. Pays principal only. Drops two tiers.',
    suggested:
      'Hi [firstname], all interest and penalties on your loan are waived. Pay only GHS [amount] to clear it. You can pay bit by bit. Dial *415*102# to pay.',
  },
};

type Seed = { msisdn: string; name: string };

type Preview = { msisdn: string; rendered: string };
type Result = {
  cohort: number;
  recipients: number;
  seedNumbers: number;
  amountBeingChased: number;
  skippedNothingOwed: number;
  skippedNoDueDate: number;
  skippedNotYetDefaulted: number;
  preview?: Preview[];
  campaignId?: string;
  queued?: number;
  seedsOnly?: boolean;
};

const ghs = (n: number) =>
  `GHS ${Number(n ?? 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * A curly apostrophe or dash switches the whole message to UCS-2 and the limit
 * falls from 160 to 70, quietly doubling the cost of every send. Worth catching
 * on screen rather than on the bill.
 */
const NON_GSM = /[‘’“”–—…]/;

export default function CollectionsCampaignPage() {
  const [cohort, setCohort] = useState<1 | 2>(1);
  const [senderId, setSenderId] = useState('');
  const [message, setMessage] = useState(COHORT_COPY[1].suggested);
  const [seeds, setSeeds] = useState<Seed[]>([{ msisdn: '', name: '' }]);
  const [result, setResult] = useState<Result | null>(null);
  const [lastAction, setLastAction] = useState<'preview' | 'seeds' | 'send' | null>(null);

  const cleanSeeds = seeds.filter((s) => s.msisdn.trim());

  // Worst case rather than the template: a long name and a four-figure amount is
  // what actually decides whether this costs one segment or two.
  const worstCase = message
    .replace(/\[firstname\]/gi, 'Comfort')
    .replace(/\[amount\]/gi, '1,048.60');
  const segments = worstCase.length <= 160 ? 1 : Math.ceil(worstCase.length / 153);
  const hasCurly = NON_GSM.test(message);

  const run = useMutation({
    mutationFn: (opts: { dryRun: boolean; seedsOnly?: boolean }) =>
      api
        .post(ENDPOINT, {
          cohort,
          senderId: senderId.trim(),
          message,
          extraContacts: cleanSeeds.map((s) => ({ msisdn: s.msisdn.trim(), name: s.name.trim() })),
          dryRun: opts.dryRun,
          ...(opts.seedsOnly ? { seedsOnly: true } : {}),
        })
        .then((r) => r.data),
    onSuccess: (data) => {
      setResult(data?.data ?? null);
      toast.success(data?.message ?? 'Done.');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Could not reach the campaign endpoint.'),
  });

  const go = (action: 'preview' | 'seeds' | 'send') => {
    if (!senderId.trim()) {
      toast.error('Sender ID is required — this must not fall back to the default sender.');
      return;
    }
    if (action !== 'preview' && cleanSeeds.length === 0) {
      toast.error('Add at least one seed number so somebody sees what customers see.');
      return;
    }
    setLastAction(action);
    run.mutate({
      dryRun: action === 'preview',
      seedsOnly: action === 'seeds',
    });
  };

  const busy = (a: typeof lastAction) => run.isPending && lastAction === a;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Collections campaign</h1>
        <p className="text-sm text-muted-foreground">
          Preview the figures, prove the sender ID arrives, then send to the cohort.
        </p>
      </div>

      {/* Cohort */}
      <div className="space-y-2 rounded-lg border p-4">
        <Label>Cohort</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {([1, 2] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCohort(c);
                setMessage(COHORT_COPY[c].suggested);
                setResult(null);
              }}
              className={cn(
                'rounded-lg border p-3 text-left text-sm transition',
                cohort === c ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50',
              )}
            >
              <div className="font-semibold">{COHORT_COPY[c].label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{COHORT_COPY[c].terms}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Sender */}
      <div className="space-y-2 rounded-lg border p-4">
        <Label htmlFor="senderId">Sender ID</Label>
        <Input
          id="senderId"
          value={senderId}
          onChange={(e) => setSenderId(e.target.value)}
          placeholder="233XXXXXXXXX — the number registered with Rancard"
        />
        <p className="text-xs text-muted-foreground">
          No default. Leaving this blank is refused rather than falling back to the usual sender,
          which is the one some of these customers have blocked.
        </p>
      </div>

      {/* Message */}
      <div className="space-y-2 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="message">Message</Label>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{worstCase.length} chars at worst case</span>
            <Badge variant={segments === 1 ? 'secondary' : 'destructive'}>
              {segments} segment{segments > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
        <Textarea
          id="message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          <code>[firstname]</code> and <code>[amount]</code> are filled per customer. Length is
          measured with a long name and a four-figure amount, since that is what decides the cost.
        </p>
        {hasCurly && (
          <p className="flex items-start gap-1.5 text-xs text-amber-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Curly quotes or dashes halve the limit to 70 characters and double the cost. Use
            straight ones.
          </p>
        )}
      </div>

      {/* Seeds */}
      <div className="space-y-3 rounded-lg border p-4">
        <div>
          <Label>Your numbers</Label>
          <p className="text-xs text-muted-foreground">
            These ride along so somebody sees the handset view. They get sample values, never a real
            customer's.
          </p>
        </div>
        {seeds.map((s, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={s.name}
              onChange={(e) =>
                setSeeds(seeds.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
              }
              placeholder="Name"
              className="w-40"
            />
            <Input
              value={s.msisdn}
              onChange={(e) =>
                setSeeds(seeds.map((x, j) => (j === i ? { ...x, msisdn: e.target.value } : x)))
              }
              placeholder="233XXXXXXXXX"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSeeds(seeds.filter((_, j) => j !== i))}
              disabled={seeds.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setSeeds([...seeds, { msisdn: '', name: '' }])}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add number
        </Button>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => go('preview')} disabled={run.isPending}>
          {busy('preview') && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          1. Preview
        </Button>

        <Button variant="secondary" onClick={() => go('seeds')} disabled={run.isPending}>
          {busy('seeds') ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <TestTube2 className="mr-2 h-4 w-4" />
          )}
          2. Test to my numbers
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={run.isPending || !result}>
              <Send className="mr-2 h-4 w-4" />
              3. Send to cohort {cohort}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send to {result?.recipients ?? '?'} customers?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>
                    Cohort {cohort}, chasing {ghs(result?.amountBeingChased ?? 0)} from{' '}
                    {result?.recipients ?? 0} people, from sender{' '}
                    <strong>{senderId || '(not set)'}</strong>.
                  </p>
                  <p className="text-muted-foreground">
                    Have you confirmed the test message actually arrived on a handset? That is the
                    only way to know this sender ID delivers.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => go('send')}>Send it</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Customers" value={String(result.recipients ?? 0)} />
            <Stat label="To chase" value={ghs(result.amountBeingChased ?? 0)} />
            <Stat label="Your numbers" value={String(result.seedNumbers ?? 0)} />
            <Stat
              label="Queued"
              value={result.queued != null ? String(result.queued) : 'nothing yet'}
            />
          </div>

          {(result.skippedNothingOwed > 0 ||
            result.skippedNotYetDefaulted > 0 ||
            result.skippedNoDueDate > 0) && (
            <p className="text-xs text-muted-foreground">
              Left out: {result.skippedNothingOwed} already paid the campaign amount (settle them
              instead), {result.skippedNotYetDefaulted} overdue but not yet defaulted,{' '}
              {result.skippedNoDueDate} with no due date.
            </p>
          )}

          {result.preview?.length ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What they will receive
              </p>
              {result.preview.map((p, i) => (
                <div key={i} className="rounded-md bg-muted/40 p-3 text-sm">
                  <div className="mb-1 font-mono text-xs text-muted-foreground">{p.msisdn}</div>
                  {p.rendered}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
