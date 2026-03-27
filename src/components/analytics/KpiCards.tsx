import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { METRIC_CONFIGS, STATE_COLORS, MetricState } from "@/lib/analytics-config";

interface KpiData {
  disbursedToday: {
    amount: number;
    change: number;
  };
  disbursedWeek: number;
  activeDebt: {
    volume: number;
    change: number;
    status: string;
  };
  collectionRate: {
    percentage: number;
    change: number;
    status: string;
  };
  portfolioAtRisk: {
    percentage: number;
    change: number;
    status: string;
  };
  overdueLoans: {
    count: number;
    change: number;
    status: string;
  };
}

interface KpiCardsProps {
  data: KpiData;
}

const getFontSize = (formatted: string) => {
  const len = formatted.length;
  if (len <= 4) return "text-[28px]";
  if (len <= 7) return "text-[22px]";
  if (len <= 10) return "text-[18px]";
  return "text-[15px]";
};

const PortfolioCard = ({ 
  id, 
  value = 0, 
  trend = 0, 
  delay = 0 
}: { 
  id: string; 
  value?: number; 
  trend?: number; 
  delay?: number;
}) => {
  const config = METRIC_CONFIGS[id];
  const state = config.state(value);
  const colors = STATE_COLORS[state];
  const formatted = config.format(value);
  const statusText = config.status(value);
  
  const getTrendIcon = (t: number) => {
    if (t > 0) return { icon: "↑", label: `+${t}%`, color: "text-[#0f6e56]" };
    if (t < 0) return { icon: "↓", label: `${t}%`, color: "text-[#a32d2d]" };
    return { icon: "→", label: "No change", color: "text-[#888780]" };
  };
  
  const tr = getTrendIcon(trend);

  const icons: Record<string, React.ReactNode> = {
    disbursed: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/>
      </svg>
    ),
    weekly: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>
      </svg>
    ),
    collection: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      </svg>
    ),
    par: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    activedebt: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/>
      </svg>
    ),
    overdue: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      </svg>
    )
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "rounded-[14px] p-[16px_18px] border-[1.5px] transition-all group",
        "flex flex-col justify-between h-full"
      )}
      style={{ 
        backgroundColor: colors.bg, 
        borderColor: colors.border
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <span 
          className="text-[10px] font-black uppercase tracking-[0.08em]"
          style={{ color: colors.label }}
        >
          {config.label}
        </span>
        <div 
          className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: colors.iconBg, color: colors.val }}
        >
          {icons[id]}
        </div>
      </div>

      <div>
        <div 
          className={cn("font-mono font-black border-none leading-[1.1] mb-1.5 transition-all", getFontSize(formatted))}
          style={{ color: colors.val }}
        >
          {formatted}
        </div>
        <div 
          className="text-[11px] font-bold"
          style={{ color: colors.label }}
        >
          {config.sub}
        </div>
      </div>

      <div className="mt-4">
        <div className={cn("text-[11px] font-black flex items-center gap-1 mb-2.5", tr.color)}>
          <span className="text-[14px] leading-none">{tr.icon}</span> 
          {tr.label} <span className="opacity-60 text-[10px]">vs yesterday</span>
        </div>
        
        <span 
          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.05em] px-2 py-0.5 rounded-full"
          style={{ backgroundColor: colors.badgeBg, color: colors.val }}
        >
          {statusText}
        </span>
      </div>
    </motion.div>
  );
};

export function KpiCards({ data }: Readonly<KpiCardsProps>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
      <PortfolioCard
        id="disbursed"
        value={data.disbursedToday.amount}
        trend={data.disbursedToday.change}
        delay={0}
      />
      <PortfolioCard
        id="weekly"
        value={data.disbursedWeek}
        trend={12} // Mock trend if not found in data
        delay={0.05}
      />
      <PortfolioCard
        id="collection"
        value={data.collectionRate.percentage}
        trend={data.collectionRate.change}
        delay={0.1}
      />
      <PortfolioCard
        id="par"
        value={data.portfolioAtRisk.percentage}
        trend={data.portfolioAtRisk.change}
        delay={0.15}
      />
      <PortfolioCard
        id="activedebt"
        value={data.activeDebt.volume}
        trend={data.activeDebt.change}
        delay={0.2}
      />
      <PortfolioCard
        id="overdue"
        value={data.overdueLoans.count}
        trend={data.overdueLoans.change}
        delay={0.25}
      />
    </div>
  );
}
