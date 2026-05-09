import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { fetchCohortRepayment } from "@/lib/reportingApi";

export interface CohortData {
  cohort: string;
  cohortDisplayName: string;
  totalDisbursed: number;
  repaid: number;
  overdue: number;
  active: number;
  defaulted?: number;
  disbursing?: number;
  repaymentRate: number;
  overdueRate: number;
  pendingRate: number;
}

export interface CohortSummary {
  totalCohorts: number;
  averageRepaymentRate: number;
  totalDisbursed?: number;
  totalRepaid?: number;
  activeUsers?: { count: number; period?: string };
  dataRange: { from: string; to: string };
  excludedAgentIds?: string[];
}

interface CohortRepaymentResponse {
  success: boolean;
  data: {
    cohorts: CohortData[];
    summary: CohortSummary;
  };
}

interface UseCohortRepaymentParams {
  platform: 'admin' | 'reporting';
  agentId?: string;
  monthsBack?: number;
}

export function useCohortRepayment({ platform, agentId, monthsBack }: UseCohortRepaymentParams) {
  return useQuery({
    queryKey: ["cohort-repayment", platform, agentId, monthsBack],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (agentId) params.append('agentId', agentId);
      if (monthsBack) params.append('monthsBack', String(monthsBack));
      
      const queryStr = params.toString();
      const path = queryStr ? `?${queryStr}` : '';

      if (platform === 'reporting') {
        const response = await fetchCohortRepayment(params.toString());
        return response as CohortRepaymentResponse;
      } else {
        // Correcting admin path to /api/admin/analytics
        const response = await api.get(`/api/admin/analytics/cohort-repayment${path}`);
        return response.data as CohortRepaymentResponse;
      }
    },
  });
}
