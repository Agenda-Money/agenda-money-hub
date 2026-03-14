import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Clock, Check, Loader2, AlertCircle, X, Info, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

interface EndorsementRequest {
  loanId: string;
  loanReference: string;
  applicantName: string;
  applicantPhone: string;
  amount: number;
  tenureDays?: number;
  status?: string;
  appliedAt: string;
  purpose: string;
}

export default function AgentEndorsementsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ["agent-endorsements", user?.id],
    queryFn: async () => { const res = await api.get("/api/agents/pending-endorsements"); return res.data; },
    enabled: !!user?.id,
  });

  const endorsements: EndorsementRequest[] = response?.endorsements || response?.data || response?.loans || [];

  const approveMutation = useMutation({
    mutationFn: async (loanId: string) => { const res = await api.post(`/api/agents/endorsements/${loanId}/approve`); return res.data; },
    onSuccess: () => { toast.success("Loan endorsed!"); queryClient.invalidateQueries({ queryKey: ["agent-endorsements"] }); },
    onError: (error: any) => { toast.error(error.response?.data?.message || "Failed to endorse."); },
    onSettled: () => setProcessingId(null),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ loanId, reason }: { loanId: string; reason?: string }) => {
      const res = await api.post(`/api/agents/endorsements/${loanId}/reject`, reason ? { reason } : {});
      return res.data;
    },
    onSuccess: () => { toast.success("Endorsement declined."); setRejectId(null); setRejectReason(""); queryClient.invalidateQueries({ queryKey: ["agent-endorsements"] }); },
    onError: (error: any) => { toast.error(error.response?.data?.message || "Failed to reject."); },
    onSettled: () => setProcessingId(null),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-48 bg-muted rounded-md animate-pulse" />
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/20">
        <CardContent className="flex flex-col items-center justify-center p-10 text-center text-destructive">
          <AlertCircle className="h-8 w-8 mb-3" />
          <p className="font-semibold">Failed to load endorsements</p>
          <p className="text-sm opacity-80 mt-1">Please refresh the page.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Endorsements
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Review first-time loan applications</p>
        </div>
        <Badge variant="secondary" className="text-xs bg-warning/10 text-warning border-warning/20">
          {endorsements.length} Pending
        </Badge>
      </div>

      {/* Cards */}
      {endorsements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-3">
              <Check className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="font-semibold text-foreground">All Caught Up</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              No pending endorsements. When customers apply using your code, they'll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {endorsements.map((req, index) => (
            <motion.div
              key={req.loanId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-pink flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                        {req.applicantName?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{req.applicantName || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{req.applicantPhone || "N/A"}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-lg font-bold text-foreground">₵{Number(req.amount).toLocaleString()}</span>
                          <Badge variant="outline" className="text-[10px]">{req.purpose || "N/A"}</Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {req.appliedAt ? format(new Date(req.appliedAt), "dd MMM yyyy") : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setRejectId(req.loanId); setRejectReason(""); }}
                        disabled={processingId === req.loanId}
                        className="h-9 px-3 border-destructive/20 text-destructive hover:bg-destructive/5 rounded-lg"
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => { setProcessingId(req.loanId); approveMutation.mutate(req.loanId); }}
                        disabled={processingId === req.loanId}
                        className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                      >
                        {processingId === req.loanId && !rejectId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" /> Endorse</>}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-3.5 flex items-start gap-3">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
        <div className="space-y-0.5">
          <p className="font-semibold text-xs text-foreground">Why endorse?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            You're vouching for first-time borrowers. Once endorsed, the admin reviews the application. Future loans skip this step.
          </p>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent className="sm:max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Decline Endorsement</DialogTitle>
            <DialogDescription className="text-xs">This will reject the loan application.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-3">
            <Label className="text-xs text-muted-foreground">Reason (Optional)</Label>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. I don't know this person" className="h-11 rounded-xl" />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setRejectId(null)} className="h-10 rounded-xl">Cancel</Button>
            <Button
              onClick={() => { if (rejectId) { setProcessingId(rejectId); rejectMutation.mutate({ loanId: rejectId, reason: rejectReason.trim() }); } }}
              disabled={!!processingId}
              className="h-10 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {processingId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
