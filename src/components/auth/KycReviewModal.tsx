import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, User, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SecureKycImage } from "@/components/common/SecureKycImage";
import { LoanReviewModal } from "@/components/loans/LoanReviewModal";

interface KycReviewModalProps {
  readonly user: any;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function KycReviewModal({ user, isOpen, onClose }: KycReviewModalProps) {
  const [isApproving, setIsApproving] = useState(false);
  const queryClient = useQueryClient();

  const [kycSuccessState, setKycSuccessState] = useState<{show: boolean, loanId?: string, amount?: number, rawLoan?: any}>({show: false});
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKycSuccessState({show: false});
      setSelectedLoan(null);
    }
  }, [isOpen]);

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.patch(`/api/admin/users/approve/${userId}`);
      return res.data;
    },
    onSuccess: async () => {
      toast.success("User Verified! 🎉", {
        description: "User identity approved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-users-count"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      
      // Check if user has a pending loan to prompt CTA
      try {
        const idToFetch = user._id || user.id;
        const userDetailsRes = await api.get(`/api/admin/users/${idToFetch}`);
        const loanHistory = userDetailsRes.data?.data?.loanHistory || [];
        const pendingLoan = loanHistory.find((l: any) => l.status === 'PENDING' || l.status === 'pending');
        
        if (pendingLoan) {
          setKycSuccessState({
            show: true,
            loanId: pendingLoan._id || pendingLoan.id,
            amount: pendingLoan.principal || pendingLoan.amountBorrowed,
            rawLoan: pendingLoan
          });
          return; // Prevent closing the modal so we can show CTA
        }
      } catch(err) {
        console.error("Could not fetch user details for pending loans", err);
      }
      onClose();
    },
    onError: (error: any) => {
      toast.error("Approval Failed", {
        description: error.response?.data?.message || "Could not approve user",
      });
    },
  });

  const handleApprove = async () => {
    if (!user?._id && !user?.id) return;
    setIsApproving(true);
    try {
      await approveMutation.mutateAsync(user._id || user.id);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = () => {
    toast.info("Rejection feature coming soon");
    onClose();
  };

  if (!user) return null;

  const getKycStatusBadgeClass = (status: string) => {
    if (status === "PENDING") {
      return "bg-yellow-500/10 text-yellow-700 border-yellow-500/30";
    }
    if (status === "VERIFIED") {
      return "bg-green-500/10 text-green-700 border-green-500/30";
    }
    return "bg-red-500/10 text-red-700 border-red-500/30";
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">KYC Verification Review</DialogTitle>
          <DialogDescription>
            Review identity documents and approve or reject this user
          </DialogDescription>
        </DialogHeader>

        {kycSuccessState.show ? (
          <div className="space-y-6 py-8 text-center animate-fade-in">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-200">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">KYC Approved</h3>
            <div className="max-w-md mx-auto space-y-4">
               <p className="text-gray-500 text-sm">
                 This user has a pending loan application waiting for review.
               </p>
               <div className="p-4 rounded-xl bg-muted/50 border border-border inline-block min-w-[200px]">
                 <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Loan Amount</p>
                 <p className="text-2xl font-mono font-black">GHS {kycSuccessState.amount}</p>
               </div>
            </div>
            <div className="flex justify-center gap-4 mt-8 pt-4">
              <Button variant="outline" onClick={onClose} size="lg" className="rounded-xl px-6">
                Maybe Later
              </Button>
              <Button 
                size="lg"
                className="rounded-xl px-6 bg-[#085041] hover:bg-[#0F6E56] text-white shadow-md border border-[#0F6E56] font-bold"
                onClick={() => setSelectedLoan(kycSuccessState.rawLoan)}
              >
                Review Pending Loan
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {/* User Info Section */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-lg">{user.fullName || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>📱 {user.msisdn || "N/A"}</span>
                      <span>📧 {user.email || "N/A"}</span>
                    </div>
                  </div>
                  <Badge
                    className={getKycStatusBadgeClass(user.kycStatus || "PENDING")}
                  >
                    {user.kycStatus || "PENDING"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Region</p>
                      <p className="text-sm font-medium">{user.region || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date of Birth</p>
                      <p className="text-sm font-medium">
                        {user.dateOfBirth
                          ? new Date(user.dateOfBirth).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Referred By</p>
                      <p className="text-sm font-medium font-mono">
                        {user.referredByNodeCode || "Direct"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Identity Documents */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Identity Documents</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Selfie */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Selfie Photo</p>
                    <SecureKycImage imageUrl={user.kycSelfieUrl} label="User Selfie" className="aspect-square" />
                  </div>

                  {/* Ghana Card Front */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Ghana Card (Front)</p>
                    <SecureKycImage imageUrl={user.kycGhanaCardFrontUrl} label="Ghana Card Front" className="aspect-square" />
                  </div>

                  {/* Ghana Card Back */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Ghana Card (Back)</p>
                    <SecureKycImage imageUrl={user.kycGhanaCardBackUrl} label="Ghana Card Back" className="aspect-square" />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={handleReject}
                className="border-red-500 text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isApproving || user.kycStatus === "VERIFIED"}
                className="bg-green-600 hover:bg-green-700"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Identity
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
    {selectedLoan && (
      <LoanReviewModal
        loan={selectedLoan}
        isOpen={!!selectedLoan}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setSelectedLoan(null);
            onClose(); // Automatically close the KYC modal as well
          }
        }}
      />
    )}
    </>
  );
}
