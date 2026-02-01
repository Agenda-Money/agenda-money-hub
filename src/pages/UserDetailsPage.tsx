import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, User, MapPin, Briefcase, Calendar, Phone, Mail, Hash } from "lucide-react";
import { motion } from "framer-motion";

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
      const res = await api.get(`/api/admin/users/${id}`);
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
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          <Button 
            variant="ghost" 
            className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/users")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Users
          </Button>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-lg shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{user.name}</h1>
                  <Badge variant={user.status === "active" ? "default" : "destructive"} className="uppercase text-xs">
                    {user.status}
                  </Badge>
                  <Badge variant="outline" className="border-primary text-primary font-bold">
                    {user.tier}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {user.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5" />
                    {user.nodeCode}
                  </span>
                </div>
              </div>
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

        {/* Financial Health Snapshot */}
        <FinancialHealthSection
          creditScore={user.creditScore}
          walletBalance={user.walletBalance}
          totalBorrowed={user.totalBorrowed}
          totalInterestPaid={user.totalInterestPaid}
          onTimeRepaymentPercent={user.onTimeRepaymentPercent}
          currentLoan={currentLoan}
        />

        {/* Tabs for History */}
        <Tabs defaultValue="transactions" className="space-y-4">
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
