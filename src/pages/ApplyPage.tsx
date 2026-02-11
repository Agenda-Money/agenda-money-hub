import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  ImageIcon,
  Loader2,
  MapPin,
  TrendingUp,
  Upload,
  User,
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

const STEPS = [
  { number: 1, title: "Bio-Data", icon: User, description: "Personal info" },
  { number: 2, title: "Details", icon: MapPin, description: "Location & work" },
  { number: 3, title: "Documents", icon: ImageIcon, description: "ID & photos" },
  { number: 4, title: "Loan", icon: CreditCard, description: "Initial loan" },
];

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
  const frontUploadRef = useRef<HTMLInputElement>(null);
  const backUploadRef = useRef<HTMLInputElement>(null);
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

  // ─── Upload Helpers ───
  function renderDocumentUpload(
    label: string, fieldUrl: string, isUploading: boolean,
    captureRef: React.RefObject<HTMLInputElement>,
    uploadRef: React.RefObject<HTMLInputElement> | null,
    capture: "user" | "environment",
    onFileChange: (file: File) => void
  ) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          "border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all",
          fieldUrl
            ? "border-emerald-500 bg-emerald-500/5"
            : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
        )}
        onClick={() => captureRef.current?.click()}
      >
        <input ref={captureRef} type="file" accept="image/*" capture={capture}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChange(f); }} className="hidden" />
        {uploadRef && (
          <input ref={uploadRef} type="file" accept="image/*"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChange(f); }} className="hidden" />
        )}
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        ) : fieldUrl ? (
          <>
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
            <p className="text-sm text-emerald-700 font-medium mt-2">{label} ✓</p>
          </>
        ) : (
          <div className="space-y-3">
            {capture === "user" ? (
              <User className="h-8 w-8 text-muted-foreground mx-auto" />
            ) : (
              <Camera className="h-8 w-8 text-muted-foreground mx-auto" />
            )}
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <div className="flex gap-2 justify-center">
              <Button type="button" size="sm" variant="outline"
                onClick={(e) => { e.stopPropagation(); captureRef.current?.click(); }}
                className="flex items-center gap-2">
                <Camera className="h-4 w-4" /> Capture
              </Button>
              {uploadRef && (
                <Button type="button" size="sm" variant="outline"
                  onClick={(e) => { e.stopPropagation(); uploadRef.current?.click(); }}
                  className="flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Upload
                </Button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // ═══════════════════════════════════════
  // SUCCESS VIEW
  // ═══════════════════════════════════════
  if (view === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
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
                <p className="text-sm text-muted-foreground">
                  We're verifying your documents. You'll receive an SMS once a decision is made.
                </p>
              </div>

              {successNodeCode && (
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-2xl border border-primary/20">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Your Node Code</p>
                  <p className="text-3xl font-mono font-bold text-primary mt-2 tracking-wider">{successNodeCode}</p>
                </div>
              )}

              <Button onClick={() => setView("loan-dashboard")} className="w-full h-12 bg-gradient-pink hover:opacity-90">
                Go to Loan Centre <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // AUTH & OTP VIEWS
  // ═══════════════════════════════════════
  if (view === "auth" || view === "otp") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10 relative overflow-hidden">
        {/* Subtle background blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md z-10 space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img src={agendaLogo} alt="Agenda Money" className="h-auto w-44 object-contain rounded-2xl" />
          </div>

          {/* Card */}
          <Card className="border-0 shadow-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-pink" />
            <CardHeader className="pb-2 text-center">
              <CardTitle className="text-xl font-bold">
                {view === "auth" ? "Get Started" : "Verify Your Number"}
              </CardTitle>
              <CardDescription className="text-sm">
                {view === "auth"
                  ? "Enter your mobile money number to continue"
                  : `Enter the 6-digit code sent to +233 ${msisdnInput}`}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {errorMessage && (
                <Alert className="border-destructive/30 bg-destructive/5">
                  <AlertDescription className="text-sm text-destructive">{errorMessage}</AlertDescription>
                </Alert>
              )}

              {view === "auth" ? (
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleRequestOtp(); }}>
                  {/* Phone Input */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mobile Number</Label>
                    <div className="relative flex items-center w-full h-14 bg-muted/50 rounded-full px-5 border-0 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                      <span className="text-foreground font-bold text-base select-none pr-4 border-r border-border/50 h-8 flex items-center font-mono">
                        +233
                      </span>
                      <Input
                        type="tel"
                        value={msisdnInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          if (val.length <= 9) setMsisdnInput(val);
                        }}
                        placeholder="50 XXX XXXX"
                        className="flex-1 bg-transparent border-0 h-full text-lg font-mono font-medium tracking-wider text-foreground focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40 ml-3"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Must be your registered mobile money number
                    </p>
                  </div>

                  {/* Node Code */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Referral Code</Label>
                    <Input
                      value={nodeCode}
                      onChange={(e) => setNodeCode(e.target.value.toUpperCase())}
                      placeholder="e.g. AM4521"
                      className="h-12 bg-muted/50 border-0 focus-visible:ring-primary font-mono text-center text-lg tracking-widest"
                    />
                    {nodeName && (
                      <p className="text-xs text-primary text-center font-medium">
                        We'll check with {nodeName} for approval
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={!canSubmitEntry || isRequesting}
                    className="w-full h-14 rounded-full bg-gradient-pink text-primary-foreground font-bold tracking-widest uppercase text-sm"
                  >
                    {isRequesting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {isRequesting ? "SENDING CODE..." : "CONTINUE"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <InputOTP value={otp} onChange={(v) => { setOtp(v); if (v.length < OTP_LENGTH) resetAutoSubmit(); }} maxLength={OTP_LENGTH}>
                      <InputOTPGroup>
                        {OTP_SLOTS.map((slot, i) => (
                          <InputOTPSlot key={slot} index={i}
                            className="h-14 w-11 bg-muted/50 border-0 border-b-2 border-border/50 rounded-none text-xl focus:border-primary transition-all font-bold" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <Button
                    onClick={handleVerifyOtp}
                    disabled={!canVerify || isVerifying}
                    className="w-full h-12 rounded-full bg-gradient-pink text-primary-foreground font-semibold"
                  >
                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {isVerifying ? "Verifying..." : "Verify Code"}
                  </Button>

                  <div className="flex items-center justify-between text-sm">
                    <button onClick={handleBack} className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <button
                      onClick={handleResend}
                      disabled={resendSeconds > 0 || isRequesting}
                      className="text-primary hover:underline disabled:opacity-50 disabled:no-underline font-medium"
                    >
                      {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // LOAN DASHBOARD (returning users)
  // ═══════════════════════════════════════
  if (view === "loan-dashboard") {
    return (
      <div className="min-h-screen bg-background pb-28">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <img src={agendaLogo} alt="Agenda Money" className="h-8 rounded-lg" />
            <Badge variant="secondary" className="font-normal text-xs">Loan Centre</Badge>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground">Welcome back</p>
              <p className="text-base font-semibold">{(userData?.fullName as string) || "Applicant"}</p>
              {tierMin > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Tier {currentTier} · GHS {tierMin}–{tierMax} · Max {tierMaxTenure} days
                </p>
              )}
            </CardContent>
          </Card>

          {errorMessage && (
            <Alert className="border-destructive/30 bg-destructive/5">
              <AlertDescription className="text-sm text-destructive">{errorMessage}</AlertDescription>
            </Alert>
          )}

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Amount (GHS)</Label>
                <Select value={String(loanAmount)} onValueChange={(v) => setLoanAmount(Number(v))}>
                  <SelectTrigger className="h-12 bg-muted/50 border-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {amountOptions.map((a) => <SelectItem key={a} value={String(a)}>GHS {a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Tenure</Label>
                <div className="flex flex-wrap gap-2">
                  {tenureOptions.map((t) => (
                    <Button key={t} type="button" size="sm"
                      variant={loanTenure === t ? "default" : "outline"}
                      onClick={() => setLoanTenure(t)}
                      className={cn("h-9 rounded-full", loanTenure === t && "bg-primary text-primary-foreground")}>
                      {t} {t === 1 ? "day" : "days"}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Purpose</Label>
                <Select value={loanPurpose} onValueChange={setLoanPurpose}>
                  <SelectTrigger className="h-12 bg-muted/50 border-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOAN_PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-2xl bg-muted/30 p-4">
                <p className="text-sm font-medium mb-3">Estimated Term Sheet</p>
                <EstimatedTermSheet amount={loanAmount} tenure={loanTenure} />
              </div>

              {loanSummary && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
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
            </CardContent>
          </Card>
        </main>

        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t shadow-2xl p-4 z-50">
          <div className="max-w-lg mx-auto">
            <Button onClick={handleLoanRequest} disabled={isRequestingLoan}
              className="w-full h-12 rounded-full bg-gradient-pink hover:opacity-90 font-semibold">
              {isRequestingLoan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Request Loan <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // ONBOARDING (new users) — Agent-style
  // ═══════════════════════════════════════
  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <img src={agendaLogo} alt="Agenda Money" className="h-8 rounded-lg" />
          <Badge variant="secondary" className="font-normal text-xs">
            Step {onboardingStep} of 4
          </Badge>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Progress Steps — matching agent style */}
        <div className="flex items-center justify-between px-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = onboardingStep === step.number;
            const isCompleted = onboardingStep > step.number;

            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-semibold transition-all shadow-lg",
                      isCompleted && "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white",
                      isActive && "bg-gradient-pink text-primary-foreground shadow-pink",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </motion.div>
                  <p className={cn(
                    "text-xs mt-2 font-medium text-center",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-1 mx-2 rounded-full transition-colors",
                    onboardingStep > step.number ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {errorMessage && (
          <Alert className="border-destructive/30 bg-destructive/5">
            <AlertDescription className="text-sm text-destructive">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Form Card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className={cn(
            "h-1.5 transition-all duration-300",
            onboardingStep === 1 && "bg-gradient-to-r from-blue-500 to-blue-600",
            onboardingStep === 2 && "bg-gradient-to-r from-amber-500 to-orange-500",
            onboardingStep === 3 && "bg-gradient-pink",
            onboardingStep === 4 && "bg-gradient-to-r from-emerald-500 to-emerald-600"
          )} />

          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg">
              {STEPS[onboardingStep - 1].title}
            </CardTitle>
            <CardDescription className="text-sm">
              {onboardingStep === 1 && "Enter your personal information"}
              {onboardingStep === 2 && "Provide your location and employment details"}
              {onboardingStep === 3 && "Upload clear photos of your ID and selfie"}
              {onboardingStep === 4 && "Select your preferred loan terms"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait" custom={onboardingDirection}>
              <motion.div key={onboardingStep} custom={onboardingDirection} variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}>

                {/* Step 1: Personal */}
                {onboardingStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">First Name *</Label>
                        <Input value={onboardingData.firstName} onChange={(e) => handleOnboardingChange("firstName", e.target.value)}
                          placeholder="Kwame" className="h-12 bg-muted/50 border-0 focus-visible:ring-primary" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Surname *</Label>
                        <Input value={onboardingData.surname} onChange={(e) => handleOnboardingChange("surname", e.target.value)}
                          placeholder="Mensah" className="h-12 bg-muted/50 border-0 focus-visible:ring-primary" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Date of Birth *</Label>
                        <Input type="date" value={onboardingData.dob} onChange={(e) => handleOnboardingChange("dob", e.target.value)}
                          max={new Date().toISOString().split("T")[0]} className="h-12 bg-muted/50 border-0 focus-visible:ring-primary" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Gender *</Label>
                        <Select value={onboardingData.gender} onValueChange={(v) => handleOnboardingChange("gender", v)}>
                          <SelectTrigger className="h-12 bg-muted/50 border-0"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Residence & Work */}
                {onboardingStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Region *</Label>
                      <Select value={onboardingData.region} onValueChange={(v) => handleOnboardingChange("region", v)}>
                        <SelectTrigger className="h-12 bg-muted/50 border-0"><SelectValue placeholder="Select region" /></SelectTrigger>
                        <SelectContent>{GHANA_REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Address *</Label>
                      <Textarea value={onboardingData.address} onChange={(e) => handleOnboardingChange("address", e.target.value)}
                        placeholder="House No. 12, Dzorwulu Street, Accra" rows={2}
                        className="resize-none bg-muted/50 border-0 focus-visible:ring-primary" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Accommodation *</Label>
                        <Select value={onboardingData.accommodationType} onValueChange={(v) => handleOnboardingChange("accommodationType", v)}>
                          <SelectTrigger className="h-12 bg-muted/50 border-0"><SelectValue placeholder="Type" /></SelectTrigger>
                          <SelectContent>{ACCOMMODATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Years at Address *</Label>
                        <Input type="number" value={onboardingData.yearsAtAddress}
                          onChange={(e) => handleOnboardingChange("yearsAtAddress", e.target.value)}
                          placeholder="3" min="0" max="50" className="h-12 bg-muted/50 border-0 focus-visible:ring-primary" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Education *</Label>
                      <Select value={onboardingData.educationLevel} onValueChange={(v) => handleOnboardingChange("educationLevel", v)}>
                        <SelectTrigger className="h-12 bg-muted/50 border-0"><SelectValue placeholder="Level" /></SelectTrigger>
                        <SelectContent>{EDUCATION_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Employment *</Label>
                        <Select value={onboardingData.employmentStatus} onValueChange={(v) => handleOnboardingChange("employmentStatus", v)}>
                          <SelectTrigger className="h-12 bg-muted/50 border-0"><SelectValue placeholder="Status" /></SelectTrigger>
                          <SelectContent>{EMPLOYMENT_OPTIONS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Monthly Income *</Label>
                        <Select value={onboardingData.monthlyIncome} onValueChange={(v) => handleOnboardingChange("monthlyIncome", v)}>
                          <SelectTrigger className="h-12 bg-muted/50 border-0"><SelectValue placeholder="Range" /></SelectTrigger>
                          <SelectContent>{INCOME_BRACKETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Documents */}
                {onboardingStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Ghana Card Number *</Label>
                      <Input value={onboardingData.ghanaCardNumber || "GHA-"}
                        onChange={(e) => handleGhanaCardChange(e.target.value)}
                        placeholder="GHA-123456789-0" maxLength={16}
                        className="h-12 font-mono bg-muted/50 border-0 focus-visible:ring-primary" />
                      <p className="text-xs text-muted-foreground">Format: GHA-XXXXXXXXX-X</p>
                    </div>
                    <div className="grid gap-3">
                      {renderDocumentUpload("Ghana Card (Front)", onboardingData.ghanaCardFrontUrl, !!uploadProgress.ghanaCardFrontUrl, frontCardRef, frontUploadRef, "environment", (f) => handleUpload(f, "ghanaCardFrontUrl"))}
                      {renderDocumentUpload("Ghana Card (Back)", onboardingData.ghanaCardBackUrl, !!uploadProgress.ghanaCardBackUrl, backCardRef, backUploadRef, "environment", (f) => handleUpload(f, "ghanaCardBackUrl"))}
                      {renderDocumentUpload("Live Selfie", onboardingData.selfieUrl, !!uploadProgress.selfieUrl, selfieRef, null, "user", (f) => handleUpload(f, "selfieUrl"))}
                    </div>
                  </div>
                )}

                {/* Step 4: Loan */}
                {onboardingStep === 4 && (
                  <div className="space-y-4">
                    <Alert className="bg-emerald-500/10 border-emerald-500/30">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-emerald-800 dark:text-emerald-200 text-sm">
                        <strong>Tier 1:</strong> GHS 50–300 · Max 14 days
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label className="text-sm">Loan Amount (GHS) *</Label>
                      <Select value={String(loanAmount)} onValueChange={(v) => setLoanAmount(Number(v))}>
                        <SelectTrigger className="h-12 bg-muted/50 border-0"><SelectValue /></SelectTrigger>
                        <SelectContent>{amountOptions.map((a) => <SelectItem key={a} value={String(a)}>GHS {a}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Tenure *</Label>
                      <Select value={String(loanTenure)} onValueChange={(v) => setLoanTenure(Number(v))}>
                        <SelectTrigger className="h-12 bg-muted/50 border-0"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {tenureOptions.map((t) => <SelectItem key={t} value={String(t)}>{t} {t === 1 ? "Day" : "Days"}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Purpose *</Label>
                      <Select value={loanPurpose} onValueChange={setLoanPurpose}>
                        <SelectTrigger className="h-12 bg-muted/50 border-0"><SelectValue /></SelectTrigger>
                        <SelectContent>{LOAN_PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-2xl bg-muted/30 p-4">
                      <p className="text-sm font-medium mb-3">Estimated Term Sheet</p>
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
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            variant="outline"
            onClick={onboardingStep === 1 ? handleBack : handleOnboardingBack}
            className="flex-1 h-12 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>

          {onboardingStep < 4 ? (
            <Button onClick={handleOnboardingNext} className="flex-1 h-12 rounded-xl bg-gradient-pink hover:opacity-90">
              Next Step <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleOnboardingSubmit} disabled={isSubmittingOnboarding}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90">
              {isSubmittingOnboarding ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
              ) : (
                <>Complete <CheckCircle2 className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
