import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toNumber(value: any): number {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return value;
  const parsed = parseFloat(String(value).replace(/,/g, ""));
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Deduplicates repeated words in a string (e.g., names with repeating surnames).
 */
export function deduplicateWords(str: string | null | undefined): string {
  if (!str) return "";
  // Split by whitespace, filter out empty strings
  const words = str.trim().split(/\s+/);
  const seen = new Set<string>();
  const result: string[] = [];
  
  for (const word of words) {
    // Normalize for comparison (lowercase and alphanumeric only)
    const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(word);
    }
  }
  return result.join(" ");
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
  
  let name = entity.fullName || entity.user?.fullName || "";
  
  if (!name) {
    const first = entity.firstName || entity.user?.firstName || "";
    const last = entity.lastName || entity.surname || entity.user?.lastName || entity.user?.surname || "";
    name = `${first} ${last}`.trim();
  }
  
  return deduplicateWords(name) || fallback;
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
