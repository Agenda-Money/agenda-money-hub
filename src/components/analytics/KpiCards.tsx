import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Banknote, Target, CreditCard, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiData {
  disbursedToday: {
    amount: number;
    change: number;
  };
  disbursedWeek: number;
  activeDebt: number;
  collectionRate: {
    percentage: number;
    status?: string;
  };
  portfolioAtRisk: {
    percentage: number;
    status?: string;
  };
  overdueLoans: number;
}

interface KpiCardsProps {
  data: KpiData;
}

const buildDisbursedTrend = (change: number) => {
  if (change === 0) {
    return { trend: undefined, label: undefined, className: "text-muted-foreground" } as const;
  }

  const trend = change > 0 ? "up" : "down";
  const label = `${change > 0 ? "+" : ""}${change}% vs yesterday`;
  const className = change > 0 ? "text-[#00e676]" : "text-[#f44336]";

  return { trend, label, className } as const;
};

const KpiCard = ({
  title,
  value,
  subtitle,
  subtitleClassName,
  icon: Icon,
  trend,
  trendValue,
  trendClassName,
  variant = "default",
  delay = 0
}: {
  title: string;
  value: string;
  subtitle?: React.ReactNode;
  subtitleClassName?: string;
  icon: React.ElementType;
  trend?: "up" | "down";
  trendValue?: string;
  trendClassName?: string;
  variant?: "default" | "success" | "warning" | "danger" | "primary";
  delay?: number;
}) => {
  const variants = {
    default: {
      bg: "bg-card",
      iconBg: "bg-muted",
      iconColor: "text-foreground"
    },
    success: {
      bg: "bg-gradient-to-br from-success/10 to-success/5",
      iconBg: "bg-success/20",
      iconColor: "text-success"
    },
    warning: {
      bg: "bg-gradient-to-br from-warning/10 to-warning/5",
      iconBg: "bg-warning/20",
      iconColor: "text-warning"
    },
    danger: {
      bg: "bg-gradient-to-br from-destructive/10 to-destructive/5",
      iconBg: "bg-destructive/20",
      iconColor: "text-destructive"
    },
    primary: {
      bg: "bg-gradient-to-br from-primary/10 to-primary/5",
      iconBg: "bg-primary/20",
      iconColor: "text-primary"
    }
  };

  const config = variants[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className={cn("overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow", config.bg)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {title}
              </p>
              <p className="text-2xl font-bold">{value}</p>
              {subtitle && (
                <p className={cn("text-xs", subtitleClassName ?? "text-muted-foreground")}>{subtitle}</p>
              )}
              {trend && trendValue && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium mt-2",
                  trend === "up" ? "text-success" : "text-destructive",
                  trendClassName
                )}>
                  {trend === "up" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {trendValue}
                </div>
              )}
            </div>
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", config.iconBg)}>
              <Icon className={cn("h-6 w-6", config.iconColor)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export function KpiCards({ data }: Readonly<KpiCardsProps>) {
  const disbursedTrend = buildDisbursedTrend(data.disbursedToday.change);

  const collectionStatus = (data.collectionRate.status || "").toLowerCase();
  const collectionStatusClass = collectionStatus.includes("target") || collectionStatus.includes("healthy")
    ? "text-emerald-400"
    : "text-rose-400";

  const portfolioStatus = (data.portfolioAtRisk.status || "").toLowerCase();
  const portfolioStatusClass = portfolioStatus.includes("healthy")
    ? "text-emerald-400"
    : "text-rose-400";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <KpiCard
        title="Disbursed Today"
        value={`₵${data.disbursedToday.amount.toLocaleString()}`}
        subtitle="24hr volume"
        icon={Banknote}
        trend={disbursedTrend.trend}
        trendValue={disbursedTrend.label}
        trendClassName={disbursedTrend.className}
        variant="primary"
        delay={0}
      />
      <KpiCard
        title="Weekly Disbursement"
        value={`₵${data.disbursedWeek.toLocaleString()}`}
        subtitle="Last 7 days"
        icon={Banknote}
        variant="primary"
        delay={0.05}
      />
      <KpiCard
        title="Collection Rate"
        value={`${data.collectionRate.percentage}%`}
        subtitle={data.collectionRate.status || "Repaid vs due"}
        subtitleClassName={collectionStatusClass}
        icon={Target}
        trend={data.collectionRate.percentage >= 90 ? "up" : "down"}
        trendValue={data.collectionRate.percentage >= 90 ? "On target" : "Underperforming"}
        trendClassName={data.collectionRate.percentage >= 90 ? "text-[#00e676]" : "text-[#f44336]"}
        variant={data.collectionRate.percentage >= 90 ? "success" : "warning"}
        delay={0.1}
      />
      <KpiCard
        title="Portfolio at Risk"
        value={`${data.portfolioAtRisk.percentage}%`}
        subtitle={data.portfolioAtRisk.status || "30+ days overdue"}
        subtitleClassName={portfolioStatusClass}
        icon={AlertTriangle}
        trend={data.portfolioAtRisk.percentage <= 5 ? "up" : "down"}
        trendValue={data.portfolioAtRisk.percentage <= 5 ? "Healthy" : "Needs attention"}
        trendClassName={data.portfolioAtRisk.percentage <= 5 ? "text-[#00e676]" : "text-[#f44336]"}
        variant={data.portfolioAtRisk.percentage <= 5 ? "success" : "danger"}
        delay={0.15}
      />
      <KpiCard
        title="Active Debt"
        value={`₵${data.activeDebt.toLocaleString()}`}
        subtitle="Outstanding principal"
        icon={CreditCard}
        variant="primary"
        delay={0.2}
      />
      <KpiCard
        title="Overdue Loans"
        value={data.overdueLoans.toLocaleString()}
        subtitle="Requiring attention"
        icon={AlertTriangle}
        variant={data.overdueLoans > 10 ? "danger" : "warning"}
        delay={0.25}
      />
    </div>
  );
}
