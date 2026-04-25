import React from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageSquare, ChevronLeft, MapPin, Hash, CheckCircle2, XCircle, Clock, Calendar, Database, User, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityFeedItem } from '@/lib/teamActivityService';
import { formatGHS } from '@/lib/bucketUtils';

interface AgentActivityFeedProps {
  activities: ActivityFeedItem[];
  isLoading: boolean;
  agentName: string;
  onBack: () => void;
  pagination: {
    page: number;
    pages: number;
    total: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  onPageChange: (page: number) => void;
}

export function AgentActivityFeed({ activities, isLoading, agentName, onBack, pagination, onPageChange }: AgentActivityFeedProps) {
  const getOutcomeStyle = (outcome: string) => {
    const o = outcome?.toLowerCase() || '';
    if (o.includes('wrong')) return "bg-[#FCEBEB] text-[#A32D2D] border-[#F7C1C1]";
    if (o.includes('no answer') || o.includes('missed')) return "bg-gray-50 text-gray-500 border-gray-200";
    if (o.includes('promise') || o.includes('ptp')) return "bg-[#FAEEDA] text-[#854F0B] border-[#FAC775]";
    if (o.includes('answered') || o.includes('collected') || o.includes('success')) return "bg-[#EAF3DE] text-[#3B6D11] border-[#C0DD97]";
    if (o.includes('sms')) return "bg-[#E6F1FB] text-[#0C447C] border-[#B5D4F4]";
    return "bg-gray-50 text-gray-500 border-gray-200";
  };

  const formatOutcomeLabel = (outcome: string) => {
    const o = outcome?.toLowerCase() || '';
    if (o.includes('wrong')) return "Wrong number";
    if (o.includes('no answer')) return "No answer";
    if (o.includes('promise') || o.includes('ptp')) return "Promised to pay";
    if (o.includes('answered') || o.includes('success')) return "Answered";
    if (o.includes('sms')) return "SMS sent";
    return outcome || "Recorded";
  };

  if (isLoading && activities.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl shadow-sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Agent Detail Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack} 
            className="h-10 gap-2 px-4 text-xs font-black border-gray-200 hover:bg-gray-50 rounded-xl shadow-sm transition-all active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to overview
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-gray-900 tracking-tight leading-tight">{agentName}'s activity</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="bg-[#FBEAF0] text-[#72243E] px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                {pagination.total} interactions
              </span>
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest opacity-60">
                Page {pagination.page} of {pagination.pages}
              </span>
            </div>
          </div>
        </div>
        <div className="h-[1px] w-full bg-gray-100" />
      </div>

      {/* Activities List */}
      <div className="flex flex-col gap-4">
        {activities.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
             <Database className="h-10 w-10 text-gray-300 mx-auto mb-4" />
             <h4 className="text-lg font-black text-gray-900">No activity logs found</h4>
          </div>
        ) : (
          activities.map((activity, idx) => (
            <motion.div
              key={activity._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group bg-white rounded-[1.5rem] border border-gray-100 shadow-sm hover:border-gray-200 transition-all overflow-hidden"
            >
              <div className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                    activity.type === 'CALL' ? "bg-[#D4537E]" : "bg-[#378ADD]"
                  )}>
                    {activity.type === 'CALL' ? <Phone className="h-5 w-5 text-white fill-white" /> : <MessageSquare className="h-5 w-5 text-white fill-white" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-[16px] font-black text-gray-900 tracking-tight">
                        {activity.borrowerName}
                        <span className="text-[13px] text-gray-400 font-bold ml-1.5 opacity-60">{activity.borrowerPhone}</span>
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5 font-black uppercase tracking-widest">
                      <Clock className="h-3 w-3 opacity-40 shrink-0" />
                      Interaction recorded by system
                    </div>
                  </div>
                </div>
                <span className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shrink-0 shadow-sm",
                  getOutcomeStyle(activity.outcome)
                )}>
                  {formatOutcomeLabel(activity.outcome)}
                </span>
              </div>

              {/* SMS Preview */}
              {activity.notes && activity.type === 'SMS' && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <p className="text-[14px] text-gray-700 italic font-medium leading-relaxed">
                    "{activity.notes}"
                  </p>
                </div>
              )}

              {/* Notes for Calls */}
              {activity.notes && activity.type === 'CALL' && (
                <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/30">
                   <p className="text-[13px] text-gray-600 font-bold">
                     <span className="text-[10px] text-gray-400 mr-2 font-black uppercase tracking-widest opacity-60">Admin Notes:</span>
                     {activity.notes}
                   </p>
                </div>
              )}

              {/* Metadata Row */}
              <div className={cn(
                "grid border-t border-gray-100",
                activity.type === 'CALL' ? "grid-cols-3" : "grid-cols-2"
              )}>
                <div className="px-6 py-4 flex flex-col gap-1 border-r border-gray-100">
                  <div className="flex items-center gap-1.5 text-[9px] text-gray-400 uppercase tracking-widest font-black opacity-60">
                    <Database className="h-2.5 w-2.5 opacity-50" />
                    Reference
                  </div>
                  <div className="text-[13px] font-bold text-gray-900 truncate tracking-tight">{activity.loanReference}</div>
                </div>
                <div className="px-6 py-4 flex flex-col gap-1 border-r border-gray-100">
                  <div className="flex items-center gap-1.5 text-[9px] text-gray-400 uppercase tracking-widest font-black opacity-60">
                    <Clock className="h-2.5 w-2.5 opacity-50" />
                    Timestamp
                  </div>
                  <div className="text-[13px] font-bold text-gray-900 whitespace-nowrap tracking-tight">
                    {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
                  </div>
                </div>
                {activity.type === 'CALL' && (
                  <div className="px-6 py-4 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[9px] text-gray-400 uppercase tracking-widest font-black opacity-60">
                      <User className="h-2.5 w-2.5 opacity-50" />
                      Customer Service Agent
                    </div>
                    <div className="text-[13px] font-bold text-gray-900 truncate tracking-tight">{agentName}</div>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 py-6">
          <Button
            variant="outline"
            disabled={!pagination.hasPrevPage || isLoading}
            onClick={() => onPageChange(pagination.page - 1)}
            className="h-9 px-4 rounded-lg border-gray-200 text-xs font-semibold hover:bg-gray-50"
          >
            ← Previous
          </Button>
          <div className="flex items-center justify-center px-4 h-9 bg-gray-50 rounded-lg border border-gray-200 min-w-[80px]">
             <span className="text-xs font-bold font-mono text-gray-600">
               {pagination.page} / {pagination.pages}
             </span>
          </div>
          <Button
            variant="outline"
            disabled={!pagination.hasNextPage || isLoading}
            onClick={() => onPageChange(pagination.page + 1)}
            className="h-9 px-4 rounded-lg border-gray-200 text-xs font-semibold hover:bg-gray-50"
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
