import React from "react";
import { motion } from "framer-motion";
import { LoanStatusCard } from "@/components/dashboard/LoanStatusCard";
import { cn } from "@/lib/utils";

interface LoansTabProps {
  onBack?: () => void;
  onRepay?: () => void;
  loan?: any; // We'll type this properly if possible, but 'any' is safe for now given the context
  repaymentHistory?: any[]; // New history array explicitly passed from parents
  isPending?: boolean;
  onAction?: (action: string) => void;
}

export const LoansTab: React.FC<LoansTabProps> = ({ onBack, onRepay, loan, repaymentHistory, isPending, onAction }) => {
  // Use passed loan data or fall back to a safe empty state (or the previous mock if needed for demo, but user wants real data)
  // The 'loan' prop likely comes from 'applicant' in ApplyPage.

  const historyItems = (repaymentHistory && repaymentHistory.length > 0) 
    ? repaymentHistory 
    : (loan?.history || []);

  // Map the new deep detailed loan object
  const activeLoan = loan ? {
    amount: loan.amount || 0,
    totalDue: loan.totalPayable || loan.totalDue || 0,
    paidAmount: loan.paidAmount || 0, // Used for progress labels
    outstandingBalance: loan.outstandingBalance || 0, // Used for main bold currency
    dueDate: loan.dueDate ? new Date(loan.dueDate).toDateString() : "N/A",
    disbursementDate: loan.disbursementDate ? new Date(loan.disbursementDate).toDateString() : "N/A",
    history: historyItems, // Use the new API feed if available
    progressPercent: loan.repaymentProgress?.percentage || 0, // New progress field
    daysRemaining: loan.daysRemaining || 0 // Map daysRemaining
  } : null;

  // Urgency Logic
  const isUrgent = activeLoan ? (activeLoan.daysRemaining < 3 && activeLoan.daysRemaining >= 0) : false;

  const renderTopCard = () => {
      if (isPending) {
          return (
             <div className="mb-6">
                 <LoanStatusCard status="review" onAction={onAction} className="shadow-sm" />
             </div>
          );
      }

      if (!activeLoan) {
          return (
             <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-4 mb-6 bg-white rounded-[32px] border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]">
                 <div className="bg-gray-100 p-4 rounded-full">
                     <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                 </div>
                 <div>
                     <h3 className="text-lg font-bold text-gray-900">No Active Loans</h3>
                     <p className="text-gray-500 text-sm mt-1 max-w-[250px]">You can view your loan history below once you've had a loan.</p>
                 </div>
             </div>
          );
      }

      return (
          <>
            <LoanStatusCard 
              status="active"
              amount={activeLoan.outstandingBalance} // Use Outstanding Balance
              dueDate={activeLoan.dueDate}
              progress={activeLoan.progressPercent / 100} // Pass 0-1 range if component expects it, or just use percentage
              className="shadow-sm mb-6"
              onAction={(action) => {
                if (action === 'repay') onRepay?.();
              }}
            />

            {/* Repay Action Card - Make a Repayment */}
            <button 
              className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 shadow-lg text-white flex items-center justify-between cursor-pointer active:scale-95 transition-transform hover:scale-[1.02] duration-200 w-full mb-6" 
              onClick={onRepay}
            >
                <div>
                    <h3 className="font-bold text-lg">Make a Repayment</h3>
                    <p className="text-gray-300 text-sm">Pay off your loan now</p>
                </div>
                <div className="bg-white/10 p-3 rounded-full">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 8V16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                   </svg>
                </div>
            </button>
            
            {/* 3. Repayment Progress Card */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100 space-y-6 mb-8">
              <div>
                 <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Repayment Progress</span>
                 </div>
                 
                 {/* Progress Bar (Grey background) */}
                 <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${activeLoan.progressPercent}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gray-500 rounded-full"
                    />
                 </div>
                 
                 <div className="flex justify-between items-center text-sm font-bold text-gray-900">
                    <span>GHS {Number(activeLoan.totalDue - (activeLoan.outstandingBalance || 0)).toFixed(2)}/GHS {Number(activeLoan.totalDue).toFixed(2)}</span>
                    <span>{Math.round(activeLoan.progressPercent)}%</span>
                 </div>
              </div>

              <div className="space-y-3 pt-2">
                 <p className="text-sm font-bold text-gray-900">Loan Details</p>
                 <div className="flex justify-between text-sm">
                    <span className={cn("font-medium", isUrgent ? "text-[#EC1B84]" : "text-gray-500")}>Due Date</span>
                    <span className={cn("font-bold", isUrgent ? "text-[#EC1B84]" : "text-gray-900")}>
                        {activeLoan.dueDate} {isUrgent && activeLoan.daysRemaining > 0 && `(${activeLoan.daysRemaining} days left)`}
                    </span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Disbursement Date</span>
                    <span className="text-gray-900 font-bold">{activeLoan.disbursementDate}</span>
                 </div>
              </div>
            </div>
          </>
      );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-32 pt-0 mx-auto max-w-md px-4 mt-6">
      
      {renderTopCard()}

      <div className="space-y-4">
         <h3 className="text-sm font-bold text-gray-900 text-center uppercase tracking-wider">Repayment history</h3>
         
         <div className="bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]">
            {/* Header Row */}
            <div className="flex justify-between px-6 py-4 bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
               <span className="w-1/3">Amount Paid</span>
               <span className="w-1/3 text-center">Date</span>
               <span className="w-1/3 text-right">Status</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-50">
               {historyItems.length === 0 ? (
                   <div className="p-6 text-center text-xs text-gray-400">No repayments yet</div>
               ) : (
                   historyItems.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between px-6 py-4 items-center">
                         <span className="w-1/3 font-bold text-gray-900">GHS {Number(item.amount || 0).toFixed(2)}</span>
                         <span className="w-1/3 text-center text-sm text-gray-500 font-medium">{new Date(item.paymentDate || item.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })}</span>
                         <div className="w-1/3 flex justify-end">
                            <div className="w-4 h-4 rounded-full bg-[#82D616]" title="Success" /> {/* Success Green dot */}
                         </div>
                      </div>
                   ))
               )}
            </div>
         </div>
      </div>
    </div>
  );
};
