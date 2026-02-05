import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock,
  FileUp,
  Loader2,
  Shield,
  Sparkles,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  CreditCard,
  FileText,
  Upload,
  AlertCircle,
  XCircle,
} from "lucide-react";

const baseApiUrl = import.meta.env.VITE_API_URL || "";

type VerifyStatus = "idle" | "verifying" | "verified" | "failed";
type SubmitStatus = "idle" | "submitting" | "submitted" | "approved" | "rejected" | "error";

interface FormStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

const formSteps: FormStep[] = [
  { id: 1, title: "Node Verification", description: "Verify your agent referral", icon: BadgeCheck },
  { id: 2, title: "Personal Info", description: "Your contact details", icon: User },
  { id: 3, title: "Loan Details", description: "Amount & purpose", icon: CreditCard },
  { id: 4, title: "Documents", description: "Upload Ghana Card", icon: FileUp },
];

export default function ApplyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [nodeCode, setNodeCode] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [nodeName, setNodeName] = useState<string | null>(null);
  const [nodeFirstName, setNodeFirstName] = useState<string | null>(null);
  const [nodeRegion, setNodeRegion] = useState<string | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    ghanaCardNumber: "",
    residence: "",
    employmentStatus: "",
    monthlyIncome: "",
    requestedAmount: "",
    purpose: "",
  });

  // File preview handlers
  useEffect(() => {
    if (frontFile) {
      const url = URL.createObjectURL(frontFile);
      setFrontPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setFrontPreview(null);
  }, [frontFile]);

  useEffect(() => {
    if (backFile) {
      const url = URL.createObjectURL(backFile);
      setBackPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setBackPreview(null);
  }, [backFile]);

  useEffect(() => {
    if (selfieFile) {
      const url = URL.createObjectURL(selfieFile);
      setSelfiePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setSelfiePreview(null);
  }, [selfieFile]);

  const progressPercent = useMemo(() => {
    if (submitStatus === "approved") return 100;
    if (submitStatus === "submitted") return 90;
    return ((currentStep - 1) / formSteps.length) * 80 + 10;
  }, [currentStep, submitStatus]);

  const verifyNode = async () => {
    setErrorMessage(null);
    if (!nodeCode.trim()) {
      setErrorMessage("Please enter a Node code to continue.");
      return;
    }

    setVerifyStatus("verifying");
    setNodeName(null);
    setNodeFirstName(null);
    setNodeRegion(null);

    try {
      const response = await fetch(
        `${baseApiUrl}/api/v1/nodes/verify?code=${encodeURIComponent(nodeCode.trim())}`,
        { method: "GET", headers: { Accept: "application/json" } }
      );

      if (!response.ok) throw new Error("Node verification failed");

      const payload = await response.json();
      const name = payload?.data?.nodeName || payload?.data?.name || payload?.nodeName || "Your Agent";
      const firstName = name.split(" ")[0];
      const region = payload?.data?.region || payload?.region || null;

      setNodeName(name);
      setNodeFirstName(firstName);
      setNodeRegion(region);
      setVerifyStatus("verified");
    } catch {
      setVerifyStatus("failed");
      setErrorMessage("We couldn't verify that Node code. Please double-check and try again.");
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return verifyStatus === "verified";
      case 2:
        return formData.fullName && formData.phone && formData.ghanaCardNumber && formData.residence;
      case 3:
        return formData.requestedAmount && formData.employmentStatus;
      case 4:
        return frontFile && backFile;
      default:
        return false;
    }
  }, [currentStep, verifyStatus, formData, frontFile, backFile]);

  const nextStep = () => {
    if (canProceed && currentStep < formSteps.length) {
      setCurrentStep((prev) => prev + 1);
      setErrorMessage(null);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (verifyStatus !== "verified") {
      setErrorMessage("Please verify your Node code before submitting.");
      return;
    }

    if (!frontFile || !backFile) {
      setErrorMessage("Please upload both sides of your Ghana Card.");
      return;
    }

    setSubmitStatus("submitting");

    try {
      const body = new FormData();
      body.append("nodeCode", nodeCode.trim());
      Object.entries(formData).forEach(([key, value]) => body.append(key, value));
      body.append("ghanaCardFront", frontFile);
      body.append("ghanaCardBack", backFile);
      if (selfieFile) body.append("selfie", selfieFile);

      const response = await fetch(`${baseApiUrl}/api/v1/loans/apply`, { method: "POST", body });

      if (!response.ok) throw new Error("Submission failed");

      setSubmitStatus("submitted");
    } catch {
      setSubmitStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  };

  // If submitted, show status screen
  if (submitStatus === "submitted" || submitStatus === "approved" || submitStatus === "rejected") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-pink flex items-center justify-center shadow-pink">
                <span className="text-primary-foreground font-bold text-lg">A</span>
              </div>
              <span className="font-bold text-xl">Agenda Money</span>
            </Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className={cn(
                "h-2",
                submitStatus === "approved" && "bg-success",
                submitStatus === "rejected" && "bg-destructive",
                submitStatus === "submitted" && "bg-warning"
              )} />
              <CardContent className="p-8 lg:p-12 space-y-6">
                {submitStatus === "submitted" && (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                      className="w-20 h-20 mx-auto rounded-full bg-warning/15 flex items-center justify-center"
                    >
                      <Clock className="h-10 w-10 text-warning" />
                    </motion.div>
                    <div className="space-y-2">
                      <h2 className="text-2xl lg:text-3xl font-bold">Application Under Review</h2>
                      <p className="text-muted-foreground text-lg">
                        Check back in a few minutes for a decision.
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-6 space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="h-8 w-8 rounded-full bg-success/15 flex items-center justify-center">
                          <Check className="h-4 w-4 text-success" />
                        </div>
                        <span>Application received</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="h-8 w-8 rounded-full bg-warning/15 flex items-center justify-center animate-pulse">
                          <Clock className="h-4 w-4 text-warning" />
                        </div>
                        <span>Agent verification in progress</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <span>Awaiting disbursement</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You will receive an SMS notification when your loan is approved.
                    </p>
                  </>
                )}

                {submitStatus === "approved" && (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                      className="w-24 h-24 mx-auto rounded-full bg-success/15 flex items-center justify-center"
                    >
                      <CheckCircle2 className="h-12 w-12 text-success" />
                    </motion.div>
                    <div className="space-y-2">
                      <h2 className="text-2xl lg:text-3xl font-bold text-success">
                        Loan Approved! 🎉
                      </h2>
                      <p className="text-muted-foreground text-lg">
                        Please expect funds within 30 minutes.
                      </p>
                    </div>
                    <div className="bg-success/10 border border-success/20 rounded-xl p-6">
                      <p className="text-success font-medium">
                        You will receive an SMS confirmation shortly.
                      </p>
                    </div>
                  </>
                )}

                {submitStatus === "rejected" && (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                      className="w-20 h-20 mx-auto rounded-full bg-destructive/15 flex items-center justify-center"
                    >
                      <XCircle className="h-10 w-10 text-destructive" />
                    </motion.div>
                    <div className="space-y-2">
                      <h2 className="text-2xl lg:text-3xl font-bold">Application Not Approved</h2>
                      <p className="text-muted-foreground">
                        Unfortunately, we couldn't approve your application at this time.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-pink flex items-center justify-center shadow-pink">
              <span className="text-primary-foreground font-bold text-lg">A</span>
            </div>
            <span className="font-bold text-xl">Agenda Money</span>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="sm">
              Login
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 lg:py-10 space-y-6 lg:space-y-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <Badge className="bg-gradient-pink text-primary-foreground border-0 px-4 py-1.5 text-sm">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Quick & Easy Application
          </Badge>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
            Apply for a Loan
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Get instant access to funds with competitive rates. Complete your application in under 5 minutes.
          </p>
        </motion.div>

        {/* Progress Steps - Desktop */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="hidden lg:block"
        >
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-muted mx-16" />
            <div
              className="absolute top-6 left-0 h-0.5 bg-primary transition-all duration-500 mx-16"
              style={{ width: `${((currentStep - 1) / (formSteps.length - 1)) * 100}%` }}
            />

            {formSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex flex-col items-center relative z-10">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isActive ? 1.1 : 1,
                      backgroundColor: isCompleted
                        ? "hsl(var(--success))"
                        : isActive
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted))",
                    }}
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                      isActive && "shadow-pink",
                      (isActive || isCompleted) && "text-primary-foreground",
                      !isActive && !isCompleted && "text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </motion.div>
                  <div className="mt-3 text-center">
                    <p className={cn(
                      "font-medium text-sm",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden xl:block">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Progress Steps - Mobile */}
        <div className="lg:hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {currentStep}/{formSteps.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {(() => {
              const CurrentIcon = formSteps[currentStep - 1].icon;
              return (
                <>
                  <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-pink">
                    <CurrentIcon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">{formSteps[currentStep - 1].title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formSteps[currentStep - 1].description}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Form Card */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-pink" />
          <CardContent className="p-6 lg:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Node Verification */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="node-code" className="text-base font-semibold">
                        Node Code
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Enter the referral code given to you by your agent
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Input
                          id="node-code"
                          placeholder="e.g. NODE-123456"
                          value={nodeCode}
                          onChange={(e) => setNodeCode(e.target.value)}
                          className="h-12 text-lg font-mono bg-muted/50 border-0 focus-visible:ring-primary"
                        />
                        <Button
                          type="button"
                          onClick={verifyNode}
                          disabled={verifyStatus === "verifying"}
                          className="h-12 px-6 bg-gradient-pink hover:opacity-90"
                        >
                          {verifyStatus === "verifying" ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Shield className="h-4 w-4 mr-2" />
                          )}
                          Verify Code
                        </Button>
                      </div>
                    </div>

                    {/* Verification Status */}
                    <AnimatePresence>
                      {verifyStatus === "verified" && nodeFirstName && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="rounded-xl bg-success/10 border border-success/20 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="h-5 w-5 text-success" />
                            </div>
                            <div>
                              <p className="font-semibold text-success">Code Verified!</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                We will check with <span className="font-semibold text-foreground">{nodeFirstName}</span>
                                {nodeRegion && ` in ${nodeRegion}`} for approval.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {verifyStatus === "failed" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="rounded-xl bg-destructive/10 border border-destructive/20 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive">{errorMessage}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Info Box */}
                    <div className="rounded-xl bg-muted/50 p-4 space-y-3">
                      <p className="text-sm font-medium">Why do I need a Node code?</p>
                      <p className="text-sm text-muted-foreground">
                        Each loan application is verified by a trusted agent in your community. 
                        Your agent's referral helps us process your application faster.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Personal Info */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          Full Name
                        </Label>
                        <Input
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) => handleInputChange("fullName", e.target.value)}
                          placeholder="Enter your full name"
                          required
                          className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          Mobile Money Number
                        </Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          placeholder="024 XXX XXXX"
                          required
                          className="h-12 bg-muted/50 border-0 focus-visible:ring-primary font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          Email <span className="text-muted-foreground text-xs">(optional)</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          placeholder="you@email.com"
                          className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ghanaCardNumber" className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          Ghana Card Number
                        </Label>
                        <Input
                          id="ghanaCardNumber"
                          value={formData.ghanaCardNumber}
                          onChange={(e) => handleInputChange("ghanaCardNumber", e.target.value)}
                          placeholder="GHA-XXXXXXXXX-X"
                          required
                          className="h-12 bg-muted/50 border-0 focus-visible:ring-primary font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="residence" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        Current Residence
                      </Label>
                      <Input
                        id="residence"
                        value={formData.residence}
                        onChange={(e) => handleInputChange("residence", e.target.value)}
                        placeholder="City / Town"
                        required
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Loan Details */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="requestedAmount" className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          Requested Amount (GHS)
                        </Label>
                        <Input
                          id="requestedAmount"
                          type="number"
                          value={formData.requestedAmount}
                          onChange={(e) => handleInputChange("requestedAmount", e.target.value)}
                          placeholder="e.g. 500"
                          required
                          className="h-12 bg-muted/50 border-0 focus-visible:ring-primary text-lg font-semibold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="employmentStatus" className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          Employment Status
                        </Label>
                        <Input
                          id="employmentStatus"
                          value={formData.employmentStatus}
                          onChange={(e) => handleInputChange("employmentStatus", e.target.value)}
                          placeholder="Self-employed, Salaried, etc."
                          required
                          className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="monthlyIncome" className="flex items-center gap-2">
                        Monthly Income (GHS) <span className="text-muted-foreground text-xs">(optional)</span>
                      </Label>
                      <Input
                        id="monthlyIncome"
                        type="number"
                        value={formData.monthlyIncome}
                        onChange={(e) => handleInputChange("monthlyIncome", e.target.value)}
                        placeholder="e.g. 2000"
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="purpose" className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Loan Purpose
                      </Label>
                      <Textarea
                        id="purpose"
                        value={formData.purpose}
                        onChange={(e) => handleInputChange("purpose", e.target.value)}
                        placeholder="Briefly describe how you will use the loan"
                        rows={3}
                        className="bg-muted/50 border-0 focus-visible:ring-primary resize-none"
                      />
                    </div>

                    {/* Loan Terms Info */}
                    <div className="rounded-xl bg-accent/50 border border-primary/20 p-4 space-y-2">
                      <p className="font-semibold text-sm">Loan Terms</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Interest Rate</p>
                          <p className="font-semibold">0.5% daily</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Processing Fee</p>
                          <p className="font-semibold">GHS 30</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Late Penalty</p>
                          <p className="font-semibold">2% daily</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Documents */}
                {currentStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      {/* Ghana Card Front */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          Ghana Card (Front)
                        </Label>
                        <label className={cn(
                          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all",
                          frontPreview 
                            ? "border-success bg-success/5" 
                            : "border-muted-foreground/30 hover:border-primary hover:bg-accent/50"
                        )}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setFrontFile(e.target.files?.[0] || null)}
                            className="sr-only"
                          />
                          {frontPreview ? (
                            <img
                              src={frontPreview}
                              alt="Ghana Card front"
                              className="h-32 w-full object-cover rounded-lg"
                            />
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">Click to upload</p>
                            </>
                          )}
                        </label>
                      </div>

                      {/* Ghana Card Back */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          Ghana Card (Back)
                        </Label>
                        <label className={cn(
                          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all",
                          backPreview 
                            ? "border-success bg-success/5" 
                            : "border-muted-foreground/30 hover:border-primary hover:bg-accent/50"
                        )}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setBackFile(e.target.files?.[0] || null)}
                            className="sr-only"
                          />
                          {backPreview ? (
                            <img
                              src={backPreview}
                              alt="Ghana Card back"
                              className="h-32 w-full object-cover rounded-lg"
                            />
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">Click to upload</p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Selfie (Optional) */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        Live Selfie <span className="text-muted-foreground text-xs">(optional, speeds up verification)</span>
                      </Label>
                      <label className={cn(
                        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all",
                        selfiePreview 
                          ? "border-success bg-success/5" 
                          : "border-muted-foreground/30 hover:border-primary hover:bg-accent/50"
                      )}>
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                          className="sr-only"
                        />
                        {selfiePreview ? (
                          <img
                            src={selfiePreview}
                            alt="Selfie"
                            className="h-40 w-40 object-cover rounded-full border-4 border-success"
                          />
                        ) : (
                          <>
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-2">
                              <User className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">Take a selfie</p>
                          </>
                        )}
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error Message */}
              {errorMessage && currentStep !== 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-destructive/10 border border-destructive/20 p-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{errorMessage}</p>
                  </div>
                </motion.div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className={cn(currentStep === 1 && "invisible")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {currentStep < formSteps.length ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!canProceed}
                    className="bg-gradient-pink hover:opacity-90 px-6"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={submitStatus === "submitting" || !canProceed}
                    className="bg-gradient-pink hover:opacity-90 px-8"
                  >
                    {submitStatus === "submitting" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Application
                        <Check className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-success" />
            <span>256-bit SSL Encrypted</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span>3-Minute Disbursement</span>
          </div>
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-info" />
            <span>Licensed & Regulated</span>
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground pt-8 pb-6 border-t">
          <p>© {new Date().getFullYear()} Agenda Money. All rights reserved.</p>
          <p className="mt-1">
            By applying, you agree to our terms and conditions.
          </p>
        </footer>
      </main>
    </div>
  );
}
