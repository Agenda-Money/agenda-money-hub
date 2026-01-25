import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, FileText, User, DollarSign, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

interface PendingLoan {
  id: string;
  user: string;
  phone: string;
  amount: number;
  tier: string;
  requestedAt: string;
  tenor: string;
  repaymentDate: string;
  loansToDate: number;
  repaymentRate: number;
  creditScore: number;
  nodeCode: string;
  userStatus: "Node" | "Edge";
}

const pendingLoans: PendingLoan[] = [
  {
    id: "LN006",
    user: "Abena Osei",
    phone: "0244567890",
    amount: 350,
    tier: "L2",
    requestedAt: "10 min ago",
    tenor: "1 Month",
    repaymentDate: "24 Feb, 2026",
    loansToDate: 5,
    repaymentRate: 98,
    creditScore: 720,
    nodeCode: "ACC-001",
    userStatus: "Node",
  },
  {
    id: "LN007",
    user: "Kwabena Frimpong",
    phone: "0209876543",
    amount: 150,
    tier: "L1",
    requestedAt: "25 min ago",
    tenor: "2 Weeks",
    repaymentDate: "07 Feb, 2026",
    loansToDate: 2,
    repaymentRate: 100,
    creditScore: 680,
    nodeCode: "KUM-045",
    userStatus: "Edge",
  },
  {
    id: "LN008",
    user: "Efua Dadzie",
    phone: "0551234567",
    amount: 500,
    tier: "L3",
    requestedAt: "1 hour ago",
    tenor: "1 Month",
    repaymentDate: "24 Feb, 2026",
    loansToDate: 8,
    repaymentRate: 95,
    creditScore: 750,
    nodeCode: "TAM-012",
    userStatus: "Node",
  },
  {
    id: "LN009",
    user: "Kofi Appiah",
    phone: "0272345678",
    amount: 200,
    tier: "L1",
    requestedAt: "2 hours ago",
    tenor: "1 Month",
    repaymentDate: "24 Feb, 2026",
    loansToDate: 1,
    repaymentRate: 100,
    creditScore: 650,
    nodeCode: "TAK-089",
    userStatus: "Edge",
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
  const [selectedLoan, setSelectedLoan] = useState<PendingLoan | null>(null);

  return (
    <div className="bg-card rounded-xl shadow-sm animate-fade-in">
      <Dialog>
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
          <DialogTrigger key={loan.id} asChild onClick={() => setSelectedLoan(loan)}>
            <div
              className="p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-all duration-200 cursor-pointer"
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
                   <Button size="sm" variant="ghost" className="h-8 text-muted-foreground">
                      Review
                   </Button>
                </div>
              </div>
            </div>
          </DialogTrigger>
        ))}
      </div>

      <DialogContent className="sm:max-w-[600px]">
        {selectedLoan && (
          <>
            <DialogHeader>
              <DialogTitle>Review Loan Application</DialogTitle>
              <DialogDescription>
                Application ID: <span className="font-mono text-primary">{selectedLoan.id}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Applicant Info */}
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedLoan.user}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{selectedLoan.phone}</span>
                    <Badge variant="outline" className={tierColors[selectedLoan.tier]}>
                      Tier {selectedLoan.tier}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                     <Badge variant="secondary" className="text-xs">
                        {selectedLoan.userStatus} User
                     </Badge>
                     <span className="text-xs text-muted-foreground">Code: {selectedLoan.nodeCode}</span>
                  </div>
                </div>
              </div>

              {/* Application Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg space-y-1">
                  <p className="text-sm text-muted-foreground">Request Amount</p>
                  <p className="text-xl font-bold">₵{selectedLoan.amount.toLocaleString()}</p>
                </div>
                <div className="p-4 border rounded-lg space-y-1">
                   <p className="text-sm text-muted-foreground">Tenor</p>
                   <p className="text-xl font-bold">{selectedLoan.tenor}</p>
                </div>
                <div className="p-4 border rounded-lg space-y-1">
                   <p className="text-sm text-muted-foreground">Repayment Date</p>
                   <p className="text-lg font-medium">{selectedLoan.repaymentDate}</p>
                </div>
                 <div className="p-4 border rounded-lg space-y-1">
                   <p className="text-sm text-muted-foreground">Credit Score</p>
                   <p className="text-lg font-medium text-green-600">{selectedLoan.creditScore}</p>
                </div>
              </div>

               {/* History  */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">No. Loans to Date</p>
                    <p className="font-medium">{selectedLoan.loansToDate}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Repayment Rate</p>
                    <p className="font-medium">{selectedLoan.repaymentRate}%</p>
                 </div>
              </div>

            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" className="w-full sm:w-auto text-destructive border-destructive/30 hover:bg-destructive/10">
                <X className="mr-2 h-4 w-4" />
                Reject Application
              </Button>
              <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                <Check className="mr-2 h-4 w-4" />
                Approve Loan
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
      </Dialog>
      
      <div className="p-4 border-t border-border">
        <Button variant="ghost" className="w-full text-primary hover:text-primary/80">
          View All Pending
        </Button>
      </div>
    </div>
  );
}
