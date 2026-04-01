import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, CreditCard, CheckCircle2, XCircle, Clock, AlertCircle, Camera, IdCard, Maximize2, Lock } from "lucide-react";
import { cn, deduplicateWords } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { SecureKycImage } from "@/components/common/SecureKycImage";

interface IdentityKycSectionProps {
  userId: string;
  userData: {
    selfieUrl?: string;
    ghanaCardFrontUrl?: string;
    ghanaCardBackUrl?: string;
    fullName: string;
    momoName?: string;
    ghanaCardName?: string;
    nodeConsentStatus?: "awaiting" | "accepted" | "declined";
    kycStatus?: "pending" | "verified" | "rejected" | "failed";
    ghanaCardNumber?: string;
  };
  onVerifyKyc?: (reason: string) => void;
  onSoftRejectKyc?: (reason: string) => void;
  onHardFailKyc?: (reason: string) => void;
  onRestoreKyc?: (reason: string) => void;
  isLoading?: boolean;
}

const KycStatusBadge = ({ status }: { status: string }) => {
  const config = {
    pending: {
      bg: "bg-warning/15",
      text: "text-warning",
      border: "border-warning/30",
      icon: Clock,
      label: "PENDING"
    },
    verified: {
      bg: "bg-success/15",
      text: "text-success",
      border: "border-success/30",
      icon: CheckCircle2,
      label: "VERIFIED"
    },
    rejected: {
      bg: "bg-destructive/15",
      text: "text-destructive",
      border: "border-destructive/30",
      icon: XCircle,
      label: "REJECTED"
    },
    failed: {
      bg: "bg-destructive/10",
      text: "text-destructive",
      border: "border-destructive",
      icon: Lock,
      label: "FAILED"
    }
  };

  const { bg, text, border, icon: Icon, label } = config[status.toLowerCase() as keyof typeof config] || config.pending;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 font-bold text-sm",
        bg, text, border
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </motion.div>
  );
};

const ImagePlaceholder = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="aspect-[3/2] rounded-xl bg-muted/50 border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-2">
    <Icon className="h-10 w-10 text-muted-foreground/40" />
    <span className="text-xs text-muted-foreground/60">{label}</span>
  </div>
);

