import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useApplicant } from "@/contexts/ApplicantContext";
import { uploadToSupabase } from "@/lib/supabase";
import agendaLogo from "@/assets/agenda-money-logo.jpg";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  Upload,
  User,
  Eye,
  EyeOff,
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
  enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 200 : -200, opacity: 0 }),
};

type View = "auth" | "otp" | "onboarding" | "loan-dashboard" | "success";

const STEPS = [
  { number: 1, label: "Personal" },
  { number: 2, label: "Residence" },
  { number: 3, label: "Documents" },
  { number: 4, label: "Loan" },
];

/* ─── Shared Header ─── */
function PageHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <img src={agendaLogo} alt="Agenda Money" className="h-8 rounded-lg" />
        {subtitle && (
          <span className="text-xs font-medium text-muted-foreground">{subtitle}</span>
        )}
      </div>
    </header>
  );
}

/* ─── Estimated Term Sheet ─── */
function EstimatedTermSheet({ amount, tenure }: { amount: number; tenure: number }) {
  const interest = Math.round(amount * 0.08);
  const fee = Math.round(amount * 0.02);
  const total = amount + interest + fee;
  const dueDate = new Date(Date.now() + tenure * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <span className="text-muted-foreground">Principal</span>
      <span className="text-right font-medium">GHS {amount}</span>
      <span className="text-muted-foreground">Interest (8%)</span>
      <span className="text-right font-medium">GHS {interest}</span>
      <span className="text-muted-foreground">Service fee (2%)</span>
      <span className="text-right font-medium">GHS {fee}</span>
      <span className="text-muted-foreground border-t border-border pt-2">Total repayment</span>
      <span className="text-right font-semibold border-t border-border pt-2">GHS {total}</span>
      <span className="text-muted-foreground">Due date</span>
      <span className="text-right font-medium">{dueDate}</span>
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
  const [showNodeCode, setShowNodeCode] = useState(false);
  const [otp, setOtp] = useState("");
  const [userData, setUserData] = useState<Record<string, unknown> | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingDirection, setOnboardingDirection] = useState(0);

  const [onboardingData, setOnboardingData] = useState({
    firstName: "", surname: "", dob: "", gender: "",
    region: "", address: "", ghanaCardNumber: "GHA-",
    ghanaCardFrontUrl: "", ghanaCardBackUrl: "", selfieUrl: "",
    accommodationType: "", yearsAtAddress: "",
    educationLevel: "", employmentStatus: "", monthlyIncome: "",
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
    disbursementAmount: number; repaymentAmount: number; repaymentDate: string; msisdn: string;
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
      if (!isNew && kyc && kyc.toLowerCase() !== "pending") setView("loan-dashboard");
    }
    if (amountOptions.length && !amountOptions.includes(loanAmount)) setLoanAmount(amountOptions[0]);
    if (tenureOptions.length && !tenureOptions.includes(loanTenure)) setLoanTenure(tenureOptions[0]);
  }, [amountOptions, tenureOptions, loanAmount, loanTenure, view, applicant]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = globalThis.setInterval(() => setResendSeconds((p) => Math.max(0, p - 1)), 1000);
    return () => globalThis.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    const storedToken = globalThis.localStorage.getItem("agenda_token");
    if (!storedToken) return;
    setAuthToken(storedToken);
    const restoreSession = async () => {
      try {
        const r = await fetch(`${baseApiUrl}/api/auth/me`, { headers: { Accept: "application/json", Authorization: `Bearer ${storedToken}` } });
        const p = await r.json();
        if (r.ok) {
          if (p?.user) { setApplicant(p.user); setUserData(p.user); }
          setView(p?.user?.kycStatus === "VERIFIED" ? "loan-dashboard" : "onboarding");
          return;
        }
        globalThis.localStorage.removeItem("agenda_token"); setAuthToken(null);
      } catch (e) { console.error("Session check failed", e); }
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
  const handleOnboardingChange = (field: keyof typeof onboardingData, value: string) => setOnboardingData((p) => ({ ...p, [field]: value }));

  const formatGhanaCardNumber = (value: string) => {
    const d = value.match(/\d/g)?.join("") ?? "";
    if (d.length === 0) return "GHA-";
    if (d.length <= 9) return `GHA-${d}`;
    return `GHA-${d.slice(0, 9)}-${d.slice(9, 10)}`;
  };
  const isValidGhanaCard = (v: string) => /^GHA-\d{9}-\d$/.test(v);
  const handleGhanaCardChange = (v: string) => { if (!v.startsWith("GHA-")) return; handleOnboardingChange("ghanaCardNumber", formatGhanaCardNumber(v)); };

  const handleUpload = async (file: File, field: "ghanaCardFrontUrl" | "ghanaCardBackUrl" | "selfieUrl") => {
    const old = onboardingData[field];
    old?.startsWith("blob:") && URL.revokeObjectURL(old);
    handleOnboardingChange(field, URL.createObjectURL(file));
    setUploadedFiles((p) => ({ ...p, [field]: file }));
  };

  const getFileExtension = useCallback((file: File): string => {
    const last = file.name.lastIndexOf(".");
    return last === -1 ? ".jpg" : file.name.substring(last);
  }, []);

  const handleRequestOtp = async () => {
    setErrorMessage(null);
    // Removed nodeCode check per user request
    if (!normalizedMsisdn) { setErrorMessage("Enter a valid Ghanaian phone number."); return; }
    setIsRequesting(true);
    try {
      const r = await fetch(`${baseApiUrl}/api/auth/request`, {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ msisdn: normalizedMsisdn, nodeCode: nodeCode.trim() }),
      });
      const p = await r.json();
      if (!r.ok) throw new Error(p?.message || "Unable to request OTP.");
      setNodeName(p?.nodeName ?? "your Node");
      setOtp(""); resetAutoSubmit(); setResendSeconds(RESEND_SECONDS);
      setDirection(1); setView("otp");
    } catch (e: any) { setErrorMessage(e?.message || "Unable to request OTP."); } finally { setIsRequesting(false); }
  };

  const handleVerifyOtp = useCallback(async () => {
    if (!normalizedMsisdn) { setErrorMessage("Enter a valid phone number."); resetAutoSubmit(); return; }
    if (otp.length !== OTP_LENGTH) { resetAutoSubmit(); return; }
    setIsVerifying(true); setErrorMessage(null);
    try {
      const r = await fetch(`${baseApiUrl}/api/auth/verify`, {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ msisdn: normalizedMsisdn, otp }),
      });
      const p = await r.json();
      if (!r.ok) throw new Error(p?.message || "OTP verification failed.");
      if (p?.user) { setApplicant(p.user); setUserData(p.user); }
      if (p?.token) { globalThis.localStorage.setItem("agenda_token", p.token); setAuthToken(p.token); }
      if (p?.isNewUser) { setView("onboarding"); } else { setView("loan-dashboard"); }
    } catch (e: any) { setErrorMessage(e?.message || "OTP verification failed."); resetAutoSubmit(); } finally { setIsVerifying(false); }
  }, [normalizedMsisdn, otp, setApplicant, resetAutoSubmit]);

  useEffect(() => {
    if (view !== "otp" || otp.length !== OTP_LENGTH || isVerifying || autoSubmitRef.current) return;
    autoSubmitRef.current = true;
    void handleVerifyOtp();
  }, [otp, isVerifying, view, handleVerifyOtp]);

  const handleResend = async () => {
    if (resendSeconds > 0 || isRequesting) return;
    if (!normalizedMsisdn) { setErrorMessage("Enter a valid phone number."); return; }
    setIsRequesting(true); setErrorMessage(null);
    try {
      const r = await fetch(`${baseApiUrl}/api/auth/resend`, {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ msisdn: normalizedMsisdn, nodeCode: nodeCode.trim() }),
      });
      const p = await r.json();
      if (!r.ok) throw new Error(p?.message || "Unable to resend OTP.");
      setResendSeconds(RESEND_SECONDS);
    } catch (e: any) { setErrorMessage(e?.message || "Unable to resend OTP."); } finally { setIsRequesting(false); }
  };

  const handleBack = () => {
    if (view === "otp") { setDirection(-1); setView("auth"); setOtp(""); resetAutoSubmit(); return; }
    if (view === "onboarding" || view === "loan-dashboard") {
      globalThis.localStorage.removeItem("agenda_token");
      setAuthToken(null); setUserData(null); setDirection(-1); setView("auth"); setOtp(""); resetAutoSubmit();
    }
  };

  const validateOnboardingStep = (step: number): string | null => {
    switch (step) {
      case 1:
        if (!onboardingData.firstName || !onboardingData.surname || !onboardingData.dob) return "Complete all personal details.";
        if (!onboardingData.gender) return "Select your gender.";
        return null;
      case 2:
        if (!onboardingData.region || !onboardingData.address) return "Provide your region and address.";
        if (onboardingData.address.trim().split(/\s+/).filter(Boolean).length < 3) return "Provide a full address (at least 3 words).";
        if (!onboardingData.accommodationType || !onboardingData.yearsAtAddress) return "Complete accommodation details.";
        if (!onboardingData.educationLevel || !onboardingData.employmentStatus || !onboardingData.monthlyIncome) return "Complete employment details.";
        return null;
      case 3:
        if (!isValidGhanaCard(onboardingData.ghanaCardNumber)) return "Ghana Card: GHA-XXXXXXXXX-X";
        if (!onboardingData.ghanaCardFrontUrl || !onboardingData.ghanaCardBackUrl || !onboardingData.selfieUrl) return "Upload all required documents.";
        return null;
      case 4:
        if (!loanAmount || !loanTenure || !loanPurpose) return "Complete loan details.";
        return null;
      default: return null;
    }
  };

  const handleOnboardingNext = () => {
    const err = validateOnboardingStep(onboardingStep);
    if (err) { setErrorMessage(err); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setErrorMessage(null); setOnboardingDirection(1); setOnboardingStep((p) => p + 1);
  };
  const handleOnboardingBack = () => { setErrorMessage(null); setOnboardingDirection(-1); setOnboardingStep((p) => p - 1); };

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
        const ext = getFileExtension(file);
        const result = await uploadToSupabase(file, "kyc-documents", `${userId}/${label}-${Date.now()}${ext}`);
        if (!result.success || !result.url) throw new Error(result.error || errorMsg);
        return result.url;
      };
      if (uploadedFiles.ghanaCardFrontUrl) ghanaCardFrontUrl = await uploadFile(uploadedFiles.ghanaCardFrontUrl, "ghana-card-front", "Upload failed.");
      if (uploadedFiles.ghanaCardBackUrl) ghanaCardBackUrl = await uploadFile(uploadedFiles.ghanaCardBackUrl, "ghana-card-back", "Upload failed.");
      if (uploadedFiles.selfieUrl) selfieUrl = await uploadFile(uploadedFiles.selfieUrl, "selfie", "Upload failed.");

      const r = await fetch(`${baseApiUrl}/api/users/onboard`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          fullName: `${onboardingData.firstName} ${onboardingData.surname}`,
          firstName: onboardingData.firstName, surname: onboardingData.surname,
          dob: onboardingData.dob, gender: onboardingData.gender,
          region: onboardingData.region, address: onboardingData.address,
          accommodationType: onboardingData.accommodationType, yearsAtAddress: onboardingData.yearsAtAddress,
          educationLevel: onboardingData.educationLevel, employmentStatus: onboardingData.employmentStatus,
          monthlyIncome: onboardingData.monthlyIncome, ghanaCardNumber: onboardingData.ghanaCardNumber,
          ghanaCardFrontUrl, ghanaCardBackUrl, selfieUrl,
          initialLoanAmount: Number(loanAmount), initialLoanTenure: Number(loanTenure), initialLoanPurpose: loanPurpose,
        }),
      });
      const p = await r.json();
      if (!r.ok) throw new Error(p?.message || "Submission failed.");
      if (p?.user) { setApplicant(p.user); setUserData(p.user); setSuccessNodeCode(p.user.nodeCode || p.user.node || p.nodeCode || null); }
      setOnboardingSubmitted(true); setView("success");
    } catch (e: any) { setErrorMessage(e?.message || "Submission failed."); } finally { setIsSubmittingOnboarding(false); }
  };

  const handleLoanRequest = async () => {
    setErrorMessage(null);
    if (!authToken) { setErrorMessage("Session expired. Please verify again."); return; }
    const isNewUser = (applicant as any)?.isNewUser !== false;
    if (!onboardingSubmitted && isNewUser) { await handleOnboardingSubmit(); return; }
    setIsRequestingLoan(true);
    try {
      const r = await fetch(`${baseApiUrl}/api/loans/request`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ loanAmount, loanTenure, loanPurpose }),
      });
      const p = await r.json();
      if (!r.ok) throw new Error(p?.message || "Loan request failed.");
      setLoanSummary({
        disbursementAmount: Number(p?.disbursementAmount ?? loanAmount),
        repaymentAmount: Number(p?.repaymentAmount ?? loanAmount),
        repaymentDate: p?.repaymentDate ? new Date(p.repaymentDate).toDateString() : new Date(Date.now() + loanTenure * 86400000).toDateString(),
        msisdn: String(p?.msisdn ?? userData?.msisdn ?? ""),
      });
    } catch (e: any) { setErrorMessage(e?.message || "Loan request failed."); } finally { setIsRequestingLoan(false); }
  };

  const canSubmitEntry = Boolean(normalizedMsisdn && nodeCode.trim());
  const canVerify = otp.length === OTP_LENGTH;

  // ─── Upload Box ───
  function renderUploadBox(
    label: string, fieldUrl: string, isUploading: boolean,
    inputRef: React.RefObject<HTMLInputElement>, capture: "user" | "environment",
    onFileChange: (file: File) => void
  ) {
    return (
      <div
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all",
          fieldUrl ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/50"
        )}
      >
        <input ref={inputRef} type="file" accept="image/*" capture={capture}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChange(f); }} className="hidden" />
        {isUploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        ) : fieldUrl ? (
          <div className="flex items-center gap-2 justify-center">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{label} uploaded</span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="flex gap-2 justify-center">
              <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                <Camera className="h-3.5 w-3.5 mr-1" /> Capture
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                <Upload className="h-3.5 w-3.5 mr-1" /> Upload
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════
  // SUCCESS VIEW
  // ═══════════════════════════════════════
  if (view === "success") {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader />
        <main className="max-w-md mx-auto px-4 py-16 text-center space-y-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Application Submitted</h1>
            <p className="text-sm text-muted-foreground">We're reviewing your application. You'll receive an SMS once a decision is made.</p>
          </div>
          {successNodeCode && (
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Your Node Code</p>
              <p className="text-2xl font-mono font-bold text-primary mt-1">{successNodeCode}</p>
            </div>
          )}
          <Button onClick={() => setView("loan-dashboard")} className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90">
            Go to Loan Centre <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </main>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // AUTH & OTP VIEWS
  // ═══════════════════════════════════════
  // ═══════════════════════════════════════
  // AUTH & OTP VIEWS (FlyonUI Design)
  // ═══════════════════════════════════════
  if (view === "auth" || view === "otp") {
    return (
      <div className="flex h-auto min-h-screen items-center justify-center overflow-x-hidden bg-white py-10 relative" data-theme="light">
        {/* Background Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(236,27,132,0.15)_0%,rgba(255,255,255,0)_70%)] blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,rgba(255,255,255,0)_70%)] blur-[120px] pointer-events-none animate-pulse delay-1000" />
        <div className="absolute top-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.1)_0%,rgba(255,255,255,0)_70%)] blur-[100px] pointer-events-none animate-pulse delay-700" />
        
        <div className="relative flex flex-col w-full items-center justify-center px-4 sm:px-6 lg:px-8 z-10">
          {/* SVG Background - Abstract Node Lines */}
          <div className="absolute pointer-events-none opacity-30 md:opacity-60 scale-125">
            <svg width="612" height="697" viewBox="0 0 612 697" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M97.4387 622.042C96.3793 621.236 95.3369 620.415 94.3115 619.58L93.9959 619.968C91.9211 618.28 89.9159 616.536 87.9805 614.74L88.3206 614.374C86.3673 612.562 84.4856 610.697 82.6761 608.783L82.3128 609.127C80.4764 607.185 78.7139 605.193 77.026 603.154L77.4111 602.836C75.7156 600.788 74.0956 598.694 72.5516 596.557L72.1463 596.85C70.5835 594.687 69.0983 592.481 67.6913 590.235L68.1149 589.97C66.7047 587.719 65.3733 585.429 64.1214 583.104L63.6812 583.341C62.4181 580.995 61.2356 578.613 60.1343 576.2L60.5891 575.992C59.4876 573.579 58.4677 571.134 57.5299 568.663L57.0624 568.84C56.1179 566.351 55.2564 563.834 54.4784 561.295L54.9565 561.149C54.1802 558.615 53.4874 556.058 52.8788 553.483L52.3922 553.598C51.7803 551.01 51.2531 548.403 50.8112 545.782L51.3042 545.698C50.864 543.087 50.5087 540.462 50.2391 537.828L49.7417 537.879C49.4712 535.235 49.2865 532.581 49.1884 529.923L49.688 529.904C49.5905 527.26 49.5788 524.612 49.6538 521.963L49.154 521.949C49.2291 519.294 49.3908 516.639 49.6397 513.988L50.1375 514.035C50.3847 511.403 50.7182 508.775 51.1386 506.156L50.6449 506.076C51.0653 503.457 51.5723 500.847 52.1664 498.25L52.6538 498.361C53.2426 495.787 53.9175 493.225 54.6788 490.681L54.1998 490.537C54.9594 487.999 55.8049 485.477 56.7366 482.977L57.2052 483.151C58.1257 480.681 59.1309 478.232 60.2213 475.807L59.7653 475.602C60.8508 473.188 62.0203 470.799 63.2746 468.439L63.7161 468.674C64.9519 466.348 66.2703 464.05 67.6717 461.784L67.2465 461.521C68.635 459.276 70.1047 457.062 71.6561 454.883L72.0634 455.173C72.8302 454.096 73.6169 453.027 74.4238 451.968L76.8308 448.808L76.4331 448.505L81.2471 442.184L81.6449 442.487L86.4589 436.166L86.0611 435.863L90.8752 429.542L91.273 429.845L96.087 423.524L95.6892 423.221L100.503 416.9L100.901 417.203L105.715 410.882L105.317 410.58L110.131 404.259L110.529 404.562L115.343 398.241L114.945 397.938L119.759 391.617L120.157 391.92L124.971 385.599L124.574 385.296L129.388 378.975L129.785 379.278L134.599 372.957L134.202 372.654L139.016 366.334L139.413 366.637L144.227 360.316L143.83 360.013L148.644 353.692L149.042 353.995L153.856 347.674L153.458 347.371L158.272 341.05L158.67 341.353L163.484 335.032L163.086 334.729L167.9 328.409L168.298 328.711L173.112 322.391L172.714 322.088L177.528 315.767L177.926 316.07L182.74 309.749L182.342 309.446L187.156 303.125L187.554 303.428L192.368 297.107L191.97 296.804L196.784 290.483L197.182 290.786L201.996 284.465L201.598 284.163L206.412 277.842L206.81 278.145L211.624 271.824L211.226 271.521L216.04 265.2L216.438 265.503L221.252 259.182L220.854 258.879L225.669 252.558L226.066 252.861L230.88 246.54L230.483 246.237L235.297 239.917L235.694 240.22L240.508 233.899L240.111 233.596L244.925 227.275L245.322 227.578L250.136 221.257L249.739 220.954L254.553 214.633L254.951 214.936L259.765 208.615L259.367 208.312L264.181 201.992L264.579 202.294L269.393 195.974L268.995 195.671L273.809 189.35L274.207 189.653L279.021 183.332L278.623 183.029L283.437 176.708L283.835 177.011L288.649 170.69L288.251 170.387L293.065 164.067L293.463 164.369L298.277 158.049L297.879 157.746L302.693 151.425L303.091 151.728L307.905 145.407L307.507 145.104L312.321 138.783L312.719 139.086L317.533 132.765L317.135 132.462L321.949 126.141L322.347 126.444L327.161 120.124L326.763 119.821L331.577 113.5L331.975 113.803L336.789 107.482L336.391 107.179L341.205 100.858L341.603 101.161L344.01 98.0005C344.817 96.9411 345.638 95.8986 346.473 94.8733L346.085 94.5577C347.773 92.4829 349.517 90.4776 351.312 88.5423L351.679 88.8823C353.491 86.929 355.356 85.0474 357.269 83.2379L356.926 82.8746C358.868 81.0382 360.86 79.2757 362.898 77.5878L363.217 77.9729C365.265 76.2773 367.359 74.6573 369.496 73.1134L369.203 72.7081C371.366 71.1452 373.572 69.66 375.817 68.253L376.083 68.6767C378.333 67.2665 380.624 65.9351 382.949 64.6832L382.712 64.243C385.058 62.9799 387.44 61.7974 389.853 60.696L390.061 61.1509C392.474 60.0494 394.919 59.0295 397.39 58.0917L397.213 57.6242C399.702 56.6797 402.219 55.8182 404.758 55.0402L404.904 55.5183C407.438 54.742 409.995 54.0493 412.569 53.4406L412.454 52.954C415.043 52.3421 417.65 51.8149 420.271 51.373L420.354 51.866C422.966 51.4258 425.591 51.0705 428.225 50.8009L428.174 50.3035C430.818 50.033 433.472 49.8483 436.13 49.7502L436.149 50.2498C438.792 50.1523 441.441 50.1406 444.09 50.2156L444.104 49.7158C446.759 49.7909 449.414 49.9526 452.065 50.2015L452.018 50.6993C454.65 50.9465 457.278 51.28 459.897 51.7004L459.976 51.2068C462.595 51.6272 465.206 52.1341 467.803 52.7282L467.692 53.2156C470.266 53.8045 472.828 54.4793 475.372 55.2407L475.516 54.7617C478.054 55.5213 480.576 56.3667 483.076 57.2985L482.902 57.767C485.372 58.6875 487.821 59.6927 490.246 60.7831L490.451 60.3271C492.864 61.4126 495.253 62.5822 497.614 63.8364L497.379 64.2779C499.705 65.5138 502.003 66.8321 504.269 68.2336L504.532 67.8083C506.777 69.1968 508.991 70.6665 511.17 72.218L510.88 72.6253C511.957 73.392 513.025 74.1788 514.085 74.9856C515.144 75.7925 516.187 76.6134 517.212 77.4478L517.528 77.06C519.602 78.7485 521.608 80.4923 523.543 82.2877L523.203 82.6542C525.156 84.4663 527.038 86.331 528.847 88.2446L529.211 87.9011C531.047 89.8432 532.81 91.8354 534.498 93.8737L534.112 94.1926C535.808 96.2401 537.428 98.3342 538.972 100.471L539.377 100.178C540.94 102.341 542.425 104.547 543.832 106.793L543.409 107.058C544.819 109.309 546.15 111.599 547.402 113.924L547.842 113.687C549.105 116.033 550.288 118.415 551.389 120.828L550.934 121.036C552.036 123.449 553.056 125.894 553.994 128.366L554.461 128.188C555.406 130.677 556.267 133.194 557.045 135.733L556.567 135.88C557.343 138.413 558.036 140.97 558.645 143.545L559.131 143.43C559.743 146.018 560.27 148.626 560.712 151.247L560.219 151.33C560.66 153.941 561.015 156.566 561.284 159.2L561.782 159.149C562.052 161.794 562.237 164.447 562.335 167.105L561.836 167.124C561.933 169.768 561.945 172.416 561.87 175.065L562.37 175.08C562.294 177.734 562.133 180.389 561.884 183.04L561.386 182.993C561.139 185.625 560.805 188.253 560.385 190.872L560.879 190.952C560.458 193.571 559.951 196.181 559.357 198.778L558.87 198.667C558.281 201.241 557.606 203.803 556.845 206.347L557.324 206.491C556.564 209.029 555.719 211.551 554.787 214.052L554.318 213.877C553.398 216.347 552.393 218.797 551.302 221.221L551.758 221.426C550.673 223.84 549.503 226.229 548.249 228.589L547.807 228.354C546.572 230.68 545.253 232.978 543.852 235.244L544.277 235.507C542.889 237.752 541.419 239.966 539.867 242.145L539.46 241.855C538.693 242.932 537.907 244.001 537.1 245.06L534.693 248.221L535.09 248.523L530.276 254.844L529.879 254.541L525.065 260.862L525.462 261.165L520.648 267.486L520.251 267.183L515.437 273.504L515.834 273.807L511.02 280.128L510.622 279.825L505.808 286.146L506.206 286.449L501.392 292.769L500.994 292.466L496.18 298.787L496.578 299.09L491.764 305.411L491.366 305.108L486.552 311.429L486.95 311.732L482.136 318.053L481.738 317.75L476.924 324.071L477.322 324.374L472.508 330.695L472.11 330.392L467.296 336.712L467.694 337.015L462.88 343.336L462.482 343.033L457.668 349.354L458.066 349.657L453.252 355.978L452.854 355.675L448.04 361.996L448.438 362.299L443.624 368.62L443.226 368.317L438.412 374.638L438.81 374.94L433.996 381.261L433.598 380.958L428.784 387.279L429.181 387.582L424.367 393.903L423.97 393.6L419.156 399.921L419.553 400.224L414.739 406.545L414.342 406.242L409.527 412.563L409.925 412.866L405.111 419.186L404.713 418.883L399.899 425.204L400.297 425.507L395.483 431.828L395.085 431.525L390.271 437.846L390.669 438.149L385.855 444.47L385.457 444.167L380.643 450.488L381.041 450.791L376.227 457.112L375.829 456.809L371.015 463.129L371.413 463.432L366.599 469.753L366.201 469.45L361.387 475.771L361.785 476.074L356.971 482.395L356.573 482.092L351.759 488.413L352.157 488.716L347.343 495.037L346.945 494.734L342.131 501.054L342.529 501.357L337.715 507.678L337.317 507.375L332.503 513.696L332.901 513.999L328.087 520.32L327.689 520.017L322.875 526.338L323.273 526.641L318.458 532.962L318.061 532.659L313.247 538.98L313.644 539.282L308.83 545.603L308.433 545.3L303.619 551.621L304.016 551.924L299.202 558.245L298.805 557.942L293.99 564.263L294.388 564.566L289.574 570.887L289.176 570.584L284.362 576.905L284.76 577.207L279.946 583.528L279.548 583.225L274.734 589.546L275.132 589.849L270.318 596.17L269.92 595.867L267.513 599.028C266.706 600.087 265.885 601.129 265.051 602.155L265.439 602.47C263.75 604.545 262.007 606.551 260.211 608.486L259.845 608.146C258.033 610.099 256.168 611.981 254.254 613.79L254.598 614.154C252.656 615.99 250.663 617.752 248.625 619.44L248.306 619.055C246.259 620.751 244.165 622.371 242.028 623.915L242.321 624.32C240.158 625.883 237.952 627.368 235.706 628.775L235.441 628.351C233.19 629.762 230.9 631.093 228.575 632.345L228.812 632.785C226.465 634.048 224.084 635.231 221.671 636.332L221.463 635.877C219.05 636.979 216.605 637.999 214.133 638.936L214.311 639.404C211.821 640.348 209.305 641.21 206.766 641.988L206.619 641.51C204.085 642.286 201.529 642.979 198.954 643.587L199.069 644.074C196.48 644.686 193.873 645.213 191.252 645.655L191.169 645.162C188.558 645.602 185.933 645.958 183.299 646.227L183.349 646.725C180.705 646.995 178.052 647.18 175.393 647.278L175.375 646.778C172.731 646.876 170.082 646.887 167.433 646.813L167.419 647.312C164.765 647.237 162.11 647.075 159.459 646.827L159.506 646.329C156.874 646.082 154.246 645.748 151.626 645.328L151.547 645.821C148.928 645.401 146.318 644.894 143.72 644.3L143.832 643.812C141.257 643.224 138.696 642.549 136.151 641.787L136.008 642.266C133.469 641.507 130.948 640.661 128.447 639.73L128.622 639.261C126.152 638.341 123.702 637.335 121.278 636.245L121.073 636.701C118.659 635.616 116.27 634.446 113.91 633.192L114.144 632.75C111.819 631.514 109.521 630.196 107.255 628.795L106.992 629.22C104.747 627.831 102.533 626.362 100.354 624.81L100.644 624.403C99.5665 623.636 98.4981 622.849 97.4387 622.042Z"
                stroke="hsl(var(--primary))"
                strokeOpacity="0.3"
                strokeDasharray="8 8"
              />
              <path
                d="M360.405 111.996C393.955 67.9448 456.863 59.4318 500.914 92.9818V92.9818C544.965 126.532 553.478 189.44 519.928 233.491L250.545 587.191C216.995 631.243 154.087 639.756 110.036 606.206V606.206C65.9845 572.656 57.4716 509.747 91.0216 465.696L360.405 111.996Z"
                fill="url(#paint0_linear_13715_136336)"
                fillOpacity="0.08"
              />
              <path
                d="M519.53 233.188L250.147 586.888C216.765 630.72 154.17 639.19 110.339 605.808C66.5071 572.425 58.0367 509.831 91.4194 465.999L360.802 112.299C394.185 68.4674 456.78 59.9969 500.611 93.3796C544.443 126.762 552.913 189.357 519.53 233.188Z"
                stroke="hsl(var(--primary))"
                strokeOpacity="0.2"
              />
              <defs>
                <linearGradient
                  id="paint0_linear_13715_136336"
                  x1="500.914"
                  y1="92.9818"
                  x2="110.036"
                  y2="606.206"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0" stopColor="hsl(var(--primary))" />
                  <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="flex flex-col items-center justify-center z-20 -mt-12 mb-6">
            <div className="relative group">
              <div className="absolute -inset-4 bg-white/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <img src={agendaLogo} alt="Agenda Money" className="h-auto w-24 object-contain rounded-xl shadow-lg hover:scale-105 transition-transform duration-300" />
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] z-10 w-full rounded-[40px] p-8 sm:min-w-[440px] lg:p-10 border border-white/60 relative overflow-visible">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-50 to-transparent rounded-bl-[100px] opacity-50 pointer-events-none" />
            
            <div className="text-center relative z-10 space-y-2 mb-8">
              <h3 className="text-gray-800 text-2xl font-bold tracking-tight">
                {view === "auth" ? "Enter your phone number" : "Verify OTP"}
              </h3>
              <p className="text-base-content/80 text-xs text-muted-foreground tracking-tight">
                {view === "auth" 
                  ? "We’ll send a one-time code to verify your number" 
                  : `Enter the code sent to ${normalizedMsisdn || "your phone"}`
                }
              </p>
            </div>

            {errorMessage && (
              <Alert className="border-destructive/30 bg-destructive/5 text-destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {view === "auth" ? (
                <>
                  <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleRequestOtp(); }}>
                    <div>
                      <Label className="label-text font-medium ml-1 mb-1.5 block text-gray-700" htmlFor="msisdn">Mobile Number</Label>
                      <div className="relative flex items-center w-full h-14 bg-[#F8FAFC] border border-blue-50/50 rounded-full px-6 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500/50 group">
                        <span className="text-gray-600 font-bold text-lg select-none flex items-center pr-4 border-r border-gray-200/60 h-8 ml-1 font-sans tracking-tight">
                          +233
                        </span>
                        <Input 
                          id="msisdn"
                          type="tel"
                          value={msisdnInput}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, ""); // Remove non-digits
                            if (val.length <= 9) { // 🎯 Strict 9-digit limit
                              setMsisdnInput(val);
                            }
                          }}
                          placeholder="50 XXX XXXX"
                          className="flex-1 bg-transparent border-0 h-full text-xl font-mono font-medium tracking-wider text-gray-800 focus:ring-0 focus:outline-none placeholder:text-gray-400 ml-2"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2 text-center font-medium">
                        The number must be your mobile money number
                      </p>
                    </div>
                    
                    <div className="mt-10"> 
                    <Button 
                      type="submit" 
                      disabled={!canSubmitEntry || isRequesting}
                      className="btn btn-lg w-full h-14 rounded-full bg-gradient-to-r from-pink-600 to-rose-500 text-white font-bold tracking-widest uppercase shadow-lg hover:shadow-pink-500/40 transition-all text-base"
                    >
                       {isRequesting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                       {isRequesting ? "SENDING CODE..." : "CONTINUE"}
                    </Button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="space-y-6">
                   <div className="flex justify-center">
                     <InputOTP value={otp} onChange={(v) => { setOtp(v); if (v.length < OTP_LENGTH) resetAutoSubmit(); }} maxLength={OTP_LENGTH}>
                       <InputOTPGroup>
                         {OTP_SLOTS.map((slot, i) => <InputOTPSlot key={slot} index={i} className="h-14 w-10 sm:w-12 bg-transparent border-b-2 border-border/50 rounded-none text-xl focus:border-primary focus:ring-0 transition-all font-bold" />)}
                       </InputOTPGroup>
                     </InputOTP>
                   </div>
                   
                   <div className="flex flex-col gap-3">
                     <Button 
                       onClick={handleVerifyOtp} 
                       disabled={!canVerify || isVerifying}
                       className="btn btn-lg w-full bg-gradient-pink text-white border-0 hover:opacity-90 h-11"
                     >
                        {isVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {isVerifying ? "Verifying..." : "Verify Code"}
                     </Button>
                     
                     <div className="flex items-center justify-between text-sm">
                       <Button variant="ghost" onClick={handleBack} className="text-muted-foreground hover:text-foreground p-0 h-auto font-normal">
                         <ArrowLeft className="h-4 w-4 mr-1" /> Back
                       </Button>
                       <button 
                         onClick={handleResend} 
                         disabled={resendSeconds > 0 || isRequesting}
                         className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                       >
                         {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}
                       </button>
                     </div>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // LOAN DASHBOARD (returning users)
  // ═══════════════════════════════════════
  if (view === "loan-dashboard") {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader subtitle="Loan Centre" />
        <main className="max-w-md mx-auto px-4 py-6 space-y-5">
          <div className="bg-muted/40 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Welcome back</p>
            <p className="text-base font-semibold">{(userData?.fullName as string) || "Applicant"}</p>
            {tierMin > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Tier {currentTier} · GHS {tierMin}–{tierMax} · Max {tierMaxTenure} days
              </p>
            )}
          </div>

          {errorMessage && (
            <Alert className="border-destructive/30 bg-destructive/5">
              <AlertDescription className="text-sm text-destructive">{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Amount (GHS)</Label>
              <Select value={String(loanAmount)} onValueChange={(v) => setLoanAmount(Number(v))}>
                <SelectTrigger className="h-11 bg-muted/40 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {amountOptions.map((a) => <SelectItem key={a} value={String(a)}>GHS {a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Tenure</Label>
              <div className="flex flex-wrap gap-2">
                {tenureOptions.map((t) => (
                  <Button key={t} type="button" size="sm"
                    variant={loanTenure === t ? "default" : "outline"}
                    onClick={() => setLoanTenure(t)}
                    className={cn("h-9", loanTenure === t && "bg-primary text-primary-foreground")}>
                    {t} {t === 1 ? "day" : "days"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Purpose</Label>
              <Select value={loanPurpose} onValueChange={setLoanPurpose}>
                <SelectTrigger className="h-11 bg-muted/40 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOAN_PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-border p-4">
              <p className="text-sm font-medium mb-3">Estimate</p>
              <EstimatedTermSheet amount={loanAmount} tenure={loanTenure} />
            </div>

            {loanSummary && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <p className="text-sm font-medium">Confirmed</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Disbursement</span>
                  <span className="text-right font-medium">GHS {loanSummary.disbursementAmount}</span>
                  <span className="text-muted-foreground">Account</span>
                  <span className="text-right font-medium">{loanSummary.msisdn}</span>
                  <span className="text-muted-foreground">Repayment</span>
                  <span className="text-right font-medium">GHS {loanSummary.repaymentAmount}</span>
                  <span className="text-muted-foreground">Due</span>
                  <span className="text-right font-medium">{loanSummary.repaymentDate}</span>
                </div>
              </div>
            )}
          </div>
        </main>

        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 z-50">
          <div className="max-w-md mx-auto">
            <Button onClick={handleLoanRequest} disabled={isRequestingLoan}
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90">
              {isRequestingLoan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Request Loan <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // ONBOARDING (new users)
  // ═══════════════════════════════════════
  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader subtitle={`Step ${onboardingStep} of 4`} />

      <main className="max-w-md mx-auto px-4 py-5 space-y-5">
        {/* Minimal step indicator */}
        <div className="flex gap-1.5">
          {STEPS.map((s) => (
            <div key={s.number} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={cn(
                "h-1.5 w-full rounded-full transition-all",
                onboardingStep >= s.number ? "bg-primary" : "bg-muted"
              )} />
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                onboardingStep === s.number ? "text-foreground" : "text-muted-foreground"
              )}>{s.label}</span>
            </div>
          ))}
        </div>

        {errorMessage && (
          <Alert className="border-destructive/30 bg-destructive/5">
            <AlertDescription className="text-sm text-destructive">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <AnimatePresence mode="wait" custom={onboardingDirection}>
          <motion.div key={onboardingStep} custom={onboardingDirection} variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}>

            {/* Step 1: Personal */}
            {onboardingStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">First Name</Label>
                    <Input value={onboardingData.firstName} onChange={(e) => handleOnboardingChange("firstName", e.target.value)}
                      placeholder="Kwame" className="h-11 bg-muted/40 border-border/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Surname</Label>
                    <Input value={onboardingData.surname} onChange={(e) => handleOnboardingChange("surname", e.target.value)}
                      placeholder="Mensah" className="h-11 bg-muted/40 border-border/50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Date of Birth</Label>
                    <Input type="date" value={onboardingData.dob} onChange={(e) => handleOnboardingChange("dob", e.target.value)}
                      max={new Date().toISOString().split("T")[0]} className="h-11 bg-muted/40 border-border/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Gender</Label>
                    <Select value={onboardingData.gender} onValueChange={(v) => handleOnboardingChange("gender", v)}>
                      <SelectTrigger className="h-11 bg-muted/40 border-border/50"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Residence */}
            {onboardingStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Region</Label>
                  <Select value={onboardingData.region} onValueChange={(v) => handleOnboardingChange("region", v)}>
                    <SelectTrigger className="h-11 bg-muted/40 border-border/50"><SelectValue placeholder="Select region" /></SelectTrigger>
                    <SelectContent>{GHANA_REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Address</Label>
                  <Textarea value={onboardingData.address} onChange={(e) => handleOnboardingChange("address", e.target.value)}
                    placeholder="House No. 12, Dzorwulu Street, Accra" rows={2} className="resize-none bg-muted/40 border-border/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Accommodation</Label>
                    <Select value={onboardingData.accommodationType} onValueChange={(v) => handleOnboardingChange("accommodationType", v)}>
                      <SelectTrigger className="h-11 bg-muted/40 border-border/50"><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>{ACCOMMODATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Years at Address</Label>
                    <Input type="number" value={onboardingData.yearsAtAddress}
                      onChange={(e) => handleOnboardingChange("yearsAtAddress", e.target.value)}
                      placeholder="3" min="0" max="50" className="h-11 bg-muted/40 border-border/50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Education</Label>
                  <Select value={onboardingData.educationLevel} onValueChange={(v) => handleOnboardingChange("educationLevel", v)}>
                    <SelectTrigger className="h-11 bg-muted/40 border-border/50"><SelectValue placeholder="Level" /></SelectTrigger>
                    <SelectContent>{EDUCATION_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Employment</Label>
                    <Select value={onboardingData.employmentStatus} onValueChange={(v) => handleOnboardingChange("employmentStatus", v)}>
                      <SelectTrigger className="h-11 bg-muted/40 border-border/50"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>{EMPLOYMENT_OPTIONS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Monthly Income</Label>
                    <Select value={onboardingData.monthlyIncome} onValueChange={(v) => handleOnboardingChange("monthlyIncome", v)}>
                      <SelectTrigger className="h-11 bg-muted/40 border-border/50"><SelectValue placeholder="Range" /></SelectTrigger>
                      <SelectContent>{INCOME_BRACKETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Documents */}
            {onboardingStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Ghana Card Number</Label>
                  <Input value={onboardingData.ghanaCardNumber || "GHA-"}
                    onChange={(e) => handleGhanaCardChange(e.target.value)}
                    placeholder="GHA-123456789-0" maxLength={16}
                    className="h-11 font-mono bg-muted/40 border-border/50" />
                  <p className="text-xs text-muted-foreground">Format: GHA-XXXXXXXXX-X</p>
                </div>
                <div className="space-y-3">
                  {renderUploadBox("Ghana Card (Front)", onboardingData.ghanaCardFrontUrl, !!uploadProgress.ghanaCardFrontUrl, frontCardRef, "environment", (f) => handleUpload(f, "ghanaCardFrontUrl"))}
                  {renderUploadBox("Ghana Card (Back)", onboardingData.ghanaCardBackUrl, !!uploadProgress.ghanaCardBackUrl, backCardRef, "environment", (f) => handleUpload(f, "ghanaCardBackUrl"))}
                  {renderUploadBox("Live Selfie", onboardingData.selfieUrl, !!uploadProgress.selfieUrl, selfieRef, "user", (f) => handleUpload(f, "selfieUrl"))}
                </div>
              </div>
            )}

            {/* Step 4: Loan */}
            {onboardingStep === 4 && (
              <div className="space-y-4">
                <div className="bg-muted/40 rounded-lg p-3 text-sm">
                  <strong>Tier 1:</strong> GHS 50–300 · Max 14 days
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Amount (GHS)</Label>
                  <Select value={String(loanAmount)} onValueChange={(v) => setLoanAmount(Number(v))}>
                    <SelectTrigger className="h-11 bg-muted/40 border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>{amountOptions.map((a) => <SelectItem key={a} value={String(a)}>GHS {a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Tenure</Label>
                  <div className="flex flex-wrap gap-2">
                    {tenureOptions.map((t) => (
                      <Button key={t} type="button" size="sm" variant={loanTenure === t ? "default" : "outline"}
                        onClick={() => setLoanTenure(t)}
                        className={cn("h-9", loanTenure === t && "bg-primary text-primary-foreground")}>
                        {t} {t === 1 ? "day" : "days"}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Purpose</Label>
                  <Select value={loanPurpose} onValueChange={setLoanPurpose}>
                    <SelectTrigger className="h-11 bg-muted/40 border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>{LOAN_PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium mb-3">Estimate</p>
                  <EstimatedTermSheet amount={loanAmount} tenure={loanTenure} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 z-50">
        <div className="max-w-md mx-auto flex gap-3">
          <Button variant="outline" onClick={onboardingStep === 1 ? handleBack : handleOnboardingBack} className="flex-1 h-11">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {onboardingStep < 4 ? (
            <Button onClick={handleOnboardingNext} className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90">
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleOnboardingSubmit} disabled={isSubmittingOnboarding}
              className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90">
              {isSubmittingOnboarding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {isSubmittingOnboarding ? "Submitting..." : "Submit"}
              {!isSubmittingOnboarding && <CheckCircle2 className="h-4 w-4 ml-1" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
