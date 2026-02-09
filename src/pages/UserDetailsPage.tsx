import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, User, MapPin, Briefcase, Calendar, Phone, Mail, Hash } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import { IdentityKycSection } from "@/components/user/IdentityKycSection";
import { FinancialHealthSection } from "@/components/user/FinancialHealthSection";
import { ActionCenter } from "@/components/user/ActionCenter";

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
      const res = await api.get(`/api/admin/users/profile/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const userDataRaw = userDataResponse?.data || userDataResponse || {};
  const userData = userDataRaw.user || userDataRaw;
  const userPhone = userData.msisdn || userData.phone;

  // Fetch Wallet History
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

  // Fetch Active Loan
  const { data: activeLoanResponse } = useQuery({
    queryKey: ["user-active-loan", userPhone],
    queryFn: async () => {
      if (!userPhone) return null;
      try {
        const res = await api.get(`/api/loans/active/${userPhone}`);
        return res.data;
      } catch {
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
    nodeCode: userData.personalNodeCode || userData.nodeCode || "N/A",
    status: userData.isBlocked ? "blocked" : "active",
    joinedAt: userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "N/A",
    address: userData.address || "N/A",
    location: userData.location || "Ghana",
    gender: userData.gender || "N/A",
    age: userData.age || 0,
    accommodation: userData.accommodation || "N/A",
    employment: userData.employment || "N/A",
    walletBalance: Number(userData.temporaryWallet || 0),
    totalLoansTaken: Number(userData.totalLoansRepaid || 0),
    // KYC fields
    selfieUrl: userData.selfieUrl,
    ghanaCardFrontUrl: userData.ghanaCardFrontUrl,
    ghanaCardBackUrl: userData.ghanaCardBackUrl,
    momoName: userData.momoName,
    ghanaCardName: userData.ghanaCardName || userData.fullName,
    ghanaCardNumber: userData.ghanaCardNumber,
    nodeConsentStatus: userData.nodeConsentStatus || "awaiting",
    kycStatus: userData.kycStatus || "pending",
    // Financial metrics
    creditScore: userData.creditScore || Math.floor(Math.random() * 40) + 60, // Mock if not available
    totalBorrowed: Number(userData.totalBorrowed || userData.totalLoansTaken || 0),
    totalInterestPaid: Number(userData.totalInterestPaid || 0),
    onTimeRepaymentPercent: Number(userData.onTimeRepaymentPercent || 85),
    
    transactions: rawWalletHistory.map((t: any) => ({
      id: t.repaymentId || t._id || t.id, 
      type: t.type || "deposit", 
      amount: Number(t.amount || 0),
      date: new Date(t.createdAt || t.date || new Date()).toLocaleDateString('en-GB'),
      status: t.status || "completed",
      reference: t.reference || "N/A"
    })),
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

  const currentLoan = activeLoanData ? {
    amount: Number(activeLoanData.principal || activeLoanData.amount || 0),
    balance: Number(activeLoanData.balance || activeLoanData.remainingBalance || 0),
    dueDate: activeLoanData.dueDate 
      ? new Date(activeLoanData.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : "N/A",
    status: activeLoanData.status || "active",
    reference: activeLoanData.loanDetails?.loanReference || activeLoanData.loanReference || "N/A"
  } : null;

  const isLoading = isUserLoading || isWalletLoading || isLoansLoading;

  // 🎯 Custom Logic for User Archetypes
  const isFirstTimeUser = (user.totalBorrowed || 0) === 0 && user.kycStatus !== "verified";
  const hasOverdueLoan = !!currentLoan && ((currentLoan.status || "").toString().toLowerCase() === "overdue" || (currentLoan.status || "").toString().toUpperCase() === "OVERDUE");

  // Tier color mapping (local copy similar to UsersPage)
  const tierColors: Record<string, string> = {
    L1: "bg-muted text-muted-foreground border-muted",
    L2: "bg-info/10 text-info border-info/20",
    L3: "bg-primary/10 text-primary border-primary/20",
    L4: "bg-success/10 text-success border-success/20",
    L5: "bg-warning/10 text-warning border-warning/20",
  };

  // Mutations
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

  const { mutate: approveKyc, isPending: isApprovingKyc } = useMutation({
    mutationFn: async () => {
      await api.post(`/api/admin/users/${id}/kyc/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      toast.success("KYC approved successfully");
    },
    onError: () => {
      toast.error("Failed to approve KYC");
    },
  });

  const { mutate: rejectKyc, isPending: isRejectingKyc } = useMutation({
    mutationFn: async () => {
      await api.post(`/api/admin/users/${id}/kyc/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      toast.success("KYC rejected");
    },
    onError: () => {
      toast.error("Failed to reject KYC");
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-9 w-24 bg-muted rounded-md" />
          <div className="h-48 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

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
              <Button onClick={() => navigate("/users")}>Back to Users List</Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24 lg:pb-6">
        {/* Dynamic Alert Banner & Header */}
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/users")}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Users
            </Button>
          </div>

          {/* KYC Priority Banner */}
          {user.kycStatus === "pending" && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-warning text-warning-foreground animate-pulse">Action Required</Badge>
                <p className="text-sm font-medium text-warning-800">First-time user awaiting KYC verification</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => approveKyc()} disabled={isApprovingKyc}>Approve Identity</Button>
              </div>
            </motion.div>
          )}

          {/* Header with Tier Visualizer */}
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
            <div className="flex flex-col lg:flex-row justify-between gap-6">
              <div className="flex gap-4">
                <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{user.name}</h1>
                  <p className="text-muted-foreground">{user.phone}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className={cn("px-3 py-1", tierColors[user.tier] ?? tierColors.L1)}>{user.tier}</Badge>
                    <Badge variant="secondary" className="bg-muted text-xs">Joined {user.joinedAt}</Badge>
                  </div>
                </div>
              </div>

              {/* Tier Progress (for returning users) */}
              {!isFirstTimeUser && (
                <div className="lg:w-64 space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Progress to {`L${parseInt(user.tier.slice(1)) + 1}`}</span>
                    <span>{user.totalLoansTaken % 5}/5 Loans</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${(user.totalLoansTaken % 5) * 20}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Identity & KYC Section */}
        <IdentityKycSection 
          userData={{
            selfieUrl: user.selfieUrl,
            ghanaCardFrontUrl: user.ghanaCardFrontUrl,
            ghanaCardBackUrl: user.ghanaCardBackUrl,
            fullName: user.name,
            momoName: user.momoName,
            ghanaCardName: user.ghanaCardName,
            nodeConsentStatus: user.nodeConsentStatus as "awaiting" | "accepted" | "declined",
            kycStatus: user.kycStatus as "pending" | "verified" | "rejected",
            ghanaCardNumber: user.ghanaCardNumber
          }}
        />

        {/* Loan & Health Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Loan Card (Priority for Returning Users) */}
          <Card className={cn(hasOverdueLoan ? "border-destructive/50 bg-destructive/5" : "bg-primary/5 border-primary/20")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Current Obligation</CardTitle>
            </CardHeader>
            <CardContent>
              {currentLoan ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold text-foreground">₵{currentLoan.balance.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Due on {currentLoan.dueDate}</p>
                  </div>
                  <Badge className={hasOverdueLoan ? "bg-destructive" : "bg-primary"}>
                    {currentLoan.status.toString().toUpperCase()}
                  </Badge>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">No active loan</p>
                  <Button variant="link" className="text-primary text-xs" onClick={() => navigate('/loans')}>Disburse New</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <FinancialHealthSection
            creditScore={user.creditScore}
            walletBalance={user.walletBalance}
            totalBorrowed={user.totalBorrowed}
            totalInterestPaid={user.totalInterestPaid}
            onTimeRepaymentPercent={user.onTimeRepaymentPercent}
            currentLoan={currentLoan}
          />
        </div>

        {/* Tabs for History */}
        <Tabs defaultValue={isFirstTimeUser ? "details" : "loans"} className="space-y-4 w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="transactions">Wallet History</TabsTrigger>
            <TabsTrigger value="loans">Loan History</TabsTrigger>
            <TabsTrigger value="details">Profile</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Wallet deposits and repayments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {user.transactions.length > 0 ? user.transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="space-y-0.5">
                        <p className="font-medium">{tx.type}</p>
                        <p className="text-xs text-muted-foreground">{tx.date}</p>
                      </div>
                      <div className={`font-bold ${tx.type === "Deposit" || tx.type === "Disbursement" ? "text-success" : ""}`}>
                        {tx.type === "Repayment" ? "-" : "+"}₵{tx.amount.toLocaleString()}
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No transactions found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="loans">
            <Card>
              <CardHeader>
                <CardTitle>Loan History</CardTitle>
                <CardDescription>Past and current loans</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {user.loanHistory.length > 0 ? user.loanHistory.map((loan) => (
                    <div key={loan.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="space-y-0.5">
                        <p className="font-medium font-mono text-sm">#{loan.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {loan.date} {loan.paidDate && `→ ${loan.paidDate}`}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className="font-bold">₵{loan.amount.toLocaleString()}</span>
                        <Badge variant={loan.status === "active" ? "default" : "secondary"} className="capitalize">
                          {loan.status}
                        </Badge>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No loan history found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Profile Details</CardTitle>
                <CardDescription>Personal and contact information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase">Gender</span>
                    </div>
                    <p className="font-medium">{user.gender}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase">Age</span>
                    </div>
                    <p className="font-medium">{user.age} years</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase">Joined</span>
                    </div>
                    <p className="font-medium">{user.joinedAt}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase">Location</span>
                    </div>
                    <p className="font-medium">{user.location}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase">Address</span>
                    </div>
                    <p className="font-medium">{user.address}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase">Employment</span>
                    </div>
                    <p className="font-medium">{user.employment}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Floating Action Center */}
        <ActionCenter
          userId={user.id}
          kycStatus={user.kycStatus as "pending" | "verified" | "rejected"}
          hasActiveLoan={!!currentLoan}
          isBlocked={user.status === "blocked"}
          onApproveKyc={() => approveKyc()}
          onRejectKyc={() => rejectKyc()}
          onApproveLoan={() => toast.info("Loan approval flow coming soon")}
          onToggleBlock={() => toggleBlock()}
          isLoading={isBlocking || isApprovingKyc || isRejectingKyc}
        />
      </div>
    </DashboardLayout>
  );
}
