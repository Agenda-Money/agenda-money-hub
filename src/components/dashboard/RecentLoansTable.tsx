import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface Loan {
  id: string;
  userId: string;
  user: string;
  phone: string;
  amount: number;
  tenure: string;
  status: "pending" | "active" | "overdue" | "closed";
  date: string;
}

const loans: Loan[] = [
  {
    id: "LN001",
    userId: "U001",
    user: "Kwame Asante",
    phone: "0244123456",
    amount: 500,
    tenure: "14 days",
    status: "active",
    date: "2024-01-15",
  },
  {
    id: "LN002",
    userId: "U002",
    user: "Ama Serwaa",
    phone: "0201987654",
    amount: 200,
    tenure: "7 days",
    status: "pending",
    date: "2024-01-15",
  },
  {
    id: "LN003",
    userId: "U003",
    user: "Kofi Mensah",
    phone: "0559876543",
    amount: 1000,
    tenure: "30 days",
    status: "overdue",
    date: "2024-01-10",
  },
  {
    id: "LN004",
    userId: "U004",
    user: "Akua Boateng",
    phone: "0271234567",
    amount: 300,
    tenure: "14 days",
    status: "closed",
    date: "2024-01-08",
  },
  {
    id: "LN005",
    userId: "U005",
    user: "Yaw Agyeman",
    phone: "0543216789",
    amount: 750,
    tenure: "21 days",
    status: "active",
    date: "2024-01-14",
  },
];

const statusStyles = {
  pending: "bg-warning/10 text-warning border-warning/20",
  active: "bg-info/10 text-info border-info/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  closed: "bg-success/10 text-success border-success/20",
};

import { useNavigate } from "react-router-dom";

export function RecentLoansTable() {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-xl shadow-sm animate-fade-in">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Recent Loans</h2>
          <Button variant="ghost" className="text-primary hover:text-primary/80">
            View All
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">
                Loan ID
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">
                User
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">
                Amount (GHS)
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">
                Tenure
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">
                Status
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">
                Date
              </th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-muted-foreground">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan, index) => (
              <tr
                key={loan.id}
                onClick={() => navigate(`/users/${loan.userId}`)}
                className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors duration-150 cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <td className="px-6 py-4 text-sm font-medium text-foreground">
                  {loan.id}
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{loan.user}</p>
                    <p className="text-xs text-muted-foreground">{loan.phone}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-foreground">
                  ₵{loan.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {loan.tenure}
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize font-medium",
                      statusStyles[loan.status]
                    )}
                  >
                    {loan.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {new Date(loan.date).toLocaleDateString("en-GB")}
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
