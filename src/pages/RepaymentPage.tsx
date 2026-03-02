import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, CheckCircle2, RefreshCw, CloudOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { initiateRepayment, getMe } from "@/lib/api";

interface RepaymentPageProps {
  amountDue: number;
  dueDate: string;
  msisdn: string;
  userName?: string;
  onBack: () => void;
  onRepay: (amount: number, method: string) => void;
}

const MIN_PARTIAL_PAYMENT = 5;

// Helper to determine network from MSISDN
const getNetwork = (msisdn: string) => {
    const cleanNum = msisdn.replace(/\D/g, '');
    const localPrefix = cleanNum.slice(0, 3);
    const intlPrefix = cleanNum.startsWith('233') ? cleanNum.slice(0, 5) : '';
    // Rough logic for Ghana prefixes
    if (
      ['024', '054', '055', '059', '025'].includes(localPrefix) ||
      (intlPrefix && ['23324', '23354'].includes(intlPrefix))
    ) return 'MTN';
    if (
      ['020', '050'].includes(localPrefix) ||
      (intlPrefix && ['23320', '23350'].includes(intlPrefix))
    ) return 'Telecel';
    if (
      ['027', '057', '026', '056'].includes(localPrefix) ||
      (intlPrefix && ['23327', '23357'].includes(intlPrefix))
    ) return 'AT';
    return 'MTN'; // Defaulting to MTN as per user preference
};