export function IdentityKycSection({ 
  userId, 
  userData,
  onVerifyKyc,
  onSoftRejectKyc,
  onHardFailKyc,
  onRestoreKyc,
  isLoading
}: IdentityKycSectionProps) {
  const { canWrite } = useAuth();
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);
  const [isHardFailModalOpen, setIsHardFailModalOpen] = useState(false);
  const [hardFailReason, setHardFailReason] = useState("");
  
  // Generic action state
  const [actionModal, setActionModal] = useState<{ isOpen: boolean; type: 'verify' | 'soft-reject' | 'restore' | null }>({
    isOpen: false,
    type: null
  });
  const [actionReason, setActionReason] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden shadow-sm border-border/50">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg truncate">Identity & KYC Verification</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">Document verification and identity check</p>
              </div>
            </div>
            <KycStatusBadge status={userData.kycStatus || "pending"} />
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Selfie & ID Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Live Selfie */}
            <div className="group relative space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Camera className="h-4 w-4" />
                Live Selfie
              </div>
               {userData.selfieUrl ? (
                <div 
                  className="relative cursor-zoom-in overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md hover:border-primary/50"
                  onClick={() => setSelectedImage({ url: userData.selfieUrl!, title: "Live Selfie" })}
                >
                  <img 
                    src={userData.selfieUrl} 
                    alt="Live selfie" 
                    className="w-full aspect-[3/2] object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ) : (
                <ImagePlaceholder icon={Camera} label="No selfie uploaded" />
              )}
            </div>

            {/* Ghana Card Front */}
            <div className="group relative space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <IdCard className="h-4 w-4" />
                Ghana Card (Front)
              </div>
               {userData.ghanaCardFrontUrl ? (
                <div 
                  className="relative cursor-zoom-in overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md hover:border-primary/50"
                  onClick={() => setSelectedImage({ url: userData.ghanaCardFrontUrl!, title: "Ghana Card (Front)" })}
                >
                  <img 
                    src={userData.ghanaCardFrontUrl} 
                    alt="Ghana Card front" 
                    className="w-full aspect-[1.586] object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ) : (
                <ImagePlaceholder icon={IdCard} label="No ID uploaded" />
              )}
            </div>

            {/* Ghana Card Back */}
            <div className="group relative space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <IdCard className="h-4 w-4" />
                Ghana Card (Back)
              </div>
               {userData.ghanaCardBackUrl ? (
                <div 
                  className="relative cursor-zoom-in overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md hover:border-primary/50"
                  onClick={() => setSelectedImage({ url: userData.ghanaCardBackUrl!, title: "Ghana Card (Back)" })}
                >
                  <img 
                    src={userData.ghanaCardBackUrl} 
                    alt="Ghana Card back" 
                    className="w-full aspect-[1.586] object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ) : (
                <ImagePlaceholder icon={IdCard} label="No ID uploaded" />
              )}
            </div>
          </div>

          {/* Verification Checks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8 pt-6 border-t">
            {/* Ghana Card Number */}
            <div className="space-y-1.5 p-4 rounded-xl bg-muted/30">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ID Number</span>
              <p className="font-mono text-base font-bold text-foreground">
                {userData.ghanaCardNumber || "Not provided"}
              </p>
            </div>

            {/* Full Name on Card */}
            <div className="space-y-1.5 p-4 rounded-xl bg-muted/30">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Name on Card</span>
              <p className="text-base font-bold text-foreground">
                {deduplicateWords(userData.ghanaCardName || userData.fullName) || "—"}
              </p>
            </div>
          </div>
        </CardContent>
        {/* Actions inside CardFooter or just bottom of CardContent */}
        {canWrite && (
          <div className="p-6 pt-0 flex flex-col sm:flex-row flex-wrap gap-3 justify-end bg-card">
            {userData.kycStatus === 'pending' && (
              <>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto h-12 sm:h-10 border-destructive text-destructive hover:bg-destructive/10 font-bold order-3 sm:order-1"
                  onClick={() => setIsHardFailModalOpen(true)}
                  disabled={isLoading}
                >
                  Hard fail (audit)
                </Button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto h-12 sm:h-10 border-amber-500 text-amber-600 hover:bg-amber-50 font-bold order-2"
                  onClick={() => setActionModal({ isOpen: true, type: 'soft-reject' })}
                  disabled={isLoading}
                >
                  Soft reject
                </Button>
                <Button
                  className="w-full sm:w-auto h-12 sm:h-10 bg-green-600 hover:bg-green-700 text-white font-bold order-1 sm:order-3"
                  onClick={() => onVerifyKyc && onVerifyKyc("Identity verified via admin dashboard")}
                  disabled={isLoading}
                >
                  Verify KYC
                </Button>
              </>
            )}
            {(userData.kycStatus === 'failed' || userData.kycStatus === 'rejected') && (
              <Button
                variant="outline"
                className="w-full sm:w-auto h-12 sm:h-10 text-amber-600 border-amber-600 hover:bg-amber-50 font-bold"
                onClick={() => setActionModal({ isOpen: true, type: 'restore' })}
                disabled={isLoading}
              >
                 Restore KYC
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* KYC Action Modal (Verify/Soft-Reject/Restore) */}
      <Dialog 
        open={actionModal.isOpen} 
        onOpenChange={(open) => !open && setActionModal({ isOpen: false, type: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 capitalize">
              {actionModal.type?.replace('-', ' ')} KYC
            </DialogTitle>
            <DialogDescription>
              Please provide a brief reason for this action. This will be stored in the audit logs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="actionReason">Reason</Label>
              <Input
                id="actionReason"
                placeholder="e.g. Identity confirmed, missing back image, etc."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal({ isOpen: false, type: null })}>
              Cancel
            </Button>
            <Button
              className={cn(
                "font-bold",
                actionModal.type === 'verify' ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700"
              )}
              onClick={() => {
                if (actionModal.type === 'verify' && onVerifyKyc) onVerifyKyc(actionReason);
                if (actionModal.type === 'soft-reject' && onSoftRejectKyc) onSoftRejectKyc(actionReason);
                if (actionModal.type === 'restore' && onRestoreKyc) onRestoreKyc(actionReason);
                
                setActionModal({ isOpen: false, type: null });
                setActionReason("");
              }}
              disabled={!actionReason.trim() || isLoading}
            >
              Confirm Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isHardFailModalOpen} onOpenChange={setIsHardFailModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <span className="text-2xl">🚨</span> Hard Fail KYC
            </DialogTitle>
            <DialogDescription className="text-destructive/90 font-medium">
              This will permanently flag this user's KYC as failed and disable loan requests, payments, and withdrawals. This action is logged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="hardFailReason">Reason for Failure</Label>
              <Input
                id="hardFailReason"
                placeholder="e.g. Forged documents..."
                value={hardFailReason}
                onChange={(e) => setHardFailReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHardFailModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (onHardFailKyc) onHardFailKyc(hardFailReason);
                setIsHardFailModalOpen(false);
                setHardFailReason("");
              }}
              disabled={!hardFailReason.trim() || isLoading || !canWrite}
            >
              Confirm hard fail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image viewer Modal */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
          <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent">
            <DialogTitle className="text-white font-bold">{selectedImage?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[40vh] max-h-[85vh] p-2">
            <img 
              src={selectedImage?.url} 
              alt={selectedImage?.title} 
              className="max-w-full max-h-full object-contain rounded-sm"
            />
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
