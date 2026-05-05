import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Clock, Check, Loader2, AlertCircle, X } from "lucide-react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EndorsementRequest {
  loanId: string;
  amount: number;
  purpose: string;
  createdAt: string;
  borrower: {
    name: string;
    phone: string;
    selfieUrl?: string;
  };
}

export default function AgentEndorsementsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [resolvedActions, setResolvedActions] = useState<Record<string, 'endorsed' | 'declined'>>({});
  
  // Inline Reject State
  const [inlineRejectId, setInlineRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Fetch pending endorsements
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ["agent-endorsements", user?.id],
    queryFn: async () => {
      const res = await api.get("/api/agents/pending-endorsements");
      const data = res.data;
      const list = data?.endorsements || data?.data || data?.loans || [];
      if (Array.isArray(list) && list.length > 0 && !selectedId) {
        setSelectedId(list[0].loanId);
      }
      return data;
    },
    enabled: !!user?.id,
  });

  const endorsements: EndorsementRequest[] = response?.endorsements || response?.data || response?.loans || [];

  const selectedRequest = endorsements.find(e => e.loanId === selectedId);

  // Approve Endorsement Mutation
  const approveMutation = useMutation({
    mutationFn: async (loanId: string) => {
      const res = await api.post(`/api/agents/endorsements/${loanId}/approve`);
      return res.data;
    },
    onSuccess: (_, loanId) => {
      toast.success("Loan endorsed successfully!");
      setProcessedIds(prev => {
        const next = new Set(prev);
        next.add(loanId);
        setResolvedActions(pa => ({ ...pa, [loanId]: 'endorsed' }));
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["agent-endorsements"] });
    },
    onError: (error: any) => {
      toast.error(getFriendlyErrorMessage(error));
    },
    onSettled: () => {
      setProcessingId(null);
    }
  });

  const handleApprove = (loanId: string) => {
    setProcessingId(loanId);
    approveMutation.mutate(loanId);
  };

  // Reject Endorsement Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ loanId, reason }: { loanId: string; reason?: string }) => {
      const payload = reason ? { reason } : {};
      const res = await api.post(`/api/agents/endorsements/${loanId}/reject`, payload);
      return res.data;
    },
    onSuccess: (_, { loanId }) => {
      toast.success("Loan endorsement rejected.");
      setProcessedIds(prev => {
        const next = new Set(prev);
        next.add(loanId);
        setResolvedActions(pa => ({ ...pa, [loanId]: 'declined' }));
        return next;
      });
      setInlineRejectId(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["agent-endorsements"] });
    },
    onError: (error: any) => {
      toast.error(getFriendlyErrorMessage(error));
    },
    onSettled: () => {
      setProcessingId(null);
    }
  });

  const handleRejectConfirm = (loanId: string) => {
    setProcessingId(loanId);
    rejectMutation.mutate({ loanId, reason: rejectReason.trim() });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center text-red-500">
          <AlertCircle className="h-10 w-10 mb-4" />
          <p className="text-lg font-semibold">Failed to load endorsements</p>
          <p className="text-sm opacity-80 mt-1">Please try refreshing the page.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
             <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
             </div>
             <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">
               Pending Endorsements
             </h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Review and endorse first-time loans for users in your network.
          </p>
        </div>
        <div className="flex items-center gap-4">
           {endorsements.length > 0 && (
             <Badge variant="outline" className="h-8 px-4 border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-bold rounded-full">
               {endorsements.length} PENDING REQUESTS
             </Badge>
           )}
        </div>
      </div>

      <div className="max-w-[720px] w-full">
        {endorsements.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold">No Pending Endorsements</h3>
              <p className="text-muted-foreground max-w-sm mt-2">
                You've handled all pending requests. Check back later for new ones.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
             {/* Pending items first */}
             {endorsements.filter(e => !processedIds.has(e.loanId)).map((req) => renderEndorsementCard(req))}
             
             {/* Resolved (Done) items below */}
             {endorsements.filter(e => processedIds.has(e.loanId)).map((req) => renderDoneCard(req))}
          </div>
        )}
      </div>

      {/* Why Section */}
      <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4 flex items-start gap-4 text-blue-800 dark:text-blue-300">
        <Info className="w-6 h-6 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-900 dark:text-blue-200">Why do I need to endorse these?</p>
          <p className="text-sm opacity-90 max-w-3xl leading-relaxed text-blue-800 dark:text-blue-300">
            As an Agent, you are vouching for the trustworthiness of your network. First-time borrowers must be endorsed by you before the admin will review their application. 
          </p>
        </div>
      </div>

      {/* Selfie Popup Modal */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="max-w-[800px] p-0 overflow-hidden bg-black border-none rounded-3xl">
           {selectedRequest?.borrower?.selfieUrl && (
             <div className="relative group">
                <img 
                  src={selectedRequest.borrower.selfieUrl} 
                  className="w-full h-auto max-h-[85vh] object-contain mx-auto" 
                  alt="Borrower Selfie"
                  onError={(e) => {
                    toast.error("Failed to load selfie image.");
                    setIsPhotoModalOpen(false);
                  }}
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsPhotoModalOpen(false)}
                  className="absolute top-4 right-4 rounded-full bg-black/40 text-white hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-5 h-5" />
                </Button>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderEndorsementCard(req: EndorsementRequest) {
    const b = req.borrower || { name: "", phone: "", selfieUrl: "" };
    const initialsName = b.name ? b.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : "?";
    const isProcessing = processingId === req.loanId;
    const isRejecting = inlineRejectId === req.loanId;
    
    return (
      <Card key={req.loanId} className="border border-border/40 shadow-none rounded-xl overflow-hidden bg-card mb-3">
        {/* Top Row: Selfie/Initials + Name/Phone + Amount */}
        <div className="p-4 flex items-center gap-3.5">
          <button 
            onClick={() => {
              if (b.selfieUrl) {
                setSelectedId(req.loanId); // Set for modal use
                setIsPhotoModalOpen(true);
              }
            }}
            className="w-[52px] h-[52px] rounded-lg overflow-hidden bg-muted flex items-center justify-center text-muted-foreground font-medium text-base shrink-0 border border-border/40"
          >
            {b.selfieUrl ? (
              <img 
                src={b.selfieUrl} 
                className="w-full h-full object-cover" 
                alt={b.name} 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "";
                  (e.target as HTMLImageElement).classList.add('hidden');
                }}
              />
            ) : (
              initialsName
            )}
          </button>
          <div>
            <div className="text-[15px] font-bold text-foreground">{b.name}</div>
            <div className="text-xs text-muted-foreground dark:text-gray-400 mt-0.5">{b.phone}</div>
          </div>
          <div className="ml-auto text-[15px] font-bold text-foreground">GHS {req.amount.toLocaleString()}</div>
        </div>

        <div className="h-[0.5px] bg-border/40 mx-4" />

        {/* Meta Row: Purpose + Submitted */}
        <div className="px-4 py-2.5 flex items-center">
           <div className="flex-1 flex flex-col gap-0.5">
             <span className="text-[11px] text-muted-foreground/80 dark:text-gray-500 font-medium">Purpose</span>
             <span className="text-[13px] text-muted-foreground dark:text-gray-300 font-medium">{req.purpose}</span>
           </div>
           <div className="flex-1 flex flex-col gap-0.5">
             <span className="text-[11px] text-muted-foreground/80 dark:text-gray-500 font-medium">Submitted</span>
             <span className="text-[13px] text-muted-foreground dark:text-gray-300 font-medium">
               {req.createdAt ? format(new Date(req.createdAt), "'Today', h:mm a") : "N/A"}
             </span>
           </div>
        </div>

        {/* Action Row */}
        <div className="p-4 pt-3 flex flex-col gap-3">
          {!isRejecting ? (
            <div className="flex gap-2">
              <Button 
                onClick={() => handleApprove(req.loanId)}
                disabled={isProcessing}
                className="flex-1 h-9 rounded-lg bg-[#EAF3DE] dark:bg-emerald-950/40 hover:bg-[#DCECBA] dark:hover:bg-emerald-900/60 text-[#3B6D11] dark:text-emerald-400 border border-[#C0DD97] dark:border-emerald-900/50 font-medium text-xs shadow-none group transition-colors"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Endorse"}
              </Button>
              <Button 
                onClick={() => {
                  setInlineRejectId(req.loanId);
                  setRejectReason("");
                }}
                variant="outline"
                className="flex-1 h-9 rounded-lg bg-muted/20 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/50 text-muted-foreground dark:text-gray-300 border-border/60 text-xs font-medium transition-colors"
              >
                Decline
              </Button>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
              <Input 
                placeholder="Reason (optional)" 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="h-10 rounded-lg bg-background text-xs border-border/60"
                autoFocus
              />
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleRejectConfirm(req.loanId)}
                  disabled={isProcessing}
                  className="h-8 px-4 rounded-lg bg-[#FCEBEB] dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-[#A32D2D] dark:text-red-400 border border-[#F7C1C1] dark:border-red-900/50 text-xs font-medium transition-colors"
                >
                  Confirm decline
                </Button>
                <Button 
                  onClick={() => setInlineRejectId(null)}
                  variant="ghost"
                  className="h-8 px-4 rounded-lg text-xs font-medium text-muted-foreground dark:text-gray-300 hover:text-foreground"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </Card>
    );
  }

  function renderDoneCard(req: EndorsementRequest) {
    const b = req.borrower || { name: "", phone: "", selfieUrl: "" };
    const initialsName = b.name ? b.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : "?";
    const status = resolvedActions[req.loanId] || 'endorsed';

    return (
      <div key={req.loanId} className="bg-muted/10 border border-border/40 rounded-xl p-3.5 mb-3 flex items-center gap-3 opacity-60">
        <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center text-muted-foreground font-medium text-[11px] shrink-0 overflow-hidden">
          {b.selfieUrl ? (
            <img 
              src={b.selfieUrl} 
              className="w-full h-full object-cover" 
              alt={b.name} 
              onError={(e) => {
                (e.target as HTMLImageElement).src = "";
                (e.target as HTMLImageElement).classList.add('hidden');
              }}
            />
          ) : initialsName}
        </div>
        <div className="text-[13px] text-foreground font-bold">
          {b.name} · GHS {req.amount.toLocaleString()}
        </div>
        <div className={cn(
          "ml-auto text-[11px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider",
          status === 'endorsed' ? "bg-[#EAF3DE] dark:bg-emerald-950/40 text-[#3B6D11] dark:text-emerald-400" : "bg-[#FCEBEB] dark:bg-red-950/40 text-[#A32D2D] dark:text-red-400"
        )}>
          {status}
        </div>
      </div>
    );
  }
}
