/* eslint-disable unicorn/prefer-string-replace-all */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, ArrowRight, ArrowLeft, User, MapPin, ImageIcon, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { uploadToSupabase } from "@/lib/supabase";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { LoanSummaryPage } from "../LoanSummaryPage";
import { OnboardingStepIndicator } from "@/components/agent/OnboardingStepIndicator";
import { BioDataStep, DetailsStep, DocumentsStep, LoanRequestStep } from "@/components/agent/OnboardingFormSteps";

const STORAGE_KEY = "agent_onboarding_form";

interface FormData {
  fullName: string;
  surname: string;
  msisdn: string;
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
  loanAmount: string;
  loanTenure: string;
  loanPurpose: string;
}

const INITIAL_FORM_DATA: FormData = {
  fullName: "", surname: "", msisdn: "", dob: "", gender: "",
  region: "", address: "", accommodationType: "", yearsAtAddress: "",
  educationLevel: "", employmentStatus: "", monthlyIncome: "",
  ghanaCardNumber: "", ghanaCardFrontUrl: "", ghanaCardBackUrl: "", selfieUrl: "",
  loanAmount: "100", loanTenure: "14", loanPurpose: "Business",
};

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 200 : -200, opacity: 0 }),
};

const steps = [
  { number: 1, title: "Bio-Data", icon: User },
  { number: 2, title: "Details", icon: MapPin },
  { number: 3, title: "Documents", icon: ImageIcon },
  { number: 4, title: "Loan", icon: CreditCard },
];

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function AgentOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});
  const [submissionResult, setSubmissionResult] = useState<{
    customerName: string;
    nodeCode: string | null;
    awaitingConsent: boolean;
  } | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const frontUploadRef = useRef<HTMLInputElement>(null);
  const backUploadRef = useRef<HTMLInputElement>(null);
  const selfieIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedData = JSON.parse(saved);
        setFormData({ ...INITIAL_FORM_DATA, ...parsedData, ghanaCardNumber: parsedData.ghanaCardNumber || "GHA-" });
      } else {
        setFormData(prev => ({ ...prev, ghanaCardNumber: "GHA-" }));
      }
      setSubmissionResult(null);
    } catch {
      setFormData(prev => ({ ...prev, ghanaCardNumber: "GHA-" }));
    }
  }, []);

  useEffect(() => {
    return () => { if (selfieIntervalRef.current) clearInterval(selfieIntervalRef.current); };
  }, []);

  const updateField = (field: keyof FormData, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  };

  const formatGhanaCardNumber = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length === 0) return "GHA-";
    if (digitsOnly.length <= 9) return `GHA-${digitsOnly}`;
    return `GHA-${digitsOnly.slice(0, 9)}-${digitsOnly.slice(9, 10)}`;
  };

  const handleGhanaCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value.startsWith("GHA-")) return;
    updateField("ghanaCardNumber", formatGhanaCardNumber(e.target.value));
  };

  const handleImageUpload = async (file: File, type: "front" | "back" | "selfie") => {
    const fieldMap = { front: "ghanaCardFrontUrl", back: "ghanaCardBackUrl", selfie: "selfieUrl" } as const;
    setUploadProgress(prev => ({ ...prev, [type]: true }));
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user?.agentCode || "unknown"}/${type}_${Date.now()}.${ext}`;
    const result = await uploadToSupabase(file, "kyc-bucket", path);
    setUploadProgress(prev => ({ ...prev, [type]: false }));
    if (result.success && result.url) {
      updateField(fieldMap[type], result.url);
      toast.success("Image uploaded!");
    } else {
      toast.error("Upload failed", { description: result.error || "Please try again" });
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1: return formData.fullName.trim() && formData.surname.trim() && Boolean(parsePhoneNumberFromString(formData.msisdn, "GH")?.isValid()) && formData.dob && formData.gender;
      case 2: return formData.region && formData.address.trim().split(/\s+/).length >= 3 && formData.accommodationType && formData.yearsAtAddress && formData.educationLevel && formData.employmentStatus && formData.monthlyIncome;
      case 3: return formData.ghanaCardNumber.trim() && formData.ghanaCardFrontUrl && formData.ghanaCardBackUrl && formData.selfieUrl;
      case 4: { const a = Number.parseInt(formData.loanAmount, 10), t = Number.parseInt(formData.loanTenure, 10); return formData.loanAmount && formData.loanTenure && formData.loanPurpose && a >= 50 && a <= 300 && t >= 1 && t <= 14; }
      default: return false;
    }
  };

  const handleNext = () => {
    if (!validateStep()) { toast.error("Complete all required fields"); return; }
    setDirection(1);
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => { setDirection(-1); setCurrentStep(prev => prev - 1); };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const parsed = parsePhoneNumberFromString(formData.msisdn, "GH");
      const formattedMsisdn = parsed ? parsed.number.replace("+", "") : formData.msisdn.replace(/\D/g, "");
      const payload = {
        fullName: formData.fullName, surname: formData.surname, msisdn: formattedMsisdn,
        dob: formData.dob, gender: formData.gender, region: formData.region,
        address: formData.address, accommodationType: formData.accommodationType,
        yearsAtAddress: Number.parseInt(formData.yearsAtAddress, 10) || 0,
        educationLevel: formData.educationLevel, employmentStatus: formData.employmentStatus,
        monthlyIncome: formData.monthlyIncome, ghanaCardNumber: formData.ghanaCardNumber,
        ghanaCardFrontUrl: formData.ghanaCardFrontUrl, ghanaCardBackUrl: formData.ghanaCardBackUrl,
        selfieUrl: formData.selfieUrl, loanAmount: Number.parseInt(formData.loanAmount, 10) || 0,
        loanTenure: Number.parseInt(formData.loanTenure, 10) || 0, loanPurpose: formData.loanPurpose,
      };
      const response = await api.post("/api/agents/onboard", payload);
      const body = response.data?.data || response.data || {};
      if (response.status < 200 || response.status >= 300 || body.success === false) {
        throw new Error(body.message || "Onboarding failed.");
      }
      setSubmissionResult({
        customerName: `${payload.fullName} ${payload.surname}`.trim(),
        nodeCode: body.nodeCode || response.data?.nodeCode || null,
        awaitingConsent: body.status === "AWAITING_CONSENT" || response.data?.status === "AWAITING_CONSENT",
      });
      localStorage.removeItem(STORAGE_KEY);
      setFormData({ ...INITIAL_FORM_DATA, ghanaCardNumber: "GHA-" });
      if (navigator.vibrate) navigator.vibrate(200);
      toast.success("Customer Onboarded! 🎉");
    } catch (error: any) {
      toast.error("Submission Failed", { description: error.response?.data?.message || "Please try again" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hidden file inputs
  const fileInputs = (
    <>
      <input ref={frontInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "front"); }} className="hidden" />
      <input ref={frontUploadRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "front"); }} className="hidden" />
      <input ref={backInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "back"); }} className="hidden" />
      <input ref={backUploadRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "back"); }} className="hidden" />
      <input ref={selfieInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "selfie"); }} className="hidden" />
    </>
  );

  // Success Screen
  if (submissionResult) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-sm border shadow-lg overflow-hidden">
          <div className="h-1.5 bg-emerald-500" />
          <CardContent className="pt-8 pb-6 text-center space-y-5">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" as const, stiffness: 300, delay: 0.2 }}>
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
            </motion.div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-foreground">Onboarding Complete!</h2>
              {submissionResult.awaitingConsent ? (
                <p className="text-sm text-muted-foreground">Authorization request sent. Customer will receive an SMS once authorized.</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <strong>{submissionResult.customerName}</strong> has been registered.
                </p>
              )}
            </div>
            <div className="space-y-2 pt-2">
              <Button
                onClick={() => { setSubmissionResult(null); setFormData({ ...INITIAL_FORM_DATA, ghanaCardNumber: "GHA-" }); localStorage.removeItem(STORAGE_KEY); setCurrentStep(1); }}
                className="w-full h-11 bg-gradient-pink hover:opacity-90 rounded-xl"
              >
                Onboard Another <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/agent/portfolio")} className="w-full h-11 rounded-xl">
                View Portfolio
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Loan Summary (Step 5)
  if (currentStep === 5) {
    return (
      <LoanSummaryPage
        loanData={{ amount: Number(formData.loanAmount), tenure: Number(formData.loanTenure), purpose: formData.loanPurpose }}
        applicant={{ firstName: formData.fullName, lastName: formData.surname, msisdn: formData.msisdn }}
        onBack={() => { setDirection(-1); setCurrentStep(4); }}
        onHome={() => navigate("/agent")}
        onSubmit={handleSubmit}
      />
    );
  }

  const stepDescriptions = [
    "Personal information",
    "Location & employment",
    "ID photos & selfie",
    "Initial loan request",
  ];

  return (
    <div className="space-y-5 pb-24">
      {fileInputs}

      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">New Customer</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Complete all steps to register</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg">
          <Badge className="bg-gradient-pink text-primary-foreground border-0 text-[10px] px-2 py-0.5">Agent</Badge>
          <span className="font-mono text-xs font-medium text-foreground">{user?.agentCode || <Skeleton className="h-3 w-12" />}</span>
        </div>
      </div>

      {/* Step Indicator */}
      <OnboardingStepIndicator steps={steps} currentStep={currentStep} />

      {/* Form Card */}
      <Card className="border shadow-sm overflow-hidden">
        <div className={cn(
          "h-1 transition-all duration-300",
          currentStep === 1 && "bg-primary",
          currentStep === 2 && "bg-warning",
          currentStep === 3 && "bg-gradient-pink",
          currentStep === 4 && "bg-emerald-500"
        )} />

        <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{steps[currentStep - 1].title}</CardTitle>
            <Badge variant="secondary" className="text-[10px] font-normal px-2 py-0">
              {currentStep}/4
            </Badge>
          </div>
          <CardDescription className="text-xs">{stepDescriptions[currentStep - 1]}</CardDescription>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-5">
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
              {currentStep === 1 && <BioDataStep formData={formData} updateField={updateField} />}
              {currentStep === 2 && <DetailsStep formData={formData} updateField={updateField} />}
              {currentStep === 3 && (
                <DocumentsStep
                  formData={formData}
                  updateField={updateField}
                  uploadProgress={uploadProgress}
                  handleGhanaCardChange={handleGhanaCardChange}
                  onCaptureFront={() => frontInputRef.current?.click()}
                  onUploadFront={() => frontUploadRef.current?.click()}
                  onCaptureBack={() => backInputRef.current?.click()}
                  onUploadBack={() => backUploadRef.current?.click()}
                  onCaptureSelfie={() => selfieInputRef.current?.click()}
                />
              )}
              {currentStep === 4 && <LoanRequestStep formData={formData} updateField={updateField} />}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 lg:left-[280px] right-0 bg-background/95 backdrop-blur-md border-t p-3 sm:p-4 z-30">
        <div className="max-w-7xl mx-auto flex gap-3">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 1} className="flex-1 h-11 rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>
          <Button onClick={handleNext} className="flex-1 h-11 rounded-xl bg-gradient-pink hover:opacity-90">
            {currentStep === 4 ? "Review" : "Next"} <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
