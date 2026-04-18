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
import Index from "./pages/Index";
import UsersPage from "./pages/UsersPage";
import LoansPage from "./pages/LoansPage";
import RepaymentsPage from "./pages/RepaymentsPage";
import SettingsPage from "./pages/SettingsPage";
import AgentsPage from "./pages/AgentsPage";
import AgentDetailsPage from "./pages/AgentDetailsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import LoginPage from "./pages/LoginPage";
import UserDetailsPage from "./pages/UserDetailsPage";
import SignupPage from "./pages/SignupPage";
import CheckEmailPage from "./pages/CheckEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ApplyPage from "./pages/ApplyPage";
import AgentApplyPage from "./pages/AgentApplyPage";
import NotFound from "./pages/NotFound";
import AgentLayout from "./components/layout/AgentLayout";
import AgentDashboard from "./pages/agent/AgentDashboard";
import AgentOnboarding from "./pages/agent/AgentOnboarding";
import AgentPortfolio from "./pages/agent/AgentPortfolio";
import AgentProfile from "./pages/agent/AgentProfile";
import AgentCommissionsPage from "./pages/agent/AgentCommissionsPage";
import AgentEndorsementsPage from "./pages/agent/AgentEndorsementsPage";
import AdminPayoutsPage from './pages/AdminPayoutsPage';
import PendingKycPage from "./pages/PendingKycPage";
import AuditLogs from "./pages/AuditLogs";
import AdminDeductionsPage from "./pages/AdminDeductionsPage";
import AdminManualDisbursePage from "./pages/AdminManualDisbursePage";
import { SessionManager } from "./components/auth/SessionManager";
import InstallPWA from "./components/InstallPWA";
import { CsaAuthProvider, useCsaAuth } from "@/contexts/CsaAuthContext";
import CsaLayout from "./components/csa/CsaLayout";
import CsaDashboard from "./pages/csa/CsaDashboard";
import CsaLoginPage from "./pages/csa/CsaLoginPage";
import CsaSignupPage from "./pages/csa/CsaSignupPage";
import CsaActivityPage from "./pages/csa/CsaActivityPage";
import CsaTemplatesPage from "./pages/csa/CsaTemplatesPage";
import { DevEligibilitySandbox } from "./pages/DevEligibilitySandbox";

import { getSubdomain } from "@/lib/domain";

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
  const isAllowed = user?.role === "admin" || user?.role === "viewer";
  if (!isAllowed) return <Navigate to="/agent" replace />;
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
                      <Route path="/repayments" element={<RequireAuth><AdminRoute><RepaymentsPage /></AdminRoute></RequireAuth>} />
                      <Route path="/payouts" element={<RequireAuth><AdminRoute><AdminPayoutsPage /></AdminRoute></RequireAuth>} />
                      <Route path="/admin/commissions/deductions" element={<RequireAuth><AdminRoute><AdminDeductionsPage /></AdminRoute></RequireAuth>} />
                      <Route path="/admin/loans/manual-disburse" element={<RequireAuth><AdminRoute><AdminManualDisbursePage /></AdminRoute></RequireAuth>} />
                      <Route path="/analytics" element={<RequireAuth><AdminRoute><AnalyticsPage /></AdminRoute></RequireAuth>} />
                      <Route path="/audit-logs" element={<RequireAuth><AdminRoute><AuditLogs /></AdminRoute></RequireAuth>} />
                      <Route path="/settings" element={<RequireAuth><AdminRoute><SettingsPage /></AdminRoute></RequireAuth>} />
                      <Route path="/agents" element={<RequireAuth><AdminRoute><AgentsPage /></AdminRoute></RequireAuth>} />
                      <Route path="/agents/:id" element={<RequireAuth><AdminRoute><AgentDetailsPage /></AdminRoute></RequireAuth>} />

                      <Route path="*" element={<NotFound />} />
                    </>
                  )}
                    </Routes>
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
