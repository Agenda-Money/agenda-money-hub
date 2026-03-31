import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ShieldAlert, CreditCard, Ban, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ActionCenterProps {
  userId: string;
  kycStatus: "pending" | "verified" | "rejected" | "failed";
  hasActiveLoan: boolean;
  isBlocked: boolean;
  onApproveLoan: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  isLoading?: boolean;
}

export function ActionCenter({
  kycStatus,
  hasActiveLoan,
  isBlocked,
  onApproveLoan,
  onBlock,
  onUnblock,
  isLoading = false,
}: ActionCenterProps) {
  const { canWrite } = useAuth();
  const canApproveLoan = kycStatus === "verified" && !hasActiveLoan;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 lg:static lg:z-auto"
    >
      <div className="bg-card/95 backdrop-blur-lg border-t lg:border lg:rounded-xl shadow-lg lg:shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 lg:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Left side - Status info */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Quick Actions</span>
              </div>
              <div className="h-6 w-px bg-border" />
              <span className="text-sm text-muted-foreground">
                KYC: <span className={cn(
                  "font-medium",
                  kycStatus === "verified" && "text-success",
                  kycStatus === "pending" && "text-warning",
                  kycStatus === "rejected" && "text-destructive"
                )}>{kycStatus.toUpperCase()}</span>
              </span>
            </div>

            {canWrite && (
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {/* Loan Approval - only if KYC verified */}
                <Button
                  size="sm"
                  onClick={() => {
                    if (!canApproveLoan) {
                      if (kycStatus !== "verified") {
                        toast.error("KYC must be verified before approving loans");
                      } else if (hasActiveLoan) {
                        toast.error("User already has an active loan");
                      }
                      return;
                    }
                    onApproveLoan();
                  }}
                  disabled={isLoading || !canApproveLoan}
                  className={cn(
                    "transition-all",
                    canApproveLoan 
                      ? "bg-primary hover:bg-primary/90" 
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <CreditCard className="h-4 w-4 mr-1.5" />
                  Approve Loan
                </Button>

                <div className="h-6 w-px bg-border hidden sm:block" />

                {/* Block/Unblock User */}
                <Button
                  variant={isBlocked ? "default" : "destructive"}
                  size="sm"
                  onClick={isBlocked ? onUnblock : onBlock}
                  disabled={isLoading}
                  className={isBlocked ? "bg-success hover:bg-success/90" : ""}
                >
                  {isBlocked ? (
                    <>
                      <Unlock className="h-4 w-4 mr-1.5" />
                      Unblock User
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4 mr-1.5" />
                      Block User
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
