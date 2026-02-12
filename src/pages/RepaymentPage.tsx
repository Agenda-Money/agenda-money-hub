import React, { useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface RepaymentPageProps {
  amountDue: number;
  dueDate: string;
  msisdn: string;
  onBack: () => void;
  onRepay: (amount: number, method: string) => void;
}

export const RepaymentPage: React.FC<RepaymentPageProps> = ({ 
  amountDue, 
  dueDate, 
  msisdn, 
  onBack, 
  onRepay 
}) => {
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleNext = () => {
    setIsProcessing(true);
    // Simulate API call or processing delay
    setTimeout(() => {
        setIsProcessing(false);
        const finalAmount = paymentType === "full" ? amountDue : Number(partialAmount);
        onRepay(finalAmount, "MTN Mobile Money");
    }, 1500);
  };

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
                    <span className="font-bold text-gray-900">GHS{amountDue}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Due Date</span>
                    <span className="font-bold text-gray-900">{dueDate}</span>
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
                    paymentType === "full" ? "border-2 border-gray-900 shadow-sm" : "border-gray-200"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        paymentType === "full" ? "border-gray-900" : "border-gray-300"
                    )}>
                        {paymentType === "full" && <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />}
                    </div>
                    <span className={cn("font-medium", paymentType === "full" ? "text-gray-900 font-bold" : "text-gray-500")}>
                        Full Payment
                    </span>
                </div>
                <span className={cn("font-bold", paymentType === "full" ? "text-gray-900" : "text-gray-400")}>
                    GHS{amountDue}
                </span>
            </button>

            {/* Partial Payment Option */}
            <div 
                className={cn(
                    "w-full bg-white rounded-2xl p-4 border transition-all duration-200 overflow-hidden",
                    paymentType === "partial" ? "border-2 border-gray-900 shadow-sm" : "border-gray-200"
                )}
            >
                <button 
                  onClick={() => setPaymentType("partial")}
                  className="flex items-center gap-3 w-full"
                >
                    <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                        paymentType === "partial" ? "border-gray-900" : "border-gray-300"
                    )}>
                        {paymentType === "partial" && <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />}
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
                           <p className="text-xs text-gray-500 mt-1">You can enter amount up to GHS{amountDue}</p>
                        </div>

                        <div className="relative w-full max-w-[140px] mx-auto">
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">GHS</span>
                            <input 
                                type="number" 
                                value={partialAmount}
                                onChange={(e) => setPartialAmount(e.target.value)}
                                placeholder="0"
                                className="w-full bg-transparent border-b border-gray-200 text-center text-4xl font-bold text-gray-900 focus:outline-none focus:border-gray-900 pb-2 placeholder:text-gray-300"
                                autoFocus
                            />
                        </div>

                        <p className="text-xs text-gray-400 font-medium pt-2 border-t border-gray-100 w-full">
                           Min. GHS5
                        </p>
                    </motion.div>
                )}
            </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-2">Payment Method</h3>
            <div className="bg-white rounded-2xl p-4 flex items-center justify-between border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#FFD700] rounded-lg flex items-center justify-center text-[10px] font-bold text-gray-900 shrink-0">
                        MTN
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900 uppercase">ENOCK QUEENSON</p>
                        <p className="text-xs text-gray-500">+{msisdn}</p>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
        </div>

      </div>

      {/* Footer */}
      <div className="bg-white p-6 border-t border-gray-100 pb-8">
        <Button 
            onClick={handleNext}
            disabled={isProcessing || (paymentType === "partial" && (!partialAmount || Number(partialAmount) <= 0))}
            className="w-full h-14 rounded-full bg-[#D1D5DB] hover:bg-[#9CA3AF] text-gray-900 font-bold text-lg shadow-sm disabled:opacity-70 transition-all"
        >
            {isProcessing ? "Processing..." : (paymentType === "partial" ? "Confirm Payment" : "Next")}
        </Button>
      </div>

    </div>
  );
};
