import React from 'react';

interface LoanHistoryItem {
  id: string;
  dots: ('ok' | 'late' | 'missed')[];
  status: string;
  statusType: 'green' | 'amber' | 'red';
}

interface RepaymentBehaviourCardProps {
  loanHistory: LoanHistoryItem[];
  weeklyUsage: number[];
}

export const RepaymentBehaviourCard: React.FC<RepaymentBehaviourCardProps> = ({ loanHistory, weeklyUsage }) => {
  return (
    <div className="card-sm-premium">
      <div className="section-title-premium">Repayment behaviour</div>
      <div className="flex gap-3 mb-3 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="rep-dot rep-ok"></span><span className="muted-premium text-[11px]">On time</span></span>
        <span className="flex items-center gap-1.5"><span className="rep-dot rep-late"></span><span className="muted-premium text-[11px]">Late</span></span>
        <span className="flex items-center gap-1.5"><span className="rep-dot rep-miss"></span><span className="muted-premium text-[11px]">Missed</span></span>
      </div>
      
      <div className="label-premium mb-2">Loan history</div>
      <div className="flex flex-col gap-2">
        {(loanHistory || []).map((loan, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="muted-premium w-[100px] text-[11px] font-mono">#{loan.id}</span>
            <div className="flex gap-0.5">
              {(loan.dots || []).map((dot, i) => (
                <span key={i} className={`rep-dot rep-${dot}`} title={dot}></span>
              ))}
            </div>
            <span className={`pill-premium pill-${loan.statusType || 'green'} text-[10px] px-1.5 py-0.5`}>{loan.status}</span>
          </div>
        ))}
      </div>
      
      <hr className="divider-premium" />
      
      <div className="label-premium mb-2">App sessions / week (last 4 weeks)</div>
      <div className="bar-wrap-premium">
        {(weeklyUsage || []).map((weight, i) => (
          <div 
            key={i} 
            className={`bar-premium ${i === (weeklyUsage || []).length - 1 ? 'bar-hi-premium' : ''}`} 
            style={{ height: `${weight}%` }}
          ></div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="muted-premium text-[10px]">4 wks ago</span>
        <span className="muted-premium text-[10px]">This wk</span>
      </div>
      
      {weeklyUsage[weeklyUsage.length - 1] === 0 && (
        <div className="mt-2.5 p-2 bg-[#FAEEDA] rounded-md border border-[#BA7517]/20">
          <span className="text-[11px] text-[#633806] block">
            No app activity in 3 days before repayment due date
          </span>
        </div>
      )}
    </div>
  );
};
