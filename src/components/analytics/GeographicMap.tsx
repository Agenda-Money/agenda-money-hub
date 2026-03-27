import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface RegionData {
  name: string;
  signups: number;
  percentage: number;
  color: string;
}

interface GeographicMapProps {
  data: RegionData[];
  totalSignups: number;
}

export function GeographicMap({ data, totalSignups }: Readonly<GeographicMapProps>) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter out 'Unknown' and sort by signups descending
  const sortedData = [...data]
    .filter(r => r.name !== "Unknown")
    .sort((a, b) => b.signups - a.signups);

  const displayData = isExpanded ? sortedData : sortedData.slice(0, 5);
  const hasMore = sortedData.length > 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="h-full">
        <CardHeader className="border-b bg-gradient-to-r from-info/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-info" />
            </div>
            <div>
              <CardTitle className="text-lg">Geographic Distribution</CardTitle>
              <CardDescription>Signup density by region</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Visual Map Representation */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {sortedData.slice(0, 8).map((region, index) => (
              <motion.div
                key={`${region.name}-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "relative rounded-lg p-3 text-center transition-all hover:scale-105 cursor-pointer",
                  "bg-gradient-to-br"
                )}
                style={{
                  background: `linear-gradient(135deg, ${region.color}20, ${region.color}10)`
                }}
              >
                <div 
                  className="absolute inset-0 rounded-lg opacity-20"
                  style={{ backgroundColor: region.color }}
                />
                <div className="relative">
                  <p className="text-xs font-medium text-muted-foreground truncate">{region.name}</p>
                  <p className="text-lg font-bold mt-1">{region.signups.toLocaleString()}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Detailed List */}
          <div className="space-y-4">
            {displayData.map((region, index) => (
              <motion.div
                key={`${region.name}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: region.color }}
                    />
                    <span className="text-[13px] font-black uppercase tracking-tight text-[#1a1a2e]">{region.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[13px] font-mono font-black text-[#999]">
                      {region.signups.toLocaleString()}
                    </span>
                    <span className="text-[13px] font-mono font-black w-12 text-right text-[#1a1a2e]">
                      {region.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-[5px] w-full bg-[#f4f4f4] rounded-full overflow-hidden">
                  <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${region.percentage}%` }}
                   transition={{ duration: 1, delay: index * 0.1 }}
                   className="h-full rounded-full"
                   style={{ backgroundColor: region.color }}
                  />
                </div>
              </motion.div>
            ))}

            {hasMore && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full mt-2 py-2.5 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-all"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Show {sortedData.length - 5} More Regions
                  </>
                )}
              </button>
            )}
          </div>

          {/* Total */}
          <div className="mt-6 pt-4 border-t flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Signups</span>
            <span className="text-xl font-bold">{totalSignups.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
