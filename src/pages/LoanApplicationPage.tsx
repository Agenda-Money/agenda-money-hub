import React, { useState } from "react";
import { ArrowLeft, Briefcase, Stethoscope, GraduationCap, Home, MoreHorizontal, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface LoanApplicationPageProps {
  tierLimit: number;
  onBack: () => void;
  onContinue: (data: { amount: number; tenure: number; purpose: string }) => void;
}

const PURPOSES = [
  { id: "Business", label: "Business", icon: Briefcase },
  { id: "Medical", label: "Medical", icon: Stethoscope },
  { id: "Education", label: "Education", icon: GraduationCap },
  { id: "Home", label: "Home", icon: Home },
  { id: "Other", label: "Other", icon: MoreHorizontal },
];

const TENURE_OPTIONS = [1, 5, 10, 14];

export const LoanApplicationPage: React.FC<LoanApplicationPageProps> = ({ tierLimit, onBack, onContinue }) => {
  const [amount, setAmount] = useState<number>(Math.max(50, Math.min(140, tierLimit)));
  const [tenure, setTenure] = useState<number>(10);
  const [purpose, setPurpose] = useState<string>("Business");

  return (
    <div className="h-screen bg-white flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <div className="px-6 pt-6 pb-2 flex items-center justify-between shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full bg-gray-100 hover:bg-gray-200 w-10 h-10">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900 flex-1 text-center pr-10">Loan Application</h1>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-10 pb-10">
        
        {/* Loan Amount Section (Hybrid Slider) */}
        <div className="space-y-14 mt-4">
           <div className="text-center space-y-1">
             <h2 className="text-lg font-bold text-gray-900">Loan Amount</h2>
             <p className="text-sm text-gray-500">You are eligible for loan up to GHS{tierLimit}</p>
           </div>

           <div className="relative px-2">
              {/* Tooltip Bubble */}
              <div className="absolute left-0 right-0 -top-12 flex justify-center pointer-events-none">
                  <div className="bg-slate-800 text-white font-bold text-xl py-2 px-6 rounded-2xl relative shadow-xl min-w-[100px] text-center">
                     <span>GHS{amount}</span>
                     <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-slate-800 rotate-45"></div>
                  </div>
              </div>

              {/* Slider */}
              <Slider 
                value={[amount]} 
                onValueChange={(vals) => setAmount(vals[0])} 
                max={tierLimit} 
                min={50} 
                step={10} 
                className="my-10 [&_[role=slider]]:bg-[#EC1B84] [&_[role=slider]]:border-[#EC1B84] [&_[role=slider]]:h-6 [&_[role=slider]]:w-6"
              />
              
              <div className="flex justify-between text-xs font-bold text-gray-300 -mt-6 px-1">
                 <span>GHS50</span>
                 <span>GHS{tierLimit}</span>
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
             {TENURE_OPTIONS.map((days) => {
               const isActive = tenure === days;
               return (
                 <button
                   key={days}
                   onClick={() => setTenure(days)}
                   className={cn(
                     "flex-1 py-3 px-1 rounded-full text-sm font-medium border transition-all duration-200",
                     isActive
                       ? "bg-slate-100 border-slate-300 text-slate-800 font-bold shadow-sm ring-1 ring-slate-200" 
                       : "bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50"
                   )}
                 >
                   {days} {days === 1 ? "day" : "days"}
                 </button>
               );
             })}
           </div>
           
           <p className="text-xs text-gray-400 pl-1">Interest per day is 0.5%</p>
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
                        ? "border-gray-800 border-2 bg-white text-gray-900 shadow-md transform scale-[1.02]" 
                        : "border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:bg-gray-50/50"
                    )}
                  >
                     <p.icon className={cn("w-5 h-5", isActive ? "text-gray-900" : "text-gray-400")} strokeWidth={isActive ? 2.5 : 2} />
                     <span className={cn("text-xs font-bold uppercase tracking-wide", isActive ? "text-gray-900" : "text-gray-400")}>
                       {p.label}
                     </span>
                  </button>
                );
              })}
           </div>
        </div>

        {/* Footer (Now inside scroll view) */}
        <div className="pt-8 pb-4">
          <div className="max-w-md mx-auto space-y-4">
             <div className="flex items-center justify-center gap-2 text-gray-400">
                <Info className="w-4 h-4" />
                <p className="text-xs font-medium">Earlier repayment reduces interest.</p>
             </div>
             
             <Button 
               onClick={() => onContinue({ amount, tenure, purpose })}
               disabled={!amount || !tenure || !purpose}
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
