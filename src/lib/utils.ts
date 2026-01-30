import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface DashboardStats {
  loanBook: string;
  activeLoans: string;
  repaymentEfficiency: string;
  defaultRate: string;
  totalLoansCumulative: string;
  totalDisbursedCumulative: string;
  disbursedThisMonth: string;
  avgLoanSize: string;
  interestIncome: string;
  feeIncome: string;
  lossDefaults: string;
}

export function normalizeStatsResponse(responseData: unknown): DashboardStats | undefined {
  if (!responseData || typeof responseData !== "object") {
    return undefined;
  }

  if ("success" in responseData) {
    const wrapped = responseData as { success: boolean; data?: DashboardStats | null };
    return wrapped.success && wrapped.data ? wrapped.data : undefined;
  }

  if ("data" in responseData) {
    const wrapped = responseData as { data: DashboardStats | null | undefined };
    return wrapped.data ?? undefined;
  }

  return responseData as DashboardStats;
}
