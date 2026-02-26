import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Clock, Check, Loader2, AlertCircle, X } from "lucide-react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

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
  loanReference: string;
  applicantName: string;
  applicantPhone: string;
  amount: number;
  tenureDays?: number; // Might not be returned by API anymore, but keep as optional
  status?: string;
  appliedAt: string;
  purpose: string;
}

export default function AgentEndorsementsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Reject Dialog State
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Fetch pending endorsements
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ["agent-endorsements", user?.id],
    queryFn: async () => {
      const res = await api.get("/api/agents/pending-endorsements");
      return res.data;
    },
    enabled: !!user?.id,
  });

  const endorsements: EndorsementRequest[] = response?.endorsements || response?.data || response?.loans || [];

  // Approve Endorsement Mutation
  const approveMutation = useMutation({
    mutationFn: async (loanId: string) => {
      const res = await api.post(`/api/agents/endorsements/${loanId}/approve`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Loan endorsed successfully! Sent to Admin for review.");
      queryClient.invalidateQueries({ queryKey: ["agent-endorsements"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to endorse loan.");
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
    onSuccess: () => {
      toast.success("Loan endorsement rejected.");
      setRejectId(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["agent-endorsements"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reject loan.");
    },
    onSettled: () => {
      setProcessingId(null);
    }
  });

  const handleRejectConfirm = () => {
    if (!rejectId) return;
    setProcessingId(rejectId);
    rejectMutation.mutate({ loanId: rejectId, reason: rejectReason.trim() });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-md" />
        <div className="h-64 bg-muted rounded-xl" />
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6 text-purple-600" />
            Pending Endorsements
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and endorse first-time loans for users in your network.
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1.5 text-sm font-medium bg-purple-500/10 text-purple-600 border-purple-500/20">
          {endorsements.length} Pending requests
        </Badge>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        {endorsements.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <p className="text-lg font-semibold text-foreground">All Caught Up</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              You have no pending loan endorsements to review right now. When users use your Node Code to apply for their first loan, they will appear here.
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold text-muted-foreground">Borrower</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Contact</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Requested Amount</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Purpose</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Date Applied</TableHead>
                  <TableHead className="text-right font-semibold text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {endorsements.map((req) => (
                  <TableRow key={req.loanId} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      {req.applicantName || "Unknown"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {req.applicantPhone || "N/A"}
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-lg">₵{Number(req.amount).toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      {req.purpose || "N/A"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {req.appliedAt ? format(new Date(req.appliedAt), "dd MMM yyyy, h:mm a") : "N/A"}
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setRejectId(req.loanId);
                            setRejectReason("");
                        }}
                        disabled={processingId === req.loanId}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        title="Decline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleApprove(req.loanId)}
                        disabled={processingId === req.loanId}
                        className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-200"
                        title="Approve"
                      >
                        {processingId === req.loanId && !rejectId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
      
      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-start gap-4 text-blue-800">
        <Info className="w-6 h-6 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Why do I need to endorse these?</p>
          <p className="text-sm opacity-90 max-w-3xl leading-relaxed">
            As a Node Owner, you are vouching for the trustworthiness of your network. First-time borrowers must be endorsed by their referring node before the admin will review their application. Once you endorse their first loan, future loans will be automatically sent to the admin. Note that you are taking partial responsibility for guiding their repayment.
          </p>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Decline Endorsement</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this loan endorsement? 
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Input
                id="reason"
                placeholder="e.g. I do not know this person"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="h-12 border-gray-200 focus-visible:ring-red-500 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 pb-2">
            <Button
              variant="outline"
              onClick={() => setRejectId(null)}
              className="h-12 w-full sm:w-auto rounded-xl border-gray-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectConfirm}
              disabled={!!processingId}
              className="h-12 w-full sm:w-auto rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200"
            >
              {processingId ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Confirm Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
