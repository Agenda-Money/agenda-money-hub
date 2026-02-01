import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Banknote, Target, CreditCard, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiData {
  disbursementToday: number;
  disbursementWeek: number;
  collectionRate: number;
  portfolioAtRisk: number;
  totalActiveDebt: number;
  overdueLoans: number;
}

interface KpiCardsProps {
  data: KpiData;
}

const KpiCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = "default",
  delay = 0
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down";
  trendValue?: string;
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
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
              {trend && trendValue && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium mt-2",
                  trend === "up" ? "text-success" : "text-destructive"
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

export function KpiCards({ data }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <KpiCard
        title="Disbursed Today"
        value={`₵${data.disbursementToday.toLocaleString()}`}
        subtitle="24hr volume"
        icon={Banknote}
        trend="up"
        trendValue="+12% vs yesterday"
        variant="primary"
        delay={0}
      />
      <KpiCard
        title="Weekly Disbursement"
        value={`₵${data.disbursementWeek.toLocaleString()}`}
        subtitle="Last 7 days"
        icon={Banknote}
        trend="up"
        trendValue="+8% vs last week"
        variant="primary"
        delay={0.05}
      />
      <KpiCard
        title="Collection Rate"
        value={`${data.collectionRate}%`}
        subtitle="Repaid vs due"
        icon={Target}
        trend={data.collectionRate >= 90 ? "up" : "down"}
        trendValue={data.collectionRate >= 90 ? "On target" : "Below target"}
        variant={data.collectionRate >= 90 ? "success" : "warning"}
        delay={0.1}
      />
      <KpiCard
        title="Portfolio at Risk"
        value={`${data.portfolioAtRisk}%`}
        subtitle="30+ days overdue"
        icon={AlertTriangle}
        trend={data.portfolioAtRisk <= 5 ? "up" : "down"}
        trendValue={data.portfolioAtRisk <= 5 ? "Healthy" : "Needs attention"}
        variant={data.portfolioAtRisk <= 5 ? "success" : "danger"}
        delay={0.15}
      />
      <KpiCard
        title="Active Debt"
        value={`₵${data.totalActiveDebt.toLocaleString()}`}
        subtitle="Outstanding principal"
        icon={CreditCard}
        variant="default"
        delay={0.2}
      />
      <KpiCard
        title="Overdue Loans"
        value={data.overdueLoans.toString()}
        subtitle="Requiring attention"
        icon={AlertTriangle}
        variant={data.overdueLoans > 10 ? "danger" : "warning"}
        delay={0.25}
      />
    </div>
  );
}
