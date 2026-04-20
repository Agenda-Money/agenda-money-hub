import React from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface FlagRecord {
  level: string;
  reason: string;
  adminName: string;
  createdAt: string;
}

interface ReferralRecord {
  _id: string;
  fullName: string;
  joinedAt: string;
  kycStatus: string;
  loanStatus: string;
  loanStatusType: 'green' | 'amber' | 'red' | 'gray';
}

interface FlagHistoryCardProps {
  flags: FlagRecord[];
  referrals: ReferralRecord[];
}

export const FlagHistoryCard: React.FC<FlagHistoryCardProps> = ({ flags, referrals }) => {
  return (
    <div className="card-sm-premium">
      <div className="flex justify-between items-center mb-3">
        <span className="section-title-premium mb-0">Flag history</span>
        <span className={`pill-premium ${(flags || []).length > 0 ? 'pill-amber' : 'pill-gray'}`}>
          {(flags || []).length} flag{(flags || []).length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="flex flex-col mb-4">
        {(flags || []).length > 0 ? (flags || []).map((flag, idx) => (
          <div key={idx} className="flag-history-row-premium">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`pill-premium text-[9px] px-1.5 py-0 ${(flag.level || 'gray') === 'high' ? 'pill-red' : (flag.level || 'gray') === 'medium' ? 'pill-amber' : 'pill-gray'}`}>
                  {(flag.level || 'Normal').toUpperCase()}
                </span>
                <span className="muted-premium text-[11px]">{flag.createdAt ? format(new Date(flag.createdAt), 'dd MMM yyyy') : 'N/A'}</span>
              </div>
              <p className="muted-premium text-[11px] leading-relaxed break-words">{flag.reason || 'No reason provided'}</p>
              <span className="muted-premium text-[10px] italic">By: {flag.adminName || 'System'}</span>
            </div>
          </div>
        )) : (
          <div className="text-center py-4 muted-premium text-[12px]">No flag history</div>
        )}
      </div>
      
      <hr className="divider-premium" />
      
      <div className="section-title-premium mb-2.5">Referral network</div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border-tertiary)]">
              <th className="text-left py-2 pr-2 font-medium text-[var(--color-text-secondary)] uppercase text-[10px]">User</th>
              <th className="text-left py-2 px-2 font-medium text-[var(--color-text-secondary)] uppercase text-[10px]">Joined</th>
              <th className="text-left py-2 px-2 font-medium text-[var(--color-text-secondary)] uppercase text-[10px]">KYC</th>
              <th className="text-left py-2 pl-2 font-medium text-[var(--color-text-secondary)] uppercase text-[10px]">Loan</th>
            </tr>
          </thead>
          <tbody>
            {(referrals || []).length > 0 ? (referrals || []).map((ref, idx) => (
              <tr key={idx} className="border-b border-[var(--color-border-tertiary)] last:border-0">
                <td className="py-2.5 pr-2">
                  <Link to={`/admin/users/${ref._id}`} className="text-[var(--color-text-primary)] hover:underline truncate block max-w-[80px]">
                    {ref.fullName || 'Unknown'}
                  </Link>
                </td>
                <td className="py-2.5 px-2 text-[var(--color-text-secondary)]">
                  {ref.joinedAt ? format(new Date(ref.joinedAt), 'dd MMM') : 'N/A'}
                </td>
                <td className="py-2.5 px-2 text-center">
                  <span className={`pill-premium ${ref.kycStatus === 'VERIFIED' ? 'pill-green' : 'pill-red'} !px-1.5 !py-0.5`}>
                    {ref.kycStatus === 'VERIFIED' ? '✓' : '✗'}
                  </span>
                </td>
                <td className="py-2.5 pl-2 text-right">
                  <span className={`pill-premium pill-${ref.loanStatusType || 'gray'} !text-[10px] !px-1.5 !py-0.5`}>
                    {ref.loanStatus || 'None'}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="py-4 text-center muted-premium">No referrals</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-3 flex justify-between items-center">
        <span className="muted-premium text-[11px]">Referral quality</span>
        <span className="val-premium text-[12px] text-[#BA7517]">
          {(referrals || []).length > 0 ? Math.round(((referrals || []).filter(r => r.loanStatusType === 'green').length / (referrals || []).length) * 100) : 0}% good loans
        </span>
      </div>
    </div>
  );
};
