import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, className }: Readonly<StatsCardProps>) {
  return (
    <div
      className={cn(
        "group bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in border border-border/50 hover:border-primary/20",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className={cn(
            "font-bold text-foreground leading-tight transition-all",
            value.length > 12 ? "text-xl" : value.length > 9 ? "text-2xl" : "text-3xl"
          )}>
            {value}
          </p>
        </div>
        
        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/15 transition-all flex-shrink-0">
          <Icon className="h-7 w-7 text-primary" />
        </div>
      </div>
      
      {trend && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
          {trend.value === 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-black">→</div>
              <span className="text-sm font-semibold text-muted-foreground">
                No change
              </span>
            </div>
          ) : trend.isPositive ? (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-sm font-semibold text-success">
                +{trend.value}%
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-sm font-semibold text-destructive">
                -{Math.abs(trend.value)}%
              </span>
            </div>
          )}
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
      )}
    </div>
  );
}
