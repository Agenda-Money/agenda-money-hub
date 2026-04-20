import React from 'react';
import { format } from 'date-fns';

interface Flag {
  level: 'normal' | 'medium' | 'high';
  reason: string;
  adminName?: string;
  createdAt: string;
}

interface FlagBannerProps {
  flag: Flag;
}

export const FlagBanner: React.FC<FlagBannerProps> = ({ flag }) => {
  const isHigh = flag.level === 'high';
  
  return (
    <div className={isHigh ? "flag-banner-high" : "flag-banner-premium"}>
      <div className="flex flex-col">
        <span className={`text-[12px] font-medium ${isHigh ? 'text-[#791F1F]' : 'text-[#633806]'} mb-0.5`}>
          {flag.level.toUpperCase()} flag active — set by {flag.adminName || 'Admin'} on {format(new Date(flag.createdAt), 'dd MMM yyyy')}
        </span>
        <span className={`text-[11px] ${isHigh ? 'text-[#A32D2D]' : 'text-[#854F0B]'}`}>
          Reason: {flag.reason}
        </span>
      </div>
    </div>
  );
};
