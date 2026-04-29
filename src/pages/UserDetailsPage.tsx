import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, User, MapPin, Briefcase, Calendar, Phone, Mail, Hash, Edit3 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

import { IdentityKycSection } from "@/components/user/IdentityKycSection";
import { FinancialHealthSection } from "@/components/user/FinancialHealthSection";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ActionCenter } from "@/components/user/ActionCenter";
import { EditUserSheet } from "@/components/user/EditUserSheet";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { 
  getAdminUserProfile, 
  getUserActiveLoan, 
  blockUser, 
  unblockUser, 
  verifyUserKyc,
  softRejectUserKyc,
  failUserKyc,
  restoreUserKyc,
  revokeFraud,
  getAdminAgents
} from "@/lib/api";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";

// Robust date parser for mixed backend date formats (e.g. DD/MM/YYYY)
function parseDateRobust(dateStr: string | undefined | null): Date {
  if (!dateStr) return new Date("Invalid");
  
  // Test if it's already an ISO or valid standard date
  const standardDate = new Date(dateStr);
  if (!isNaN(standardDate.getTime())) return standardDate;

  // Try parsing DD/MM/YYYY or DD-MM-YYYY
  const regex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const match = dateStr.match(regex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const year = parseInt(match[3], 10);
    return new Date(year, month, day);
  }
  
  return new Date("Invalid");
}

// Helper to resolve Supabase storage URLs for KYC images
const getKycImageUrl = (path: string | undefined | null) => {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const bucket = import.meta.env.VITE_SUPABASE_BUCKET || "KYC-BUCKET";
  
  if (!supabaseUrl) return path;
  
  // Ensure we don't have double slashes
  const baseUrl = supabaseUrl.endsWith("/") ? supabaseUrl.slice(0, -1) : supabaseUrl;
  return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;
};

