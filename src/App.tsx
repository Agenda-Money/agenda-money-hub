import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import UsersPage from "./pages/UsersPage";
import LoansPage from "./pages/LoansPage";
import RepaymentsPage from "./pages/RepaymentsPage";
import SettingsPage from "./pages/SettingsPage";
import AgentsPage from "./pages/AgentsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/loans" element={<LoansPage />} />
            <Route path="/loans/pending" element={<LoansPage />} />
            <Route path="/loans/active" element={<LoansPage />} />
            <Route path="/loans/overdue" element={<LoansPage />} />
            <Route path="/repayments" element={<RepaymentsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
