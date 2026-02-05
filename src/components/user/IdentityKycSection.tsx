import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, CheckCircle2, XCircle, Clock, AlertCircle, Camera, IdCard, ExternalLink } from "lucide-react";
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
      label: "PENDING REVIEW"
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
      label: "Awaiting"
    },
    accepted: {
      bg: "bg-success/15",
      text: "text-success",
      icon: CheckCircle2,
      label: "Accepted"
    },
    declined: {
      bg: "bg-destructive/15",
      text: "text-destructive",
      icon: XCircle,
      label: "Declined"
    }
  };

  const { bg, text, icon: Icon, label } = config[status as keyof typeof config] || config.awaiting;

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium", bg, text)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  );
};

const NameMatchBadge = ({ matches }: { matches: boolean | null }) => {
  if (matches === null) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-muted-foreground">
        <AlertCircle className="h-3.5 w-3.5" />
        Pending
      </div>
    );
  }

  return matches ? (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-success/15 text-xs font-medium text-success">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Match
    </div>
  ) : (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-destructive/15 text-xs font-medium text-destructive">
      <XCircle className="h-3.5 w-3.5" />
      Mismatch
    </div>
  );
};

const ImagePlaceholder = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="aspect-[3/2] rounded-xl bg-muted/50 border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-2">
    <Icon className="h-8 w-8 text-muted-foreground/40" />
    <span className="text-xs text-muted-foreground/60">{label}</span>
  </div>
);

const ImageCard = ({ 
  url, 
  alt, 
  icon: Icon, 
  label,
  aspectRatio = "3/2"
}: { 
  url?: string; 
  alt: string; 
  icon: React.ElementType; 
  label: string;
  aspectRatio?: string;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          View <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
    {url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block group">
        <div className="relative overflow-hidden rounded-xl border shadow-sm">
          <img 
            src={url} 
            alt={alt} 
            className={cn(
              "w-full object-cover transition-transform duration-300 group-hover:scale-105",
              aspectRatio === "3/2" && "aspect-[3/2]",
              aspectRatio === "1.586" && "aspect-[1.586/1]"
            )}
            style={{ aspectRatio: aspectRatio === "1.586" ? "1.586" : "3/2" }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
      </a>
    ) : (
      <ImagePlaceholder icon={Icon} label={`No ${label.toLowerCase()} uploaded`} />
    )}
  </div>
);

export function IdentityKycSection({ userData }: IdentityKycSectionProps) {
  const nameMatches = userData.momoName && userData.ghanaCardName 
    ? userData.momoName.toLowerCase().trim() === userData.ghanaCardName.toLowerCase().trim()
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b px-4 py-4 lg:px-6 lg:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base lg:text-lg">Identity & KYC</CardTitle>
                <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">Document verification</p>
              </div>
            </div>
            <KycStatusBadge status={userData.kycStatus || "pending"} />
          </div>
        </CardHeader>

        <CardContent className="p-4 lg:p-6 space-y-6">
          {/* Images Grid - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ImageCard
              url={userData.selfieUrl}
              alt="Live selfie"
              icon={Camera}
              label="Live Selfie"
              aspectRatio="3/2"
            />
            <ImageCard
              url={userData.ghanaCardFrontUrl}
              alt="Ghana Card front"
              icon={IdCard}
              label="Ghana Card (Front)"
              aspectRatio="1.586"
            />
            <ImageCard
              url={userData.ghanaCardBackUrl}
              alt="Ghana Card back"
              icon={IdCard}
              label="Ghana Card (Back)"
              aspectRatio="1.586"
            />
          </div>

          {/* Verification Details Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            {/* Ghana Card Number */}
            <div className="space-y-1">
              <span className="text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Ghana Card #
              </span>
              <p className="font-mono text-xs lg:text-sm font-medium truncate">
                {userData.ghanaCardNumber || "Not provided"}
              </p>
            </div>

            {/* Full Name on Card */}
            <div className="space-y-1">
              <span className="text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Name on Card
              </span>
              <p className="text-xs lg:text-sm font-medium truncate">
                {userData.ghanaCardName || userData.fullName || "—"}
              </p>
            </div>

            {/* MoMo Name Check */}
            <div className="space-y-1">
              <span className="text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Uniwallet Match
              </span>
              <NameMatchBadge matches={nameMatches} />
            </div>

            {/* Node Consent Status */}
            <div className="space-y-1">
              <span className="text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Node Consent
              </span>
              <ConsentStatusIndicator status={userData.nodeConsentStatus || "awaiting"} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}