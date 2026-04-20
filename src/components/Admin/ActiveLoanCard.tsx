import React from 'react';
import { CreditCard } from 'lucide-react';

interface Installment {
  dueDate: string;
  amount: number;
  paid: number;
  status: 'paid' | 'partial' | 'missed' | 'pending';
}

interface ActiveLoanCardProps {
  loan: {
    reference: string;
    borrowed: number;
    paid: number;
    balance: number;
    status: string;
    overdueDays?: number;
    installments: Installment[];
    interestAccrued: number;
  } | null;
}

export const ActiveLoanCard: React.FC<ActiveLoanCardProps> = ({ loan }) => {
  if (!loan) {
    return (
      <div className="card-sm-premium">
        <div className="section-title-premium">Active loan</div>
        <div className="text-center py-8 muted-premium">No active loan</div>
      </div>
    );
  }

  const overduePast7 = (loan.overdueDays || 0) > 7;

  return (
    <div className="card-sm-premium h-full min-h-[400px]">
      <div className="flex justify-between items-center mb-6">
        <div className="section-title-premium mb-0 flex items-center gap-3">
          <CreditCard className="text-pink-600" size={22} />
          Active loan #{loan.reference}
        </div>
        {loan.overdueDays ? (
          <span className={`pill-premium pill-overdue !text-[14px] ${overduePast7 ? 'animate-pulse' : ''}`}>
            {loan.overdueDays} days overdue
          </span>
        ) : (
          <span className="pill-premium pill-green !text-[14px]">{loan.status}</span>
        )}
      </div>
      <div className="metric-grid-premium !mb-8">
        <div className="metric-premium !p-6 border-l-4 border-slate-200">
          <div className="metric-label-premium">Borrowed</div>
          <div className="metric-val-premium text-[var(--color-text-primary)]">₵{(loan.borrowed || 0).toLocaleString()}</div>
        </div>
        <div className="metric-premium !p-6 border-l-4 border-green-500">
          <div className="metric-label-premium">Paid</div>
          <div className="metric-val-premium text-[#3B6D11]">₵{(loan.paid || 0).toLocaleString()}</div>
        </div>
        <div className="metric-premium !p-6 border-l-4 border-amber-500">
          <div className="metric-label-premium">Balance</div>
          <div className="metric-val-premium text-[#BA7517]">₵{(loan.balance || 0).toLocaleString()}</div>
        </div>
      </div>
      <div className="label-premium mb-2">Installments</div>
      <div className="flex flex-col gap-2">
        {(loan.installments || []).map((inst, index) => (
          <div key={index} className="installment-row-premium !py-3">
            <span className="font-medium text-[15px]">Due {inst.dueDate || 'N/A'}</span>
            <span className="font-bold text-[16px] ml-auto mr-4">₵{(inst.amount || 0).toLocaleString()}</span>
            {inst.status === 'paid' && <span className="pill-premium pill-green !px-2 !py-0.5 !text-[11px]">PAID</span>}
            {inst.status === 'partial' && <span className="pill-premium pill-amber !px-2 !py-0.5 !text-[11px]">PARTIAL</span>}
            {inst.status === 'missed' && <span className="pill-premium pill-red !px-2 !py-0.5 !text-[11px]">MISSED</span>}
            {inst.status === 'pending' && <span className="pill-premium pill-gray !px-2 !py-0.5 !text-[11px]">PENDING</span>}
          </div>
        ))}
      </div>
      <div className="mt-2.5 pt-2.5 border-top-premium">
        <div className="flex justify-between">
          <span className="muted-premium">Interest accrued</span>
          <span className="val-premium">₵{(loan.interestAccrued || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
