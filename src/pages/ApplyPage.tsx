import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Slider } from "@/components/ui/slider";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import imageCompression from "browser-image-compression";
import { LoanApplicationPage } from "@/pages/LoanApplicationPage";
import { cn, getApplicantName } from "@/lib/utils";
import { useApplicant } from "@/contexts/ApplicantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSocketContext } from "@/contexts/SocketContext";
import api, { getUserLoansHistory, getUserRepaymentsHistory } from "@/lib/api";
import { uploadToSupabase } from "@/lib/supabase";
import { TIER_LIMITS, TIERS, type TierConfig } from "@/lib/constants";
import agendaLogo from "@/assets/agenda-money-logo.jpg";
import { UserDashboard } from "@/pages/User";
import { LoansTab } from "@/pages/LoansTab";
import { ProfileTab } from "./ProfileTab";
import { LoanSummaryPage } from "./LoanSummaryPage";
import { LivenessCapture } from "@/components/liveliness/LivenessCapture";

import { UserRewardsTab } from "./UserRewardsTab";
import { UserNetworkTab } from "./UserNetworkTab";
import { GENDERS, GHANA_REGIONS, TERMS_LIST } from "@/lib/constants";
import { parseDecisionError, DecisionError } from "@/lib/api";
import { EligibilityBlockScreen } from "@/components/eligibility/EligibilityBlockScreen";
import { UserEndorsementsTab } from "./UserEndorsementsTab";
import { RepaymentPage } from "./RepaymentPage";
import { LoanStatusCard } from "@/components/dashboard/LoanStatusCard";
import {
  Bell,
  Home,
  User,
  Wallet,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Minus,
  Plus,
  CheckCircle2,
  Camera,
  Upload,
  Check,
  CalendarIcon,
  Shield,
  ChevronRight,
  CreditCard,
  Users,
  Copy,
  Banknote,
  ShieldCheck,
  Smartphone,
  Share2,
  HelpCircle,
} from "lucide-react";

const baseApiUrl = import.meta.env.VITE_API_URL || "";
const OTP_LENGTH = 6;
const OTP_SLOTS = ["one", "two", "three", "four", "five", "six"];
const RESEND_SECONDS = 60;
import { X } from "lucide-react";
import toast from "react-hot-toast";

const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Central",
  "Eastern",
  "Northern",
  "Western",
  "Volta",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
  "Western North",
  "Savannah",
  "North East",
  "Oti",
];

const GENDERS = ["Male", "Female"];
const ACCOMMODATION_TYPES = ["Owned", "Rented", "Family", "Other"];
const EDUCATION_LEVELS = ["Basic", "Secondary", "Tertiary", "Advanced"];
const EMPLOYMENT_OPTIONS = [
  "Self Employed",
  "Full-time Employee",
  "Part-time Employee",
  "Contract",
];
const INCOME_BRACKETS = [
  "Below GHS 1000",
  "GHS 1000-2000",
  "GHS 2000-5000",
  "Above GHS 5000",
];
const TERMS_LIST = [
  "Interest rate: 0.5% per day",
  "Processing fee: GHS 30 flat",
  "Requirement: 18+ years",
  "Requirement: Valid Ghana Card",
  "Late payment affects credit score",
  "Penal interest: 2% per day on overdue amount",
];

interface OnboardingData {
  firstName: string;
  surname: string;
  dob: string;
  gender: string;
  region: string;
  address: string;
  alternatePhone: string;
  accommodationType: string;
  yearsAtAddress: string;
  educationLevel: string;
  employmentStatus: string;
  monthlyIncome: string;
  ghanaCardNumber: string;
  ghanaCardFrontUrl: string;
  ghanaCardBackUrl: string;
  selfieUrl: string;
  hasAcceptedTerms: boolean;
}

const buildAmountOptions = (tier?: TierConfig) => {
  if (!tier) return [];
  if (tier.amounts?.length) return tier.amounts;
  if (!tier.minAmount || !tier.maxAmount) return [];
  const step = tier.minAmount;
  const count = Math.floor((tier.maxAmount - tier.minAmount) / step) + 1;
  return Array.from({ length: count }, (_, i) => tier.minAmount + i * step);
};

const buildTenureOptions = (tier?: TierConfig) => {
  if (!tier) return [];
  if (tier.tenures?.length) return tier.tenures;
  if (!tier.maxTenure) return [];
  const base = [1, 5, 10, tier.maxTenure];
  return Array.from(new Set(base)).sort((a, b) => a - b);
};

interface NetworkData {
  totalShared: number;
  activeReferrals: number;
  performance: "Good" | "Medium" | "Bad";
}

type View =
  | "landing"
  | "auth"
  | "otp"
  | "onboarding"
  | "loan-dashboard"
  | "success";

const STEPS = [
  { number: 1, label: "Personal Info" },
  { number: 2, label: "Work & Income" },
  { number: 3, label: "Background" },
  { number: 4, label: "Loan" },
  { number: 5, label: "Review" },
];

/* ─── Shared Header ─── */
function PageHeader({
  user,
  subtitle,
  onAvatarClick,
  onNotificationClick,
  hasNotifications,
  onLogoClick,
}: {
  user?: any;
  subtitle?: string;
  onAvatarClick?: () => void;
  onNotificationClick?: () => void;
  hasNotifications?: boolean;
  onLogoClick?: () => void;
}) {
  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "User";
  const initials = firstName[0]?.toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100/50 transition-all duration-300">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        {user ? (
          <>
            {/* Left: Avatar & Greeting */}
            <button
              onClick={onAvatarClick}
              className="flex items-center gap-3 group"
            >
              <div className="relative">
                <div className="h-10 w-10 number-flow-char rounded-full bg-gray-100 border-2 border-[#E91E63]/20 flex items-center justify-center text-primary font-bold overflow-hidden shadow-sm group-active:scale-95 transition-transform">
                  <span className="text-lg">{initials}</span>
                </div>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400 font-medium">
                  Welcome back,
                </p>
                <p className="text-sm font-bold text-gray-900 leading-tight">
                  {firstName}
                </p>
              </div>
            </button>

            {/* Center: Brand Logo */}
            <div className="absolute left-1/2 transform -translate-x-1/2 opacity-0 pointer-events-none">
              {/* Hidden on main dash to avoid clutter, kept for structure if needed */}
            </div>

            {/* Right: Notification Bell */}
            <button
              onClick={onNotificationClick}
              className="relative w-10 h-10 rounded-full bg-white/50 border border-white/20 shadow-sm flex items-center justify-center active:scale-95 transition-transform backdrop-blur-sm hover:bg-white/80"
            >
              <Bell className="w-5 h-5 text-gray-700" />
              {hasNotifications && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#EC1B84] border border-white animate-pulse" />
              )}
            </button>
          </>
        ) : (
          /* Simple Header for Onboarding */
          <>
            <button
              onClick={onLogoClick}
              type="button"
              className={cn(
                "transition-transform",
                onLogoClick &&
                  "cursor-pointer active:scale-95 hover:opacity-90",
              )}
            >
              <img
                src={agendaLogo}
                alt="Agenda Money"
                className="h-8 rounded-xl"
              />
            </button>
            {subtitle && (
              <span className="text-xs font-medium text-muted-foreground">
                {subtitle}
              </span>
            )}
          </>
        )}
      </div>
    </header>
  );
}

/* ─── Estimated Term Sheet ─── */
function EstimatedTermSheet({
  amount,
  tenure,
}: {
  amount: number;
  tenure: number;
}) {
  const interest = Math.round(amount * 0.005 * tenure);
  const fee = 30; // Flat Fee
  const disbursement = amount - fee;
  const total = amount + interest;
  const dueDate = new Date(Date.now() + tenure * 86400000).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", year: "numeric" },
  );

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm animate-in fade-in duration-300">
      <span className="text-gray-500">Principal</span>
      <span className="text-right font-medium text-gray-900">GHS {amount}</span>
      <span className="text-gray-500">Interest (0.5%/day)</span>
      <span className="text-right font-medium text-gray-900">
        GHS {interest}
      </span>
      <span className="text-gray-500">Processing Fee</span>
      <span className="text-right font-medium text-gray-900">GHS {fee}</span>

      <div className="col-span-2 my-1 border-t border-dashed border-gray-200" />

      <span className="text-gray-500 font-medium">Disbursement</span>
      <span className="text-right font-bold text-[#EC1B84]">
        GHS {disbursement}
      </span>

      <div className="col-span-2 my-1 border-t border-gray-100" />

      <span className="text-gray-600 font-bold">Total Repayment</span>
      <span className="text-right font-extrabold text-gray-900 text-lg">
        GHS {total}
      </span>

      <span className="text-gray-400 text-xs">Due Date</span>
      <span className="text-right font-medium text-gray-600 text-xs">
        {dueDate}
      </span>
    </div>
  );
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 100 : -100, opacity: 0 }),
  center: { zIndex: 1, x: 0, opacity: 1 },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 100 : -100,
    opacity: 0,
  }),
};

const tabVariants = {
  enter: { opacity: 0, y: 10, scale: 0.95 },
  center: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 },
};

function sanitizeMsisdnEntryInput(value: string): string {
  let digitsOnly = value.replace(/\D/g, "");

  // Handle pasted numbers that include Ghana country code.
  if (digitsOnly.startsWith("233")) {
    digitsOnly = digitsOnly.slice(3);
  }

  if (!digitsOnly) return "";

  // Allow 10 digits only when they start with 0, otherwise cap at 9 digits.
  return digitsOnly.startsWith("0")
    ? digitsOnly.slice(0, 10)
    : digitsOnly.slice(0, 9);
}

function isValidGhanaLocalPhone(value: string | undefined): boolean {
  const digitsOnly = sanitizeMsisdnEntryInput(value || "");
  if (!digitsOnly) return false;
  if (digitsOnly.length === 9) return true;
  return digitsOnly.length === 10 && digitsOnly.startsWith("0");
}

function normalizeToGhanaE164(value: string | undefined): string {
  const digitsOnly = sanitizeMsisdnEntryInput(value || "");
  if (!isValidGhanaLocalPhone(digitsOnly)) return "";
  const national = digitsOnly.length === 10 ? digitsOnly.slice(1) : digitsOnly;
  return `+233${national}`;
}

/**
 * Normalizes a phone number to the format 233XXXXXXXXX
 * Handles three cases:
 * - Numbers starting with 0: Replaces 0 with 233
 * - Numbers starting with 233: Returns as-is
 * - Other numbers: Prepends 233
 */
