import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ApplicantProvider } from "@/contexts/ApplicantContext";
import { RequireAuth } from "@/components/auth/RequireAuth";
import RequireAgent from "@/components/auth/RequireAgent";
import Index from "./pages/Index";
import UsersPage from "./pages/UsersPage";
import LoansPage from "./pages/LoansPage";
import RepaymentsPage from "./pages/RepaymentsPage";
import SettingsPage from "./pages/SettingsPage";
import AgentsPage from "./pages/AgentsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import LoginPage from "./pages/LoginPage";
import UserDetailsPage from "./pages/UserDetailsPage";
import SignupPage from "./pages/SignupPage";
import CheckEmailPage from "./pages/CheckEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ApplyPage from "./pages/ApplyPage";
import NotFound from "./pages/NotFound";
import AgentLayout from "./components/layout/AgentLayout";
import AgentDashboard from "./pages/agent/AgentDashboard";
import AgentOnboarding from "./pages/agent/AgentOnboarding";
import AgentPortfolio from "./pages/agent/AgentPortfolio";
import AgentProfile from "./pages/agent/AgentProfile";
import PendingKycPage from "./pages/PendingKycPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ApplicantProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/check-email" element={<CheckEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/apply" element={<ApplyPage />} />
            
            {/* Agent Portal Routes */}
            <Route path="/agent" element={<RequireAgent><AgentLayout /></RequireAgent>}>
              <Route index element={<AgentDashboard />} />
              <Route path="onboard" element={<AgentOnboarding />} />
              <Route path="portfolio" element={<AgentPortfolio />} />
              <Route path="profile" element={<AgentProfile />} />
            </Route>
            
            {/* Protected Admin Routes */}
            <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
            <Route path="/kyc-approvals" element={<RequireAuth><PendingKycPage /></RequireAuth>} />
            <Route path="/users" element={<RequireAuth><UsersPage /></RequireAuth>} />
            <Route path="/users/:id" element={<RequireAuth><UserDetailsPage /></RequireAuth>} />
            <Route path="/loans" element={<RequireAuth><LoansPage /></RequireAuth>} />
            <Route path="/loans/pending" element={<RequireAuth><LoansPage /></RequireAuth>} />
            <Route path="/loans/active" element={<RequireAuth><LoansPage /></RequireAuth>} />
            <Route path="/loans/closed" element={<RequireAuth><LoansPage /></RequireAuth>} />
            <Route path="/loans/overdue" element={<RequireAuth><LoansPage /></RequireAuth>} />
            <Route path="/repayments" element={<RequireAuth><RepaymentsPage /></RequireAuth>} />
            <Route path="/analytics" element={<RequireAuth><AnalyticsPage /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
            <Route path="/agents" element={<RequireAuth><AgentsPage /></RequireAuth>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
    </ApplicantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
