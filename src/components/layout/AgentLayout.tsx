import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AgentSidebar } from "./AgentSidebar";
import { Header } from "./Header";
import { useSocket } from "@/hooks/useSocket";

export default function AgentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";
  const { isConnected } = useSocket(wsUrl);

  useEffect(() => {
    if (isConnected) {
      console.log("Agent WebSocket connected - listening for KYC_VERIFIED_SUCCESS");
    }
  }, [isConnected]);

  return (
    <div className="min-h-screen bg-background flex">
      <AgentSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col lg:ml-0">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