function normalizeMsisdn(msisdn: string | undefined): string {
  if (!msisdn) return "";

  const msisdnStr = String(msisdn);

  if (msisdnStr.startsWith("0")) {
    return `233${msisdnStr.slice(1)}`;
  }

  if (msisdnStr.startsWith("233")) {
    return msisdnStr;
  }

  return `233${msisdnStr}`;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function ApplyPage() {
  // Prefill node code from URL path (e.g., /BLE232)
  useEffect(() => {
    const path = window.location.pathname;
    // Remove leading slash and split by /, take first segment
    const code = path.startsWith("/")
      ? path.slice(1).split("/")[0]
      : path.split("/")[0];
    // Only prefill if code is present and not a known route (e.g., not 'apply')
    if (code && code.length >= 4 && code.toLowerCase() !== "apply") {
      setNodeCode(code.toUpperCase());
    }
  }, []);
  const { setApplicant, applicant } = useApplicant();
  const { socket } = useSocketContext();

  const [view, setView] = useState<View>("landing");
  const [direction, setDirection] = useState(0);
  const [msisdnInput, setMsisdnInput] = useState("");
  const [nodeCode, setNodeCode] = useState("");
  const [, setNodeName] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [userData, setUserData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [dobInput, setDobInput] = useState(""); // Local state for DD/MM/YYYY input
  const [dobError, setDobError] = useState<string | null>(null); // Validation error message
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<DecisionError | null>(
    null,
  );

  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingDirection, setOnboardingDirection] = useState(0);
  const [activeTab, setActiveTab] = useState("home"); // home, loans, profile
  const [isRepaymentOpen, setIsRepaymentOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [isFetchingNetwork, setIsFetchingNetwork] = useState(false);
  const [networkFetchError, setNetworkFetchError] = useState<string | null>(
    null,
  );

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isFetchingActivity, setIsFetchingActivity] = useState(false);

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showLiveness, setShowLiveness] = useState(false);

  const DEFAULT_ONBOARDING_DATA: OnboardingData = {
    firstName: "",
    surname: "",
    dob: "",
    gender: "",
    region: "",
    address: "",
    alternatePhone: "",
    accommodationType: "",
    yearsAtAddress: "",
    educationLevel: "",
    employmentStatus: "",
    monthlyIncome: "",
    ghanaCardNumber: "",
    ghanaCardFrontUrl: "",
    ghanaCardBackUrl: "",
    selfieUrl: "",
    hasAcceptedTerms: false,
  };

  const [onboardingData, setOnboardingData] = useState<OnboardingData>(() => {
    const saved = globalThis.sessionStorage.getItem("agenda_onboarding_data");
    return saved
      ? { ...DEFAULT_ONBOARDING_DATA, ...JSON.parse(saved) }
      : DEFAULT_ONBOARDING_DATA;
  });

  useEffect(() => {
    globalThis.sessionStorage.setItem(
      "agenda_onboarding_data",
      JSON.stringify(onboardingData),
    );
  }, [onboardingData]);

  const [loanApplicationData, setLoanApplicationData] = useState<{
    amount: number;
    tenure: number;
    purpose: string;
  } | null>(null);

  const [loanAmount, setLoanAmount] = useState(100);
  const [loanTenure, setLoanTenure] = useState(14);
  const [loanPurpose, setLoanPurpose] = useState("Business");
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);

  // Identity Verification Sub-step State
  const [identityStep, setIdentityStep] = useState<"intro" | "upload">("intro");
  const [identityConsent, setIdentityConsent] = useState(false);
  const [expandedUpload, setExpandedUpload] = useState<"id" | "selfie" | null>(
    null,
  );

  const [onboardingSubmitted, setOnboardingSubmitted] = useState(false);
  const [successNodeCode, setSuccessNodeCode] = useState<string | null>(null);
  const [, setIsRequestingLoan] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const [, setLoanSummary] = useState<{
    disbursementAmount: number;
    repaymentAmount: number;
    repaymentDate: string;
    msisdn: string;
  } | null>(null);

  // Real-time notifications from Socket Context
  const { notifications: socketNotifications } = useSocketContext();
  const notifications =
    socketNotifications.length > 0
      ? socketNotifications
      : (applicant as any)?.notifications || [];

  const frontCardRef = useRef<HTMLInputElement>(null); // Camera
  const frontCardFileRef = useRef<HTMLInputElement>(null); // File
  const backCardRef = useRef<HTMLInputElement>(null); // Camera
  const backCardFileRef = useRef<HTMLInputElement>(null); // File
  const selfieRef = useRef<HTMLInputElement>(null); // Camera Only
  const fallbackUserIdRef = useRef<string>(Date.now().toString());
  const autoSubmitRef = useRef(false);

  const currentTier = Number(userData?.currentTier ?? 1);
  const activeTier = TIER_LIMITS[currentTier];
  const tierMin = activeTier?.minAmount ?? TIERS[0].minAmount;
  const tierMax = activeTier?.maxAmount ?? 300;
  const tierMaxTenure = activeTier?.maxTenure ?? 14;
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
    const digitsOnly = sanitizeMsisdnEntryInput(msisdnInput);

    if (digitsOnly.length === 9) {
      return `233${digitsOnly}`;
    }

    if (digitsOnly.length === 10 && digitsOnly.startsWith("0")) {
      return `233${digitsOnly.slice(1)}`;
    }

    return null;
  }, [msisdnInput]);

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // ─── Backend-Driven Navigation Helper ───
  const handleAuthResponse = useCallback(
    (data: any) => {
      // 🎯 Use data.user if wrapped, else assume 'data' IS the user profile
      const backendUser = data.user || data;

      if (backendUser && backendUser.msisdn) {
        // Merge summary into user object if present, so UserDashboard can read applicant.summary
        const userWithSummary = data.summary
          ? { ...backendUser, summary: data.summary }
          : backendUser;

        setApplicant(userWithSummary);
        setUserData(userWithSummary);

        // HYDRATE ONBOARDING DATA to prevent validation errors on resume
        // Priority: Backend Data > Existing Local State > Default/Undefined
        setOnboardingData((prev) => {
          const newData = {
            ...prev,
            firstName: backendUser.firstName || prev.firstName,
            surname:
              backendUser.surname || backendUser.lastName || prev.surname,
            dob: backendUser.dob
              ? new Date(backendUser.dob).toISOString().split("T")[0]
              : prev.dob || "",
            gender: backendUser.gender || prev.gender,
            region: backendUser.region || prev.region,
            address: backendUser.address || prev.address,
            accommodationType:
              backendUser.accommodationType || prev.accommodationType,
            yearsAtAddress: backendUser.yearsAtAddress || prev.yearsAtAddress,
            educationLevel: backendUser.educationLevel || prev.educationLevel,
            employmentStatus:
              backendUser.employmentStatus || prev.employmentStatus,
            monthlyIncome: backendUser.monthlyIncome || prev.monthlyIncome,
            ghanaCardNumber:
              backendUser.ghanaCardNumber || prev.ghanaCardNumber,
          };
          return newData;
        });
      }

      // Handle Active Loan Summary (if available) - Keeping this for state hydration
      if (data.summary) {
        if (data.summary.hasActiveLoan === false) {
          setActiveLoanDetails(null);
        }
      }

      // 🎯 THE SOURCE OF TRUTH: backend-provided nextStep
      const nextStep = data.nextStep;

      switch (nextStep) {
        case "DASHBOARD":
          setView("loan-dashboard");
          setOnboardingStep(0); // 🚀 Ensure onboarding is "turned off"
          break;
        case "ONBOARDING_KYC":
          setView("onboarding");
          setOnboardingStep(3); // Direct to ID upload step
          break;
        case "ONBOARDING_PERSONAL":
          setView("onboarding");
          setOnboardingStep(1); // Direct to Bio-data
          break;
        default:
          // Safety fallback: If backend doesn't provide a valid nextStep
          console.warn(
            "Unknown or missing nextStep; choosing fallback view",
            nextStep,
          );
          // If we have user data, we assume the user is authenticated and prefer dashboard
          if (backendUser && backendUser.msisdn) {
            setView("loan-dashboard");
          } else {
            // No user data means we cannot treat this as an authenticated session
            setView("auth");
          }
          break;
      }
    },
    [setApplicant, setUserData, setView, setOnboardingStep],
  );

  // Handle Paystack repayment WebSocket events
  useEffect(() => {
    if (!socket) return;

    const handleRepaymentProcessed = async () => {
      try {
        const token = globalThis.sessionStorage.getItem("agenda_token");
        if (!token) return;
        const r = await fetch(`${baseApiUrl}/api/auth/me`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const p = await r.json();
        if (r.ok && (p?.user || p?.msisdn)) {
          handleAuthResponse(p);
        }
      } catch (e) {
        console.error("Failed to refresh user on repayment processed", e);
      }
    };

    const handleLoanEndorsed = async (data: any) => {
      try {
        toast.success(
          data?.message || "Your loan has been endorsed by your node!",
          { icon: "✅" },
        );

        const token = globalThis.sessionStorage.getItem("agenda_token");
        if (!token) return;
        const r = await fetch(`${baseApiUrl}/api/auth/me`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const p = await r.json();
        if (r.ok && (p?.user || p?.msisdn)) handleAuthResponse(p);
      } catch (e) {
        console.error("Failed to refresh user on loan endorsed", e);
      }
    };

    const handleLoanStatusUpdated = async (data: any) => {
      try {
        console.log("Real-time loan status update:", data);

        if (data.title && data.message) {
          toast.success(`${data.title}: ${data.message}`, { duration: 5000 });
        } else if (data.message) {
          toast.success(data.message);
        }

        const token = globalThis.sessionStorage.getItem("agenda_token");
        if (!token) return;

        // Re-fetch user profile
        const r = await fetch(`${baseApiUrl}/api/auth/me`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const p = await r.json();
        if (r.ok && (p?.user || p?.msisdn)) {
          handleAuthResponse(p);
        }

        // RE-FETCH Active Loan & Activity to avoid 0.00 amount or stale state
        fetchActiveLoan();
        fetchRecentActivity();
      } catch (e) {
        console.error("Failed to refresh user on real-time update", e);
      }
    };

    socket.on("repayment_processed", handleRepaymentProcessed);
    socket.on("loan_endorsed", handleLoanEndorsed);
    socket.on("loan_status_updated", handleLoanStatusUpdated);

    return () => {
      socket.off("repayment_processed", handleRepaymentProcessed);
      socket.off("loan_endorsed", handleLoanEndorsed);
      socket.off("loan_status_updated", handleLoanStatusUpdated);
    };
  }, [socket, handleAuthResponse]);

  // ─── Effects ───
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = globalThis.sessionStorage.getItem("agenda_token");
      if (!storedToken) {
        setIsCheckingAuth(false);
        return;
      }

      setAuthToken(storedToken);
      try {
        const r = await fetch(`${baseApiUrl}/api/auth/me`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${storedToken}`,
          },
        });
        const p = await r.json();

        if (r.ok && (p?.user || p?.msisdn)) {
          // Use centralized handler for session recovery
          handleAuthResponse(p);
        } else {
          console.error("Session check failed: API Error", r.status, p);
          globalThis.sessionStorage.removeItem("agenda_token");
          setAuthToken(null);
        }
      } catch (e) {
        console.error("Session check failed: Network/Code Error", e);
        // Optional: Don't remove token immediately on network error?
        // For now, keep existing behavior but log it.
        globalThis.sessionStorage.removeItem("agenda_token");
        setAuthToken(null);
      } finally {
        setTimeout(() => setIsCheckingAuth(false), 500);
      }
    };

    checkAuth();
  }, [setApplicant, handleAuthResponse]);

  useEffect(() => {
    setOnboardingData((prev) => ({
      ...prev,
      ghanaCardFrontUrl: prev.ghanaCardFrontUrl?.startsWith("blob:")
        ? ""
        : prev.ghanaCardFrontUrl,
      ghanaCardBackUrl: prev.ghanaCardBackUrl?.startsWith("blob:")
        ? ""
        : prev.ghanaCardBackUrl,
      selfieUrl: prev.selfieUrl?.startsWith("blob:") ? "" : prev.selfieUrl,
    }));
  }, []);

  // ─── Scroll Reset on View/Step Change ───
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view, onboardingStep, onboardingData.hasAcceptedTerms]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = globalThis.setInterval(
      () => setResendSeconds((p) => Math.max(0, p - 1)),
      1000,
    );
    return () => globalThis.clearInterval(timer);
  }, [resendSeconds]);

  // ─── Shared Fetching Logic ───
  const fetchActiveLoan = useCallback(async () => {
    const token =
      authToken || globalThis.sessionStorage.getItem("agenda_token");
    if (!token) return;

    try {
      const r = await fetch(`${baseApiUrl}/api/loans/active`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (r.ok) {
        const data = await r.json();
        if (data.hasActiveLoan) {
          setActiveLoanDetails(data.loanDetails);
        } else {
          setActiveLoanDetails(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch active loan:", error);
    }
  }, [authToken, baseApiUrl]);

  const fetchRecentActivity = useCallback(async () => {
    const token =
      authToken || globalThis.sessionStorage.getItem("agenda_token");
    if (!token) return;

    setIsFetchingActivity(true);
    try {
      const [loansRes, repaymentsRes] = await Promise.all([
        getUserLoansHistory().catch(() => ({ data: [] })),
        getUserRepaymentsHistory().catch(() => ({ data: [] })),
      ]);

      const loans = Array.isArray(loansRes?.data) ? loansRes.data : [];
      const repayments = Array.isArray(repaymentsRes?.data)
        ? repaymentsRes.data
        : [];

      const combined = [
        ...loans.map((l: any) => {
          const s = (l.status || "").toUpperCase();
          let title = "Loan requested";
          let showAmount = false;

          if (s === "AWAITING_ENDORSEMENT") {
            title = "Loan requested";
          } else if (s === "PENDING" || s === "PENDING_VERIFICATION") {
            title = "Under admin review";
          } else if (s === "REJECTED") {
            title = "Application not approved";
          } else if (s === "DISBURSING") {
            title = "Processing disbursement";
          } else if (s === "ACTIVE") {
            title = "Loan disbursed";
            showAmount = true;
          } else if (s === "COMPLETED") {
            title = "Loan fully repaid";
            showAmount = true;
          }

          return {
            id: `loan-${l.loanId || l._id}`,
            type: "loan",
            title,
            status: s,
            amount: showAmount ? l.principal || l.amount || 0 : null,
            date: showAmount ? l.disbursedAt || l.createdAt : l.createdAt,
          };
        }),
        ...repayments.map((r: any) => ({
          id: `rep-${r.repaymentId || r._id}`,
          type: "payment",
          title: "Loan repayment",
          amount: r.amount || 0,
          date: r.paidAt || r.createdAt,
        })),
      ];

      combined.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setRecentActivity(combined);
    } catch (err) {
      console.error("Failed to load recent activity:", err);
    } finally {
      setIsFetchingActivity(false);
    }
  }, [authToken]);

  // ─── Active Loan Fetching ───
  const [activeLoanDetails, setActiveLoanDetails] = useState<any>(null);

  useEffect(() => {
    if (view === "loan-dashboard") {
      fetchActiveLoan();
    }
  }, [view, fetchActiveLoan]);

  // ─── Recent Activity Fetching ───
  useEffect(() => {
    if (view === "loan-dashboard") {
      fetchRecentActivity();
    }
  }, [view, fetchRecentActivity]);

  // ─── Network Data Fetching ───
  useEffect(() => {
    const fetchNetwork = async () => {
      if (!isShareOpen) return;
      const token =
        authToken || globalThis.sessionStorage.getItem("agenda_token");
      if (!token) return;

      setIsFetchingNetwork(true);
      setNetworkData(null); // Clear any old data from previous logins
      setNetworkFetchError(null);
      try {
        const res = await fetch(
          `${baseApiUrl}/api/users/network?t=${Date.now()}`,
          {
            // Cache buster
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store", // Disable aggressive browser caching
          },
        );
        if (res.ok) {
          const json = await res.json();
          if (import.meta.env.DEV) {
          }
          if (json.success && json.data) {
            setNetworkData(json.data);
          } else {
            setNetworkFetchError("Failed to load network stats.");
          }
        } else {
          // If endpoint doesn't exist yet, we can mock it here temporarily or just show an error
          setNetworkFetchError("Network stats unavailable.");
        }
      } catch (err) {
        console.error("Failed to fetch network data", err);
        setNetworkFetchError("Could not connect to network service.");
      } finally {
        setIsFetchingNetwork(false);
      }
    };

    fetchNetwork();
  }, [isShareOpen, baseApiUrl, authToken]);

  useEffect(() => {
    return () => {
      if (onboardingData.ghanaCardFrontUrl?.startsWith("blob:"))
        URL.revokeObjectURL(onboardingData.ghanaCardFrontUrl);
      if (onboardingData.ghanaCardBackUrl?.startsWith("blob:"))
        URL.revokeObjectURL(onboardingData.ghanaCardBackUrl);
      if (onboardingData.selfieUrl?.startsWith("blob:"))
        URL.revokeObjectURL(onboardingData.selfieUrl);
    };
  }, []);

  // ─── Handlers ───

  const resetAutoSubmit = useCallback(() => {
    autoSubmitRef.current = false;
  }, []);
  const handleOnboardingChange = (
    field: keyof typeof onboardingData,
    value: string,
  ) => setOnboardingData((p) => ({ ...p, [field]: value }));

  const formatGhanaCardNumber = (value: string) => {
    const d = value.match(/\d/g)?.join("") ?? "";
    if (d.length === 0) return "GHA-";
    if (d.length <= 9) return `GHA-${d}`;
    return `GHA-${d.slice(0, 9)}-${d.slice(9, 10)}`;
  };
  const isValidGhanaCard = (v: string) => /^GHA-\d{9}-\d$/.test(v);
  const handleGhanaCardChange = (v: string) => {
    if (!v.startsWith("GHA-")) return;
    handleOnboardingChange("ghanaCardNumber", formatGhanaCardNumber(v));
  };

  const handleUpload = async (
    file: File,
    field: "ghanaCardFrontUrl" | "ghanaCardBackUrl" | "selfieUrl",
  ) => {
    setUploadProgress((prev) => ({ ...prev, [field]: 10 }));
    setErrorMessage(null);
    let finalFile = file;

    // 1️⃣ Compress immediately upon capture!
    if (file.type.startsWith("image/")) {
      try {
        finalFile = await imageCompression(file, {
          maxSizeMB: 1.5, // slightly larger max size allows it to skip heavy compression
          maxWidthOrHeight: 1280, // resize aggressively before compression for speed
          useWebWorker: true,
          initialQuality: 0.9,
          alwaysKeepResolution: false,
        });
      } catch (error) {
        console.error("Compression failed:", error);
      }
    }

    const localUrl = URL.createObjectURL(finalFile);
    setOnboardingData((prev) => ({ ...prev, [field]: localUrl }));
    setUploadProgress((prev) => ({ ...prev, [field]: 0 }));

    // Store the compressed file in state
    setUploadedFiles((prev) => ({ ...prev, [field]: finalFile }));
  };

  const getFileExtension = useCallback((file: File): string => {
    const last = file.name.lastIndexOf(".");
    return last === -1 ? ".jpg" : file.name.substring(last);
  }, []);

  const base64ToJpegFile = useCallback(
    (base64Data: string, fileName: string): File | null => {
      try {
        const cleaned = (base64Data || "").replace(/^data:image\/\w+;base64,/, "");
        const binary = atob(cleaned);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        return new File([bytes], fileName, { type: "image/jpeg" });
      } catch (error) {
        console.error("Failed to convert liveness frame to file:", error);
        return null;
      }
    },
    [],
  );

  const handleRequestOtp = async () => {
    setErrorMessage(null);
    // Removed nodeCode check per user request
    if (!normalizedMsisdn) {
      setErrorMessage("Enter a valid Ghanaian phone number.");
      return;
    }
    setIsRequesting(true);
    try {
      const r = await fetch(`${baseApiUrl}/api/auth/request`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ msisdn: normalizedMsisdn, nodeCode: "" }), // Node code moved to Onboarding Step 4
      });

      if (r.status === 429) {
        throw new Error(
          "Too many requests. Please wait a few minutes before trying again.",
        );
      }

      const p = await r.json();
      if (!r.ok) throw new Error(p?.message || "Unable to request OTP.");
      setNodeName(p?.nodeName ?? "your Node");
      setOtp("");
      resetAutoSubmit();
      setResendSeconds(RESEND_SECONDS);
      setDirection(1);
      setView("otp");
    } catch (e: any) {
      setErrorMessage(getFriendlyErrorMessage(e));
    } finally {
      setIsRequesting(false);
    }
  };

  const handleVerifyOtp = useCallback(
    async (code?: string) => {
      const otpToVerify = typeof code === "string" ? code : otp;
      if (!normalizedMsisdn) {
        setErrorMessage("Enter a valid phone number.");
        return;
      }
      if (otpToVerify.length !== OTP_LENGTH) return;

      // Prevent multiple calls
      if (isVerifying) return;

      setIsVerifying(true);
      setErrorMessage(null);
      try {
        const r = await fetch(`${baseApiUrl}/api/auth/verify`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ msisdn: normalizedMsisdn, otp: otpToVerify }),
        });

        if (r.status === 429) {
          throw new Error(
            "Too many requests. Please wait a few minutes before trying again.",
          );
        }

        const p = await r.json();
        if (!r.ok) throw new Error(p?.message || "OTP verification failed.");

        if (p?.token) {
          globalThis.sessionStorage.setItem("agenda_token", p.token);
          setAuthToken(p.token);

          // Fetch full profile to ensure we have nodeCode and latest details
          try {
            const profileRes = await fetch(`${baseApiUrl}/api/auth/me`, {
              headers: {
                Accept: "application/json",
                Authorization: `Bearer ${p.token}`,
              },
            });
            if (profileRes.status === 429) {
              throw new Error("Too many requests.");
            }
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              // Merge verify response (has nextStep) with profile data (has full user)
              handleAuthResponse({
                ...p, // Base verify response (has nextStep)
                ...profileData, // Overwrites with full profile data where appropriate
                nextStep: p.nextStep, // Explicitly preserve nextStep from verify response
                user: profileData.user || profileData || p.user, // Explicitly prefer profile user
              });
            } else {
              console.warn("Profile fetch failed, using verify response");
              handleAuthResponse(p);
            }
          } catch (err) {
            console.error("Post-login profile fetch failed", err);
            handleAuthResponse(p);
          }
        }
      } catch (e: any) {
        setErrorMessage(getFriendlyErrorMessage(e));
      } finally {
        setIsVerifying(false);
      }
    },
    [normalizedMsisdn, otp, setApplicant, isVerifying, handleAuthResponse],
  );

  const handleResend = async () => {
    if (resendSeconds > 0 || isRequesting) return;
    if (!normalizedMsisdn) {
      setErrorMessage("Enter a valid phone number.");
      return;
    }
    setIsRequesting(true);
    setErrorMessage(null);
    try {
      const r = await fetch(`${baseApiUrl}/api/auth/resend`, {
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
      const p = await r.json();
      if (!r.ok) throw new Error(p?.message || "Unable to resend OTP.");
      setResendSeconds(RESEND_SECONDS);
    } catch (e: any) {
      setErrorMessage(e?.message || "Unable to resend OTP.");
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

  const validateOnboardingStep = (step: number): string | null => {
    switch (step) {
      case 1:
        if (
          !onboardingData.firstName ||
          !onboardingData.surname ||
          !onboardingData.dob
        )
          return "Complete all personal details.";
        if (!onboardingData.gender) return "Select your gender.";
        if (!onboardingData.region || !onboardingData.address)
          return "Provide your region and address.";
        if (
          onboardingData.address.trim().split(/\s+/).filter(Boolean).length < 3
        )
          return "Provide a full address (at least 3 words).";
        if (!onboardingData.alternatePhone)
          return "Provide an alternate phone number.";
        if (
          onboardingData.alternatePhone &&
          !isValidGhanaLocalPhone(onboardingData.alternatePhone)
        )
          return "Enter a valid Ghana phone number.";

        const primaryPhoneNorm = normalizedMsisdn || fallbackUserIdRef.current;
        if (
          onboardingData.alternatePhone &&
          primaryPhoneNorm &&
          normalizeToGhanaE164(onboardingData.alternatePhone) === normalizeToGhanaE164(primaryPhoneNorm)
        )
          return "Alternate phone cannot be the same as primary phone.";
        return null;
      case 2:
        if (!onboardingData.accommodationType || !onboardingData.yearsAtAddress)
          return "Complete accommodation details.";
        if (
          !onboardingData.educationLevel ||
          !onboardingData.employmentStatus ||
          !onboardingData.monthlyIncome
        )
          return "Complete employment details.";
        return null;
      case 3:
        if (!isValidGhanaCard(onboardingData.ghanaCardNumber))
          return "Ghana Card: GHA-XXXXXXXXX-X";
        if (
          !onboardingData.ghanaCardFrontUrl ||
          !onboardingData.ghanaCardBackUrl ||
          !onboardingData.selfieUrl
        )
          return "Upload all required documents.";
        return null;
      case 4:
        if (!loanAmount || !loanTenure || !loanPurpose)
          return "Complete loan details.";
        return null;
      default:
        return null;
    }
  };

  const handleOnboardingNext = () => {
    // If on Step 3 (Identity) and in 'intro' mode, move to 'upload'
    if (onboardingStep === 3 && identityStep === "intro") {
      if (!identityConsent) {
        setErrorMessage("Please agree to the terms to continue.");
        return;
      }
      setIdentityStep("upload");
      setErrorMessage(null);
      return;
    }

    const err = validateOnboardingStep(onboardingStep);
    if (err) {
      setErrorMessage(err);
      return;
    }

    setErrorMessage(null);
    setOnboardingDirection(1);
    setOnboardingStep((p) => p + 1);

    // If moving TO step 3 from step 2, ensure we start at 'intro'
    if (onboardingStep === 2) {
      setIdentityStep("intro");
      setIdentityConsent(false); // Reset consent
    }
  };
  const handleOnboardingBack = () => {
    if (onboardingStep === 3 && identityStep === "upload") {
      setIdentityStep("intro");
      return;
    }
    setErrorMessage(null);
    setOnboardingDirection(-1);
    setOnboardingStep((p) => p - 1);
  };

  const handleOnboardingSubmit = async () => {
    setErrorMessage(null);
    const err = validateOnboardingStep(onboardingStep);
    if (err) {
      setErrorMessage(err);
      return;
    }
    setIsSubmittingOnboarding(true);
    try {
      let finalFrontUrl = onboardingData.ghanaCardFrontUrl;
      let finalBackUrl = onboardingData.ghanaCardBackUrl;
      let finalSelfieUrl = onboardingData.selfieUrl;

      // 🚨 DEAD BLOB DETECTION: If we have a blob: URL but no file in memory (refresh happened), we MUST re-upload.
      // We cannot submit a blob: URL to the backend.
      const hasDeadBlob = (url?: string, file?: File) =>
        url?.startsWith("blob:") && !file;

      if (
        hasDeadBlob(finalFrontUrl, uploadedFiles.ghanaCardFrontUrl) ||
        hasDeadBlob(finalBackUrl, uploadedFiles.ghanaCardBackUrl) ||
        hasDeadBlob(finalSelfieUrl, uploadedFiles.selfieUrl)
      ) {
        setErrorMessage(
          "Your uploaded images have expired. Please re-upload them.",
        );
        setUploadProgress({
          ghanaCardFrontUrl: 0,
          ghanaCardBackUrl: 0,
          selfieUrl: 0,
        });
        setOnboardingData((prev) => ({
          ...prev,
          ghanaCardFrontUrl: "",
          ghanaCardBackUrl: "",
          selfieUrl: "",
        }));
        setOnboardingStep(3); // Go to Identity Step
        setIdentityStep("upload"); // Go to Upload screen
        setIsSubmittingOnboarding(false);
        return;
      }

      const userId = normalizedMsisdn || fallbackUserIdRef.current;
      const uploadFile = async (
        file: File,
        label: string,
        errorMsg: string,
      ) => {
        const ext = getFileExtension(file);
        const result = await uploadToSupabase(
          file,
          "kyc-documents",
          `${userId}/${label}-${Date.now()}${ext}`,
        );
        if (!result.success || !result.url)
          throw new Error(result.error || errorMsg);
        return result.url;
      };

      // 🎯 CRITICAL: Overwrite blobs with real Supabase links if new files exist (DO IT IN PARALLEL FOR SPEED)
      const uploadPromises = [];

      // The files in uploadedFiles are already compressed from handleUpload!
      if (uploadedFiles.ghanaCardFrontUrl) {
        uploadPromises.push(
          uploadFile(
            uploadedFiles.ghanaCardFrontUrl,
            "ghana-card-front",
            "Front ID upload failed.",
          ).then((url) => {
            finalFrontUrl = url;
          }),
        );
      }
      if (uploadedFiles.ghanaCardBackUrl) {
        uploadPromises.push(
          uploadFile(
            uploadedFiles.ghanaCardBackUrl,
            "ghana-card-back",
            "Back ID upload failed.",
          ).then((url) => {
            finalBackUrl = url;
          }),
        );
      }
      if (uploadedFiles.selfieUrl) {
        uploadPromises.push(
          uploadFile(
            uploadedFiles.selfieUrl,
            "selfie",
            "Selfie upload failed.",
          ).then((url) => {
            finalSelfieUrl = url;
          }),
        );
      }

      await Promise.all(uploadPromises);

      const r = await fetch(`${baseApiUrl}/api/users/onboard`, {
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
          alternatePhone: onboardingData.alternatePhone ? normalizeToGhanaE164(onboardingData.alternatePhone).replace('+', '') : undefined,
          accommodationType: onboardingData.accommodationType,
          yearsAtAddress: onboardingData.yearsAtAddress,
          educationLevel: onboardingData.educationLevel,
          employmentStatus: onboardingData.employmentStatus,
          monthlyIncome: onboardingData.monthlyIncome,
          ghanaCardNumber: onboardingData.ghanaCardNumber,
          ghanaCardFrontUrl: finalFrontUrl,
          ghanaCardBackUrl: finalBackUrl,
          selfieUrl: finalSelfieUrl,
          initialLoanAmount: Number(loanAmount),
          initialLoanTenure: Number(loanTenure),
          initialLoanPurpose: loanPurpose,
          nodeCode: nodeCode.trim(), // Include referral code
        }),
      });
      const p = await r.json();

      if (!r.ok) {
        // 🎯 Catch the "Invalid Node" error
        if (
          r.status === 400 &&
          (p.message?.toLowerCase().includes("node") ||
            p.message?.toLowerCase().includes("code"))
        ) {
          setErrorMessage(
            p.message || "Invalid Node Code. Please check and try again.",
          );
          setOnboardingStep(4); // 🚀 Redirect back to Node Code input!
          setIsSubmittingOnboarding(false);
          return;
        }
        throw new Error(p?.message || "Submission failed.");
      }

      const code = p.nodeCode || "AM-NEW";
      setSuccessNodeCode(code);

      const updatedUser = {
        ...p.user,
        nodeCode: code,
        // Force these to ensure Dashboard shows "Pending" + "Phone" instantly
        loanStatus: "AWAITING_ENDORSEMENT",
        summary: {
          ...(p.user?.summary || {}),
          isPending: true,
        },
        msisdn: p.user?.msisdn || normalizedMsisdn,
        userId: p.user?.userId || normalizedMsisdn,

        // Ensure Name is present for "Welcome back [Name]"
        firstName: p.user?.firstName || onboardingData.firstName,
        lastName: p.user?.lastName || p.user?.surname || onboardingData.surname,
        fullName:
          p.user?.fullName ||
          `${onboardingData.firstName} ${onboardingData.surname}`,
      };

      setUserData(updatedUser);
      setApplicant(updatedUser);

      // Go to Success Screen
      setView("success");
    } catch (e: any) {
      setErrorMessage(e?.message || "Onboarding failed.");
    } finally {
      setIsSubmittingOnboarding(false);
    }
  };

  const canSubmitEntry = Boolean(normalizedMsisdn);
  const canVerify = otp.length === OTP_LENGTH;

  // ─── Upload Box ───
  function renderUploadBox(
    label: string,
    fieldUrl: string,
    isUploading: boolean,
    cameraRef: React.RefObject<HTMLInputElement>,
    capture: "user" | "environment",
    onFileChange: (file: File) => void,
    fileRef?: React.RefObject<HTMLInputElement>, // Optional: If present, enables Upload button
  ) {
    return (
      <div
        onClick={() => {
          // Default action: If "fileRef" exists (IDs), prioritize Upload? Or Camera?
          // Let's default to Camera for consistency if they click the box,
          // OR do nothing and force button click. Let's do nothing to avoid confusion.
          if (fileRef) return;
          cameraRef.current?.click();
        }}
        className={cn(
          "border-2 border-dashed rounded-xl p-4 text-center transition-all",
          fieldUrl
            ? "border-primary/40 bg-primary/5"
            : "border-border hover:border-primary/50",
          !fieldUrl && !fileRef && "cursor-pointer", // Only cursor-pointer if simple flow
        )}
      >
        {/* Camera Input */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture={capture}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileChange(f);
          }}
          className="hidden"
        />

        {/* File Input (Optional) */}
        {fileRef && (
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFileChange(f);
            }}
            className="hidden"
          />
        )}

        {isUploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        ) : fieldUrl ? (
          <div className="space-y-3">
            <img
              src={fieldUrl}
              alt={label}
              className="w-full h-40 object-cover rounded-lg border border-primary/20"
            />
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {label} uploaded
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-red-500 h-6 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  cameraRef.current?.click();
                }}
              >
                Retake
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  cameraRef.current?.click();
                }}
              >
                <Camera className="h-4 w-4" /> Capture
              </Button>
              {fileRef && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileRef.current?.click();
                  }}
                >
                  <Upload className="h-4 w-4" /> Upload
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════
  // LOADING VIEW
  // ═══════════════════════════════════════
  if (isCheckingAuth) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        <motion.img
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          src={agendaLogo}
          alt="Agenda Money"
          className="h-24 w-auto rounded-[32px] mb-6 object-contain"
        />
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin shrink-0" />
          <p className="text-sm font-medium text-gray-400">
            Securely logging you in...
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // AUTH & OTP VIEWS
  // ═══════════════════════════════════════
  // ═══════════════════════════════════════
  // LANDING VIEW (Splash)
  // ═══════════════════════════════════════
  if (view === "landing") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-pink-100/40 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-100/40 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center max-w-md w-full">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-10"
          >
            <div className="relative group">
              <div className="absolute -inset-4 bg-white/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <img
                src={agendaLogo}
                alt="Agenda Money"
                className="h-auto w-44 object-contain rounded-2xl shadow-xl hover:scale-105 transition-transform duration-300"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="space-y-6 mb-16"
          >
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Get a loan in <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-rose-500">
                minutes
              </span>
            </h1>

            <div className="flex flex-col gap-3 w-fit mx-auto mt-2">
              <div className="flex items-center gap-3 bg-gray-50 p-2.5 pr-6 rounded-xl border border-gray-100/50 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Banknote className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  No Hidden Fees
                </span>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 p-2.5 pr-6 rounded-xl border border-gray-100/50 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Simpler terms
                </span>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 p-2.5 pr-6 rounded-xl border border-gray-100/50 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  100% digital
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="w-full"
          >
            <Button
              onClick={() => setView("auth")}
              className="w-full h-14 rounded-full bg-slate-900 text-white text-lg font-bold shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Get Started
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // AUTH & OTP VIEWS (FlyonUI Design)
  // ═══════════════════════════════════════
  if (view === "auth" || view === "otp") {
    return (
      <div
        className="flex h-auto min-h-screen items-center justify-center overflow-x-hidden bg-white py-10 relative"
        data-theme="light"
      >
        {/* Background Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(236,27,132,0.15)_0%,rgba(255,255,255,0)_70%)] blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,rgba(255,255,255,0)_70%)] blur-[120px] pointer-events-none animate-pulse delay-1000" />
        <div className="absolute top-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.1)_0%,rgba(255,255,255,0)_70%)] blur-[100px] pointer-events-none animate-pulse delay-700" />

        <div className="relative flex flex-col w-full items-center justify-center px-4 sm:px-6 lg:px-8 z-10">
          {/* SVG Background - Abstract Node Lines */}
          <div className="absolute pointer-events-none opacity-30 md:opacity-60 scale-125">
            <svg
              width="612"
              height="697"
              viewBox="0 0 612 697"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M97.4387 622.042C96.3793 621.236 95.3369 620.415 94.3115 619.58L93.9959 619.968C91.9211 618.28 89.9159 616.536 87.9805 614.74L88.3206 614.374C86.3673 612.562 84.4856 610.697 82.6761 608.783L82.3128 609.127C80.4764 607.185 78.7139 605.193 77.026 603.154L77.4111 602.836C75.7156 600.788 74.0956 598.694 72.5516 596.557L72.1463 596.85C70.5835 594.687 69.0983 592.481 67.6913 590.235L68.1149 589.97C66.7047 587.719 65.3733 585.429 64.1214 583.104L63.6812 583.341C62.4181 580.995 61.2356 578.613 60.1343 576.2L60.5891 575.992C59.4876 573.579 58.4677 571.134 57.5299 568.663L57.0624 568.84C56.1179 566.351 55.2564 563.834 54.4784 561.295L54.9565 561.149C54.1802 558.615 53.4874 556.058 52.8788 553.483L52.3922 553.598C51.7803 551.01 51.2531 548.403 50.8112 545.782L51.3042 545.698C50.864 543.087 50.5087 540.462 50.2391 537.828L49.7417 537.879C49.4712 535.235 49.2865 532.581 49.1884 529.923L49.688 529.904C49.5905 527.26 49.5788 524.612 49.6538 521.963L49.154 521.949C49.2291 519.294 49.3908 516.639 49.6397 513.988L50.1375 514.035C50.3847 511.403 50.7182 508.775 51.1386 506.156L50.6449 506.076C51.0653 503.457 51.5723 500.847 52.1664 498.25L52.6538 498.361C53.2426 495.787 53.9175 493.225 54.6788 490.681L54.1998 490.537C54.9594 487.999 55.8049 485.477 56.7366 482.977L57.2052 483.151C58.1257 480.681 59.1309 478.232 60.2213 475.807L59.7653 475.602C60.8508 473.188 62.0203 470.799 63.2746 468.439L63.7161 468.674C64.9519 466.348 66.2703 464.05 67.6717 461.784L67.2465 461.521C68.635 459.276 70.1047 457.062 71.6561 454.883L72.0634 455.173C72.8302 454.096 73.6169 453.027 74.4238 451.968L76.8308 448.808L76.4331 448.505L81.2471 442.184L81.6449 442.487L86.4589 436.166L86.0611 435.863L90.8752 429.542L91.273 429.845L96.087 423.524L95.6892 423.221L100.503 416.9L100.901 417.203L105.715 410.882L105.317 410.580L110.131 404.259L110.529 404.562L115.343 398.241L114.945 397.938L119.759 391.617L120.157 391.92L124.971 385.599L124.574 385.296L129.388 378.975L129.785 379.278L134.599 372.957L134.202 372.654L139.016 366.334L139.413 366.637L144.227 360.316L143.830 360.013L148.644 353.692L149.042 353.995L153.856 347.674L153.458 347.371L158.272 341.05L158.670 341.353L163.484 335.032L163.086 334.729L167.900 328.409L168.298 328.711L173.112 322.391L172.714 322.088L177.528 315.767L177.926 316.07L182.740 309.749L182.342 309.446L187.156 303.125L187.554 303.428L192.368 297.107L191.970 296.804L196.784 290.483L197.182 290.786L201.996 284.465L201.598 284.163L206.412 277.842L206.810 278.145L211.624 271.824L211.226 271.521L216.040 265.2L216.438 265.503L221.252 259.182L220.854 258.879L225.669 252.558L226.066 252.861L230.880 246.54L230.483 246.237L235.297 239.917L235.694 240.22L240.508 233.899L240.111 233.596L244.925 227.275L245.322 227.578L250.136 221.257L249.739 220.954L254.553 214.633L254.951 214.936L259.765 208.615L259.367 208.312L264.181 201.992L264.579 202.294L269.393 195.974L268.995 195.671L273.809 189.35L274.207 189.653L279.021 183.332L278.623 183.029L283.437 176.708L283.835 177.011L288.649 170.69L288.251 170.387L293.065 164.067L293.463 164.369L298.277 158.049L297.879 157.746L302.693 151.425L303.091 151.728L307.905 145.407L307.507 145.104L312.321 138.783L312.719 139.086L317.533 132.765L317.135 132.462L321.949 126.141L322.347 126.444L327.161 120.124L326.763 119.821L331.577 113.5L331.975 113.803L336.789 107.482L336.391 107.179L341.205 100.858L341.603 101.161L344.010 98.0005C344.817 96.9411 345.638 95.8986 346.473 94.8733L346.085 94.5577C347.773 92.4829 349.517 90.4776 351.312 88.5423L351.679 88.8823C353.491 86.929 355.356 85.0474 357.269 83.2379L356.926 82.8746C358.868 81.0382 360.860 79.2757 362.898 77.5878L363.217 77.9729C365.265 76.2773 367.359 74.6573 369.496 73.1134L369.203 72.7081C371.366 71.1452 373.572 69.660 375.817 68.253L376.083 68.6767C378.333 67.2665 380.624 65.9351 382.949 64.6832L382.712 64.243C385.058 62.9799 387.440 61.7974 389.853 60.696L390.061 61.1509C392.474 60.0494 394.919 59.0295 397.390 58.0917L397.213 57.6242C399.702 56.6797 402.219 55.8182 404.758 55.0402L404.904 55.5183C407.438 54.742 409.995 54.0493 412.569 53.4406L412.454 52.954C415.043 52.3421 417.650 51.8149 420.271 51.373L420.354 51.866C422.966 51.4258 425.591 51.0705 428.225 50.8009L428.174 50.3035C430.818 50.033 433.472 49.8483 436.130 49.7502L436.149 50.2498C438.792 50.1523 441.441 50.1406 444.090 50.2156L444.104 49.7158C446.759 49.7909 449.414 49.9526 452.065 50.2015L452.018 50.6993C454.650 50.9465 457.278 51.280 459.897 51.7004L459.976 51.2068C462.595 51.6272 465.206 52.1341 467.803 52.7282L467.692 53.2156C470.266 53.8045 472.828 54.4793 475.372 55.2407L475.516 54.7617C478.054 55.5213 480.576 56.3667 483.076 57.2985L482.902 57.767C485.372 58.6875 487.821 59.6927 490.246 60.7831L490.451 60.3271C492.864 61.4126 495.253 62.5822 497.614 63.8364L497.379 64.2779C499.705 65.5138 502.003 66.8321 504.269 68.2336L504.532 67.8083C506.777 69.1968 508.991 70.6665 511.170 72.218L510.880 72.6253C511.957 73.392 513.025 74.1788 514.085 74.9856C515.144 75.7925 516.187 76.6134 517.212 77.4478L517.528 77.06C519.602 78.7485 521.608 80.4923 523.543 82.2877L523.203 82.6542C525.156 84.4663 527.038 86.3310 528.847 88.2446L529.211 87.9011C531.047 89.8432 532.810 91.8354 534.498 93.8737L534.112 94.1926C535.808 96.2401 537.428 98.3342 538.972 100.471L539.377 100.178C540.940 102.341 542.425 104.547 543.832 106.793L543.409 107.058C544.819 109.309 546.150 111.599 547.402 113.924L547.842 113.687C549.105 116.033 550.288 118.415 551.389 120.828L550.934 121.036C552.036 123.449 553.056 125.894 553.994 128.366L554.461 128.188C555.406 130.677 556.267 133.194 557.045 135.733L556.567 135.88C557.343 138.413 558.036 140.970 558.645 143.545L559.131 143.43C559.743 146.018 560.270 148.626 560.712 151.247L560.219 151.33C560.660 153.941 561.015 156.566 561.284 159.2L561.782 159.149C562.052 161.794 562.237 164.447 562.335 167.105L561.836 167.124C561.933 169.768 561.945 172.416 561.870 175.065L562.370 175.08C562.294 177.734 562.133 180.389 561.884 183.04L561.386 182.993C561.139 185.625 560.805 188.253 560.385 190.872L560.879 190.952C560.458 193.571 559.951 196.181 559.357 198.778L558.870 198.667C558.281 201.241 557.606 203.803 556.845 206.347L557.324 206.491C556.564 209.029 555.719 211.551 554.787 214.052L554.318 213.877C553.398 216.347 552.393 218.797 551.302 221.221L551.758 221.426C550.673 223.840 549.503 226.229 548.249 228.589L547.807 228.354C546.572 230.680 545.253 232.978 543.852 235.244L544.277 235.507C542.889 237.752 541.419 239.966 539.867 242.145L539.460 241.855C538.693 242.932 537.907 244.001 537.100 245.06L534.693 248.221L535.090 248.523L530.276 254.844L529.879 254.541L525.065 260.862L525.462 261.165L520.648 267.486L520.251 267.183L515.437 273.504L515.834 273.807L511.020 280.128L510.622 279.825L505.808 286.146L506.206 286.449L501.392 292.769L500.994 292.466L496.180 298.787L496.578 299.09L491.764 305.411L491.366 305.108L486.552 311.429L486.950 311.732L482.136 318.053L481.738 317.75L476.924 324.071L477.322 324.374L472.508 330.695L472.110 330.392L467.296 336.712L467.694 337.015L462.880 343.336L462.482 343.033L457.668 349.354L458.066 349.657L453.252 355.978L452.854 355.675L448.040 361.996L448.438 362.299L443.624 368.62L443.226 368.317L438.412 374.638L438.810 374.94L433.996 381.261L433.598 380.958L428.784 387.279L429.181 387.582L424.367 393.903L423.970 393.6L419.156 399.921L419.553 400.224L414.739 406.545L414.342 406.242L409.527 412.563L409.925 412.866L405.111 419.186L404.713 418.883L399.899 425.204L400.297 425.507L395.483 431.828L395.085 431.525L390.271 437.846L390.669 438.149L385.855 444.47L385.457 444.167L380.643 450.488L381.041 450.791L376.227 457.112L375.829 456.809L371.015 463.129L371.413 463.432L366.599 469.753L366.201 469.45L361.387 475.771L361.785 476.074L356.971 482.395L356.573 482.092L351.759 488.413L352.157 488.716L347.343 495.037L346.945 494.734L342.131 501.054L342.529 501.357L337.715 507.678L337.317 507.375L332.503 513.696L332.901 513.999L328.087 520.32L327.689 520.017L322.875 526.338L323.273 526.641L318.458 532.962L318.061 532.659L313.247 538.98L313.644 539.282L308.830 545.603L308.433 545.3L303.619 551.621L304.016 551.924L299.202 558.245L298.805 557.942L293.990 564.263L294.388 564.566L289.574 570.887L289.176 570.584L284.362 576.905L284.760 577.207L279.946 583.528L279.548 583.225L274.734 589.546L275.132 589.849L270.318 596.17L269.920 595.867L267.513 599.028C266.706 600.087 265.885 601.129 265.051 602.155L265.439 602.47C263.750 604.545 262.007 606.551 260.211 608.486L259.845 608.146C258.033 610.099 256.168 611.981 254.254 613.79L254.598 614.154C252.656 615.990 250.663 617.752 248.625 619.44L248.306 619.055C246.259 620.751 244.165 622.371 242.028 623.915L242.321 624.32C240.158 625.883 237.952 627.368 235.706 628.775L235.441 628.351C233.190 629.762 230.900 631.093 228.575 632.345L228.812 632.785C226.465 634.048 224.084 635.231 221.671 636.332L221.463 635.877C219.050 636.979 216.605 637.999 214.133 638.936L214.311 639.404C211.821 640.348 209.305 641.210 206.766 641.988L206.619 641.51C204.085 642.286 201.529 642.979 198.954 643.587L199.069 644.074C196.480 644.686 193.873 645.213 191.252 645.655L191.169 645.162C188.558 645.602 185.933 645.958 183.299 646.227L183.349 646.725C180.705 646.995 178.052 647.180 175.393 647.278L175.375 646.778C172.731 646.876 170.082 646.887 167.433 646.813L167.419 647.312C164.765 647.237 162.110 647.075 159.459 646.827L159.506 646.329C156.874 646.082 154.246 645.748 151.626 645.328L151.547 645.821C148.928 645.401 146.318 644.894 143.720 644.3L143.832 643.812C141.257 643.224 138.696 642.549 136.151 641.787L136.008 642.266C133.469 641.507 130.948 640.661 128.447 639.73L128.622 639.261C126.152 638.341 123.702 637.335 121.278 636.245L121.073 636.701C118.659 635.616 116.270 634.446 113.910 633.192L114.144 632.75C111.819 631.514 109.521 630.196 107.255 628.795L106.992 629.22C104.747 627.831 102.533 626.362 100.354 624.81L100.644 624.403C99.5665 623.636 98.4981 622.849 97.4387 622.042Z"
                stroke="hsl(var(--primary))"
                strokeOpacity="0.3"
                strokeDasharray="8 8"
              />
              <path
                d="M360.405 111.996C393.955 67.9448 456.863 59.4318 500.914 92.9818V92.9818C544.965 126.532 553.478 189.440 519.928 233.491L250.545 587.191C216.995 631.243 154.087 639.756 110.036 606.206V606.206C65.9845 572.656 57.4716 509.747 91.0216 465.696L360.405 111.996Z"
                fill="url(#paint0_linear_13715_136336)"
                fillOpacity="0.08"
              />
              <path
                d="M519.530 233.188L250.147 586.888C216.765 630.720 154.170 639.190 110.339 605.808C66.5071 572.425 58.0367 509.831 91.4194 465.999L360.802 112.299C394.185 68.4674 456.780 59.9969 500.611 93.3796C544.443 126.762 552.913 189.357 519.530 233.188Z"
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
                  <stop
                    offset="1"
                    stopColor="hsl(var(--primary))"
                    stopOpacity="0.2"
                  />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="flex flex-col items-center justify-center z-20 -mt-20 mb-8">
            <div className="relative group">
              <div className="absolute -inset-4 bg-white/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <img
                src={agendaLogo}
                alt="Agenda Money"
                className="h-auto w-44 object-contain rounded-2xl shadow-xl hover:scale-105 transition-transform duration-300"
              />
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
                  : `Enter the code sent to ${normalizedMsisdn || "your phone"}`}
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
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRequestOtp();
                    }}
                  >
                    <div>
                      <Label
                        className="label-text font-medium ml-1 mb-1.5 block text-gray-700"
                        htmlFor="msisdn"
                      >
                        Mobile Number
                      </Label>
                      <div className="relative flex items-center w-full h-14 bg-[#F8FAFC] border border-blue-50/50 rounded-full px-6 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500/50 group">
                        <span className="text-gray-600 font-bold text-lg select-none flex items-center pr-4 border-r border-gray-200/60 h-8 ml-1 font-sans tracking-tight">
                          +233
                        </span>
                        <div className="h-8 w-px bg-gray-200/60 mx-2" />{" "}
                        {/* Thin vertical divider */}
                        <Input
                          id="msisdn"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={msisdnInput}
                          onChange={(e) => {
                            setMsisdnInput(
                              sanitizeMsisdnEntryInput(e.target.value),
                            );
                          }}
                          onBlur={() => {
                            setMsisdnInput((prev) =>
                              sanitizeMsisdnEntryInput(prev),
                            );
                          }}
                          placeholder="24 XXX XXXX"
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
                        {isRequesting && (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        )}
                        {isRequesting ? "SENDING CODE..." : "CONTINUE"}
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <InputOTP
                      value={otp}
                      onChange={(v) => {
                        setOtp(v);
                        if (v.length === OTP_LENGTH) handleVerifyOtp(v);
                      }}
                      maxLength={OTP_LENGTH}
                    >
                      <InputOTPGroup>
                        {OTP_SLOTS.map((slot, i) => (
                          <InputOTPSlot
                            key={slot}
                            index={i}
                            className={cn(
                              "h-14 w-10 sm:w-12 bg-transparent border-b-2 rounded-none text-xl focus:ring-0 transition-all font-bold",
                              errorMessage
                                ? "border-red-500 text-red-500"
                                : "border-border/50 focus:border-primary",
                            )}
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => handleVerifyOtp()}
                      disabled={!canVerify || isVerifying}
                      className="btn btn-lg w-full bg-gradient-pink text-white border-0 hover:opacity-90 h-11"
                    >
                      {isVerifying ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {isVerifying ? "Verifying..." : "Verify Code"}
                    </Button>

                    <div className="flex items-center justify-between text-sm">
                      <Button
                        variant="ghost"
                        onClick={handleBack}
                        className="text-muted-foreground hover:text-foreground p-0 h-auto font-normal"
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                      </Button>
                      <button
                        onClick={handleResend}
                        disabled={resendSeconds > 0 || isRequesting}
                        className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                      >
                        {resendSeconds > 0
                          ? `Resend in ${resendSeconds}s`
                          : "Resend code"}
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
  // SUCCESS VIEW
  // ═══════════════════════════════════════
  if (view === "success") {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-200/40 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-100/40 rounded-full blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center max-w-md w-full bg-white p-8 rounded-[2rem] shadow-xl shadow-pink-900/5 border border-pink-50"
        >
          {/* Animated Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.2,
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
            className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 shadow-inner"
          >
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </motion.div>

          <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">
            Application Received
          </h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed px-4">
            Your loan request has been successfully submitted. We are currently
            processing your application.
          </p>

          {/* What Happens Next Timeline using Real-Time status card */}
          <div className="w-full text-left mb-8">
            <LoanStatusCard
              status="awaiting_endorsement"
              amount={Number(loanAmount)}
              className="shadow-md border-pink-100"
            />
          </div>

          <Button
            onClick={() => {
              if (applicant) {
                setApplicant({
                  ...applicant,
                  nodeCode: successNodeCode || applicant.nodeCode,
                  msisdn:
                    applicant.msisdn ||
                    msisdnInput ||
                    (userData as any)?.msisdn,
                  userId: applicant.userId || (userData as any)?.userId,
                });
              }
              setIsSubmittingOnboarding(false);
              setOnboardingStep(0);
              setView("loan-dashboard");
            }}
            className="w-full h-14 rounded-2xl bg-[#EC1B84] text-white hover:bg-[#D01773] text-[15px] font-bold shadow-lg shadow-[#EC1B84]/25 transition-all outline-none border-none ring-0 focus-visible:ring-0"
          >
            Go to Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // LOAN DASHBOARD (returning users)
  // ═══════════════════════════════════════
  if (view === "loan-dashboard") {
    // Determine Logic State
    // Default to 'eligible' if no loan status
    const loanStatus = (applicant as any)?.loanStatus || "ELIGIBLE"; // PENDING, ACTIVE, OVERDUE, ELIGIBLE
    const isUnderReview =
      loanStatus === "PENDING_VERIFICATION" ||
      loanStatus === "PENDING" ||
      loanStatus === "AWAITING_ENDORSEMENT";
    const isActive = loanStatus === "ACTIVE";
    const isOverdue = loanStatus === "OVERDUE";
    // For manual testing/dev, you can force a state here:
    // const isUnderReview = true;

    return (
      <div
        className={cn(
          "min-h-screen pb-24 transition-colors duration-500 bg-[#FAFAFA] relative overflow-hidden",
          isOverdue && "bg-red-50/50",
        )}
      >
        {/* Mesh Gradient Background */}
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-200/30 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-100/30 rounded-full blur-[100px]" />
        </div>

        {/* Sticky Top Bar - Redesigned */}
        {activeTab !== "application" &&
          activeTab !== "summary" &&
          activeTab !== "rewards" &&
          activeTab !== "network" && (
            <PageHeader
              user={userData || onboardingData}
              onAvatarClick={() => setActiveTab("profile")}
              onNotificationClick={() => setIsNotificationOpen(true)}
              hasNotifications={notifications.length > 0}
            />
          )}

        <main
          className={cn(
            "max-w-md mx-auto relative z-10 min-h-screen",
            activeTab === "application" ||
              activeTab === "summary" ||
              activeTab === "rewards" ||
              activeTab === "network"
              ? "p-0"
              : "px-4 pt-6 pb-32",
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={tabVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "anticipate" }}
              className="space-y-6"
            >
              {/* Profile Tab Badge (Moved from Home) */}
              {activeTab === "profile" && errorMessage && (
                <Alert className="border-destructive/30 bg-destructive/5 rounded-2xl mb-4">
                  <AlertDescription className="text-sm text-destructive">
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              )}

              {/* HOME TAB (ACTION FEED) */}
              {activeTab === "home" && (
                <UserDashboard
                  applicant={userData || applicant}
                  loanStatus={
                    (userData as any)?.loanStatus ||
                    (applicant as any)?.loanStatus ||
                    activeLoanDetails?.status ||
                    (applicant as any)?.activeLoan?.status
                  }
                  tierLimit={tierMax}
                  onAction={(action) => {
                    if (action === "apply") setActiveTab("application");
                    if (action === "repay") setIsRepaymentOpen(true);
                    if (action === "share") setIsShareOpen(true);
                    if (action === "history" || action === "details")
                      setActiveTab("loans");
                  }}
                  notifications={notifications}
                  recentActivity={recentActivity}
                  isLoading={isFetchingActivity}
                  activeLoanDetails={activeLoanDetails}
                />
              )}

              {/* MY LOANS TAB */}
              {activeTab === "loans" && (
                <LoansTab
                  onBack={() => setActiveTab("home")}
                  onRepay={() => setIsRepaymentOpen(true)}
                  loan={activeLoanDetails || (applicant as any)?.activeLoan}
                  repaymentHistory={recentActivity.filter(
                    (a: any) => a.type === "payment",
                  )}
                  isPending={
                    (applicant as any)?.summary?.isPending ||
                    activeLoanDetails?.status === "PENDING" ||
                    activeLoanDetails?.status === "AWAITING_ENDORSEMENT" ||
                    (applicant as any)?.activeLoan?.status === "PENDING" ||
                    (userData as any)?.loanStatus === "PENDING" ||
                    (applicant as any)?.loanStatus === "PENDING"
                  }
                  onAction={(action) => {
                    // Status drawer removed
                  }}
                />
              )}

              {/* PROFILE TAB */}
              {activeTab === "profile" && (
                <ProfileTab
                  onboardingData={onboardingData}
                  userData={userData || applicant}
                  isGraduatedNode={
                    applicant?.isGraduatedNode === true ||
                    applicant?.isGraduatedNode === "true" ||
                    userData?.isGraduatedNode === true ||
                    userData?.isGraduatedNode === "true" ||
                    (applicant as any)?.user?.isGraduatedNode === true
                  }
                  onEndorsements={() => {
                    setActiveTab("endorsements" as any);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onRewards={() => {
                    setActiveTab("rewards");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onNetwork={() => {
                    setActiveTab("network");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onShowTerms={() => setIsTermsOpen(true)}
                  onShowPrivacy={() => setIsPrivacyOpen(true)}
                  onHelp={() => setIsHelpOpen(true)}
                />
              )}

              {/* REWARDS TAB */}
              {activeTab === "rewards" && (
                <UserRewardsTab
                  onBack={() => {
                    setActiveTab("profile");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  userMsisdn={normalizeMsisdn(
                    msisdnInput ||
                      (userData?.msisdn as string) ||
                      (applicant?.msisdn as string),
                  )}
                />
              )}

              {/* NETWORK TAB */}
              {activeTab === "network" && (
                <UserNetworkTab
                  onBack={() => {
                    setActiveTab("profile");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  userMsisdn={normalizeMsisdn(
                    msisdnInput ||
                      (userData?.msisdn as string) ||
                      (applicant?.msisdn as string),
                  )}
                  personalNodeCode={
                    (applicant as any)?.personalNodeCode ||
                    (applicant as any)?.user?.personalNodeCode ||
                    applicant?.nodeCode ||
                    userData?.personalNodeCode
                  }
                />
              )}

              {/* ENDORSEMENTS TAB */}
              {activeTab === "endorsements" && (
                <UserEndorsementsTab
                  onBack={() => {
                    setActiveTab("profile" as any);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              )}

              {/* LOAN APPLICATION PAGE */}
              {activeTab === "application" && (
                <LoanApplicationPage
                  tierMin={tierMin}
                  tierMax={tierMax}
                  onBack={() => setActiveTab("home")}
                  onContinue={(data) => {
                    setLoanApplicationData(data);
                    setActiveTab("summary");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              )}

              {/* LOAN SUMMARY PAGE */}
              {activeTab === "summary" && loanApplicationData && (
                <LoanSummaryPage
                  loanData={loanApplicationData}
                  applicant={userData || onboardingData}
                  onBack={() => setActiveTab("application")}
                  onHome={() => setActiveTab("home")}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Fixed Bottom Navigation */}
        {activeTab !== "application" &&
          activeTab !== "summary" &&
          activeTab !== "rewards" &&
          activeTab !== "network" &&
          !isTermsOpen && (
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/50 pb-safe-bottom z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="max-w-md mx-auto flex items-center justify-around h-20 px-2">
                <button
                  onClick={() => setActiveTab("home")}
                  className="flex flex-col items-center justify-center w-16 gap-1 group"
                >
                  <div
                    className={cn(
                      "p-1.5 rounded-xl transition-all",
                      activeTab === "home"
                        ? "bg-primary/10 text-primary"
                        : "text-gray-400 group-hover:text-gray-600",
                    )}
                  >
                    <Home
                      className={cn(
                        "h-6 w-6 transition-transform",
                        activeTab === "home" && "scale-110",
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium transition-colors",
                      activeTab === "home" ? "text-primary" : "text-gray-400",
                    )}
                  >
                    Home
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("loans")}
                  className="flex flex-col items-center justify-center w-16 gap-1 group"
                >
                  <div
                    className={cn(
                      "p-1.5 rounded-xl transition-all",
                      activeTab === "loans"
                        ? "bg-primary/10 text-primary"
                        : "text-gray-400 group-hover:text-gray-600",
                    )}
                  >
                    <Wallet
                      className={cn(
                        "h-6 w-6 transition-transform",
                        activeTab === "loans" && "scale-110",
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium transition-colors",
                      activeTab === "loans" ? "text-primary" : "text-gray-400",
                    )}
                  >
                    Loans
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("profile")}
                  className="flex flex-col items-center justify-center w-16 gap-1 group relative"
                >
                  <div
                    className={cn(
                      "p-1.5 rounded-xl transition-all",
                      activeTab === "profile"
                        ? "bg-primary/10 text-primary"
                        : "text-gray-400 group-hover:text-gray-600",
                    )}
                  >
                    <User
                      className={cn(
                        "h-6 w-6 transition-transform",
                        activeTab === "profile" && "scale-110",
                      )}
                    />
                    {errorMessage && (
                      <div className="absolute top-1 right-3 h-2 w-2 rounded-full bg-red-500 border border-white" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium transition-colors",
                      activeTab === "profile"
                        ? "text-primary"
                        : "text-gray-400",
                    )}
                  >
                    Profile
                  </span>
                </button>
              </div>
            </div>
          )}

        {/* Share & Earn Drawer */}
        <AnimatePresence>
          {isShareOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsShareOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-6 z-[70] pb-10"
              >
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Share & Earn
                  </h3>
                  <p className="text-muted-foreground">
                    Invite friends and get commissions.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 mb-6 text-center border border-gray-100">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                    Your Node Code
                  </p>
                  <p className="text-3xl font-mono font-bold text-gray-900 tracking-widest">
                    {(applicant as any)?.personalNodeCode ||
                      applicant?.nodeCode ||
                      "---"}
                  </p>
                </div>

                {/* My Network Section */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
                    My Network
                  </h4>
                  {isFetchingNetwork ? (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-1 h-20 bg-gray-100 rounded-xl animate-pulse" />
                        <div className="flex-1 h-20 bg-gray-100 rounded-xl animate-pulse" />
                      </div>
                      <div className="h-16 bg-gray-100 rounded-xl animate-pulse w-full" />
                    </div>
                  ) : networkFetchError ? (
                    <div className="bg-red-50 p-4 rounded-xl text-center border border-red-100">
                      <p className="text-sm text-red-600 font-medium">
                        {networkFetchError}
                      </p>
                    </div>
                  ) : networkData ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Shared With */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                          <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                            Shared With
                          </p>
                          <span className="text-2xl font-black text-blue-900">
                            {networkData.totalShared || 0}
                          </span>
                        </div>
                        {/* Active */}
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wide mb-1">
                            Active
                          </p>
                          <div className="flex items-baseline gap-1 text-emerald-900">
                            <span className="text-2xl font-black">
                              {networkData.activeReferrals}
                            </span>
                            <span className="text-sm font-medium opacity-60">
                              / 3
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Performance */}
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-600 uppercase tracking-wider">
                          Network Performance
                        </span>
                        <div
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold border",
                            networkData.performance === "Good" &&
                              "bg-emerald-100 text-emerald-700 border-emerald-200",
                            networkData.performance === "Medium" &&
                              "bg-yellow-100 text-yellow-700 border-yellow-200",
                            networkData.performance === "Bad" &&
                              "bg-red-100 text-red-700 border-red-200",
                            // Fallback just in case
                            !["Good", "Medium", "Bad"].includes(
                              networkData.performance,
                            ) && "bg-gray-100 text-gray-700 border-gray-200",
                          )}
                        >
                          {networkData.performance}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
                      <p className="text-sm text-gray-500 font-medium">
                        No network data yet.
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => {
                    const code =
                      (applicant as any)?.personalNodeCode ||
                      applicant?.nodeCode ||
                      "";
                    const text = `Hey! Use my referral code ${code} to get a fast loan. Apply here: https://apply.agendamoney.com`;

                    if (navigator.share) {
                      navigator
                        .share({
                          title: "Agenda Money",
                          text: text,
                          url: "https://apply.agendamoney.com",
                        })
                        .catch(console.error);
                    } else {
                      // Fallback to Clipboard
                      navigator.clipboard.writeText(code);
                      // Optional: Open WhatsApp
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(text)}`,
                        "_blank",
                      );
                    }
                    setIsShareOpen(false);
                  }}
                  className="w-full h-14 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-lg font-bold shadow-lg flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" /> Share Code
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      (applicant as any)?.personalNodeCode ||
                        applicant?.nodeCode ||
                        "",
                    );
                    setIsShareOpen(false);
                  }}
                  className="w-full mt-3 text-gray-500"
                >
                  Copy into Clipboard
                </Button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Application Status Modal Removed */}

        {/* Terms & Conditions Overlay */}
        <AnimatePresence>
          {isTermsOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-0"
              onClick={() => setIsTermsOpen(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white w-full max-w-md rounded-[32px] p-6 pb-8 space-y-6 relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">
                    Agenda Money T&Cs
                  </h3>
                  <button
                    onClick={() => setIsTermsOpen(false)}
                    className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  {TERMS_LIST.map((term, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100"
                    >
                      <div className="mt-0.5 min-w-[20px] h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {i + 1}
                      </div>
                      <p className="text-sm font-medium text-gray-700 leading-relaxed">
                        {term}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Footer / Visual Element - Removed per request */}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Application Status Drawer Removed */}

        {/* Privacy Policy Overlay */}
        <AnimatePresence>
          {isPrivacyOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-0"
              onClick={() => setIsPrivacyOpen(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white w-full max-w-md rounded-[32px] p-6 pb-8 space-y-6 relative overflow-hidden flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Privacy Policy
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      How we protect your data
                    </p>
                  </div>
                  <button
                    onClick={() => setIsPrivacyOpen(false)}
                    className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-6 overflow-y-auto pr-2 pb-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-2">
                      1. Data Collection
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      We collect your personal information (name, address, ID)
                      during the onboarding process strictly for identity
                      verification and loan assessment purposes.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-2">
                      2. Data Security
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Your data is encrypted in transit and at rest. We do not
                      share your personal information with third parties for
                      marketing purposes.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-2">
                      3. Data Retention
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      We retain your data as required by financial regulations.
                      You can request account deletion at any time by contacting
                      support.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help / Support Drawer */}
        <AnimatePresence>
          {isHelpOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsHelpOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-6 z-[70] pb-10"
              >
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <HelpCircle className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Need Help?
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Our support team is always here for you.
                  </p>
                </div>

                <div className="space-y-3">
                  <a
                    href={`sms:${import.meta.env.VITE_ADMIN_PHONE || "+233558587833"}`}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors w-full text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Smartphone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        Send an SMS
                      </h4>
                      <p className="text-xs text-gray-500">
                        Get quick replies via text
                      </p>
                    </div>
                  </a>

                  <a
                    href="mailto:support@agendamoney.com"
                    className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors w-full text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="font-bold text-blue-600 text-lg">@</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        Email Support
                      </h4>
                      <p className="text-xs text-gray-500">
                        support@agendamoney.com
                      </p>
                    </div>
                  </a>
                </div>

                <Button
                  onClick={() => setIsHelpOpen(false)}
                  variant="ghost"
                  className="w-full text-gray-500 mt-6"
                >
                  Cancel
                </Button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Notification Drawer */}
        <AnimatePresence>
          {isNotificationOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsNotificationOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-6 z-[70] pb-10 max-h-[80vh] overflow-y-auto"
              >
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    Notifications
                  </h3>
                  {notifications.length > 0 && (
                    <span className="bg-[#EC1B84]/10 text-[#EC1B84] text-xs font-bold px-2 py-1 rounded-full">
                      {notifications.length} New
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {notifications.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No new notifications</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 items-start"
                      >
                        <div
                          className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                            notif.type === "success"
                              ? "bg-green-100"
                              : "bg-blue-100",
                          )}
                        >
                          {notif.type === "success" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Bell className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">
                            {notif.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-2">
                            {notif.time}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        {/* RepaymentPage Overlay */}
        <AnimatePresence>
          {isRepaymentOpen && (
            <RepaymentPage
              amountDue={activeLoanDetails?.outstandingBalance || 0}
              dueDate={activeLoanDetails?.dueDate || "Unknown"}
              msisdn={
                userData?.msisdn
                  ? String(userData.msisdn)
                  : applicant?.msisdn
                    ? String(applicant.msisdn)
                    : ""
              }
              userName={
                getApplicantName(applicant, "") ||
                getApplicantName(userData, "Account Holder")
              }
              onBack={() => setIsRepaymentOpen(false)}
              onRepay={(amount) => {
                // Refresh Dashboard data after success
                if (userData?.msisdn) {
                  // Force refresh by reloading the page so dashboard APIs run again
                  window.location.reload();
                }
                setIsRepaymentOpen(false);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // ONBOARDING (new users)
  // ═══════════════════════════════════════

  if (decisionError) {
    return (
      <EligibilityBlockScreen
        decision={decisionError}
        onHome={() => {
          setDecisionError(null);
          setOnboardingStep(0);
          setView("loan-dashboard");
        }}
        onBack={() => setDecisionError(null)}
        loanData={{
          amount: loanAmount,
          tenure: loanTenure,
          purpose: loanPurpose,
        }}
      />
    );
  }

  // Step 4: Loan Application (Full Screen)
  if (onboardingStep === 4) {
    return (
      <LoanApplicationPage
        tierMin={tierMin}
        tierMax={tierMax}
        onBack={() => setOnboardingStep(3)}
        showNodeCode={true}
        initialNodeCode={nodeCode}
        initialAmount={loanAmount}
        initialTenure={loanTenure}
        initialPurpose={loanPurpose}
        onContinue={(data) => {
          setLoanAmount(data.amount);
          setLoanTenure(data.tenure);
          setLoanPurpose(data.purpose);
          if (data.nodeCode) setNodeCode(data.nodeCode);
          setOnboardingStep(5);
        }}
        errorMessage={errorMessage}
        onErrorDismiss={() => setErrorMessage(null)}
      />
    );
  }

  // Step 5: Loan Summary (Full Screen)
  if (onboardingStep === 5) {
    return (
      <LoanSummaryPage
        loanData={{
          amount: loanAmount,
          tenure: loanTenure,
          purpose: loanPurpose,
        }}
        applicant={{
          ...(userData || {}),
          firstName: onboardingData.firstName || (userData as any)?.firstName,
          lastName:
            onboardingData.surname ||
            (userData as any)?.lastName ||
            (userData as any)?.surname,
          msisdn: normalizeMsisdn(msisdnInput || (userData as any)?.msisdn),
        }}
        onBack={() => setOnboardingStep(4)}
        onHome={() => {
          setIsSubmittingOnboarding(false);
          setOnboardingStep(0);
          setView("loan-dashboard");
        }}
        onSubmit={handleOnboardingSubmit}
      />
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background pb-24">
        <PageHeader
          subtitle={
            onboardingData.hasAcceptedTerms
              ? `Step ${onboardingStep} of 5`
              : undefined
          }
          onLogoClick={handleBack}
        />

        <main className="max-w-md mx-auto px-4 py-5 space-y-5">
          {/* Circle Step Indicator */}
          {onboardingData.hasAcceptedTerms && (
            <div className="relative flex justify-between items-start px-2 mb-8">
              {/* Connecting Line */}
              <div className="absolute top-3.5 left-6 right-6 h-[1px] bg-gray-100 -z-10" />

              {STEPS.map((s) => {
                const isActive = onboardingStep === s.number;
                const isCompleted = onboardingStep > s.number;

                return (
                  <div
                    key={s.number}
                    className="flex flex-col items-center gap-2 bg-background z-10"
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center border text-xs font-semibold transition-all",
                        isActive
                          ? "border-gray-900 text-gray-900 bg-white"
                          : isCompleted
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-200 text-gray-300 bg-white",
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        s.number
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        isActive ? "text-gray-900" : "text-gray-400",
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {errorMessage && (
            <Alert className="border-destructive/30 bg-destructive/5">
              <AlertDescription className="text-sm text-destructive">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          <AnimatePresence mode="wait" custom={onboardingDirection}>
            <motion.div
              key={onboardingData.hasAcceptedTerms ? onboardingStep : 0}
              custom={onboardingDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Step 0: Terms and Conditions */}
              {!onboardingData.hasAcceptedTerms && (
                <div className="space-y-6">
                  <div className="text-center space-y-2 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Terms & Conditions
                    </h2>
                    <p className="text-sm text-gray-500">
                      Please review before continuing
                    </p>
                  </div>

                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                    {TERMS_LIST.map((term, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100"
                      >
                        <div className="mt-0.5 min-w-[20px] h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          {i + 1}
                        </div>
                        <p className="text-sm font-medium text-gray-700 leading-relaxed">
                          {term}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => {
                      handleOnboardingChange("hasAcceptedTerms", "true");
                      // We actually set boolean in state, the generic handler converts string back if needed, but let's just set the object directly to be safe
                      setOnboardingData((p) => ({
                        ...p,
                        hasAcceptedTerms: true,
                      }));
                    }}
                    className="w-full h-14 rounded-full font-bold bg-[#EC1B84] text-white hover:bg-[#D41574] shadow-lg shadow-pink-200 mt-6"
                  >
                    Accept & Continue
                  </Button>
                </div>
              )}

              {/* Step 1: Personal Info */}
              {onboardingData.hasAcceptedTerms && onboardingStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Personal Information
                  </h2>

                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-500">
                        First Name
                      </Label>
                      <Input
                        value={onboardingData.firstName}
                        onChange={(e) =>
                          handleOnboardingChange("firstName", e.target.value)
                        }
                        className="h-12 rounded-lg border-gray-300 focus:border-gray-900 focus:ring-0 transition-all font-medium text-gray-900 placeholder:text-gray-300"
                      />
                      <p className="text-[10px] text-gray-400 font-medium">
                        As shown on ID Card
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-500">
                        Surname
                      </Label>
                      <Input
                        value={onboardingData.surname}
                        onChange={(e) =>
                          handleOnboardingChange("surname", e.target.value)
                        }
                        className="h-12 rounded-lg border-gray-300 focus:border-gray-900 focus:ring-0 transition-all font-medium text-gray-900 placeholder:text-gray-300"
                      />
                      <p className="text-[10px] text-gray-400 font-medium">
                        As shown on ID Card
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-500">
                        Date of Birth
                      </Label>
                      <div className="relative w-full">
                        <DatePicker
                          selected={
                            onboardingData.dob
                              ? new Date(onboardingData.dob)
                              : null
                          }
                          onChange={(date) => {
                            if (date) {
                              const iso = format(date, "yyyy-MM-dd");
                              handleOnboardingChange("dob", iso);
                              setDobInput(format(date, "dd / MM / yyyy"));
                              setDobError(null);
                            } else {
                              handleOnboardingChange("dob", "");
                              setDobInput("");
                            }
                          }}
                          onChangeRaw={(e) => e.preventDefault()}
                          dateFormat="dd / MM / yyyy"
                          placeholderText="DD / MM / YYYY"
                          showYearDropdown
                          showMonthDropdown
                          scrollableYearDropdown
                          yearDropdownItemNumber={100}
                          maxDate={new Date()}
                          className={cn(
                            "h-12 w-full rounded-lg border-gray-300 bg-transparent px-3 py-2 text-sm font-medium shadow-sm transition-all focus:border-gray-900 focus:ring-0 placeholder:text-gray-300 font-mono w-full block",
                            dobError && "border-red-500 focus:border-red-500",
                          )}
                          wrapperClassName="w-full"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <CalendarIcon className="h-4 w-4" />
                        </div>
                      </div>
                      {dobError && (
                        <p className="text-[10px] text-red-500 font-medium animate-in slide-in-from-left-1">
                          {dobError}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-500">
                          Gender
                        </Label>
                        <Select
                          value={onboardingData.gender}
                          onValueChange={(v) =>
                            handleOnboardingChange("gender", v)
                          }
                        >
                          <SelectTrigger className="h-12 rounded-lg border-gray-300 focus:border-gray-900 focus:ring-0 transition-all font-medium text-gray-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GENDERS.map((g) => (
                              <SelectItem key={g} value={g}>
                                {g}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-500">
                          Region
                        </Label>
                        <Select
                          value={onboardingData.region}
                          onValueChange={(v) =>
                            handleOnboardingChange("region", v)
                          }
                        >
                          <SelectTrigger className="h-12 rounded-lg border-gray-300 focus:border-gray-900 focus:ring-0 transition-all font-medium text-gray-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            side="bottom"
                            sideOffset={4}
                            className="max-h-60 overflow-y-auto"
                          >
                            {GHANA_REGIONS.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-500">
                        Address
                      </Label>
                      <Input
                        value={onboardingData.address}
                        onChange={(e) =>
                          handleOnboardingChange("address", e.target.value)
                        }
                        placeholder="House No., Street Name, Area"
                        className="h-12 rounded-lg border-gray-300 focus:border-gray-900 focus:ring-0 transition-all font-medium text-gray-900 placeholder:text-gray-300"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-500">
                        Alternate Phone Number{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative flex items-center w-full h-12 bg-[#F8FAFC] border border-gray-300 rounded-lg px-4">
                        <span className="text-gray-600 font-bold text-sm pr-3 border-r border-gray-200">
                          +233
                        </span>
                        <Input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={(onboardingData as any).alternatePhone || ""}
                          onChange={(e) =>
                            handleOnboardingChange(
                              "alternatePhone" as any,
                              sanitizeMsisdnEntryInput(e.target.value),
                            )
                          }
                          placeholder="24 XXX XXXX"
                          className="flex-1 bg-transparent border-0 h-full font-mono font-medium text-gray-800 focus:ring-0 focus:outline-none placeholder:text-gray-400 ml-2"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium">
                        Emergency contact number
                      </p>
                    </div>

                    <Button
                      onClick={handleOnboardingNext}
                      disabled={
                        !onboardingData.firstName ||
                        !onboardingData.surname ||
                        !onboardingData.dob ||
                        !onboardingData.gender ||
                        !onboardingData.region ||
                        !onboardingData.address ||
                        !onboardingData.alternatePhone ||
                        !isValidGhanaLocalPhone(onboardingData.alternatePhone) ||
                        onboardingData.address?.trim().split(/\s+/).length < 3
                      }
                      className={cn(
                        "w-full h-12 rounded-full font-bold mt-4 transition-all",
                        onboardingData.firstName &&
                          onboardingData.surname &&
                          onboardingData.dob &&
                          onboardingData.gender &&
                          onboardingData.region &&
                          onboardingData.address &&
                          onboardingData.alternatePhone &&
                          isValidGhanaLocalPhone(onboardingData.alternatePhone) &&
                          onboardingData.address?.trim().split(/\s+/).length >=
                            3
                          ? "bg-[#EC1B84] text-white hover:bg-[#D41574] shadow-lg shadow-pink-200"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed",
                      )}
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Work & Income */}
              {onboardingStep === 2 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                  {/* Section 1: Living Situation */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-full bg-pink-50 flex items-center justify-center text-pink-600">
                        <Home className="h-4 w-4" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Accommodation
                      </h3>
                      {onboardingData.accommodationType &&
                        onboardingData.yearsAtAddress && (
                          <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto animate-in zoom-in spin-in-90 duration-300" />
                        )}
                    </div>

                    {/* Accommodation - CHIPS */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-500 ml-1">
                        Accommodation Type
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { val: "Owned", icon: Home, label: "Owned" },
                          { val: "Rented", icon: Wallet, label: "Rented" },
                          { val: "Family", icon: Users, label: "Family" },
                          { val: "Other", icon: Shield, label: "Other" },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            onClick={() =>
                              handleOnboardingChange(
                                "accommodationType",
                                opt.val,
                              )
                            }
                            className={cn(
                              "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all duration-200",
                              onboardingData.accommodationType === opt.val
                                ? "border-[#EC1B84] bg-[#EC1B84]/10 text-[#EC1B84] shadow-sm scale-[1.02]"
                                : "border-gray-100 bg-white text-gray-500 hover:border-pink-200 hover:bg-pink-50/10",
                            )}
                          >
                            <opt.icon
                              className={cn(
                                "h-5 w-5",
                                onboardingData.accommodationType === opt.val
                                  ? "text-[#EC1B84]"
                                  : "text-gray-400",
                              )}
                            />
                            <span className="text-xs font-bold">
                              {opt.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Years at Address - PROGRESSIVE DISCLOSURE & STEPPER */}
                    <AnimatePresence>
                      {onboardingData.accommodationType && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -10 }}
                          animate={{ opacity: 1, height: "auto", y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -10 }}
                          className="space-y-3 pt-2"
                        >
                          <Label className="text-sm font-medium text-gray-500 ml-1">
                            Years at Current Address
                          </Label>
                          <div className="flex items-center justify-between bg-[#F8FAFC] p-2 rounded-full border border-gray-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 shrink-0 rounded-full hover:bg-white hover:shadow-sm text-gray-500"
                              aria-label="Decrease years at address"
                              onClick={() => {
                                const current = parseInt(
                                  onboardingData.yearsAtAddress || "0",
                                );
                                if (current > 0)
                                  handleOnboardingChange(
                                    "yearsAtAddress",
                                    String(current - 1),
                                  );
                              }}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>

                            <div className="flex items-center flex-1 justify-center max-w-[100px]">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                className="w-12 h-10 bg-transparent text-xl font-bold text-gray-900 text-center focus:outline-none border-b-2 border-transparent focus:border-pink-500 transition-colors"
                                value={onboardingData.yearsAtAddress || "0"}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (isNaN(val))
                                    handleOnboardingChange(
                                      "yearsAtAddress",
                                      "0",
                                    );
                                  else if (val >= 0 && val <= 10)
                                    handleOnboardingChange(
                                      "yearsAtAddress",
                                      String(val),
                                    );
                                  else if (val > 10)
                                    handleOnboardingChange(
                                      "yearsAtAddress",
                                      "10",
                                    );
                                }}
                              />
                              <span className="text-xs text-gray-400 font-medium ml-1">
                                yrs
                              </span>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 shrink-0 rounded-full hover:bg-white hover:shadow-sm text-gray-900 bg-white shadow-sm"
                              aria-label="Increase years at address"
                              onClick={() => {
                                const current = parseInt(
                                  onboardingData.yearsAtAddress || "0",
                                );
                                if (current < 10)
                                  handleOnboardingChange(
                                    "yearsAtAddress",
                                    String(current + 1),
                                  );
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="h-px bg-gray-100 w-full my-6" />

                  {/* Section 2: Work & Finances */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-full bg-pink-50 flex items-center justify-center text-pink-600">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Work & Finances
                      </h3>
                      {onboardingData.employmentStatus &&
                        onboardingData.monthlyIncome &&
                        onboardingData.educationLevel && (
                          <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto animate-in zoom-in spin-in-90 duration-300" />
                        )}
                    </div>

                    {/* Employment - PILLS */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-500 ml-1">
                        Employment Status
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {EMPLOYMENT_OPTIONS.map((status) => (
                          <button
                            key={status}
                            onClick={() =>
                              handleOnboardingChange("employmentStatus", status)
                            }
                            className={cn(
                              "px-4 py-2.5 rounded-full text-sm font-bold border transition-all duration-200",
                              onboardingData.employmentStatus === status
                                ? "border-[#EC1B84] bg-[#EC1B84]/10 text-[#EC1B84] shadow-sm scale-[1.02]"
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                            )}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Education - PILLS */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-500 ml-1">
                        Highest Education
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {EDUCATION_LEVELS.map((level) => (
                          <button
                            key={level}
                            onClick={() =>
                              handleOnboardingChange("educationLevel", level)
                            }
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200",
                              onboardingData.educationLevel === level
                                ? "bg-pink-50 text-pink-700 border-pink-200 shadow-sm"
                                : "bg-white text-gray-500 border-gray-100 hover:bg-gray-50",
                            )}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Monthly Income - SLIDER */}
                    <div className="space-y-4 pt-2">
                      <div className="flex justify-between items-end">
                        <Label className="text-sm font-medium text-gray-500 ml-1">
                          Monthly Income Range
                        </Label>
                        <span className="text-sm font-bold text-pink-600 bg-pink-50 px-3 py-1 rounded-lg">
                          {onboardingData.monthlyIncome || "Slide to select"}
                        </span>
                      </div>

                      <div className="px-2 pb-6 pt-2">
                        <Slider
                          value={[
                            Math.max(
                              0,
                              INCOME_BRACKETS.indexOf(
                                onboardingData.monthlyIncome || "",
                              ),
                            ),
                          ]}
                          onValueChange={(vals) =>
                            handleOnboardingChange(
                              "monthlyIncome",
                              INCOME_BRACKETS[vals[0]],
                            )
                          }
                          max={3}
                          min={0}
                          step={1}
                          className="[&_[role=slider]]:bg-[#EC1B84] [&_[role=slider]]:border-[#EC1B84] [&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-pink-200"
                        />
                        <div className="flex justify-between mt-3 text-sm text-gray-600 font-bold">
                          <span>&lt;1k</span>
                          <span>1-2k</span>
                          <span>2-5k</span>
                          <span>5k+</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Identity Verification */}
              {onboardingStep === 3 && (
                <div className="space-y-6">
                  {/* ─── Screen 1: Intro / Consent ─── */}
                  {identityStep === "intro" && (
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 -ml-2 mb-2 rounded-full"
                          onClick={handleOnboardingBack}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Identity Verification
                        </h2>
                      </div>

                      <div className="space-y-4">
                        <p className="text-gray-600 font-medium leading-relaxed">
                          To keep your account safe and meet regulations, we
                          need to verify your identity.
                        </p>

                        <div className="space-y-3">
                          <p className="text-sm font-bold text-gray-700">
                            We'll ask for your:
                          </p>
                          <ul className="space-y-3">
                            <li className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                              Your Ghana Card Number
                            </li>
                            <li className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                              Front & Back Photo Of Your Ghana Card
                            </li>
                            <li className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                              A Quick Selfie
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center h-5">
                            <input
                              id="consent-checkbox"
                              type="checkbox"
                              checked={identityConsent}
                              onChange={(e) =>
                                setIdentityConsent(e.target.checked)
                              }
                              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </div>
                          <label
                            htmlFor="consent-checkbox"
                            className="text-sm font-medium text-gray-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            I agree to share my information for verification
                          </label>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-400 text-center">
                        Your information is encrypted and securely stored.
                      </div>

                      <Button
                        onClick={handleOnboardingNext}
                        disabled={!identityConsent}
                        className={cn(
                          "w-full h-12 rounded-full font-bold hover:bg-gray-300 disabled:opacity-50 transition-all",
                          identityConsent
                            ? "bg-primary text-white"
                            : "bg-gray-200 text-gray-500",
                        )}
                      >
                        Continue
                      </Button>
                    </div>
                  )}

                  {/* ─── Screen 2: Uploads ─── */}
                  {identityStep === "upload" && (
                    <div className="space-y-6">
                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 -ml-2 mb-2 rounded-full"
                          onClick={handleOnboardingBack}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Verify Your Identity
                        </h2>
                      </div>

                      <div className="space-y-6">
                        {/* Ghana Card Input */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-gray-600">
                            Ghana Card Number
                          </Label>
                          <Input
                            value={onboardingData.ghanaCardNumber || "GHA-"}
                            onChange={(e) =>
                              handleGhanaCardChange(e.target.value)
                            }
                            placeholder="GHA-XXXXXXXXX-X"
                            maxLength={16}
                            className="h-12 rounded-lg border-gray-300 focus:border-gray-900 font-medium placeholder:text-gray-300"
                          />
                          <p className="text-xs text-muted-foreground ml-1">
                            Format is automatically applied
                          </p>
                        </div>

                        {/* Picture of ID Card */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white transition-all">
                          <button
                            onClick={() =>
                              setExpandedUpload(
                                expandedUpload === "id" ? null : "id",
                              )
                            }
                            className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 shrink-0 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500">
                                <CreditCard className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                <h3 className="text-sm font-bold text-gray-900">
                                  Picture of ID Card
                                </h3>
                                <p className="text-xs text-gray-500 font-medium">
                                  Please provide a clear photo of the{" "}
                                  <span className="text-gray-700 font-bold">
                                    Front
                                  </span>{" "}
                                  and{" "}
                                  <span className="text-gray-700 font-bold">
                                    Back
                                  </span>{" "}
                                  of your ID card.
                                </p>
                              </div>
                            </div>
                            <ChevronRight
                              className={cn(
                                "w-5 h-5 text-gray-400 transition-transform",
                                expandedUpload === "id" ? "rotate-90" : "",
                              )}
                            />
                          </button>

                          <AnimatePresence>
                            {expandedUpload === "id" && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-gray-50/50"
                              >
                                <div className="p-4 space-y-3 pt-0 border-t border-gray-100">
                                  <div className="mt-4" /> {/* Spacer */}
                                  {renderUploadBox(
                                    "Front Side",
                                    onboardingData.ghanaCardFrontUrl,
                                    !!uploadProgress.ghanaCardFrontUrl,
                                    frontCardRef,
                                    "environment",
                                    (f) => handleUpload(f, "ghanaCardFrontUrl"),
                                    frontCardFileRef,
                                  )}
                                  {renderUploadBox(
                                    "Back Side",
                                    onboardingData.ghanaCardBackUrl,
                                    !!uploadProgress.ghanaCardBackUrl,
                                    backCardRef,
                                    "environment",
                                    (f) => handleUpload(f, "ghanaCardBackUrl"),
                                    backCardFileRef,
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Selfie Card */}

                        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white transition-all">
                          <button
                            onClick={() =>
                              setExpandedUpload(
                                expandedUpload === "selfie" ? null : "selfie",
                              )
                            }
                            className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 shrink-0 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500">
                                <User className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                <h3 className="text-sm font-bold text-gray-900">
                                  Live Selfie
                                </h3>
                                <p className="text-xs text-gray-500 font-medium">
                                  Complete a quick liveness check to verify your
                                  identity
                                </p>
                              </div>
                            </div>
                            <ChevronRight
                              className={cn(
                                "w-5 h-5 text-gray-400 transition-transform",
                                expandedUpload === "selfie" ? "rotate-90" : "",
                              )}
                            />
                          </button>

                          <AnimatePresence>
                            {expandedUpload === "selfie" && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-gray-50/50"
                              >
                                <div className="p-4 pt-0 border-t border-gray-100">
                                  <div className="mt-4" />
                                  {onboardingData.selfieUrl ? (
                                    // Show success state if liveness already completed
                                    <div className="flex items-center gap-2 justify-center p-4 bg-green-50 rounded-xl border border-green-100">
                                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                                      <span className="text-sm font-medium text-green-700">
                                        Liveness verified
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="ml-2 text-xs text-red-500 h-6 px-2"
                                        onClick={() => {
                                          setOnboardingData((prev) => ({
                                            ...prev,
                                            selfieUrl: "",
                                          }));
                                          setShowLiveness(true);
                                        }}
                                      >
                                        Redo
                                      </Button>
                                    </div>
                                  ) : showLiveness ? (
                                    <LivenessCapture
                                      userId={normalizedMsisdn || "unknown"}
                                      mode="kyc"
                                      onSuccess={async (result) => {
                                        const file = base64ToJpegFile(
                                          result.capturedFrame,
                                          `liveness-${Date.now()}.jpg`,
                                        );

                                        if (!file) {
                                          setErrorMessage(
                                            "Liveness captured but could not prepare image upload. Please try again.",
                                          );
                                          setShowLiveness(false);
                                          return;
                                        }

                                        await handleUpload(file, "selfieUrl");
                                        setShowLiveness(false);
                                      }}
                                      onFailure={(reason) => {
                                        setShowLiveness(false);
                                        setErrorMessage(
                                          reason === "max_attempts_reached"
                                            ? "Liveness check failed. Your application will be reviewed manually."
                                            : "Liveness check failed. Please try again.",
                                        );
                                      }}
                                    />
                                  ) : (
                                    <Button
                                      onClick={() => setShowLiveness(true)}
                                      className="w-full h-12 rounded-full bg-[#EC1B84] text-white font-bold hover:bg-[#D41574]"
                                    >
                                      <Camera className="w-4 h-4 mr-2" /> Start
                                      Liveness Check
                                    </Button>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <Button
                        onClick={handleOnboardingNext}
                        className="w-full h-12 rounded-full font-bold bg-[#EC1B84] text-white hover:bg-[#D41574] shadow-lg shadow-pink-200 mt-6"
                      >
                        Continue
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4 & 5 Removed from here as they are now full-page */}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Fixed Bottom - Only for Step 2. (Step 4 has internal nav via LoanApplicationPage) */}
        {onboardingStep === 2 && (
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 z-50">
            <div className="max-w-md mx-auto flex gap-3">
              <Button
                variant="outline"
                onClick={handleOnboardingBack}
                className="flex-1 h-12 rounded-full shadow-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>

              <Button
                onClick={handleOnboardingNext}
                disabled={
                  onboardingStep === 2 &&
                  !(
                    onboardingData.accommodationType &&
                    onboardingData.yearsAtAddress &&
                    onboardingData.educationLevel &&
                    onboardingData.employmentStatus &&
                    onboardingData.monthlyIncome
                  )
                }
                className={cn(
                  "flex-1 h-12 rounded-full shadow-lg transition-all",
                  onboardingStep === 2
                    ? onboardingData.accommodationType &&
                      onboardingData.yearsAtAddress &&
                      onboardingData.educationLevel &&
                      onboardingData.employmentStatus &&
                      onboardingData.monthlyIncome
                      ? "bg-[#EC1B84] text-white hover:bg-[#D41574]"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {onboardingStep === 2 ? "Continue" : "Next"}{" "}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ApplicationStatusModal Override Removed */}
    </>
  );
}
