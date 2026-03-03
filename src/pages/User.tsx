import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LoanStatusCard, LoanStatus } from "@/components/dashboard/LoanStatusCard";
import { Wallet, CheckCircle2 } from "lucide-react";
import { TIERS, getTierByLevel } from "@/lib/constants";
import { format } from "date-fns";

interface UserDashboardProps {
  applicant: any;
  tierLimit?: number;
  onAction: (action: string) => void;
  notifications?: any[];
  recentActivity?: any[];
  isLoading?: boolean;
  activeLoanDetails?: any;
  loanStatus?: string;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ applicant, tierLimit = 300, onAction, notifications = [], recentActivity = [], isLoading = false, activeLoanDetails, loanStatus }) => {

  const [showAllActivity, setShowAllActivity] = useState(false);

  useEffect(() => {
    if (showAllActivity) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showAllActivity]);

  const hasActiveLoan = !!activeLoanDetails;
  
  // New Backend Logic: Check flags from applicant summary or activeLoanDetails
  const summary = applicant?.summary || {};
  const isPending = summary.isPending || activeLoanDetails?.status === 'PENDING' || activeLoanDetails?.status === 'AWAITING_ENDORSEMENT';
  const isOverdue = summary.isOverdue || activeLoanDetails?.isOverdue;
  const isActive = hasActiveLoan && !isPending && !isOverdue;
  const isEligible = !isActive && !isPending && !isOverdue;
  
  const isGraduatedNode = 
    applicant?.isGraduatedNode === true || 
    applicant?.isGraduatedNode === "true" ||
    (applicant as any)?.user?.isGraduatedNode === true;

  if (import.meta.env.DEV) {
    console.log("[UserDashboard] rendering - applicant:", applicant, "isGraduatedNode:", isGraduatedNode);
  }

  // Determine Main Feed Card Status
  let feedStatus: LoanStatus = "eligible";
  const currentLoanStatus = (loanStatus || activeLoanDetails?.status || summary?.status || "").toUpperCase();

  if (currentLoanStatus === 'AWAITING_ENDORSEMENT') {
      feedStatus = "awaiting_endorsement";
  } else if (isPending || currentLoanStatus === 'PENDING') {
      feedStatus = "review";
  } else if (isOverdue || currentLoanStatus === 'OVERDUE') {
      feedStatus = "overdue";
  } else if (isActive || currentLoanStatus === 'ACTIVE') {
      feedStatus = "active";
  } else {
      feedStatus = "eligible";
  }

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

  const activeTierLevel = Number(applicant?.currentTier || 1);
  const isMaxTier = activeTierLevel >= TIERS[TIERS.length - 1].level;
  const currentTierConfig = getTierByLevel(activeTierLevel);
  const nextTierConfig = isMaxTier ? null : getTierByLevel(activeTierLevel + 1);
  
  // Tier progression logic: To advance from tier N to tier N+1, complete N total loan repayments
  // Example: Tier 1 requires 1 repayment, Tier 2 requires 2 total repayments, etc.
  const totalRepaid = applicant?.summary?.totalLoansRepaid || 0;
  const targetLoans = activeTierLevel;

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
                isActive || feedStatus === 'overdue' ? (activeLoanDetails?.outstandingBalance || 0) :
                isEligible ? currentTierConfig.maxAmount : 
                (activeLoanDetails?.outstandingBalance || 0)
            } 
            dueDate={activeLoanDetails?.dueDate ? new Date(activeLoanDetails.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : undefined}
            overdueDays={(() => {
              if (!isOverdue) return undefined;
              if (typeof activeLoanDetails?.daysRemaining === "number" && activeLoanDetails.daysRemaining < 0)
                return Math.abs(activeLoanDetails.daysRemaining);
              if (typeof activeLoanDetails?.overdueDays === "number")
                return activeLoanDetails.overdueDays;
              return undefined;
            })()}
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
            totalLoansRepaid={totalRepaid}
            targetLoans={targetLoans}
            amount={currentTierConfig.maxAmount}
            nextTierLimit={nextTierConfig?.maxAmount}
            activeTier={{ tier: activeTierLevel }}
            isMaxTier={isMaxTier}
            onAction={onAction}
            className="shadow-sm"
         />
      </motion.div>

      {/* 3. PERMANENT: NODE CODE */}
      {isGraduatedNode && (
         <motion.div variants={item}>
            <LoanStatusCard
               status="node"
               nodeCode={(applicant as any)?.personalNodeCode || (applicant as any)?.user?.personalNodeCode || applicant?.nodeCode}
               points={applicant?.tempWalletBalance || 0} // Using temp wallet as points/rewards placeholder
               onAction={() => onAction("share")}
               className="shadow-sm min-h-[130px]" 
            />
         </motion.div>
      )}

      {/* 4. RECENT ACTIVITY (New) */}
      <motion.div variants={item} className="space-y-3 pt-2">
         <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
            {recentActivity.length > 5 && (
               <button 
                  onClick={() => setShowAllActivity(true)} 
                  className="text-xs font-medium text-[#EC1B84] hover:text-[#EC1B84]/80 transition-colors"
               >
                  View All
               </button>
            )}
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
                 recentActivity.slice(0, 5).map((activity, index) => {
                    const isPayment = activity.type?.toLowerCase() === 'payment';
                    const displayDate = activity.date 
                        ? format(new Date(activity.date), "dd MMM yyyy, h:mm a")
                        : "Unknown Date";
                        
                    return (
                        <div key={activity.id || index} className={cn("p-4 flex items-center justify-between", index !== recentActivity.slice(0, 5).length - 1 && "border-b border-gray-50")}>
                            <div className="flex items-center gap-3">
                               <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", isPayment ? "bg-[#EC1B84]/10 text-[#EC1B84]" : "bg-green-50 text-green-600")}>
                                  {isPayment ? <Wallet className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-gray-900">{activity.title}</p>
                                  <p className="text-xs text-gray-500">{displayDate}</p>
                               </div>
                            </div>
                            <span className={cn("text-sm font-bold", isPayment ? "text-[#EC1B84]" : "text-green-600")}>
                                {isPayment ? '-' : '+'}GHS {Math.abs(activity.amount).toFixed(2)}
                            </span>
                        </div>
                    );
                 })
             )}
         </div>
      </motion.div>

      {/* MODAL FOR ALL ACTIVITY */}
      {showAllActivity && createPortal(
         <div className="fixed inset-0 z-[100] flex flex-col bg-gray-50/95 backdrop-blur-sm sm:items-center sm:justify-center animate-in fade-in duration-200">
            <div className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-md bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
               
               {/* Modal Header */}
               <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                  <h3 className="text-lg font-bold text-gray-900">All Recent Activity</h3>
                  <button 
                     onClick={() => setShowAllActivity(false)}
                     className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                  >
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
               </div>

               {/* Modal Content */}
               <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24 sm:pb-4">
                  {recentActivity.map((activity, index) => {
                     const isPayment = activity.type?.toLowerCase() === 'payment';
                     const displayDate = activity.date 
                        ? format(new Date(activity.date), "dd MMM yyyy, h:mm a")
                        : "Unknown Date";
                        
                     return (
                        <div key={activity.id || index} className="p-4 flex items-center justify-between bg-white rounded-2xl border border-gray-50 shadow-sm">
                              <div className="flex items-center gap-3">
                                 <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", isPayment ? "bg-[#EC1B84]/10 text-[#EC1B84]" : "bg-green-50 text-green-600")}>
                                    {isPayment ? <Wallet className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                                 </div>
                                 <div>
                                    <p className="text-sm font-bold text-gray-900">{activity.title}</p>
                                    <p className="text-xs text-gray-500">{displayDate}</p>
                                 </div>
                              </div>
                              <span className={cn("text-sm font-bold", isPayment ? "text-[#EC1B84]" : "text-green-600")}>
                                 {isPayment ? '-' : '+'}GHS {Math.abs(activity.amount).toFixed(2)}
                              </span>
                        </div>
                     );
                  })}
               </div>
            </div>
         </div>,
         document.body
      )}

    </motion.div>
  );
};
