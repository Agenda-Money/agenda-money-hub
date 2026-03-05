import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, CreditCard, CheckCircle2, XCircle, Clock, AlertCircle, Camera, IdCard, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IdentityKycSectionProps {
  userData: {
    selfieUrl?: string;
    ghanaCardFrontUrl?: string;
    ghanaCardBackUrl?: string;
    fullName: string;
    momoName?: string;
    ghanaCardName?: string;
    nodeConsentStatus?: "awaiting" | "accepted" | "declined";
    kycStatus?: "pending" | "verified" | "rejected";
    ghanaCardNumber?: string;
  };
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
    }
  };

  const { bg, text, border, icon: Icon, label } = config[status as keyof typeof config] || config.pending;

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

export function IdentityKycSection({ userData }: IdentityKycSectionProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden shadow-sm border-border/50">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Identity & KYC Verification</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Document verification and identity check</p>
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
                {userData.ghanaCardName || userData.fullName || "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
