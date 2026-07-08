import React, { useMemo, useState } from "react";
import { ArrowLeft, Briefcase, Stethoscope, GraduationCap, Home, MoreHorizontal, Info, Pencil, Plane, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface LoanApplicationPageProps {
  tierMin: number;
  tierMax: number;
  currentTier: number;
  tenureOptions: number[];
  onBack: () => void;
  onContinue: (data: { amount: number; tenure: number; purpose: string; nodeCode?: string }) => void;
  showNodeCode?: boolean;
  initialNodeCode?: string;
  initialAmount?: number;
  initialTenure?: number;
  initialPurpose?: string;
  errorMessage?: string | null;
  onErrorDismiss?: () => void;
}

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from "lucide-react";

const PURPOSES = [
  { id: "Business", label: "Business", icon: Briefcase },
  { id: "Medical", label: "Medical", icon: Stethoscope },
  { id: "Education", label: "Education", icon: GraduationCap },
  { id: "Home", label: "Home", icon: Home },
  { id: "Travel", label: "Travel", icon: Plane },
  { id: "Other", label: "Other", icon: MoreHorizontal },
];

export const LoanApplicationPage: React.FC<LoanApplicationPageProps> = ({ 
  tierMin,
  tierMax, 
  currentTier,
  tenureOptions,
  onBack, 
  onContinue, 
  showNodeCode, 
  initialNodeCode, 
  initialAmount, 
  initialTenure, 
  initialPurpose,
  errorMessage,
  onErrorDismiss
}) => {
  const roundedMax = Math.floor(tierMax / 50) * 50;

  const [amount, setAmount] = useState<number>(initialAmount || roundedMax);
  const [tenure, setTenure] = useState<number>(initialTenure || 0);
  const [purpose, setPurpose] = useState<string>(initialPurpose || "");
  const [nodeCode, setNodeCode] = useState<string>(initialNodeCode || "");

  const amountPresets = useMemo(() => {
    const raw = Array.from({ length: 5 }, (_, i) => roundedMax - i * 50).filter(
      (v) => v >= tierMin,
    );
    return Array.from(new Set(raw)).sort((a, b) => a - b);
  }, [tierMin, roundedMax]);


  return (
    <div className="h-screen bg-white flex flex-col relative overflow-hidden">
      
      {/* Error Modal */}
      <AlertDialog open={!!errorMessage} onOpenChange={(open) => !open && onErrorDismiss?.()}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-auto p-6">
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="space-y-1">
              <AlertDialogTitle className="text-center text-lg font-semibold text-gray-900">
                Action Required
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-sm text-gray-500 max-w-[260px] mx-auto">
                {errorMessage}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogAction 
              onClick={() => onErrorDismiss?.()}
              className="w-full h-11 rounded-full bg-gray-900 hover:bg-gray-800 text-white font-medium text-sm transition-all"
            >
              Dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Header */}
      <div className="px-6 pt-6 pb-2 flex items-center justify-between shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full bg-gray-100 hover:bg-gray-200 w-10 h-10">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900 flex-1 text-center pr-10">Loan Application</h1>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-10 pb-32">
        
        {/* Loan Amount Section (Hybrid Slider) */}
        <div className="space-y-8 mt-4">
           <div className="text-center space-y-1">
             <h2 className="text-lg font-bold text-gray-900">Loan Amount</h2>
             <p className="text-sm text-gray-500">You are eligible for loan up to GHS{tierMax}</p>
           </div>

           <div className="px-2 space-y-6">
              {/* Dynamic Input Amount Display */}
              <div className="flex justify-center">
                  <div className="relative group">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">GHS</span>
                     <input
                        type="number"
                        value={amount === 0 ? "" : amount}
                        onChange={(e) => {
                           const raw = e.target.value;
                           if (raw === "") {
                             setAmount(0);
                             return;
                           }
                           const val = Number(raw);
                           // Allow typing any number up to limit, clamp on blur
                           if (!Number.isNaN(val) && val <= tierMax) {
                             setAmount(val);
                           }
                        }}
                        onBlur={() => {
                           // Clamp on blur to ensure valid range
                           const clamped = Math.max(tierMin, Math.min(amount, tierMax));
                           setAmount(clamped);
                        }}
                        className="w-40 h-16 bg-gray-50 rounded-2xl text-center text-3xl font-bold text-gray-900 border-2 border-transparent focus:border-[#EC1B84] focus:bg-white outline-none transition-all pl-8 pr-4 shadow-sm"
                        aria-label="Enter loan amount"
                     />
                     <div className="absolute -right-3 -top-2 bg-white rounded-full p-1.5 shadow-sm border border-gray-100 pointer-events-none group-hover:scale-110 transition-transform">
                        <Pencil className="w-3 h-3 text-[#EC1B84]" />
                     </div>
                  </div>
              </div>

              {/* Quick Amount Presets */}
              <div className="flex justify-between gap-2">
                {amountPresets.map((preset) => {
                  const isActive = amount === preset;
                  return (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset)}
                      className={cn(
                        "flex-1 py-2.5 px-1 rounded-full text-xs font-bold border transition-all duration-200",
                        isActive
                          ? "bg-pink-50 border-[#EC1B84] text-[#EC1B84] shadow-sm ring-1 ring-[#EC1B84]/30"
                          : "bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      GHS{preset}
                    </button>
                  );
                })}
              </div>

              {/* Slider */}
              <div className="pt-2 pb-6">
                <Slider 
                  value={[Math.max(tierMin, amount)]} 
                  onValueChange={(vals) => setAmount(vals[0])} 
                  max={tierMax} 
                  min={tierMin} 
                  step={5} 
                  className="[&_[role=slider]]:bg-[#EC1B84] [&_[role=slider]]:border-[#EC1B84] [&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-pink-200"
                />
                
                <div className="flex justify-between text-xs font-bold text-gray-400 mt-3 px-1">
                  <span>Min: GHS{tierMin}</span>
                  <span>Max: GHS{tierMax}</span>
                </div>
              </div>
           </div>
        </div>

        {/* Loan Tenor Section */}
        <div className="space-y-4">
           <div className="space-y-1">
             <h2 className="text-md font-bold text-gray-900">Loan Tenor</h2>
             <p className="text-sm text-gray-500">Pick when you'll repay</p>
           </div>
           
           <div className="flex justify-between gap-3">
             {tenureOptions.map((days) => {
               const isActive = tenure === days;
               return (
                 <button
                   key={days}
                   onClick={() => setTenure(days)}
                   className={cn(
                     "flex-1 py-3 px-1 rounded-full text-sm font-medium border transition-all duration-200",
                     isActive
                       ? "bg-pink-50 border-[#EC1B84] text-[#EC1B84] font-bold shadow-sm ring-1 ring-[#EC1B84]/30" 
                       : "bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50"
                   )}
                 >
                   {days} {days === 1 ? "day" : "days"}
                 </button>
               );
             })}
           </div>
           
           <div className="space-y-1 mt-2">
               <div className="flex items-center gap-1.5 text-gray-400 pl-1">
                  <Info className="w-3.5 h-3.5" />
                  <p className="text-xs font-medium">Daily interest rate is 0.5%</p>
               </div>
               <div className="flex items-start gap-1.5 text-gray-400 pl-1 pt-1">
                  <Info className="w-3.5 h-3.5 mt-0.5" />
                  <p className="text-xs font-medium">Earlier repayment reduces interest.</p>
               </div>
           </div>
        </div>

        {/* Loan Purpose Section */}
        <div className="space-y-4">
           <h2 className="text-md font-bold text-gray-900">Loan Purpose</h2>
           
           <div className="grid grid-cols-2 gap-3">
              {PURPOSES.map((p) => {
                const isActive = purpose === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPurpose(p.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-200",
                      isActive
                        ? "border-[#EC1B84] border-2 bg-pink-50 text-[#EC1B84] shadow-md transform scale-[1.02]" 
                        : "border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:bg-gray-50/50"
                    )}
                  >
                     <p.icon className={cn("w-5 h-5", isActive ? "text-[#EC1B84]" : "text-gray-400")} strokeWidth={isActive ? 2.5 : 2} />
                     <span className={cn("text-xs font-bold uppercase tracking-wide", isActive ? "text-[#EC1B84]" : "text-gray-400")}>
                       {p.label}
                     </span>
                  </button>
                );
              })}
           </div>
        </div>

        {/* Node Code Section (Optional) */}
        {showNodeCode && (
           <div className="space-y-4">
               <div>
                   <h2 className="text-md font-bold text-gray-900">Node Code</h2>
                   <p className="text-sm text-gray-500">Enter a node code. We will confirm with the node owner.</p>
               </div>
               
                   <div className="relative w-full">
                      <input
                         type="text"
                         value={nodeCode}
                         onChange={(e) => setNodeCode(e.target.value.toUpperCase())}
                         placeholder="Enter Node Code"
                         className={cn(
                             "w-full h-14 rounded-2xl border px-4 font-mono text-center text-lg uppercase tracking-widest outline-none transition-all placeholder:normal-case placeholder:font-sans placeholder:text-gray-400 placeholder:text-sm placeholder:tracking-normal",
                             nodeCode.length >= 4 
                                 ? "border-[#EC1B84] bg-[#EC1B84]/10 focus:ring-1 focus:ring-[#EC1B84] text-[#EC1B84] font-bold" 
                                 : "border-gray-200 focus:border-[#EC1B84] focus:ring-1 focus:ring-[#EC1B84] text-gray-900"
                         )}
                         maxLength={10}
                      />
                   </div>
               {nodeCode.length > 0 && nodeCode.length < 4 && (
                   <p className="text-xs text-red-500 font-medium text-center">
                      Code must be at least 4 characters
                   </p>
               )}
           </div>
        )}

        {/* Footer (Now inside scroll view) */}
        <div className="pt-8 pb-4">
          <div className="max-w-md mx-auto space-y-4">
             <Button 
               onClick={() => {
                 const finalAmount = Math.max(tierMin, amount);
                 onContinue({ amount: finalAmount, tenure, purpose, ...(nodeCode && { nodeCode }) });
               }}
               disabled={!amount || !tenure || !purpose || (showNodeCode && nodeCode.length < 4)}
               className="w-full h-14 rounded-full bg-[#EC1B84] hover:bg-[#D41472] text-white font-bold text-lg uppercase tracking-widest shadow-lg shadow-pink-200 disabled:opacity-50 disabled:shadow-none transition-all"
             >
                Continue
             </Button>
          </div>
        </div>

      </div>

    </div>
  );
};
