import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Send, Share2, TrendingUp, Crown, Lock } from "lucide-react";

export type LoanStatus = "eligible" | "active" | "overdue" | "review" | "progress" | "node";

interface LoanStatusCardProps {
  status: LoanStatus;
  amount?: number;
  dueDate?: string;
  overdueDays?: number;
  progress?: number;
  balance?: string | number;
  nodeCode?: string;
  points?: number;
  totalLoansRepaid?: number;
  targetLoans?: number;
  activeTier?: { tier: number }; // Pass plain object or similar
  nextTierLimit?: number;
  onAction?: (action: string) => void;
  className?: string;
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
  nextTierLimit = 600
}) => {
    
  // Configuration for each state
  const config: Record<LoanStatus, any> = {
    eligible: {
      title: "Get instant access to funds",
      subtext: "Fast approval, secure process.",
      icon: Send, 
      mainText: `Up to GHS ${amount}`,
      mainTextClass: "text-3xl font-extrabold tracking-tight text-[#EC1B84] mt-2 mb-1", 
      bottomText: null,
      bottomTextClass: null,
      buttonLabel: "Apply Now",
      buttonAction: "apply",
      bgClass: "bg-white border border-pink-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
      btnClass: "bg-[#EC1B84] text-white hover:bg-[#D41472] rounded-full px-8 py-3 text-sm font-bold shadow-lg shadow-pink-200 transform transition hover:scale-105",
    },
    review: {
      title: "Application under review",
      subtext: "Check back in a few minutes",
      icon: Send,
      mainText: null,
      bottomText: null,
      buttonLabel: "Check Status",
      buttonAction: "status",
      bgClass: "bg-gray-50",
      btnClass: "bg-gray-200 text-gray-600 hover:bg-gray-300 rounded-lg px-4 py-2 text-xs font-medium",
    },
    active: {
      title: "Your Active Loan",
      subtext: "Outstanding Balance",
      mainText: `GHS ${amount.toFixed(2)}`,
      mainTextClass: "text-4xl font-bold tracking-tight text-gray-900",
      bottomText: `Due: ${dueDate || "Unknown"}`,
      buttonLabel: "Repay",
      buttonAction: "repay",
      bgClass: "bg-white border border-gray-100 shadow-sm",
      btnClass: "bg-[#EC1B84] text-white hover:bg-[#D41472] rounded-xl px-6 py-3 font-bold shadow-lg shadow-pink-200",
    },
    overdue: {
      title: "Payment Overdue",
      subtext: "Your loan repayment is past due",
      mainText: `GHS ${amount.toFixed(2)}`,
      mainTextClass: "text-4xl font-bold tracking-tight text-red-600",
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
        // Custom Render Logic for Progress Card
        customRender: (
            <div className="w-full mt-2">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Limit</span>
                        <span className="text-xl font-bold text-gray-900">GHS {amount || 300}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold text-[#EC1B84] uppercase tracking-wider flex items-center gap-1">
                            Next Limit <Lock className="w-3 h-3" />
                        </span>
                        <span className="text-xl font-bold text-gray-400">GHS {nextTierLimit}</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (totalLoansRepaid / targetLoans) * 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#EC1B84] to-[#ff479d]"
                    />
                </div>

                <div className="flex justify-between items-center mt-2 text-xs font-medium">
                    <span className="text-gray-600">
                        {totalLoansRepaid} / {targetLoans} Repayments
                    </span>
                    <span className="text-[#EC1B84]">
                        {Math.max(0, targetLoans - totalLoansRepaid)} full payment{Math.max(0, targetLoans - totalLoansRepaid) !== 1 ? "s" : ""} away from Tier {(activeTier?.tier || 1) + 1}
                    </span>
                </div>

                <p className="text-[10px] text-gray-400 mt-3 text-center bg-gray-50 py-1.5 rounded-lg border border-gray-100">
                    Repay your loan on time to unlock higher tier!
                </p>
            </div>
        )
    },
    node: {
        title: "Node Code",
        subtext: "Share to earn rewards",
        mainText: nodeCode || "---",
        mainTextClass: "text-3xl font-mono font-bold tracking-wider text-primary",
        bottomText: `${points || 0} Points Earned`,
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
      {/* Top Section */}
      <div className="flex justify-between items-start mb-4 relative z-10">
         <div>
            <h3 className={cn("font-bold text-lg leading-tight", status === 'overdue' ? "text-red-900" : "text-gray-900")}>
                {current.title}
            </h3>
            <p className={cn("text-sm mt-1", status === 'overdue' ? "text-red-700/80" : "text-gray-500")}>
                {current.subtext}
            </p>
         </div>
         {Icon && <div className={cn("p-2 rounded-full", status === 'review' ? "bg-gray-200/50" : "bg-primary/10")}>
            <Icon className={cn("h-5 w-5", status ==='review' ? "text-gray-600" : "text-primary")} />
         </div>}
      </div>

      {/* Middle/Bottom Section */}
      <div className="flex items-end justify-between relative z-10 w-full">
        {current.customRender ? (
            current.customRender
        ) : (
            <>
                <div>
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
