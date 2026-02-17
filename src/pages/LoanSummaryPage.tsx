import React, { useState, useMemo } from "react";
import { ArrowLeft, ChevronRight, CheckSquare, Square, Send, Loader2, AlertCircle, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LoanSummaryPageProps {
  loanData: {
    amount: number;
    tenure: number;
    purpose: string;
  };
  applicant: any; // User data
  onBack: () => void;
  onHome: () => void; // New prop for navigating home
  onSubmit?: () => Promise<void>; // Optional external submit handler
}

export const LoanSummaryPage: React.FC<LoanSummaryPageProps> = ({ loanData, applicant, onBack, onHome, onSubmit }) => {
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculations
  const { interest, fee, totalRepayment, disbursementAmount, dueDate } = useMemo(() => {
    const principal = Number(loanData.amount);
    const tenure = Number(loanData.tenure);
    const dailyRate = 0.005; // 0.5%
    
    const interestAmount = principal * dailyRate * tenure;
    const feeAmount = 30.00; // Flat Fee
    
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

  const handleSubmit = async () => {
    if (!agreed) return;
    setIsSubmitting(true);
    setError(null); // Clear previous errors
    
    try {
        if (onSubmit) {
            await onSubmit();
            setIsSuccess(true);
        } else {
            // Internal logic (Fallback)
            if (process.env.NODE_ENV !== "production") {
              console.log("Submitting loan request to /api/loans/request...");
            }
            const payload = {
                msisdn: applicant?.msisdn,
                loanAmount: loanData.amount,
                loanTenure: loanData.tenure,
                loanPurpose: loanData.purpose
            };
            const applicantAuthToken = localStorage.getItem("agenda_token");
            await api.post(
              '/api/loans/request',
              payload,
              applicantAuthToken
                ? { headers: { Authorization: `Bearer ${applicantAuthToken}` } }
                : undefined
            );
            setIsSuccess(true);
        }
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Loan submission failed:", error);
        }
        const message = error.response?.data?.message || "Failed to submit loan application. Please try again.";
        setError(message);
    } finally {
        setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (isSuccess) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                <Send className="w-8 h-8 text-gray-400 rotate-[-45deg] translate-x-1 translate-y-1" fill="currentColor" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application under review</h2>
            <p className="text-gray-500 mb-10 text-sm">Check back in a few minutes for a decision</p>
            
            <Button 
                onClick={onHome}
                className="w-full max-w-xs h-12 rounded-full bg-[#EC1B84] hover:bg-[#D41472] text-white font-bold shadow-lg shadow-pink-200 transition-all hover:shadow-pink-300"
            >
                Go to Home
            </Button>
        </div>
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
                   <span className="font-bold text-gray-900 uppercase">{applicant?.firstName} {applicant?.lastName}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-400">Phone number</span>
                   <span className="font-bold text-gray-900">+{applicant?.msisdn}</span>
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
                    <span className="text-gray-600 font-bold">Total repayment</span>
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
                    <div className="w-12 h-12 bg-[#FFCC00] rounded-xl flex items-center justify-center text-xs font-bold text-black shrink-0 overflow-hidden shadow-sm">
                        {/* Placeholder for MTN Logo if image not found */}
                        <span className="leading-tight text-center">MTN<br/>MoMo</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 uppercase">{applicant?.firstName} {applicant?.lastName}</p>
                      <p className="text-xs text-gray-500">+{applicant?.msisdn}</p>
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
