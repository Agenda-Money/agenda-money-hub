import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AgentSidebar } from "./AgentSidebar";
import { AgentHeader } from "./AgentHeader";
import { useSocket } from "@/hooks/useSocket";
import { motion } from "framer-motion";

export default function AgentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";
  const { isConnected } = useSocket(wsUrl);

  useEffect(() => {
    if (!isConnected) return;
  }, [isConnected]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AgentSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <AgentHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <motion.main 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-y-auto"
        >
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </motion.main>
      </div>
    </div>
  );
}
