import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock3,
  FileUp,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";

const baseApiUrl = import.meta.env.VITE_API_URL || "";

type VerifyStatus = "idle" | "verifying" | "verified" | "failed";

type SubmitStatus = "idle" | "submitting" | "submitted" | "error";

export default function ApplyPage() {
  const [nodeCode, setNodeCode] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [nodeName, setNodeName] = useState<string | null>(null);
  const [nodeRegion, setNodeRegion] = useState<string | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  useEffect(() => {
    if (frontFile) {
      const url = URL.createObjectURL(frontFile);
      setFrontPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setFrontPreview(null);
    return undefined;
  }, [frontFile]);

  useEffect(() => {
    if (backFile) {
      const url = URL.createObjectURL(backFile);
      setBackPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setBackPreview(null);
    return undefined;
  }, [backFile]);

  const progressValue = useMemo(() => {
    if (submitStatus === "submitted") {
      return 100;
    }
    if (submitStatus === "submitting") {
      return 70;
    }
    if (verifyStatus === "verified") {
      return 35;
    }
    if (verifyStatus === "verifying") {
      return 20;
    }
    return 10;
  }, [submitStatus, verifyStatus]);

  const steps = [
    { number: 1, title: "Node Check", icon: UserCheck, description: "Verify referral" },
    { number: 2, title: "Bio-Data", icon: BadgeCheck, description: "Personal info" },
    { number: 3, title: "Documents", icon: FileUp, description: "Ghana Card" },
    { number: 4, title: "Submit", icon: CheckCircle2, description: "Finalize" },
  ];

  const currentStep = useMemo(() => {
    if (submitStatus === "submitting" || submitStatus === "submitted") {
      return 4;
    }
    if (frontFile && backFile) {
      return 3;
    }
    if (verifyStatus === "verified") {
      return 2;
    }
    return 1;
  }, [backFile, frontFile, submitStatus, verifyStatus]);

  const verifyNode = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!nodeCode.trim()) {
      setErrorMessage("Please enter a Node code to continue.");
      return;
    }

    setVerifyStatus("verifying");
    setNodeName(null);
    setNodeRegion(null);

    try {
      const response = await fetch(
        `${baseApiUrl}/api/v1/nodes/verify?code=${encodeURIComponent(nodeCode.trim())}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Node verification failed");
      }

      const payload = await response.json();
      const name =
        payload?.data?.nodeName ||
        payload?.data?.name ||
        payload?.node?.name ||
        payload?.nodeName ||
        payload?.name ||
        "Your Node Agent";
      const region = payload?.data?.region || payload?.node?.region || payload?.region || null;

      setNodeName(name);
      setNodeRegion(region);
      setVerifyStatus("verified");
      setSuccessMessage(`We will check with ${name} for approval.`);
    } catch (error) {
      setVerifyStatus("failed");
      setErrorMessage("We couldn't verify that Node code. Please double-check and try again.");
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (verifyStatus !== "verified") {
      setErrorMessage("Please verify your Node code before submitting.");
      return;
    }

    if (!frontFile || !backFile) {
      setErrorMessage("Please upload both the front and back of your Ghana Card.");
      return;
    }

    setSubmitStatus("submitting");

    try {
      const body = new FormData();
      body.append("nodeCode", nodeCode.trim());
      body.append("fullName", formData.fullName);
      body.append("phone", formData.phone);
      body.append("email", formData.email);
      body.append("ghanaCardNumber", formData.ghanaCardNumber);
      body.append("residence", formData.residence);
      body.append("employmentStatus", formData.employmentStatus);
      body.append("monthlyIncome", formData.monthlyIncome);
      body.append("requestedAmount", formData.requestedAmount);
      body.append("purpose", formData.purpose);
      body.append("ghanaCardFront", frontFile);
      body.append("ghanaCardBack", backFile);

      const response = await fetch(`${baseApiUrl}/api/v1/loans/apply`, {
        method: "POST",
        body,
      });

      if (!response.ok) {
        throw new Error("Application submission failed");
      }

      setSubmitStatus("submitted");
      setSuccessMessage("Application under review. Check back in a few minutes for a decision.");
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage("Something went wrong while submitting. Please try again.");
    }
  };

  return (
    <div className="space-y-6 pb-28">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge className="bg-gradient-pink text-primary-foreground border-0">Apply</Badge>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-3">
            Apply for Agenda Money
          </h1>
          <p className="text-muted-foreground mt-1">
            No login required. Use your Node code to get started on apply.agendamoney.com.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-xl">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-foreground">Secure & verified</span>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number || submitStatus === "submitted";

          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-semibold transition-all shadow-lg",
                    isCompleted && "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white",
                    isActive && "bg-gradient-pink text-primary-foreground shadow-pink",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                </div>
                <p
                  className={cn(
                    "text-xs mt-2 font-medium text-center",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-1 mx-2 rounded-full transition-colors",
                    currentStep > step.number ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <Card className="border-0 shadow-lg overflow-hidden">
        <div
          className={cn(
            "h-1.5 transition-all duration-300",
            currentStep === 1 && "bg-gradient-to-r from-blue-500 to-blue-600",
            currentStep === 2 && "bg-gradient-to-r from-amber-500 to-orange-500",
            currentStep === 3 && "bg-gradient-pink",
            currentStep === 4 && "bg-gradient-to-r from-emerald-500 to-emerald-600"
          )}
        />
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            {steps[currentStep - 1].title}
            <Badge variant="secondary" className="font-normal">
              Step {currentStep} of 4
            </Badge>
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Enter your Node code to verify referral"}
            {currentStep === 2 && "Provide your contact and identity details"}
            {currentStep === 3 && "Upload clear Ghana Card images"}
            {currentStep === 4 && "Submit and await approval"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-xl border border-muted/60 bg-muted/30 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Fast approvals and 3-minute disbursement surprise.
                </div>
                <Progress value={progressValue} className="h-2" />
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-500" /> Node verified
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-amber-500" /> Under review
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-sky-500" /> Decision & payout
                  </span>
                </div>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-3">
                    <Label htmlFor="node-code">Node code</Label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Input
                        id="node-code"
                        placeholder="Enter your Node code"
                        value={nodeCode}
                        onChange={(event) => setNodeCode(event.target.value)}
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={verifyNode}
                        disabled={verifyStatus === "verifying"}
                        className="min-w-[140px] h-12"
                      >
                        {verifyStatus === "verifying" ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Checking
                          </span>
                        ) : (
                          "Check Node"
                        )}
                      </Button>
                    </div>
                    {verifyStatus === "verified" && nodeName && (
                      <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                        We will check with <strong>{nodeName}</strong>
                        {nodeRegion ? ` in ${nodeRegion}` : ""} for approval.
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="full-name">Full name</Label>
                      <Input
                        id="full-name"
                        value={formData.fullName}
                        onChange={(event) => handleInputChange("fullName", event.target.value)}
                        placeholder="Your full name"
                        required
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Mobile money number</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(event) => handleInputChange("phone", event.target.value)}
                        placeholder="e.g. 024 XXX XXXX"
                        required
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(event) => handleInputChange("email", event.target.value)}
                        placeholder="name@email.com"
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ghana-card">Ghana Card number</Label>
                      <Input
                        id="ghana-card"
                        value={formData.ghanaCardNumber}
                        onChange={(event) => handleInputChange("ghanaCardNumber", event.target.value)}
                        placeholder="GHA-XXXXXXXXX-X"
                        required
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="residence">Current residence</Label>
                      <Input
                        id="residence"
                        value={formData.residence}
                        onChange={(event) => handleInputChange("residence", event.target.value)}
                        placeholder="City / Town"
                        required
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employment-status">Employment status</Label>
                      <Input
                        id="employment-status"
                        value={formData.employmentStatus}
                        onChange={(event) => handleInputChange("employmentStatus", event.target.value)}
                        placeholder="Self-employed, Salaried, etc."
                        required
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="monthly-income">Monthly income (GHS)</Label>
                      <Input
                        id="monthly-income"
                        value={formData.monthlyIncome}
                        onChange={(event) => handleInputChange("monthlyIncome", event.target.value)}
                        placeholder="e.g. 2000"
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requested-amount">Requested amount (GHS)</Label>
                      <Input
                        id="requested-amount"
                        value={formData.requestedAmount}
                        onChange={(event) => handleInputChange("requestedAmount", event.target.value)}
                        placeholder="e.g. 800"
                        required
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purpose">Loan purpose</Label>
                    <Textarea
                      id="purpose"
                      value={formData.purpose}
                      onChange={(event) => handleInputChange("purpose", event.target.value)}
                      placeholder="Briefly describe how you will use the loan"
                      rows={3}
                      className="bg-muted/50 border-0 focus-visible:ring-primary"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Ghana Card (Front)</Label>
                      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-muted-foreground/40 bg-muted/30 p-4">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(event) => setFrontFile(event.target.files?.[0] || null)}
                          className="bg-white"
                        />
                        {frontPreview && (
                          <img
                            src={frontPreview}
                            alt="Ghana Card front"
                            className="h-32 w-full rounded-lg object-cover"
                          />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Ghana Card (Back)</Label>
                      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-muted-foreground/40 bg-muted/30 p-4">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(event) => setBackFile(event.target.files?.[0] || null)}
                          className="bg-white"
                        />
                        {backPreview && (
                          <img
                            src={backPreview}
                            alt="Ghana Card back"
                            className="h-32 w-full rounded-lg object-cover"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {errorMessage && (
                    <Alert variant="destructive">
                      <AlertTitle>Action needed</AlertTitle>
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  )}

                  {successMessage && (
                    <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                      <AlertTitle>Update</AlertTitle>
                      <AlertDescription>{successMessage}</AlertDescription>
                    </Alert>
                  )}

                  {submitStatus === "submitted" && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-4 w-4" />
                        Application under review
                      </div>
                      <p className="mt-1 text-xs text-emerald-700">
                        Check back in a few minutes for a decision.
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-gradient-pink hover:opacity-90"
                    disabled={submitStatus === "submitting"}
                  >
                    {submitStatus === "submitting" ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting
                      </span>
                    ) : (
                      "Submit application"
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    By submitting, you agree to Agenda Money contacting you via SMS for approval and
                    disbursement updates.
                  </p>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
