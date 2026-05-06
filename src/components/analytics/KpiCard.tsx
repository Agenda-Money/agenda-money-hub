import React from "react";
import { Loader2 } from "lucide-react";
import type { CardStatus } from "./analytics.types";

interface Props {
  label: string;
  value: string;
  subtext: string;
  trend?: { direction: "up" | "down" | "flat"; value: string; label: string };
  badge?: { text: string; variant: "green" | "red" | "amber" | "neutral" };
  status: CardStatus;
  icon?: React.ReactNode;
  loading?: boolean;
}

const cardToneMap: Record<CardStatus, string> = {
  green: "border-emerald-500/20 bg-emerald-500/10",
  red: "border-red-500/20 bg-red-500/10",
  amber: "border-amber-500/20 bg-amber-500/10",
  neutral: "border-border/60 bg-card",
};

const labelToneMap: Record<CardStatus, string> = {
  green: "text-emerald-700 dark:text-emerald-300",
  red: "text-red-700 dark:text-red-300",
  amber: "text-amber-700 dark:text-amber-300",
  neutral: "text-muted-foreground",
};

const valueToneMap: Record<CardStatus, string> = {
  green: "text-emerald-900 dark:text-emerald-100",
  red: "text-red-900 dark:text-red-100",
  amber: "text-amber-900 dark:text-amber-100",
  neutral: "text-foreground",
};

const iconToneMap: Record<CardStatus, string> = {
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  red: "bg-red-500/15 text-red-700 dark:text-red-200",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-200",
  neutral: "bg-muted text-foreground",
};

const badgeToneMap: Record<NonNullable<Props["badge"]>["variant"], string> = {
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  red: "bg-red-500/15 text-red-700 dark:text-red-200",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-200",
  neutral: "bg-muted text-muted-foreground",
};

const trendToneMap = {
  up: "text-emerald-700 dark:text-emerald-300",
  down: "text-red-700 dark:text-red-300",
  flat: "text-muted-foreground",
} as const;

const trendPrefix = {
  up: "↑",
  down: "↓",
  flat: "→",
} as const;

export function KpiCard({ label, value, subtext, trend, badge, status, icon, loading }: Props) {
  if (loading) {
    return (
      <div className="relative flex min-h-[160px] items-center justify-center rounded-[14px] border border-border/60 bg-card p-5 animate-pulse">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className={`relative flex min-h-[160px] flex-col justify-between rounded-[14px] border p-5 shadow-sm ${cardToneMap[status]}`}>
      {icon && (
        <div className={`absolute right-5 top-5 flex h-[34px] w-[34px] items-center justify-center rounded-lg ${iconToneMap[status]}`}>
          {icon}
        </div>
      )}

      <div>
        <h3 className={`mb-2 max-w-[calc(100%-40px)] text-[11px] font-medium uppercase tracking-[0.06em] ${labelToneMap[status]}`}>
          {label}
        </h3>
        
        <div className={`text-[24px] sm:text-[28px] font-black tracking-tighter mb-1 font-mono leading-none ${theme.value}`}>
          {value}
        </div>

        <div className={`mb-2 text-xs ${labelToneMap[status]}`}>
          {subtext}
        </div>

        {trend && (
          <div className="mb-3 flex items-center gap-1 text-xs">
            <span className={`font-medium ${trendToneMap[trend.direction]}`}>
              {trendPrefix[trend.direction]} {trend.value}
            </span>
            <span className="text-[11px] text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </div>

      <div>
        {badge?.text && (
          <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-medium uppercase ${badgeToneMap[badge.variant]}`}>
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
}
