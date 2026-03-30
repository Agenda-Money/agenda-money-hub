import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DateRange } from './analytics.types';

export function useSummary() {
  const q = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: async () => {
      const res = await api.get('/api/admin/analytics/summary');
      return res.data?.data || res.data;
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
      return res.data?.data || res.data;
    },
  });
  return { data: q.data, error: q.isError, loading: q.isPending || q.isFetching, refetch: q.refetch };
}

export function useDistribution() {
  const q = useQuery({
    queryKey: ['analytics-distribution'],
    queryFn: async () => {
      const res = await api.get('/api/admin/analytics/distribution');
      return res.data?.data || res.data;
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
      const res = await api.get('/api/admin/analytics/volume', { params: p });
      return res.data?.data || res.data;
    },
  });
  return { data: q.data, error: q.isError, loading: q.isPending || q.isFetching, refetch: q.refetch };
}
