import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function SessionManager() {
  const { isAuthenticated, logout } = useAuth();
  const [warned, setWarned] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setWarned(false);
      return;
    }

    const intervalId = setInterval(() => {
      const expiryStr = localStorage.getItem("token_expiry");
      if (!expiryStr) return;

      const expiry = parseInt(expiryStr, 10);
      const now = Date.now();
      const timeLeft = expiry - now;

      if (timeLeft <= 0) {
        toast.error("Session Expired", {
          description: "Your session has reached its time limit. Please log in again."
        });
        logout();
      } else if (timeLeft <= 30 * 60 * 1000 && !warned) {
        toast.warning("Session Expiring Soon", {
          description: "Your session will expire in 30 minutes."
        });
        setWarned(true);
      }
    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [isAuthenticated, logout, warned]);

  return null;
}
