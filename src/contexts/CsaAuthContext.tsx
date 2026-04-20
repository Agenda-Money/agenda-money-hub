import React, { createContext, useContext, useState, useEffect } from 'react';
import csaApi from '@/lib/csaApi';

interface CsaUser {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: 'csa';
  assignedRegions: string[];
  dailyCallTarget: number;
}

interface CsaAuthContextType {
  user: CsaUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; message?: string }>;
}

const CsaAuthContext = createContext<CsaAuthContextType | undefined>(undefined);

export const CsaAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<CsaUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('csa_accessToken');
    if (!token) { setLoading(false); return; }
    csaApi.get('/api/csa/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('csa_accessToken');
        localStorage.removeItem('csa_refreshToken');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await csaApi.post('/api/csa/auth/login', { email, password });
      const { accessToken, refreshToken, user: csaUser } = res.data;
      localStorage.setItem('csa_accessToken', accessToken);
      localStorage.setItem('csa_refreshToken', refreshToken);
      setUser(csaUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    }
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('csa_refreshToken');
    csaApi.post('/api/csa/auth/logout', { refreshToken }).catch(() => {});
    localStorage.removeItem('csa_accessToken');
    localStorage.removeItem('csa_refreshToken');
    setUser(null);
    window.location.href = '/login';
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await csaApi.post('/api/csa/auth/forgot-password', { email });
      return { success: true, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || 'Request failed' };
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      const res = await csaApi.post('/api/csa/auth/reset-password', { token, password });
      return { success: true, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || 'Reset failed' };
    }
  };

  return (
    <CsaAuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, logout, forgotPassword, resetPassword }}>
      {children}
    </CsaAuthContext.Provider>
  );
};

export const useCsaAuth = () => {
  const ctx = useContext(CsaAuthContext);
  if (!ctx) throw new Error('useCsaAuth must be used within CsaAuthProvider');
  return ctx;
};
