import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useApplicant } from "@/contexts/ApplicantContext";
import { uploadToSupabase } from "@/lib/supabase";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  CreditCard,
  Hash,
  KeyRound,
  Loader2,
  MapPin,
  Phone,
  RotateCw,
  ShieldCheck,
  TrendingUp,
  Upload,
  User,
  ImageIcon,
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
const ACCOMMODATION_TYPES = ["Owned", "Rented", "Living with family", "Other"];
const EDUCATION_LEVELS = ["None", "Primary", "Secondary", "Tertiary"];
const EMPLOYMENT_OPTIONS = ["Employed", "Self-Employed", "Unemployed", "Student"];
const INCOME_BRACKETS = ["Below GHS 1000", "GHS 1000-2000", "GHS 2000-5000", "Above GHS 5000"];

type TierLimit = {
  tier: number;
  min: number;
  max: number;
  maxTenure: number;
  amounts?: number[];
  tenures?: number[];
};

const TIER_LIMITS: Record<number, TierLimit> = {
  1: { tier: 1, min: 50, max: 300, maxTenure: 14 },
  2: { tier: 2, min: 100, max: 600, maxTenure: 21 },
  3: { tier: 3, min: 150, max: 900, maxTenure: 30 },
  4: { tier: 4, min: 50, max: 500, maxTenure: 14 },
};

const buildAmountOptions = (tier?: TierLimit) => {
  if (!tier) return [];
  if (tier.amounts?.length) return tier.amounts;
  if (!tier.min || !tier.max) return [];
  const step = 50;
  const count = Math.floor((tier.max - tier.min) / step) + 1;
  return Array.from({ length: count }, (_, i) => tier.min + i * step);
};

const buildTenureOptions = (tier?: TierLimit) => {
  if (!tier) return [];
  if (tier.tenures?.length) return tier.tenures;
  if (!tier.maxTenure) return [];
  const base = [1, 5, 10, tier.maxTenure];
  return Array.from(new Set(base)).sort((a, b) => a - b);
};

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 300 : -300, opacity: 0 }),
};

type View = "auth" | "otp" | "onboarding" | "loan-dashboard" | "success";

// ─── Onboarding steps config (matches agent page) ───
const ONBOARDING_STEPS = [
  { number: 1, title: "Personal Info", icon: User, description: "Bio-data & contact" },
  { number: 2, title: "Residence", icon: MapPin, description: "Location & employment" },
  { number: 3, title: "Documents", icon: ImageIcon, description: "ID verification" },
  { number: 4, title: "Loan Request", icon: CreditCard, description: "Amount & tenure" },
];

function EstimatedTermSheet({ amount, tenure }: { amount: number; tenure: number }) {
  const interestRate = 0.08;
  const serviceFeeRate = 0.02;
  const interest = Math.round(amount * interestRate);
  const serviceFee = Math.round(amount * serviceFeeRate);
  const repaymentAmount = amount + interest + serviceFee;
  const repaymentDate = new Date(Date.now() + tenure * 24 * 60 * 60 * 1000).toDateString();

  return (
    <div className="mt-2 text-sm space-y-1">
      <p><span className="text-muted-foreground">Principal:</span> GHS {amount}</p>
      <p><span className="text-muted-foreground">Interest (est {Math.round(interestRate * 100)}%):</span> GHS {interest}</p>
      <p><span className="text-muted-foreground">Service fee (est {Math.round(serviceFeeRate * 100)}%):</span> GHS {serviceFee}</p>
      <p className="font-semibold"><span className="text-muted-foreground">Estimated repayment:</span> GHS {repaymentAmount}</p>
      <p className="text-muted-foreground">Estimated repayment date: {repaymentDate}</p>
    </div>
  );
}

