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
import { Check, Loader2, Camera, CheckCircle2, AlertCircle, User, MapPin, ImageIcon, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { uploadToSupabase } from "@/lib/supabase";
import api from "@/lib/api";
import { toast } from "sonner";

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

export default function AgentOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});
  const [onboardedNodeCode, setOnboardedNodeCode] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  // Load form data from localStorage on mount
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
    // Save to localStorage whenever a field changes
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
        setOnboardedNodeCode(response.data.nodeCode);        // Clear localStorage after successful submission
        localStorage.removeItem(STORAGE_KEY);        toast.success("Onboarding Complete! ���", {
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
    { number: 1, title: "Bio-Data", icon: User },
    { number: 2, title: "Socio-Economic", icon: MapPin },
    { number: 3, title: "Documents", icon: ImageIcon },
  ];

  // Success Screen
  if (onboardedNodeCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 flex items-center justify-center pb-20">
        <Card className="w-full max-w-2xl border-2">
          <CardContent className="pt-12 pb-12 text-center space-y-6">
            <div className="animate-bounce">
              <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Onboarding Successful! ���</h1>
              <p className="text-muted-foreground">Customer has been registered in the network</p>
            </div>

            <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-8 rounded-xl border-2 border-primary space-y-3">
              <p className="text-sm text-muted-foreground font-semibold">CUSTOMER NODE CODE</p>
              <div className="text-4xl font-mono font-bold text-primary tracking-wider">
                {onboardedNodeCode}
              </div>
              <p className="text-xs text-muted-foreground">Share this code with the customer</p>
            </div>

            <Alert className="bg-blue-500/10 border-blue-500/30">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                The customer can now access their account and apply for loans
              </AlertDescription>
            </Alert>

            <div className="pt-4 space-y-3">
              <Button
                onClick={() => {
                  setOnboardedNodeCode(null);
                  setFormData(INITIAL_FORM_DATA);
                  localStorage.removeItem(STORAGE_KEY);
                  setCurrentStep(1);
                }}
                className="w-full h-12 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
              >
                Onboard Another Customer
                <ArrowRight className="h-4 w-4" />
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 pb-32">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center pt-4">
          <h1 className="text-2xl font-bold text-foreground">New Customer Onboarding</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete all steps to register</p>
        </div>

        {/* Agent Info Badge */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Badge className="bg-primary text-primary-foreground shrink-0">Agent</Badge>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">Code:</span>
                {user?.agentCode ? (
                  <span className="font-mono font-bold text-sm text-foreground">{user.agentCode}</span>
                ) : (
                  <Skeleton className="h-4 w-20" />
                )}
              </div>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-primary/40 shrink-0" />
        </div>

        <div className="flex items-center justify-center gap-2 px-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all border-2",
                      isCompleted && "bg-green-500 border-green-500 text-white",
                      isActive && "bg-primary border-primary text-primary-foreground",
                      !isActive && !isCompleted && "bg-muted border-border text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <p className="text-xs mt-1 font-medium text-center">{step.title}</p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-1.5 mx-2 rounded transition-colors",
                      currentStep > step.number ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              {steps[currentStep - 1].title}
              {currentStep === 1 && <Badge variant="secondary">Personal Info</Badge>}
              {currentStep === 2 && <Badge variant="secondary">Location & Work</Badge>}
              {currentStep === 3 && <Badge variant="secondary">Upload Photos</Badge>}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Enter the customer's personal information"}
              {currentStep === 2 && "Capture location and employment details"}
              {currentStep === 3 && "Take clear photos of ID and selfie"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium">First Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                      placeholder="Kwame"
                      className="h-12 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="surname" className="text-sm font-medium">Surname *</Label>
                    <Input
                      id="surname"
                      value={formData.surname}
                      onChange={(e) => updateField("surname", e.target.value)}
                      placeholder="Mensah"
                      className="h-12 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="msisdn" className="text-sm font-medium">Phone Number *</Label>
                  <Input
                    id="msisdn"
                    value={formData.msisdn}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 10) updateField("msisdn", val);
                    }}
                    placeholder="0244123456"
                    maxLength={10}
                    className="h-12 focus-visible:ring-primary"
                  />
                  {formData.msisdn && formData.msisdn.length !== 10 && (
                    <p className="text-xs text-destructive">Must be 10 digits</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="dob" className="text-sm font-medium">Date of Birth *</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={formData.dob}
                      onChange={(e) => updateField("dob", e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="h-12 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-sm font-medium">Gender *</Label>
                    <Select value={formData.gender} onValueChange={(val) => updateField("gender", val)}>
                      <SelectTrigger className="h-12 focus-visible:ring-primary">
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
                  <Label htmlFor="region" className="text-sm font-medium">Region *</Label>
                  <Select value={formData.region} onValueChange={(val) => updateField("region", val)}>
                    <SelectTrigger className="h-12 focus-visible:ring-primary">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {GHANA_REGIONS.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">Residential Address * (Min 3 words)</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="House No. 12, Dzorwulu Street, near Vodafone Office"
                    rows={3}
                    className="resize-none focus-visible:ring-primary"
                  />
                  {formData.address && formData.address.trim().split(/\s+/).length < 3 && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Address must contain at least 3 words
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="accommodation" className="text-sm font-medium">Accommodation *</Label>
                    <Select value={formData.accommodationType} onValueChange={(val) => updateField("accommodationType", val)}>
                      <SelectTrigger className="h-12 focus-visible:ring-primary">
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
                    <Label htmlFor="years" className="text-sm font-medium">Years at Address *</Label>
                    <Input
                      id="years"
                      type="number"
                      value={formData.yearsAtAddress}
                      onChange={(e) => updateField("yearsAtAddress", e.target.value)}
                      placeholder="5"
                      min="0"
                      max="50"
                      className="h-12 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education" className="text-sm font-medium">Education Level *</Label>
                  <Select value={formData.educationLevel} onValueChange={(val) => updateField("educationLevel", val)}>
                    <SelectTrigger className="h-12 focus-visible:ring-primary">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="employment" className="text-sm font-medium">Employment *</Label>
                    <Select value={formData.employmentStatus} onValueChange={(val) => updateField("employmentStatus", val)}>
                      <SelectTrigger className="h-12 focus-visible:ring-primary">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_STATUS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="income" className="text-sm font-medium">Monthly Income *</Label>
                    <Select value={formData.monthlyIncome} onValueChange={(val) => updateField("monthlyIncome", val)}>
                      <SelectTrigger className="h-12 focus-visible:ring-primary">
                        <SelectValue placeholder="Range" />
                      </SelectTrigger>
                      <SelectContent>
                        {INCOME_BRACKETS.map((bracket) => (
                          <SelectItem key={bracket} value={bracket}>
                            {bracket}
                          </SelectItem>
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
                  <AlertDescription className="text-blue-800">
                    Take clear, well-lit photos. Ensure all text is readable.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="ghanaCardNumber" className="text-sm font-medium">Ghana Card Number *</Label>
                  <Input
                    id="ghanaCardNumber"
                    value={formData.ghanaCardNumber}
                    onChange={(e) => updateField("ghanaCardNumber", e.target.value.toUpperCase())}
                    placeholder="GHA-123456789-0"
                    className="h-12 font-mono focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-3">
                  <div
                    onClick={() => frontInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                      formData.ghanaCardFrontUrl ? "border-green-500 bg-green-500/5" : "border-border hover:border-primary hover:bg-primary/5"
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
                      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                    ) : formData.ghanaCardFrontUrl ? (
                      <>
                        <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
                        <p className="text-sm text-green-700 font-medium mt-2">Ghana Card Front - Uploaded</p>
                      </>
                    ) : (
                      <>
                        <Camera className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground font-medium mt-2">Tap to capture Ghana Card (Front)</p>
                      </>
                    )}
                  </div>

                  <div
                    onClick={() => backInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                      formData.ghanaCardBackUrl ? "border-green-500 bg-green-500/5" : "border-border hover:border-primary hover:bg-primary/5"
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
                      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                    ) : formData.ghanaCardBackUrl ? (
                      <>
                        <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
                        <p className="text-sm text-green-700 font-medium mt-2">Ghana Card Back - Uploaded</p>
                      </>
                    ) : (
                      <>
                        <Camera className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground font-medium mt-2">Tap to capture Ghana Card (Back)</p>
                      </>
                    )}
                  </div>

                  <div
                    onClick={() => selfieInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                      formData.selfieUrl ? "border-green-500 bg-green-500/5" : "border-border hover:border-primary hover:bg-primary/5"
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
                      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                    ) : formData.selfieUrl ? (
                      <>
                        <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
                        <p className="text-sm text-green-700 font-medium mt-2">Customer Selfie - Uploaded</p>
                      </>
                    ) : (
                      <>
                        <User className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground font-medium mt-2">Tap to capture Customer Selfie</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t shadow-lg p-6 flex gap-3 z-50">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => prev - 1)}
            disabled={currentStep === 1}
            className="flex-1 h-12 border-2"
          >
            Back
          </Button>

          {currentStep < 3 ? (
            <Button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              disabled={!validateStep()}
              className="flex-1 h-12"
            >
              Next Step
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!validateStep() || isSubmitting}
              className="flex-1 h-12 bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "Complete Onboarding"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
