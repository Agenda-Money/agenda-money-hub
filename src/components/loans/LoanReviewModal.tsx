import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, RefreshCcw, User, X, Clock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type LoanReviewUser = {
  fullName?: string;
  id?: string;
  _id?: string;
  kycStatus?: string;
  selfieUrl?: string;
  currentTier?: string | number;
};

type LoanReviewData = {
  id?: string;
  _id?: string;
  loanReference?: string;
  reference?: string;
  user?: LoanReviewUser | string;
  userId?: string;
  userMsisdn?: string;
  phone?: string;
  tier?: number | string;
  nodeCode?: string;
  userStatus?: string;
  status?: string;
  principal?: number;
  amount?: number;
  tenure?: string;
  tenor?: string;
  tenureDays?: number;
  dueDate?: string;
  repaymentDate?: string;
  creditScore?: number;
  loansToDate?: number;
  repaymentRate?: number;
  kycStatus?: string;
  selfieUrl?: string;
  guaranteedBy?: string;
  guaranteedByName?: string;
  guaranteedByMsisdn?: string;
  guaranteedAt?: string;
};

interface LoanReviewModalProps {
  loan: LoanReviewData | null;
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

export function LoanReviewModal({ loan, isOpen, onOpenChange }: Readonly<LoanReviewModalProps>) {
  const queryClient = useQueryClient();

  const loanId = loan?.id || loan?._id;
  // Normalize loan.user to avoid type errors when accessing properties
  const loanUser = typeof loan?.user === "string" ? undefined : loan?.user;
  const userNameString = typeof loan?.user === "string" ? loan.user : undefined;
  const userId = loan?.userId || loanUser?.id || loanUser?._id;

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
  const displayTier = loan?.tier || loanUser?.currentTier || userDetails?.currentTier || 1;
  const kycStatus = (loan?.kycStatus || loanUser?.kycStatus || userDetails?.kycStatus || userDetails?.onboardingData?.kycStatus || "Unknown") as string;
  const selfieUrl = loan?.selfieUrl || loanUser?.selfieUrl || userDetails?.selfieUrl || userDetails?.kyc?.selfieUrl || userDetails?.kycData?.selfieUrl || userDetails?.onboardingData?.selfieUrl || "";
  const status = (loan?.status || "PENDING").toString().toUpperCase();
  const isPending = status === "PENDING";
  const isDisbursing = status === "DISBURSING";
  const isAwaitingEndorsement = status === "AWAITING_ENDORSEMENT";

  const kycBadgeClass = (() => {
    const normalized = kycStatus.toLowerCase();
    if (normalized.includes("verified") || normalized.includes("approved")) return "bg-[#00e676]/15 text-[#00e676] border-[#00e676]/30";
    if (normalized.includes("rejected") || normalized.includes("failed")) return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    if (normalized.includes("pending") || normalized.includes("unknown")) return "bg-[#ffb300]/15 text-[#ffb300] border-[#ffb300]/30";
    return "bg-muted text-muted-foreground border-border";
  })();

  const creditScoreValue = loan?.creditScore ?? "-";
  const creditScoreClass = (() => {
    if (creditScoreValue === "-" || creditScoreValue === null || creditScoreValue === undefined) return "text-muted-foreground";
    const numericScore = Number(creditScoreValue);
    if (Number.isNaN(numericScore)) return "text-muted-foreground";
    if (numericScore < 400) return "text-rose-400";
    if (numericScore <= 700) return "text-[#ffb300]";
    return "text-[#00e676]";
  })();

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

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/payments/paystack/sync-transfer`, { loanId: id });
      return res.data;
    },
    onSuccess: (data) => {
      const responseCode = data?.responseCode || data?.data?.responseCode;
      const responseMessage = data?.responseMessage || data?.data?.responseMessage || "";

      if (responseCode === "01") {
        toast.success("Disbursement Successful! Loan is now Active.");
        queryClient.invalidateQueries({ queryKey: ["loans"] });
        queryClient.invalidateQueries({ queryKey: ["admin-loans"] });
        queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
        queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        queryClient.invalidateQueries({ queryKey: ["loans-count"] });
        onOpenChange(false);
        return;
      }

      if (responseCode === "100") {
        toast.warning(`Transaction Failed (Code 100): ${responseMessage}. Loan reverted to Pending.`);
      } else if (responseCode === "03") {
        toast.info("Uniwallet is still processing this transaction. Please wait a few minutes and try again.");
      } else {
        toast.info(responseMessage || "Status updated. Please refresh.");
      }

      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-loans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["loans-count"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to check transaction status");
    },
  });

  if (!loan) return null;

  const handleReject = () => {
    if (!loanId) return;
    rejectMutation.mutate(loanId);
  };

  const handleApprove = () => {
    if (!loanId) return;
    approveMutation.mutate(loanId);
  };

  const handleSync = () => {
    if (!loanId) return;
    syncMutation.mutate(loanId);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 border-l border-border bg-background/95 backdrop-blur-xl"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="space-y-2 border-b border-border p-6 text-left">
            <SheetTitle className="text-xl">Review Loan Application</SheetTitle>
            <SheetDescription>
              Loan Reference: <span className="font-mono text-primary font-bold">{loan.loanReference || loan.reference || loan.id}</span>
            </SheetDescription>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-foreground">{loanUser?.fullName || userNameString || "Unknown User"}</p>
                <p className="text-sm text-muted-foreground">{loan.userMsisdn || loan.phone}</p>
              </div>
              <Badge variant="outline" className={tierColors[`L${displayTier}`] || tierColors.L1}>
                Tier {displayTier}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {loan.userStatus || "Node"} User
              </Badge>
              <span className="text-xs text-muted-foreground">Code: {displayNodeCode}</span>
              {userId ? (
                <Link to={`/users/${userId}`} className="text-xs text-slate-400 hover:text-slate-300 hover:underline">
                  View Full Profile
                </Link>
              ) : null}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-14">
            <div className="rounded-xl border border-border bg-muted/60 p-4">
              <p className="text-sm font-semibold text-muted-foreground">Identity</p>
              <div className="mt-4 flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-xl bg-background flex items-center justify-center">
                  {selfieUrl ? (
                    <img src={selfieUrl} alt="Live selfie" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Live Selfie</p>
                  <Badge variant="outline" className={kycBadgeClass}>
                    KYC: {kycStatus}
                  </Badge>
                </div>
              </div>
            </div>

            {loan.guaranteedBy && (
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">Node Endorsement</p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Guarantor</p>
                    <p className="font-medium text-foreground">{loan.guaranteedByName || "Unknown"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Node Code</p>
                    <p className="font-medium">{loan.guaranteedBy}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Contact</p>
                    <p className="font-medium">{loan.guaranteedByMsisdn || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Endorsed On</p>
                    <p className="font-medium">
                      {loan.guaranteedAt
                        ? new Date(loan.guaranteedAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-sm font-semibold text-muted-foreground">Loan Terms</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Request Amount</p>
                  <p className="text-xl font-bold">₵{(loan.principal || loan.amount || 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tenor</p>
                  <p className="text-xl font-bold">{loan.tenure || loan.tenor || loan.tenureDays || "N/A"}</p>
                </div>
                <div className="space-y-1">
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
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Credit Score</p>
                  <p className={`text-lg font-medium ${creditScoreClass}`}>{creditScoreValue}</p>
                </div>
              </div>
            </div>

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

          {(isPending || isDisbursing || isAwaitingEndorsement) && (
            <div className="sticky bottom-0 border-t border-border bg-background/95 p-6 backdrop-blur">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                {isAwaitingEndorsement ? (
                   <div className="flex w-full items-center justify-center p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 text-sm font-medium">
                     <Clock className="w-4 h-4 mr-2" />
                     Waiting for Node Endorsement before Admin Review
                   </div>
                ) : isDisbursing ? (
                  <Button
                    className="w-full bg-[#3b82f6] hover:bg-[#2563eb] transition-colors animate-pulse"
                    onClick={handleSync}
                    disabled={syncMutation.isPending}
                  >
                    {syncMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing Status...
                      </>
                    ) : (
                      <>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Sync Transaction Status
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={handleReject}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      {rejectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="mr-2 h-4 w-4" />
                          Reject Application
                        </>
                      )}
                    </Button>
                    <Button
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 transition-colors"
                      onClick={handleApprove}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Approve Loan
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
