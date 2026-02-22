import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { supabase } from "@/lib/supabase";
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
}


interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  signup: (data: any) => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; user?: AdminUser }>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; message?: string }>;
  updateProfile: (data: { fullName?: string; email?: string }) => Promise<{ success: boolean; message?: string }>;
  isAuthenticated: boolean;
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
  }, []);

  const checkAuth = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/api/admin/auth/me");
      
      // Checking for HTTP 200 or 201 as the source of truth
      if (response.status === 200 || response.status === 201) {
        // Flexibly parse the user data payload
        const adminData = response.data.data || response.data.admin || response.data.user || response.data;
        const sub = getSubdomain();
        const actualRole = extractRole(adminData);
        
        // Silent clear if token role doesn't match subdomain.
        if (sub === "admin" && actualRole !== "admin") {
          sessionStorage.removeItem("token");
          setUser(null);
        } else if (sub === "agent" && actualRole !== "agent") {
          sessionStorage.removeItem("token");
          setUser(null);
        } else if (
          sub === "apply" &&
          (actualRole === "admin" || actualRole === "agent")
        ) {
          sessionStorage.removeItem("token");
          setUser(null);
        } else {
          // Normalize: ensure user.role always reflects the extracted role
          setUser({ ...adminData, role: actualRole });
        }
      } else {
        sessionStorage.removeItem("token");
      }
    } catch (error) {
      console.error("Auth check failed", error);
      sessionStorage.removeItem("token");
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

      // The apply subdomain uses OTP-based authentication, not password login.
      if (sub === "apply") {
        return { success: false, message: "Invalid credentials. Please try again." };
      }

      const response = await api.post("/api/admin/auth/login", { email, password });

      if (response.status !== 200 && response.status !== 201) {
        const msg = response.data.message || "Invalid credentials";
        return { success: false, message: msg };
      }

      // Some endpoints return the user as `admin`, others might return `user` or `data`
      const admin = response.data.admin || response.data.user || response.data.data;
      const token = response.data.token || response.data.accessToken;

      if (!admin || !token) {
        return { success: false, message: "An error occurred during login. Please try again." };
      }

      const actualRole = extractRole(admin);

      if (sub === "admin" && actualRole !== "admin") {
        return { success: false, message: "Invalid credentials. Please try again." };
      }
      if (sub === "agent" && actualRole !== "agent") {
        return { success: false, message: "Invalid credentials. Please try again." };
      }

      sessionStorage.setItem("token", token);
      // Normalize: ensure user.role always reflects the extracted role
      const normalizedAdmin = { ...admin, role: actualRole };
      setUser(normalizedAdmin);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      toast.success("Welcome back!", {
        description: "You have successfully logged in.",
      });
      return { success: true, user: normalizedAdmin };
    } catch (error: any) {
      const errorMessage = 
        error.response?.data?.message || 
        error.response?.data?.error || 
        "Invalid credentials. Please try again.";
        
      return { success: false, message: errorMessage };
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
      return { success: false, message: error.response?.data?.message || "Failed to send reset link" };
    }
  };

  const resetPassword = async (token: string, password: string): Promise<{ success: boolean; message?: string }> => {
    let useToken = token;
    
    // Fallback: If no token provided (or empty/whitespace), try to get from active session
    if (!useToken || useToken.trim() === '') {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
            useToken = data.session.access_token;
        }
    }

    if (!useToken) {
        return { success: false, message: "No session token found. Session expired or invalid link." };
    }

    try {
      const response = await api.patch("/api/admin/auth/reset-password", 
        { password },
        { headers: { Authorization: `Bearer ${useToken}` } }
      );
      if (response.data.success) {
        toast.success("Password reset successful", { description: "You can now login with your new password." });
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || "Failed to reset password" };
    }
  };

  const updateProfile = async (data: { fullName?: string; email?: string }): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.patch("/api/admin/auth/profile", data);
      if (response.data.success) {
        setUser(prev => prev ? { ...prev, ...data } : prev);
        toast.success("Profile updated", { description: "Your profile has been updated successfully." });
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || "Failed to update profile" };
    }
  };


  const logout = () => {
    sessionStorage.removeItem("token");
    setUser(null);
    delete api.defaults.headers.common["Authorization"];
    globalThis.location.href = "/login";
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
