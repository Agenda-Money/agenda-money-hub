/* eslint-disable unicorn/prefer-string-replace-all */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Loader2, Camera, CheckCircle2, AlertCircle, User, MapPin, ImageIcon, ArrowRight, ArrowLeft, Upload, CreditCard, TrendingUp, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { uploadToStorage } from "@/lib/storage";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { LoanSummaryPage } from "../LoanSummaryPage";
import { LivenessCapture, type LivenessResult } from "@/components/liveliness/LivenessCapture";


const STORAGE_KEY = "agent_onboarding_form";

const GHANA_REGIONS = [
  "Greater Accra", "Ashanti", "Central", "Eastern", "Northern",
  "Western", "Volta", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Western North", "Savannah", "North East", "Oti"
];

const ACCOMMODATION_TYPES = ["Owned", "Rented", "Family", "Other"];
const EDUCATION_LEVELS = ["Basic", "Secondary", "Tertiary", "Advanced"];
const EMPLOYMENT_STATUS = ["Self Employed", "Full-time Employee", "Part-time Employee", "Contract"];
const INCOME_BRACKETS = ["Below GHS 1000", "GHS 1000-2000", "GHS 2000-5000", "Above GHS 5000"];

const YEARS_AT_ADDRESS = [
  { label: "Less than 1 Year", value: "0" },
  { label: "1 to 3 Years", value: "1" },
  { label: "3 to 5 Years", value: "3" },
  { label: "More than 5 Years", value: "5" }
];

interface FormData {
  firstName: string;
  surname: string;
  msisdn: string;
  alternatePhone: string;
  dob: string;
  gender: string;
  region: string;
  address: string;
  accommodationType: string;
  yearsAtAddress: string;
  educationLevel: string;
  employmentStatus: string;
  monthlyIncome: string;
  ghanaCardNumber: string;
  ghanaCardFrontUrl: string;
  ghanaCardBackUrl: string;
  selfieUrl: string;
  livenessSession: LivenessResult | null;
  loanAmount: string;
  loanTenure: string;
  loanPurpose: string;
}

