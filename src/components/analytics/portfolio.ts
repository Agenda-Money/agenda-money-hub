import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

/** One past-due band, from not yet due up to default. */
export interface PortfolioBand {
  key: string;
  label: string;
  loans: number;
  outstanding: number;
  /** Percent of the outstanding loan book. */
  shareOfBookPct: number;
  isDefault: boolean;
}

/**
 * The portfolio figures as the server states them, definitions included. The
 * screen shows the server's own wording for each definition rather than writing
 * its own, so a number and what it means cannot drift apart.
 */
export interface PortfolioSnapshot {
  asOf: string;
  definitions: {
    defaultAfterDays: number;
    systemDefaultAfterDays: number;
    loanBook: string;
    pastDue: string;
    defaultRate: string;
    systemDefault: string;
  };
  allTimeDisbursement: { loans: number; valueDisbursed: number; principal: number };
  loanBook: { loans: number; outstanding: number };
  bands: PortfolioBand[];
  pastDue: { loans: number; outstanding: number; shareOfBookPct: number };
  defaultRate: { afterDays: number; loans: number; outstanding: number; shareOfBookPct: number };
  systemDefaulted: { afterDays: number; loans: number; outstanding: number; shareOfBookPct: number };
}

export function usePortfolio() {
  return useQuery({
    queryKey: ["analytics-portfolio"],
    queryFn: async () => (await api.get("/api/admin/analytics/portfolio")).data.data as PortfolioSnapshot,
    retry: false,
  });
}
