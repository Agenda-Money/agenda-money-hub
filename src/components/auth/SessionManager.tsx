import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function SessionManager() {
  const { isAuthenticated, logout } = useAuth();
  const warned = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      warned.current = false;
      return;
    }

    const intervalId = setInterval(() => {
      const expiryStr = localStorage.getItem("token_expiry");
      if (!expiryStr) return;

      const expiry = parseInt(expiryStr, 10);
      const now = Date.now();
      const timeLeft = expiry - now;

      if (timeLeft <= 0) {
        // Perform logout on expiry; the API interceptor is responsible
        // for showing any "Session Expired" notifications to the user.
        logout(false);
      } else if (timeLeft <= 30 * 60 * 1000 && !warned.current) {
        toast.warning("Session Expiring Soon", {
          description: "Your session will expire in 30 minutes."
        });
        warned.current = true;
      }
    }, 10000); // Check every 10 seconds for more precise timing

    return () => clearInterval(intervalId);
  }, [isAuthenticated, logout]);

  return null;
}
