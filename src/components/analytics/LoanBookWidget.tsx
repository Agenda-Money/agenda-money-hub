import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoanBookWidgetProps {
  activeDebt: number;
  activeLoansCount: number;
  trendData?: number[];
  graduationRate?: number;
  activeAgents?: number;
  isLoading?: boolean;
}

const Sparkline = ({ data, color }: { data: number[], color: string }) => {
  if (!data || data.length < 2) return null;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 30;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="opacity-60">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export function LoanBookWidget({ 
  activeDebt, 
  activeLoansCount, 
  trendData = [40, 55, 45, 60, 50, 70, 65, 80],
  graduationRate = 72,
  activeAgents = 48,
  isLoading 
}: Readonly<LoanBookWidgetProps>) {
  if (isLoading) {
    return (
      <div className="h-full rounded-[16px] bg-[#1a1a2e] p-5 animate-pulse flex flex-col justify-between">
        <div className="h-4 w-1/2 bg-white/10 rounded" />
        <div className="space-y-4">
          <div className="h-10 w-3/4 bg-white/10 rounded" />
          <div className="h-20 w-full bg-white/10 rounded" />
        </div>
      </div>
    );
  }

  const avgTicket = activeLoansCount > 0 ? Math.round(activeDebt / activeLoansCount) : 0;
  const maxBar = 10000;
  const barW = Math.min(100, Math.round((activeDebt / maxBar) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="h-full rounded-[16px] p-[20px] shadow-sm flex flex-col justify-between overflow-hidden bg-white text-[#1a1a2e] border border-[#efefef]"
    >
      <div>
        <div className="flex justify-between items-start mb-[10px]">
          <div className="inline-flex items-center gap-[5px] text-[10px] font-black uppercase tracking-[0.06em] p-[4px_10px] rounded-full bg-[#fce8f3] text-[#e91e8c]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
            </svg>
            Portfolio healthy
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Status</div>
            <span className="text-[14px] font-black text-white/40 mr-1.5 uppercase tracking-wider">Total</span>
            <span className="text-[34px] font-black text-white tracking-tighter font-mono flex items-baseline gap-1.5">
              <span className="text-[20px] text-[#e91e8c] select-none">GHS</span>
              {activeDebt.toLocaleString()}
            </span>
          </div>
        </div>
        
        <div className="text-[10px] font-black uppercase tracking-[0.08em] mb-[6px] opacity-40">Total loan book</div>
        <div className="font-mono text-[28px] font-black leading-none mb-1 text-[#1a1a2e]">GHS {activeDebt.toLocaleString()}</div>
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-[#e91e8c] font-black">Principal in debt</div>
          <div className="flex-grow max-w-[80px]">
            <Sparkline data={trendData} color="#e91e8c" />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#f4f7fa] rounded-[10px] p-[10px_12px] border border-[#e1e6ed]">
            <div className="text-[9px] font-black uppercase tracking-tight opacity-50 mb-1">Graduation</div>
            <div className="text-[15px] font-black text-[#1abc9c]">{graduationRate}%</div>
          </div>
          <div className="bg-[#f4f7fa] rounded-[10px] p-[10px_12px] border border-[#e1e6ed]">
            <div className="text-[9px] font-black uppercase tracking-tight opacity-50 mb-1">Active Agents</div>
            <div className="text-[15px] font-black text-[#e91e8c]">{activeAgents}</div>
          </div>
        </div>

        <div className="bg-[#1a1a2e] rounded-[10px] p-[12px_14px] text-white">
          <div className="text-[10px] text-white/50 font-black uppercase tracking-[0.06em] mb-[5px]">Active loans</div>
          <div className="flex justify-between items-baseline">
            <div className="font-mono text-[18px] font-black text-white leading-none">{activeLoansCount.toLocaleString()}</div>
            <div className="text-[10px] text-white/50 font-black uppercase">
              Avg ticket: <span className="text-white font-black">GHS {avgTicket.toLocaleString()}</span>
            </div>
          </div>
          <div className="h-[5px] bg-white/10 rounded-full mt-[8px] overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${barW}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full" 
              style={{ background: 'linear-gradient(90deg, #e91e8c, #1abc9c)' }}
            />
          </div>
        </div>
        <div className="flex items-center gap-[6px] pt-1">
          <span className="w-[7px] h-[7px] rounded-full bg-[#1abc9c] shrink-0 animate-pulse"></span>
          <span className="text-[11px] font-bold opacity-40 truncate">System healthy — metrics within range</span>
        </div>
      </div>
    </motion.div>
  );
}
