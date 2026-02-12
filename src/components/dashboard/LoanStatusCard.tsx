import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Send, Share2, TrendingUp } from "lucide-react";

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
        title: "Tier Progress",
        subtext: "Reach & Earn", // "Reach & Earn"
        mainText: `${totalLoansRepaid}/${targetLoans}`, 
        mainTextClass: "text-3xl font-bold tracking-tight text-gray-900",
        bottomText: "Complete 1 loan to level up",
        buttonLabel: null,
        bgClass: "bg-gray-50 border border-gray-100",
        icon: TrendingUp,
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
      <div className="flex items-end justify-between relative z-10">
         <div>
            {current.mainText && (
                <div className={cn("relative z-10", current.mainTextClass)}>
                    {current.mainText}
                </div>
            )}
            
            {current.bottomText && (
                <p className={cn(
                    "text-xs mt-1", 
                    status === 'node' && points && points > 0 
                        ? "inline-block bg-green-100/80 text-green-700 px-2 py-0.5 rounded-md font-bold mt-2" 
                        : "text-gray-500",
                    (current as any).bottomTextClass
                )}>
                    {/* Badge for Tier Progress if complete */}
                    {status === 'progress' && totalLoansRepaid >= targetLoans 
                        ? <span className="inline-block bg-[#EC1B84] text-white px-2 py-0.5 rounded-md font-bold animate-pulse">Tier 2 Unlocked!</span>
                        : current.bottomText}
                </p>
            )}
         </div>

         {/* Active Loan Circular Ring (Replacing Icon/Button area if active) */}
         {status === 'active' && typeof progress === 'number' ? (
             <div className="relative w-16 h-16 flex items-center justify-center">
                 {/* Background Circle */}
                 <svg className="w-full h-full transform -rotate-90">
                     <circle cx="32" cy="32" r="28" stroke="#F3F4F6" strokeWidth="4" fill="none" />
                     {/* Progress Circle */}
                     <motion.circle 
                        cx="32" cy="32" r="28" 
                        stroke="#EC1B84" 
                        strokeWidth="4" 
                        fill="none" 
                        strokeDasharray={2 * Math.PI * 28}
                        initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - progress) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        strokeLinecap="round"
                     />
                 </svg>
                 <span className="absolute text-xs font-bold text-gray-900">{Math.round(progress * 100)}%</span>
             </div>
         ) : (
             /* Standard Button */
             current.buttonLabel && (
                <button className={current.btnClass}>
                   {current.buttonLabel}
                </button>
             )
         )}
      </div>

      {/* Progress Bar (Tier Progress - Horizontal) */}
      {status === 'progress' && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-100">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${Math.min(100, Math.max(0, (totalLoansRepaid / targetLoans) * 100))}%` }} 
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-[#EC1B84]" 
          />
        </div>
      )}
    </motion.div>
  );
};
