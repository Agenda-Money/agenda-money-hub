import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Phone, MapPin, Wifi, UserCheck, Clock, Send, ChevronDown, CheckCircle2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import csaApi from '@/lib/csaApi';
import { getBucketMeta, formatGHS, formatOutcome, outcomeColor, formatNetwork } from '@/lib/bucketUtils';

const OUTCOMES = [
  { value: 'NO_ANSWER', label: 'No Answer' },
  { value: 'CALLED_BACK_LATER', label: 'Call Back Later' },
  { value: 'PROMISE_TO_PAY', label: 'Promise to Pay' },
  { value: 'PARTIAL_PAYMENT', label: 'Partial Payment' },
  { value: 'PAID', label: 'Paid' },
  { value: 'DISPUTED', label: 'Disputed' },
  { value: 'WRONG_NUMBER', label: 'Wrong Number' },
  { value: 'REFUSED', label: 'Refused' },
  { value: 'GUARANTOR_CALLED', label: 'Guarantor Called' },
  { value: 'SMS_SENT', label: 'SMS Only (no call)' },
  { value: 'OTHER', label: 'Other' },
];

interface LoanDrawerProps {
  loanId: string | null;
  onClose: () => void;
}

export function LoanDrawer({ loanId, onClose }: LoanDrawerProps) {
  const qc = useQueryClient();
  const [outcome, setOutcome] = useState('');
  const [contactTarget, setContactTarget] = useState<'borrower' | 'guarantor'>('borrower');
  const [note, setNote] = useState('');
  const [promisedDate, setPromisedDate] = useState('');
  const [promisedAmount, setPromisedAmount] = useState('');
  const [callbackAt, setCallbackAt] = useState('');
  const [sendSms, setSendSms] = useState(false);
  const [smsTemplateKey, setSmsTemplateKey] = useState('');
  const [activeTab, setActiveTab] = useState<'detail' | 'history'>('detail');

  const { data, isLoading } = useQuery({
    queryKey: ['csa-loan-detail', loanId],
    queryFn: () => csaApi.get(`/api/csa/collections/loans/${loanId}`).then((r) => r.data),
    enabled: !!loanId,
  });

  const { data: templateData } = useQuery({
    queryKey: ['csa-templates'],
    queryFn: () => csaApi.get('/api/csa/templates').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const log = useMutation({
    mutationFn: (payload: any) =>
      csaApi.post(`/api/csa/collections/loans/${loanId}/activity`, payload),
    onSuccess: () => {
      toast.success('Activity recorded successfully!');
      qc.invalidateQueries({ queryKey: ['csa-loans'] });
      qc.invalidateQueries({ queryKey: ['csa-loan-detail', loanId] });
      qc.invalidateQueries({ queryKey: ['csa-me-stats'] });
      setOutcome(''); setNote(''); setPromisedDate('');
      setPromisedAmount(''); setCallbackAt(''); setSendSms(false); setSmsTemplateKey('');
      setActiveTab('history');
    },
    onError: (err: any) => toast.error('Could not record activity. Please try again.'),
  });

  const handleSubmit = () => {
    if (!outcome) { toast.error('Please select an outcome'); return; }
    log.mutate({
      outcome, contactTarget, note: note || undefined,
      promisedPaymentDate: promisedDate || undefined,
      promisedAmount: promisedAmount ? Number(promisedAmount) : undefined,
      callbackScheduledAt: callbackAt || undefined,
      sendSms, smsTemplateKey: sendSms ? smsTemplateKey : undefined,
    });
  };

  const loan = data as any;
  const meta = loan?.ddBucket != null ? getBucketMeta(loan.ddBucket) : null;
  const templates = templateData?.templates ?? [];

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success('Phone number copied');
  };

  return (
    <AnimatePresence>
      {loanId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-background border-l border-border z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50 flex-shrink-0">
              {meta && (
                <div className="flex items-center gap-3">
                  <div className={cn('w-3 h-3 rounded-full', meta.color)} />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{meta.description}</p>
                    <p className="text-sm font-bold text-foreground">{isLoading ? '...' : loan?.loanReference}</p>
                  </div>
                </div>
              )}
              {!meta && !isLoading && (
                <p className="text-sm font-bold">{loan?.loanReference ?? '...'}</p>
              )}
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border bg-card/30 flex-shrink-0">
              {(['detail', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors',
                    activeTab === tab
                      ? 'text-primary border-b-2 border-primary bg-accent/50'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab === 'detail' ? 'Log Activity' : 'Call History'}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-5 space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                </div>
              ) : (
                <>
                  {activeTab === 'detail' && (
                    <div className="p-5 space-y-5">
                      {/* Borrower info card */}
                      <div className="bg-muted/30 rounded-2xl p-4 space-y-3 border border-border/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-foreground text-base">
                              {loan?.user ? `${(loan.user as any).fullName} ${(loan.user as any).surname ?? ''}`.trim() : loan?.userMsisdn}
                            </p>
                            <p className="text-xs text-muted-foreground">{(loan?.user as any)?.employmentStatus}</p>
                          </div>
                          <button
                            onClick={() => copyPhone(loan?.userMsisdn)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {loan?.userMsisdn}
                            <Copy className="h-3 w-3 opacity-60" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          {(loan?.user as any)?.region && (
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{(loan.user as any).region}</span>
                          )}
                          <span className="flex items-center gap-1"><Wifi className="h-3 w-3" />{formatNetwork(loan?.network ?? '', loan?.userMsisdn)}</span>
                          {(loan?.user as any)?.address && (
                            <span className="col-span-2 flex items-center gap-1 truncate">{(loan.user as any).address}</span>
                          )}
                        </div>
                      </div>

                      {/* Loan figures */}
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Outstanding', value: formatGHS((loan?.totalPayable ?? 0) - (loan?.amountRepaid ?? 0)), highlight: true },
                          { label: 'Total Payable', value: formatGHS(loan?.totalPayable ?? 0) },
                          { label: 'Amount Repaid', value: formatGHS(loan?.amountRepaid ?? 0) },
                          { label: 'Due Date', value: loan?.dueDate ? format(new Date(loan.dueDate), 'dd MMM yyyy') : '—' },
                        ].map(({ label, value, highlight }) => (
                          <div key={label} className={cn('rounded-xl p-3 border', highlight ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border/50')}>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{label}</p>
                            <p className={cn('text-sm font-extrabold mt-0.5', highlight ? 'text-primary' : 'text-foreground')}>{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Guarantor */}
                      {loan?.guarantorName && (
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-purple-600" />
                            <div>
                              <p className="text-xs font-bold text-purple-700">Guarantor</p>
                              <p className="text-sm text-purple-900 font-semibold">{loan.guarantorName}</p>
                            </div>
                          </div>
                          {loan.guarantorMsisdn && (
                            <button
                              onClick={() => copyPhone(loan.guarantorMsisdn!)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-full transition-colors"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              {loan.guarantorMsisdn}
                              <Copy className="h-3 w-3 opacity-60" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Log call form */}
                      <div className="space-y-4 pt-1">
                        <p className="text-xs font-bold text-foreground uppercase tracking-widest">Log This Contact</p>

                        {/* Contact target */}
                        <div className="grid grid-cols-2 gap-2">
                          {(['borrower', 'guarantor'] as const).map((t) => (
                            <button
                              key={t}
                              onClick={() => setContactTarget(t)}
                              className={cn(
                                'py-2.5 rounded-xl text-xs font-bold border transition-all capitalize',
                                contactTarget === t
                                  ? 'bg-primary text-primary-foreground border-primary shadow-pink'
                                  : 'bg-muted/30 text-muted-foreground border-border hover:border-primary/40',
                              )}
                            >
                              Called {t}
                            </button>
                          ))}
                        </div>

                        {/* Outcome */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Outcome</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {OUTCOMES.map((o) => (
                              <button
                                key={o.value}
                                onClick={() => setOutcome(o.value)}
                                className={cn(
                                  'py-2 px-3 rounded-xl text-xs font-semibold border text-left transition-all',
                                  outcome === o.value
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-muted/30 text-foreground border-border hover:border-primary/40',
                                )}
                              >
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Conditional fields */}
                        {(outcome === 'PROMISE_TO_PAY' || outcome === 'PARTIAL_PAYMENT') && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Promise Date</Label>
                              <Input type="date" value={promisedDate} onChange={(e) => setPromisedDate(e.target.value)} className="h-9 text-sm rounded-xl" />
                            </div>
                            {outcome === 'PARTIAL_PAYMENT' && (
                              <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Amount (GHS)</Label>
                                <Input type="number" placeholder="0.00" value={promisedAmount} onChange={(e) => setPromisedAmount(e.target.value)} className="h-9 text-sm rounded-xl" />
                              </div>
                            )}
                          </div>
                        )}

                        {outcome === 'CALLED_BACK_LATER' && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Call Back At</Label>
                            <Input type="datetime-local" value={callbackAt} onChange={(e) => setCallbackAt(e.target.value)} className="h-9 text-sm rounded-xl" />
                          </div>
                        )}

                        {/* Note */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Note {outcome === 'OTHER' && <span className="text-destructive">*</span>}
                          </Label>
                          <Textarea
                            placeholder="Add a note about this contact..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            maxLength={500}
                            rows={3}
                            className="resize-none rounded-xl text-sm"
                          />
                          <p className="text-[10px] text-muted-foreground text-right">{note.length}/500</p>
                        </div>

                        {/* SMS toggle */}
                        <div className="border border-border/60 rounded-xl overflow-hidden">
                          <button
                            onClick={() => setSendSms(!sendSms)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Send className="h-4 w-4 text-primary" />
                              <span className="text-sm font-semibold">Also send an SMS</span>
                            </div>
                            <motion.div animate={{ rotate: sendSms ? 180 : 0 }}>
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </motion.div>
                          </button>

                          <AnimatePresence>
                            {sendSms && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 space-y-2 border-t border-border/50">
                                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Template</Label>
                                  <div className="grid grid-cols-1 gap-2">
                                    {templates
                                      .filter((t: any) => t.audience === contactTarget || t.audience === 'borrower')
                                      .map((t: any) => (
                                        <button
                                          key={t.key}
                                          onClick={() => setSmsTemplateKey(t.key)}
                                          className={cn(
                                            'text-left px-3 py-2.5 rounded-xl border text-xs transition-all',
                                            smsTemplateKey === t.key
                                              ? 'bg-primary/10 border-primary text-primary font-semibold'
                                              : 'bg-muted/20 border-border text-foreground hover:border-primary/40',
                                          )}
                                        >
                                          <p className="font-semibold">{t.label}</p>
                                          <p className="text-muted-foreground mt-0.5 line-clamp-1">{t.body}</p>
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <Button
                          className="w-full h-11 rounded-xl font-bold"
                          onClick={handleSubmit}
                          disabled={log.isPending || !outcome || (sendSms && !smsTemplateKey)}
                        >
                          {log.isPending ? (
                            <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> Saving...</span>
                          ) : (
                            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Save Activity</span>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className="p-5 space-y-3">
                      {(loan?.callHistory ?? []).length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Clock className="h-8 w-8 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">No contact history yet</p>
                        </div>
                      ) : (
                        (loan?.callHistory ?? []).map((a: any, i: number) => (
                          <motion.div
                            key={a._id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-muted/30 rounded-xl p-3.5 border border-border/50 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className={cn('text-[10px] font-bold px-2.5 py-0.5 rounded-full border', outcomeColor(a.outcome))}>
                                {formatOutcome(a.outcome)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(a.createdAt), 'dd MMM, HH:mm')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{a.csaName}</span>
                              <span>·</span>
                              <span className="capitalize">{a.contactTarget}</span>
                              {a.smsSent && (
                                <>
                                  <span>·</span>
                                  <span className="flex items-center gap-1 text-sky-600"><Send className="h-3 w-3" />SMS sent</span>
                                </>
                              )}
                            </div>
                            {a.note && <p className="text-xs text-muted-foreground border-l-2 border-border pl-2 italic">{a.note}</p>}
                            {a.promisedPaymentDate && (
                              <p className="text-xs font-medium text-blue-600">
                                Promised: {format(new Date(a.promisedPaymentDate), 'dd MMM yyyy')}
                                {a.promiseKept === true && ' ✓'}
                                {a.promiseKept === false && ' ✗ broken'}
                              </p>
                            )}
                          </motion.div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
