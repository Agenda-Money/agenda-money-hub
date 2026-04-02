import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LoanStatusCard, LoanStatus } from "@/components/dashboard/LoanStatusCard";
import { Wallet, CheckCircle2, Clock, XCircle, Ban } from "lucide-react";
import { TIERS, getTierByLevel } from "@/lib/constants";
import { format } from "date-fns";
import { useWebSocketListener } from "@/hooks/useWebSocketListener";

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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const viewAllButtonRef = useRef<HTMLButtonElement>(null);

  const handleCloseModal = useCallback(() => {
    setShowAllActivity(false);
  }, []);

  useEffect(() => {
    if (showAllActivity) {
      document.body.style.overflow = "hidden";
      // Auto-focus the close button when modal opens
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    } else {
      document.body.style.overflow = "unset";
      // Return focus to the "View All" button when modal closes
      viewAllButtonRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showAllActivity]);

  // Escape key and focus trap for modal
  useEffect(() => {
    if (!showAllActivity) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseModal();
        return;
      }
      // Focus trap: keep Tab/Shift+Tab inside modal
      if (e.key === "Tab") {
        const modal = document.getElementById("all-activity-modal");
        if (!modal) return;
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showAllActivity, handleCloseModal]);

  const hasActiveLoan = !!activeLoanDetails;
  
  // New Backend Logic: Check flags from applicant summary or activeLoanDetails
  const summary = applicant?.summary || applicant?.activeLoan || {};
  const isKycVerified = applicant?.isKycVerified === true || applicant?.isKycVerified === "true" || (applicant as any)?.user?.isKycVerified === true;
  const isAwaitingEndorsement = summary.status === 'AWAITING_ENDORSEMENT' || activeLoanDetails?.status === 'AWAITING_ENDORSEMENT';
  const isPending = summary.isPending || (activeLoanDetails?.status === 'PENDING' && !isAwaitingEndorsement) || summary.status === 'PENDING' || loanStatus === 'PENDING' || applicant?.loanStatus === 'PENDING';
  const isOverdue = summary.isOverdue || activeLoanDetails?.isOverdue;
  const isActive = hasActiveLoan && !isPending && !isOverdue && !isAwaitingEndorsement;
  const isEligible = !isActive && !isPending && !isOverdue && !isAwaitingEndorsement;
  
  const isGraduatedNode = 
    applicant?.isGraduatedNode === true || 
    applicant?.isGraduatedNode === "true" ||
    (applicant as any)?.user?.isGraduatedNode === true;


  // Determine Main Feed Card Status
  let feedStatus: LoanStatus = "eligible";
  const currentLoanStatus = (loanStatus || activeLoanDetails?.status || summary?.status || applicant?.activeLoan?.status || "").toUpperCase();

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

  // Real-time WebSocket Logic
  const { latestLoanEvent, nodeEndorsedEvent } = useWebSocketListener(applicant?.msisdn);
  
  // Real-time overrides
  let cardColorOverride = undefined;
  let titleOverride = undefined;
  let subtextOverride = undefined;


  if (nodeEndorsedEvent && feedStatus === "awaiting_endorsement") {
      feedStatus = "review"; // Shift UI to review state instantly
      cardColorOverride = "pink";
      titleOverride = "Admin Review";
      subtextOverride = nodeEndorsedEvent.message || "Your loan has been endorsed. Now under admin review.";
  }

  if (latestLoanEvent) {
     if (['DISBURSING', 'ACTIVE'].includes(latestLoanEvent.status)) {
        if (feedStatus === "review" || feedStatus === "awaiting_endorsement") {
           feedStatus = latestLoanEvent.status === 'ACTIVE' ? "active" : "review";
           cardColorOverride = latestLoanEvent.cardColor;
           titleOverride = latestLoanEvent.status === 'ACTIVE' ? "Loan Active" : "Loan Approved!";
           subtextOverride = latestLoanEvent.message;
        }
     } else if (latestLoanEvent.status === 'REJECTED') {
        if (feedStatus === "review") {
           titleOverride = "Application Not Approved";
           subtextOverride = latestLoanEvent.message;
           cardColorOverride = "red";
        }
     }
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
                (activeLoanDetails?.principal || activeLoanDetails?.requestedAmount || activeLoanDetails?.amount || summary?.amount || activeLoanDetails?.outstandingBalance || 0)
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
            cardColor={cardColorOverride}
            titleOverride={titleOverride}
            subtextOverride={subtextOverride}
            loanRef={activeLoanDetails?.loanCode || activeLoanDetails?.id?.slice(-8)?.toUpperCase() || (applicant?.activeLoan as any)?.loanCode}
            step={feedStatus === "awaiting_endorsement" ? 1 : feedStatus === "review" ? 2 : 1}
            totalSteps={3}
            onAction={onAction}
            className="shadow-sm"
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

      {/* 3. RECENT ACTIVITY */}
      <motion.div variants={item} className="space-y-3 pt-2">
         <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
            {recentActivity.length > 5 && (
               <button 
                  ref={viewAllButtonRef}
                  onClick={() => setShowAllActivity(true)} 
                  className="text-xs font-medium text-[#EC1B84] hover:text-[#EC1B84]/80 transition-colors"
                  aria-label="View all recent activity"
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
                         recentActivity
                            .slice(0, 5)
                            .map((activity, index) => {
                                const isPayment = activity.type?.toLowerCase() === 'payment';
                                const s = (activity.status || '').toUpperCase();
                                const isPendingActivity = ['AWAITING_ENDORSEMENT', 'PENDING', 'PENDING_VERIFICATION'].includes(s);
                                const isDisbursing = s === 'DISBURSING';

                                const displayDate = activity.date
                                   ? format(new Date(activity.date), "dd MMM yyyy, h:mm a")
                                   : "Unknown Date";
                                 return (
                                    <div key={activity.id || index} className={cn("p-4 flex items-center justify-between", index !== recentActivity.slice(0, 5).length - 1 && "border-b border-gray-50")}> 
                                       <div className="flex items-center gap-3">
                                          <div className={cn(
                                             "w-10 h-10 rounded-full flex items-center justify-center shrink-0", 
                                             isPayment ? "bg-[#EC1B84]/10 text-[#EC1B84]" : 
                                             isPendingActivity ? "bg-amber-50 text-amber-600" :
                                             isDisbursing ? "bg-blue-50 text-blue-600" : 
                                             s === 'REJECTED' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                                          )}> 
                                             {isPayment ? <Wallet className="w-5 h-5" /> : 
                                              isPendingActivity ? <Clock className="w-5 h-5" /> :
                                              isDisbursing ? <Clock className="w-5 h-5" /> : 
                                              s === 'REJECTED' ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />} 
                                          </div>
                                          <div>
                                             <p className="text-sm font-bold text-gray-900">{activity.title}</p>
                                             <p className="text-xs text-gray-500">{displayDate}</p>
                                          </div>
                                       </div>
                                       {activity.amount !== null && (
                                          <span className={cn(
                                             "text-sm font-bold", 
                                             isPayment ? "text-[#EC1B84]" : "text-green-600"
                                          )}> 
                                             {isPayment ? '-' : '+'}GHS {Math.abs(activity.amount).toFixed(2)}
                                          </span>
                                       )}
                                    </div>
                                 );
                             })
                   )}
         </div>
      </motion.div>

      {/* MODAL FOR ALL ACTIVITY */}
      {showAllActivity && createPortal(
         <div
            className="fixed inset-0 z-[100] flex flex-col bg-gray-50/95 backdrop-blur-sm sm:items-center sm:justify-center animate-in fade-in duration-200"
            onClick={handleCloseModal}
         >
            <div
               id="all-activity-modal"
               role="dialog"
               aria-modal="true"
               aria-label="All Recent Activity"
               className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-md bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
               onClick={(e) => e.stopPropagation()}
            >
               
               {/* Modal Header */}
               <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                  <h3 className="text-lg font-bold text-gray-900">All Recent Activity</h3>
                  <button 
                     ref={closeButtonRef}
                     onClick={handleCloseModal}
                     className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                     aria-label="Close modal"
                  >
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
               </div>

               {/* Modal Content */}
               <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24 sm:pb-4">
                   {recentActivity.map((activity, index) => {
                      const isPayment = activity.type?.toLowerCase() === 'payment';
                      const s = (activity.status || '').toUpperCase();
                      const isPendingActivity = ['AWAITING_ENDORSEMENT', 'PENDING', 'PENDING_VERIFICATION'].includes(s);
                      const isDisbursing = s === 'DISBURSING';

                      const displayDate = activity.date 
                         ? format(new Date(activity.date), "dd MMM yyyy, h:mm a")
                         : "Unknown Date";
                         
                      return (
                         <div key={activity.id || index} className="p-4 flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm">
                               <div className="flex items-center gap-3">
                                  <div className={cn(
                                     "w-10 h-10 rounded-full flex items-center justify-center shrink-0", 
                                     isPayment ? "bg-[#EC1B84]/10 text-[#EC1B84]" : 
                                     isPendingActivity ? "bg-amber-50 text-amber-600" :
                                     isDisbursing ? "bg-blue-50 text-blue-600" : 
                                     s === 'REJECTED' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                                  )}>
                                     {isPayment ? <Wallet className="w-5 h-5" /> : 
                                      isPendingActivity ? <Clock className="w-5 h-5" /> :
                                      isDisbursing ? <Clock className="w-5 h-5" /> : 
                                      s === 'REJECTED' ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold text-gray-900">{activity.title}</p>
                                     <p className="text-xs text-gray-500">{displayDate}</p>
                                  </div>
                               </div>
                               {activity.amount !== null && (
                                  <span className={cn(
                                     "text-sm font-bold", 
                                     isPayment ? "text-[#EC1B84]" : "text-green-600"
                                  )}>
                                     {isPayment ? '-' : '+'}GHS {Math.abs(activity.amount).toFixed(2)}
                                  </span>
                               )}
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
