import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  Banknote, 
  ShieldCheck, 
  Smartphone, 
  ArrowLeft, 
  ArrowRight,
  Loader2, 
  CheckCircle2, 
  Check, 
  Camera, 
  Upload, 
  User as UserIcon,
  CreditCard,
  MapPin,
  Mail,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import agendaLogo from "@/assets/agenda-money-logo.jpg";
import { uploadToSupabase } from "@/lib/supabase";

type View = "landing" | "auth" | "otp" | "onboarding" | "success";

interface AgentFormData {
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  address: string;
  region: string;
  ghanaCardNumber: string;
  ghanaCardFrontUrl: string;
  ghanaCardBackUrl: string;
  selfieUrl: string;
}

const REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Western North", "Central", 
  "Eastern", "Volta", "Oti", "Bono", "Bono East", "Ahafo", 
  "Northern", "Savannah", "North East", "Upper East", "Upper West"
];

const OTP_LENGTH = 6;
const OTP_SLOTS = Array.from({ length: OTP_LENGTH }, (_, i) => i);
const baseApiUrl = import.meta.env.VITE_API_URL || "https://api.agendamoney.com";

export default function AgentApplyPage() {
  const [view, setView] = useState<View>("landing");
  const [currentStep, setCurrentStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auth State
  const [msisdnInput, setMsisdnInput] = useState("");
  const [normalizedMsisdn, setNormalizedMsisdn] = useState("");
  const [otp, setOtp] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  // Onboarding State
  const [formData, setFormData] = useState<AgentFormData>({
    firstName: "",
    surname: "",
    email: "",
    phone: "",
    address: "",
    region: "",
    ghanaCardNumber: "",
    ghanaCardFrontUrl: "",
    ghanaCardBackUrl: "",
    selfieUrl: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ front: false, back: false, selfie: false });

  // Refs for file inputs
  const frontInputRef = useRef<HTMLInputElement>(null);
  const frontUploadRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const backUploadRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // Helpers
  const updateField = (field: keyof AgentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGhanaCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (!val.startsWith("GHA-")) val = "GHA-" + val.replace(/^GHA-?/, "");
    // Add hyphens: GHA-123456789-0
    const raw = val.replace("GHA-", "").replace(/-/g, "");
    if (raw.length > 0) {
      val = "GHA-" + raw.substring(0, 9);
      if (raw.length > 9) val += "-" + raw.substring(9, 10);
    }
    updateField("ghanaCardNumber", val);
  };

  function normalizeMsisdn(msisdn: string | undefined): string {
    if (!msisdn) return "";
    const msisdnStr = String(msisdn);
    if (msisdnStr.startsWith("0")) return `233${msisdnStr.slice(1)}`;
    if (msisdnStr.startsWith("233")) return msisdnStr;
    return `233${msisdnStr}`;
  }

  // Auth Effects
  useEffect(() => {
    if (resendSeconds > 0) {
      const t = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendSeconds]);

  // Image Upload Logic
  const handleImageUpload = async (file: File, type: "front" | "back" | "selfie") => {
    const fieldMap = {
      front: "ghanaCardFrontUrl",
      back: "ghanaCardBackUrl",
      selfie: "selfieUrl",
    } as const;

    setUploadProgress((prev) => ({ ...prev, [type]: true }));

    const timestamp = Date.now();
    // Use msisdn as generic identifier since they are unauthenticated
    const identifier = normalizedMsisdn || "temp_" + timestamp;
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `agents/${identifier}/${type}_${timestamp}.${fileExtension}`;

    const result = await uploadToSupabase(file, "kyc-bucket", path);

    setUploadProgress((prev) => ({ ...prev, [type]: false }));

    if (result.success && result.url) {
      updateField(fieldMap[type], result.url);
      toast.success("Image uploaded successfully!");
    } else {
      toast.error("Upload failed", {
        description: result.error || "Please try again later or check your connection",
      });
    }
  };

  // Auth Handlers
  const handleRequestOtp = async () => {
    const formatted = normalizeMsisdn(msisdnInput);
    if (!formatted) {
      setErrorMessage("Please enter a valid phone number.");
      return;
    }
    setNormalizedMsisdn(formatted);
    updateField("phone", formatted); // Pre-fill form data

    setIsRequesting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${baseApiUrl}/api/auth/request`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ msisdn: formatted }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to send OTP.");
      setResendSeconds(60);
      setView("otp");
    } catch (e: any) {
      setErrorMessage(e?.message || "An error occurred.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleVerifyOtp = async (code?: string) => {
    const otpToVerify = typeof code === "string" ? code : otp;
    if (!normalizedMsisdn) {
      setErrorMessage("Enter a valid phone number.");
      return;
    }
    if (otpToVerify.length !== OTP_LENGTH) return;

    if (isVerifying) return;
    setIsVerifying(true);
    setErrorMessage(null);
    
    try {
      const res = await fetch(`${baseApiUrl}/api/auth/verify`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ msisdn: normalizedMsisdn, otp: otpToVerify }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "OTP verification failed.");
      
      // Verification Successful.
      // Move to onboarding.
      toast.success("Phone verified successfully!");
      setView("onboarding");
      
    } catch (e: any) {
      setErrorMessage(e?.message || "OTP verification failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = () => {
    setOtp("");
    handleRequestOtp();
  };

  // Onboarding Helpers
  const validateStep = () => {
    switch (currentStep) {
      case 1:
        return !!(
          formData.firstName.trim() &&
          formData.surname.trim() &&
          formData.email.trim() &&
          formData.email.includes("@") &&
          formData.address.trim().split(/\s+/).length >= 3 &&
          formData.region
        );
      case 2:
        return !!(
          formData.ghanaCardNumber.length === 15 &&
          formData.ghanaCardFrontUrl &&
          formData.ghanaCardBackUrl &&
          formData.selfieUrl
        );
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep() && currentStep < 2) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Please complete all required fields correctly.");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) {
      toast.error("Please complete all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${baseApiUrl}/api/agents/public/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit application");
      }

      toast.success("Application submitted successfully!");
      setView("success");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ═══════════════════════════════════════
  // UPLOAD HELPERS
  // ═══════════════════════════════════════
  const renderDocumentUploadContent = (
    isUploading: boolean,
    url: string,
    label: string,
    onCameraClick: () => void,
    onUploadClick: () => void
  ) => {
    if (isUploading) {
      return (
        <div className="flex flex-col items-center justify-center p-6 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm font-medium text-emerald-600">Uploading securely...</p>
        </div>
      );
    }

    if (url) {
      return (
        <div className="flex flex-col items-center justify-center space-y-3 p-2">
          <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-700">{label} Uploaded</p>
            <p className="text-xs text-muted-foreground mt-1">Tap to re-upload</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground mb-1">{label}</p>
          <p className="text-xs text-muted-foreground">Ensure edges are visible</p>
        </div>
        <div className="flex gap-2 justify-center pt-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="flex-1 max-w-[120px]"
            onClick={(e) => { e.stopPropagation(); onCameraClick(); }}
          >
            <Camera className="h-4 w-4 mr-2" />
            Camera
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="flex-1 max-w-[120px]"
            onClick={(e) => { e.stopPropagation(); onUploadClick(); }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>
    );
  };

  const renderSelfieUploadContent = (
    isUploading: boolean,
    url: string,
    label: string,
    onCameraClick: () => void
  ) => {
    if (isUploading) {
      return (
        <div className="flex flex-col items-center justify-center p-6 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm font-medium text-emerald-600">Uploading securely...</p>
        </div>
      );
    }

    if (url) {
      return (
        <div className="flex flex-col items-center justify-center space-y-3 p-2">
          <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-700">{label} Uploaded</p>
            <p className="text-xs text-muted-foreground mt-1">Tap to recapture</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
          <UserIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground mb-1">{label}</p>
          <p className="text-xs text-muted-foreground">Ensure face is well lit</p>
        </div>
        <div className="flex justify-center pt-2">
          <Button 
            type="button" 
            variant="default"
            className="w-[200px]"
            onClick={(e) => { e.stopPropagation(); onCameraClick(); }}
          >
            <Camera className="h-4 w-4 mr-2" />
            Take Photo
          </Button>
        </div>
      </div>
    );
  };


  // ═══════════════════════════════════════
  // LANDING VIEW (Splash)
  // ═══════════════════════════════════════
  if (view === "landing") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center relative overflow-hidden">
        { /* Background Effects */ }
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
                <img src={agendaLogo} alt="Agenda Money" className="h-auto w-44 object-contain rounded-2xl shadow-xl hover:scale-105 transition-transform duration-300" />
             </div>
           </motion.div>

           <motion.div
             initial={{ y: 20, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             transition={{ delay: 0.3, duration: 0.8 }}
             className="space-y-6 mb-16"
           >
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 leading-tight">
                Become an <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-rose-500">Agent</span>
              </h1>
              <p className="text-muted-foreground font-medium text-sm">Join the Agenda Money network and earn commissions by onboarding customers.</p>
              
              <div className="flex flex-col gap-3 max-w-[85%] mx-auto mt-2">
                 <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100/50 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                       <Building2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Grow your business.</span>
                 </div>
                  <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100/50 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                       <Banknote className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Earn unlimited commissions.</span>
                 </div>
                 <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100/50 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                       <Smartphone className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">100% Digital Workflow</span>
                 </div>
              </div>
           </motion.div>

           <motion.div
             initial={{ y: 20, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             transition={{ delay: 0.6, duration: 0.5 }}
             className="w-full space-y-4"
           >
             <Button 
               onClick={() => setView("auth")}
               className="w-full h-14 rounded-full bg-slate-900 text-white text-lg font-bold shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
             >
               Get Started as Agent
             </Button>
             <Link to="/" className="block text-sm font-medium text-pink-600 hover:text-pink-700 transition">
                Already an agent? Login
             </Link>
           </motion.div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // AUTH & OTP VIEWS
  // ═══════════════════════════════════════
  if (view === "auth" || view === "otp") {
    const canSubmitEntry = Boolean(msisdnInput.length === 9 && normalizeMsisdn(msisdnInput));
    const canVerify = otp.length === OTP_LENGTH;

    return (
      <div className="flex h-auto min-h-screen items-center justify-center overflow-x-hidden bg-white py-10 relative" data-theme="light">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(236,27,132,0.15)_0%,rgba(255,255,255,0)_70%)] blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,rgba(255,255,255,0)_70%)] blur-[120px] pointer-events-none animate-pulse delay-1000" />
        
        <div className="relative flex flex-col w-full items-center justify-center px-4 sm:px-6 lg:px-8 z-10">
          <div className="flex flex-col items-center justify-center z-20 mb-8 mt-10">
            <div className="relative group">
              <div className="absolute -inset-4 bg-white/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <img src={agendaLogo} alt="Agenda Money" className="h-auto w-44 object-contain rounded-2xl shadow-xl hover:scale-105 transition-transform duration-300" />
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] z-10 w-full rounded-[40px] p-8 sm:min-w-[440px] lg:p-10 border border-white/60 relative overflow-visible">
            
            <div className="text-center relative z-10 space-y-2 mb-8">
              <h3 className="text-gray-800 text-2xl font-bold tracking-tight">
                {view === "auth" ? "Enter your phone number" : "Verify OTP"}
              </h3>
              <p className="text-base-content/80 text-xs text-muted-foreground tracking-tight">
                {view === "auth" 
                  ? "We’ll send a one-time code to verify your agent account request" 
                  : `Enter the code sent to ${normalizedMsisdn || "your phone"}`
                }
              </p>
            </div>

            {errorMessage && (
              <Alert className="border-destructive/30 bg-destructive/5 text-destructive mb-6">
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
                        <div className="h-8 w-px bg-gray-200/60 mx-2" />
                        <Input 
                          id="msisdn"
                          type="tel"
                          value={msisdnInput}
                          onChange={(e) => {
                            const val = e.target.value; 
                            if (val.length <= 20) { setMsisdnInput(val); }
                          }}
                          onBlur={() => {
                            let val = msisdnInput.replace(/\D/g, "");
                            if (val.startsWith("233") && val.length > 9) val = val.slice(3);
                            else if (val.startsWith("0") && val.length > 9) val = val.slice(1);
                            if (val.length > 9) val = val.slice(0, 9);
                            setMsisdnInput(val);
                          }}
                          placeholder="50 XXX XXXX"
                          className="flex-1 bg-transparent border-0 h-full text-xl font-mono font-medium tracking-wider text-gray-800 focus:ring-0 focus:outline-none placeholder:text-gray-400 ml-2"
                        />
                      </div>
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
                     <InputOTP value={otp} onChange={(v) => { setOtp(v); if (v.length === OTP_LENGTH) handleVerifyOtp(v); }} maxLength={OTP_LENGTH}>
                       <InputOTPGroup>
                         {OTP_SLOTS.map((slot, i) => <InputOTPSlot key={slot} index={i} className="h-14 w-10 sm:w-12 bg-transparent border-b-2 border-border/50 rounded-none text-xl focus:border-primary focus:ring-0 transition-all font-bold" />)}
                       </InputOTPGroup>
                     </InputOTP>
                   </div>
                   
                   <div className="flex flex-col gap-3">
                     <Button 
                       onClick={() => handleVerifyOtp()} 
                       disabled={!canVerify || isVerifying}
                       className="btn btn-lg w-full bg-gradient-pink text-white border-0 hover:opacity-90 h-11"
                     >
                        {isVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {isVerifying ? "Verifying..." : "Verify Code"}
                     </Button>
                     
                     <div className="flex items-center justify-between text-sm">
                       <Button variant="ghost" onClick={() => { setView("auth"); setOtp(""); }} className="text-muted-foreground hover:text-foreground p-0 h-auto font-normal">
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
  // ONBOARDING VIEW
  // ═══════════════════════════════════════
  if (view === "onboarding") {
    return (
      <div className="min-h-screen bg-muted/30 pb-32">
        <div className="bg-background border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold">Agent Application</h1>
                <p className="text-xs text-muted-foreground">
                  Step {currentStep} of 2
                </p>
              </div>
            </div>
            {currentStep > 1 && (
              <Button variant="ghost" size="sm" onClick={handleBack} className="text-muted-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          {/* Progress Bar */}
          <div className="h-1 bg-muted/50 w-full">
            <div
              className="h-full bg-primary transition-all duration-500 ease-in-out"
              style={{ width: `${(currentStep / 2) * 100}%` }}
            />
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-background rounded-2xl shadow-sm border p-6 sm:p-8"
            >
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Personal Details</h2>
                    <p className="text-muted-foreground">Tell us a bit about yourself.</p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => updateField("firstName", e.target.value)}
                        placeholder="John"
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="surname">Surname</Label>
                      <Input
                        id="surname"
                        value={formData.surname}
                        onChange={(e) => updateField("surname", e.target.value)}
                        placeholder="Doe"
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        placeholder="john.doe@example.com"
                        className="h-12 pl-10 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      disabled
                      className="h-12 bg-muted border-0 opacity-50 font-medium"
                    />
                    <p className="text-xs text-muted-foreground select-none">
                      (Verified)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="region">Operating Region</Label>
                    <Select value={formData.region} onValueChange={(val) => updateField("region", val)}>
                      <SelectTrigger className="h-12 bg-muted/50 border-0 focus:ring-primary">
                        <SelectValue placeholder="Select your region" />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.map((region) => (
                          <SelectItem key={region} value={region}>{region}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Residential/Business Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        placeholder="123 Agenda Street, Accra"
                        className="h-12 pl-10 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Identity Verification</h2>
                    <p className="text-muted-foreground">Please provide clear images of your ID and yourself.</p>
                  </div>

                  <Alert className="bg-blue-500/10 border-blue-500/30 mb-4">
                    <Camera className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      Ensure the ID details are visible and clearly legible.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Ghana Card Number</Label>
                    <Input
                      value={formData.ghanaCardNumber || "GHA-"}
                      onChange={handleGhanaCardChange}
                      placeholder="GHA-123456789-0"
                      maxLength={15}
                      className="h-12 font-mono bg-muted/50 border-0 focus-visible:ring-primary"
                    />
                  </div>

                  <div className="grid gap-4 mt-6">
                    {/* Front */}
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-5 text-center transition-all relative overflow-hidden",
                        formData.ghanaCardFrontUrl ? "border-emerald-500 bg-emerald-500/5" : "border-muted-foreground/30 bg-muted/10 hover:border-primary"
                      )}
                    >
                      <input
                        ref={frontInputRef} type="file" accept="image/*" capture="user"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "front"); }} className="hidden"
                      />
                      <input
                        ref={frontUploadRef} type="file" accept="image/*"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "front"); }} className="hidden"
                      />
                      {renderDocumentUploadContent(uploadProgress.front, formData.ghanaCardFrontUrl, "Ghana Card (Front)", () => frontInputRef.current?.click(), () => frontUploadRef.current?.click())}
                    </div>

                    {/* Back */}
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-5 text-center transition-all relative overflow-hidden",
                        formData.ghanaCardBackUrl ? "border-emerald-500 bg-emerald-500/5" : "border-muted-foreground/30 bg-muted/10 hover:border-primary"
                      )}
                    >
                      <input
                        ref={backInputRef} type="file" accept="image/*" capture="environment"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "back"); }} className="hidden"
                      />
                      <input
                        ref={backUploadRef} type="file" accept="image/*"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "back"); }} className="hidden"
                      />
                      {renderDocumentUploadContent(uploadProgress.back, formData.ghanaCardBackUrl, "Ghana Card (Back)", () => backInputRef.current?.click(), () => backUploadRef.current?.click())}
                    </div>

                    {/* Selfie */}
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-5 text-center transition-all relative overflow-hidden",
                        formData.selfieUrl ? "border-emerald-500 bg-emerald-500/5" : "border-muted-foreground/30 bg-muted/10 hover:border-primary"
                      )}
                    >
                      <input
                        ref={selfieInputRef} type="file" accept="image/*" capture="user"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "selfie"); }} className="hidden"
                      />
                      {renderSelfieUploadContent(uploadProgress.selfie, formData.selfieUrl, "Take a Selfie", () => selfieInputRef.current?.click())}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t shadow-2xl p-4 sm:p-6 z-50">
          <div className="max-w-xl mx-auto flex gap-3">
            {currentStep < 2 ? (
              <Button onClick={handleNext} disabled={!validateStep()} className="w-full h-12 rounded-xl bg-gradient-pink hover:opacity-90">
                Next Step
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting || !validateStep()} className="w-full h-12 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    Complete Application
                    <CheckCircle2 className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            )}
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-100/50">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
        <p className="text-muted-foreground text-sm mb-8">We've received your request to become an Agenda Money Agent.</p>

        <div className="w-full max-w-sm bg-gray-50 rounded-2xl p-5 mb-8 text-left border border-gray-100">
           <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 pl-1">What Happens Next</h3>
           <div className="space-y-6 relative">
              <div className="absolute top-2 left-[11px] bottom-2 w-0.5 bg-gray-200 -z-10" />
              
              <div className="flex gap-4 items-start">
                 <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                    <Check className="w-3 h-3 text-white" />
                 </div>
                 <div>
                    <p className="text-sm font-bold text-gray-900">Application Received</p>
                    <p className="text-xs text-green-600 font-medium">Completed</p>
                 </div>
              </div>

              <div className="flex gap-4 items-start">
                 <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                 </div>
                 <div>
                    <p className="text-sm font-bold text-gray-900">Under Review</p>
                    <p className="text-xs text-amber-600 font-medium">We are processing your application.</p>
                 </div>
              </div>

              <div className="flex gap-4 items-start">
                 <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 border-2 border-white z-10">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                 </div>
                 <div>
                    <p className="text-sm font-medium text-gray-500">Approval & Training</p>
                    <p className="text-xs text-gray-400">Pending</p>
                 </div>
              </div>
           </div>
        </div>

        <Link to="/" className="w-full max-w-sm">
          <Button className="w-full h-14 rounded-full bg-primary text-primary-foreground text-lg uppercase font-bold tracking-widest shadow-lg hover:shadow-primary/25 transition-all">
            Return to Home
          </Button>
        </Link>
      </div>
    );
  }

  return null;
}
