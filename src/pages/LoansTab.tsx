import React from "react";
import { motion } from "framer-motion";
import { LoanStatusCard } from "@/components/dashboard/LoanStatusCard";

interface LoansTabProps {
  onBack?: () => void;
}

export const LoansTab: React.FC<LoansTabProps> = ({ onBack }) => {
  // Mock Data
  const activeLoan = {
    amount: 141,
    totalDue: 354,
    paidAmount: 296,
    dueDate: "24 Feb 2026",
    disbursementDate: "01 Feb 2026",
    history: [
      { amount: 50, date: "05 Feb 2026", status: "Paid" },
      { amount: 70, date: "13 Feb 2026", status: "Paid" },
      { amount: 30, date: "20 Feb 2026", status: "Paid" },
    ]
  };

  const progress = (activeLoan.paidAmount / activeLoan.totalDue) * 100;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-32 pt-0">
      
      {/* 1. Header Removed as per request */}
      {/* <div className="flex items-center justify-center mb-6 pt-4">
        <h2 className="text-lg font-bold text-gray-900">Active Loan</h2>
      </div> */}

      {/* 2. Active Loan Card */}
      <LoanStatusCard 
        status="active"
        amount={activeLoan.amount}
        dueDate={activeLoan.dueDate}
        className="shadow-sm"
      />

      {/* 3. Repayment Progress Card */}
      <div className="bg-white rounded-[32px] p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100 space-y-6">
        <div>
           <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Repayment Progress</span>
           </div>
           
           {/* Progress Bar */}
           <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gray-500 rounded-full"
              />
           </div>
           
           <div className="flex justify-between items-center text-sm font-bold text-gray-900">
              <span>₵{activeLoan.paidAmount}/{activeLoan.totalDue}</span>
              <span>{Math.round(progress)}%</span>
           </div>
        </div>

        <div className="space-y-3 pt-2">
           <p className="text-sm font-bold text-gray-900">Loan Details</p>
           <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">Due Date</span>
              <span className="text-gray-900 font-bold">{activeLoan.dueDate}</span>
           </div>
           <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">Disbursement Date</span>
              <span className="text-gray-900 font-bold">{activeLoan.disbursementDate}</span>
           </div>
        </div>
      </div>

      {/* 4. Repayment History */}
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
               {activeLoan.history.map((item, i) => (
                  <div key={i} className="flex justify-between px-6 py-4 items-center">
                     <span className="w-1/3 font-bold text-gray-900">₵{item.amount}</span>
                     <span className="w-1/3 text-center text-sm text-gray-500 font-medium">{item.date}</span>
                     <div className="w-1/3 flex justify-end">
                        <div className="w-4 h-4 rounded-full bg-[#82D616]" /> {/* Green dot from screenshot */}
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>

    </div>
  );
};
