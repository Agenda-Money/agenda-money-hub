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

  // Determine Main Feed Card Status
  let feedStatus: LoanStatus | null = null;
  if (isEligible) feedStatus = "eligible";
  if (isActive) feedStatus = "active";
  if (isOverdue) feedStatus = "overdue";
  if (isPending) feedStatus = "review";

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
      {/* 1. DYNAMIC ACTION FEED (Top Card) */}
      {feedStatus && (
        <motion.div variants={item}>
          <LoanStatusCard
            status={feedStatus}
            amount={applicant?.activeLoan?.outstandingBalance || 300} // Mock/Real data
            dueDate={applicant?.activeLoan?.dueDate ? new Date(applicant.activeLoan.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : undefined}
            overdueDays={isOverdue ? 5 : 0} // Mock or calc
            progress={applicant?.activeLoan?.progress || 0.4}
            onAction={onAction}
            className="shadow-sm"
          />
        </motion.div>
      )}

      {/* 2. PERMANENT: TIER PROGRESS */}
      <motion.div variants={item}>
         <LoanStatusCard
            status="progress"
            totalLoansRepaid={applicant?.totalLoansRepaid || 0}
            targetLoans={1} // Tier 1 target
            onAction={onAction}
            className="shadow-sm"
         />
      </motion.div>

      {/* 3. PERMANENT: NODE CODE */}
      <motion.div variants={item}>
         <LoanStatusCard
            status="node"
            nodeCode={applicant?.nodeCode}
            points={applicant?.points || 0}
            onAction={() => onAction("share")}
            className="shadow-sm min-h-[130px]" 
         />
      </motion.div>

    </motion.div>
  );
};
