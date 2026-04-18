import React, { useState } from "react";
import { parseDecisionError, DecisionError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CalendarClock, AlertCircle, ShieldAlert, ArrowLeft, Send } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { CappedApplyCard } from "./CappedApplyCard";

interface EligibilityBlockScreenProps {
  decision: DecisionError;
  onHome: () => void;
  onBack?: () => void;
  loanData?: any; // To pass through for capped apply if needed
  applicantAuthToken?: string;
}

export const EligibilityBlockScreen: React.FC<EligibilityBlockScreenProps> = ({ 
  decision, 
  onHome, 
  onBack,
  loanData,
  applicantAuthToken
}) => {
  const [isApplyingCapped, setIsApplyingCapped] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCappedApply = async (amount: number) => {
    try {
      setIsApplyingCapped(true);
      const payload = {
          amount: amount,
          tenureDays: loanData?.tenure || 30, // Or whatever was originally passed
          purpose: loanData?.purpose || "Emergency",
          isCappedFlow: true
      };
      
      await api.post(
          '/api/loans/apply-capped',
          payload,
          applicantAuthToken
          ? { headers: { Authorization: `Bearer ${applicantAuthToken}` } }
          : undefined
      );
      
      setSuccess(true);
      if (typeof window !== "undefined" && (window as any).telemetry) {
        (window as any).telemetry.track("capped_apply_submitted", { amount: amount });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit capped application.");
    } finally {
      setIsApplyingCapped(false);
    }
  };

  const handleSetReminder = () => {
    toast.success("Reminder Set!", { description: "We'll notify you when you are eligible to apply." });
    if (typeof window !== "undefined" && (window as any).telemetry) {
      (window as any).telemetry.track("reminder_set", { reason: decision.reasonCode });
    }
  };

  // SUCCESS SCREEN FOR CAPPED APPLY
  if (success) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                <Send className="w-8 h-8 text-gray-400 rotate-[-45deg] translate-x-1 translate-y-1" fill="currentColor" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
               Application under review
            </h2>
            <p className="text-gray-500 mb-10 text-sm max-w-[280px] mx-auto">
               Your capped loan application has been submitted and is currently under review.
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

  const renderIcon = () => {
    switch (decision.uiState) {
      case 'blacklisted':
        return <ShieldAlert className="w-12 h-12 text-red-500" />;
      case 'hard_block_date':
      case 'hard_block':
        return <CalendarClock className="w-12 h-12 text-orange-500" />;
      default:
        return <AlertCircle className="w-12 h-12 text-blue-500" />;
    }
  };

  const renderTitle = () => {
    switch (decision.uiState) {
        case 'soft_block': return "Limited offer available";
        case 'cap_state': return "Limited offer available";
        case 'hard_block': return "Limit reached";
        case 'hard_block_date': return "Not available yet";
        case 'blacklisted': return "Account restricted";
        default: return "Application Paused";
    }
  };

  const renderMessage = () => {
    switch (decision.uiState) {
        case 'soft_block':
        case 'cap_state': 
           return "You have a pre-approved offer right now.";
        case 'hard_block_date': 
           return "Your next loan will be ready on";
        case 'hard_block': 
           return "Try again on the specified date.";
        case 'blacklisted': 
           return "Please contact support for more details.";
        default: 
           return decision.message;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="px-6 pt-6 pb-2 flex items-center justify-between shrink-0">
         {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full bg-gray-100 hover:bg-gray-200 w-10 h-10">
                <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Button>
         )}
         <div className="flex-1" />
      </div>

      <div className="flex-1 flex flex-col px-6 pt-8 pb-32">
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center bg-white shadow-sm border border-gray-100`}>
                {renderIcon()}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
               {renderTitle()}
            </h1>
            <p className="text-gray-500 text-sm max-w-[280px]">
               {renderMessage()}
            </p>
        </div>

        {/* Dynamic Section Based on UI State */}
        <div className="mt-4">
            {(decision.uiState === 'soft_block' || decision.uiState === 'cap_state') && decision.capAmount ? (
                <CappedApplyCard 
                   capAmount={decision.capAmount} 
                   onApply={handleCappedApply} 
                   isLoading={isApplyingCapped}
                />
            ) : null}

            {(decision.uiState === 'hard_block_date' || decision.uiState === 'hard_block') && decision.displayDate ? (
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 text-center mt-6">
                    <p className="text-xs text-orange-600 font-bold uppercase tracking-wide mb-1">Available On</p>
                    <p className="text-xl font-bold text-orange-900">{decision.displayDate}</p>
                </div>
            ) : null}

            {decision.uiState === 'blacklisted' && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center mt-6">
                    <p className="text-sm text-red-900 font-medium">Contact support to resolve your account status.</p>
                </div>
            )}
        </div>

      </div>

      {/* Fixed Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white p-6 border-t border-gray-100 z-20">
         <div className="max-w-md mx-auto space-y-3 flex flex-col">
            {decision.uiState === 'hard_block_date' && (
                <Button 
                   onClick={handleSetReminder}
                   className="w-full h-14 rounded-full bg-gray-900 hover:bg-gray-800 text-white font-bold text-base shadow-lg shadow-gray-200 transition-all flex items-center justify-center mb-2"
                >
                   Remind me
                </Button>
            )}
            <Button 
              onClick={onHome}
              variant="outline"
              className="w-full h-14 rounded-full border-gray-200 text-gray-700 font-bold text-base hover:bg-gray-50 flex items-center justify-center transition-all bg-white"
            >
               Back to Dashboard
            </Button>
         </div>
      </div>
    </div>
  );
};
