import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface DashboardStats {
  loanBook: string | number;
  activeLoans: string | number;
  repaymentEfficiency: string | number;
  repaymentRate: string | number;
  defaultRate: string | number;
  totalLoansCumulative: string | number;
  totalDisbursedCumulative: string | number;
  disbursedThisMonth: string | number;
  avgLoanSize: string | number;
  interestIncome: string | number;
  feeIncome: string | number;
  lossDefaults: string | number;
  overdueLoans?: string | number;
}

/**
 * Resolves a display name from an applicant or user object, preferring fullName
 * and falling back to concatenated firstName/lastName/surname fields.
 */
export function getApplicantName(
  entity: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
    surname?: string;
    user?: {
      fullName?: string;
      firstName?: string;
      lastName?: string;
      surname?: string;
    };
  } | null | undefined,
  fallback = "Applicant"
): string {
  if (!entity) return fallback;
  if (entity.fullName) return entity.fullName;
  if (entity.user?.fullName) return entity.user.fullName;
  const first = entity.firstName || entity.user?.firstName || "";
  const last = entity.lastName || entity.surname || entity.user?.lastName || entity.user?.surname || "";
  const combined = `${first} ${last}`.trim();
  return combined || fallback;
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

export function formatAmount(amount: string | number | undefined): string {
  if (amount === undefined || amount === "N/A") return "N/A";
  const num = typeof amount === "string" ? parseFloat(amount.replace(/,/g, '')) : amount;
  if (isNaN(num)) return amount.toString();
  return num.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatNumber(value: string | number | undefined): string {
  if (value === undefined || value === "N/A") return "N/A";
  const num = typeof value === "string" ? parseInt(value.replace(/,/g, ''), 10) : value;
  if (isNaN(num)) return value.toString();
  return num.toLocaleString('en-GH');
}
