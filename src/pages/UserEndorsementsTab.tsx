import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Clock, Check, Loader2, AlertCircle, ArrowLeft, Info, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useApplicant } from "@/contexts/ApplicantContext";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

interface UserEndorsementsTabProps {
  onBack: () => void;
}

export const UserEndorsementsTab: React.FC<UserEndorsementsTabProps> = ({ onBack }) => {
  const { applicant } = useApplicant();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Reject Dialog State
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Fallback to various ID formats the applicant context might hold
  const applicantId = applicant?._id || applicant?.id || applicant?.userId;

  // Fetch pending endorsements for graduated users
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ["user-endorsements", applicantId],
    queryFn: async () => {
      const res = await api.get("/api/users/pending-endorsements");
      return res.data;
    },
    enabled: !!applicantId,
  });

  const endorsements: EndorsementRequest[] = response?.endorsements || response?.data || response?.loans || [];

  // Approve Endorsement Mutation
  const approveMutation = useMutation({
    mutationFn: async (loanId: string) => {
      const res = await api.post(`/api/users/endorsements/${loanId}/approve`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Loan endorsed successfully! Sent to Admin for review.");
      queryClient.invalidateQueries({ queryKey: ["user-endorsements"] });
    },
    onError: (error: any) => {
      if (error.response?.status === 403) {
         toast.error("You'll unlock this feature after repaying 5 loans!", {
            action: {
              label: "Go Back",
              onClick: () => onBack()
            }
         });
      } else {
         toast.error(error.response?.data?.message || "Failed to endorse loan.");
      }
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
      const res = await api.post(`/api/users/endorsements/${loanId}/reject`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Loan endorsement rejected.");
      setRejectId(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["user-endorsements"] });
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 pb-32">
      <div className="flex items-center gap-3 pt-6 px-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 shrink-0 bg-white shadow-sm border border-gray-100 rounded-full">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-wide">Endorsements</h2>
          <p className="text-sm text-gray-500">Approve network loans</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-32 bg-gray-100 rounded-2xl" />
            <div className="h-32 bg-gray-100 rounded-2xl" />
          </div>
        ) : isError ? (
          <Card className="border-red-500/20 bg-red-500/5 rounded-2xl shadow-sm">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center text-red-500">
              <AlertCircle className="h-8 w-8 mb-3" />
              <p className="font-semibold">
                {((response as any)?.status === 403 || (response as any)?.message?.includes('403')) 
                  ? "You'll unlock this feature after repaying 5 loans!" 
                  : "Failed to load data"
                }
              </p>
            </CardContent>
          </Card>
        ) : endorsements.length === 0 ? (
           <Card className="border-gray-100 bg-white rounded-2xl shadow-sm">
             <CardContent className="flex flex-col items-center justify-center p-10 text-center">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                 <Check className="h-8 w-8 text-gray-300" />
               </div>
               <p className="text-lg font-bold text-gray-900">All Caught Up</p>
               <p className="text-sm text-gray-500 mt-2">
                 You have no pending loan endorsements to review right now.
               </p>
             </CardContent>
           </Card>
        ) : (
          <div className="space-y-4">
            {endorsements.map((req) => (
              <Card key={req.loanId} className="border-gray-100 bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex justify-between items-start">
                   <div>
                      <p className="font-bold text-gray-900 text-lg">{req.applicantName || "Unknown"}</p>
                      <p className="text-sm text-gray-500">{req.applicantPhone || "N/A"}</p>
                   </div>
                   <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-100">
                      Pending
                   </Badge>
                </div>
                <div className="bg-gray-50/50 p-4 grid grid-cols-2 gap-4">
                   <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Amount</p>
                      <p className="font-bold text-gray-900">₵{Number(req.amount).toLocaleString()}</p>
                   </div>
                   <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Purpose</p>
                      <p className="font-bold text-gray-900">{req.purpose || "N/A"}</p>
                   </div>
                   <div className="col-span-2">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Requested</p>
                      <p className="text-sm text-gray-700">{req.appliedAt ? format(new Date(req.appliedAt), "dd MMM yyyy, h:mm a") : "N/A"}</p>
                   </div>
                </div>
                <div className="p-4 bg-white border-t border-gray-50 flex gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => {
                        setRejectId(req.loanId);
                        setRejectReason("");
                    }}
                    disabled={processingId === req.loanId}
                    className="flex-1 h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold"
                  >
                    Decline
                    <X className="w-5 h-5 ml-2" />
                  </Button>
                  <Button 
                    onClick={() => handleApprove(req.loanId)}
                    disabled={processingId === req.loanId}
                    className="flex-1 h-12 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-200"
                  >
                    {processingId === req.loanId && !rejectId ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Approve
                        <Check className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-start gap-4 mt-8">
           <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
           <p className="text-sm text-blue-800 leading-relaxed font-medium">
             As a Graduated user, you vouch for people who sign up with your code. Endorsing their first loan allows them to be reviewed by admins.
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
};
