import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Send, Share2, Crown, Lock, Clock, CheckCircle2, Shield } from "lucide-react";

export type LoanStatus = "eligible" | "active" | "overdue" | "review" | "progress" | "node" | "awaiting_endorsement" | "kyc_awaiting";

interface LoanStatusCardProps {
  status: LoanStatus;
  amount?: number;
  dueDate?: string;
  overdueDays?: number;
  progress?: number;
  balance?: string | number;
  nodeCode?: string;
  points?: number;
  titleOverride?: string;
  subtextOverride?: string;
  totalLoansRepaid?: number;
  targetLoans?: number;
  activeTier?: { tier: number }; // Pass plain object or similar
  nextTierLimit?: number;
  isMaxTier?: boolean;
  cardColor?: 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'pink';
  onAction?: (action: string) => void;
  className?: string;
  loanRef?: string;
  step?: number;
  totalSteps?: number;
  estTime?: string;
}

export const LoanStatusCard: React.FC<LoanStatusCardProps> = ({
  status,
  amount = 0,
  dueDate,
  overdueDays,
  progress,
  balance,
  nodeCode,
  points,
  totalLoansRepaid = 0,
  targetLoans = 1,
  onAction,
  className,
  activeTier,
  nextTierLimit = 600,
  isMaxTier = false,
  cardColor,
  titleOverride,
  subtextOverride,
  loanRef,
  step = 1,
  totalSteps = 3,
  estTime = "under 30 mins"
}) => {
    
  // Configuration for each state
  const config: Record<LoanStatus, any> = {
    eligible: {
      title: "Get instant access to funds",
      subtext: "Fast approval, secure process.",
      icon: Send, 
      mainText: `Up to GHS ${amount}`,
      mainTextClass: "text-2xl sm:text-3xl font-extrabold tracking-tight text-[#EC1B84] mt-2 mb-1 whitespace-nowrap", 
      bottomText: null,
      bottomTextClass: null,
      buttonLabel: "Apply Now",
      buttonAction: "apply",
      bgClass: "bg-white border border-pink-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
      btnClass: "bg-[#EC1B84] text-white hover:bg-[#D41472] rounded-full px-8 py-3 text-sm font-bold shadow-lg shadow-pink-200 transform transition hover:scale-105",
    },
    review: {
      title: titleOverride || "Application under review",
      subtext: subtextOverride || "Awaiting admin approval",
      icon: Send,
      bgClass: "bg-white border border-gray-100 shadow-sm",
      customRender: () => {
        const progressPercent = (step / totalSteps) * 100;
        
        return (
          <div className="w-full space-y-4">
            {/* Top Badge & Status */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-100">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Under Review</span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 tracking-tight mt-1.5">
                  Application under review
                </h3>
              </div>
              <div className="p-3 rounded-2xl bg-pink-50 text-[#EC1B84]">
                <Send className="w-5 h-5" />
              </div>
            </div>

            <div className="h-px bg-gray-50 -mx-6" />

            {/* Loan Details Row */}
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loan Amount</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-gray-400">GHS</span>
                  <span className="text-3xl font-bold text-gray-800 tracking-tighter">
                    {amount ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                  </span>
                </div>
              </div>
            </div>

            {/* Approval Progress */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Approval Progress</span>
                <span className="text-[11px] font-bold text-[#EC1B84]">Step {step} of {totalSteps}</span>
              </div>
              
              {/* Progress Bar */}
              <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100/50">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${progressPercent}%` }}
                   className="h-full bg-gradient-to-r from-[#EC1B84] to-[#ff479d] rounded-full"
                />
              </div>

              {/* Timeline Indicator */}
              <div className="flex justify-between items-center relative px-2">
                <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-gray-100 -translate-y-1/2 z-0" />
                
                {[
                  { label: "Submitted", color: "text-emerald-500", active: step >= 1 },
                  { label: "Review", color: "text-[#EC1B84]", active: step >= 2 },
                  { label: "Approved", color: "text-gray-300", active: step >= 3 }
                ].map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 relative z-10">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors duration-500",
                      s.active 
                        ? i === 1 ? "bg-white border-[#EC1B84]" : "bg-emerald-500 border-emerald-500"
                        : "bg-white border-gray-100"
                    )}>
                      {i === 0 ? (
                         <div className="w-3 h-3 text-white fill-current"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6L9 17L4 12" /></svg></div>
                      ) : i === 1 ? (
                         <div className="w-1.5 h-1.5 rounded-full bg-[#EC1B84]" />
                      ) : (
                         <span className="text-[10px] font-bold text-gray-300">3</span>
                      )}
                    </div>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wide", s.active ? s.color : "text-gray-300")}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-50 -mx-6" />

            {/* Footer */}
            <div className="flex items-center gap-2 text-gray-400 pt-1">
              <Clock className="w-4 h-4 text-[#EC1B84]" />
              <span className="text-[11px] font-bold tracking-wide">Est. approval: {estTime}</span>
            </div>
          </div>
        );
      },
    },
    awaiting_endorsement: {
      title: "Awaiting Node Consent",
      subtext: "Waiting for Node approval",
      icon: Send,
      bgClass: "bg-white border border-pink-100 shadow-sm",
      customRender: () => {
        const progressPercent = (step / totalSteps) * 100;
        
        return (
          <div className="w-full space-y-4">
            {/* Top Badge & Status */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-100">
                  <div className="w-2 h-2 rounded-full bg-[#EC1B84] animate-pulse" />
                  <span className="text-[11px] font-bold text-[#EC1B84] uppercase tracking-wider">Pending Consent</span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 tracking-tight mt-1.5">
                  Awaiting Node Consent
                </h3>
                <p className="text-sm text-gray-400 font-medium">
                  Waiting for your Node to endorse this request
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-pink-50 text-[#EC1B84]">
                <Send className="w-5 h-5" />
              </div>
            </div>

            <div className="h-px bg-gray-50 -mx-6" />

            {/* Loan Details Row */}
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loan Amount</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-gray-400">GHS</span>
                  <span className="text-3xl font-bold text-gray-800 tracking-tighter">
                    {amount ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                  </span>
                </div>
              </div>
            </div>

            {/* Approval Progress */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Approval Progress</span>
                <span className="text-[11px] font-bold text-[#EC1B84]">Step {step} of {totalSteps}</span>
              </div>
              
              {/* Progress Bar */}
              <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100/50">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${progressPercent}%` }}
                   className="h-full bg-gradient-to-r from-[#EC1B84] to-[#ff479d] rounded-full"
                />
              </div>

              {/* Timeline Indicator */}
              <div className="flex justify-between items-center relative px-2">
                <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-gray-100 -translate-y-1/2 z-0" />
                
                {[
                  { label: "Submitted", color: "text-[#EC1B84]", icon: null, active: step >= 1 },
                  { label: "Review", color: "text-gray-300", icon: null, active: step >= 2 },
                  { label: "Approved", color: "text-gray-300", icon: null, active: step >= 3 }
                ].map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 relative z-10">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors duration-500",
                      s.active 
                        ? i === 0 ? "bg-white border-[#EC1B84]" : "bg-[#EC1B84] border-[#EC1B84]"
                        : "bg-white border-gray-100"
                    )}>
                      {i === 0 ? (
                         <div className="w-1.5 h-1.5 rounded-full bg-[#EC1B84]" />
                      ) : i === 1 ? (
                         <span className="text-[10px] font-bold text-gray-400">2</span>
                      ) : (
                         <span className="text-[10px] font-bold text-gray-400">3</span>
                      )}
                    </div>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wide", s.active ? s.color : "text-gray-300")}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-50 -mx-6" />

            {/* Footer */}
            <div className="flex items-center gap-2 text-gray-400 pt-1">
              <Clock className="w-4 h-4 text-[#EC1B84]" />
              <span className="text-[11px] font-bold tracking-wide">Est. approval: {estTime}</span>
            </div>
          </div>
        );
      },
    },
    kyc_awaiting: {
        title: "Identity Verification",
        subtext: "We need to verify your identity to keep your account safe and compliant.",
        icon: Shield,
        bgClass: "bg-[#EC1B84] text-white border-0 shadow-[0_20px_40px_rgba(236,27,132,0.25)]",
        customRender: () => (
           <div className="relative w-full h-full min-h-[180px] flex flex-col items-center justify-center text-center py-2 overflow-hidden">
               {/* Decorative Background Elements */}
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
               <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
               
               {/* Shield Icon in Dashed Circle */}
               <div className="relative mb-6">
                   <div className="absolute inset-0 scale-150 border border-dashed border-white/30 rounded-full animate-[spin_10s_linear_infinite]" />
                   <div className="relative w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-inner">
                       <Shield className="w-8 h-8 text-white" strokeWidth={1.5} />
                   </div>
               </div>

               {/* Text Content */}
               <div className="relative z-10 mb-6 px-4">
                   <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
                       Identity Verification
                   </h3>
                   <p className="text-sm text-white/80 font-medium leading-relaxed max-w-xs mx-auto">
                       We need to verify your identity to keep your account safe and compliant.
                   </p>
               </div>

               {/* Status Badge */}
               <div className="relative z-10 px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-2.5 shadow-sm">
                   <div className="relative flex h-2.5 w-2.5">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                       <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
                   </div>
                   <span className="text-sm font-bold text-white tracking-wide">Verification in progress</span>
               </div>
           </div>
        ),
    },
    active: {
      title: "Your Active Loan",
      subtext: "Outstanding Balance",
      mainText: `GHS ${amount.toFixed(2)}`,
      mainTextClass: "text-3xl font-bold tracking-tight text-gray-900",
      bottomText: `Due: ${dueDate || "Unknown"}`,
      buttonLabel: "Repay",
      buttonAction: "repay",
      bgClass: "bg-pink-50/50 border border-pink-100 shadow-sm",
      btnClass: "bg-[#EC1B84] text-white hover:bg-[#D41472] rounded-xl px-6 py-3 font-bold shadow-lg shadow-pink-200",
    },
    overdue: {
      title: "Payment Overdue",
      subtext: "Your loan repayment is past due",
      mainText: `GHS ${amount.toFixed(2)}`,
      mainTextClass: "text-3xl font-bold tracking-tight text-red-600",
      bottomText: overdueDays ? `Overdue by ${overdueDays} days` : "Payment is late",
      bottomTextClass: "text-red-600 font-medium",
      buttonLabel: "Repay Now",
      buttonAction: "repay",
      bgClass: "bg-red-50 border border-red-100",
      btnClass: "bg-red-600 text-white hover:bg-red-700 rounded-xl px-6 py-3 font-bold shadow-lg shadow-red-200 animate-pulse",
    },
    progress: {
        title: `Tier ${activeTier?.tier || 1} Status`,
        subtext: "Unlock higher limits",
        mainText: null, 
        bottomText: null,
        buttonLabel: null,
        bgClass: "bg-white border border-gray-100 relative overflow-hidden",
        icon: Crown,
        // Custom Render Logic for Progress Card (as function to use latest props)
        customRender: () => {
            const remaining = Math.max(0, (targetLoans || 0) - (totalLoansRepaid || 0));
            const progressPercentage = targetLoans && targetLoans > 0 
                ? Math.min(100, ((totalLoansRepaid || 0) / targetLoans) * 100) 
                : 0;
            
            return (
                <div className="w-full mt-2">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Limit</span>
                            <span className="text-xl font-bold text-gray-900">GHS {amount || 300}</span>
                        </div>

                        {isMaxTier && (
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-semibold text-green-600 uppercase tracking-wider flex items-center gap-1">
                                    Max Tier <Crown className="w-3 h-3" />
                                </span>
                                <span className="text-xl font-bold text-green-600">Reached!</span>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#EC1B84] to-[#ff479d]"
                        />
                    </div>

                    <div className="flex justify-end items-center mt-2 text-xs font-medium">
                        {!isMaxTier && (
                            <span className="text-[#EC1B84]">
                                {remaining <= 0 
                                    ? `You're ready for Tier ${(activeTier?.tier || 1) + 1}!`
                                    : `${remaining} full payment${remaining !== 1 ? "s" : ""} away from Tier ${(activeTier?.tier || 1) + 1}`
                                }
                            </span>
                        )}
                    </div>

                    <p className="text-xs text-gray-400 mt-3 text-center bg-gray-50 py-1.5 rounded-lg border border-gray-100">
                        {isMaxTier 
                            ? "Congratulations! You've reached the maximum tier!"
                            : "Repay your loan on time to unlock higher tier!"
                        }
                    </p>
                </div>
            );
        }
    },
    node: {
        title: "Node Code",
        subtext: "Share to earn rewards",
        mainText: nodeCode || "---",
        mainTextClass: "text-3xl font-mono font-bold tracking-wider text-primary",
        bottomText: null,
        buttonLabel: "Share Code",
        buttonAction: "share",
        bgClass: "bg-gray-50 border border-gray-100",
        btnClass: "bg-gray-900 text-white hover:bg-gray-800 rounded-full px-4 py-2 text-xs font-medium",
        icon: Share2,
    }
  };

  const current = config[status];
  const Icon = current.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "rounded-[32px] p-6 relative overflow-hidden flex flex-col justify-between min-h-[160px]",
        current.bgClass,
        className
      )}
      role="button"
      tabIndex={0}
      onClick={() => onAction && current.buttonAction && onAction(current.buttonAction)}
      onKeyDown={(e) => {
        if (!onAction || !current.buttonAction) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAction(current.buttonAction);
        }
      }}
    >
      {/* Top Section - Hide if customRender exists to avoid repetition */}
      {!current.customRender && (
        <div className="flex justify-between items-start mb-4 relative z-10">
           <div>
              <h3 className={cn("font-bold text-lg leading-tight", status === 'overdue' ? "text-red-900" : "text-gray-900")}>
                  {current.title}
              </h3>
              <p className={cn("text-sm mt-1", status === 'overdue' ? "text-red-700/80" : "text-gray-500")}>
                  {current.subtext}
              </p>
           </div>
           {Icon && <div className={cn("p-2 rounded-full", status === 'review' ? "bg-gray-200/50" : status === 'awaiting_endorsement' ? "bg-rose-100" : "bg-primary/10")}>
              <Icon className={cn("h-5 w-5", status ==='review' ? "text-gray-600" : status === 'awaiting_endorsement' ? "text-[#EC1B84]" : "text-primary")} />
           </div>}
        </div>
      )}

      {/* Middle/Bottom Section */}
      <div className="flex items-end justify-between relative z-10 w-full">
        {current.customRender ? (
            typeof current.customRender === 'function' ? current.customRender() : current.customRender
        ) : (
            <>
                <div className="flex-1 min-w-0 pr-3">
                   {current.mainText && <h4 className={cn("leading-none", current.mainTextClass)}>{current.mainText}</h4>}
                   {current.bottomText && <p className={cn("text-xs font-semibold mt-1", current.bottomTextClass || "text-gray-500")}>
                       {current.bottomText}
                   </p>}
                </div>

                {status === 'active' && typeof progress === 'number' ? (
                     <div 
                         className="relative w-16 h-16 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                         onClick={(e) => { e.stopPropagation(); onAction?.("repay"); }}
                     >
                         <svg className="w-full h-full transform -rotate-90">
                             <circle cx="32" cy="32" r="28" stroke="#F3F4F6" strokeWidth="4" fill="none" />
                             <motion.circle 
                                cx="32" cy="32" r="28" 
                                stroke="#EC1B84" 
                                strokeWidth="4" 
                                fill="none" 
                                strokeDasharray={2 * Math.PI * 28}
                                initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - (progress || 0)) }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                strokeLinecap="round"
                             />
                         </svg>
                         <span className="absolute text-xs font-bold text-gray-900">{Math.round((progress || 0) * 100)}%</span>
                     </div>
                ) : (
                    current.buttonLabel && (
                      <button 
                        className={current.btnClass}
                        onClick={(e) => {
                            e.stopPropagation();
                            onAction && current.buttonAction && onAction(current.buttonAction);
                        }}
                      >
                            {current.buttonLabel}
                      </button>
                    )
                )}
            </>
        )}
      </div>
    </motion.div>
  );
};