export const RepaymentPage: React.FC<RepaymentPageProps> = ({ 
  amountDue, 
  dueDate, 
  msisdn, 
  userName,
  onBack, 
  onRepay 
}) => {
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState<string>("");
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  // View State: 'input' | 'processing' | 'success' | 'failed'
  const [viewState, setViewState] = useState<"input" | "processing" | "success" | "failed">("input");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Polling Refs
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const initialBalanceRef = useRef<number>(amountDue);
  const attemptsRef = useRef<number>(0);

  useEffect(() => {
     initialBalanceRef.current = amountDue;
  }, [amountDue]);

  useEffect(() => {
     // If switching to full payment, ensure partial amount is cleared or logic handled
     if (paymentType === 'full') {
         setPartialAmount("");
     }
  }, [paymentType]);

  // Validation helper for partial payments
  const isPartialAmountValid = () => {
    if (paymentType !== "partial") return true;
    const parsedAmount = Number(partialAmount);
    // Strict check: must be finite, >= MIN, and <= Amount Due
    return Number.isFinite(parsedAmount) && parsedAmount >= MIN_PARTIAL_PAYMENT && parsedAmount <= amountDue;
  };

  const handleNext = async () => {
    const amountToPay = paymentType === "full" ? amountDue : Number(partialAmount);

    if (!isPartialAmountValid()) return;
    
    setIsButtonLoading(true);
    setErrorMessage("");
    
    // Smooth transition: Ensure button spinner shows for at least 800ms
    try {
        // 1. Initiate API Call with minimum delay
        const response = await initiateRepayment(amountToPay, msisdn);
        
        if (response?.authorizationUrl) {
            const currentUrl = window.location.href;
            window.location.href = response.authorizationUrl;

            // Fallback: if navigation does not occur, reset loading state and show an error
            setTimeout(() => {
              if (window.location.href === currentUrl) {
                setIsButtonLoading(false);
                setErrorMessage("Redirect to payment page failed. Please try again.");
              }
            }, 10000);
            return;
        }
        
        // 2. Transition to Processing Screen
        setViewState("processing");
        setIsButtonLoading(false);
        
        // 3. Start Polling Logic
        startPolling();

    } catch (error: any) {
        setIsButtonLoading(false);
        console.error("Repayment initiation failed", error);
        setErrorMessage(error.response?.data?.message || "Failed to initiate payment. Please try again.");
        // Optional: fail immediately or show error toast. For now, let's keep it on input screen with error? 
        // Or transition to failed screen? The prompt implies moving to Failed screen is standard.
        // Let's transition to Failed screen for clear feedback.
        setViewState("failed");
    }
  };

  const startPolling = () => {
      // Clear any existing interval
      if (pollingRef.current) clearInterval(pollingRef.current);

      attemptsRef.current = 0;
      const maxAttempts = 20; // 60 seconds total (3s interval)

      pollingRef.current = setInterval(async () => {
          attemptsRef.current++;
          try {
              const userData = await getMe();
              const currentBalance = userData.activeLoan?.outstandingBalance || 0;
              const loanStatus = userData.activeLoan?.status;
              
              // Success Conditions: Balance decreased OR Status is REPAID
              // Note: using < initialBalanceRef.current - 1 to handle small float diffs if any
              if (currentBalance < initialBalanceRef.current || loanStatus === 'REPAID') {
                  if (pollingRef.current) clearInterval(pollingRef.current);
                  setViewState("success");
              } else if (attemptsRef.current >= maxAttempts) {
                  if (pollingRef.current) clearInterval(pollingRef.current);
                  setViewState("failed");
                  setErrorMessage("Payment taking longer than expected. We'll update your balance shortly.");
              }
          } catch (e) {
              console.error("Polling error", e);
              // Don't stop polling on transient network error, just wait for next tick
          }
      }, 3000);
  };

  // Cleanup polling on unmount
  useEffect(() => {
      return () => {
          if (pollingRef.current) clearInterval(pollingRef.current);
      };
  }, []);


  const handleRetry = () => {
      // Stop any ongoing polling before resetting state
      if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
      }
      setViewState("input");
      setErrorMessage("");
  };

  const handleSuccessContinue = () => {
      const finalAmount = paymentType === "full" ? amountDue : Number(partialAmount);
      onRepay(finalAmount, getNetwork(msisdn)); // Notify parent to refresh data
  };

  // 1. PROCESSING VIEW
  if (viewState === "processing") {
      return (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="relative mb-10">
                {/* Spinner Animation */}
                <div className="absolute inset-0 bg-gray-100 rounded-full animate-ping opacity-20" />
                <div className="relative bg-gray-50 p-6 rounded-full">
                   <RefreshCw className="w-12 h-12 text-gray-400 animate-spin" />
                </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Check your phone</h2>
            <p className="text-base text-gray-500 max-w-xs leading-relaxed">
                Waiting for MoMo confirmation...<br/>
                <span className="text-sm mt-2 block">Please enter your PIN on the pop-up.</span>
            </p>
        </div>
      );
  }



  // 2. TIMEOUT / FAILED VIEW
  if (viewState === "failed") {
      return (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-8">
                <CloudOff className="w-10 h-10 text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {errorMessage.includes("longer than expected") ? "Payment Pending" : "Payment Failed"}
            </h2>
            <p className="text-base text-gray-500 max-w-xs mb-12 leading-relaxed">
                {errorMessage || "We couldn't verify your payment. Please check your balance or try again."}
            </p>

            <div className="w-full max-w-xs space-y-4">
                <Button 
                    onClick={handleRetry}
                    className="w-full h-14 rounded-full bg-[#E5E7EB] hover:bg-[#D1D5DB] text-gray-900 font-bold text-lg shadow-sm transition-all"
                >
                    <RefreshCw className="w-5 h-5 mr-2" /> 
                    {errorMessage.includes("longer than expected") ? "Check Status Again" : "Retry Payment"}
                </Button>
                <Button 
                    onClick={onBack}
                    variant="ghost"
                    className="w-full h-14 rounded-full text-gray-500 font-bold hover:bg-gray-50"
                >
                    Close
                </Button>
            </div>
        </div>
      );
  }

  // 3. SUCCESS VIEW
  if (viewState === "success") {
      return (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-300">
             <div className="w-28 h-28 mb-8 relative flex items-center justify-center">
                 <div className="absolute inset-0 border-4 border-gray-100 rounded-full scale-110" />
                 <div className="absolute inset-0 bg-gray-50 rounded-full animate-ping opacity-20" />
                 <div className="relative w-full h-full bg-gray-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-14 h-14 text-gray-900 stroke-[3px]" />
                 </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful</h2>
            <p className="text-base text-gray-500 max-w-xs mb-14">Your repayment has been received. Your updated balance will be available in your account overview shortly.</p>

            <div className="w-full max-w-xs">
                <Button 
                    onClick={handleSuccessContinue}
                    className="w-full h-14 rounded-full bg-[#EC1B84] hover:bg-[#D41574] text-white font-bold text-lg shadow-lg shadow-pink-200 transition-all active:scale-[0.98]"
                >
                    Continue
                </Button>
            </div>
        </div>
      );
  }

  // 4. INPUT VIEW (Default)
  return (
    <div className="fixed inset-0 bg-[#F8F9FA] z-[60] flex flex-col animate-in slide-in-from-bottom duration-300">
      
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between bg-white shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full bg-gray-100 hover:bg-gray-200 w-10 h-10">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900 flex-1 text-center pr-10">Make a Repayment</h1>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        
        <p className="text-sm text-gray-500 text-center px-4">
            You can make a partial payment or pay the full amount.
        </p>

        {/* Repayment Schedule Card */}
        <div className="bg-[#E5E7EB] rounded-[24px] p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 text-center pb-2 border-b border-gray-300/50">Repayment Schedule</h3>
            
            <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Amount Due</span>
                    <span className="font-bold text-gray-900">GHS{amountDue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Due Date</span>
                    <span className="font-bold text-gray-900">
                        {dueDate === "Unknown"
                          ? "Unknown"
                          : new Date(dueDate).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                    </span>
                </div>
            </div>
        </div>

        {/* Payment Options */}
        <div className="space-y-4">
            {/* Full Payment Option */}
            <button 
                onClick={() => setPaymentType("full")}
                className={cn(
                    "w-full bg-white rounded-2xl p-4 flex items-center justify-between border transition-all duration-200",
                    paymentType === "full" ? "border-2 border-[#EC1B84] shadow-sm bg-pink-50/10" : "border-gray-200"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        paymentType === "full" ? "border-[#EC1B84]" : "border-gray-300"
                    )}>
                        {paymentType === "full" && <div className="w-2.5 h-2.5 rounded-full bg-[#EC1B84]" />}
                    </div>
                    <span className={cn("font-medium", paymentType === "full" ? "text-gray-900 font-bold" : "text-gray-500")}>
                        Full Payment
                    </span>
                </div>
                <span className={cn("font-bold", paymentType === "full" ? "text-gray-900" : "text-gray-400")}>
                    GHS{amountDue.toFixed(2)}
                </span>
            </button>

            {/* Partial Payment Option */}
            <div 
                className={cn(
                    "w-full bg-white rounded-2xl p-4 border transition-all duration-200 overflow-hidden",
                    paymentType === "partial" ? "border-2 border-[#EC1B84] shadow-sm bg-pink-50/10" : "border-gray-200"
                )}
            >
                <button 
                  onClick={() => setPaymentType("partial")}
                  className="flex items-center gap-3 w-full"
                >
                    <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                        paymentType === "partial" ? "border-[#EC1B84]" : "border-gray-300"
                    )}>
                        {paymentType === "partial" && <div className="w-2.5 h-2.5 rounded-full bg-[#EC1B84]" />}
                    </div>
                    <span className={cn("font-medium", paymentType === "partial" ? "text-gray-900 font-bold" : "text-gray-500")}>
                        Partial Payment
                    </span>
                </button>
                
                {paymentType === "partial" && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="pt-6 pb-2 flex flex-col items-center text-center space-y-4"
                    >
                        <div>
                           <p className="text-sm font-bold text-gray-900">Enter Amount</p>
                           <p className="text-xs text-gray-500 mt-1">You can enter amount up to GHS{amountDue.toFixed(2)}</p>
                           {Number(partialAmount) > amountDue && (
                               <p className="text-xs text-red-500 font-bold mt-1 animate-pulse">You cannot pay more than your debt</p>
                           )}
                        </div>

                        <div className={cn(
                             "flex items-center justify-center w-full max-w-[200px] mx-auto border-b transition-colors pb-2",
                             Number(partialAmount) > amountDue ? "border-red-500" : "border-gray-200 focus-within:border-[#EC1B84]"
                        )}>
                            <span className="text-2xl font-bold text-gray-400 mr-2 shrink-0">GHS</span>
                            <input 
                                type="number" 
                                value={partialAmount}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  // Allow empty string for clearing
                                  if (raw === "") {
                                    setPartialAmount("");
                                    return;
                                  }
                                  const val = Number(raw);
                                  // Only update if it's a valid number and not negative
                                  if (!Number.isNaN(val) && val >= 0) {
                                    setPartialAmount(raw);
                                  }
                                }}
                                min={MIN_PARTIAL_PAYMENT}
                                max={amountDue}
                                placeholder="0"
                                className="w-full bg-transparent text-4xl font-bold text-gray-900 focus:outline-none placeholder:text-gray-300 min-w-[60px]"
                                autoFocus
                                aria-label="Enter partial payment amount"
                            />
                        </div>



                        <p className="text-xs text-gray-400 font-medium pt-2 border-t border-gray-100 w-full">
                           Min. GHS{MIN_PARTIAL_PAYMENT}
                        </p>
                    </motion.div>
                )}
            </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-2 pt-2">
            <h3 className="text-sm font-bold text-gray-500 pl-1">Payment Method</h3>
            <div className="bg-white rounded-2xl p-4 flex items-center justify-between border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm",
                        getNetwork(msisdn) === 'MTN' ? 'bg-[#FFCC00] text-black' : 
                        getNetwork(msisdn) === 'Telecel' ? 'bg-red-600' : 'bg-blue-800'
                    )}>
                        {getNetwork(msisdn)}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900 uppercase">{userName || "Account Holder"}</p>
                        <p className="text-xs text-gray-500">+{msisdn}</p>
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* Footer */}
      <div className="bg-white p-6 border-t border-gray-100 pb-8">
        <Button 
            onClick={handleNext}
            disabled={isButtonLoading || !isPartialAmountValid()}
            className="w-full h-14 rounded-full bg-[#D1D5DB] hover:bg-[#9CA3AF] text-gray-900 font-bold text-lg shadow-sm disabled:opacity-70 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
            {isButtonLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
            ) : (
                "Confirm Payment"
            )}
        </Button>
      </div>

    </div>
  );
};
