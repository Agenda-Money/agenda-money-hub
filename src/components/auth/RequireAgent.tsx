import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface RequireAgentProps {
  children: React.ReactNode;
}

export default function RequireAgent({ children }: Readonly<RequireAgentProps>) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Check for inactivity timeout (15 minutes = 900000ms)
  useEffect(() => {
    if (!user) return;

    let timeout: NodeJS.Timeout;
    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

    const resetTimer = () => {
      if (timeout) clearTimeout(timeout);
      
      timeout = setTimeout(() => {
        console.log("Agent session timed out due to inactivity");
          // Logout functionality will be implemented when backend is ready
      }, INACTIVITY_TIMEOUT);
    };

    // Events to track for activity
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Start the timer
    resetTimer();

    return () => {
      if (timeout) clearTimeout(timeout);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has agent role
  // Check if user has agent role from user_metadata
  const isAgent = user.role === "agent" || user.agentCode !== undefined;

  if (!isAgent) {
    // Redirect admin users to admin dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
