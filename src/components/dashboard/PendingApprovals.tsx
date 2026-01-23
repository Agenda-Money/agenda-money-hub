import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

interface PendingLoan {
  id: string;
  user: string;
  phone: string;
  amount: number;
  tier: string;
  requestedAt: string;
}

const pendingLoans: PendingLoan[] = [
  {
    id: "LN006",
    user: "Abena Osei",
    phone: "0244567890",
    amount: 350,
    tier: "L2",
    requestedAt: "10 min ago",
  },
  {
    id: "LN007",
    user: "Kwabena Frimpong",
    phone: "0209876543",
    amount: 150,
    tier: "L1",
    requestedAt: "25 min ago",
  },
  {
    id: "LN008",
    user: "Efua Dadzie",
    phone: "0551234567",
    amount: 500,
    tier: "L3",
    requestedAt: "1 hour ago",
  },
  {
    id: "LN009",
    user: "Kofi Appiah",
    phone: "0272345678",
    amount: 200,
    tier: "L1",
    requestedAt: "2 hours ago",
  },
];

const tierColors: Record<string, string> = {
  L1: "bg-muted text-muted-foreground",
  L2: "bg-info/10 text-info",
  L3: "bg-primary/10 text-primary",
  L4: "bg-success/10 text-success",
  L5: "bg-warning/10 text-warning",
};

export function PendingApprovals() {
  return (
    <div className="bg-card rounded-xl shadow-sm animate-fade-in">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Pending Approvals</h2>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {pendingLoans.length} pending
          </Badge>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {pendingLoans.map((loan, index) => (
          <div
            key={loan.id}
            className="p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-background-pink-subtle transition-all duration-200"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium text-foreground">{loan.user}</p>
                <p className="text-sm text-muted-foreground">{loan.phone}</p>
              </div>
              <Badge variant="outline" className={tierColors[loan.tier]}>
                {loan.tier}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-foreground">
                  ₵{loan.amount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{loan.requestedAt}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-3 bg-success hover:bg-success/90"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-border">
        <Button variant="ghost" className="w-full text-primary hover:text-primary/80">
          View All Pending
        </Button>
      </div>
    </div>
  );
}
