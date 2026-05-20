import React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Share2, RefreshCw, ArrowRight, Users, TrendingUp, Smartphone } from "lucide-react";
import type { AdminReferralAnalyticsData } from "@/types/analytics";
import { PanelHead } from "./AnalyticsWidgets";

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "#25D366",
  sms: "#4B6FE4",
  link: "#F59E0B",
};

function FunnelStep({
  label,
  value,
  isLast,
}: {
  label: string;
  value: number;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 rounded-xl border border-border/60 bg-muted/30 p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
          {label}
        </p>
        <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
      </div>
      {!isLast && (
        <ArrowRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
      )}
    </div>
  );
}

interface Props {
  data: AdminReferralAnalyticsData;
  onRefresh: () => void;
  loading?: boolean;
}

export function ReferralAnalytics({ data, onRefresh, loading }: Props) {
  const { funnel, topReferrers, momTrend, channelBreakdown } = data;

  return (
    <div className="space-y-4">
      {/* Funnel + conversion rate */}
      <div className="rounded-[14px] border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Conversion Funnel</p>
              <p className="text-[11px] text-muted-foreground">Customer referrals only — agents excluded</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Share → Loan rate</p>
              <p className="text-xl font-bold text-[#1D9E75]">{funnel.conversionRate.toFixed(1)}%</p>
            </div>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <FunnelStep label="Shares" value={funnel.totalShares} />
          <FunnelStep label="Applications" value={funnel.totalApplications} />
          <FunnelStep label="Registrations" value={funnel.totalRegistrations} />
          <FunnelStep label="Loans taken" value={funnel.totalLoans} isLast />
        </div>
      </div>

      {/* MoM trend + channel breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[14px] border border-border/60 bg-card p-5 shadow-sm">
          <PanelHead
            title="Monthly Trend"
            right={
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#1D9E75]" /> Shares
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#8b5cf6]" /> Loans
                </span>
              </div>
            }
          />
          {momTrend.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center bg-muted/20 rounded-lg border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No trend data yet</p>
            </div>
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={momTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    dy={5}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                  <Tooltip
                    cursor={{ stroke: "rgba(0,0,0,0.08)" }}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="shares"
                    stroke="#1D9E75"
                    strokeWidth={2}
                    dot={false}
                    name="Shares"
                  />
                  <Line
                    type="monotone"
                    dataKey="conversions"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    name="Loans"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-[14px] border border-border/60 bg-card p-5 shadow-sm">
          <PanelHead title="Channel Breakdown" />
          {channelBreakdown.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center bg-muted/20 rounded-lg border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No channel data yet</p>
            </div>
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={channelBreakdown}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                  <YAxis
                    type="category"
                    dataKey="channel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#6B7280", textTransform: "capitalize" }}
                    width={70}
                    tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                    formatter={(val: number) => [val.toLocaleString(), "Shares"]}
                  />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    barSize={28}
                    name="Shares"
                    fill="#1D9E75"
                    // per-bar color from CHANNEL_COLORS not supported in static fill;
                    // using Cell for per-bar coloring
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Top referrers table */}
      <div className="rounded-[14px] border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <p className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">
              Top 10 Referrers by Loans Generated
            </p>
          </div>
        </div>
        {topReferrers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No referral conversions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground px-5 py-3">
                    #
                  </th>
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground px-5 py-3">
                    Name
                  </th>
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground px-5 py-3">
                    Node Code
                  </th>
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground px-5 py-3">
                    Phone
                  </th>
                  <th className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground px-5 py-3">
                    Shares
                  </th>
                  <th className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground px-5 py-3">
                    Loans
                  </th>
                </tr>
              </thead>
              <tbody>
                {topReferrers.map((r, i) => (
                  <tr
                    key={r.msisdn}
                    className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-3 text-[12px] font-bold text-muted-foreground">
                      {i + 1}
                    </td>
                    <td className="px-5 py-3 font-semibold text-foreground">
                      {r.name || <span className="text-muted-foreground italic">—</span>}
                    </td>
                    <td className="px-5 py-3 font-mono text-[12px] text-muted-foreground">
                      {r.nodeCode || "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-[12px] text-muted-foreground">
                      {r.msisdn}
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground">
                      {r.totalShares.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-[#1D9E75]/10 text-[#1D9E75] font-bold text-[12px]">
                        {r.totalConversions}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
