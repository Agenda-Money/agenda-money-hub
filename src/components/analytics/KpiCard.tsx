import React from 'react';
import type { CardStatus, Badge as BadgeType, Trend } from './analytics.types';
import { Loader2 } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  subtext: string;
  trend?: { direction: 'up' | 'down' | 'flat'; value: string; label: string };
  badge?: { text: string; variant: 'green' | 'red' | 'amber' | 'neutral' };
  status: CardStatus;
  icon?: React.ReactNode;
  loading?: boolean;
}

export function KpiCard({ label, value, subtext, trend, badge, status, icon, loading }: Props) {
  if (loading) {
    return (
      <div className="animate-pulse flex items-center justify-center relative h-[160px] bg-muted/30 border border-muted/50 rounded-[14px] p-[20px_20px_16px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/30" />
      </div>
    );
  }

  // Card Theme Config
  const configs = {
    green: {
      card: "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/50",
      label: "text-emerald-700 dark:text-emerald-400",
      value: "text-emerald-900 dark:text-emerald-100",
      iconBg: "bg-emerald-200/50 dark:bg-emerald-900/30",
      iconText: "text-emerald-700 dark:text-emerald-400"
    },
    red: {
      card: "bg-red-50/50 border-red-200 dark:bg-red-950/10 dark:border-red-900/50",
      label: "text-red-700 dark:text-red-400",
      value: "text-red-900 dark:text-red-100",
      iconBg: "bg-red-200/50 dark:bg-red-900/30",
      iconText: "text-red-700 dark:text-red-400"
    },
    neutral: {
      card: "bg-gray-50/50 border-gray-200 dark:bg-gray-900/40 dark:border-gray-800",
      label: "text-gray-500 dark:text-gray-400",
      value: "text-gray-900 dark:text-gray-100",
      iconBg: "bg-gray-200/50 dark:bg-gray-800",
      iconText: "text-gray-600 dark:text-gray-300"
    }
  };

  const theme = configs[status as keyof typeof configs] || configs.neutral;

  const getBadgeClasses = (variant: string) => {
    switch (variant) {
      case 'green': return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-none shadow-none";
      case 'red': return "bg-red-500/10 text-red-700 dark:text-red-400 border-none shadow-none";
      case 'amber': return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-none shadow-none";
      default: return "bg-muted text-muted-foreground border-none shadow-none";
    }
  };

  const getTrendColor = (dir: string) => {
    if (dir === 'up') return 'text-emerald-600 dark:text-emerald-400';
    if (dir === 'down') return 'text-red-600 dark:text-red-400';
    return 'text-gray-400 dark:text-gray-500';
  };

  const getTrendPrefix = (dir: string) => {
    if (dir === 'up') return '↑';
    if (dir === 'down') return '↓';
    return '→';
  };

  return (
    <div className={`relative flex flex-col justify-between min-h-[160px] p-[20px_20px_16px] rounded-[14px] border transition-all duration-300 shadow-sm ${theme.card}`}>
      {icon && (
        <div className={`absolute top-5 right-5 w-[34px] h-[34px] rounded-lg flex items-center justify-center transition-colors ${theme.iconBg} ${theme.iconText}`}>
          {icon}
        </div>
      )}

      <div>
        <h3 className={`text-[11px] font-black uppercase tracking-[0.1em] mb-2 leading-none ${theme.label} ${icon ? 'max-w-[calc(100%-40px)]' : 'w-full'}`}>
          {label}
        </h3>
        
        <div className={`text-[24px] sm:text-[28px] font-black tracking-tighter mb-1 font-mono leading-none ${theme.value}`}>
          {value}
        </div>

        <div className={`text-xs font-bold italic mb-3 text-opacity-70 ${theme.label}`}>
          {subtext}
        </div>

        {trend && (
          <div className="flex items-center gap-1 mb-3 text-xs">
            <span className={`font-black tracking-tight ${getTrendColor(trend.direction)}`}>
              {getTrendPrefix(trend.direction)} {trend.value}
            </span>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {trend.label}
            </span>
          </div>
        )}
      </div>

      <div>
        {badge && badge.text && (
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getBadgeClasses(badge.variant)}`}>
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
}
