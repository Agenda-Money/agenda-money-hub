import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, CreditCard, CheckCircle2, XCircle, Clock, AlertCircle, Camera, IdCard } from "lucide-react";
import { cn } from "@/lib/utils";

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

const ConsentStatusIndicator = ({ status }: { status: string }) => {
  const config = {
    awaiting: {
      bg: "bg-muted",
      text: "text-muted-foreground",
      icon: Clock,
      label: "Awaiting Consent"
    },
    accepted: {
      bg: "bg-success/15",
      text: "text-success",
      icon: CheckCircle2,
      label: "Consent Accepted"
    },
    declined: {
      bg: "bg-destructive/15",
      text: "text-destructive",
      icon: XCircle,
      label: "Consent Declined"
    }
  };

  const { bg, text, icon: Icon, label } = config[status as keyof typeof config] || config.awaiting;

  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg", bg)}>
      <Icon className={cn("h-4 w-4", text)} />
      <span className={cn("text-sm font-medium", text)}>{label}</span>
    </div>
  );
};

const NameMatchBadge = ({ matches }: { matches: boolean | null }) => {
  if (matches === null) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Not Verified</span>
      </div>
    );
  }

  return matches ? (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/15">
      <CheckCircle2 className="h-4 w-4 text-success" />
      <span className="text-sm font-medium text-success">Names Match</span>
    </div>
  ) : (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/15">
      <XCircle className="h-4 w-4 text-destructive" />
      <span className="text-sm font-medium text-destructive">Names Mismatch</span>
    </div>
  );
};

const ImagePlaceholder = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="aspect-[3/2] rounded-xl bg-muted/50 border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-2">
    <Icon className="h-10 w-10 text-muted-foreground/40" />
    <span className="text-xs text-muted-foreground/60">{label}</span>
  </div>
);

export function IdentityKycSection({ userData }: IdentityKycSectionProps) {
  const nameMatches = userData.momoName && userData.ghanaCardName 
    ? userData.momoName.toLowerCase() === userData.ghanaCardName.toLowerCase()
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Live Selfie */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Camera className="h-4 w-4" />
                Live Selfie
              </div>
              {userData.selfieUrl ? (
                <img 
                  src={userData.selfieUrl} 
                  alt="Live selfie" 
                  className="w-full aspect-[3/2] object-cover rounded-xl border shadow-sm"
                />
              ) : (
                <ImagePlaceholder icon={Camera} label="No selfie uploaded" />
              )}
            </div>

            {/* Ghana Card Front */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <IdCard className="h-4 w-4" />
                Ghana Card (Front)
              </div>
              {userData.ghanaCardFrontUrl ? (
                <img 
                  src={userData.ghanaCardFrontUrl} 
                  alt="Ghana Card front" 
                  className="w-full aspect-[3/2] object-cover rounded-xl border shadow-sm"
                />
              ) : (
                <ImagePlaceholder icon={IdCard} label="No ID uploaded" />
              )}
            </div>

            {/* Ghana Card Back */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <IdCard className="h-4 w-4" />
                Ghana Card (Back)
              </div>
              {userData.ghanaCardBackUrl ? (
                <img 
                  src={userData.ghanaCardBackUrl} 
                  alt="Ghana Card back" 
                  className="w-full aspect-[3/2] object-cover rounded-xl border shadow-sm"
                />
              ) : (
                <ImagePlaceholder icon={IdCard} label="No ID uploaded" />
              )}
            </div>
          </div>

          {/* Verification Checks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            {/* Ghana Card Number */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ghana Card</span>
              <p className="font-mono text-sm font-medium">
                {userData.ghanaCardNumber || "Not provided"}
              </p>
            </div>

            {/* Full Name on Card */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name on Card</span>
              <p className="text-sm font-medium">
                {userData.ghanaCardName || userData.fullName || "—"}
              </p>
            </div>

            {/* MoMo Name Check */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Uniwallet Name Check</span>
              <NameMatchBadge matches={nameMatches} />
            </div>

            {/* Node Consent Status */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Node Consent</span>
              <ConsentStatusIndicator status={userData.nodeConsentStatus || "awaiting"} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