// eslint-disable-next-line sonarjs/cognitive-complexity
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

  // Onboarding step (1-4, mirroring agent page)
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingDirection, setOnboardingDirection] = useState(0);

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

  const [loanAmount, setLoanAmount] = useState(100);
  const [loanTenure, setLoanTenure] = useState(14);
  const [loanPurpose, setLoanPurpose] = useState("Business");
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);
  const [onboardingSubmitted, setOnboardingSubmitted] = useState(false);
  const [successNodeCode, setSuccessNodeCode] = useState<string | null>(null);
  const [isRequestingLoan, setIsRequestingLoan] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});
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
  const autoSubmitRef = useRef(false);

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

  const normalizedMsisdn = useMemo(() => {
    const parsed = parsePhoneNumberFromString(msisdnInput, "GH");
    if (!parsed) return null;
    return parsed.number.replace("+", "");
  }, [msisdnInput]);

  // ─── Effects ───
  useEffect(() => {
    if (view === "onboarding") {
      const kyc = (applicant as any)?.kycStatus as string | undefined;
      const isNew = (applicant as any)?.isNewUser as boolean | undefined;
      if (!isNew && kyc && kyc.toLowerCase() !== "pending") {
        setView("loan-dashboard");
      }
    }
    if (amountOptions.length && !amountOptions.includes(loanAmount)) {
      setLoanAmount(amountOptions[0]);
    }
    if (tenureOptions.length && !tenureOptions.includes(loanTenure)) {
      setLoanTenure(tenureOptions[0]);
    }
  }, [amountOptions, tenureOptions, loanAmount, loanTenure, view, applicant]);

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
          headers: { Accept: "application/json", Authorization: `Bearer ${storedToken}` },
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

  useEffect(() => {
    return () => {
      if (onboardingData.ghanaCardFrontUrl?.startsWith("blob:")) URL.revokeObjectURL(onboardingData.ghanaCardFrontUrl);
      if (onboardingData.ghanaCardBackUrl?.startsWith("blob:")) URL.revokeObjectURL(onboardingData.ghanaCardBackUrl);
      if (onboardingData.selfieUrl?.startsWith("blob:")) URL.revokeObjectURL(onboardingData.selfieUrl);
    };
  }, [onboardingData.ghanaCardFrontUrl, onboardingData.ghanaCardBackUrl, onboardingData.selfieUrl]);

  // ─── Handlers ───
  const resetAutoSubmit = useCallback(() => { autoSubmitRef.current = false; }, []);

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
    const oldUrl = onboardingData[field];
    oldUrl?.startsWith("blob:") && URL.revokeObjectURL(oldUrl);
    const blobUrl = URL.createObjectURL(file);
    handleOnboardingChange(field, blobUrl);
    setUploadedFiles(prev => ({ ...prev, [field]: file }));
  };

  const getFileExtension = useCallback((file: File): string => {
    const name = file.name;
    const lastDot = name.lastIndexOf(".");
    if (lastDot === -1) return ".jpg";
    return name.substring(lastDot);
  }, []);

  const handleRequestOtp = async () => {
    setErrorMessage(null);
    if (!nodeCode.trim()) { setErrorMessage("Please enter your agent code."); return; }
    if (!normalizedMsisdn) { setErrorMessage("Please enter a valid Ghanaian phone number."); return; }

    setIsRequesting(true);
    try {
      const response = await fetch(`${baseApiUrl}/api/auth/request`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ msisdn: normalizedMsisdn, nodeCode: nodeCode.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Unable to request OTP.");

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

  const handleVerifyOtp = useCallback(async () => {
    if (!normalizedMsisdn) { setErrorMessage("Enter a valid phone number to continue."); resetAutoSubmit(); return; }
    if (otp.length !== OTP_LENGTH) { resetAutoSubmit(); return; }

    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${baseApiUrl}/api/auth/verify`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ msisdn: normalizedMsisdn, otp }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "OTP verification failed.");

      if (payload?.user) { setApplicant(payload.user); setUserData(payload.user); }
      if (payload?.token) { globalThis.localStorage.setItem("agenda_token", payload.token); setAuthToken(payload.token); }
      if (payload?.isNewUser) { setView("onboarding"); } else { setView("loan-dashboard"); }
    } catch (error: any) {
      setErrorMessage(error?.message || "OTP verification failed. Try again.");
      resetAutoSubmit();
    } finally {
      setIsVerifying(false);
    }
  }, [normalizedMsisdn, otp, setApplicant, resetAutoSubmit]);

  useEffect(() => {
    if (view !== "otp" || otp.length !== OTP_LENGTH || isVerifying || autoSubmitRef.current) return;
    autoSubmitRef.current = true;
    void handleVerifyOtp();
  }, [otp, isVerifying, view, handleVerifyOtp]);

  const handleResend = async () => {
    if (resendSeconds > 0 || isRequesting) return;
    if (!normalizedMsisdn) { setErrorMessage("Enter a valid phone number to resend OTP."); return; }
    setIsRequesting(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${baseApiUrl}/api/auth/resend`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ msisdn: normalizedMsisdn, nodeCode: nodeCode.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Unable to resend OTP.");
      setResendSeconds(RESEND_SECONDS);
    } catch (error: any) {
      setErrorMessage(error?.message || "Unable to resend OTP. Try again.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleBack = () => {
    if (view === "otp") {
      setDirection(-1); setView("auth"); setOtp(""); resetAutoSubmit(); return;
    }
    if (view === "onboarding" || view === "loan-dashboard") {
      globalThis.localStorage.removeItem("agenda_token");
      setAuthToken(null); setUserData(null); setDirection(-1); setView("auth"); setOtp(""); resetAutoSubmit();
    }
  };

  // ─── Onboarding validation ───
  const validateOnboardingStep = (step: number): string | null => {
    switch (step) {
      case 1:
        if (!onboardingData.firstName || !onboardingData.surname || !onboardingData.dob) return "Please complete all personal details.";
        if (!onboardingData.gender) return "Please select your gender.";
        return null;
      case 2:
        if (!onboardingData.region || !onboardingData.address) return "Please provide your region and residential address.";
        const wordCount = onboardingData.address.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount < 3) return "Please provide a full residential address (at least 3 words).";
        if (!onboardingData.accommodationType || !onboardingData.yearsAtAddress) return "Please provide accommodation details.";
        if (!onboardingData.educationLevel || !onboardingData.employmentStatus || !onboardingData.monthlyIncome) return "Please complete all employment details.";
        return null;
      case 3:
        if (!isValidGhanaCard(onboardingData.ghanaCardNumber)) return "Ghana Card number must be in format GHA-XXXXXXXXX-X.";
        if (!onboardingData.ghanaCardFrontUrl || !onboardingData.ghanaCardBackUrl || !onboardingData.selfieUrl) return "Please upload Ghana Card images and a live selfie.";
        return null;
      case 4:
        if (!loanAmount || !loanTenure || !loanPurpose) return "Please complete your loan request details.";
        return null;
      default:
        return null;
    }
  };

  const handleOnboardingNext = () => {
    const err = validateOnboardingStep(onboardingStep);
    if (err) { setErrorMessage(err); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setErrorMessage(null);
    setOnboardingDirection(1);
    setOnboardingStep(prev => prev + 1);
  };

  const handleOnboardingBack = () => {
    setErrorMessage(null);
    setOnboardingDirection(-1);
    setOnboardingStep(prev => prev - 1);
  };

  const handleOnboardingSubmit = async () => {
    setErrorMessage(null);
    const err = validateOnboardingStep(onboardingStep);
    if (err) { setErrorMessage(err); return; }

    setIsSubmittingOnboarding(true);
    try {
      let ghanaCardFrontUrl = onboardingData.ghanaCardFrontUrl;
      let ghanaCardBackUrl = onboardingData.ghanaCardBackUrl;
      let selfieUrl = onboardingData.selfieUrl;
      const userId = normalizedMsisdn || fallbackUserIdRef.current;

      const uploadFile = async (file: File, label: string, errorMsg: string) => {
        const fileExt = getFileExtension(file);
        const result = await uploadToSupabase(file, "kyc-documents", `${userId}/${label}-${Date.now()}${fileExt}`);
        if (!result.success || !result.url) throw new Error(result.error || errorMsg);
        return result.url;
      };

      if (uploadedFiles.ghanaCardFrontUrl) ghanaCardFrontUrl = await uploadFile(uploadedFiles.ghanaCardFrontUrl, "ghana-card-front", "Failed to upload Ghana Card front.");
      if (uploadedFiles.ghanaCardBackUrl) ghanaCardBackUrl = await uploadFile(uploadedFiles.ghanaCardBackUrl, "ghana-card-back", "Failed to upload Ghana Card back.");
      if (uploadedFiles.selfieUrl) selfieUrl = await uploadFile(uploadedFiles.selfieUrl, "selfie", "Failed to upload selfie.");

      const response = await fetch(`${baseApiUrl}/api/users/onboard`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
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
          initialLoanAmount: Number(loanAmount),
          initialLoanTenure: Number(loanTenure),
          initialLoanPurpose: loanPurpose,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Unable to submit application.");

      if (payload?.user) {
        setApplicant(payload.user);
        setUserData(payload.user);
        setSuccessNodeCode(payload.user.nodeCode || payload.user.node || payload.nodeCode || null);
      }
      setOnboardingSubmitted(true);
      setView("success");
    } catch (error: any) {
      setErrorMessage(error?.message || "Unable to submit application. Try again.");
    } finally {
      setIsSubmittingOnboarding(false);
    }
  };

  const handleLoanRequest = async () => {
    setErrorMessage(null);
    if (!authToken) { setErrorMessage("Your session expired. Please verify OTP again."); return; }
    const isNewUser = (applicant as any)?.isNewUser !== false;
    if (!onboardingSubmitted && isNewUser) { await handleOnboardingSubmit(); return; }

    setIsRequestingLoan(true);
    try {
      const response = await fetch(`${baseApiUrl}/api/loans/request`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ loanAmount, loanTenure, loanPurpose }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Unable to request loan.");

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

  const canSubmitEntry = Boolean(normalizedMsisdn && nodeCode.trim());
  const canVerify = otp.length === OTP_LENGTH;

  // ─── Render helpers ───
  function renderUploadBox(
    label: string,
    fieldUrl: string,
    isUploading: boolean,
    inputRef: React.RefObject<HTMLInputElement>,
    capture: "user" | "environment",
    onFileChange: (file: File) => void,
    icon: React.ReactNode
  ) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          "border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all",
          fieldUrl ? "border-emerald-500 bg-emerald-500/5" : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
        )}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture={capture}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChange(f); }}
          className="hidden"
        />
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        ) : fieldUrl ? (
          <div className="space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">{label} uploaded ✓</p>
          </div>
        ) : (
          <div className="space-y-3">
            {icon}
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <div className="flex gap-2 justify-center">
              <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }} className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Capture
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }} className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // ─── Success Screen ───
  if (view === "success") {
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

        <main className="max-w-lg mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-0 shadow-2xl overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-emerald-500 to-emerald-600" />
              <CardContent className="pt-10 pb-8 text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
                >
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                  </div>
                </motion.div>

                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-foreground">Application Submitted</h1>
                  <p className="text-muted-foreground">
                    Your application is under review. You will receive an SMS notification once a decision has been made.
                  </p>
                </div>

                {successNodeCode && (
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-2xl border border-primary/20">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Your Node Code</p>
                    <p className="text-3xl font-mono font-bold text-primary mt-2 tracking-wider">{successNodeCode}</p>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <Button onClick={() => setView("loan-dashboard")} className="w-full h-12 bg-gradient-pink hover:opacity-90">
                    Go to Loan Centre
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  // ─── Auth / OTP Views ───
  if (view === "auth" || view === "otp") {
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

        <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {view === "auth" ? "Get Started" : "Verify Your Identity"}
            </h1>
            <p className="text-muted-foreground">
              {view === "auth"
                ? "Enter your mobile number and agent code to begin your application."
                : "A 6-digit code has been sent to your phone."}
            </p>
          </motion.div>

          <Card className="border-0 shadow-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-pink" />
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="secondary" className="mb-2">
                    {view === "auth" ? "Step 1 of 2" : "Step 2 of 2"}
                  </Badge>
                  <p className="text-lg font-semibold">
                    {view === "auth" ? "Account Verification" : "OTP Confirmation"}
                  </p>
                </div>
                {view === "auth" ? (
                  <ShieldCheck className="h-8 w-8 text-primary/40" />
                ) : (
                  <KeyRound className="h-8 w-8 text-primary/40" />
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
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="msisdn" className="flex items-center gap-2 text-sm font-semibold">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          Mobile Number
                        </Label>
                        <Input
                          id="msisdn"
                          type="tel"
                          value={msisdnInput}
                          onChange={(e) => setMsisdnInput(e.target.value)}
                          placeholder="024 XXX XXXX"
                          className="h-12 bg-muted/50 border-0 focus-visible:ring-primary font-mono placeholder:text-muted-foreground/50"
                        />
                        <p className="text-xs text-muted-foreground">This must be your Mobile Money number.</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="nodeCode" className="flex items-center gap-2 text-sm font-semibold">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          Agent Code
                        </Label>
                        <Input
                          id="nodeCode"
                          value={nodeCode}
                          onChange={(e) => setNodeCode(e.target.value)}
                          placeholder="Enter your agent's code"
                          className="h-12 bg-muted/50 border-0 focus-visible:ring-primary font-mono"
                        />
                        <p className="text-xs text-muted-foreground">Your agent will provide this code to you.</p>
                      </div>

                      <Button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={!canSubmitEntry || isRequesting}
                        className="w-full h-12 bg-gradient-pink hover:opacity-90"
                      >
                        {isRequesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                        {isRequesting ? "Sending..." : "Verify Account"}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}

                  {view === "otp" && (
                    <div className="space-y-5">
                      <Alert className="bg-emerald-500/10 border-emerald-500/30">
                        <AlertDescription className="text-emerald-800 dark:text-emerald-200">
                          We will check with <strong>{nodeName || "your agent"}</strong> for approval.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <KeyRound className="h-4 w-4 text-muted-foreground" />
                          6-digit OTP
                        </Label>
                        <InputOTP
                          value={otp}
                          onChange={(value) => { setOtp(value); if (value.length < OTP_LENGTH) resetAutoSubmit(); }}
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
                          {isVerifying ? "Verifying..." : "Verify"}
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
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-between pt-4 border-t">
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
                  🔒 Secure verification • Powered by Agenda Money
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // ─── Loan Dashboard (returning users) ───
  if (view === "loan-dashboard") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 pb-28">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-pink flex items-center justify-center shadow-pink">
                <span className="text-primary-foreground font-bold text-lg">A</span>
              </div>
              <span className="font-bold text-xl">Agenda Money</span>
            </div>
            <Badge variant="outline" className="border-primary/20 text-primary">Loan Centre</Badge>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Loan Centre</h1>
            <p className="text-muted-foreground">Select your loan amount and submit a request.</p>
          </motion.div>

          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600" />
            <CardContent className="p-6 sm:p-8 space-y-6">
              {errorMessage && (
                <Alert className="border-destructive/30 bg-destructive/10">
                  <AlertDescription className="text-destructive">{errorMessage}</AlertDescription>
                </Alert>
              )}

              <Alert className="bg-emerald-500/10 border-emerald-500/30">
                <AlertDescription className="text-emerald-800 dark:text-emerald-200">
                  {tierMin > 0 && tierMax > 0 ? (
                    <><strong>Tier {currentTier} Limits:</strong> GHS {tierMin} – GHS {tierMax} | Max tenure: {tierMaxTenure} days</>
                  ) : (
                    <>Tier {currentTier} verified. Loan limits will appear after eligibility check.</>
                  )}
                </AlertDescription>
              </Alert>

              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Welcome back,</p>
                <p className="text-lg font-semibold">{(userData?.fullName as string) || "Applicant"}</p>
              </div>

              <div className="space-y-2">
                <Label>Loan Amount (GHS)</Label>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    min={tierMin || 0}
                    max={tierMax || undefined}
                    value={String(loanAmount)}
                    onChange={(e) => setLoanAmount(Number(e.target.value || 0))}
                    placeholder={`Min ${tierMin} – Max ${tierMax}`}
                    className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                  />
                  <Select value={String(loanAmount)} onValueChange={(val) => setLoanAmount(Number(val))}>
                    <SelectTrigger className="h-12 bg-muted/50 border-0 focus-visible:ring-primary w-40">
                      <SelectValue placeholder="Presets" />
                    </SelectTrigger>
                    <SelectContent>
                      {amountOptions.map((a) => (
                        <SelectItem key={a} value={String(a)}>GHS {a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Loan Tenure (Days)</Label>
                <div className="flex flex-wrap gap-2">
                  {tenureOptions.map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={loanTenure === t ? "default" : "outline"}
                      size="sm"
                      onClick={() => setLoanTenure(t)}
                      className={loanTenure === t ? "bg-gradient-pink" : ""}
                    >
                      {t} {t === 1 ? "Day" : "Days"}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Loan Purpose</Label>
                <Select value={loanPurpose} onValueChange={setLoanPurpose}>
                  <SelectTrigger className="h-12 bg-muted/50 border-0 focus-visible:ring-primary">
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOAN_PURPOSES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-primary/10 p-4 bg-muted/30">
                <p className="font-semibold text-sm">Estimated Term Sheet</p>
                <EstimatedTermSheet amount={loanAmount} tenure={loanTenure} />
              </div>

              {loanSummary && (
                <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-4 space-y-2">
                  <p className="font-semibold text-sm">Confirmed Term Sheet</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Disbursement:</span> GHS {loanSummary.disbursementAmount}</p>
                    <p><span className="text-muted-foreground">Account:</span> {loanSummary.msisdn}</p>
                    <p><span className="text-muted-foreground">Repayment:</span> GHS {loanSummary.repaymentAmount}</p>
                    <p><span className="text-muted-foreground">Due date:</span> {loanSummary.repaymentDate}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t shadow-2xl p-4 z-50">
          <div className="max-w-2xl mx-auto">
            <Button
              type="button"
              onClick={handleLoanRequest}
              disabled={isRequestingLoan}
              className="w-full h-12 bg-gradient-pink hover:opacity-90"
            >
              {isRequestingLoan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Request Loan
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Onboarding View (new users — matches agent page design) ───
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 pb-28">
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

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Complete Your Application</h1>
          <p className="text-muted-foreground mt-1">Fill in your details across all steps to submit your loan request.</p>
        </motion.div>

        {/* Progress Stepper */}
        <div className="flex items-center justify-between px-2">
          {ONBOARDING_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = onboardingStep === step.number;
            const isCompleted = onboardingStep > step.number;

            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className={cn(
                      "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-semibold transition-all shadow-lg",
                      isCompleted && "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white",
                      isActive && "bg-gradient-pink text-primary-foreground shadow-pink",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                  </motion.div>
                  <p className={cn(
                    "text-xs mt-2 font-medium text-center hidden sm:block",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                </div>
                {index < ONBOARDING_STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-1 mx-2 rounded-full transition-colors",
                    onboardingStep > step.number ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Form Card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className={cn(
            "h-1.5 transition-all duration-300",
            onboardingStep === 1 && "bg-gradient-to-r from-blue-500 to-blue-600",
            onboardingStep === 2 && "bg-gradient-to-r from-amber-500 to-orange-500",
            onboardingStep === 3 && "bg-gradient-pink",
            onboardingStep === 4 && "bg-gradient-to-r from-emerald-500 to-emerald-600"
          )} />

          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              {ONBOARDING_STEPS[onboardingStep - 1].title}
              <Badge variant="secondary" className="font-normal">
                Step {onboardingStep} of 4
              </Badge>
            </CardTitle>
            <CardDescription>
              {onboardingStep === 1 && "Provide your full name, date of birth, and gender."}
              {onboardingStep === 2 && "Tell us about your residence and employment."}
              {onboardingStep === 3 && "Upload clear photos of your Ghana Card and a live selfie."}
              {onboardingStep === 4 && "Select your preferred loan amount, tenure, and purpose."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMessage && (
              <Alert className="border-destructive/30 bg-destructive/10 mb-4">
                <AlertDescription className="text-destructive">{errorMessage}</AlertDescription>
              </Alert>
            )}

            <AnimatePresence mode="wait" custom={onboardingDirection}>
              <motion.div
                key={onboardingStep}
                custom={onboardingDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {/* Step 1: Personal Info */}
                {onboardingStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
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

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="dob">Date of Birth *</Label>
                        <Input
                          id="dob"
                          type="date"
                          value={onboardingData.dob}
                          onChange={(e) => handleOnboardingChange("dob", e.target.value)}
                          max={new Date().toISOString().split("T")[0]}
                          className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender *</Label>
                        <Select value={onboardingData.gender} onValueChange={(val) => handleOnboardingChange("gender", val)}>
                          <SelectTrigger className="h-12 bg-muted/50 border-0">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Residence & Employment */}
                {onboardingStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Region *</Label>
                      <Select value={onboardingData.region} onValueChange={(val) => handleOnboardingChange("region", val)}>
                        <SelectTrigger className="h-12 bg-muted/50 border-0">
                          <SelectValue placeholder="Select your region" />
                        </SelectTrigger>
                        <SelectContent>
                          {GHANA_REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Residential Address *</Label>
                      <Textarea
                        value={onboardingData.address}
                        onChange={(e) => handleOnboardingChange("address", e.target.value)}
                        placeholder="House No. 12, Dzorwulu Street, Accra"
                        rows={2}
                        className="resize-none bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Accommodation *</Label>
                        <Select value={onboardingData.accommodationType} onValueChange={(val) => handleOnboardingChange("accommodationType", val)}>
                          <SelectTrigger className="h-12 bg-muted/50 border-0">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {ACCOMMODATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Years at Address *</Label>
                        <Input
                          type="number"
                          value={onboardingData.yearsAtAddress}
                          onChange={(e) => handleOnboardingChange("yearsAtAddress", e.target.value)}
                          placeholder="e.g. 3"
                          min="0"
                          max="50"
                          className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Education Level *</Label>
                      <Select value={onboardingData.educationLevel} onValueChange={(val) => handleOnboardingChange("educationLevel", val)}>
                        <SelectTrigger className="h-12 bg-muted/50 border-0">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          {EDUCATION_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Employment *</Label>
                        <Select value={onboardingData.employmentStatus} onValueChange={(val) => handleOnboardingChange("employmentStatus", val)}>
                          <SelectTrigger className="h-12 bg-muted/50 border-0">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {EMPLOYMENT_OPTIONS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Monthly Income *</Label>
                        <Select value={onboardingData.monthlyIncome} onValueChange={(val) => handleOnboardingChange("monthlyIncome", val)}>
                          <SelectTrigger className="h-12 bg-muted/50 border-0">
                            <SelectValue placeholder="Range" />
                          </SelectTrigger>
                          <SelectContent>
                            {INCOME_BRACKETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Documents */}
                {onboardingStep === 3 && (
                  <div className="space-y-4">
                    <Alert className="bg-blue-500/10 border-blue-500/30">
                      <Camera className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 dark:text-blue-200">
                        Please take clear, well-lit photos of your Ghana Card and a live selfie for identity verification.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label>Ghana Card Number *</Label>
                      <Input
                        value={onboardingData.ghanaCardNumber || "GHA-"}
                        onChange={(e) => handleGhanaCardChange(e.target.value)}
                        placeholder="GHA-123456789-0"
                        maxLength={16}
                        className="h-12 font-mono bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                      <p className="text-xs text-muted-foreground">Format: GHA-XXXXXXXXX-X</p>
                    </div>

                    <div className="grid gap-3">
                      {renderUploadBox(
                        "Ghana Card (Front)",
                        onboardingData.ghanaCardFrontUrl,
                        !!uploadProgress.ghanaCardFrontUrl,
                        frontCardRef,
                        "environment",
                        (f) => handleUpload(f, "ghanaCardFrontUrl"),
                        <CreditCard className="h-8 w-8 text-muted-foreground mx-auto" />
                      )}
                      {renderUploadBox(
                        "Ghana Card (Back)",
                        onboardingData.ghanaCardBackUrl,
                        !!uploadProgress.ghanaCardBackUrl,
                        backCardRef,
                        "environment",
                        (f) => handleUpload(f, "ghanaCardBackUrl"),
                        <CreditCard className="h-8 w-8 text-muted-foreground mx-auto" />
                      )}
                      {renderUploadBox(
                        "Live Selfie",
                        onboardingData.selfieUrl,
                        !!uploadProgress.selfieUrl,
                        selfieRef,
                        "user",
                        (f) => handleUpload(f, "selfieUrl"),
                        <User className="h-8 w-8 text-muted-foreground mx-auto" />
                      )}
                    </div>
                  </div>
                )}

                {/* Step 4: Loan Request */}
                {onboardingStep === 4 && (
                  <div className="space-y-4">
                    <Alert className="bg-emerald-500/10 border-emerald-500/30">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-emerald-800 dark:text-emerald-200">
                        <strong>Tier 1 Limits:</strong> GHS 50 – GHS 300 | Maximum tenure: 14 days
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label>Loan Amount (GHS) *</Label>
                      <Select value={String(loanAmount)} onValueChange={(val) => setLoanAmount(Number(val))}>
                        <SelectTrigger className="h-12 bg-muted/50 border-0 focus-visible:ring-primary">
                          <SelectValue placeholder="Select amount" />
                        </SelectTrigger>
                        <SelectContent>
                          {amountOptions.map((a) => (
                            <SelectItem key={a} value={String(a)}>GHS {a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Loan Tenure (Days) *</Label>
                      <div className="flex flex-wrap gap-2">
                        {tenureOptions.map((t) => (
                          <Button
                            key={t}
                            type="button"
                            variant={loanTenure === t ? "default" : "outline"}
                            size="sm"
                            onClick={() => setLoanTenure(t)}
                            className={loanTenure === t ? "bg-gradient-pink" : ""}
                          >
                            {t} {t === 1 ? "Day" : "Days"}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Loan Purpose *</Label>
                      <Select value={loanPurpose} onValueChange={setLoanPurpose}>
                        <SelectTrigger className="h-12 bg-muted/50 border-0 focus-visible:ring-primary">
                          <SelectValue placeholder="Select purpose" />
                        </SelectTrigger>
                        <SelectContent>
                          {LOAN_PURPOSES.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-xl border border-primary/10 p-4 bg-muted/30">
                      <p className="font-semibold text-sm">Estimated Term Sheet</p>
                      <EstimatedTermSheet amount={loanAmount} tenure={loanTenure} />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </main>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t shadow-2xl p-4 z-50">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            variant="outline"
            onClick={onboardingStep === 1 ? handleBack : handleOnboardingBack}
            className="flex-1 h-12 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {onboardingStep < 4 ? (
            <Button
              onClick={handleOnboardingNext}
              className="flex-1 h-12 rounded-xl bg-gradient-pink hover:opacity-90"
            >
              Next Step
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleOnboardingSubmit}
              disabled={isSubmittingOnboarding}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90"
            >
              {isSubmittingOnboarding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Application
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
