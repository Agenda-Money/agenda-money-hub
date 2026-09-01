import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { tokenRefreshService } from "@/services/tokenRefreshService";

import { toast } from "sonner";
import { getSubdomain } from "@/lib/domain";


interface AdminUser {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  agentCode?: string;
  phoneNumber?: string;
  alternatePhone?: string;
  createdAt?: string;
  created_at?: string;
  canShareNodeFeatures?: boolean;
  sidebar?: string[];
  permissions?: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
}


interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  signup: (data: any) => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; user?: AdminUser }>;
  logout: (showToast?: boolean) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; message?: string }>;
  updateProfile: (data: { fullName?: string; email?: string; alternatePhone?: string }) => Promise<{ success: boolean; message?: string }>;
  isAuthenticated: boolean;
  isViewer: boolean;
  canWrite: boolean;
  /** Superadmin-only actions (e.g. approving a ledger entry deletion) —
   * mirrors canWrite's shape exactly. permissions.delete is typed on
   * AdminUser but not populated by the backend today; role is the
   * reliable signal until that changes. */
  canDelete: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define a helper to securely and consistently extract the role prioritizing user_metadata
const extractRole = (userData: any) => {
  return userData?.user_metadata?.role || userData?.role;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    tokenRefreshService.init();
    return () => tokenRefreshService.stopRefreshTimer();
  }, []);

  // Manual handleTokenRefresh if needed by components, otherwise the service handles it
  const handleTokenRefresh = async () => {
    return await tokenRefreshService.refreshAccessToken();
  };

  const checkAuth = async () => {
    let token = localStorage.getItem("accessToken") || localStorage.getItem("token") || sessionStorage.getItem("token");
    const expiry = localStorage.getItem("expiresAt") || localStorage.getItem("token_expires_at") || localStorage.getItem("token_expiry");

    // Check expiry (handle both ms and seconds during migration)
    if (expiry) {
       let expiryMs: number;
       if (isNaN(Number(expiry))) {
         // It's a string (e.g. ISO string)
         expiryMs = new Date(expiry).getTime();
       } else {
         const expiryNum = parseInt(expiry, 10);
         const isSeconds = expiryNum < 10000000000; // Simple heuristic for seconds vs ms
         expiryMs = isSeconds ? expiryNum * 1000 : expiryNum;
       }

       if (Date.now() > expiryMs) {
          const hasRefreshToken = !!(localStorage.getItem("refreshToken") || localStorage.getItem("refresh_token"));
          if (!hasRefreshToken) {
             logout(false);
             return;
          }
          // Service will attempt refresh on initialization if enabled, or checkAuth will trigger 401
       }
    }

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/api/admin/auth/me");
      
      if (response.status === 200 || response.status === 201) {
        const adminData = response.data.data || response.data.admin || response.data.user || response.data;
        const sub = getSubdomain();
        const actualRole = extractRole(adminData)?.toLowerCase();
        
        const isPermittedRole = ["admin", "superadmin", "super_admin", "viewer"].includes(actualRole);
        
        if (sub === "admin" && !isPermittedRole) {
          logout(false);
        } else if (sub === "agent" && actualRole !== "agent") {
          logout(false);
        } else if (
          sub === "apply" &&
          ["admin", "agent", "viewer"].includes(actualRole)
        ) {
          logout(false);
        } else {
          setUser({ ...adminData, role: actualRole });
        }
      } else {
        logout(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: any) => {
    try {
      const response = await api.post("/api/admin/auth/signup", data);
      
      if (response.data.success) {
        toast.success("Account created successfully", {
          description: "Please login with your new credentials.",
        });
        return true;
      }
      return false;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Signup failed. Please try again.";
      toast.error("Signup Failed", {
        description: errorMessage,
      });
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string; user?: AdminUser }> => {
    try {
      const sub = getSubdomain();

      if (sub === "apply") {
        return { success: false, message: "Invalid credentials. Please try again." };
      }

      // portal tells the backend which login surface this is — it rejects
      // agent-role accounts server-side when portal is "admin", closing the
      // gap where a direct API call could bypass the client-side role gate
      // below. See admin-auth.service.ts's login() for the enforcement.
      const response = await api.post("/api/admin/auth/login", { email, password, portal: sub });

      if (response.status !== 200 && response.status !== 201) {
        const msg = response.data.message || "Invalid credentials";
        return { success: false, message: msg };
      }

      const admin = response.data.admin || response.data.user || response.data.data;
      const token = response.data.token || response.data.accessToken;
      const refreshToken = response.data.refreshToken;
      const expiresAt = response.data.expiresAt;
      const expiresIn = response.data.expiresIn; // Usually seconds

      if (!admin || !token) {
        return { success: false, message: "An error occurred during login. Please try again." };
      }

      const actualRole = extractRole(admin)?.toLowerCase();

    const isPermittedRole = ["admin", "superadmin", "super_admin", "viewer"].includes(actualRole);

    if (sub === "admin" && !isPermittedRole) {
      return { success: false, message: "Invalid credentials. Please try again." };
    }
    if (sub === "agent" && actualRole !== "agent") {
      return { success: false, message: "Invalid credentials. Please try again." };
    }

      let expiryTimestamp: number;
    let finalExpiresAt = expiresAt;
    
    if (expiresAt) {
      expiryTimestamp = new Date(expiresAt).getTime();
    } else if (expiresIn) {
      // Handle potential string formats like "8h", "24h", "30d" or seconds numeric format
      let secondsToAdd = 86400; // default 24h
      if (typeof expiresIn === 'string') {
        if (expiresIn.endsWith('h')) {
          secondsToAdd = parseInt(expiresIn, 10) * 3600;
        } else if (expiresIn.endsWith('d')) {
          secondsToAdd = parseInt(expiresIn, 10) * 86400;
        } else if (expiresIn.endsWith('m')) {
          secondsToAdd = parseInt(expiresIn, 10) * 60;
        } else {
          secondsToAdd = parseInt(expiresIn, 10);
        }
      } else if (typeof expiresIn === 'number') {
        secondsToAdd = expiresIn;
      }
      expiryTimestamp = Date.now() + (secondsToAdd * 1000);
      finalExpiresAt = new Date(expiryTimestamp).toISOString();
    } else {
      expiryTimestamp = Date.now() + (actualRole === "agent" ? 24 : 12) * 60 * 60 * 1000;
      finalExpiresAt = new Date(expiryTimestamp).toISOString();
    }

    localStorage.setItem("accessToken", token);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    if (finalExpiresAt) localStorage.setItem("expiresAt", finalExpiresAt.toString());
    localStorage.setItem("user", JSON.stringify(admin));
      
      // Cleanup old legacy keys
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("token_expires_at");
      localStorage.removeItem("token_expiry");
      sessionStorage.removeItem("token");

      // Start refresh timer using the correctly parsed finalExpiresAt
      if (finalExpiresAt) {
        tokenRefreshService.startRefreshTimer(finalExpiresAt);
      }

      const normalizedAdmin = { ...admin, role: actualRole };
      setUser(normalizedAdmin);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      toast.success("Welcome back!", {
        description: "You have successfully logged in.",
      });
      return { success: true, user: normalizedAdmin };
    } catch (error: any) {
      return { success: false, message: error.friendlyMessage || "Invalid credentials. Please try again." };
    }
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.post("/api/admin/auth/forgot-password", { email });
      if (response.data.success) {
        toast.success("Reset link sent", { description: "Check your email for the password reset link." });
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error: any) {
      return { success: false, message: error.friendlyMessage || "Failed to send reset link" };
    }
  };

  const resetPassword = async (token: string, password: string): Promise<{ success: boolean; message?: string }> => {
    if (!token || token.trim() === '') {
        return { success: false, message: "Invalid reset token." };
    }

    try {
      const response = await api.post("/api/admin/auth/reset-password", { token, newPassword: password });
      if (response.data.success) {
        toast.success("Password reset successful", { description: "You can now login with your new password." });
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error: any) {
      return { success: false, message: error.friendlyMessage || "Failed to reset password" };
    }
  };

  const updateProfile = async (data: { fullName?: string; email?: string; alternatePhone?: string }): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.patch("/api/admin/auth/profile", data);
      if (response.data.success) {
        setUser(prev => prev ? { ...prev, ...data } : prev);
        toast.success("Profile updated", { description: "Your profile has been updated successfully." });
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error: any) {
      return { success: false, message: error.friendlyMessage || "Failed to update profile" };
    }
  };


  const logout = async (showToast = true) => {
    try {
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token") || sessionStorage.getItem("token");
      if (token) {
        await api.post("/api/admin/auth/logout");
      }
    } catch (e) {
      console.error("Logout API call failed:", e.message || e);
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("expiresAt");
    localStorage.removeItem("user");
    
    // Legacy keys cleanup
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token_expires_at");
    localStorage.removeItem("token_expiry");
    localStorage.removeItem("agenda_token");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("agenda_token");
    
    tokenRefreshService.stopRefreshTimer();
    setUser(null);
    delete api.defaults.headers.common["Authorization"];
    
    if (showToast) {
      toast.success("Logged out successfully");
    }

    // Explicit redirection to login page or home
    const sub = getSubdomain();
    const isLoginPage = window.location.pathname === "/login";

    if ((sub === "admin" || sub === "agent") && !isLoginPage) {
      window.location.href = "/login";
    } else if (window.location.pathname !== "/" && !isLoginPage) {
      window.location.href = "/";
    } else if (showToast && !isLoginPage) {
       // Only reload if it was a manual logout to clear any memory states
       window.location.reload();
    }
  };

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      login,
      signup,
      logout,
      forgotPassword,
      resetPassword,
      updateProfile,
      isAuthenticated: !!user,
      isViewer: user?.role === "viewer",
      canWrite: user?.permissions?.write !== false && user?.role !== "viewer",
      canDelete: user?.permissions?.delete === true || user?.role === "superadmin",
    }),
    [
      user,
      loading,
      login,
      signup,
      logout,
      forgotPassword,
      resetPassword,
      updateProfile,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
