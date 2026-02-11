import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionCardProps {
  title: string;
  subtext?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "default" | "pink" | "slate"; 
  rightElement?: React.ReactNode;
  progress?: number; // 0 to 1
  className?: string;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  subtext,
  icon: Icon,
  actionLabel,
  onAction,
  variant = "default",
  rightElement,
  progress,
  className,
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "bg-white rounded-[24px] p-6 relative overflow-hidden flex flex-col justify-center min-h-[100px] cursor-pointer group transition-all",
        "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05),0_10px_30px_-5px_rgba(0,0,0,0.02)] border border-gray-100", // Soft multi-layer shadow
        "hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08),0_20px_40px_-5px_rgba(0,0,0,0.04)]",
        className
      )}
      onClick={onAction}
    >
      <div className="flex items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors shrink-0",
                 variant === "pink" ? "bg-[#EC1B84]/10 text-[#EC1B84]" : 
                 variant === "slate" ? "bg-slate-100 text-slate-700" :
                 "bg-gray-50 text-gray-500 group-hover:bg-gray-100"
            )}>
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div>
            <h3 className={cn("font-bold text-base leading-tight", variant === "pink" ? "text-gray-900" : "text-slate-800")}>{title}</h3>
            {subtext && <p className="text-gray-400 text-xs font-medium mt-1 leading-relaxed">{subtext}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {rightElement}
          
          {actionLabel && (
             <div className={cn(
               "pl-4 pr-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors whitespace-nowrap",
               // User requested "compact grey action button (#F1F5F9)" for most, but "prominent" for Repay
               variant === "pink" 
                  ? "bg-[#EC1B84] text-white shadow-lg shadow-[#EC1B84]/30 hover:bg-[#D41574]" 
                  : "bg-[#F1F5F9] text-slate-600 hover:bg-slate-200"
             )}>
               {actionLabel}
               <ChevronRight className="h-3 w-3 opacity-70" />
             </div>
          )}
          
          {!actionLabel && !rightElement && (
              <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:text-gray-500 group-hover:bg-gray-100 transition-colors">
                  <ChevronRight className="h-4 w-4" />
              </div>
          )}
        </div>
      </div>

      {/* Progress Bar (Bottom) */}
      {typeof progress === "number" && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-50">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} 
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-[#EC1B84]" 
          />
        </div>
      )}
    </motion.div>
  );
};
