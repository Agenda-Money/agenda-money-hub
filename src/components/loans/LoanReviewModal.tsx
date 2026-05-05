import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, RefreshCcw, User, X, Clock, AlertTriangle, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { 
  getAdminUserProfile, 
  approveLoan, 
  rejectLoan, 
  syncLoanTransfer,
  resolveMomoName
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn, deduplicateWords } from "@/lib/utils";

type LoanReviewUser = {
  fullName?: string;
  id?: string;
  _id?: string;
  kycStatus?: string;
  selfieUrl?: string;
  currentTier?: string | number;
  endorsedAt?: string;
  totalLoans?: number;
  totalLoansRepaid?: number;
  totalLoansTaken?: number;
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
  totalLoans?: number;
  totalLoansRepaid?: number;
  totalLoansTaken?: number;
  referredBy?: {
    agentId?: string;
    name?: string;
    code?: string;
  };
  kycStatus?: string;
  selfieUrl?: string;
  guaranteedBy?: string;
  guaranteedByName?: string;
  guaranteedByMsisdn?: string;
  guaranteedAt?: string;
  guarantorApprovedAt?: string;
  createdAt?: string;
  loanDetails?: any;
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
  // High Tiers (L6-L10)
  L6: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  L7: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  L8: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  L9: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  L10: "bg-emerald-600 text-white font-bold",
  // Elite Tiers (L11-L20)
  L11: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  L12: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  L13: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  L14: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  L15: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  L16: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  L17: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  L18: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  L19: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  L20: "bg-slate-900 text-white font-black shadow-lg",
};

