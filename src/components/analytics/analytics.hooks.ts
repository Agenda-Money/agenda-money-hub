import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DateRange } from './analytics.types';
import {
  normalizeSummaryPayload,
  normalizePerformancePayload,
  normalizeDistributionPayload,
  normalizeVolumePayload,
  unwrapAnalyticsBody,
} from './analytics.normalize';

export function useSummary() {
  const q = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: async () => {
      const res = await api.get('/api/admin/analytics/summary');
      return normalizeSummaryPayload(unwrapAnalyticsBody(res));
    },
  });
  return { data: q.data, error: q.isError, loading: q.isPending || q.isFetching, refetch: q.refetch };
}

export function usePerformance(range?: DateRange) {
  const q = useQuery({
    queryKey: ['analytics-performance', range?.from, range?.to],
    queryFn: async ({ queryKey }) => {
      const [_, from, to] = queryKey as [string, string?, string?];
      const p = from || to ? { from, to } : undefined;
      const res = await api.get('/api/admin/analytics/performance', { params: p });
      return normalizePerformancePayload(unwrapAnalyticsBody(res));
    },
  });
  return { data: q.data, error: q.isError, loading: q.isPending || q.isFetching, refetch: q.refetch };
}

export function useDistribution() {
  const q = useQuery({
    queryKey: ['analytics-distribution'],
    queryFn: async () => {
      const res = await api.get('/api/admin/analytics/distribution');
      return normalizeDistributionPayload(unwrapAnalyticsBody(res));
    },
  });
  return { data: q.data, error: q.isError, loading: q.isPending || q.isFetching, refetch: q.refetch };
}

export function useVolume(range?: DateRange) {
  const q = useQuery({
    queryKey: ['analytics-volume', range?.from, range?.to],
    queryFn: async ({ queryKey }) => {
      const [_, from, to] = queryKey as [string, string?, string?];
      const p = from || to ? { from, to } : undefined;
      const [volResult, legacyResult, repayResult] = await Promise.allSettled([
        api.get('/api/admin/analytics/volume', { params: p }),
        api.get('/api/admin/analytics', { params: p }),
        api.get('/api/admin/repayment-analytics/channels', { params: p }),
      ]);
      const volRaw =
        volResult.status === 'fulfilled' ? unwrapAnalyticsBody(volResult.value) : undefined;
      const legacyRaw =
        legacyResult.status === 'fulfilled' ? unwrapAnalyticsBody(legacyResult.value) : undefined;
      const repayRaw =
        repayResult.status === 'fulfilled' ? unwrapAnalyticsBody(repayResult.value) : undefined;
      return normalizeVolumePayload(volRaw ?? {}, legacyRaw, repayRaw);
    },
  });
  return { data: q.data, error: q.isError, loading: q.isPending || q.isFetching, refetch: q.refetch };
}
