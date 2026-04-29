import React from "react";
import { formatCount } from "@/utils/format";
import { ReferralAnalyticsData } from "@/types/analytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Share2 } from "lucide-react";

interface Props {
  data: ReferralAnalyticsData;
}

export function ReferralRateCard({ data }: Props) {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 col-span-full">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Share2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Referral Tracking</h2>
            <p className="text-xs text-muted-foreground mt-1">Performance of in-app social sharing</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-muted/30 p-4 rounded-lg flex flex-col gap-1 border border-border/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conversion Rate</span>
            <span className="text-2xl font-bold text-foreground">{data.conversionRate.toFixed(1)}%</span>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg flex flex-col gap-1 border border-border/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Shares</span>
            <span className="text-2xl font-bold text-foreground">{formatCount(data.totalShares)}</span>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg flex flex-col gap-1 border border-border/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Applications from Referrals</span>
            <span className="text-2xl font-bold text-foreground">{formatCount(data.totalApplications)}</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Shares</h3>
        
        {data.totalShares === 0 ? (
          <div className="h-[200px] w-full flex items-center justify-center bg-muted/20 rounded-lg border border-dashed border-border">
            <div className="text-center px-4">
              <Share2 className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No referral data yet.</p>
              <p className="text-xs text-muted-foreground mt-1">This will populate once the share flow is live in the app.</p>
            </div>
          </div>
        ) : (
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.momShares} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                <RechartsTooltip 
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB" }}
                  formatter={(val: number) => [formatCount(val), "Shares"]}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
