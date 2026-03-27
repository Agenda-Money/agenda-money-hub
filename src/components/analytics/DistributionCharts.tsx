import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { 
  Smartphone, Users2, Target, History, Ban, 
  Briefcase, GraduationCap, HeartPulse, Home, Plane, LayoutGrid 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DistributionData {
  name: string;
  value: number;
  rawVolume?: number;
}

interface DistributionChartsProps {
  networkData: DistributionData[];
  genderData: DistributionData[];
  purposeData: DistributionData[];
  totalDisbursements: number;
  writeOffs: { count: number; volume: number };
  isLoading?: boolean;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(330, 86%, 52%)", // Pink
  "hsl(175, 100%, 36%)", // Green
  "hsl(38, 92%, 50%)",  // Yellow
];

const formatCurrency = (value: number) => {
  const formatted = new Intl.NumberFormat('en-GH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
  return `GHS ${formatted}`;
};

export function DistributionCharts({ 
  networkData, 
  genderData, 
  purposeData, 
  totalDisbursements, 
  writeOffs,
  isLoading 
}: Readonly<DistributionChartsProps>) {
  // Filter network - Keep it specific
  const filteredNetwork = networkData.filter(d => 
    d.name && 
    !d.name.toLowerCase().includes("unknown") &&
    d.name.length > 0
  );

  // Filter gender - Only show Male/Female as requested
  const rawGender = genderData.filter(d => 
    d.name && 
    (d.name.toLowerCase() === "male" || d.name.toLowerCase() === "female")
  );
  
  // Ensure both categories are present for "boldness" and completeness
  const filteredGender = ["Male", "Female"].map(name => {
    const existing = rawGender.find(g => g.name.toLowerCase() === name.toLowerCase());
    return { name, value: existing ? existing.value : 0 };
  });

  // Filter purpose - General cleanup
  const filteredPurpose = purposeData.filter(d => 
    d.name && 
    !d.name.toLowerCase().includes("unknown") &&
    d.name.length > 0
  );

  const getPurposeIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("business")) return <Briefcase className="w-3.5 h-3.5" />;
    if (n.includes("education")) return <GraduationCap className="w-3.5 h-3.5" />;
    if (n.includes("medical")) return <HeartPulse className="w-3.5 h-3.5" />;
    if (n.includes("home")) return <Home className="w-3.5 h-3.5" />;
    if (n.includes("travel")) return <Plane className="w-3.5 h-3.5" />;
    return <LayoutGrid className="w-3.5 h-3.5" />;
  };

  const getPurposeColor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("business")) return "#1abc9c"; // Teal/Emerald
    if (n.includes("education")) return "#3498db"; // Blue
    if (n.includes("medical")) return "#e74c3c"; // Red/Rose
    if (n.includes("home")) return "#f39c12"; // Orange/Amber
    if (n.includes("travel")) return "#9b59b6"; // Purple
    return "#95a5a6"; // Gray
  };

  const networkCategoryCount = filteredNetwork.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Network Distribution */}
        <div className="bg-white border border-[#f0f0f0] rounded-[24px] p-6 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-black tracking-[0.08em] uppercase text-[#b0a8c0] flex items-center gap-2 mb-6">
              <Smartphone className="w-4.5 h-4.5 text-[#e91e8c]" />
              Network Distribution
            </div>
            <div className="flex items-center gap-6">
              <div className="relative w-[110px] h-[110px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={filteredNetwork}
                      cx="50%" cy="50%"
                      innerRadius={40} outerRadius={52}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {filteredNetwork.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={
                          entry.name.toLowerCase().includes("mtn") ? "#FFCC00" :
                          (entry.name.toLowerCase().includes("telecel") || entry.name.toLowerCase().includes("vodafone")) ? "#E40000" :
                          "#003399"
                        } />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-[#999] font-black uppercase">Active</span>
                  <span className="text-xl font-black text-[#1a1a2e] leading-none">{networkCategoryCount}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 flex-grow">
                {filteredNetwork.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-[12px] font-black text-[#444]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ 
                      backgroundColor: item.name.toLowerCase().includes("mtn") ? "#FFCC00" :
                                      (item.name.toLowerCase().includes("telecel") || item.name.toLowerCase().includes("vodafone")) ? "#E40000" :
                                      "#003399"
                    }} />
                    {item.name}
                    <span className="ml-auto font-black text-[#1a1a2e] text-sm">
                      {Math.round(item.value)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Bottom Volume Summary */}
          <div className="mt-6 pt-4 border-t border-dashed border-[#f0f0f0] flex flex-wrap gap-x-4 gap-y-2">
            {filteredNetwork.map((item, index) => (
              <div key={index} className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-[#aaa] tracking-tight">{item.name}</span>
                <span className="text-[12px] font-black text-[#1a1a2e] font-mono leading-none">
                  {item.rawVolume ? formatCurrency(item.rawVolume) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="bg-white border border-[#f0f0f0] rounded-[24px] p-6 shadow-sm overflow-hidden">
          <div className="text-[11px] font-black tracking-[0.08em] uppercase text-[#b0a8c0] flex items-center gap-2 mb-6">
            <Users2 className="w-4.5 h-4.5 text-[#e91e8c]" />
            Gender Distribution
          </div>
          <div className="space-y-5">
            {filteredGender.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="text-[12px] text-[#1a1a2e] font-black uppercase tracking-tight">{item.name}</div>
                  <div className="text-[13px] font-black text-[#1a1a2e]">{Math.round(item.value)}%</div>
                </div>
                <div className="bg-[#f4f4f4] rounded-xl h-10 overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    className={cn(
                      "h-full rounded-xl flex items-center px-4 font-black text-[12px] text-white transition-all",
                      item.name.toLowerCase() === "male" 
                        ? "bg-gradient-to-r from-[#1abc9c] to-[#16a085]" 
                        : "bg-gradient-to-r from-[#e91e8c] to-[#c2185b]"
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loan Purpose */}
        <div className="bg-white border border-[#f0f0f0] rounded-[24px] p-6 shadow-sm overflow-hidden">
          <div className="text-[11px] font-black tracking-[0.08em] uppercase text-[#b0a8c0] flex items-center gap-2 mb-6">
            <Target className="w-4.5 h-4.5 text-[#e91e8c]" />
            Loan Purpose
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-[110px] h-[110px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={filteredPurpose}
                    cx="50%" cy="50%"
                    innerRadius={41} outerRadius={53}
                    dataKey="value"
                    stroke="none"
                    paddingAngle={3}
                  >
                    {filteredPurpose.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getPurposeColor(entry.name)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <Target className="w-5 h-5 text-[#e91e8c]/20" />
              </div>
            </div>
            <div className="flex flex-col gap-2.5 flex-grow">
              {filteredPurpose.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-[12px] font-black text-[#444]">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ 
                    backgroundColor: `${getPurposeColor(item.name)}15`,
                    color: getPurposeColor(item.name)
                  }}>
                    {getPurposeIcon(item.name)}
                  </div>
                  <span className="truncate flex-grow">{item.name}</span>
                  <span className="ml-auto font-black text-[#1a1a2e] text-sm">
                    {Math.round(item.value)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-3 bg-[#fdf8ff] border border-[#f0e8f8] rounded-[24px] p-6 shadow-sm">
          <div className="text-[10px] font-black tracking-[0.07em] uppercase text-[#b0a8c0] mb-3">All-Time Disbursements</div>
          <div className="text-[28px] font-black text-[#1a1a2e] font-mono tracking-tighter">{formatCurrency(totalDisbursements)}</div>
          <div className="text-[11px] text-[#999] font-bold mt-1.5 uppercase">Cumulative total</div>
        </div>
        
        <div className="md:col-span-3 bg-[#fff5f8] border border-[#fde0ec] rounded-[24px] p-6 shadow-sm">
          <div className="text-[10px] font-black tracking-[0.07em] uppercase text-[#f48fb1] mb-3">Total Write-Offs</div>
          <div className="text-[28px] font-black text-[#e91e8c] font-mono tracking-tighter">{writeOffs.count}</div>
          <div className="text-[11px] text-[#999] font-bold mt-1.5 uppercase">Vol: {formatCurrency(writeOffs.volume)}</div>
        </div>

        <div className="md:col-span-6 bg-[#f5fff9] border border-[#d4f5e6] rounded-[24px] p-6 shadow-sm flex items-center justify-between">
          <div className="flex-shrink-0">
            <div className="text-[10px] font-black tracking-[0.07em] uppercase text-[#2eb882] mb-1.5">System Liquidity</div>
            <div className="text-[12px] text-[#2eb882] font-black mt-0.5 opacity-80 uppercase">Fully operational</div>
          </div>
          <div className="flex-grow mx-8 h-2.5 bg-[#e8faf2] rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "85%" }}
              className="h-full bg-gradient-to-r from-[#2eb882] to-[#1abc9c] rounded-full shadow-inner" 
            />
          </div>
          <div className="bg-[#e8faf2] text-[#2eb882] text-[12px] font-black px-4 py-1.5 rounded-full whitespace-nowrap border border-[#2eb882]/20 shadow-sm">
            ACTIVE
          </div>
        </div>
      </div>
    </div>
  );
}
