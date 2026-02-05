import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, CreditCard, Ban, Unlock, Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ActionCenterProps {
  userId: string;
  kycStatus: "pending" | "verified" | "rejected";
  hasActiveLoan: boolean;
  isBlocked: boolean;
  onApproveKyc: () => void;
  onRejectKyc: () => void;
  onApproveLoan: () => void;
  onToggleBlock: () => void;
  isLoading?: boolean;
}

export function ActionCenter({
  kycStatus,
  hasActiveLoan,
  isBlocked,
  onApproveKyc,
  onRejectKyc,
  onApproveLoan,
  onToggleBlock,
  isLoading = false
}: ActionCenterProps) {
  const canApproveLoan = kycStatus === "verified" && !hasActiveLoan;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 lg:static lg:z-auto"
    >
      <div className="bg-card/95 backdrop-blur-xl border-t lg:border lg:rounded-xl shadow-xl lg:shadow-md">
        <div className="max-w-7xl mx-auto px-3 py-3 lg:px-6 lg:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Status Info - Desktop only */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-5 w-5" />
                <span className="text-sm font-semibold">Quick Actions</span>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">KYC Status:</span>
                <span className={cn(
                  "text-sm font-bold uppercase",
                  kycStatus === "verified" && "text-success",
                  kycStatus === "pending" && "text-warning",
                  kycStatus === "rejected" && "text-destructive"
                )}>
                  {kycStatus}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 justify-between lg:justify-end w-full lg:w-auto">
              {/* KYC Actions - Only show if pending */}
              {kycStatus === "pending" && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRejectKyc}
                    disabled={isLoading}
                    className="h-9 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-1.5" />
                        <span className="hidden sm:inline">Reject</span> KYC
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={onApproveKyc}
                    disabled={isLoading}
                    className="h-9 bg-success hover:bg-success/90 text-success-foreground shadow-md"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        <span className="hidden sm:inline">Approve</span> KYC
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Verified state - show loan approval */}
              {kycStatus === "verified" && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (!canApproveLoan) {
                      toast.error("User already has an active loan");
                      return;
                    }
                    onApproveLoan();
                  }}
                  disabled={isLoading || !canApproveLoan}
                  className={cn(
                    "h-9 shadow-md transition-all",
                    canApproveLoan 
                      ? "bg-gradient-pink hover:opacity-90" 
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <CreditCard className="h-4 w-4 mr-1.5" />
                  {hasActiveLoan ? "Has Active Loan" : "Approve Loan"}
                </Button>
              )}

              {/* Rejected state - show re-request option */}
              {kycStatus === "rejected" && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <XCircle className="h-4 w-4" />
                  <span>KYC Rejected</span>
                </div>
              )}

              <div className="h-6 w-px bg-border hidden sm:block" />

              {/* Block/Unblock User */}
              <Button
                variant={isBlocked ? "default" : "destructive"}
                size="sm"
                onClick={onToggleBlock}
                disabled={isLoading}
                className={cn(
                  "h-9",
                  isBlocked && "bg-success hover:bg-success/90 text-success-foreground"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isBlocked ? (
                  <>
                    <Unlock className="h-4 w-4 mr-1.5" />
                    Unblock
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4 mr-1.5" />
                    Block
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
