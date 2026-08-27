import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicantProvider } from "@/contexts/ApplicantContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { RequireAuth } from "@/components/auth/RequireAuth";
import RequireAgent from "@/components/auth/RequireAgent";
import AgentLayout from "./components/layout/AgentLayout";
import { SessionManager } from "./components/auth/SessionManager";
import InstallPWA from "./components/InstallPWA";
import { CsaAuthProvider, useCsaAuth } from "@/contexts/CsaAuthContext";
import CsaLayout from "./components/csa/CsaLayout";
import { getSubdomain } from "@/lib/domain";
import { ReportingGuard } from "./components/ReportingGuard";
import { ReportingLayout } from "./components/layout/ReportingLayout";
import FinanceLayout from "./components/layout/FinanceLayout";

// Every page below is route-specific and only ever rendered on one subdomain
// (admin/agent/apply/collections/report share a single build). Lazy-loading
// them means a visitor only downloads the JS for the portal + page they're
// actually on, instead of one ~3.2MB bundle shipped to every subdomain.
const Index = lazy(() => import("./pages/Index"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const LoansPage = lazy(() => import("./pages/LoansPage"));
const RepaymentsPage = lazy(() => import("./pages/RepaymentsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AgentsPage = lazy(() => import("./pages/AgentsPage"));
const AgentDetailsPage = lazy(() => import("./pages/AgentDetailsPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const UserDetailsPage = lazy(() => import("./pages/UserDetailsPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const CheckEmailPage = lazy(() => import("./pages/CheckEmailPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const ApplyPage = lazy(() => import("./pages/ApplyPage"));
const AgentApplyPage = lazy(() => import("./pages/AgentApplyPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AgentDashboard = lazy(() => import("./pages/agent/AgentDashboard"));
const AgentOnboarding = lazy(() => import("./pages/agent/AgentOnboarding"));
const AgentPortfolio = lazy(() => import("./pages/agent/AgentPortfolio"));
const AgentProfile = lazy(() => import("./pages/agent/AgentProfile"));
const AgentCommissionsPage = lazy(() => import("./pages/agent/AgentCommissionsPage"));
const AgentEndorsementsPage = lazy(() => import("./pages/agent/AgentEndorsementsPage"));
const AdminPayoutsPage = lazy(() => import("./pages/AdminPayoutsPage"));
const RewardTiersPage = lazy(() => import("./pages/reward-tiers/RewardTiersPage"));
const PendingKycPage = lazy(() => import("./pages/PendingKycPage"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const AdminDeductionsPage = lazy(() => import("./pages/AdminDeductionsPage"));
const AdminManualDisbursePage = lazy(() => import("./pages/AdminManualDisbursePage"));
const DirectDebitPage = lazy(() => import("./pages/DirectDebitPage"));
const OrchardPage = lazy(() => import("./pages/OrchardPage"));
const FinanceLoginPage = lazy(() => import("./pages/FinanceLoginPage"));
const FinanceOverviewPage = lazy(() =>
  import("./pages/FinancePage").then((m) => ({ default: m.FinanceOverviewPage })),
);
const FinancePnlPage = lazy(() =>
  import("./pages/FinancePage").then((m) => ({ default: m.FinancePnlPage })),
);
const FinanceLedgerPage = lazy(() =>
  import("./pages/FinancePage").then((m) => ({ default: m.FinanceLedgerPage })),
);
const FinanceChannelsPage = lazy(() =>
  import("./pages/FinancePage").then((m) => ({ default: m.FinanceChannelsPage })),
);
const FinancePortfolioPage = lazy(() =>
  import("./pages/FinancePage").then((m) => ({ default: m.FinancePortfolioPage })),
);
const FinanceCashflowPage = lazy(() =>
  import("./pages/FinancePage").then((m) => ({ default: m.FinanceCashflowPage })),
);
const CampaignHistoryPage = lazy(() =>
  import("./pages/rewards/RewardsCommsPages").then((m) => ({ default: m.CampaignHistoryPage })),
);
const MomoDisbursementPage = lazy(() =>
  import("./pages/rewards/RewardsCommsPages").then((m) => ({ default: m.MomoDisbursementPage })),
);
const SendAirtimePage = lazy(() =>
  import("./pages/rewards/RewardsCommsPages").then((m) => ({ default: m.SendAirtimePage })),
);
const SendSmsPage = lazy(() =>
  import("./pages/rewards/RewardsCommsPages").then((m) => ({ default: m.SendSmsPage })),
);
const CsaDashboard = lazy(() => import("./pages/csa/CsaDashboard"));
const CsaLoginPage = lazy(() => import("./pages/csa/CsaLoginPage"));
const CsaSignupPage = lazy(() => import("./pages/csa/CsaSignupPage"));
const CsaActivityPage = lazy(() => import("./pages/csa/CsaActivityPage"));
const CsaTemplatesPage = lazy(() => import("./pages/csa/CsaTemplatesPage"));
const TeamActivityPage = lazy(() => import("./pages/csa/TeamActivityPage"));
const DevEligibilitySandbox = lazy(() =>
  import("./pages/DevEligibilitySandbox").then((m) => ({ default: m.DevEligibilitySandbox })),
);
const ReportingDashboard = lazy(() => import("./pages/reporting/ReportingDashboard"));
const ReportingLoginPage = lazy(() => import("./pages/reporting/ReportingLoginPage"));
const ReportingInviteAccept = lazy(() => import("./pages/reporting/ReportingInviteAccept"));
const ReportingForgotPasswordPage = lazy(() => import("./pages/reporting/ReportingForgotPasswordPage"));
const ReportingResetPasswordPage = lazy(() => import("./pages/reporting/ReportingResetPasswordPage"));

const ReportingDomainRedirect = () => {
  useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      window.location.href = `http://${window.location.hostname}:8085${window.location.pathname}${window.location.search}`;
    } else {
      const host = window.location.host.replace(/^admin\./, 'report.');
      window.location.href = `${window.location.protocol}//${host}${window.location.pathname}${window.location.search}`;
    }
  }, []);
  return null;
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any, query) => {
      // Only show toast if the query doesn't have its own meta error handling
      // or if we want a global fallback. For now, let's provide a global fallback.
      if (query.meta?.errorMessage === false) return;
      toast.error(getFriendlyErrorMessage(error));
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: any, _variables, _context, mutation) => {
      // Only show toast if the mutation doesn't have its own onError handler
      // This avoids double toasts for components I've already updated.
      if (mutation.options.onError) return;
      toast.error(getFriendlyErrorMessage(error));
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

// Provides CsaAuthContext to all collections routes via a single shared instance
function CsaProviderLayout() {
  return (
    <CsaAuthProvider>
      <Outlet />
    </CsaAuthProvider>
  );
}

// CSA auth guard — redirects to /login if not authenticated
function CsaGuard() {
  const { isAuthenticated, loading } = useCsaAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-6 w-40" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// AdminRoute wrapper to guard admin-only pages
function AdminRoute({ children }: { readonly children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-6 w-40" /></div>;
  const isAllowed = user?.role === "admin" || user?.role === "viewer" || user?.role === "superadmin";
  if (!isAllowed) return <Navigate to="/agent" replace />;
  return <>{children}</>;
}

// Finance data (cost of funds, margin, payroll) is more sensitive than most
// of what's behind AdminRoute, so it's admin/superadmin only — no viewer.
function FinanceRoute({ children }: { readonly children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-6 w-40" /></div>;
  const isAllowed = user?.role === "admin" || user?.role === "superadmin";
  if (!isAllowed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Role-aware root handler: show admin dashboard to admins, redirect agents to /agent,
// and redirect unauthenticated visitors to /login.
function RoleHome() {
  const { user, loading } = useAuth();
  const sub = getSubdomain();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-6 w-40" /></div>;
  
  const isAdminOrViewer = user?.role === "admin" || user?.role === "viewer";
  if (sub === "admin" && isAdminOrViewer) return <Index />;
  if (sub === "agent" && user?.role === "agent") return <Navigate to="/agent" replace />;
  return <Navigate to="/login" replace />;
}

const App = () => {
  const subdomain = getSubdomain();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionManager />
        <ApplicantProvider>
          <SocketProvider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
              <InstallPWA />
              <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Skeleton className="h-6 w-40" /></div>}>
                <Routes>
                  {subdomain === "collections" && (
                    <Route element={<CsaProviderLayout />}>
                      <Route path="/login" element={<CsaLoginPage />} />
                      <Route path="/signup" element={<CsaSignupPage />} />
                      <Route element={<CsaGuard />}>
                        <Route element={<CsaLayout />}>
                          <Route path="/csa" element={<CsaDashboard />} />
                          <Route path="/csa/activity" element={<CsaActivityPage />} />
                          <Route path="/csa/templates" element={<CsaTemplatesPage />} />
                          <Route path="/csa/team" element={<TeamActivityPage />} />
                          <Route path="/" element={<Navigate to="/csa" replace />} />
                        </Route>
                      </Route>
                      <Route path="*" element={<Navigate to="/login" replace />} />
                    </Route>
                  )}

                  {subdomain === "apply" && (
                    <>
                      {import.meta.env.DEV && (
                        <Route path="/dev-eligibility" element={<DevEligibilitySandbox />} />
                      )}
                      <Route path="/" element={<ApplyPage />} />
                      <Route path="*" element={<ApplyPage />} />
                    </>
                  )}
                  {subdomain === "report" && (
                    <>
                      <Route path="/reporting/login" element={<ReportingLoginPage />} />
                      <Route path="/reporting/invite" element={<ReportingInviteAccept />} />
                      <Route path="/reporting/forgot-password" element={<ReportingForgotPasswordPage />} />
                      <Route path="/reporting/reset-password" element={<ReportingResetPasswordPage />} />
                      <Route element={<ReportingGuard />}>
                        <Route element={<ReportingLayout><Outlet /></ReportingLayout>}>
                          <Route path="/reporting/dashboard" element={<ReportingDashboard />} />
                          <Route path="/" element={<Navigate to="/reporting/dashboard" replace />} />
                        </Route>
                      </Route>
                      <Route path="*" element={<Navigate to="/reporting/login" replace />} />
                    </>
                  )}
                  {subdomain === "finance" && (
                    <>
                      <Route path="/login" element={<FinanceLoginPage />} />
                      <Route element={<RequireAuth><FinanceRoute><FinanceLayout /></FinanceRoute></RequireAuth>}>
                        <Route path="/finance" element={<FinanceOverviewPage />} />
                        <Route path="/finance/pnl" element={<FinancePnlPage />} />
                        <Route path="/finance/ledger" element={<FinanceLedgerPage />} />
                        <Route path="/finance/channels" element={<FinanceChannelsPage />} />
                        <Route path="/finance/portfolio" element={<FinancePortfolioPage />} />
                        <Route path="/finance/cashflow" element={<FinanceCashflowPage />} />
                        <Route path="/" element={<Navigate to="/finance" replace />} />
                      </Route>
                      <Route path="*" element={<Navigate to="/finance" replace />} />
                    </>
                  )}

                  {subdomain === "agent" && (
                    <>
                      {/* Public Agent Routes */}
                      <Route path="/" element={<RoleHome />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/signup" element={<SignupPage />} />
                      <Route path="/agent-apply" element={<AgentApplyPage />} />
                      <Route path="/check-email" element={<CheckEmailPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />

                      {/* Agent Portal Routes */}
                      <Route path="/agent" element={<RequireAgent><AgentLayout /></RequireAgent>}>
                        <Route index element={<AgentDashboard />} />
                        <Route path="onboard" element={<AgentOnboarding />} />
                        <Route path="portfolio" element={<AgentPortfolio />} />
                        <Route path="endorsements" element={<AgentEndorsementsPage />} />
                        <Route path="commissions" element={<AgentCommissionsPage />} />
                        <Route path="profile" element={<AgentProfile />} />
                      </Route>
                      
                      {/* Redirect anything else attempting to resolve to admin */}
                      <Route path="*" element={<NotFound />} />
                    </>
                  )}

                  {subdomain === "admin" && (
                    <>
                      {/* Public Admin Routes */}
                      <Route path="/" element={<RoleHome />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/signup" element={<SignupPage />} />
                      <Route path="/check-email" element={<CheckEmailPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />

                      {/* Redirect Reporting Email Links to Reporting Domain */}
                      <Route path="/reporting/*" element={<ReportingDomainRedirect />} />

                      {/* Protected Admin Routes */}
                      <Route path="/admin" element={<RequireAuth><AdminRoute><Index /></AdminRoute></RequireAuth>} />
                      <Route path="/kyc-approvals" element={<RequireAuth><AdminRoute><PendingKycPage /></AdminRoute></RequireAuth>} />
                      <Route path="/users" element={<RequireAuth><AdminRoute><UsersPage /></AdminRoute></RequireAuth>} />
                      <Route path="/users/:id" element={<RequireAuth><AdminRoute><UserDetailsPage /></AdminRoute></RequireAuth>} />
                      <Route path="/loans" element={<RequireAuth><AdminRoute><LoansPage /></AdminRoute></RequireAuth>} />
                      <Route path="/loans/pending" element={<RequireAuth><AdminRoute><LoansPage /></AdminRoute></RequireAuth>} />
                      <Route path="/loans/active" element={<RequireAuth><AdminRoute><LoansPage /></AdminRoute></RequireAuth>} />
                      <Route path="/loans/closed" element={<RequireAuth><AdminRoute><LoansPage /></AdminRoute></RequireAuth>} />
                      <Route path="/loans/overdue" element={<RequireAuth><AdminRoute><LoansPage /></AdminRoute></RequireAuth>} />
                      <Route path="/loans/awaiting-node" element={<RequireAuth><AdminRoute><LoansPage /></AdminRoute></RequireAuth>} />
                      <Route path="/loans/defaulted" element={<RequireAuth><AdminRoute><LoansPage /></AdminRoute></RequireAuth>} />
                      <Route path="/repayments" element={<RequireAuth><AdminRoute><RepaymentsPage /></AdminRoute></RequireAuth>} />
                      <Route path="/payouts" element={<RequireAuth><AdminRoute><AdminPayoutsPage /></AdminRoute></RequireAuth>} />
                      <Route path="/admin/commissions/deductions" element={<RequireAuth><AdminRoute><AdminDeductionsPage /></AdminRoute></RequireAuth>} />
                      <Route path="/admin/loans/manual-disburse" element={<RequireAuth><AdminRoute><AdminManualDisbursePage /></AdminRoute></RequireAuth>} />
                      <Route path="/admin/rewards" element={<Navigate to="/admin/rewards/send-airtime" replace />} />
                      <Route path="/admin/rewards/send-airtime" element={<RequireAuth><AdminRoute><SendAirtimePage /></AdminRoute></RequireAuth>} />
                      <Route path="/admin/rewards/send-sms" element={<RequireAuth><AdminRoute><SendSmsPage /></AdminRoute></RequireAuth>} />
                      <Route path="/admin/rewards/momo-disbursement" element={<RequireAuth><AdminRoute><MomoDisbursementPage /></AdminRoute></RequireAuth>} />
                      <Route path="/admin/rewards/campaign-history" element={<RequireAuth><AdminRoute><CampaignHistoryPage /></AdminRoute></RequireAuth>} />
                      <Route path="/admin/reward-tiers" element={<RequireAuth><AdminRoute><RewardTiersPage /></AdminRoute></RequireAuth>} />
                      <Route path="/analytics" element={<RequireAuth><AdminRoute><AnalyticsPage /></AdminRoute></RequireAuth>} />
                      <Route path="/audit-logs" element={<RequireAuth><AdminRoute><AuditLogs /></AdminRoute></RequireAuth>} />
                      <Route path="/settings" element={<RequireAuth><AdminRoute><SettingsPage /></AdminRoute></RequireAuth>} />
                      <Route path="/settings/:tab" element={<RequireAuth><AdminRoute><SettingsPage /></AdminRoute></RequireAuth>} />
                      <Route path="/admin/direct-debit" element={<RequireAuth><AdminRoute><DirectDebitPage /></AdminRoute></RequireAuth>} />
                      <Route path="/admin/direct-debit/:tab" element={<RequireAuth><AdminRoute><DirectDebitPage /></AdminRoute></RequireAuth>} />
                      <Route path="/admin/orchard" element={<RequireAuth><AdminRoute><OrchardPage /></AdminRoute></RequireAuth>} />
                      <Route path="/admin/orchard/:tab" element={<RequireAuth><AdminRoute><OrchardPage /></AdminRoute></RequireAuth>} />
                      <Route path="/agents" element={<RequireAuth><AdminRoute><AgentsPage /></AdminRoute></RequireAuth>} />
                      <Route path="/agents/:id" element={<RequireAuth><AdminRoute><AgentDetailsPage /></AdminRoute></RequireAuth>} />
                      <Route path="/admin/collections/monitoring" element={<RequireAuth><AdminRoute><CsaAuthProvider><TeamActivityPage /></CsaAuthProvider></AdminRoute></RequireAuth>} />


                      <Route path="*" element={<NotFound />} />
                    </>
                  )}
                    </Routes>
                </Suspense>
                  </BrowserRouter>
                </TooltipProvider>
              </ThemeProvider>
            </SocketProvider>
          </ApplicantProvider>
        </AuthProvider>
      </QueryClientProvider>
  );
};

export default App;
