import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Loader2, Camera, CheckCircle2, AlertCircle, User, MapPin, ImageIcon, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { uploadToSupabase } from "@/lib/supabase";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "agent_onboarding_form";

const GHANA_REGIONS = [
  "Greater Accra", "Ashanti", "Central", "Eastern", "Northern",
  "Western", "Volta", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Western North", "Savannah", "North East", "Oti"
];

const ACCOMMODATION_TYPES = ["Own House", "Rented", "Family House", "Company Quarters"];
const EDUCATION_LEVELS = ["No Formal Education", "Primary", "JHS", "SHS", "Tertiary", "Postgraduate"];
const EMPLOYMENT_STATUS = ["Employed", "Self-Employed", "Unemployed", "Student", "Retired"];
const INCOME_BRACKETS = ["Below GHS 500", "GHS 500-1000", "GHS 1000-2000", "GHS 2000-5000", "Above GHS 5000"];

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
}

const INITIAL_FORM_DATA: FormData = {
  fullName: "",
  surname: "",
  msisdn: "",
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

export default function AgentOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});
  const [onboardedNodeCode, setOnboardedNodeCode] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setFormData(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load form data from localStorage:", error);
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
    const path = `${agentCode}/${type}_${timestamp}.${fileExtension}`;

    const result = await uploadToSupabase(file, "kyc-bucket", path);

    setUploadProgress(prev => ({ ...prev, [type]: false }));

    if (result.success && result.url) {
      updateField(fieldMap[type], result.url);
      toast.success("Image uploaded successfully!");
    } else {
      toast.error("Upload failed", {
        description: result.error || "Please try again",
      });
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.fullName.trim() &&
          formData.surname.trim() &&
          formData.msisdn.length === 10 &&
          formData.dob &&
          formData.gender
        );
      case 2: {
        const wordCount = formData.address.trim().split(/\s+/).length;
        return (
          formData.region &&
          wordCount >= 3 &&
          formData.accommodationType &&
          formData.yearsAtAddress &&
          formData.educationLevel &&
          formData.employmentStatus &&
          formData.monthlyIncome
        );
      }
      case 3:
        return (
          formData.ghanaCardNumber.trim() &&
          formData.ghanaCardFrontUrl &&
          formData.ghanaCardBackUrl &&
          formData.selfieUrl
        );
      default:
        return false;
    }
  };

  const handleNext = () => {
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
      const payload = {
        fullName: formData.fullName,
        surname: formData.surname,
        msisdn: formData.msisdn,
        dob: formData.dob,
        gender: formData.gender,
        region: formData.region,
        address: formData.address,
        accommodationType: formData.accommodationType,
        yearsAtAddress: Number.parseInt(formData.yearsAtAddress),
        educationLevel: formData.educationLevel,
        employmentStatus: formData.employmentStatus,
        monthlyIncome: formData.monthlyIncome,
        ghanaCardNumber: formData.ghanaCardNumber,
        ghanaCardFrontUrl: formData.ghanaCardFrontUrl,
        ghanaCardBackUrl: formData.ghanaCardBackUrl,
        selfieUrl: formData.selfieUrl,
      };

      const response = await api.post("/api/agents/onboard", payload);

      if (response.data.success) {
        setOnboardedNodeCode(response.data.nodeCode);
        localStorage.removeItem(STORAGE_KEY);
        toast.success("Onboarding Complete! 🎉", {
          description: "Customer successfully registered.",
        });
      }
    } catch (error: any) {
      toast.error("Submission Failed", {
        description: error.response?.data?.message || "Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: "Bio-Data", icon: User, description: "Personal info" },
    { number: 2, title: "Details", icon: MapPin, description: "Location & work" },
    { number: 3, title: "Documents", icon: ImageIcon, description: "ID & photos" },
  ];

  // Success Screen
  if (onboardedNodeCode) {
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
              <h1 className="text-2xl font-bold text-foreground">Success! 🎉</h1>
              <p className="text-muted-foreground">Customer has been registered</p>
            </div>

            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-2xl border border-primary/20">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Customer Node Code</p>
              <p className="text-3xl font-mono font-bold text-primary mt-2 tracking-wider">
                {onboardedNodeCode}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                onClick={() => {
                  setOnboardedNodeCode(null);
                  setFormData(INITIAL_FORM_DATA);
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

  return (
    <div className="space-y-6 pb-28">
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
          currentStep === 3 && "bg-gradient-pink"
        )} />
        
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            {steps[currentStep - 1].title}
            <Badge variant="secondary" className="font-normal">
              Step {currentStep} of 3
            </Badge>
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Enter the customer's personal information"}
            {currentStep === 2 && "Capture location and employment details"}
            {currentStep === 3 && "Take clear photos of ID and selfie"}
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
                      <Label htmlFor="fullName">First Name *</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => updateField("fullName", e.target.value)}
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
                      className="h-12 bg-muted/50 border-0 focus-visible:ring-primary font-mono"
                    />
                    {formData.msisdn && formData.msisdn.length !== 10 && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Must be 10 digits
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
                    <Label htmlFor="address">Address * (Min 3 words)</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      placeholder="House No. 12, Dzorwulu Street, near Vodafone"
                      rows={2}
                      className="resize-none bg-muted/50 border-0 focus-visible:ring-primary"
                    />
                    {formData.address && formData.address.trim().split(/\s+/).length < 3 && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        At least 3 words required
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
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Years at Address *</Label>
                      <Input
                        type="number"
                        value={formData.yearsAtAddress}
                        onChange={(e) => updateField("yearsAtAddress", e.target.value)}
                        placeholder="5"
                        min="0"
                        max="50"
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
                      Take clear, well-lit photos. Ensure all text is readable.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Ghana Card Number *</Label>
                    <Input
                      value={formData.ghanaCardNumber}
                      onChange={(e) => updateField("ghanaCardNumber", e.target.value.toUpperCase())}
                      placeholder="GHA-123456789-0"
                      className="h-12 font-mono bg-muted/50 border-0 focus-visible:ring-primary"
                    />
                  </div>

                  <div className="grid gap-3">
                    {/* Ghana Card Front */}
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => frontInputRef.current?.click()}
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
                      {uploadProgress.front ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                      ) : formData.ghanaCardFrontUrl ? (
                        <>
                          <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                          <p className="text-sm text-emerald-700 font-medium mt-2">Ghana Card Front ✓</p>
                        </>
                      ) : (
                        <>
                          <Camera className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="text-sm text-muted-foreground font-medium mt-2">Tap to capture Ghana Card (Front)</p>
                        </>
                      )}
                    </motion.div>

                    {/* Ghana Card Back */}
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => backInputRef.current?.click()}
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
                      {uploadProgress.back ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                      ) : formData.ghanaCardBackUrl ? (
                        <>
                          <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                          <p className="text-sm text-emerald-700 font-medium mt-2">Ghana Card Back ✓</p>
                        </>
                      ) : (
                        <>
                          <Camera className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="text-sm text-muted-foreground font-medium mt-2">Tap to capture Ghana Card (Back)</p>
                        </>
                      )}
                    </motion.div>

                    {/* Selfie */}
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => selfieInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all",
                        formData.selfieUrl 
                          ? "border-emerald-500 bg-emerald-500/5" 
                          : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
                      )}
                    >
                      <input
                        ref={selfieInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, "selfie");
                        }}
                        className="hidden"
                      />
                      {uploadProgress.selfie ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                      ) : formData.selfieUrl ? (
                        <>
                          <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                          <p className="text-sm text-emerald-700 font-medium mt-2">Customer Selfie ✓</p>
                        </>
                      ) : (
                        <>
                          <User className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="text-sm text-muted-foreground font-medium mt-2">Tap to capture Customer Selfie</p>
                        </>
                      )}
                    </motion.div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t shadow-2xl p-4 sm:p-6 z-50">
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

          {currentStep < 3 ? (
            <Button
              onClick={handleNext}
              disabled={!validateStep()}
              className="flex-1 h-12 rounded-xl bg-gradient-pink hover:opacity-90"
            >
              Next Step
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!validateStep() || isSubmitting}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  Complete
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
