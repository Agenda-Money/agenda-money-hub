import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { toast } from "sonner";


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
      if (response.data.success) {
        setUser(response.data.data);
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
      const response = await api.post("/api/admin/auth/login", { email, password });
      
      if (response.data.success) {
        const { token, admin } = response.data;
        sessionStorage.setItem("token", token);
        setUser(admin);
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        toast.success("Welcome back!", {
          description: "You have successfully logged in.",
        });
        return { success: true, user: admin };
      }
      
      const msg = response.data.message || "Invalid credentials";
      // Removed toast to handle UI in component
      return { success: false, message: msg };
    } catch (error: any) {
      
      const errorMessage = 
        error.response?.data?.message || 
        error.response?.data?.error || 
        "Invalid credentials. Please try again.";
        
      // Removed toast to handle UI in component
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
    try {
      const response = await api.post("/api/admin/auth/reset-password", { token, password });
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