export function LoanReviewModal({ loan, isOpen, onOpenChange }: Readonly<LoanReviewModalProps>) {
  const queryClient = useQueryClient();
  const { canWrite } = useAuth();
  const [momoCheck, setMomoCheck] = useState<{ resolvedName: string | null; registeredName: string; match: boolean; score: number; cached?: boolean; error?: string } | null>(null);
  const [momoCheckLoading, setMomoCheckLoading] = useState(false);

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
      const res = await getAdminUserProfile(userId);
      return res;
    },
    enabled: !!userId && isOpen,
  });

  const userDetails = userResponse?.data?.user || userResponse?.data || userResponse || {};
  const activeFlag = userDetails?.flags?.slice(-1)[0] || (loanUser as any)?.flags?.slice(-1)[0] || null;
  
  const actualLoan = loan?.loanDetails || loan;
  const displayNodeCode = userDetails.personalNodeCode || userDetails.nodeCode || actualLoan?.nodeCode || "N/A";
  const rawTier = userDetails?.currentTier || loanUser?.currentTier || actualLoan?.tier || 1;
  const tierNum = typeof rawTier === "string" ? rawTier.replace(/\D/g, "") || "1" : rawTier;
  const displayTier = `Tier ${tierNum}`;
  const displayTierKey = `L${tierNum}`;
  const kycStatus = (userDetails?.kycStatus || loan?.kycStatus || loanUser?.kycStatus || userDetails?.onboardingData?.kycStatus || userDetails?.kyc?.status || "Unknown") as string;
  const status = (loan?.status || "PENDING").toString().toUpperCase();
  const isPending = status === "PENDING";
  const isDisbursing = status === "DISBURSING";
  const isAwaitingEndorsement = status === "AWAITING_ENDORSEMENT";

  useEffect(() => {
    if (isOpen && loanId && isPending) {
      const fetchMomo = async () => {
        setMomoCheckLoading(true);
        try {
          const res = await resolveMomoName(loanId);
          setMomoCheck(res.data || res);
        } catch (err: any) {
          console.error("MoMo Check Error for loan", loanId, ":", err);
          const errorMsg = err.response?.data?.message || err.message || "Failed to verify";
          setMomoCheck({ resolvedName: null, registeredName: "", match: false, score: 0, error: errorMsg });
        } finally {
          setMomoCheckLoading(false);
        }
      };
      fetchMomo();
    } else if (!isOpen) {
      setMomoCheck(null);
      setMomoCheckLoading(false);
    }
  }, [isOpen, loanId, isPending]);

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
    mutationFn: (id: string) => approveLoan(id),
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
    mutationFn: (id: string) => rejectLoan(id),
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
    mutationFn: (id: string) => syncLoanTransfer(id),
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
                <p className="text-lg font-semibold text-foreground">{deduplicateWords(loanUser?.fullName || userNameString || "Unknown User")}</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">{loan.userMsisdn || loan.phone}</p>
                  {actualLoan?.referredBy?.name && (
                    <Badge variant="secondary" className="px-2 py-0 h-5 text-[10px] bg-primary/10 text-primary border-primary/20 uppercase font-black">
                      Ref by: {actualLoan.referredBy.name}
                    </Badge>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={tierColors[displayTierKey] || tierColors.L1}>
                {displayTier}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={cn(
                "text-xs",
                (userDetails?.role === 'NODE' || userDetails?.isGraduatedNode) ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"
              )}>
                {(userDetails?.role === 'NODE' || userDetails?.isGraduatedNode) ? "Node User" : "Edge User"}
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
            {activeFlag && (
              <div className={cn(
                "rounded-xl border p-4 text-sm font-medium flex flex-col gap-2 shadow-sm animate-fade-in",
                activeFlag.level === 'high' 
                  ? "border-red-200 bg-red-50 text-red-900 dark:bg-red-900/10 dark:border-red-800"
                  : "border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-900/10 dark:border-amber-800"
              )}>
                <div className="flex items-center gap-2 uppercase tracking-widest text-[#000] font-black text-[11px]">
                  <ShieldAlert className={activeFlag.level === 'high' ? "text-red-600" : "text-amber-600"} size={16} />
                  <span className={activeFlag.level === 'high' ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}>
                    {activeFlag.level} Severity User Flag
                  </span>
                </div>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-relaxed max-w-[90%] pl-6">
                  {activeFlag.reason}
                </p>
                {activeFlag.adminName && (
                  <p className="text-[10px] text-gray-500 pl-6 mt-1 font-mono uppercase">
                    By: {activeFlag.adminName}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/60 p-4">
              <p className="text-sm font-semibold text-muted-foreground mb-3">KYC Verification</p>
              <Badge variant="outline" className={kycBadgeClass}>
                {kycStatus}
              </Badge>
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
                      {(loan.guaranteedAt || (loan as any).endorsedAt || loan.guarantorApprovedAt || (loan as any).guaranteedDate || (loan as any).endorsedOn || (loan as any).guaranteedOn || userDetails?.guaranteedAt || userDetails?.endorsedAt)
                        ? new Date(loan.guaranteedAt || (loan as any).endorsedAt || loan.guarantorApprovedAt || (loan as any).guaranteedDate || (loan as any).endorsedOn || (loan as any).guaranteedOn || userDetails?.guaranteedAt || userDetails?.endorsedAt).toLocaleDateString("en-GB", {
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

            {isPending && (
              <div className="space-y-4">
                {momoCheckLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying MoMo name…
                  </div>
                ) : momoCheck ? (
                  momoCheck.resolvedName === null || momoCheck.error ? (
                    <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning font-medium flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Could not verify MoMo name — proceed with caution</span>
                      </div>
                      {momoCheck.error && (
                        <p className="text-xs opacity-80 pl-6 border-l border-warning/30 ml-2 italic">
                          Error: {momoCheck.error}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className={cn(
                      "rounded-xl border-l-4 p-4 space-y-3",
                      momoCheck.match 
                        ? "border-emerald-500 bg-emerald-500/5 shadow-sm shadow-emerald-500/5" 
                        : "border-amber-500 bg-amber-500/5 shadow-sm shadow-amber-500/5"
                    )}>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground font-medium">KYC name</span>
                          <span className="text-foreground font-bold">{deduplicateWords(momoCheck.registeredName)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                            MoMo name
                            {momoCheck.cached && (
                              <span className="text-[10px] text-muted-foreground font-normal italic lowercase">(cached)</span>
                            )}
                          </span>
                          <span className="text-foreground font-bold">{momoCheck.resolvedName}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn(
                         "font-bold py-0.5 px-2 text-[10px] uppercase tracking-wider",
                         momoCheck.match 
                           ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                           : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      )}>
                        {momoCheck.match ? "✓ Names match" : "⚠ Names differ"}
                      </Badge>
                      {!momoCheck.match && (
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider pl-1">Review carefully before approving</p>
                      )}
                    </div>
                  )
                ) : null}
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
                  <p className="text-sm text-muted-foreground">
                    {(isPending || isAwaitingEndorsement) ? "Requested Date" : "Repayment Date"}
                  </p>
                  <p className="text-lg font-medium">
                    {((isPending || isAwaitingEndorsement) ? loan.createdAt : (loan.dueDate || loan.repaymentDate))
                      ? new Date((isPending || isAwaitingEndorsement) ? loan.createdAt! : (loan.dueDate || loan.repaymentDate)!).toLocaleDateString("en-GB", {
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
                <p className="font-medium">
                  {userDetails?.totalLoans ?? 
                   userDetails?.totalLoansRepaid ?? 
                   userDetails?.totalLoansTaken ?? 
                   loanUser?.totalLoans ?? 
                   loanUser?.totalLoansRepaid ?? 
                   loanUser?.totalLoansTaken ?? 
                   actualLoan?.totalLoans ?? 
                   actualLoan?.totalLoansRepaid ?? 
                   actualLoan?.totalLoansTaken ?? 
                   actualLoan?.loansToDate ?? 0}
                </p>
              </div>
              {Number(tierNum) >= 2 && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Guaranteed By</p>
                  <p className="font-medium">{actualLoan?.guaranteedByName || actualLoan?.guarantorName || "Pending Guarantor"}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Repayment Rate</p>
                <p className="font-medium">{loan.repaymentRate || 100}%</p>
              </div>
            </div>
          </div>

          {(isPending || isDisbursing || isAwaitingEndorsement) && canWrite && (
            <div className="sticky bottom-0 border-t border-border bg-background/95 p-6 backdrop-blur">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                {isAwaitingEndorsement ? (
                   <div className="flex w-full items-center justify-center p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 text-sm font-medium">
                     <Clock className="w-4 h-4 mr-2" />
                     Waiting for Node Endorsement before Admin Review
                   </div>
                ) : isDisbursing ? (
                  <Button
                    className="w-full bg-[#3b82f6] hover:bg-[#2563eb] transition-colors"
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
                      className={cn(
                        "w-full sm:w-auto transition-colors",
                        (momoCheck && !momoCheck.match) || (momoCheck && (momoCheck.resolvedName === null || momoCheck.error))
                          ? "bg-background border-2 border-amber-500/50 text-amber-600 hover:bg-amber-50/50"
                          : "bg-emerald-600 hover:bg-emerald-500"
                      )}
                      onClick={handleApprove}
                      disabled={approveMutation.isPending || rejectMutation.isPending || momoCheckLoading}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : momoCheckLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          {(momoCheck && !momoCheck.match) || (momoCheck && (momoCheck.resolvedName === null || momoCheck.error))
                            ? "Approve anyway"
                            : "Approve Loan"}
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
