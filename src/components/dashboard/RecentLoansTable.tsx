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

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";

const statusStyles = {
  pending: "bg-warning/10 text-warning border-warning/20",
  active: "bg-info/10 text-info border-info/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  closed: "bg-success/10 text-success border-success/20",
  repaid: "bg-success/10 text-success border-success/20", // Added repaid mapping
};

export function RecentLoansTable() {
  const navigate = useNavigate();

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["recent-loans"],
    queryFn: async () => {
      const res = await api.get("/api/admin/dashboard/recent-loans");
      return res.data;
    },
  });

  // Handle wrapped { success: true, data: [...] } or direct array
  const rawLoans = Array.isArray(responseData) ? responseData : responseData?.data || [];
  
  const loans: Loan[] = rawLoans.map((l: any) => ({
    id: l.loanReference || l.id || l._id,
    userId: l.user?._id || "",
    user: l.user?.fullName || "Unknown User",
    phone: l.userMsisdn || "",
    amount: l.principal || 0,
    tenure: l.tenureDays ? `${l.tenureDays} days` : "N/A",
    status: (l.status?.toLowerCase() || "pending") as any,
    date: l.disbursedAt || l.createdAt,
  }));

  if (isLoading) {
    return <div className="p-8 text-center bg-card rounded-xl">Loading recent loans...</div>;
  }

  return (
    <div className="bg-card rounded-xl shadow-sm animate-fade-in">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Recent Loans</h2>
          <Button 
            variant="ghost" 
            className="text-primary hover:text-primary/80"
            onClick={() => navigate("/loans")}
          >
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
