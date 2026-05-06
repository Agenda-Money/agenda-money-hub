import { useState } from "react";
import { ReportingSidebar } from "./ReportingSidebar";
import { ReportingHeader } from "./ReportingHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useReportingAuthStore } from "@/store/reportingAuth.store";

interface ReportingLayoutProps {
  readonly children: React.ReactNode;
}

export function ReportingLayout({ children }: ReportingLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthed } = useReportingAuthStore();

  if (!isAuthed) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-6 w-40" /></div>;

  return (
    <div className="h-screen flex w-full bg-background-secondary overflow-hidden">
      <ReportingSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col min-h-0 h-full">
        <ReportingHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
