import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  isLive?: boolean;
  description?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, className, isLive, description }: Readonly<StatsCardProps>) {
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  const isNumeric = !isNaN(numericValue) && typeof numericValue === 'number';

  const formatDisplayValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    if (typeof value === 'string' && value.includes('GH₵')) {
      return `GH₵ ${val.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    } else if (typeof value === 'string' && value.includes('%')) {
      return `${val.toFixed(1)}%`;
    } else {
      return val.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
  };

  const displayValue = isNumeric ? formatDisplayValue(numericValue) : String(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group relative overflow-hidden bg-card/60 backdrop-blur-xl rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 border border-border/40 hover:border-primary/30",
        className
      )}
    >
      {/* Background Gradient Glow */}
      <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
      
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{title}</p>
            {isLive && (
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                </span>
                <span className="text-[8px] font-black text-primary uppercase tracking-wider">Live</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col">
            <motion.p 
              key={displayValue}
              initial={{ opacity: 0.8, filter: "blur(2px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              className={cn(
                "font-black text-foreground tracking-tight transition-all",
                displayValue.length > 15 ? "text-xl" : displayValue.length > 12 ? "text-2xl" : "text-4xl"
              )}
            >
              {displayValue || (value === undefined || value === "N/A" ? "—" : value)}
            </motion.p>
            {description && (
              <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">
                {description}
              </p>
            )}
          </div>
        </div>
        
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 flex-shrink-0 shadow-inner">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
      
      {trend && (
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/30">
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold",
            trend.isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {trend.value === 0 ? "→" : trend.isPositive ? "↑" : "↓"}
            {Math.abs(trend.value)}%
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">vs last month</span>
        </div>
      )}
    </motion.div>
  );
}
