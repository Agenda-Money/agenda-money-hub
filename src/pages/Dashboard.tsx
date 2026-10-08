import React from "react";
// Old layout elements to keep:
import { RecentLoansTable } from "@/components/dashboard/RecentLoansTable";
import { PendingApprovals } from "@/components/dashboard/PendingApprovals";
import { RecentRepaymentsWidget } from "@/components/dashboard/RecentRepaymentsWidget";
import { useSocket } from "@/hooks/useSocket";
import { CashflowProjectionCard } from "@/components/analytics/CashflowProjection";
import { PortfolioHealth } from "@/components/analytics/PortfolioHealth";

// New hooks and types
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDateFilter } from "@/hooks/useDateFilter";
import api from "@/lib/api";
import { VolumeData } from "@/types/analytics";

// New cards
import { MoMDisbursementCard } from "@/components/dashboard/MoMDisbursementCard";

export default function Dashboard() {
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";
  const { preset, startDate, endDate, applyPreset, setStartDate, setEndDate } = useDateFilter();

  const queryClient = useQueryClient();

  // 2. Volume API triggered by date filter
  const { data: volumeData } = useQuery({
    queryKey: ["dashboard-volume", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      });
      const res = await api.get(`/api/admin/analytics/volume?${params}`);
      return res.data.data as VolumeData;
    },
  });

  // WebSocket integration for real-time updates
  useSocket(wsUrl, (message) => {
    if (message?.type === "NEW_APPLICATION" || message?.type === "KYC_VERIFIED_SUCCESS") {
      queryClient.invalidateQueries({ queryKey: ["analytics-portfolio"] });
    }
  });

  const momGrowth = volumeData?.momDisbursementGrowth || [];

  return (
    <div className="space-y-6">
      {/* Compact Page Header */}
      {/* Compact Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground">Admin Dashboard</h1>
          <p className="text-sm font-bold text-muted-foreground mt-1 uppercase tracking-tight italic">Real-time portfolio health & live pipeline</p>
        </div>
      </div>

      {/* Hero metrics only. The days-past-due table lives on the Analytics page.
          The default rate card still carries the system's own DEFAULTED figure in
          its caption, so the 300-day figure is never shown on its own. */}
      <PortfolioHealth showBands={false} />

      {/* Liquidity for the week ahead. Sits directly under the hero metrics
          because it is a float decision someone makes on a cadence, not
          something they navigate to look up. */}
      <CashflowProjectionCard days={7} />

      {/* Row 1: MoM Disbursement Growth */}
      <MoMDisbursementCard 
        data={momGrowth}
        preset={preset}
        startDate={startDate}
        endDate={endDate}
        applyPreset={applyPreset}
        setStartDate={setStartDate}
        setEndDate={setEndDate}
      />

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <RecentLoansTable />
        </div>
        <div className="space-y-4 flex flex-col min-h-[300px] lg:h-full">
          <PendingApprovals />
          <div className="flex-1">
            <RecentRepaymentsWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
