import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Clock, TrendingUp, CheckCircle2, XCircle, AlertCircle, User, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AgentActivitySummary } from '@/lib/teamActivityService';

interface AgentsOverviewGridProps {
  agents: AgentActivitySummary[];
  isLoading: boolean;
  onSelectAgent: (id: string) => void;
  selectedAgentId: string | null;
}

export function AgentsOverviewGrid({ agents, isLoading, onSelectAgent, selectedAgentId }: AgentsOverviewGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-64 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-border/50">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground">No agent activity yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
          Try changing the date range to see activities from a different period.
        </p>
      </div>
    );
  }

  const getConversionColor = (rate: number) => {
    if (rate >= 20) return 'bg-emerald-500 text-white';
    if (rate >= 10) return 'bg-amber-500 text-white';
    return 'bg-rose-500 text-white';
  };

  const getConversionIcon = (rate: number) => {
    if (rate >= 20) return <CheckCircle2 size={12} className="mr-1" />;
    if (rate >= 10) return <AlertCircle size={12} className="mr-1" />;
    return <XCircle size={12} className="mr-1" />;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in pb-12">
      {agents.map((agent, idx) => (
        <motion.div
          key={agent._id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05, type: 'spring', damping: 20 }}
          onClick={() => onSelectAgent(agent._id)}
          className={cn(
             "relative bg-white dark:bg-gray-950 rounded-3xl border border-gray-100 dark:border-gray-800 p-5 transition-all duration-500 cursor-pointer group hover:shadow-2xl hover:border-primary/20",
             selectedAgentId === agent._id 
               ? "ring-2 ring-primary bg-primary/[0.02]" 
               : "shadow-sm hover:translate-y-[-2px]"
           )}
         >
           {/* Header Area */}
           <div className="flex items-center gap-4 mb-5">
             <div className="h-12 w-12 rounded-2xl bg-[#FBEAF0] flex items-center justify-center text-[#D4537E] font-black text-xl shadow-sm shrink-0">
               {agent.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2)}
             </div>
             <div className="min-w-0 flex-1">
               <h3 className="font-black text-gray-900 dark:text-gray-100 truncate text-lg tracking-tight group-hover:text-primary transition-colors">
                 {agent.name}
               </h3>
               <div className="flex items-center gap-2 mt-1">
                 <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-md uppercase tracking-wider">
                   ID: {agent._id.substring(agent._id.length - 6)}
                 </span>
                 {agent.conversionRate > 0 && (
                   <span className={cn(
                     "text-[10px] font-black px-2 py-0.5 rounded-md flex items-center",
                     agent.conversionRate >= 20 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                   )}>
                     {getConversionIcon(agent.conversionRate)}
                     {agent.conversionRate}% Promise Rate
                   </span>
                 )}
               </div>
             </div>
             <ChevronRight size={18} className="text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
           </div>

           {/* Metrics Row */}
           <div className="grid grid-cols-2 gap-4 mb-5 py-4 border-y border-gray-50 dark:border-gray-800/50">
             <div className="flex flex-col gap-1">
               <div className="flex items-center gap-1.5 text-gray-400">
                 <TrendingUp size={12} />
                 <span className="text-[10px] font-bold uppercase tracking-wider">Total Activity</span>
               </div>
               <p className="text-2xl font-black text-gray-900 dark:text-white leading-none tracking-tighter">{agent.totalActivities}</p>
             </div>
             <div className="flex flex-col gap-1 items-end text-right">
               <div className="flex items-center gap-1.5 text-gray-500 font-black">
                 <Clock size={12} />
                 <span className="text-[10px] uppercase tracking-wider">Last Sync</span>
               </div>
               <p className="text-[11px] font-black text-gray-600 dark:text-gray-400 truncate w-full">
                 {agent.lastActiveAt ? formatDistanceToNow(new Date(agent.lastActiveAt), { addSuffix: true }) : '—'}
               </p>
             </div>
           </div>

          {/* Outcome Bars/Pills */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-70">Engagement Profile</p>
              <Users size={12} className="text-muted-foreground/40" />
            </div>
            <div className="flex flex-wrap gap-2">
              {agent.outcomes.answered > 0 && (
                <OutcomePill 
                  color="bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                  label="Response" 
                  count={agent.outcomes.answered} 
                />
              )}
              {agent.outcomes.promisedToPay > 0 && (
                <OutcomePill 
                  color="bg-blue-500/10 text-blue-600 border-blue-500/20" 
                  label="Promises" 
                  count={agent.outcomes.promisedToPay} 
                />
              )}
              {agent.outcomes.partialPayment && agent.outcomes.partialPayment > 0 && (
                 <OutcomePill 
                   color="bg-teal-500/10 text-teal-600 border-teal-500/20" 
                   label="Partial" 
                   count={agent.outcomes.partialPayment} 
                 />
              )}
              {agent.outcomes.notReachable && agent.outcomes.notReachable > 0 && (
                <OutcomePill 
                  color="bg-rose-500/10 text-rose-500 border-rose-500/20" 
                  label="Unreachable" 
                  count={agent.outcomes.notReachable} 
                />
              )}
              {agent.outcomes.messageDelivered && agent.outcomes.messageDelivered > 0 && (
                <OutcomePill 
                  color="bg-indigo-500/10 text-indigo-500 border-indigo-500/20" 
                  label="Messaged" 
                  count={agent.outcomes.messageDelivered} 
                />
              )}
              {agent.successfulCollections > 0 && (
                <OutcomePill 
                  color="bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                  label="Collected" 
                  count={agent.successfulCollections} 
                />
              )}
              {agent.outcomes.noAnswer > 0 && (
                <OutcomePill 
                  color="bg-slate-500/10 text-slate-500 border-slate-500/20" 
                  label="Missed" 
                  count={agent.outcomes.noAnswer} 
                />
              )}
              {agent.outcomes.wrongNumber > 0 && (
                <OutcomePill 
                  color="bg-rose-500/10 text-rose-500 border-rose-500/20" 
                  label="Wrong #" 
                  count={agent.outcomes.wrongNumber} 
                />
              )}
              {agent.outcomes.thirdParty > 0 && (
                <OutcomePill 
                  color="bg-indigo-500/10 text-indigo-500 border-indigo-500/20" 
                  label="3rd Party" 
                  count={agent.outcomes.thirdParty} 
                />
              )}
              {agent.outcomes.numberOff > 0 && (
                <OutcomePill 
                  color="bg-orange-500/10 text-orange-500 border-orange-500/20" 
                  label="Off" 
                  count={agent.outcomes.numberOff} 
                />
              )}
              {agent.outcomes.other > 0 && (
                <OutcomePill 
                  color="bg-gray-500/10 text-gray-500 border-gray-500/20" 
                  label="Other" 
                  count={agent.outcomes.other} 
                />
              )}
            </div>
          </div>

          {/* Floating Action Indicator */}
          <div className="absolute top-8 right-8 h-2 w-2 rounded-full bg-primary/40 group-hover:scale-[6] group-hover:opacity-0 transition-all duration-700" />
          
          <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 group-hover:translate-x-3 transition-all duration-500">
             <ChevronRight className="h-6 w-6 text-primary" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function OutcomePill({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className={cn("px-3 py-1 rounded-xl border text-[10px] font-black flex items-center gap-2 shadow-sm transition-all hover:scale-105", color)}>
      <span className="opacity-70 uppercase tracking-tighter">{label}</span>
      <span className="font-mono bg-white/40 px-1.5 py-0.5 rounded-lg">{count}</span>
    </div>
  );
}
