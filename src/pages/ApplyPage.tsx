import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import { useApplicant } from "@/contexts/ApplicantContext";
import { uploadToSupabase } from "@/lib/supabase";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  CreditCard,
  Hash,
  KeyRound,
  Loader2,
  Phone,
  RotateCw,
  ShieldCheck,
  Upload,
} from "lucide-react";

const baseApiUrl = import.meta.env.VITE_API_URL || "";
const OTP_LENGTH = 6;
const OTP_SLOTS = ["one", "two", "three", "four", "five", "six"];
const RESEND_SECONDS = 60;

const GHANA_REGIONS = [
  "Greater Accra", "Ashanti", "Central", "Eastern", "Northern",
  "Western", "Volta", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Western North", "Savannah", "North East", "Oti",
];

const GENDERS = ["Male", "Female"];

const LOAN_PURPOSES = ["Business", "Education", "Medical", "Home", "Other"];

const TIER_LIMITS: Record<number, TierLimit> = {
  1: { tier: 1, min: 50, max: 300, maxTenure: 14 },
  2: { tier: 2, min: 100, max: 600, maxTenure: 21 },
  3: { tier: 3, min: 150, max: 900, maxTenure: 30 },
  4: { tier: 4, min: 50, max: 500, maxTenure: 14 },
};

type TierLimit = {
  tier: number;
  min: number;
  max: number;
  maxTenure: number;
  amounts?: number[];
  tenures?: number[];
};

type HeaderMeta = {
  title: string;
  description: string;
  badgeLabel: string;
  stepLabel: string;
};

const getHeaderMeta = (view: View): HeaderMeta => {
  if (view === "auth") {
    return {
      title: "Welcome to Agenda Money",
      description: "Verify your identity to get started.",
      badgeLabel: "",
      stepLabel: "Step 1 of 2",
    };
  }

  if (view === "otp") {
    return {
      title: "Security",
      description: "Enter the 6-digit code sent to your phone.",
      badgeLabel: "Verification",
      stepLabel: "Step 2 of 2",
    };
  }

  if (view === "onboarding") {
    return {
      title: "Onboarding",
      description: "Complete your Ghana Card and personal details to request a loan.",
      badgeLabel: "Onboarding",
      stepLabel: "Next Step",
    };
  }

  if (view === "success") {
    return {
      title: "Application Submitted",
      description: "Your application is pending verification.",
      badgeLabel: "",
      stepLabel: "Done",
    };
  }

  return {
    title: "Loan Center",
    description: "Select your amount and submit a loan request quickly.",
    badgeLabel: "Loan Center",
    stepLabel: "Next Step",
  };
};

const buildAmountOptions = (tier?: TierLimit) => {
  if (!tier) return [];
  if (tier.amounts?.length) return tier.amounts;
  if (!tier.min || !tier.max) return [];
  const step = 50;
  const count = Math.floor((tier.max - tier.min) / step) + 1;
  return Array.from({ length: count }, (_, index) => tier.min + index * step);
};

const buildTenureOptions = (tier?: TierLimit) => {
  if (!tier) return [];
  if (tier.tenures?.length) return tier.tenures;
  if (!tier.maxTenure) return [];
  const base = [1, 5, 10, tier.maxTenure];
  return Array.from(new Set(base)).sort((a, b) => a - b);
};

type AuthStepProps = {
  msisdnInput: string;
  nodeCode: string;
  setMsisdnInput: (value: string) => void;
  setNodeCode: (value: string) => void;
  canSubmitEntry: boolean;
  isRequesting: boolean;
  entryButtonLabel: string;
  handleRequestOtp: () => void;
};

