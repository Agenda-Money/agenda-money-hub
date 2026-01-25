import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Wallet, CreditCard, User, History, Download } from "lucide-react";

// Mock user data - in a real app this would come from an API based on the ID
const mockUser = {
  id: "U001",
  name: "Kwame Asante",
  email: "kwame.asante@example.com",
  phone: "0244123456",
  tier: "L3",
  status: "active",
  joinedAt: "15 Jun, 2023",
  address: "15 Ring Road, Accra",
  location: "Greater Accra, Ghana",
  gender: "Male",
  age: 34,
  accommodation: "Rented Apartment",
  employment: "Self-Employed (Trader)",
  walletBalance: 125.00,
  totalLoansTaken: 15200,
  currentLoan: {
    amount: 4500,
    dueDate: "25 Jan, 2026",
    status: "active"
  },
  transactions: [
    { id: "TX1", type: "Repayment", amount: 500, date: "20 Jan, 2026", status: "completed" },
    { id: "TX2", type: "Disbursement", amount: 4500, date: "10 Jan, 2026", status: "completed" },
    { id: "TX3", type: "Deposit", amount: 200, date: "05 Jan, 2026", status: "completed" },
  ],
  loanHistory: [
    { id: "L001", amount: 2000, date: "15 Dec, 2025", status: "closed", paidDate: "30 Dec, 2025" },
    { id: "L002", amount: 1500, date: "10 Nov, 2025", status: "closed", paidDate: "25 Nov, 2025" },
    { id: "L003", amount: 4500, date: "10 Jan, 2026", status: "active", paidDate: null },
  ]
};

export default function UserDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // In a real app fitler/fetch by ID
  const user = mockUser; 

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Button 
            variant="ghost" 
            className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/users")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Users
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
                <Badge variant={user.status === "active" ? "default" : "destructive"}>
                  {user.status}
                </Badge>
                <Badge variant="outline" className="border-primary text-primary">
                  {user.tier}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{user.phone}</span>
                <span>•</span>
                <span>{user.email}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                Block User
              </Button>
              <Button>
                View Documents
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₵{user.walletBalance.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Available to withdraw</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₵{user.totalLoansTaken.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Lifetime borrowed amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Loan</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                 {user.currentLoan ? `₵${user.currentLoan.amount.toLocaleString()}` : "None"}
              </div>
              <p className="text-xs text-muted-foreground">
                {user.currentLoan ? `Due ${user.currentLoan.dueDate}` : "No active loans"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transactions">Wallet History</TabsTrigger>
            <TabsTrigger value="loans">Loan History</TabsTrigger>
            <TabsTrigger value="details">Profile Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>History of wallet movements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {user.transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                      <div className="space-y-1">
                        <p className="font-medium">{tx.type}</p>
                        <p className="text-sm text-muted-foreground">{tx.date}</p>
                      </div>
                      <div className={`font-bold ${tx.type === "Deposit" || tx.type === "Disbursement" ? "text-green-600" : "text-foreground"}`}>
                        {tx.type === "Repayment" ? "-" : "+"}₵{tx.amount}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="loans" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Loan History</CardTitle>
                <CardDescription>Past and current loans</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {user.loanHistory.map((loan) => (
                    <div key={loan.id} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                      <div className="space-y-1">
                        <p className="font-medium">Loan #{loan.id}</p>
                        <p className="text-sm text-muted-foreground">Taken: {loan.date} {loan.paidDate && `• Paid: ${loan.paidDate}`}</p>
                      </div>
                      <div className="text-right">
                         <div className="font-bold">₵{loan.amount}</div>
                         <Badge variant={loan.status === "active" ? "default" : "secondary"}>
                           {loan.status}
                         </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                     <p>{user.name}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Join Date</p>
                     <p>{user.joinedAt}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Address</p>
                     <p>{user.address}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">User ID</p>
                     <p className="font-mono text-sm">{user.id}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Gender</p>
                     <p>{user.gender}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Age</p>
                     <p>{user.age} Years</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Location</p>
                     <p>{user.location}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Accommodation</p>
                     <p>{user.accommodation}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Employment</p>
                     <p>{user.employment}</p>
                   </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