export default function UserDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const queryClient = useQueryClient();
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [unblockReason, setUnblockReason] = useState("");

  // Fetch User Profile
  const { data: userDataResponse, isLoading: isUserLoading, error: userError, refetch } = useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const res = await getAdminUserProfile(id!);
      return res;
    },
    enabled: !!id,
  });

  const userDataRaw = userDataResponse?.data || userDataResponse || {};
  const userData = userDataRaw.user || userDataRaw;
  const userPhone = userData.msisdn || userData.phone;

  const { data: agentData } = useQuery({
    queryKey: ["referrerAgent", userData?.referredByNodeCode],
    queryFn: async () => {
      const res = await getAdminAgents({ nodeCode: userData.referredByNodeCode });
      return res.data?.items?.[0] || null;
    },
    enabled: !!userData?.referredByNodeCode,
  });

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

  // Fetch User from List API (often contains the full unabridged MongoDB document)
  const { data: userListResponse, isLoading: isListUserLoading } = useQuery({
    queryKey: ["user-list-fallback", userPhone],
    queryFn: async () => {
      if (!userPhone) return {};
      const res = await api.get(`/api/admin/users`, { params: { search: userPhone } });
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
        const res = await getUserActiveLoan(userPhone);
        return res;
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

  const listData = userListResponse?.data || userListResponse?.users || userListResponse || [];
  const listUser = Array.isArray(listData) 
    ? listData.find((u: any) => u.msisdn === userPhone || u._id === id) || listData[0] || {} 
    : listData || {};

  // Map API data to UI structure
  const user = {
    id: userData._id || userData.id || id,
    name: userData.fullName || "Unknown User",
    surname: userData.surname || listUser.surname || "",
    email: userData.email || "N/A",
    phone: userData.msisdn || userData.phone || "N/A",
    alternatePhone: userData.alternatePhone || listUser.alternatePhone || null,
    tier: `L${userData.currentTier || 1}`,
    nodeCode: userData.personalNodeCode || userData.nodeCode || listUser.personalNodeCode || listUser.nodeCode || "N/A",
    referredBy: userData.referredByNodeCode || userData.onboardingData?.referredByNodeCode || userData.kyc?.referredByNodeCode || userData.onboardingData?.referredBy || userData.referredByEmail || userData.referredByMsisdn || userData.referredByName || listUser.referredByNodeCode || listUser.onboardingData?.referredByNodeCode || listUser.kyc?.referredByNodeCode || listUser.onboardingData?.referredBy || listUser.referredByEmail || listUser.referredByName || "Direct Signup",
    status: userData.isBlocked || listUser.isBlocked ? "blocked" : "active",
    joinedAt: (userData.createdAt || listUser.createdAt || userData.joinedAt || userData.dateJoined || userData.onboardingData?.createdAt || userDataRaw.createdAt) 
      ? new Date(userData.createdAt || listUser.createdAt || userData.joinedAt || userData.dateJoined || userData.onboardingData?.createdAt || userDataRaw.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) 
      : "N/A",
    address: userData.address || listUser.address || userData.onboardingData?.address || "N/A",
    location: userData.region || listUser.region || userData.location || userData.onboardingData?.region || "Ghana",
    gender: userData.gender || listUser.gender || userData.onboardingData?.gender || "N/A",
    dob: (() => {
      const rawDob = userData.dob || listUser.dob || userData.onboardingData?.dob || userData.age || listUser.age;
      // If it's a number, treat it as age
      if (typeof rawDob === 'number' || (!isNaN(Number(rawDob)) && rawDob)) {
         return `${rawDob} years old`;
      }
      // If it's a date string, format it
      if (rawDob && new Date(rawDob).toString() !== 'Invalid Date') {
         return new Date(rawDob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      }
      return "N/A";
    })(),
    accommodation: userData.accommodationType || userData.accommodation || listUser.accommodationType || userData.onboardingData?.accommodationType || "N/A",
    employment: userData.employmentStatus || userData.employment || listUser.employmentStatus || userData.onboardingData?.employmentStatus || "N/A",
    monthlyIncome: userData.monthlyIncome || listUser.monthlyIncome || userData.onboardingData?.monthlyIncome || "",
    walletBalance: Number(userData.temporaryWallet || listUser.temporaryWallet || 0),
    totalLoansTaken: Number(userData.totalLoansRepaid || listUser.totalLoansRepaid || 0),
    // KYC fields
    selfieUrl: getKycImageUrl(userData.selfieUrl || listUser.selfieUrl || userData.kyc?.selfieUrl || listUser.kyc?.selfieUrl || userData.kycData?.selfieUrl || userData.onboardingData?.selfieUrl),
    ghanaCardFrontUrl: getKycImageUrl(userData.ghanaCardFrontUrl || listUser.ghanaCardFrontUrl || userData.kyc?.ghanaCardFrontUrl || listUser.kyc?.ghanaCardFrontUrl || userData.onboardingData?.ghanaCardFrontUrl),
    ghanaCardBackUrl: getKycImageUrl(userData.ghanaCardBackUrl || listUser.ghanaCardBackUrl || userData.kyc?.ghanaCardBackUrl || listUser.kyc?.ghanaCardBackUrl || userData.onboardingData?.ghanaCardBackUrl),
    momoName: userData.momoName || listUser.momoName || userData.kyc?.momoName || userData.onboardingData?.momoName,
    ghanaCardName: userData.ghanaCardName || listUser.ghanaCardName || userData.kyc?.ghanaCardName || userData.onboardingData?.ghanaCardName || userData.fullName || listUser.fullName,
    ghanaCardNumber: userData.ghanaCardNumber || listUser.ghanaCardNumber || userData.kyc?.ghanaCardNumber || userData.onboardingData?.ghanaCardNumber,
    nodeConsentStatus: userData.nodeConsentStatus || listUser.nodeConsentStatus || userData.onboardingData?.nodeConsentStatus || "awaiting",
    kycStatus: userData.kycStatus || listUser.kycStatus || userData.onboardingData?.kycStatus || "pending",
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

  const currentLoan = activeLoanData ? (() => {
    let computedStatus = (activeLoanData.status || "active").toLowerCase();
    
    // Dynamically check dates since backend cron may not have run
    if (computedStatus === "active" && activeLoanData.dueDate) {
      const due = parseDateRobust(activeLoanData.dueDate);
      due.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (due.getTime() < today.getTime()) {
        computedStatus = "overdue";
      } else if (due.getTime() === today.getTime()) {
        computedStatus = "due today";
      }
    }

    return {
      amount: Number(activeLoanData.principal || activeLoanData.amount || 0),
      balance: Number(activeLoanData.balance || activeLoanData.remainingBalance || 0),
      dueDate: activeLoanData.dueDate 
        ? parseDateRobust(activeLoanData.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : "N/A",
      status: computedStatus,
      reference: activeLoanData.loanDetails?.loanReference || activeLoanData.loanReference || "N/A"
    };
  })() : null;

  // Render immediately when ANY user data is ready instead of waiting for all sub-queries
  const isLoading = isUserLoading || isListUserLoading;

  // 🎯 Custom Logic for User Archetypes
  const kycNorm = (user.kycStatus || "").toString().toLowerCase();
  const normalizedKycStatus = kycNorm === "unverified" ? "pending" : kycNorm || "pending";
  
  const isFirstTimeUser = (user.totalBorrowed || 0) === 0 && normalizedKycStatus !== "verified";
  const hasOverdueLoan = !!currentLoan && ((currentLoan.status || "").toString().toLowerCase() === "overdue");
  const isDueToday = !!currentLoan && ((currentLoan.status || "").toString().toLowerCase() === "due today");

  // Tier color mapping (local copy similar to UsersPage)
  const tierColors: Record<string, string> = {
    L1: "bg-muted text-muted-foreground border-muted",
    L2: "bg-info/10 text-info border-info/20",
    L3: "bg-primary/10 text-primary border-primary/20",
    L4: "bg-success/10 text-success border-success/20",
    L5: "bg-warning/10 text-warning border-warning/20",
    // High Tiers (L6-L10)
    L6: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    L7: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    L8: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    L9: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    L10: "bg-emerald-600 text-white font-bold",
    // Elite Tiers (L11-L20)
    L11: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    L12: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    L13: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    L14: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    L15: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    L16: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    L17: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    L18: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    L19: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    L20: "bg-slate-900 text-white font-black shadow-lg",
  };

  const { mutate: handleBlock, isPending: isBlockingOp } = useMutation({
    mutationFn: (reason: string) => blockUser(userPhone, reason),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      setIsBlockModalOpen(false);
      setBlockReason("");
      toast.success(`User blocked — ${data?.pendingLoansRejected || 0} pending loans rejected`);
    },
    onError: (error: any) => toast.error(getFriendlyErrorMessage(error)),
  });

  const { mutate: handleUnblock, isPending: isUnblockingOp } = useMutation({
    mutationFn: (reason: string) => unblockUser(userPhone, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      setIsUnblockModalOpen(false);
      setUnblockReason("");
      toast.success("User unblocked");
    },
    onError: (error: any) => toast.error(getFriendlyErrorMessage(error)),
  });

  const { mutate: handleVerifyKyc, isPending: isVerifyingKyc } = useMutation({
    mutationFn: (reason: string) => verifyUserKyc(userPhone, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      toast.success("KYC Verified");
    },
    onError: (error: any) => toast.error(getFriendlyErrorMessage(error)),
  });

  const { mutate: handleSoftRejectKyc, isPending: isSoftRejectingKyc } = useMutation({
    mutationFn: (reason: string) => softRejectUserKyc(userPhone, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      toast.success("KYC Soft Rejected");
    },
    onError: (error: any) => toast.error(getFriendlyErrorMessage(error)),
  });

  const { mutate: handleHardFailKyc, isPending: isHardFailingKyc } = useMutation({
    mutationFn: (reason: string) => failUserKyc(userPhone, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      toast.success("KYC Hard Failed");
    },
    onError: (error: any) => toast.error(getFriendlyErrorMessage(error)),
  });

  const { mutate: handleRestoreKyc, isPending: isRestoringKyc } = useMutation({
    mutationFn: (reason: string) => restoreUserKyc(userPhone, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      toast.success("KYC Restored");
    },
    onError: (error: any) => toast.error(getFriendlyErrorMessage(error)),
  });

  const revokeFraudMutation = useMutation({
    mutationFn: ({ reason }: { reason: string }) => revokeFraud(userPhone, reason),
    onSuccess: (res: any) => {
      toast.success(`Successfully revoked ${res.revokedCount || 0} commissions. GHS ${res.totalAmountRevoked?.toFixed(2) || "0.00"} deducted from agent balance.`);
      refetch();
    },
    onError: (error: any) => toast.error(getFriendlyErrorMessage(error)),
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
          {normalizedKycStatus === "pending" && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-warning text-warning-foreground animate-pulse">Action Required</Badge>
                <p className="text-sm font-medium text-warning dark:text-warning-foreground">First-time user awaiting KYC verification</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleVerifyKyc("Identity verification requested via dashboard banner")} disabled={isVerifyingKyc || !canWrite}>Approve Identity</Button>
              </div>
            </motion.div>
          )}

        {/* Header with Tier Visualizer */}
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm sm:rounded-[2rem]">
          <div className="bg-gradient-to-r from-primary/5 via-transparent to-transparent p-5 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between gap-6 sm:gap-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8 text-center sm:text-left">
                <div className="h-20 w-20 shrink-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-3xl font-black text-primary shadow-inner outline outline-4 outline-background sm:h-24 sm:w-24 sm:rounded-[2rem] sm:text-4xl flex items-center justify-center">
                  {user.name.charAt(0)}
                </div>
                <div className="space-y-4 w-full">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground break-words">{user.name}</h1>
                      <Badge className={cn("px-4 py-1 text-xs font-bold rounded-full h-fit", tierColors[user.tier] ?? tierColors.L1)}>{user.tier}</Badge>
                    </div>
                     {canWrite && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-4 text-[10px] sm:text-xs font-black uppercase tracking-widest border-primary/20 hover:bg-primary/10 text-primary transition-all sm:ml-auto"
                        onClick={() => setIsEditDrawerOpen(true)}
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-2" />
                        Edit Profile
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 bg-muted/50 px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold text-muted-foreground border border-border/40">
                      <Phone className="h-3 w-3" />
                      {user.phone}
                    </div>
                    <div className="flex items-center gap-2 bg-muted/50 px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold text-muted-foreground border border-border/40">
                      <Calendar className="h-3 w-3" />
                      {user.joinedAt}
                    </div>
                    <div className="flex items-center gap-2 bg-primary/10 px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black text-primary border border-primary/10">
                      Ref by: {user.referredBy}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tier Progress (for returning users) */}
              {!isFirstTimeUser && (
                <div className="w-full lg:w-72 self-center p-5 rounded-[1.5rem] bg-muted/30 border border-border/40 backdrop-blur-sm">
                  <div className="flex justify-between items-end mb-3">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Tier Advancement</p>
                      <p className="text-sm font-black text-foreground">Progress to {`L${parseInt(user.tier.slice(1)) + 1}`}</p>
                    </div>
                    <span className="text-sm font-black text-primary">{user.totalLoansTaken % 5}/5 <span className="text-[10px] text-muted-foreground/40 font-bold uppercase">Loans</span></span>
                  </div>
                  <div className="h-2.5 w-full bg-muted/50 rounded-full overflow-hidden shadow-inner border border-border/20">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(user.totalLoansTaken % 5) * 20}%` }}
                      className="h-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-1000 ease-out"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </motion.div>

        {/* Identity & KYC Section */}
        <IdentityKycSection 
          userId={user.id}
          userData={{
            selfieUrl: user.selfieUrl,
            ghanaCardFrontUrl: user.ghanaCardFrontUrl,
            ghanaCardBackUrl: user.ghanaCardBackUrl,
            fullName: user.name,
            momoName: user.momoName,
            ghanaCardName: user.ghanaCardName,
            nodeConsentStatus: user.nodeConsentStatus as "awaiting" | "accepted" | "declined",
            kycStatus: normalizedKycStatus as "pending" | "verified" | "rejected" | "failed",
            ghanaCardNumber: user.ghanaCardNumber
          }}
          onVerifyKyc={(reason: string) => handleVerifyKyc(reason)}
          onSoftRejectKyc={(reason: string) => handleSoftRejectKyc(reason)}
          onHardFailKyc={(reason: string) => handleHardFailKyc(reason)}
          onRestoreKyc={(reason: string) => handleRestoreKyc(reason)}
          onRevokeFraud={(reason: string) => revokeFraudMutation.mutate({ reason })}
          hasLoans={(user.totalBorrowed || 0) > 0}
          referrerName={agentData?.fullName}
          referrerMsisdn={agentData?.msisdn}
          isLoading={isVerifyingKyc || isSoftRejectingKyc || isHardFailingKyc || isRestoringKyc || revokeFraudMutation.isPending}
        />

        {/* Loan & Health Section */}
        <div className="w-full">
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
          <TabsList className="bg-muted p-1 grid grid-cols-3 w-full lg:w-fit lg:flex lg:flex-nowrap lg:inline-flex">
            <TabsTrigger value="transactions" className="px-4 py-2">History</TabsTrigger>
            <TabsTrigger value="loans" className="px-4 py-2">Loans</TabsTrigger>
            <TabsTrigger value="details" className="px-4 py-2">Profile</TabsTrigger>
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
                      <span className="text-xs font-medium uppercase">Date of Birth</span>
                    </div>
                    <p className="font-medium">{user.dob}</p>
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
                      <Phone className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase">Alternate Phone</span>
                    </div>
                    <p className="font-medium">{user.alternatePhone ? `+${user.alternatePhone}` : "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase">Employment</span>
                    </div>
                    <p className="font-medium">{user.employment}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hash className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase">Monthly Income</span>
                    </div>
                    <p className="font-medium">{user.monthlyIncome || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Floating Action Center */}
        <ActionCenter
          userId={user.id}
          kycStatus={user.kycStatus as "pending" | "verified" | "rejected" | "failed"}
          hasActiveLoan={!!currentLoan}
          isBlocked={user.status === "blocked"}
          onApproveLoan={() => { toast.info("Loan approval flow coming soon"); }}
          onBlock={() => setIsBlockModalOpen(true)}
          onUnblock={() => setIsUnblockModalOpen(true)}
          isLoading={isBlockingOp || isUnblockingOp}
        />

        {/* Unblock User Modal */}
        <Dialog open={isUnblockModalOpen} onOpenChange={setIsUnblockModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-success flex items-center gap-2">
                <span className="text-2xl">🔓</span> Unblock User
              </DialogTitle>
              <DialogDescription>
                Provide a reason for unblocking this user. Their access to the system will be restored immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="unblockReason">Reason</Label>
                <Input
                  id="unblockReason"
                  placeholder="e.g. Account reinstated after review..."
                  value={unblockReason}
                  onChange={(e) => setUnblockReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUnblockModalOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-success hover:bg-success/90 font-bold"
                onClick={() => handleUnblock(unblockReason)}
                disabled={!unblockReason.trim() || isUnblockingOp || !canWrite}
              >
                Unblock User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <span className="text-2xl">⚠️</span> Block User
              </DialogTitle>
              <DialogDescription>
                Provide a reason for blocking this user. They will no longer be able to request loans or use the system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="blockReason">Reason</Label>
                <Input
                  id="blockReason"
                  placeholder="Enter block reason..."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBlockModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleBlock(blockReason)}
                disabled={!blockReason.trim() || isBlockingOp || !canWrite}
              >
                Block User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Sheet */}
        <EditUserSheet
          isOpen={isEditDrawerOpen}
          setIsOpen={setIsEditDrawerOpen}
          userPhone={userPhone}
          userId={user.id}
          initialData={{
            fullName: userData.fullName || listUser.fullName || "",
            surname: userData.surname || listUser.surname || "",
            email: userData.email || listUser.email || "",
            address: userData.address || listUser.address || "",
            region: userData.region || listUser.region || "",
            employmentStatus: userData.employmentStatus || listUser.employmentStatus || "",
            monthlyIncome: userData.monthlyIncome || listUser.monthlyIncome || "",
          }}
        />
      </div>
    </DashboardLayout>
  );
}
