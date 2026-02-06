import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export interface ApplicantUser {
  id?: string;
  fullName?: string;
  currentTier?: string | number;
  [key: string]: unknown;
}

interface ApplicantContextValue {
  applicant: ApplicantUser | null;
  setApplicant: (user: ApplicantUser | null) => void;
}

const ApplicantContext = createContext<ApplicantContextValue | undefined>(undefined);

const STORAGE_KEY = "applicant_user";

export const ApplicantProvider = ({ children }: { children: React.ReactNode }) => {
  const [applicant, setApplicant] = useState<ApplicantUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as ApplicantUser) : null;
    } catch {
      return null;
    }
  });

  const storeApplicant = useCallback((user: ApplicantUser | null) => {
    setApplicant(user);
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo(() => ({ applicant, setApplicant: storeApplicant }), [applicant, storeApplicant]);

  return <ApplicantContext.Provider value={value}>{children}</ApplicantContext.Provider>;
};

export const useApplicant = () => {
  const context = useContext(ApplicantContext);
  if (!context) {
    throw new Error("useApplicant must be used within ApplicantProvider");
  }
  return context;
};
