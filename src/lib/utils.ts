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
