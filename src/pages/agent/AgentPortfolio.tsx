import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, User, Phone, MapPin, DollarSign, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface OnboardedUser {
  id: string;
  fullName: string;
  ghanaCardNumber: string;
  phoneNumber: string;
  region: string;
  kycStatus: "verified" | "pending" | "rejected" | "mismatch";
  loanStatus: "active" | "repaid" | "overdue" | "none";
  loanAmount?: number;
  onboardedDate: string;
  lastPayment?: string;
}

const getKycBadge = (status: string) => {
  switch (status) {
    case "verified":
      return <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Smile ID Verified
      </Badge>;
    case "pending":
      return <Badge variant="outline" className="text-amber-600 border-amber-300">
        <Clock className="h-3 w-3 mr-1" />
        Pending Admin Approval
      </Badge>;
    case "mismatch":
      return <Badge variant="destructive" className="bg-red-500/10 text-red-700 hover:bg-red-500/20">
        <AlertCircle className="h-3 w-3 mr-1" />
        ID Mismatch
      </Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

const getLoanStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "text-blue-600";
    case "repaid":
      return "text-green-600";
    case "overdue":
      return "text-red-600";
    default:
      return "text-muted-foreground";
  }
};

export default function AgentPortfolio() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch agent portfolio data filtered by agentCode
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["agent-portfolio", user?.agentCode],
    queryFn: async () => {
      // Mock data
      const mockUsers: OnboardedUser[] = [
        {
          id: "1",
          fullName: "Kwame Mensah",
          ghanaCardNumber: "GHA-123456789-1",
          phoneNumber: "0244123456",
          region: "Greater Accra",
          kycStatus: "verified",
          loanStatus: "active",
          loanAmount: 800,
          onboardedDate: "2024-01-15",
          lastPayment: "2024-01-20"
        },
        {
          id: "2",
          fullName: "Abena Osei",
          ghanaCardNumber: "GHA-987654321-2",
          phoneNumber: "0201234567",
          region: "Ashanti",
          kycStatus: "pending",
          loanStatus: "none",
          onboardedDate: "2024-01-18"
        },
        {
          id: "3",
          fullName: "Kofi Asante",
          ghanaCardNumber: "GHA-456789123-3",
          phoneNumber: "0244789456",
          region: "Eastern",
          kycStatus: "verified",
          loanStatus: "repaid",
          loanAmount: 500,
          onboardedDate: "2024-01-10",
          lastPayment: "2024-01-25"
        },
        {
          id: "4",
          fullName: "Ama Darko",
          ghanaCardNumber: "GHA-789123456-4",
          phoneNumber: "0208765432",
          region: "Central",
          kycStatus: "verified",
          loanStatus: "overdue",
          loanAmount: 1200,
          onboardedDate: "2024-01-05",
          lastPayment: "2024-01-12"
        },
        {
          id: "5",
          fullName: "Yaw Boateng",
          ghanaCardNumber: "GHA-321654987-5",
          phoneNumber: "0244567890",
          region: "Western",
          kycStatus: "mismatch",
          loanStatus: "none",
          onboardedDate: "2024-01-20"
        }
      ];
      return mockUsers;
    },
    enabled: !!user?.agentCode,
  });

  const filteredUsers = users.filter(u =>
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.ghanaCardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phoneNumber.includes(searchTerm)
  );

  const stats = {
    total: users.length,
    verified: users.filter(u => u.kycStatus === "verified").length,
    activeLoans: users.filter(u => u.loanStatus === "active").length,
    overdue: users.filter(u => u.loanStatus === "overdue").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Portfolio</h1>
        <p className="text-muted-foreground mt-1">Track all customers you've onboarded</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">KYC Verified</p>
                <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Loans</p>
                <p className="text-2xl font-bold text-blue-600">{stats.activeLoans}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Table */}
      <Card>
        <CardHeader>
          <CardTitle>The "Guy" Tracker</CardTitle>
          <CardDescription>All customers onboarded under your agent code</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, Ghana Card, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading portfolio...</div>
          ) : (
            <>
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No users found matching your search" : "No onboarded users yet"}
                </div>
              ) : (
                <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Ghana Card</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>KYC Status</TableHead>
                    <TableHead>Loan Status</TableHead>
                    <TableHead className="text-right">Loan Amount</TableHead>
                    <TableHead>Onboarded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell className="font-mono text-xs">{user.ghanaCardNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {user.phoneNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {user.region}
                        </div>
                      </TableCell>
                      <TableCell>{getKycBadge(user.kycStatus)}</TableCell>
                      <TableCell>
                        <span className={`font-medium capitalize ${getLoanStatusColor(user.loanStatus)}`}>
                          {user.loanStatus === "none" ? "No Loan" : user.loanStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {user.loanAmount ? `₵${user.loanAmount}` : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.onboardedDate).toLocaleDateString("en-GB")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
