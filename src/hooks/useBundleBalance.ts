import { useQuery } from '@tanstack/react-query';
import { getBundleBalance } from '../api/rewards.api';

export const useBundleBalance = () =>
  useQuery({
    queryKey:  ['bundle-balance'],
    queryFn:   getBundleBalance,
    staleTime: 60_000,       // 1 min
    refetchOnWindowFocus: true,
  });
