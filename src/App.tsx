import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import EmailTemplatesPage from "./pages/EmailTemplatesPage";
import { SessionManager } from "./components/auth/SessionManager";

import { getSubdomain } from "@/lib/domain";

const queryClient = new QueryClient();

// AdminRoute wrapper to guard admin-only pages
function AdminRoute({ children }: { readonly children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-6 w-40" /></div>;
  if (user?.role !== "admin") return <Navigate to="/agent" replace />;
  return <>{children}</>;
}

// Role-aware root handler: show admin dashboard to admins, redirect agents to /agent,
// and redirect unauthenticated visitors to /login.
function RoleHome() {
  const { user, loading } = useAuth();
  const sub = getSubdomain();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-6 w-40" /></div>;
  
  if (sub === "admin" && user?.role === "admin") return <Index />;
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
              <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Public Routes - Email Templates */}
                  <Route path="/email-templates" element={<EmailTemplatesPage />} />

                  {subdomain === "apply" && (
                    <>
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
                      <Route path="/analytics" element={<RequireAuth><AdminRoute><AnalyticsPage /></AdminRoute></RequireAuth>} />
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
