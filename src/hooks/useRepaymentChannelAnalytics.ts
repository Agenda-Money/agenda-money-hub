import { useQuery } from "@tanstack/react-query";
import { getAdminRepaymentChannels } from "@/lib/api";

export interface ChannelStat {
  count: number;
  volume: number;
  percentage: number;
}

export interface RepaymentChannelData {
  ussd: ChannelStat;
  app: ChannelStat;
  total: number;
}

export const useRepaymentChannelAnalytics = () => {
  return useQuery<RepaymentChannelData>({
    queryKey: ["admin", "repayment-analytics", "channels"],
    queryFn: async () => {
      const response = await getAdminRepaymentChannels();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
