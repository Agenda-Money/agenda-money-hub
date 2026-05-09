import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRewardTiers, updateRewardTier } from '../api/rewards.api';

export const useRewardTiers = () =>
  useQuery({
    queryKey: ['reward-tiers'],
    queryFn:  getRewardTiers,
    staleTime: 5 * 60_000, // 5 min — tier config rarely changes
  });

export const useUpdateRewardTier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tier, updates }: { tier: number; updates: Parameters<typeof updateRewardTier>[1] }) =>
      updateRewardTier(tier, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reward-tiers'] }),
  });
};
