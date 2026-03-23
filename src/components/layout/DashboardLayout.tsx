import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation, Navigate } from "react-router-dom";

interface DashboardLayoutProps {
  readonly children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-6 w-40" /></div>;

  // Prevent agents from briefly seeing admin UI when visiting admin routes
  if (user?.role === "agent" && location.pathname.startsWith("/admin")) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-screen flex w-full bg-background-secondary overflow-hidden">
      <AppSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col min-h-0 h-full">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
