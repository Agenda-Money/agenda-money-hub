import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Users, User, Hash, SendHorizontal, 
  PenLine, Edit2, ChevronDown, Check, X,
  Type, DollarSign, Calendar, AlertCircle, Bookmark, UserCircle, Clock,
  Search, Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import csaApi from '@/lib/csaApi';

const SMS_RATE = 30; // UGX per segment

const PLACEHOLDERS = [
  { label: 'Title', value: '{{title}}', icon: Type },
  { label: 'First Name', value: '{{firstName}}', icon: User },
  { label: 'Last Name', value: '{{lastName}}', icon: User },
  { label: 'Overdue Amt', value: '{{totalPayable}}', icon: Wallet },
  { label: 'Due Date', value: '{{dueDate}}', icon: Calendar },
  { label: 'Loan Ref', value: '{{loanRef}}', icon: Hash },
  { label: 'Guarantor', value: '{{guarantorName}}', icon: Users },
];

export default function CsaTemplatesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'templates' | 'composer'>('composer');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'borrower' | 'guarantor'>('all');
  
  // Composer State
  const [calcMode, setCalcMode] = useState<'single' | 'bulk'>('single');
  const [messageBody, setMessageBody] = useState('');
  const [loanRefs, setLoanRefs] = useState('');
  const [contactTarget, setContactTarget] = useState<'borrower' | 'guarantor'>('borrower');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Verification Modal State
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Editing State
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editBody, setEditBody] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['csa-templates-full'],
    queryFn: () => csaApi.get('/api/csa/templates').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: (variables: { id: string; label: string; body: string }) =>
      csaApi.patch(`/api/csa/templates/${variables.id}`, {
        label: variables.label,
        body: variables.body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csa-templates-full'] });
      toast.success("Template updated successfully");
      setEditingTemplate(null);
    },
    onError: () => {
      toast.error("Failed to update template. Ensure you have permissions.");
    }
  });

  const allTemplates: any[] = data?.templates ?? [];
  const templates = audienceFilter === 'all'
    ? allTemplates
    : allTemplates.filter((t) => t.audience === audienceFilter);

  // SMS Stats Calculation
  const stats = useMemo(() => {
    const chars = messageBody.length;
    const segments = chars === 0 ? 0 : Math.ceil(chars / 160);
    return { chars, segments };
  }, [messageBody]);

  const insertPlaceholder = (value: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const content = messageBody.substring(0, start) + value + messageBody.substring(end);
    setMessageBody(content);
    
    // Set focus back and move cursor
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + value.length;
      }
    }, 0);
  };

  const startEditing = (template: any) => {
    setEditingTemplate(template);
    setEditLabel(template.label);
    setEditBody(template.body);
  };

  const handleSaveEdit = () => {
    if (!editingTemplate) return;
    updateMutation.mutate({
      id: editingTemplate._id,
      label: editLabel,
      body: editBody,
    });
  };

  const handleVerify = async () => {
    if (!messageBody.trim() || !loanRefs.trim()) {
      toast.error("Please provide both message and loan references");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await csaApi.post('/api/csa/collections/bulk-sms/custom-by-loan-reference', {
        loanReferences: loanRefs,
        messageBody,
        contactTarget,
        dryRun: true,
      });
      setVerificationResult(response.data);
    } catch (err: any) {
      toast.error("Could not verify outreach details. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSend = async () => {
    if (!verificationResult) return;
    setIsSending(true);
    try {
      await csaApi.post('/api/csa/collections/bulk-sms/custom-by-loan-reference', {
        loanReferences: loanRefs,
        messageBody,
        contactTarget,
        dryRun: false,
      });
      toast.success("Outreach messages sent successfully!");
      setVerificationResult(null);
      setMessageBody('');
      setLoanRefs('');
    } catch (err: any) {
      toast.error("Could not send outreach messages. Please check your connection.");
    } finally {
      setIsSending(false);
    }
  };

  // Quick Add Overdue State
  const [selectedBucket, setSelectedBucket] = useState(1);
  const [quickSearch, setQuickSearch] = useState('');

  // Quick Add Overdue Logic
  const { data: overdueData, isLoading: isLoadingOverdue } = useQuery({
    queryKey: ['csa-overdue-bucket', selectedBucket, quickSearch],
    queryFn: () => csaApi.get(`/api/csa/collections/loans?bucket=${selectedBucket}&limit=50&search=${quickSearch}`).then((r) => r.data),
    staleTime: 30_000,
  });

  const addLoanRef = (ref: string) => {
    const existing = loanRefs.split(/[\n,;]+/).map(r => r.trim().toUpperCase()).filter(Boolean);
    if (!existing.includes(ref.toUpperCase())) {
      const newVal = loanRefs + (loanRefs.trim() ? ', ' : '') + ref;
      setLoanRefs(newVal);
    }
  };

  const addAllOverdue = () => {
    const overdueRefs = overdueData?.data?.map((l: any) => l.loanReference) ?? [];
    const existing = loanRefs.split(/[\n,;]+/).map(r => r.trim().toUpperCase()).filter(Boolean);
    const toAdd = overdueRefs.filter((r: string) => !existing.includes(r.toUpperCase()));
    if (toAdd.length > 0) {
      const newVal = loanRefs + (loanRefs.trim() ? ', ' : '') + toAdd.join(', ');
      setLoanRefs(newVal);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-foreground tracking-tight sm:text-4xl">SMS Portal</h1>
          <p className="text-sm text-muted-foreground font-medium max-w-md">
            Manage templates and compose outreach messages with granular personalization.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 bg-muted/50 backdrop-blur-sm rounded-2xl border border-border/50 w-full sm:w-auto shadow-inner">
          <button
            onClick={() => setActiveTab('composer')}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
              activeTab === 'composer' ? "bg-card text-primary shadow-xl scale-[1.02]" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <SendHorizontal className="h-3.5 w-3.5" />
            Composer
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
              activeTab === 'templates' ? "bg-card text-primary shadow-xl scale-[1.02]" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Templates
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'templates' ? (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Audience filter */}
            <div className="flex gap-2">
              {(['all', 'borrower', 'guarantor'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setAudienceFilter(f)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-bold capitalize border transition-all',
                    audienceFilter === f
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {f === 'all' ? 'All Templates' : f === 'borrower' ? 'Borrower' : 'Guarantor'}
                </button>
              ))}
            </div>

            {/* Template list */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground opacity-30 mb-3" />
                <p className="text-base font-semibold text-foreground">No templates found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((t: any, i: number) => (
                  <motion.div
                    key={t._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card border border-border rounded-2xl p-5 space-y-3 group hover:border-primary/30 transition-colors relative"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-foreground">{t.label}</p>
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider">
                          {t.key}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => startEditing(t)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-primary"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <div className={cn(
                          'flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border',
                          t.audience === 'guarantor'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200',
                        )}>
                          {t.audience === 'guarantor'
                            ? <><Users className="h-3 w-3" /> Guarantor</>
                            : <><User className="h-3 w-3" /> Borrower</>
                          }
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-3 leading-relaxed border border-border/50">
                      {t.body}
                    </p>

                    {t.variables?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {t.variables.map((v: string) => (
                          <span key={v} className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded-md text-muted-foreground border border-border">
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="composer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left Column: Input */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <SendHorizontal className="h-4 w-4 text-primary" />
                    Message Composer
                  </h3>
                  <div className="flex flex-col xs:flex-row gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 w-full xs:w-auto text-[10px] font-bold uppercase tracking-wider gap-2 rounded-xl">
                          <Bookmark className="h-3 w-3" />
                          Choose Template
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[320px] max-h-[400px] overflow-y-auto p-2 rounded-2xl shadow-xl border-border/50">
                        {allTemplates.map((t, idx) => (
                          <DropdownMenuItem 
                            key={t._id} 
                            onClick={() => setMessageBody(t.body)}
                            className={cn(
                              "flex flex-col items-start gap-1 p-3 rounded-xl cursor-pointer transition-colors focus:bg-primary/5",
                              idx !== allTemplates.length - 1 && "mb-1 border-b border-border/30 pb-3"
                            )}
                          >
                            <p className="font-bold text-xs text-foreground uppercase tracking-wider">{t.label}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed italic">
                              "{t.body}"
                            </p>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex p-1 bg-muted rounded-xl border border-border/50 w-full xs:w-auto">
                      <button
                        onClick={() => setContactTarget('borrower')}
                        className={cn(
                          "flex-1 xs:flex-none px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all",
                          contactTarget === 'borrower' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Borrower
                      </button>
                      <button
                        onClick={() => setContactTarget('guarantor')}
                        className={cn(
                          "flex-1 xs:flex-none px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all",
                          contactTarget === 'guarantor' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Guarantor
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 px-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-primary" />
                          Quick Add Targets
                        </label>
                        {overdueData?.data?.length > 0 && (
                          <button 
                            onClick={addAllOverdue}
                            className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                          >
                            All ({overdueData.data.length})
                          </button>
                        )}
                      </div>
                      
                      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input 
                            value={quickSearch}
                            onChange={(e) => setQuickSearch(e.target.value)}
                            placeholder="Search name/ref..."
                            className="pl-9 pr-4 py-2 h-10 bg-muted/40 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none w-full transition-all font-medium placeholder:text-muted-foreground/50"
                          />
                        </div>

                        <div className="flex p-1 bg-muted rounded-xl border border-border/50 overflow-x-auto scrollbar-hide">
                          {[0, 1, 2, 3, 4, 5, 8].map(b => (
                            <button 
                              key={b}
                              onClick={() => setSelectedBucket(b)}
                              className={cn(
                                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0",
                                selectedBucket === b ? "bg-card text-primary shadow-sm border border-border/10" : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {b === 0 ? 'Today' : `DD${b}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
                      {isLoadingOverdue ? (
                        [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-56 rounded-2xl flex-shrink-0" />)
                      ) : overdueData?.data?.length === 0 ? (
                        <div className="w-full flex flex-col items-center justify-center py-6 bg-muted/20 border border-dashed border-border rounded-2xl">
                          <p className="text-[10px] text-muted-foreground italic font-medium text-center px-4">No targets found in this stage.</p>
                        </div>
                      ) : (
                        (overdueData as any)?.data?.map((l: any) => (
                          <button
                            key={l.loanId}
                            onClick={() => addLoanRef(l.loanReference)}
                            className="flex flex-col items-start gap-2.5 p-3 sm:p-4 bg-card hover:bg-primary/5 border border-border hover:border-primary/20 rounded-2xl transition-all flex-shrink-0 w-[220px] sm:w-[240px] group text-left shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden"
                          >
                            <div className="flex items-center justify-between w-full relative z-10">
                              <p className="text-[13px] font-black text-foreground truncate w-full group-hover:text-primary transition-colors pr-10">
                                {l.user?.fullName || "Customer"}
                              </p>
                              <Badge variant="outline" className={cn(
                                "absolute right-0 top-0 text-[9px] px-2 h-4 uppercase border-none font-black",
                                l.ddBucket >= 1 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                              )}>
                                {l.ddBucket === 0 ? 'Due' : `DD${l.ddBucket}`}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center justify-between w-full relative z-10">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Wallet className="h-3 w-3" />
                                <span className="text-[11px] font-black tracking-tight text-foreground">
                                  GHS {(l.totalPayable || 0).toLocaleString()}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono font-bold tracking-tight text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-lg border border-border/50">
                                {l.loanReference}
                              </span>
                            </div>

                            <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity rotate-12">
                              {l.ddBucket >= 1 ? <AlertCircle className="h-12 w-12 text-red-600" /> : <Clock className="h-12 w-12 text-green-600" />}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Loan Refs */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Hash className="h-3 w-3" />
                        Loan References
                      </div>
                      {loanRefs && (
                        <button 
                          onClick={() => setLoanRefs('')}
                          className="text-[9px] text-red-500 hover:underline font-bold uppercase tracking-wider"
                        >
                          Clear All
                        </button>
                      )}
                    </label>
                    <textarea
                      value={loanRefs}
                      onChange={(e) => setLoanRefs(e.target.value)}
                      placeholder="Paste loan refs or use Quick Add above..."
                      className="w-full h-24 bg-muted/20 border border-border rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all resize-none font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1"> Message Body </label>
                    <div className="relative group">
                      <textarea
                        ref={textareaRef}
                        value={messageBody}
                        onChange={(e) => setMessageBody(e.target.value)}
                        placeholder="Type your message here..."
                        className="w-full h-40 bg-muted/20 border border-border rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all resize-none font-medium"
                      />
                    </div>
                  </div>

                  {/* Placeholders */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Placeholders</p>
                    <div className="flex flex-wrap gap-2">
                      {PLACEHOLDERS.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => insertPlaceholder(p.value)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/40 hover:bg-primary/10 border border-border hover:border-primary/30 rounded-lg text-xs font-semibold transition-all group"
                        >
                          <p.icon className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Execution Stats */}
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-6 space-y-6 sticky top-24 shadow-sm">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" />
                  Outreach Stats
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {/* Chars */}
                  <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 flex flex-col items-center justify-center text-center gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Characters</span>
                    <span className="text-xl font-black text-foreground">{stats.chars}</span>
                  </div>

                  {/* Segments */}
                  <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 flex flex-col items-center justify-center text-center gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Segments</span>
                    <span className={cn(
                      "text-xl font-black transition-colors",
                      stats.segments > 1 ? "text-primary" : "text-foreground"
                    )}>{stats.segments}</span>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-xl border border-border/50 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <Check className="h-3 w-3 text-green-500" />
                    Compliance
                  </div>
                  <ul className="space-y-2">
                    <li className="text-[10px] text-muted-foreground flex items-start gap-2 leading-tight">
                      <span className="w-1 h-1 rounded-full bg-primary mt-1 flex-shrink-0" />
                      Outreach will be logged as an activity.
                    </li>
                    <li className="text-[10px] text-muted-foreground flex items-start gap-2 leading-tight">
                      <span className="w-1 h-1 rounded-full bg-primary mt-1 flex-shrink-0" />
                      Manual templates must use valid placeholders.
                    </li>
                  </ul>
                </div>

                <Button 
                  onClick={handleVerify}
                  disabled={isVerifying || !messageBody.trim() || !loanRefs.trim()}
                  className="w-full h-12 rounded-xl text-xs font-bold gap-2 shadow-lg shadow-primary/20"
                >
                  {isVerifying ? "Verifying..." : "Verify & Send Message"}
                  <SendHorizontal className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification Modal */}
      <Dialog open={!!verificationResult} onOpenChange={(open) => !open && setVerificationResult(null)}>
        <DialogContent className="sm:max-w-[600px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Check className="h-6 w-6 text-green-500" />
              Verify Outreach
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 text-center">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total</p>
                <p className="text-xl font-black">{verificationResult?.totalRequested}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100 text-center">
                <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Ready</p>
                <p className="text-xl font-black text-green-700">{verificationResult?.queuedCount}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center">
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Skipped</p>
                <p className="text-xl font-black text-red-700">{verificationResult?.skippedCount}</p>
              </div>
            </div>

            {verificationResult?.skipped?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Skipped Details</p>
                <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 max-h-[150px] overflow-y-auto space-y-2">
                  {verificationResult.skipped.map((s: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-red-700">{s.loanReference}</span>
                      <span className="text-red-600 font-medium italic">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Message Preview</p>
              <div className="bg-muted/30 border border-border rounded-2xl p-4 text-sm text-muted-foreground line-clamp-3">
                {verificationResult?.queued?.[0]?.preview || messageBody}
              </div>
              <p className="text-[10px] italic text-muted-foreground px-1">Preview shows actual data for the first recipient.</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setVerificationResult(null)} className="rounded-xl font-bold">
              Back to Edit
            </Button>
            <Button 
              disabled={isSending || verificationResult?.queuedCount === 0}
              onClick={handleSend}
              className="rounded-xl font-bold px-8 shadow-lg shadow-primary/20"
            >
              {isSending ? "Sending..." : "Confirm & Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Modal */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" />
              Edit Template
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Template Label</label>
              <Input 
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="e.g. Overdue Reminder"
                className="rounded-xl bg-muted/30 border-border"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Body Content</label>
                <span className={cn(
                  "text-[10px] font-bold",
                  editBody.length > 160 ? "text-primary" : "text-muted-foreground"
                )}>
                  {editBody.length} characters
                </span>
              </div>
              <Textarea 
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="Hi {{name}}, your payment is due..."
                className="min-h-[160px] rounded-xl bg-muted/30 border-border resize-none"
              />
            </div>

            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" />
                Variable Validation
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDERS.map(p => (
                  <span 
                    key={p.value} 
                    className={cn(
                      "text-[9px] font-mono px-2 py-0.5 rounded-md border transition-colors",
                      editBody.includes(p.value) 
                        ? "bg-primary/20 text-primary border-primary/30" 
                        : "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    {p.value}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setEditingTemplate(null)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button 
              disabled={updateMutation.isPending || !editLabel || !editBody}
              onClick={handleSaveEdit}
              className="rounded-xl font-bold min-w-[100px]"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

