import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listCampaigns, getCampaignReport, retryCampaign } from '../api/rewards.api';

export const useCampaigns = (filters: { type?: string; status?: string; page?: number; limit?: number }) =>
  useQuery({
    queryKey: ['campaigns', filters],
    queryFn:  () => listCampaigns(filters),
    // Auto-refresh every 15s if any campaign might be processing
    refetchInterval: (data) => {
      const hasProcessing = data?.campaigns?.some(
        (c: any) => c.status === 'processing' || c.status === 'pending'
      );
      return hasProcessing ? 15_000 : false;
    },
  });

export const useCampaignReport = (
  id: string,
  filters: { status?: string; page?: number; limit?: number }
) =>
  useQuery({
    queryKey: ['campaign-report', id, filters],
    queryFn:  () => getCampaignReport(id, filters),
    enabled:  !!id,
  });

export const useRetryCampaign = (campaignId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => retryCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-report', campaignId] });
    },
  });
};
