import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Clock, CheckCircle, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Loan {
  id: string;
  user: string;
  phone: string;
  amount: number;
  tenure: string;
  dueDate: string;
  status: "pending" | "active" | "overdue" | "completed";
}

const allLoans: Loan[] = [
  { id: "LN001", user: "Kwame Asante", phone: "0244123456", amount: 500, tenure: "14 days", dueDate: "2024-01-29", status: "active" },
  { id: "LN002", user: "Ama Serwaa", phone: "0201987654", amount: 200, tenure: "7 days", dueDate: "2024-01-22", status: "pending" },
  { id: "LN003", user: "Kofi Mensah", phone: "0559876543", amount: 1000, tenure: "30 days", dueDate: "2024-01-10", status: "overdue" },
  { id: "LN004", user: "Akua Boateng", phone: "0271234567", amount: 300, tenure: "14 days", dueDate: "2024-01-08", status: "completed" },
  { id: "LN005", user: "Yaw Agyeman", phone: "0543216789", amount: 750, tenure: "21 days", dueDate: "2024-02-04", status: "active" },
  { id: "LN006", user: "Abena Osei", phone: "0244567890", amount: 350, tenure: "14 days", dueDate: "2024-01-25", status: "pending" },
  { id: "LN007", user: "Kwabena Frimpong", phone: "0209876543", amount: 150, tenure: "7 days", dueDate: "2024-01-18", status: "overdue" },
  { id: "LN008", user: "Efua Dadzie", phone: "0551234567", amount: 500, tenure: "14 days", dueDate: "2024-01-30", status: "active" },
];

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "bg-warning/10 text-warning border-warning/20" },
  active: { label: "Active", icon: CheckCircle, color: "bg-info/10 text-info border-info/20" },
  overdue: { label: "Overdue", icon: AlertTriangle, color: "bg-destructive/10 text-destructive border-destructive/20" },
  completed: { label: "Completed", icon: Check, color: "bg-success/10 text-success border-success/20" },
};

function LoansTable({ loans, showApproveButton = false }: { loans: Loan[]; showApproveButton?: boolean }) {
  if (loans.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-sm p-12 text-center">
        <p className="text-muted-foreground">No loans found</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block bg-card rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Loan ID</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">User</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Amount</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Tenure</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Due Date</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Status</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan, index) => {
                const config = statusConfig[loan.status];
                return (
                  <tr
                    key={loan.id}
                    className="border-b border-border last:border-0 hover:bg-background-pink-subtle transition-colors duration-150 animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{loan.id}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{loan.user}</p>
                        <p className="text-xs text-muted-foreground">{loan.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">₵{loan.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{loan.tenure}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(loan.dueDate).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={cn("font-medium", config.color)}>
                        {config.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {showApproveButton && (
                          <Button size="sm" className="bg-success hover:bg-success/90 h-8 px-3">
                            Approve
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {loans.map((loan, index) => {
          const config = statusConfig[loan.status];
          const StatusIcon = config.icon;
          return (
            <div
              key={loan.id}
              className="bg-card rounded-xl p-4 shadow-sm border border-border space-y-3 animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Header with ID and Status */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground">{loan.id}</p>
                  <h3 className="font-semibold text-foreground">{loan.user}</h3>
                  <p className="text-sm text-muted-foreground">{loan.phone}</p>
                </div>
                <Badge variant="outline" className={cn("font-medium flex items-center gap-1", config.color)}>
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>

              {/* Loan Details Grid */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">Amount</span>
                  <span className="font-semibold text-foreground">₵{loan.amount.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">Tenure</span>
                  <span className="font-medium text-foreground">{loan.tenure}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">Due Date</span>
                  <span className="font-medium text-foreground">
                    {new Date(loan.dueDate).toLocaleDateString("en-GB")}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button variant="outline" size="sm" className="h-8">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                {showApproveButton && (
                  <Button size="sm" className="bg-success hover:bg-success/90 h-8">
                    Approve
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function LoansPage() {
  const pendingLoans = allLoans.filter((l) => l.status === "pending");
  const activeLoans = allLoans.filter((l) => l.status === "active");
  const overdueLoans = allLoans.filter((l) => l.status === "overdue");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Loans</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor all loan applications</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-4 shadow-sm border-l-4 border-warning">
            <p className="text-sm text-muted-foreground">Pending Approval</p>
            <p className="text-2xl font-bold text-foreground mt-1">{pendingLoans.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border-l-4 border-info">
            <p className="text-sm text-muted-foreground">Active Loans</p>
            <p className="text-2xl font-bold text-foreground mt-1">{activeLoans.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border-l-4 border-destructive">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold text-foreground mt-1">{overdueLoans.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-card">All Loans</TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-card">
              Pending ({pendingLoans.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-card">
              Active ({activeLoans.length})
            </TabsTrigger>
            <TabsTrigger value="overdue" className="data-[state=active]:bg-card">
              Overdue ({overdueLoans.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <LoansTable loans={allLoans} />
          </TabsContent>
          <TabsContent value="pending">
            <LoansTable loans={pendingLoans} showApproveButton />
          </TabsContent>
          <TabsContent value="active">
            <LoansTable loans={activeLoans} />
          </TabsContent>
          <TabsContent value="overdue">
            <LoansTable loans={overdueLoans} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