const INITIAL_FORM_DATA: FormData = {
  firstName: "",
  surname: "",
  msisdn: "",
  alternatePhone: "",
  dob: "",
  gender: "",
  region: "",
  address: "",
  accommodationType: "",
  yearsAtAddress: "",
  educationLevel: "",
  employmentStatus: "",
  monthlyIncome: "",
  ghanaCardNumber: "",
  ghanaCardFrontUrl: "",
  ghanaCardBackUrl: "",
  selfieUrl: "",
  livenessSession: null,
  loanAmount: "100",
  loanTenure: "14",
  loanPurpose: "Business",
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0
  })
};

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function AgentOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});
  const [submissionResult, setSubmissionResult] = useState<
    | {
        customerName: string;
        nodeCode: string | null;
        awaitingConsent: boolean;
        error?: undefined;
      }
    | {
        error: string;
      }
    | null
  >(null);
  const [showLiveness, setShowLiveness] = useState(false);
  const [livenessStatus, setLivenessStatus] = useState<{
    tone: "success" | "error";
    message: string;
    sessionId?: string;
  } | null>(null);

  // Scroll to top when moving between steps
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  useEffect(() => {
    if (!showLiveness) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showLiveness]);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const frontUploadRef = useRef<HTMLInputElement>(null);
  const backUploadRef = useRef<HTMLInputElement>(null);
  const selfieIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedData = JSON.parse(saved);
        // Merge with INITIAL_FORM_DATA to ensure new fields have default values
        const mergedData = {
          ...INITIAL_FORM_DATA,
          ...parsedData,
          ghanaCardNumber: parsedData.ghanaCardNumber || "GHA-",
        };
        setFormData(mergedData);
      } else {
        // Set default Ghana Card format on first load
        setFormData(prev => ({ ...prev, ghanaCardNumber: "GHA-" }));
      }
      
      // Reset consent and onboarding state when initializing
      setSubmissionResult(null);
    } catch (error) {
      console.error("Failed to load form data from localStorage:", error);
      setFormData(prev => ({ ...prev, ghanaCardNumber: "GHA-" }));
    }
  }, []);

  const updateField = (field: keyof FormData, value: string) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    } catch (error) {
      console.error("Failed to save form data to localStorage:", error);
    }
  };

  // Format Ghana Card Number: GHA-XXXXXXXXX-X
  const formatGhanaCardNumber = (value: string) => {
    // Remove all non-digit characters except existing format
    const digitsOnly = value.replace(/\D/g, "");
    
    // Build the formatted value
    if (digitsOnly.length === 0) {
      return "GHA-";
    } else if (digitsOnly.length <= 9) {
      return `GHA-${digitsOnly}`;
    } else {
      return `GHA-${digitsOnly.slice(0, 9)}-${digitsOnly.slice(9, 10)}`;
    }
  };

  const handleGhanaCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Don't allow deletion of "GHA-"
    if (!input.startsWith("GHA-")) {
      return;
    }
    
    // Use the formatting function
    const formatted = formatGhanaCardNumber(input);
    updateField("ghanaCardNumber", formatted);
  };

  const handleImageUpload = async (file: File, type: "front" | "back" | "selfie") => {
    const fieldMap = {
      front: "ghanaCardFrontUrl",
      back: "ghanaCardBackUrl",
      selfie: "selfieUrl",
    } as const;

    setUploadProgress(prev => ({ ...prev, [type]: true }));

    const timestamp = Date.now();
    const agentCode = user?.agentCode || "unknown";
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `agents/${agentCode}/${type}_${timestamp}.${fileExtension}`;

    const result = await uploadToStorage(file, path);

    setUploadProgress(prev => ({ ...prev, [type]: false }));

    if (result.success && result.key) {
      updateField(fieldMap[type], result.key);
      toast.success("Image uploaded successfully!");
    } else {
      toast.error("Upload failed", {
        description: result.error || "Please try again",
      });
    }
  };

  const base64ToJpegFile = (base64Data: string, fileName: string): File | null => {
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
  };

  function renderDocumentUploadContent(
    isUploading: boolean,
    hasUrl: string,
    label: string,
    onCapture: () => void,
    onUpload: () => void
  ) {
    if (isUploading) {
      return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />;
    }
    if (hasUrl) {
      return (
        <div className="flex flex-col items-center justify-center space-y-3 p-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
          <p className="text-sm text-emerald-700 font-medium mt-2">{label} ✓</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2 border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold flex items-center gap-2 shadow-sm"
            onClick={onUpload}
          >
            <Upload className="h-4 w-4 mr-1 text-emerald-600" />
            Re-upload
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <Camera className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <div className="flex gap-2 justify-center">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onCapture();
            }}
            className="flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            Capture
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onUpload();
            }}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </div>
      </div>
    );
  }

  function renderSelfieUploadContent(
    isUploading: boolean,
    hasUrl: string,
    label: string,
    onCapture: () => void
  ) {
    if (isUploading) {
      return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />;
    }
    if (hasUrl) {
      return (
        <div className="flex flex-col items-center justify-center space-y-3 p-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
          <p className="text-sm text-emerald-700 font-medium mt-2">{label} ✓</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2 border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold flex items-center gap-2 shadow-sm"
            onClick={onCapture}
          >
            <Camera className="h-4 w-4 mr-1 text-emerald-600" />
            Retake Selfie
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <User className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onCapture();
          }}
          className="flex items-center gap-2 mx-auto"
        >
          <Camera className="h-4 w-4" />
          Take Selfie
        </Button>
      </div>
    );
  }

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (selfieIntervalRef.current) {
        clearInterval(selfieIntervalRef.current);
      }
    };
  }, []);

  const validateStep = () => {
    switch (currentStep) {
      case 1: {
        const primaryPhone = parsePhoneNumberFromString(formData.msisdn, "GH");
        const alternatePhone = formData.alternatePhone
          ? parsePhoneNumberFromString(formData.alternatePhone, "GH")
          : null;
        const normalizedPrimary = primaryPhone?.number;
        const normalizedAlternate = alternatePhone?.number;

        return (
          formData.firstName.trim() &&
          formData.surname.trim() &&
          Boolean(parsePhoneNumberFromString(formData.msisdn, "GH")?.isValid()) &&
          Boolean(formData.alternatePhone && parsePhoneNumberFromString(formData.alternatePhone, "GH")?.isValid()) &&
          formData.dob &&
          formData.gender
        );
      }
      case 2:
        return (
          formData.region &&
          formData.address.trim().split(/\s+/).length >= 3 &&
          formData.accommodationType &&
          formData.yearsAtAddress &&
          formData.educationLevel &&
          formData.employmentStatus &&
          formData.monthlyIncome
        );
      
      case 3:
        return (
          formData.ghanaCardNumber.trim() &&
          formData.ghanaCardFrontUrl &&
          formData.ghanaCardBackUrl &&
          formData.selfieUrl
        );
      case 4: {
        const loanAmount = Number.parseInt(formData.loanAmount, 10);
        const loanTenure = Number.parseInt(formData.loanTenure, 10);
        return (
          formData.loanAmount &&
          formData.loanTenure &&
          formData.loanPurpose &&
          loanAmount >= 50 &&
          loanAmount <= 300 &&
          loanTenure >= 1 &&
          loanTenure <= 14
        );
      }
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!validateStep()) {
      toast.error("Please complete all required fields correctly", {
        description: "Check for missing or invalid information.",
      });
      return;
    }
    setDirection(1);
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setDirection(-1);
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Format MSISDN using libphonenumber-js for consistent handling
      const parsed = parsePhoneNumberFromString(formData.msisdn, "GH");
      const formattedMsisdn = parsed ? parsed.number.replace("+", "") : formData.msisdn.replace(/\D/g, "");
      const parsedAlternatePhone = formData.alternatePhone
        ? parsePhoneNumberFromString(formData.alternatePhone, "GH")
        : null;
      const formattedAlternatePhone = parsedAlternatePhone?.isValid()
        ? parsedAlternatePhone.number.replace("+", "")
        : undefined;

      const parsedAlt = formData.alternatePhone ? parsePhoneNumberFromString(formData.alternatePhone, "GH") : null;
      const formattedAltMsisdn = parsedAlt ? parsedAlt.number.replace("+", "") : (formData.alternatePhone ? formData.alternatePhone.replace(/\D/g, "") : undefined);

      // Both firstName and surname are required. fullName is optional and should match the combination.
      const payload = {
        firstName: formData.firstName,
        surname: formData.surname,
        fullName: `${formData.firstName} ${formData.surname}`.trim(), // optional, backend may construct if not provided
        msisdn: formattedMsisdn,
        alternatePhone: formattedAltMsisdn,
        dob: formData.dob,
        gender: formData.gender,
        region: formData.region,
        address: formData.address,
        accommodationType: formData.accommodationType,
        yearsAtAddress: formData.yearsAtAddress,
        educationLevel: formData.educationLevel,
        employmentStatus: formData.employmentStatus,
        monthlyIncome: formData.monthlyIncome,
        ghanaCardNumber: formData.ghanaCardNumber,
        ghanaCardFrontUrl: formData.ghanaCardFrontUrl, // Use public URL
        ghanaCardBackUrl: formData.ghanaCardBackUrl,   // Use public URL
        selfieUrl: formData.selfieUrl,                 // Use public URL
        livenessVerification: formData.livenessSession,
        initialLoanAmount: Number(formData.loanAmount),
        initialLoanTenure: Number(formData.loanTenure),
        initialLoanPurpose: formData.loanPurpose,
      };

      const response = await api.post("/api/agents/onboard", payload);
      const responseBody = response.data?.data || response.data || {};
      const didSucceed = response.status >= 200 && response.status < 300 && responseBody.success !== false;

      if (!didSucceed) {
        throw new Error(responseBody.message || response.data?.message || "Customer onboarding could not be completed.");
      }

      const awaitingConsent = responseBody.status === "AWAITING_CONSENT" || response.data?.status === "AWAITING_CONSENT";
      const nodeCode = responseBody.nodeCode || response.data?.nodeCode || null;
      const customerName = `${payload.fullName} ${payload.surname}`.trim();

      setSubmissionResult({
        customerName,
        nodeCode,
        awaitingConsent,
      });

      localStorage.removeItem(STORAGE_KEY);
      setFormData({ ...INITIAL_FORM_DATA, ghanaCardNumber: "GHA-" });

      if (navigator.vibrate) navigator.vibrate(200);

      toast.success("Customer Onboarded! 🎉", {
        description: awaitingConsent
          ? "Authorization request sent successfully."
          : "Customer successfully registered.",
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Please try again";
      setSubmissionResult({ error: errorMsg });
      toast.error("Submission Failed", {
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: "Bio-Data", icon: User, description: "Personal info" },
    { number: 2, title: "Details", icon: MapPin, description: "Location & work" },
    { number: 3, title: "Documents", icon: ImageIcon, description: "ID & photos" },
    { number: 4, title: "Loan Request", icon: CreditCard, description: "Initial loan" },
  ];

  const livenessOverlay = showLiveness ? (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center overflow-y-auto bg-slate-950/88 p-0 text-left backdrop-blur-md sm:items-center sm:p-4">
      <div className="relative flex min-h-dvh w-full max-w-3xl items-stretch sm:min-h-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            setShowLiveness(false);
            setLivenessStatus({
              tone: "error",
              message: "Liveness was cancelled. Start again when the customer is ready.",
            });
          }}
          className="absolute right-3 top-3 z-20 h-10 w-10 rounded-full border border-white/15 bg-black/40 text-white shadow-lg backdrop-blur-md hover:bg-white/15 hover:text-white"
          aria-label="Close liveness check"
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="w-full">
          <LivenessCapture
            userId={formData.msisdn || "agent-onboarding"}
            mode="agent-onboarding"
            onSuccess={async (result: LivenessResult) => {
              const file = base64ToJpegFile(
                result.capturedFrame,
                `agent-liveness-${Date.now()}.jpg`,
              );

              if (!file) {
                setShowLiveness(false);
                setLivenessStatus({
                  tone: "error",
                  message: "Liveness passed, but the captured image could not be prepared. Please try again.",
                });
                return;
              }

              await handleImageUpload(file, "selfie");
              setFormData((prev) => {
                const nextData = {
                  ...prev,
                  livenessSession: result,
                };
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
                } catch (error) {
                  console.error("Failed to save liveness session to localStorage:", error);
                }
                return nextData;
              });
              setShowLiveness(false);
              setLivenessStatus({
                tone: "success",
                message: "PASS: customer identity was verified and attached to this onboarding session.",
                sessionId: result.sessionId,
              });
            }}
            onFailure={(reason) => {
              setShowLiveness(false);
              if (reason === "max_attempts_reached") {
                setFormData((prev) => {
                  const nextData = {
                    ...prev,
                    livenessSession: null,
                  };
                  try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
                  } catch (error) {
                    console.error("Failed to clear liveness session from localStorage:", error);
                  }
                  return nextData;
                });
              }
              setLivenessStatus({
                tone: "error",
                message:
                  reason === "max_attempts_reached"
                    ? "FAIL: maximum liveness attempts reached. Stop onboarding and escalate this customer to manual review."
                    : "Liveness was not completed. Review the guidance and try again when the customer is ready.",
              });
            }}
          />
        </div>
      </div>
    </div>
  ) : null;

  // Result Screen (Success or Error)
  if (submissionResult) {
    if ('error' in submissionResult) {
      // Error result
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center min-h-[70vh]"
        >
          <Card className="w-full max-w-md border-0 shadow-2xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-red-500 to-rose-600" />
            <CardContent className="pt-10 pb-8 text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" as const, stiffness: 300, delay: 0.2 }}
              >
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="h-10 w-10 text-red-600" />
                </div>
              </motion.div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Onboarding Failed</h1>
                <p className="text-muted-foreground">
                  {submissionResult.error}
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <Button
                  onClick={() => {
                    setSubmissionResult(null);
                    setFormData({ ...INITIAL_FORM_DATA, ghanaCardNumber: "GHA-" });
                    localStorage.removeItem(STORAGE_KEY);
                    setCurrentStep(1);
                  }}
                  className="w-full h-12 bg-gradient-pink hover:opacity-90"
                >
                  Try Again
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/agent/portfolio")}
                  className="w-full h-12"
                >
                  View My Portfolio
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      );
    }
    // Success result (existing UI)
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center min-h-[70vh]"
      >
        <Card className="w-full max-w-md border-0 shadow-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <CardContent className="pt-10 pb-8 text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" as const, stiffness: 300, delay: 0.2 }}
            >
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
            </motion.div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Onboarding Complete!</h1>
              {submissionResult.awaitingConsent ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    A request has been sent to the Node owner for authorization.
                  </p>
                  <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/20 text-amber-700 dark:text-amber-200 text-sm">
                    <strong>Request sent to your Node for authorization.</strong>
                    <p className="mt-1 opacity-80">The customer will receive an SMS once authorized.</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Customer <strong>{submissionResult.customerName}</strong> has been successfully registered.
                </p>
              )}
            </div>
            <div className="space-y-3 pt-2">
              <Button
                onClick={() => {
                  setSubmissionResult(null);
                  setFormData({ ...INITIAL_FORM_DATA, ghanaCardNumber: "GHA-" });
                  localStorage.removeItem(STORAGE_KEY);
                  setCurrentStep(1);
                }}
                className="w-full h-12 bg-gradient-pink hover:opacity-90"
              >
                Onboard Another Customer
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/agent/portfolio")}
                className="w-full h-12"
              >
                View My Portfolio
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Step 5: Loan Summary Screen
  if (currentStep === 5) {
    return (
      <LoanSummaryPage
        loanData={{
          amount: Number(formData.loanAmount),
          tenure: Number(formData.loanTenure),
          purpose: formData.loanPurpose
        }}
        applicant={{
          firstName: formData.firstName,
          lastName: formData.surname,
          msisdn: formData.msisdn
        }}
        onBack={() => {
          setDirection(-1);
          setCurrentStep(4);
        }}
        onHome={() => navigate("/agent")}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {livenessOverlay}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">New Customer</h1>
          <p className="text-muted-foreground mt-1">Complete all steps to register</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-xl">
          <Badge className="bg-gradient-pink text-primary-foreground border-0">Agent</Badge>
          <span className="font-mono text-sm font-medium">{user?.agentCode || <Skeleton className="h-4 w-16" />}</span>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between px-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;

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
                  "text-xs mt-2 font-medium text-center",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "flex-1 h-1 mx-2 rounded-full transition-colors",
                  currentStep > step.number ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Form Card with Animation */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className={cn(
          "h-1.5 transition-all duration-300",
          currentStep === 1 && "bg-gradient-to-r from-blue-500 to-blue-600",
          currentStep === 2 && "bg-gradient-to-r from-amber-500 to-orange-500",
          currentStep === 3 && "bg-gradient-pink",
          currentStep === 4 && "bg-gradient-to-r from-emerald-500 to-emerald-600"
        )} />
        
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            {steps[currentStep - 1].title}
            <Badge variant="secondary" className="font-normal">
              Step {currentStep} of 4
            </Badge>
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Enter the customer's personal information"}
            {currentStep === 2 && "Capture location and employment details"}
            {currentStep === 3 && "Take clear photos of ID and selfie"}
            {currentStep === 4 && "Select loan amount, tenure, and purpose"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring" as const, stiffness: 300, damping: 30 }}
            >
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => updateField("firstName", e.target.value)}
                        placeholder="Kwame"
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="surname">Surname *</Label>
                      <Input
                        id="surname"
                        value={formData.surname}
                        onChange={(e) => updateField("surname", e.target.value)}
                        placeholder="Mensah"
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="msisdn">Phone Number (MoMo) *</Label>
                    <Input
                      id="msisdn"
                      value={formData.msisdn}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 10) updateField("msisdn", val);
                      }}
                      placeholder="0244123456"
                      maxLength={10}
                      className={cn(
                        "h-12 bg-muted/50 border-0 focus-visible:ring-primary font-mono",
                        formData.msisdn.length >= 9 && !parsePhoneNumberFromString(formData.msisdn, "GH")?.isValid() && "border-2 border-destructive"
                      )}
                    />
                    {formData.msisdn && !parsePhoneNumberFromString(formData.msisdn, "GH")?.isValid() && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Must be a valid Ghanaian number
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alternatePhone">Alternate Phone</Label>
                    <Input
                      id="alternatePhone"
                      value={formData.alternatePhone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 10) updateField("alternatePhone", val);
                      }}
                      placeholder="Optional backup contact"
                      maxLength={10}
                      className={cn(
                        "h-12 bg-muted/50 border-0 focus-visible:ring-primary font-mono",
                        formData.alternatePhone.length >= 9 && !parsePhoneNumberFromString(formData.alternatePhone, "GH")?.isValid() && "border-2 border-destructive"
                      )}
                    />
                    {formData.alternatePhone && !parsePhoneNumberFromString(formData.alternatePhone, "GH")?.isValid() && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Must be a valid Ghanaian number
                      </p>
                    )}
                    {formData.alternatePhone &&
                      parsePhoneNumberFromString(formData.alternatePhone, "GH")?.isValid() &&
                      parsePhoneNumberFromString(formData.alternatePhone, "GH")?.number === parsePhoneNumberFromString(formData.msisdn, "GH")?.number && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Alternate phone cannot be the same as the MoMo number
                        </p>
                      )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alternatePhone">Alternate Phone Number *</Label>
                    <Input
                      id="alternatePhone"
                      value={formData.alternatePhone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 10) updateField("alternatePhone", val);
                      }}
                      placeholder="0244123456"
                      maxLength={10}
                      className={cn(
                        "h-12 bg-muted/50 border-0 focus-visible:ring-primary font-mono",
                        formData.alternatePhone && formData.alternatePhone.length >= 9 && !parsePhoneNumberFromString(formData.alternatePhone, "GH")?.isValid() && "border-2 border-destructive"
                      )}
                    />
                    {formData.alternatePhone && !parsePhoneNumberFromString(formData.alternatePhone, "GH")?.isValid() && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Must be a valid Ghanaian number
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth *</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={formData.dob}
                        onChange={(e) => updateField("dob", e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender *</Label>
                      <Select value={formData.gender} onValueChange={(val) => updateField("gender", val)}>
                        <SelectTrigger className="h-12 bg-muted/50 border-0">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="region">Region *</Label>
                    <Select value={formData.region} onValueChange={(val) => updateField("region", val)}>
                      <SelectTrigger className="h-12 bg-muted/50 border-0">
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
                    <div>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        placeholder="House No. 12, Dzorwulu Street"
                        rows={2}
                        className="resize-none bg-muted/50 border-0 focus-visible:ring-primary placeholder:text-muted-foreground/30"
                      />
                    </div>
                    {formData.address.length > 0 && formData.address.trim().split(/\s+/).length < 3 && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        Invalid address
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Accommodation *</Label>
                      <Select value={formData.accommodationType} onValueChange={(val) => updateField("accommodationType", val)}>
                        <SelectTrigger className="h-12 bg-muted/50 border-0">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCOMMODATION_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Years at Address *</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={formData.yearsAtAddress}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (Number.isNaN(val)) updateField("yearsAtAddress", "");
                          else if (val >= 0 && val <= 10) updateField("yearsAtAddress", String(val));
                          else if (val > 10) updateField("yearsAtAddress", "10");
                        }}
                        placeholder="0-10 years"
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Education Level *</Label>
                    <Select value={formData.educationLevel} onValueChange={(val) => updateField("educationLevel", val)}>
                      <SelectTrigger className="h-12 bg-muted/50 border-0">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {EDUCATION_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Employment *</Label>
                      <Select value={formData.employmentStatus} onValueChange={(val) => updateField("employmentStatus", val)}>
                        <SelectTrigger className="h-12 bg-muted/50 border-0">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {EMPLOYMENT_STATUS.map((status) => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Income *</Label>
                      <Select value={formData.monthlyIncome} onValueChange={(val) => updateField("monthlyIncome", val)}>
                        <SelectTrigger className="h-12 bg-muted/50 border-0">
                          <SelectValue placeholder="Range" />
                        </SelectTrigger>
                        <SelectContent>
                          {INCOME_BRACKETS.map((bracket) => (
                            <SelectItem key={bracket} value={bracket}>{bracket}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <Alert className="bg-blue-500/10 border-blue-500/30">
                    <Camera className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      Take clear photos of ID and customer.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Ghana Card Number *</Label>
                    <Input
                      value={formData.ghanaCardNumber || "GHA-"}
                      onChange={handleGhanaCardChange}
                      placeholder="GHA-123456789-0"
                      maxLength={16}
                      className="h-12 font-mono bg-muted/50 border-0 focus-visible:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">Format is automatically applied</p>
                  </div>

                  <div className="grid gap-3">
                    {/* Ghana Card Front */}
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all",
                        formData.ghanaCardFrontUrl 
                          ? "border-emerald-500 bg-emerald-500/5" 
                          : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
                      )}
                    >
                      <input
                        ref={frontInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, "front");
                        }}
                        className="hidden"
                      />
                      <input
                        ref={frontUploadRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, "front");
                        }}
                        className="hidden"
                      />
                      {renderDocumentUploadContent(
                        uploadProgress.front,
                        formData.ghanaCardFrontUrl,
                        "Ghana Card (Front)",
                        () => frontInputRef.current?.click(),
                        () => frontUploadRef.current?.click()
                      )}
                    </motion.div>

                    {/* Ghana Card Back */}
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all",
                        formData.ghanaCardBackUrl 
                          ? "border-emerald-500 bg-emerald-500/5" 
                          : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
                      )}
                    >
                      <input
                        ref={backInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, "back");
                        }}
                        className="hidden"
                      />
                      <input
                        ref={backUploadRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, "back");
                        }}
                        className="hidden"
                      />
                      {renderDocumentUploadContent(
                        uploadProgress.back,
                        formData.ghanaCardBackUrl,
                        "Ghana Card (Back)",
                        () => backInputRef.current?.click(),
                        () => backUploadRef.current?.click()
                      )}
                    </motion.div>

                    {/* Liveness */}
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-5 text-center transition-all relative",
                        formData.selfieUrl 
                          ? "border-emerald-500 bg-emerald-500/5" 
                          : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
                      )}
                    >
                      <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-left">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
                          Verify Customer Identity
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {formData.firstName || formData.surname
                            ? `${formData.firstName} ${formData.surname}`.trim()
                            : "Customer name pending"}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-600">
                          Ghana Card: {formData.ghanaCardNumber || "GHA-"}
                        </p>
                        <p className="mt-2 text-xs text-slate-600">
                          Launch the camera only after confirming the customer in front of you matches these details.
                        </p>
                      </div>

                      {livenessStatus && (
                        <Alert
                          className={cn(
                            "mb-4 text-left",
                            livenessStatus.tone === "success"
                              ? "border-emerald-300 bg-emerald-50"
                              : "border-amber-300 bg-amber-50",
                          )}
                        >
                          <AlertDescription
                            className={cn(
                              "text-sm",
                              livenessStatus.tone === "success"
                                ? "text-emerald-800"
                                : "text-amber-900",
                            )}
                          >
                            {livenessStatus.message}
                            {livenessStatus.sessionId && (
                              <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.16em]">
                                Session {livenessStatus.sessionId}
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-3">
                        {renderSelfieUploadContent(
                          uploadProgress.selfie,
                          formData.selfieUrl,
                          formData.selfieUrl ? "Liveness Verified" : "Customer Liveness",
                          () => {
                            setFormData((prev) => {
                              const nextData = {
                                ...prev,
                                selfieUrl: "",
                                livenessSession: null,
                              };
                              try {
                                localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
                              } catch (error) {
                                console.error("Failed to reset liveness state in localStorage:", error);
                              }
                              return nextData;
                            });
                            setLivenessStatus(null);
                            setShowLiveness(true);
                          }
                        )}
                        {!formData.selfieUrl && (
                          <p className="text-xs text-muted-foreground">
                            This replaces the plain selfie step and must be completed before moving on.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <Alert className="bg-emerald-500/10 border-emerald-500/30">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-800 dark:text-emerald-200">
                      <strong>Loan Limits:</strong> GHS 50 - GHS 300 | Max tenure: 14 days
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="loanAmount">Loan Amount (GHS) *</Label>
                    <Select
                      value={formData.loanAmount}
                      onValueChange={(value) => updateField("loanAmount", value)}
                    >
                      <SelectTrigger className="h-12 bg-muted/50 border-0 focus:ring-primary">
                        <SelectValue placeholder="Enter loan amount" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">GHS 50</SelectItem>
                        <SelectItem value="100">GHS 100</SelectItem>
                        <SelectItem value="150">GHS 150</SelectItem>
                        <SelectItem value="200">GHS 200</SelectItem>
                        <SelectItem value="250">GHS 250</SelectItem>
                        <SelectItem value="300">GHS 300</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loanTenure">Loan Tenure (Days) *</Label>
                    <Select
                      value={formData.loanTenure}
                      onValueChange={(value) => updateField("loanTenure", value)}
                    >
                      <SelectTrigger className="h-12 bg-muted/50 border-0 focus:ring-primary">
                        <SelectValue placeholder="Select preferred tenor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Day</SelectItem>
                        <SelectItem value="5">5 Days</SelectItem>
                        <SelectItem value="10">10 Days</SelectItem>
                        <SelectItem value="14">14 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loanPurpose">Loan Purpose *</Label>
                    <Select
                      value={formData.loanPurpose}
                      onValueChange={(value) => updateField("loanPurpose", value)}
                    >
                      <SelectTrigger className="h-12 bg-muted/50 border-0 focus:ring-primary">
                        <SelectValue placeholder="Select purpose of loan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Medical">Medical</SelectItem>
                        <SelectItem value="Home">Home</SelectItem>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 lg:left-[280px] right-0 bg-background/95 backdrop-blur-md border-t shadow-2xl p-4 sm:p-6 z-30">
        <div className="max-w-7xl mx-auto flex gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex-1 h-12 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            className="flex-1 h-12 rounded-xl bg-gradient-pink hover:opacity-90"
          >
            {currentStep === 4 ? "Review Summary" : "Next Step"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
