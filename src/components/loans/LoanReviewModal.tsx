import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

interface LoanReviewModalProps {
  loan: any | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const tierColors: Record<string, string> = {
  L1: "bg-muted text-muted-foreground",
  L2: "bg-info/10 text-info",
  L3: "bg-primary/10 text-primary",
  L4: "bg-success/10 text-success",
  L5: "bg-warning/10 text-warning",
};

export function LoanReviewModal({ loan, isOpen, onOpenChange }: LoanReviewModalProps) {
  const queryClient = useQueryClient();

  const loanId = loan?.id || loan?._id;
  const userId = loan?.userId || loan?.user?.id || (typeof loan?.user === 'string' ? null : loan?.user?._id);

  // Fetch full user details to get Node Code if missing
  const { data: userResponse } = useQuery({
    queryKey: ["loan-user-details", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await api.get(`/api/admin/users/profile/${userId}`);
      return res.data;
    },
    enabled: !!userId && isOpen,
  });

  const userDetails = userResponse?.data?.user || userResponse?.data || userResponse || {};
  // Prioritize fetched personalNodeCode -> fetched nodeCode -> loan prop nodeCode -> N/A
  const displayNodeCode = userDetails.personalNodeCode || userDetails.nodeCode || loan?.nodeCode || "N/A";

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/admin/loans/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Loan approved successfully");
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["loans"] }); 
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["loans-count"] }); 
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to approve loan");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/admin/loans/${id}/reject`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Loan rejected");
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["loans-count"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reject loan");
    },
  });

  if (!loan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <>
            <DialogHeader>
              <DialogTitle>Review Loan Application</DialogTitle>
            <DialogDescription>
                Loan Reference: <span className="font-mono text-primary font-bold">{loan.loanReference || loan.reference || loan.id}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Applicant Info */}
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{loan.user?.fullName || loan.user || "Unknown User"}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{loan.userMsisdn || loan.phone}</span>
                    <Badge variant="outline" className={tierColors[`L${loan.tier}`] || tierColors.L1}>
                      Tier {loan.tier}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                       {loan.userStatus || "Node"} User
                    </Badge>
                    <span className="text-xs text-muted-foreground">Code: {displayNodeCode}</span>
                  </div>
                </div>
              </div>

              {/* Application Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg space-y-1">
                  <p className="text-sm text-muted-foreground">Request Amount</p>
                  <p className="text-xl font-bold">₵{(loan.principal || loan.amount || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 border rounded-lg space-y-1">
                   <p className="text-sm text-muted-foreground">Tenor</p>
                   <p className="text-xl font-bold">{loan.tenure || loan.tenor || loan.tenureDays || "N/A"}</p>
                </div>
                <div className="p-4 border rounded-lg space-y-1">
                   <p className="text-sm text-muted-foreground">Repayment Date</p>
                   <p className="text-lg font-medium">
                     {(loan.dueDate || loan.repaymentDate) 
                       ? new Date(loan.dueDate || loan.repaymentDate).toLocaleDateString("en-GB", {
                           day: "numeric",
                           month: "short",
                           year: "numeric"
                         })
                       : "N/A"}
                   </p>
                </div>
                 <div className="p-4 border rounded-lg space-y-1">
                   <p className="text-sm text-muted-foreground">Credit Score</p>
                   <p className="text-lg font-medium text-green-600">{loan.creditScore || "-"}</p>
                </div>
              </div>

               {/* History  */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">No. Loans to Date</p>
                    <p className="font-medium">{loan.loansToDate || 0}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Repayment Rate</p>
                    <p className="font-medium">{loan.repaymentRate || 100}%</p>
                 </div>
              </div>

            </div>
            {(!loan.status || loan.status.toUpperCase() === "PENDING") && (
              <DialogFooter className="gap-2 sm:gap-0">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => rejectMutation.mutate(loanId!)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? "Rejecting..." : (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Reject Application
                    </>
                  )}
                </Button>
                <Button 
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                  onClick={() => approveMutation.mutate(loanId!)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {approveMutation.isPending ? "Approving..." : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Approve Loan
                    </>
                  )}
                </Button>
            </DialogFooter>
          )}
        </>
      </DialogContent>
    </Dialog>
  );
}
