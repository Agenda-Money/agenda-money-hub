import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LoanStatusCard, LoanStatus } from "@/components/dashboard/LoanStatusCard";

interface UserDashboardProps {
  applicant: any;
  tierLimit?: number;
  onAction: (action: string) => void;
  notifications?: any[];
  recentActivity?: any[];
  isLoading?: boolean;
  activeLoanDetails?: any;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ applicant, tierLimit = 300, onAction, notifications = [], recentActivity = [], isLoading = false, activeLoanDetails }) => {

  const hasActiveLoan = !!activeLoanDetails;
  
  // New Backend Logic: Check flags from applicant summary or activeLoanDetails
  const summary = applicant?.summary || {};
  const isPending = summary.isPending || activeLoanDetails?.status === 'PENDING';
  const isOverdue = summary.isOverdue || activeLoanDetails?.isOverdue;
  const isActive = hasActiveLoan && !isPending && !isOverdue;
  const isEligible = !isActive && !isPending && !isOverdue;

  // Determine Main Feed Card Status
  let feedStatus: LoanStatus = "eligible";
  if (isPending) feedStatus = "review";
  else if (isOverdue) feedStatus = "overdue";
  else if (isActive) feedStatus = "active";
  else feedStatus = "eligible";

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
      <motion.div variants={item} className="relative group">
          {/* Glassmorphism Glow for Eligible State */}
          {feedStatus === 'eligible' && (
             <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-blue-500 rounded-[32px] opacity-20 group-hover:opacity-40 blur transition duration-1000 group-hover:duration-200"></div>
          )}
          
          <LoanStatusCard
            status={feedStatus}
            amount={
                isActive ? (activeLoanDetails?.outstandingBalance || 0) :
                isEligible ? tierLimit : 
                (activeLoanDetails?.outstandingBalance || 0)
            } 
            dueDate={activeLoanDetails?.dueDate ? new Date(activeLoanDetails.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : undefined}
            overdueDays={isOverdue ? (activeLoanDetails?.overdueDays || 1) : 0}
            progress={
                isActive ? 
                (activeLoanDetails?.repaymentProgress?.percentage ? (activeLoanDetails.repaymentProgress.percentage / 100) : 0) 
                : 0
            }
            onAction={onAction}
            className="shadow-sm relative bg-white"
          />
        </motion.div>

      {/* 2. PERMANENT: TIER PROGRESS */}
      <motion.div variants={item}>
         <LoanStatusCard
            status="progress"
            totalLoansRepaid={applicant?.summary?.totalLoansRepaid || 0}
            targetLoans={5} // Tier 1 target
            onAction={onAction}
            className="shadow-sm"
         />
      </motion.div>

      {/* 3. PERMANENT: NODE CODE */}
      <motion.div variants={item}>
         <LoanStatusCard
            status="node"
            nodeCode={applicant?.nodeCode}
            points={applicant?.tempWalletBalance || 0} // Using temp wallet as points/rewards placeholder
            onAction={() => onAction("share")}
            className="shadow-sm min-h-[130px]" 
         />
      </motion.div>

      {/* 4. RECENT ACTIVITY (New) */}
      <motion.div variants={item} className="space-y-3 pt-2">
         <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
            <button className="text-xs font-medium text-blue-600 hover:text-blue-700">View All</button>
         </div>
         
         <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden min-h-[100px]">
             {isLoading ? (
                 <div className="p-4 space-y-4">
                     {[1, 2].map((i) => (
                         <div key={i} className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />
                                 <div className="space-y-2">
                                     <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                                     <div className="h-2 w-16 bg-gray-50 rounded animate-pulse" />
                                 </div>
                             </div>
                             <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
                         </div>
                     ))}
                 </div>
             ) : recentActivity.length === 0 ? (
                 <div className="p-8 text-center text-gray-400 text-sm">
                     No recent activity
                 </div>
             ) : (
                 recentActivity.map((activity, index) => (
                    <div key={activity.id || index} className={cn("p-4 flex items-center justify-between", index !== recentActivity.length - 1 && "border-b border-gray-50")}>
                        <div className="flex items-center gap-3">
                           <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", activity.type === 'payment' ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500")}>
                              {activity.type === 'payment' ? <CheckCircle2 className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                           </div>
                           <div>
                              <p className="text-sm font-bold text-gray-900">{activity.title}</p>
                              <p className="text-xs text-gray-500">{activity.date}</p>
                           </div>
                        </div>
                        <span className={cn("text-sm font-bold", activity.amount > 0 ? "text-gray-900" : "text-green-600")}>
                            {activity.amount > 0 ? '+' : ''}GHS {Math.abs(activity.amount).toFixed(2)}
                        </span>
                    </div>
                 ))
             )}
         </div>
      </motion.div>

    </motion.div>
  );
};