const AuthStep = ({
  msisdnInput,
  nodeCode,
  setMsisdnInput,
  setNodeCode,
  canSubmitEntry,
  isRequesting,
  entryButtonLabel,
  handleRequestOtp,
}: AuthStepProps) => (
  <div className="space-y-5">
    <div className="space-y-2">
      <Label htmlFor="msisdn" className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Phone className="h-4 w-4 text-muted-foreground" />
        Mobile Number
      </Label>
      <Input
        id="msisdn"
        type="tel"
        value={msisdnInput}
        onChange={(e) => setMsisdnInput(e.target.value)}
        placeholder="233 54 XXX XXXX"
        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary font-mono placeholder:text-muted-foreground/50 placeholder:text-sm"
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="nodeCode" className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Hash className="h-4 w-4 text-muted-foreground" />
        Agent Code
      </Label>
      <Input
        id="nodeCode"
        value={nodeCode}
        onChange={(e) => setNodeCode(e.target.value)}
        placeholder="Agent Code"
        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary font-mono"
      />
      <p className="text-xs text-muted-foreground">Enter the unique code provided by your agent.</p>
    </div>

    <Button
      type="button"
      onClick={handleRequestOtp}
      disabled={!canSubmitEntry || isRequesting}
      className="w-full h-12 bg-gradient-pink hover:opacity-90"
    >
      {isRequesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
      {entryButtonLabel}
      <ArrowRight className="h-4 w-4 ml-2" />
    </Button>
  </div>
);

type OtpStepProps = {
  otp: string;
  nodeName: string | null;
  canVerify: boolean;
  isVerifying: boolean;
  verifyButtonLabel: string;
  resendSeconds: number;
  isRequesting: boolean;
  setOtp: (value: string) => void;
  resetAutoSubmit: () => void;
  handleVerifyOtp: () => void;
  handleResend: () => void;
};

const OtpStep = ({
  otp,
  nodeName,
  canVerify,
  isVerifying,
  verifyButtonLabel,
  resendSeconds,
  isRequesting,
  setOtp,
  resetAutoSubmit,
  handleVerifyOtp,
  handleResend,
}: OtpStepProps) => (
  <div className="space-y-5">
    <Alert className="bg-emerald-500/10 border-emerald-500/30">
      <AlertDescription className="text-emerald-800 dark:text-emerald-200">
        We will check with {nodeName || "your agent"} for approval.
      </AlertDescription>
    </Alert>

    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-muted-foreground" />
        6-digit OTP
      </Label>
      <InputOTP
        value={otp}
        onChange={(value) => {
          setOtp(value);
          if (value.length < OTP_LENGTH) resetAutoSubmit();
        }}
        maxLength={OTP_LENGTH}
        containerClassName="justify-start"
      >
        <InputOTPGroup>
          {OTP_SLOTS.map((slot, index) => (
            <InputOTPSlot key={slot} index={index} />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>

    <div className="flex items-center gap-3">
      <Button
        type="button"
        onClick={handleVerifyOtp}
        disabled={!canVerify || isVerifying}
        className="h-12 bg-gradient-pink hover:opacity-90"
      >
        {isVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
        {verifyButtonLabel}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={resendSeconds > 0 || isRequesting}
        onClick={handleResend}
        className="h-12"
      >
        <RotateCw className="h-4 w-4 mr-2" />
        {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend Code"}
      </Button>
    </div>
  </div>
);

type OnboardingViewProps = {
  onboardingData: {
    firstName: string;
    surname: string;
    dob: string;
    gender: string;
    region: string;
    address: string;
    // gpsAddress removed — digital address no longer required
    ghanaCardNumber: string;
    ghanaCardFrontUrl: string;
    ghanaCardBackUrl: string;
    selfieUrl: string;
  };
  frontCardRef: React.RefObject<HTMLInputElement>;
  backCardRef: React.RefObject<HTMLInputElement>;
  selfieRef: React.RefObject<HTMLInputElement>;
  handleOnboardingChange: (field: "firstName" | "surname" | "dob" | "gender" | "region" | "address" | "ghanaCardNumber" | "ghanaCardFrontUrl" | "ghanaCardBackUrl" | "selfieUrl", value: string) => void;
  handleGhanaCardChange: (value: string) => void;
  handleUpload: (file: File, field: "ghanaCardFrontUrl" | "ghanaCardBackUrl" | "selfieUrl") => void;
  isSubmitting: boolean;
  onContinue: () => void;
};

// Step 1: Personal Details (no digital address)
const OnboardingStep1 = ({ onboardingData, handleOnboardingChange, onNext }: {
  onboardingData: OnboardingViewProps["onboardingData"];
  handleOnboardingChange: OnboardingViewProps["handleOnboardingChange"];
  onNext: () => void;
}) => (
  <div className="space-y-6">
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="firstName">First Name *</Label>
        <Input
          id="firstName"
          value={onboardingData.firstName}
          onChange={(e) => handleOnboardingChange("firstName", e.target.value)}
          placeholder="Kwame"
          className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="surname">Surname *</Label>
        <Input
          id="surname"
          value={onboardingData.surname}
          onChange={(e) => handleOnboardingChange("surname", e.target.value)}
          placeholder="Mensah"
          className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
        />
      </div>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="dob">Date of Birth *</Label>
        <Input
          id="dob"
          type="date"
          value={onboardingData.dob}
          onChange={(e) => handleOnboardingChange("dob", e.target.value)}
          className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gender">Gender *</Label>
        <Select value={onboardingData.gender} onValueChange={(val) => handleOnboardingChange("gender", val)}>
          <SelectTrigger className="h-12 bg-muted/50 border-0 focus-visible:ring-primary">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {GENDERS.map((gender) => (
              <SelectItem key={gender} value={gender}>{gender}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="region">Region *</Label>
        <Select value={onboardingData.region} onValueChange={(val) => handleOnboardingChange("region", val)}>
          <SelectTrigger className="h-12 bg-muted/50 border-0 focus-visible:ring-primary">
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent>
            {GHANA_REGIONS.map((region) => (
              <SelectItem key={region} value={region}>{region}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Residential Address *</Label>
        <Input
          id="address"
          value={onboardingData.address}
          onChange={(e) => handleOnboardingChange("address", e.target.value)}
          placeholder="House No. 12, Dzorwulu Street"
          className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
        />
      </div>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="accommodationType">Accommodation *</Label>
        <Select value={onboardingData.accommodationType} onValueChange={(val) => handleOnboardingChange("accommodationType", val)}>
          <SelectTrigger className="h-12 bg-muted/50 border-0 focus-visible:ring-primary">
            <SelectValue placeholder="Select accommodation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owned">Owned</SelectItem>
            <SelectItem value="rented">Rented</SelectItem>
            <SelectItem value="family">Living with family</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="yearsAtAddress">Years at Address *</Label>
        <Input
          id="yearsAtAddress"
          type="number"
          min={0}
          value={onboardingData.yearsAtAddress}
          onChange={(e) => handleOnboardingChange("yearsAtAddress", e.target.value)}
          placeholder="e.g., 5"
          className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
        />
      </div>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="educationLevel">Education Level *</Label>
        <Select value={onboardingData.educationLevel} onValueChange={(val) => handleOnboardingChange("educationLevel", val)}>
          <SelectTrigger className="h-12 bg-muted/50 border-0 focus-visible:ring-primary">
            <SelectValue placeholder="Select education" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="primary">Primary</SelectItem>
            <SelectItem value="secondary">Secondary</SelectItem>
            <SelectItem value="tertiary">Tertiary</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="employmentStatus">Employment *</Label>
        <Select value={onboardingData.employmentStatus} onValueChange={(val) => handleOnboardingChange("employmentStatus", val)}>
          <SelectTrigger className="h-12 bg-muted/50 border-0 focus-visible:ring-primary">
            <SelectValue placeholder="Select employment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="employed">Employed</SelectItem>
            <SelectItem value="self-employed">Self-Employed</SelectItem>
            <SelectItem value="unemployed">Unemployed</SelectItem>
            <SelectItem value="student">Student</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div className="space-y-2">
      <Label htmlFor="monthlyIncome">Monthly Income *</Label>
      <Select value={onboardingData.monthlyIncome} onValueChange={(val) => handleOnboardingChange("monthlyIncome", val)}>
        <SelectTrigger className="h-12 bg-muted/50 border-0 focus-visible:ring-primary">
          <SelectValue placeholder="Select income range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="<1000">Below GHS 1000</SelectItem>
          <SelectItem value="1000-2000">GHS 1000-2000</SelectItem>
          <SelectItem value="2000-5000">GHS 2000-5000</SelectItem>
          <SelectItem value=">5000">Above GHS 5000</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="flex justify-end">
      <Button type="button" onClick={onNext} className="w-40 h-12 bg-gradient-pink">Next</Button>
    </div>
  </div>
);

// Step 2: Documents (Ghana card number + uploads)
const OnboardingStep2 = ({ onboardingData, frontCardRef, backCardRef, selfieRef, handleOnboardingChange, handleGhanaCardChange, handleUpload, isSubmitting, onBack, onContinue }: {
  onboardingData: OnboardingViewProps["onboardingData"];
  frontCardRef: React.RefObject<HTMLInputElement>;
  backCardRef: React.RefObject<HTMLInputElement>;
  selfieRef: React.RefObject<HTMLInputElement>;
  handleOnboardingChange: OnboardingViewProps["handleOnboardingChange"];
  handleGhanaCardChange: (value: string) => void;
  handleUpload: OnboardingViewProps["handleUpload"];
  isSubmitting: boolean;
  onBack: () => void;
  onContinue: () => void;
}) => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Label htmlFor="ghanaCardNumber">Ghana Card Number *</Label>
      <Input
        id="ghanaCardNumber"
        value={onboardingData.ghanaCardNumber}
        onChange={(e) => handleGhanaCardChange(e.target.value)}
        placeholder="GHA-"
        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary font-mono"
      />
      <p className="text-xs text-muted-foreground">Format: GHA-XXXXXXXXX-X</p>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          Ghana Card (Front)
        </Label>
        <div className="rounded-xl border-2 border-dashed p-5 text-center">
          <input
            ref={frontCardRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file, "ghanaCardFrontUrl");
            }}
            className="hidden"
          />
          {onboardingData.ghanaCardFrontUrl ? (
            <img
              src={onboardingData.ghanaCardFrontUrl}
              alt="Ghana Card front"
              className="h-32 w-full object-cover rounded-lg"
            />
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => frontCardRef.current?.click()}
              className="mx-auto"
            >
              <Camera className="h-4 w-4 mr-2" />
              Capture / Upload
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          Ghana Card (Back)
        </Label>
        <div className="rounded-xl border-2 border-dashed p-5 text-center">
          <input
            ref={backCardRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file, "ghanaCardBackUrl");
            }}
            className="hidden"
          />
          {onboardingData.ghanaCardBackUrl ? (
            <img
              src={onboardingData.ghanaCardBackUrl}
              alt="Ghana Card back"
              className="h-32 w-full object-cover rounded-lg"
            />
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => backCardRef.current?.click()}
              className="mx-auto"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          )}
        </div>
      </div>
    </div>

    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-muted-foreground" />
        Live Selfie
      </Label>
      <div className="rounded-xl border-2 border-dashed p-5 text-center">
        <input
          ref={selfieRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file, "selfieUrl");
          }}
          className="hidden"
        />
        {onboardingData.selfieUrl ? (
          <img
            src={onboardingData.selfieUrl}
            alt="Selfie"
            className="h-32 w-full object-cover rounded-lg"
          />
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => selfieRef.current?.click()}
            className="mx-auto"
          >
            <Camera className="h-4 w-4 mr-2" />
            Capture Selfie
          </Button>
        )}
      </div>
    </div>

      <div className="flex items-center gap-3">
      <Button type="button" variant="outline" onClick={onBack}>Back</Button>
      <Button
        type="button"
        onClick={onContinue}
        disabled={isSubmitting}
        className="ml-auto w-44 h-12 bg-gradient-pink hover:opacity-90"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Continue
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  </div>
);

type LoanDashboardViewProps = {
  fullName?: string;
  tierNumber: number;
  loanAmount: number;
  loanTenure: number;
  loanPurpose: string;
  tierMin: number;
  tierMax: number;
  tierMaxTenure: number;
  amountOptions: number[];
  tenureOptions: number[];
  isRequestingLoan: boolean;
  loanSummary: {
    disbursementAmount: number;
    repaymentAmount: number;
    repaymentDate: string;
    msisdn: string;
  } | null;
  onRequestLoan: () => void;
  setLoanAmount: (value: number) => void;
  setLoanTenure: (value: number) => void;
  setLoanPurpose: (value: string) => void;
};

const LoanDashboardView = ({
  fullName,
  tierNumber,
  loanAmount,
  loanTenure,
  loanPurpose,
  tierMin,
  tierMax,
  tierMaxTenure,
  amountOptions,
  tenureOptions,
  isRequestingLoan,
  loanSummary,
  onRequestLoan,
  setLoanAmount,
  setLoanTenure,
  setLoanPurpose,
}: LoanDashboardViewProps) => (
  <div className="space-y-6">
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">Loan Request Details</p>
      <p className="text-xs text-muted-foreground">Final step (4 of 4)</p>
      <p className="text-sm text-muted-foreground">Provide your loan amount, tenure, and purpose</p>
    </div>

    <Alert className="bg-emerald-500/10 border-emerald-500/30">
      <AlertDescription className="text-emerald-800 dark:text-emerald-200">
        {tierMin > 0 && tierMax > 0 ? (
          <>
            <strong>Tier {tierNumber} Limits:</strong> GHS {tierMin} - GHS {tierMax}
            {tierMaxTenure ? ` | Max tenure: ${tierMaxTenure} days` : ""}
          </>
        ) : (
          <>Tier {tierNumber} verified. Loan limits will appear after eligibility check.</>
        )}
      </AlertDescription>
    </Alert>

    <div className="rounded-xl bg-muted/50 p-4">
      <p className="text-sm text-muted-foreground">Welcome</p>
      <p className="text-lg font-semibold">{fullName || "Applicant"}</p>
    </div>

    <div className="space-y-2">
      <Label htmlFor="loan-amount">Loan Amount (GHS) *</Label>
      <div className="flex gap-3">
        <Input
          id="loan-amount"
          type="number"
          min={tierMin || 0}
          max={tierMax || undefined}
          value={String(loanAmount)}
          onChange={(e) => setLoanAmount(Number(e.target.value || 0))}
          placeholder={`Min ${tierMin} - Max ${tierMax}`}
          className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
        />

        <Select value={String(loanAmount)} onValueChange={(val) => setLoanAmount(Number(val))}>
          <SelectTrigger className="h-12 bg-muted/50 border-0 focus-visible:ring-primary w-40">
            <SelectValue placeholder="Presets" />
          </SelectTrigger>
          <SelectContent>
            {amountOptions.map((amount) => (
              <SelectItem key={amount} value={String(amount)}>
                GHS {amount}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    <div className="space-y-2">
      <Label htmlFor="loan-tenure">Loan Tenure (Days) *</Label>
      <div className="flex flex-wrap gap-2">
        {tenureOptions.map((tenure) => (
          <Button
            key={tenure}
            type="button"
            variant={loanTenure === tenure ? "default" : "outline"}
            size="sm"
            onClick={() => setLoanTenure(tenure)}
            className={loanTenure === tenure ? "bg-gradient-pink" : ""}
          >
            {tenure} {tenure === 1 ? "Day" : "Days"}
          </Button>
        ))}
      </div>
    </div>

    <div className="space-y-2">
      <Label htmlFor="loan-purpose">Loan Purpose *</Label>
      <Select value={loanPurpose} onValueChange={setLoanPurpose}>
        <SelectTrigger className="h-12 bg-muted/50 border-0 focus-visible:ring-primary">
          <SelectValue placeholder="Select purpose of loan" />
        </SelectTrigger>
        <SelectContent>
          {LOAN_PURPOSES.map((purpose) => (
            <SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Estimated term sheet (client-side preview) */}
    <div className="rounded-xl border border-primary/10 p-4 bg-muted/30">
      <p className="font-semibold text-sm">Estimated term sheet (preview)</p>
      <EstimatedTermSheet amount={loanAmount} tenure={loanTenure} />
    </div>

    <Button
      type="button"
      onClick={onRequestLoan}
      disabled={isRequestingLoan}
      className="w-full h-12 bg-gradient-pink hover:opacity-90"
    >
      {isRequestingLoan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
      Request Loan
      <ArrowRight className="h-4 w-4 ml-2" />
    </Button>

    {loanSummary && (
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-4 space-y-2">
        <p className="font-semibold text-sm">Term sheet</p>
        <div className="space-y-1 text-sm">
          <p><span className="text-muted-foreground">Disbursement amount</span> - GHS {loanSummary.disbursementAmount}</p>
          <p><span className="text-muted-foreground">Account</span>: {loanSummary.msisdn}</p>
          <p><span className="text-muted-foreground">Repayment amount</span> - GHS {loanSummary.repaymentAmount}</p>
          <p><span className="text-muted-foreground">Repayment date</span> - {loanSummary.repaymentDate}</p>
        </div>
      </div>
    )}
  </div>
);

// Small helper component to show estimated term sheet client-side
function EstimatedTermSheet({ amount, tenure }: { amount: number; tenure: number }) {
  const interestRate = 0.08; // 8% simple estimate
  const serviceFeeRate = 0.02; // 2% service fee
  const interest = Math.round(amount * interestRate);
  const serviceFee = Math.round(amount * serviceFeeRate);
  const repaymentAmount = amount + interest + serviceFee;
  const repaymentDate = new Date(Date.now() + tenure * 24 * 60 * 60 * 1000).toDateString();

  return (
    <div className="mt-2 text-sm space-y-1">
      <p><span className="text-muted-foreground">Principal:</span> GHS {amount}</p>
      <p><span className="text-muted-foreground">Interest (est {Math.round(interestRate*100)}%):</span> GHS {interest}</p>
      <p><span className="text-muted-foreground">Service fee (est {Math.round(serviceFeeRate*100)}%):</span> GHS {serviceFee}</p>
      <p className="font-semibold"><span className="text-muted-foreground">Estimated repayment:</span> GHS {repaymentAmount}</p>
      <p className="text-muted-foreground">Estimated repayment date: {repaymentDate}</p>
    </div>
  );
}

type View = "auth" | "otp" | "onboarding" | "loan-dashboard" | "success";

export default function ApplyPage() {
  const { setApplicant, applicant } = useApplicant();

  const [view, setView] = useState<View>("auth");
  const [direction, setDirection] = useState(0);
  const [msisdnInput, setMsisdnInput] = useState("");
  const [nodeCode, setNodeCode] = useState("");
  const [nodeName, setNodeName] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [userData, setUserData] = useState<Record<string, unknown> | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [onboardingData, setOnboardingData] = useState({
    firstName: "",
    surname: "",
    dob: "",
    gender: "",
    region: "",
    address: "",
    ghanaCardNumber: "GHA-",
    ghanaCardFrontUrl: "",
    ghanaCardBackUrl: "",
    selfieUrl: "",
    accommodationType: "",
    yearsAtAddress: "",
    educationLevel: "",
    employmentStatus: "",
    monthlyIncome: "",
  });

  // onboarding step (1 = personal details, 2 = documents)
  const [onboardingStep, setOnboardingStep] = useState<number>(1);

  const [loanAmount, setLoanAmount] = useState(100);
  const [loanTenure, setLoanTenure] = useState(14);
  const [loanPurpose, setLoanPurpose] = useState("Business");
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);
  const [onboardingSubmitted, setOnboardingSubmitted] = useState(false);
  const [successNodeCode, setSuccessNodeCode] = useState<string | null>(null);
  const [isRequestingLoan, setIsRequestingLoan] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [loanSummary, setLoanSummary] = useState<{
    disbursementAmount: number;
    repaymentAmount: number;
    repaymentDate: string;
    msisdn: string;
  } | null>(null);

  const frontCardRef = useRef<HTMLInputElement>(null);
  const backCardRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const fallbackUserIdRef = useRef<string>(Date.now().toString());

  const currentTier = Number(userData?.currentTier ?? 1);
  const activeTier = TIER_LIMITS[currentTier];
  const tierMin = activeTier?.min ?? 0;
  const tierMax = activeTier?.max ?? 0;
  const tierMaxTenure = activeTier?.maxTenure ?? 0;
  const amountOptions = useMemo(() => {
    const options = buildAmountOptions(activeTier);
    return options.length ? options : [loanAmount];
  }, [activeTier, loanAmount]);
  const tenureOptions = useMemo(() => {
    if (currentTier === 1) return [1, 5, 10, 14];
    const options = buildTenureOptions(activeTier);
    return options.length ? options : [loanTenure];
  }, [activeTier, currentTier, loanTenure]);

  useEffect(() => {
    // Protect onboarding view: only allow if applicant is new or kycStatus is pending
    if (view === "onboarding") {
      const kyc = (applicant as any)?.kycStatus as string | undefined;
      const isNew = (applicant as any)?.isNewUser as boolean | undefined;
      if (!isNew && kyc && kyc.toLowerCase() !== "pending") {
        // already verified or not eligible — send to loan dashboard
        setView("loan-dashboard");
      }
    }
    if (amountOptions.length && !amountOptions.includes(loanAmount)) {
      setLoanAmount(amountOptions[0]);
    }
    if (tenureOptions.length && !tenureOptions.includes(loanTenure)) {
      setLoanTenure(tenureOptions[0]);
    }
  }, [amountOptions, tenureOptions, loanAmount, loanTenure]);

  const autoSubmitRef = useRef(false);

  const normalizedMsisdn = useMemo(() => {
    const parsed = parsePhoneNumberFromString(msisdnInput, "GH");
    if (!parsed) return null;
    return parsed.number.replace("+", "");
  }, [msisdnInput]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = globalThis.setInterval(() => {
      setResendSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => globalThis.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    const storedToken = globalThis.localStorage.getItem("agenda_token");
    if (!storedToken) return;
    setAuthToken(storedToken);

    const restoreSession = async () => {
      try {
        const response = await fetch(`${baseApiUrl}/api/auth/me`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${storedToken}`,
          },
        });
        const payload = await response.json();
        if (response.ok) {
          if (payload?.user) {
            setApplicant(payload.user);
            setUserData(payload.user);
          }

          const isVerified = payload?.user?.kycStatus === "VERIFIED";
          setView(isVerified ? "loan-dashboard" : "onboarding");
          return;
        }

        globalThis.localStorage.removeItem("agenda_token");
        setAuthToken(null);
      } catch (error) {
        console.error("Session check failed", error);
      }
    };

    void restoreSession();
  }, [setApplicant]);


  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (onboardingData.ghanaCardFrontUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(onboardingData.ghanaCardFrontUrl);
      }
      if (onboardingData.ghanaCardBackUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(onboardingData.ghanaCardBackUrl);
      }
      if (onboardingData.selfieUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(onboardingData.selfieUrl);
      }
    };
  }, [onboardingData.ghanaCardFrontUrl, onboardingData.ghanaCardBackUrl, onboardingData.selfieUrl]);


  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? 200 : -200, opacity: 0 }),
  };

  const resetAutoSubmit = useCallback(() => {
    autoSubmitRef.current = false;
  }, []);

  const handleRequestOtp = async () => {
    setErrorMessage(null);

    if (!nodeCode.trim()) {
      setErrorMessage("Please enter your Agent code.");
      return;
    }

    if (!normalizedMsisdn) {
      setErrorMessage("Enter a valid phone number (e.g. 024xxxxxxx or +233xxxxxxxxx).");
      return;
    }

    setIsRequesting(true);
    try {
      const response = await fetch(`${baseApiUrl}/api/auth/request`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          msisdn: normalizedMsisdn,
          nodeCode: nodeCode.trim(),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to request OTP.");
      }

      setNodeName(payload?.nodeName ?? "your agent");
      setOtp("");
      resetAutoSubmit();
      setResendSeconds(RESEND_SECONDS);
      setDirection(1);
      setView("otp");
    } catch (error: any) {
      setErrorMessage(error?.message || "Unable to request OTP. Please try again.");
    } finally {
      setIsRequesting(false);
    }
  };

  // Wrapped in useCallback to prevent re-creation on every render and allow
  // safe inclusion in useEffect dependencies for auto-OTP submission
  const handleVerifyOtp = useCallback(async () => {
    if (!normalizedMsisdn) {
      setErrorMessage("Enter a valid phone number to continue.");
      resetAutoSubmit();
      return;
    }

    if (otp.length !== OTP_LENGTH) {
      resetAutoSubmit();
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${baseApiUrl}/api/auth/verify`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          msisdn: normalizedMsisdn,
          otp,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "OTP verification failed.");
      }

      if (payload?.user) {
        setApplicant(payload.user);
        setUserData(payload.user);
      }

      if (payload?.token) {
        globalThis.localStorage.setItem("agenda_token", payload.token);
        setAuthToken(payload.token);
      }

      if (payload?.isNewUser) {
        setView("onboarding");
      } else {
        setView("loan-dashboard");
      }
    } catch (error: any) {
      setErrorMessage(error?.message || "OTP verification failed. Try again.");
      resetAutoSubmit();
    } finally {
      setIsVerifying(false);
    }
  }, [normalizedMsisdn, otp, setApplicant, resetAutoSubmit]);

  useEffect(() => {
    if (view !== "otp") return;
    if (otp.length !== OTP_LENGTH) return;
    if (isVerifying) return;
    if (autoSubmitRef.current) return;
    autoSubmitRef.current = true;
    void handleVerifyOtp();
  }, [otp, isVerifying, view, handleVerifyOtp]);

  const handleResend = async () => {
    if (resendSeconds > 0 || isRequesting) return;
    if (!normalizedMsisdn) {
      setErrorMessage("Enter a valid phone number to resend OTP.");
      return;
    }

    setIsRequesting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${baseApiUrl}/api/auth/resend`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          msisdn: normalizedMsisdn,
          nodeCode: nodeCode.trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to resend OTP.");
      }

      setResendSeconds(RESEND_SECONDS);
    } catch (error: any) {
      setErrorMessage(error?.message || "Unable to resend OTP. Try again.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleBack = () => {
    if (view === "otp") {
      setDirection(-1);
      setView("auth");
      setOtp("");
      resetAutoSubmit();
      return;
    }
    if (view === "onboarding" || view === "loan-dashboard") {
      globalThis.localStorage.removeItem("agenda_token");
      setAuthToken(null);
      setUserData(null);
      setDirection(-1);
      setView("auth");
      setOtp("");
      resetAutoSubmit();
    }
  };

  const canSubmitEntry = Boolean(normalizedMsisdn && nodeCode.trim());
  const canVerify = otp.length === OTP_LENGTH;

  const headerMeta = useMemo(() => getHeaderMeta(view), [view]);

  const handleOnboardingChange = (field: keyof typeof onboardingData, value: string) => {
    setOnboardingData((prev) => ({ ...prev, [field]: value }));
  };

  const formatGhanaCardNumber = (value: string) => {
    const digitsOnly = value.match(/\d/g)?.join("") ?? "";
    if (digitsOnly.length === 0) return "GHA-";
    if (digitsOnly.length <= 9) return `GHA-${digitsOnly}`;
    return `GHA-${digitsOnly.slice(0, 9)}-${digitsOnly.slice(9, 10)}`;
  };

  const isValidGhanaCard = (value: string) => /^GHA-\d{9}-\d$/.test(value);

  const handleGhanaCardChange = (value: string) => {
    if (!value.startsWith("GHA-")) return;
    handleOnboardingChange("ghanaCardNumber", formatGhanaCardNumber(value));
  };

  const handleUpload = async (file: File, field: "ghanaCardFrontUrl" | "ghanaCardBackUrl" | "selfieUrl") => {
    // Revoke the old blob URL if it exists
    const oldUrl = onboardingData[field];
    oldUrl?.startsWith("blob:") && URL.revokeObjectURL(oldUrl);
    
    // Create a blob URL for preview
    const blobUrl = URL.createObjectURL(file);
    handleOnboardingChange(field, blobUrl);
    
    // Store the file for later upload
    setUploadedFiles(prev => ({ ...prev, [field]: file }));
  };

  const getFileExtension = useCallback((file: File): string => {
    const name = file.name;
    const lastDot = name.lastIndexOf(".");
    if (lastDot === -1) return ".jpg";
    return name.substring(lastDot);
  }, []);

  const validateOnboardingStep1 = () => {
    if (!authToken) return "Your session expired. Please verify OTP again.";
    if (!onboardingData.firstName || !onboardingData.surname || !onboardingData.dob) {
      return "Please complete all personal details.";
    }
    if (!onboardingData.gender || !onboardingData.region || !onboardingData.address) {
      return "Please provide your region and residential address.";
    }

    // Address must be at least 3 words
    const wordCount = onboardingData.address.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 3) {
      return "Please provide a full residential address (at least 3 words).";
    }
    // Ensure residence/employment/education fields are present
    if (!onboardingData.accommodationType || !onboardingData.yearsAtAddress) {
      return "Please provide your accommodation type and years at address.";
    }
    if (!onboardingData.educationLevel || !onboardingData.employmentStatus || !onboardingData.monthlyIncome) {
      return "Please provide your education, employment status and monthly income.";
    }
    return null;
  };

  const validateOnboardingStep2 = () => {
    if (!isValidGhanaCard(onboardingData.ghanaCardNumber)) {
      return "Ghana Card number must be in the format GHA-700000000-0.";
    }
    if (!onboardingData.ghanaCardFrontUrl || !onboardingData.ghanaCardBackUrl || !onboardingData.selfieUrl) {
      return "Please upload Ghana Card images and a live selfie.";
    }
    return null;
  };

  const handleOnboardingSubmit = async () => {
    setErrorMessage(null);

    const validationError = validateOnboardingStep2();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmittingOnboarding(true);
    try {
      let ghanaCardFrontUrl = onboardingData.ghanaCardFrontUrl;
      let ghanaCardBackUrl = onboardingData.ghanaCardBackUrl;
      let selfieUrl = onboardingData.selfieUrl;

      const userId = normalizedMsisdn || fallbackUserIdRef.current;

      const uploadFile = async (file: File, label: string, errorMessage: string) => {
        const fileExt = getFileExtension(file);
        const result = await uploadToSupabase(
          file,
          "kyc-documents",
          `${userId}/${label}-${Date.now()}${fileExt}`
        );
        if (!result.success || !result.url) {
          throw new Error(result.error || errorMessage);
        }
        return result.url;
      };

      if (uploadedFiles.ghanaCardFrontUrl) {
        ghanaCardFrontUrl = await uploadFile(
          uploadedFiles.ghanaCardFrontUrl,
          "ghana-card-front",
          "Failed to upload Ghana Card front image."
        );
      }

      if (uploadedFiles.ghanaCardBackUrl) {
        ghanaCardBackUrl = await uploadFile(
          uploadedFiles.ghanaCardBackUrl,
          "ghana-card-back",
          "Failed to upload Ghana Card back image."
        );
      }

      if (uploadedFiles.selfieUrl) {
        selfieUrl = await uploadFile(
          uploadedFiles.selfieUrl,
          "selfie",
          "Failed to upload selfie."
        );
      }

      const response = await fetch(`${baseApiUrl}/api/users/onboard`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
          body: JSON.stringify({
            fullName: `${onboardingData.firstName} ${onboardingData.surname}`,
            firstName: onboardingData.firstName,
            surname: onboardingData.surname,
            dob: onboardingData.dob,
            gender: onboardingData.gender,
            region: onboardingData.region,
            address: onboardingData.address,
            accommodationType: onboardingData.accommodationType,
            yearsAtAddress: onboardingData.yearsAtAddress,
            educationLevel: onboardingData.educationLevel,
            employmentStatus: onboardingData.employmentStatus,
            monthlyIncome: onboardingData.monthlyIncome,
            ghanaCardNumber: onboardingData.ghanaCardNumber,
            ghanaCardFrontUrl,
            ghanaCardBackUrl,
            selfieUrl,
            // 🎯 Backend expects these keys to trigger initial loan request
            initialLoanAmount: Number(loanAmount),
            initialLoanTenure: Number(loanTenure),
            initialLoanPurpose: loanPurpose,
          }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to submit onboarding.");
      }

      if (payload?.user) {
        setApplicant(payload.user);
        setUserData(payload.user);
        setSuccessNodeCode(payload.user.nodeCode || payload.user.node || payload.nodeCode || null);
      }

      // mark onboarding as submitted and show the success view
      setOnboardingSubmitted(true);
      setView("success");
    } catch (error: any) {
      setErrorMessage(error?.message || "Unable to submit onboarding. Try again.");
    } finally {
      setIsSubmittingOnboarding(false);
    }
  };

  const handleLoanRequest = async () => {
    setErrorMessage(null);

    if (!authToken) {
      setErrorMessage("Your session expired. Please verify OTP again.");
      return;
    }
    // If onboarding hasn't been submitted yet, submit it first using the users/onboard controller
    if (!onboardingSubmitted) {
      // reuse existing onboarding submit which handles uploads and shows success view
      await handleOnboardingSubmit();
      return;
    }

    setIsRequestingLoan(true);
    try {
      const response = await fetch(`${baseApiUrl}/api/loans/request`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          loanAmount,
          loanTenure,
          loanPurpose,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to request loan.");
      }

      const repaymentDate = payload?.repaymentDate
        ? new Date(payload.repaymentDate).toDateString()
        : new Date(Date.now() + loanTenure * 24 * 60 * 60 * 1000).toDateString();

      setLoanSummary({
        disbursementAmount: Number(payload?.disbursementAmount ?? loanAmount),
        repaymentAmount: Number(payload?.repaymentAmount ?? loanAmount),
        repaymentDate,
        msisdn: String(payload?.msisdn ?? userData?.msisdn ?? ""),
      });
    } catch (error: any) {
      setErrorMessage(error?.message || "Unable to request loan. Try again.");
    } finally {
      setIsRequestingLoan(false);
    }
  };

  let entryButtonLabel = "Verify Account";
  if (isRequesting) entryButtonLabel = "Sending...";

  let verifyButtonLabel = "Verify";
  if (isVerifying) verifyButtonLabel = "Verifying...";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-pink flex items-center justify-center shadow-pink">
              <span className="text-primary-foreground font-bold text-lg">A</span>
            </div>
            <span className="font-bold text-xl">Agenda Money</span>
          </div>
          <Badge variant="outline" className="border-primary/20 text-primary">Customer Portal</Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-2"
              >
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Welcome to Agenda Money</h1>
                <p className="text-muted-foreground">
                  Verify your identity to get started.
                </p>
              </motion.div>

        <Card className="border-0 shadow-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-pink" />
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{headerMeta.stepLabel}</p>
                <p className="text-xl font-semibold">{headerMeta.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{headerMeta.description}</p>
              </div>
              {headerMeta.badgeLabel && (
                <Badge variant="secondary">{headerMeta.badgeLabel}</Badge>
              )}
            </div>

            {errorMessage && (
              <Alert className="border-destructive/30 bg-destructive/10">
                <AlertDescription className="text-destructive">{errorMessage}</AlertDescription>
              </Alert>
            )}

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={view}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {view === "auth" && (
                  <AuthStep
                    msisdnInput={msisdnInput}
                    nodeCode={nodeCode}
                    setMsisdnInput={setMsisdnInput}
                    setNodeCode={setNodeCode}
                    canSubmitEntry={canSubmitEntry}
                    isRequesting={isRequesting}
                    entryButtonLabel={entryButtonLabel}
                    handleRequestOtp={handleRequestOtp}
                  />
                )}

                {view === "otp" && (
                  <OtpStep
                    otp={otp}
                    nodeName={nodeName}
                    canVerify={canVerify}
                    isVerifying={isVerifying}
                    verifyButtonLabel={verifyButtonLabel}
                    resendSeconds={resendSeconds}
                    isRequesting={isRequesting}
                    setOtp={setOtp}
                    resetAutoSubmit={resetAutoSubmit}
                    handleVerifyOtp={handleVerifyOtp}
                    handleResend={handleResend}
                  />
                )}

                {view === "onboarding" && (
                  onboardingStep === 1 ? (
                    <OnboardingStep1
                      onboardingData={onboardingData}
                      handleOnboardingChange={handleOnboardingChange}
                      onNext={() => {
                          const err = validateOnboardingStep1();
                          console.log("Onboarding step1 validation:", err, onboardingData);
                          if (err) {
                            setErrorMessage(err);
                            // scroll to top so user sees the error
                            window.scrollTo({ top: 0, behavior: "smooth" });
                            return;
                          }
                          setErrorMessage(null);
                          setDirection(1);
                          setOnboardingStep(2);
                      }}
                    />
                  ) : (
                    <OnboardingStep2
                      onboardingData={onboardingData}
                      frontCardRef={frontCardRef}
                      backCardRef={backCardRef}
                      selfieRef={selfieRef}
                      handleOnboardingChange={handleOnboardingChange}
                      handleGhanaCardChange={handleGhanaCardChange}
                      handleUpload={handleUpload}
                      isSubmitting={isSubmittingOnboarding}
                      onBack={() => setOnboardingStep(1)}
                      onContinue={() => {
                        // Validate step2 before continuing
                        const err = validateOnboardingStep2();
                        if (err) {
                          setErrorMessage(err);
                          return;
                        }
                        setErrorMessage(null);
                        // Do not submit to API yet; move to loan dashboard where final submit will trigger users/onboard
                        setView("loan-dashboard");
                      }}
                    />
                  )
                )}

                {view === "loan-dashboard" && (
                  <LoanDashboardView
                    fullName={userData?.fullName as string | undefined}
                    tierNumber={currentTier}
                    loanAmount={loanAmount}
                    loanTenure={loanTenure}
                    loanPurpose={loanPurpose}
                    tierMin={tierMin}
                    tierMax={tierMax}
                    tierMaxTenure={tierMaxTenure}
                    amountOptions={amountOptions}
                    tenureOptions={tenureOptions}
                    isRequestingLoan={isRequestingLoan}
                    loanSummary={loanSummary}
                    onRequestLoan={handleLoanRequest}
                    setLoanAmount={setLoanAmount}
                    setLoanTenure={setLoanTenure}
                    setLoanPurpose={setLoanPurpose}
                  />
                )}

                {view === "success" && (
                  <div className="text-center space-y-6">
                    <h2 className="text-2xl font-semibold">Application Submitted</h2>
                    <p className="text-muted-foreground">Application Pending. We will notify you via SMS once verified.</p>
                    {successNodeCode && (
                      <div className="inline-block bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Your Node Code</p>
                        <p className="font-mono font-bold text-lg">{successNodeCode}</p>
                      </div>
                    )}
                    <div>
                      <Button onClick={() => {
                        // After success, navigate to loan dashboard view
                        setView("loan-dashboard");
                      }} className="mt-4 h-12 w-44 bg-gradient-pink">Go to Loan Center</Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={view === "auth"}
                className={cn(view === "auth" && "invisible")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              <div className="text-xs text-muted-foreground">
                🔒 Secure OTP verification • Powered by Agenda Money
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
