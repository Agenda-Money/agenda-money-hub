import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";
import { TIERS } from "@/lib/constants";

interface CappedApplyCardProps {
  capAmount: number;
  onApply: (amount: number) => void;
  isLoading: boolean;
}

export const CappedApplyCard: React.FC<CappedApplyCardProps> = ({ capAmount, onApply, isLoading }) => {
  const minAmount = TIERS[0]?.minAmount || 50;
  const safeMin = Math.min(minAmount, capAmount); 
  const [selectedAmount, setSelectedAmount] = useState<number>(capAmount);

  return (
    <div className="bg-white rounded-[24px] border border-pink-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 space-y-5 animate-in slide-in-from-bottom-4 duration-500">
       <div className="text-center">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Available Offer</p>
          <div className="flex items-baseline justify-center gap-1 text-[#EC1B84]">
             <span className="text-lg font-bold">GHS</span>
             <span className="text-4xl font-extrabold tracking-tighter">{selectedAmount}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Pre-approved up to GHS {capAmount}. Apply instantly.</p>
       </div>

       <div className="px-2">
         <input 
           type="range" 
           min={safeMin} 
           max={capAmount} 
           step={50} 
           value={selectedAmount} 
           onChange={(e) => setSelectedAmount(Number(e.target.value))}
           className="w-full h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer"
           style={{ accentColor: '#EC1B84' }}
         />
         <div className="flex justify-between mt-2 text-xs text-gray-400 font-medium">
            <span>GHS {safeMin}</span>
            <span>GHS {capAmount}</span>
         </div>
       </div>

       <div className="border-t border-dashed border-gray-100"></div>

       <Button 
          onClick={() => onApply(selectedAmount)}
          disabled={isLoading}
          className="w-full h-14 rounded-full bg-[#EC1B84] hover:bg-[#D41472] text-white font-bold text-lg shadow-lg shadow-pink-200 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
       >
          {isLoading ? (
             <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Applying...
             </>
          ) : (
             <>
                Apply for GHS {selectedAmount}
                <ArrowRight className="w-5 h-5 ml-1" />
             </>
          )}
       </Button>
    </div>
  );
};

