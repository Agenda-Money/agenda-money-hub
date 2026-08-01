import React, { useState, useMemo, useEffect } from "react";
import { TIERS } from "@/lib/constants";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { ArrowLeft, ChevronRight, CheckSquare, Square, Send, Loader2, AlertCircle, CalendarClock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, getApplicantName } from "@/lib/utils";
import { getNetwork, getNetworkStyles } from "@/lib/momo";
import api, { parseDecisionError, DecisionError } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { EligibilityBlockScreen } from "@/components/eligibility/EligibilityBlockScreen";

const MANDATE_OTP_LENGTH = 5;

interface LoanSubmitResult {
  loanReference?: string;
  status?: string;
}

interface LoanSummaryPageProps {
  loanData: {
    amount: number;
    tenure: number;
    purpose: string;
  };
  applicant: any; // User data
  onBack: () => void;
  onHome: () => void; // New prop for navigating home
  onSubmit?: () => Promise<LoanSubmitResult | void>; // Optional external submit handler (agent mode)
  onMandateConfirmed?: () => void; // Agent mode: called once the auto-repay code is confirmed, so the caller can show its own completion screen
}

export const LoanSummaryPage: React.FC<LoanSummaryPageProps> = ({ loanData, applicant, onBack, onHome, onSubmit, onMandateConfirmed }) => {
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loanStatus, setLoanStatus] = useState<string>("PENDING");
  const [loanReference, setLoanReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<DecisionError | null>(null);

  // Auto-repay ("mandate") OTP confirmation state
  const isAgentMode = !!onSubmit;
  const [mandateConfirmed, setMandateConfirmed] = useState(false);
  const [mandateOtp, setMandateOtp] = useState("");
  const [isMandateSubmitting, setIsMandateSubmitting] = useState(false);
  const [isMandateResending, setIsMandateResending] = useState(false);
  const [mandateError, setMandateError] = useState<string | null>(null);
  const [mandateResendSeconds, setMandateResendSeconds] = useState(60);

  useEffect(() => {
    if (mandateResendSeconds <= 0) return;
    const timer = setTimeout(() => setMandateResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [mandateResendSeconds]);

  const handleConfirmMandateOtp = async (otpValue?: string) => {
    const code = otpValue ?? mandateOtp;
    if (code.length !== MANDATE_OTP_LENGTH || isMandateSubmitting || !loanReference) return;
    setIsMandateSubmitting(true);
    setMandateError(null);
    try {
      if (isAgentMode) {
        await api.post(`/api/agents/onboard/${loanReference}/mandate/confirm-otp`, {
          msisdn: applicant?.msisdn,
          otp: code,
        });
        onMandateConfirmed?.();
      } else {
        const applicantAuthToken = localStorage.getItem("agenda_token");
        await api.post(
          `/api/loans/${loanReference}/mandate/confirm-otp`,
          { otp: code },
          applicantAuthToken ? { headers: { Authorization: `Bearer ${applicantAuthToken}` } } : undefined
        );
        setMandateConfirmed(true);
      }
    } catch (err: any) {
      setMandateOtp("");
      setMandateError(err.response?.data?.message || "That code didn't work. Please try again.");
    } finally {
      setIsMandateSubmitting(false);
    }
  };

  const handleResendMandateOtp = async () => {
    if (mandateResendSeconds > 0 || isMandateResending || !loanReference) return;
    setIsMandateResending(true);
    setMandateError(null);
    try {
      if (isAgentMode) {
        await api.post(`/api/agents/onboard/${loanReference}/mandate/resend-otp`, {
          msisdn: applicant?.msisdn,
        });
      } else {
        const applicantAuthToken = localStorage.getItem("agenda_token");
        await api.post(
          `/api/loans/${loanReference}/mandate/resend-otp`,
          {},
          applicantAuthToken ? { headers: { Authorization: `Bearer ${applicantAuthToken}` } } : undefined
        );
      }
      setMandateResendSeconds(60);
    } catch (err: any) {
      setMandateError(err.response?.data?.message || "Couldn't resend the code. Please try again.");
    } finally {
      setIsMandateResending(false);
    }
  };

  // Calculations
  const { interest, fee, totalRepayment, disbursementAmount, dueDate } = useMemo(() => {
    const principal = Number(loanData.amount);
    const tenure = Number(loanData.tenure);
    const dailyRate = 0.005; // 0.5%
    
    const interestAmount = principal * dailyRate * tenure;
    
    // Lookup fee from TIERS
    const userTier = Number(applicant?.currentTier ?? 1);
    const tierConfig = TIERS.find(t => t.level === userTier);
    const feeAmount = tierConfig?.processingFee ?? 30.00;
    
    // Explicit Logic:
    // Disbursement = Principal - Fee
    // Repayment = Principal + Interest (Fee is pre-deducted)
    
    const disbursementVal = principal - feeAmount;
    
    // Explicit Logic (Reverted):
    // Disbursement = Principal - Fee
    // Repayment = Principal + Interest (Fee is pre-deducted)
    const totalRepayVal = principal + interestAmount;
    
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + tenure);
    const dueDateStr = dueDateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

    return { 
      interest: interestAmount.toFixed(2), 
      fee: feeAmount.toFixed(2), 
      disbursementAmount: disbursementVal.toFixed(2),
      totalRepayment: totalRepayVal.toFixed(2),
      dueDate: dueDateStr 
    };
  }, [loanData.amount, loanData.tenure]);

  const formattedPhone = useMemo(() => {
    if (!applicant?.msisdn) return "N/A";
    const parsed = parsePhoneNumberFromString(applicant.msisdn.toString(), "GH");
    if (parsed?.isValid()) return parsed.formatInternational();
    // Fallback: strip leading +233/233/0 and prepend +233
    const clean = applicant.msisdn.toString().replace(/^(?:\+233|233|0)/, "");
    return `+233${clean}`;
  }, [applicant?.msisdn]);

  const handleSubmit = async () => {
    if (!agreed) return;
    setIsSubmitting(true);
    setError(null); // Clear previous errors
    
    try {
        if (onSubmit) {
            const result = await onSubmit();
            if (result?.status) setLoanStatus(result.status);
            if (result?.loanReference) setLoanReference(result.loanReference);
            setIsSuccess(true);
        } else {
            // Internal logic (Fallback)
            if (process.env.NODE_ENV !== "production") {

            }
            const payload = {
                amount: loanData.amount,
                tenureDays: loanData.tenure,
                purpose: loanData.purpose
            };
            const applicantAuthToken = localStorage.getItem("agenda_token");
            const res = await api.post(
              '/api/loans/request',
              payload,
              applicantAuthToken
                ? { headers: { Authorization: `Bearer ${applicantAuthToken}` } }
                : undefined
            );
            
            // Check status from response (either under data.loan or data.data)
            const createdLoan = res.data?.data || res.data?.loan || {};
            setLoanStatus(createdLoan.status || "PENDING");
            if (createdLoan.loanReference) setLoanReference(createdLoan.loanReference);

            setIsSuccess(true);
        }
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Loan submission failed:", error);
        }
        
        const decision = parseDecisionError(error);
        if (decision) {
            setDecisionError(decision);
            return;
        }

        const message = error.response?.data?.message || "Failed to submit loan application. Please try again.";
        
        if (message.toLowerCase().includes("invalid tenure")) {
           // Refresh profile/eligibility
           const token = localStorage.getItem("agenda_token") || sessionStorage.getItem("agenda_token");
           if (token) {
             api.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
               .then(res => {
                 // The parent component should handle the update via context or props if possible
                 // But for now, we just toast and maybe redirect
                 setError("Your eligibility has changed. Please try again with updated options.");
                 setTimeout(() => onBack(), 2000);
               });
           }
        } else {
           setError(message);
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  // AUTO-REPAY CODE CONFIRMATION SCREEN
  if (isSuccess && loanStatus === "AWAITING_MANDATE" && !mandateConfirmed) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-pink-100">
                <ShieldCheck className="w-8 h-8 text-[#EC1B84]" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">One more step</h2>
            <p className="text-gray-500 mb-8 text-sm max-w-[300px] mx-auto">
               We've sent a code to {formattedPhone} to set up automatic repayment for this loan. Enter it below to finish your application.
            </p>

            <div className="flex justify-center mb-6">
              <InputOTP
                value={mandateOtp}
                onChange={(v) => {
                  setMandateOtp(v);
                  if (v.length === MANDATE_OTP_LENGTH) handleConfirmMandateOtp(v);
                }}
                maxLength={MANDATE_OTP_LENGTH}
              >
                <InputOTPGroup>
                  {Array.from({ length: MANDATE_OTP_LENGTH }).map((_, i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className={cn(
                        "h-14 w-10 sm:w-12 text-xl font-bold",
                        mandateError ? "border-red-500 text-red-500" : ""
                      )}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {mandateError && (
              <p className="text-sm text-red-600 mb-4 max-w-[280px] mx-auto">{mandateError}</p>
            )}

            <div className="w-full max-w-xs space-y-3">
              <Button
                onClick={() => handleConfirmMandateOtp()}
                disabled={mandateOtp.length !== MANDATE_OTP_LENGTH || isMandateSubmitting}
                className="w-full h-12 rounded-full bg-[#EC1B84] hover:bg-[#D41472] text-white font-bold shadow-lg shadow-pink-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isMandateSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  "Confirm Code"
                )}
              </Button>

              <button
                onClick={handleResendMandateOtp}
                disabled={mandateResendSeconds > 0 || isMandateResending}
                className="text-sm text-[#EC1B84] font-medium hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {isMandateResending
                  ? "Resending..."
                  : mandateResendSeconds > 0
                  ? `Resend code in ${mandateResendSeconds}s`
                  : "Resend code"}
              </button>
            </div>
        </div>
      );
  }

  // SUCCESS SCREEN
  if (isSuccess) {
      const isEndorsement = loanStatus === "AWAITING_ENDORSEMENT";
      
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                <Send className="w-8 h-8 text-gray-400 rotate-[-45deg] translate-x-1 translate-y-1" fill="currentColor" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
               {isEndorsement ? "Sent for Endorsement" : "Application under review"}
            </h2>
            <p className="text-gray-500 mb-10 text-sm max-w-[280px] mx-auto">
               {isEndorsement 
                 ? "We've sent your request to your referring Node Owner to endorse before Admin review." 
                 : "Check back in a few minutes for a decision on your application."}
            </p>
            
            <Button 
                onClick={onHome}
                className="w-full max-w-xs h-12 rounded-full bg-[#EC1B84] hover:bg-[#D41472] text-white font-bold shadow-lg shadow-pink-200 transition-all hover:shadow-pink-300"
            >
                Go to Home
            </Button>
        </div>
      );
  }

  // ELIGIBILITY BLOCK SCREEN
  if (decisionError) {
      return (
         <EligibilityBlockScreen
            decision={decisionError}
            onHome={onHome}
            onBack={() => setDecisionError(null)}
            loanData={loanData}
            applicantAuthToken={localStorage.getItem("agenda_token") || sessionStorage.getItem("agenda_token") || undefined}
         />
      );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <div className="px-6 pt-6 pb-2 flex items-center justify-between shrink-0 bg-white">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full bg-gray-100 hover:bg-gray-200 w-10 h-10">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900 flex-1 text-center pr-10">Loan Summary</h1>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-6 pb-40 space-y-6">
        
        {/* Review Card */}
        <div className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100">
           <div className="bg-gray-100/50 py-4 px-6 border-b border-gray-100">
             <h2 className="text-sm font-bold text-gray-700 text-center">Review Your Application</h2>
           </div>
           
           <div className="p-6 space-y-8">
             
             {/* Personal Details */}
             <div className="space-y-4">
               <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Personal Details</h3>
               <div className="space-y-2">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-400">Full name</span>
                   <span className="font-bold text-gray-900 uppercase">
                      {getApplicantName(applicant)}
                   </span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-400">Phone number</span>
                   <span className="font-bold text-gray-900">{formattedPhone}</span>
                 </div>
               </div>
               <div className="border-t border-dashed border-gray-200 mt-2"></div>
             </div>

              {/* Loan Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loan Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Loan amount</span>
                    <span className="font-bold text-gray-900">GHS{loanData.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Interest</span>
                    <span className="font-bold text-gray-900">GHS{interest}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Fees</span>
                    <span className="font-bold text-gray-900">GHS{fee}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm py-2 border-t border-dashed border-gray-200 mt-2">
                    <span className="text-gray-600 font-medium">Disbursement Amount</span>
                    <span className="font-bold text-[#EC1B84]">GHS{disbursementAmount}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm py-3 bg-gray-50 -mx-2 px-2 rounded-lg mt-2">
                    <span className="text-gray-600 font-bold">Repayment Amount</span>
                    <span className="font-extrabold text-gray-900 text-lg">GHS{totalRepayment}</span>
                  </div>
                 
                  <div className="flex justify-between items-center text-sm pt-2">
                    <span className="text-gray-400">Due Date</span>
                    <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-2 py-1 rounded-lg border border-orange-100">
                        <CalendarClock className="w-3.5 h-3.5" />
                        <span className="font-bold text-xs">Due in {loanData.tenure} days</span>
                        <span className="text-[10px] opacity-70 border-l border-orange-200 pl-1.5 ml-0.5">{dueDate}</span>
                    </div>
                  </div>
               </div>
               <div className="border-t border-dashed border-gray-200 mt-2"></div>
             </div>

             {/* Disbursement Method */}
             <div className="space-y-3">
               <div className="flex items-center justify-between">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Disbursement Method</h3>
                 <button className="text-xs font-bold text-[#EC1B84] hover:underline">Edit</button>
               </div>
               
               <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden shadow-sm uppercase px-1 leading-tight text-center", getNetworkStyles(getNetwork(applicant?.msisdn)).bgColor, getNetworkStyles(getNetwork(applicant?.msisdn)).textColor)}>
                        {getNetworkStyles(getNetwork(applicant?.msisdn)).name.replace(' ', '\n')}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 uppercase">
                         {getApplicantName(applicant)}
                      </p>
                      <p className="text-xs text-gray-500">{formattedPhone}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
               </div>
             </div>
           </div>
        </div>

        {/* Confirmation Checkbox */}
        <button 
          onClick={() => setAgreed(!agreed)}
          className="flex items-start gap-3 px-2 group"
        >
          <div className={cn("mt-0.5 transition-colors", agreed ? "text-primary" : "text-gray-400 group-hover:text-gray-500")}>
            {agreed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
          </div>
          <p className="text-xs text-left text-gray-500 leading-snug">
            I confirm that the information provided is accurate and I agree to the terms and conditions.
          </p>
        </button>

      </div>

      {/* Fixed Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white p-6 border-t border-gray-100 pb-8 z-20">
         <div className="max-w-md mx-auto">
            <Button 
              onClick={handleSubmit}
              disabled={!agreed || isSubmitting}
              className="w-full h-14 rounded-full bg-[#EC1B84] hover:bg-[#D41472] text-white font-bold text-lg uppercase tracking-widest shadow-lg shadow-pink-200 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
               {isSubmitting ? (
                   <>
                     <Loader2 className="w-5 h-5 animate-spin" />
                     Submitting...
                   </>
               ) : (
                   "Submit Application"
               )}
            </Button>
         </div>
      </div>

      {/* Error Modal */}
      <AlertDialog open={!!error} onOpenChange={(open) => !open && setError(null)}>
        <AlertDialogContent className="rounded-2xl max-w-[85vw] mx-auto">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-lg font-bold text-gray-900">Application Failed</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-gray-500">
              {error}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setError(null)}
              className="w-full rounded-full bg-gray-900 hover:bg-gray-800 text-white font-bold"
            >
              Okay, I understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};
