import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wallet, TrendingUp, Clock, DollarSign, Percent, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialHealthSectionProps {
  creditScore: number; // 0-100
  walletBalance: number;
  totalBorrowed: number;
  totalInterestPaid: number;
  onTimeRepaymentPercent: number;
  currentLoan?: {
    amount: number;
    balance: number;
    dueDate: string;
    status: string;
  } | null;
}

const CreditScoreGauge = ({ score }: { score: number }) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-success";
    if (s >= 60) return "text-info";
    if (s >= 40) return "text-warning";
    return "text-destructive";
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return "Excellent";
    if (s >= 60) return "Good";
    if (s >= 40) return "Fair";
    return "Poor";
  };

  const getProgressColor = (s: number) => {
    if (s >= 80) return "bg-success";
    if (s >= 60) return "bg-info";
    if (s >= 40) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-muted/30 to-transparent rounded-2xl">
      <div className="relative w-32 h-32">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            className={getScoreColor(score)}
            strokeDasharray={`${score * 2.51} 251`}
            initial={{ strokeDasharray: "0 251" }}
            animate={{ strokeDasharray: `${score * 2.51} 251` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        {/* Score in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            className={cn("text-3xl font-bold", getScoreColor(score))}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className={cn("font-semibold", getScoreColor(score))}>{getScoreLabel(score)}</p>
        <p className="text-xs text-muted-foreground">Credit Score</p>
      </div>
    </div>
  );
};

const MetricCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  variant = "default"
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
  subValue?: string;
  variant?: "default" | "success" | "warning" | "info";
}) => {
  const variants = {
    default: "bg-card",
    success: "bg-success/5 border-success/20",
    warning: "bg-warning/5 border-warning/20",
    info: "bg-info/5 border-info/20"
  };

  const iconVariants = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/15 text-info"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl border transition-all hover:shadow-md",
        variants[variant]
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", iconVariants[variant])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-xl font-bold mt-0.5 truncate">{value}</p>
          {subValue && (
            <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export function FinancialHealthSection({
  creditScore,
  walletBalance,
  totalBorrowed,
  totalInterestPaid,
  onTimeRepaymentPercent,
  currentLoan
}: FinancialHealthSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-info/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-info" />
            </div>
            <div>
              <CardTitle className="text-lg">Financial Health Snapshot</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Credit metrics and repayment performance</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Credit Score Gauge */}
            <div className="lg:row-span-2">
              <CreditScoreGauge score={creditScore} />
            </div>

            {/* Metrics Grid */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard
                icon={Wallet}
                label="Wallet Balance"
                value={`GHS ${walletBalance.toLocaleString()}`}
                subValue="Temporary wallet"
                variant="success"
              />
              <MetricCard
                icon={DollarSign}
                label="Total Borrowed"
                value={`GHS ${totalBorrowed.toLocaleString()}`}
                subValue="Lifetime amount"
                variant="info"
              />
              <MetricCard
                icon={Percent}
                label="Interest Paid"
                value={`GHS ${totalInterestPaid.toLocaleString()}`}
                subValue="Total fees & interest"
                variant="default"
              />
              
              {/* On-time Repayment */}
              <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-xl border bg-gradient-to-r from-success/5 to-transparent">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">On-time Repayment Rate</span>
                  </div>
                  <span className="text-lg font-bold text-success">{onTimeRepaymentPercent}%</span>
                </div>
                <Progress value={onTimeRepaymentPercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Based on historical repayment behavior
                </p>
              </div>
            </div>
          </div>

          {/* Active Loan Summary */}
          {currentLoan && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 p-4 rounded-xl border-2 border-primary/20 bg-primary/5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Active Loan</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Principal</p>
                  <p className="font-bold">GHS {currentLoan.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="font-bold">GHS {currentLoan.balance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="font-bold">{currentLoan.dueDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-bold capitalize">{currentLoan.status}</p>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
