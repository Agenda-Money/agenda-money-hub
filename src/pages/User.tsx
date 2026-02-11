import React from "react";
import { motion } from "framer-motion";
import { HandCoins, TrendingUp, ChevronRight } from "lucide-react";
import { ActionCard } from "@/components/dashboard/ActionCard";
import { LoanStatusCard, LoanStatus } from "@/components/dashboard/LoanStatusCard";

interface UserDashboardProps {
  applicant: any;
  loanStatus: string; // ELIGIBLE, PENDING, ACTIVE, OVERDUE, PENDING_VERIFICATION
  onAction: (action: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ applicant, loanStatus, onAction }) => {

  const isEligible = loanStatus === "ELIGIBLE";
  const isActive = loanStatus === "ACTIVE";
  const isOverdue = loanStatus === "OVERDUE";
  const isPending = loanStatus === "PENDING" || loanStatus === "PENDING_VERIFICATION";

  // Determine Loan Card Status
  let cardStatus: LoanStatus | null = null;
  if (isEligible) cardStatus = "eligible";
  if (isActive) cardStatus = "active";
  if (isOverdue) cardStatus = "overdue";
  if (isPending) cardStatus = "review";

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4 pb-32"
    >
      {/* 1. PRIMARY LOAN STATUS CARD */}
      {cardStatus && (
        <motion.div variants={item}>
          <LoanStatusCard
            status={cardStatus}
            amount={isActive || isOverdue ? 270 : 300} // Mock Logic
            dueDate="24 Feb 2026"
            overdueDays={isOverdue ? 5 : 0}
            onAction={onAction}
            className="shadow-sm"
          />
        </motion.div>
      )}

      {/* 2. PROGRESS TRACKER */}
      <motion.div variants={item}>
         <LoanStatusCard
            status="progress"
            progress={0.1}
            onAction={onAction}
            className="shadow-sm"
         />
      </motion.div>

      {/* 3. NODE CODE / WALLET */}
      <motion.div variants={item}>
         <LoanStatusCard
            status="node"
            balance={applicant?.walletBalance}
            onAction={() => onAction("share")}
            className="shadow-sm min-h-[130px]" // User requested "less a bit"
         />
      </motion.div>

    </motion.div>
  );
};
