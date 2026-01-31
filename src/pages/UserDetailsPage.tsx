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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function UserDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch User Profile
  const { data: userDataResponse, isLoading: isUserLoading, error: userError } = useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const res = await api.get(`/api/admin/users/${id}`);
      console.log("User data response:", res.data);
      return res.data;
    },
    enabled: !!id,
  });

  // Show error if user fetch fails
  if (userError) {
    console.error("Error fetching user:", userError);
  }

  const userDataRaw = userDataResponse?.data || userDataResponse || {};
  const userData = userDataRaw.user || userDataRaw; // Handle optional wrapper
  const userPhone = userData.msisdn || userData.phone;

  console.log("Processed userData:", userData);
  console.log("User phone:", userPhone);

  // Fetch Wallet History (Repayments)
  const { data: walletHistoryResponse, isLoading: isWalletLoading } = useQuery({
    queryKey: ["user-wallet", userPhone],
    queryFn: async () => {
      if (!userPhone) return { data: [] };
      const res = await api.get("/api/admin/repayments", { 
        params: { msisdn: userPhone, limit: 20 } 
      });
      return res.data;
    },
    enabled: !!userPhone,
  });

  // Fetch Loan History
  const { data: loanHistoryResponse, isLoading: isLoansLoading } = useQuery({
    queryKey: ["user-loans", userPhone],
    queryFn: async () => {
      if (!userPhone) return { data: [] };
      const res = await api.get("/api/admin/loans", { 
        params: { search: userPhone, limit: 20 } 
      });
      return res.data;
    },
    enabled: !!userPhone,
  });

  // Fetch Active Loan Specific Details
  const { data: activeLoanResponse, isLoading: isActiveLoanLoading } = useQuery({
    queryKey: ["user-active-loan", userPhone],
    queryFn: async () => {
      if (!userPhone) return null;
      try {
        // Correct endpoint provided by user
        const res = await api.get(`/api/loans/active/${userPhone}`);
        return res.data;
      } catch (error) {
        return null;
      }
    },
    enabled: !!userPhone,
    retry: false
  });
  
  const rawWalletHistory = walletHistoryResponse?.data || (Array.isArray(walletHistoryResponse) ? walletHistoryResponse : []) || [];
  const rawLoanHistory = loanHistoryResponse?.data || loanHistoryResponse?.loans || [];
  
  const activeLoanData = activeLoanResponse?.data || activeLoanResponse;

  // Map API data to UI structure
  const user = {
    id: userData._id || userData.id || id,
    name: userData.fullName || "Unknown User",
    email: userData.email || "N/A",
    phone: userData.msisdn || userData.phone || "N/A",
    tier: `L${userData.currentTier || 1}`,
    // Prioritize personal node code (graduated), fallback to referrer node code
    nodeCode: userData.personalNodeCode || userData.nodeCode || "N/A",
    status: userData.isBlocked ? "blocked" : "active",
    joinedAt: userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-GB') : "N/A",
    address: userData.address || "N/A",
    location: userData.location || "Ghana",
    gender: userData.gender || "N/A",
    age: userData.age || 0,
    accommodation: userData.accommodation || "N/A",
    employment: userData.employment || "N/A",
    walletBalance: userData.temporaryWallet || 0,
    totalLoansTaken: userData.totalLoansRepaid || 0,
    
    // Transactions from Wallet History Endpoint
    transactions: rawWalletHistory.map((t: any) => ({
      id: t.repaymentId || t._id || t.id, 
      type: t.type || "deposit", 
      amount: Number(t.amount || 0),
      date: new Date(t.createdAt || t.date || new Date()).toLocaleDateString('en-GB'),
      status: t.status || "completed",
      reference: t.reference || "N/A"
    })),

    // Loans from Loan History Endpoint
    loanHistory: rawLoanHistory.map((l: any) => ({
      id: l.loanReference || l.id || l._id,
      amount: Number(l.principal || l.amount || 0),
      date: new Date(l.createdAt || l.date || new Date()).toLocaleDateString('en-GB'),
      status: l.status || "closed",
      term: l.tenure || "14 days",
      dueDate: l.dueDate || l.repaymentDate,
      paidDate: l.paidAt || (l.status === 'closed' ? l.updatedAt : null)
    }))
  };

  // Derive active loan from the specific endpoint data if available
  // Ensure amount is a number to prevent toLocaleString crashes
  const currentLoan = activeLoanData ? {
    amount: Number(activeLoanData.principal || activeLoanData.amount || 0),
    dueDate: activeLoanData.dueDate 
      ? new Date(activeLoanData.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : "N/A",
    status: activeLoanData.status || "active",
    reference: activeLoanData.loanDetails?.loanReference || activeLoanData.loanReference || "N/A",
    balance: Number(activeLoanData.balance || activeLoanData.remainingBalance || 0)
  } : null;

  const finalUser = {
    ...user,
    walletBalance: Number(user.walletBalance || 0),
    totalLoansTaken: Number(user.totalLoansTaken || 0),
    currentLoan
  };

  const isLoading = isUserLoading || isWalletLoading || isLoansLoading;

  // Mutation for blocking/unblocking
  const { mutate: toggleBlock, isPending: isBlocking } = useMutation({
    mutationFn: async () => {
      const action = user.status === "active" ? "block" : "unblock";
      await api.post(`/api/admin/users/${id}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      toast.success(`User ${user.status === "active" ? "blocked" : "unblocked"} successfully`);
    },
    onError: () => {
      toast.error("Failed to update user status");
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
           {/* Header Skeleton */}
          <div className="flex flex-col gap-4">
             <div className="h-9 w-24 bg-muted rounded-md" /> {/* Back button */}
             <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
               <div className="space-y-2">
                 <div className="flex items-center gap-3">
                   <div className="h-8 w-48 bg-muted rounded-md" /> {/* Name */}
                   <div className="h-6 w-20 bg-muted rounded-full" /> {/* Status */}
                   <div className="h-6 w-16 bg-muted rounded-full" /> {/* Tier */}
                 </div>
                 <div className="h-4 w-64 bg-muted rounded-md" /> {/* Details line */}
               </div>
               <div className="flex gap-2">
                 <div className="h-9 w-24 bg-muted rounded-md" /> {/* Action button */}
                 <div className="h-9 w-32 bg-muted rounded-md" /> {/* Action button */}
               </div>
             </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-muted rounded-xl" />
            <div className="h-32 bg-muted rounded-xl" />
            <div className="h-32 bg-muted rounded-xl" />
          </div>

           {/* Tabs and Content Skeleton */}
          <div className="space-y-4">
             <div className="h-10 w-full max-w-sm bg-muted rounded-md" /> {/* Tabs list */}
             <div className="h-64 bg-muted rounded-xl" /> {/* Tab content */}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show error state if user data failed to load
  if (userError || !userData || !userData._id) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Button 
            variant="ghost" 
            className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/users")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Users
          </Button>
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="text-6xl">⚠️</div>
              <h2 className="text-2xl font-bold">User Not Found</h2>
              <p className="text-muted-foreground">
                The user you're looking for doesn't exist or there was an error loading their data.
              </p>
              <p className="text-sm text-muted-foreground">User ID: {id}</p>
              <Button onClick={() => navigate("/users")}>
                Back to Users List
              </Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  } 

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
                <h1 className="text-3xl font-bold tracking-tight">{finalUser.name}</h1>
                <Badge variant={finalUser.status === "active" ? "default" : "destructive"}>
                  {finalUser.status}
                </Badge>
                <Badge variant="outline" className="border-primary text-primary">
                  {finalUser.tier}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{finalUser.phone}</span>
                <span>•</span>
                <span>{finalUser.email}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={finalUser.status === "active" ? "destructive" : "default"}
                size="sm"
                onClick={() => toggleBlock()}
                disabled={isBlocking}
                className={finalUser.status === "active" ? "" : "bg-green-600 hover:bg-green-700"}
              >
                {finalUser.status === "active" ? "Block User" : "Unblock User"}
              </Button>
              <Button size="sm" variant="outline">
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
              <div className="text-2xl font-bold">₵{finalUser.walletBalance?.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Available to withdraw</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{finalUser.totalLoansTaken?.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Lifetime borrowed count</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Loan</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                 {finalUser.currentLoan ? `₵${finalUser.currentLoan.amount.toLocaleString()}` : "None"}
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <p className="text-xs text-muted-foreground">
                  {finalUser.currentLoan ? `Due ${finalUser.currentLoan.dueDate}` : "No active loans"}
                </p>
                {finalUser.currentLoan && (
                   <Badge variant="secondary" className="w-fit text-[10px] h-5 px-1.5 uppercase">
                     {finalUser.currentLoan.status}
                   </Badge>
                )}
              </div>
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
                  {finalUser.transactions.map((tx) => (
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
                  {finalUser.transactions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No transactions found</p>
                  )}
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
                  {finalUser.loanHistory.map((loan) => (
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
                  {finalUser.loanHistory.length === 0 && (
                     <p className="text-sm text-muted-foreground text-center py-4">No loan history found</p>
                  )}
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
                     <p>{finalUser.name}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Join Date</p>
                     <p>{finalUser.joinedAt}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Address</p>
                     <p>{finalUser.address}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">User ID</p>
                     <p className="font-mono text-sm">{finalUser.id}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Node Code</p>
                     <Badge variant="outline" className="font-mono">{finalUser.nodeCode}</Badge>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Gender</p>
                     <p>{finalUser.gender}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Age</p>
                     <p>{finalUser.age} Years</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Location</p>
                     <p>{finalUser.location}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Accommodation</p>
                     <p>{finalUser.accommodation}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Employment</p>
                     <p>{finalUser.employment}</p>
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
