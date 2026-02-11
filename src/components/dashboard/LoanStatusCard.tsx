import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type LoanStatus = "eligible" | "active" | "overdue" | "review" | "progress" | "node";

interface LoanStatusCardProps {
  status: LoanStatus;
  amount?: number;
  dueDate?: string;
  overdueDays?: number;
  progress?: number;
  balance?: string | number;
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
  onAction,
  className,
}) => {
    
  // Configuration for each state
  const config: Record<LoanStatus, any> = {
    eligible: {
      title: "Apply for Your First Loan",
      subtext: "Get instant access to funds up to your limit",
      mainText: `₵${amount}`,
      mainTextClass: "text-4xl font-bold tracking-tight text-gray-900",
      bottomText: null,
      buttonLabel: "Apply for loan",
      buttonAction: "apply",
      bgClass: "bg-[#E2E2E2]",
    },
    active: {
      title: "Your Active Loan",
      subtext: "Outstanding Balance",
      mainText: `₵${amount}`,
      mainTextClass: "text-4xl font-bold tracking-tight text-gray-900",
      bottomText: `Due: ${dueDate || "Unknown"}`,
      buttonLabel: "Repay",
      buttonAction: "repay",
      bgClass: "bg-[#E2E2E2]",
    },
    overdue: {
      title: "Payment Overdue",
      subtext: "Your loan repayment is past due",
      mainText: `₵${amount}`,
      mainTextClass: "text-4xl font-bold tracking-tight text-gray-900",
      bottomText: overdueDays ? `Overdue by ${overdueDays} days` : "Payment is late",
      bottomTextClass: "text-red-600 font-medium",
      buttonLabel: "Repay Now",
      buttonAction: "repay",
      bgClass: "bg-[#E2E2E2]",
    },
    review: {
      title: "Loan application",
      subtext: "We're reviewing your application",
      mainText: "Under review...",
      mainTextClass: "text-2xl font-bold text-gray-900",
      bottomText: "Check back in a few minutes",
      buttonLabel: "Check Status",
      buttonAction: "status",
      bgClass: "bg-[#E2E2E2]",
    },
    progress: {
        title: "Tier Progress",
        subtext: "Reach & Earn",
        mainText: "0/1", // Or "Level 1"
        mainTextClass: "text-4xl font-bold tracking-tight text-gray-900",
        bottomText: "Complete 1 loan to level up",
        buttonLabel: "Details", // Or no button? User said "look like" so maybe a button or just visual consistency.
        buttonAction: "progress",
        bgClass: "bg-[#E2E2E2]",
    },
    node: {
        title: "Node Code",
        subtext: "Share to earn rewards",
        mainText: `₵${balance || "0.00"}`,
        mainTextClass: "text-4xl font-bold tracking-tight text-gray-900",
        bottomText: "Lifetime Earnings",
        buttonLabel: "Share Code",
        buttonAction: "share",
        bgClass: "bg-[#E2E2E2]",
    }
  };

  const current = config[status];

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "rounded-[32px] p-6 relative overflow-hidden flex flex-col justify-between min-h-[160px]",
        current.bgClass,
        className
      )}
      onClick={() => onAction && onAction(current.buttonAction)}
    >
      {/* Top Section */}
      <div className="flex justify-between items-start mb-4 relative z-10">
         <div>
            <h3 className="font-bold text-lg text-gray-900 leading-tight">{current.title}</h3>
            <p className="text-gray-500 text-sm mt-1">{current.subtext}</p>
         </div>
      </div>

      {/* Middle/Bottom Section */}
      <div className="flex items-end justify-between relative z-10">
         <div>
            <div className={current.mainTextClass}>
                {current.mainText}
            </div>
            {current.bottomText && (
                <p className={cn("text-xs text-gray-500 mt-1", (current as any).bottomTextClass)}>
                    {current.bottomText}
                </p>
            )}
         </div>

         {/* Button (Optional based on state, but consistency requested) */}
         <button 
           className="px-6 py-3 rounded-2xl bg-gray-400/20 hover:bg-gray-400/30 text-gray-900 font-bold text-sm transition-colors backdrop-blur-sm border border-black/5"
         >
            {current.buttonLabel}
         </button>
      </div>

      {/* Progress Bar (Specific for progress state) */}
      {status === 'progress' && typeof progress === 'number' && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-300/50">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} 
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-[#EC1B84]" 
          />
        </div>
      )}
    </motion.div>
  );
};
