import React from 'react';
import { Flag, ShieldAlert, Edit2, Shield, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface UserHeaderProps {
  user: {
    fullName: string;
    msisdn: string;
    currentTier: number;
    kycStatus: string;
    createdAt: string;
    lastSeen?: string;
    lastSeenChannel?: 'App' | 'USSD';
    referredByNodeCode?: string;
    isBlocked?: boolean;
    flags?: any[];
  };
  onAction: (type: 'flag' | 'block' | 'unblock' | 'edit') => void;
}

export const UserHeader: React.FC<UserHeaderProps> = ({ user, onAction }) => {
  const { fullName, msisdn, currentTier: tier, kycStatus, createdAt, isBlocked, referredByNodeCode: refCode } = user;
  const initials = fullName ? fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??';
  const joinedAt = createdAt ? format(new Date(createdAt), 'dd MMM yyyy') : 'N/A';
  const tierProgress = (user as any).totalLoansRepaid % 5;
  const agendaScore = (user as any).agendaScore;
  const creditScore = agendaScore?.score ?? null;
  const creditLabel = agendaScore?.label ?? null;
  const onTimeRate = (user as any).onTimeRepaymentPercent || 85;
  const activeLoan = (user as any).activeLoanAmount ? `₵${(user as any).activeLoanAmount}` : 'None';

  return (
    <div className="card-premium animate-fade-in !pb-8 !pt-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-gradient-pink rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-pink-50/50">
            {initials}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
                {fullName}
              </h1>
              <span className="pill-premium pill-blue !text-[14px]">
                Tier {tier}
              </span>
              {isBlocked && (
                <span className="pill-premium pill-red !text-[14px]">
                  Blocked
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-lg text-[var(--color-text-secondary)] mt-1">
              <span className="font-medium">{msisdn}</span>
              <span className="opacity-30">•</span>
              <span>Joined {joinedAt}</span>
              <span className="opacity-30">•</span>
              <span className="text-[14px] bg-slate-100 px-2 py-0.5 rounded uppercase font-mono tracking-wider">Ref: {refCode || 'Direct'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => onAction('flag')}
            className="flex items-center gap-2 px-6 py-2.5 rounded-[var(--border-radius-md)] border border-[#BA7517] text-[#633806] hover:bg-[#FAEEDA] transition-all font-semibold text-[14px] bg-white shadow-sm"
          >
            <Flag size={18} />
            Flag user
          </button>
          <button 
            onClick={() => onAction(isBlocked ? 'unblock' : 'block')}
            className="flex items-center gap-2 px-6 py-2.5 rounded-[var(--border-radius-md)] border border-[#791F1F] text-[#791F1F] hover:bg-[#FCEBEB] transition-all font-semibold text-[14px] bg-white shadow-sm"
          >
            <ShieldAlert size={18} />
            {isBlocked ? 'Unblock user' : 'Block user'}
          </button>
          <button 
            onClick={() => onAction('edit')}
            className="flex items-center gap-2 px-6 py-2.5 rounded-[var(--border-radius-md)] border border-[var(--color-border-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-secondary)] transition-all font-semibold text-[14px] bg-white shadow-sm"
          >
            <Edit2 size={18} />
            Edit profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mt-4 pt-8 border-t border-[var(--color-border-tertiary)]/50">
        <div>
          <div className="label-premium">KYC</div>
          <div className={`pill-premium ${kycStatus === 'VERIFIED' ? 'pill-green' : 'pill-red'} !text-[14px] mt-1`}>
            {kycStatus === 'VERIFIED' ? 'Verified' : kycStatus}
          </div>
        </div>
        <div>
          <div className="label-premium">Tier Progress</div>
          <div className="val-premium !text-[18px] mt-1 text-pink-600 font-bold">{tierProgress} / 5 loans to L{tier + 1}</div>
        </div>
        <div>
          <div className="label-premium">Agenda Score</div>
          <div className="val-premium !text-[18px] mt-1">
            {creditScore !== null ? (
              <>
                <span className="font-bold">{creditScore}</span>
                <span className="text-[var(--color-text-secondary)] font-normal text-[14px] ml-1">/ 100{creditLabel ? ` · ${creditLabel.charAt(0) + creditLabel.slice(1).toLowerCase()}` : ''}</span>
              </>
            ) : (
              <span className="text-[var(--color-text-secondary)] font-normal text-[14px]">Not scored yet</span>
            )}
          </div>
        </div>
        <div>
          <div className="label-premium">On-time Rate</div>
          <div className="val-premium !text-[18px] mt-1 font-bold text-green-700">{onTimeRate}%</div>
        </div>
        <div>
          <div className="label-premium">Active Loan</div>
          <div className={`pill-premium ${activeLoan === 'None' ? 'pill-gray' : 'pill-green'} !text-[14px] mt-1`}>
            {activeLoan}
          </div>
        </div>
      </div>
    </div>
  );
};
