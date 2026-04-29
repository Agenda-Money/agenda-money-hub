import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, RefreshCw, AlertCircle, ChevronLeft } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCsaAuth } from "@/contexts/CsaAuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { format, endOfDay } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { 
  getTeamActivityOverview, 
  getAgentActivityFeed,
  getAdminTeamOverview,
  getAdminAgentActivityFeed
} from "@/lib/teamActivityService";
import { AgentsOverviewGrid } from "@/components/csa/team/AgentsOverviewGrid";
import { AgentActivityFeed } from "@/components/csa/team/AgentActivityFeed";

import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function TeamActivityPage() {
  const { user: adminUser, loading: adminLoading } = useAuth();
  const { user: csaUser, loading: csaLoading } = useCsaAuth();
  const currentUser = csaUser || adminUser;
  const isAdmin = !!adminUser && (adminUser.role === 'admin' || adminUser.role === 'superadmin' || adminUser.role === 'viewer');
  
  const location = useLocation();
  const isExecutingAsAdmin = location.pathname.startsWith('/admin');
  const isSupervisorOrManager = ['supervisor', 'manager'].includes((csaUser?.role as string)?.toLowerCase());
  const isAllowed = isExecutingAsAdmin ? isAdmin : (isSupervisorOrManager || isAdmin);

  if (adminLoading || csaLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-primary animate-spin opacity-20" />
      </div>
    );
  }

  const [dateFrom, setDateFrom] = useState('1970-01-01');
  const [dateTo, setDateTo] = useState(endOfDay(new Date()).toISOString());
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [feedPage, setFeedPage] = useState(1);

  const { 
    data: overviewRes, 
    isLoading: isOverviewLoading, 
    isFetching: isFetchingOverview,
    error: overviewError,
    refetch: refetchOverview 
  } = useQuery({
    queryKey: ['team-activity-overview', dateFrom, dateTo, isExecutingAsAdmin],
    queryFn: () => isExecutingAsAdmin 
      ? getAdminTeamOverview(dateFrom, dateTo)
      : getTeamActivityOverview(dateFrom, dateTo),
    enabled: !!currentUser,
    staleTime: 0, // Always fetch fresh on visit
  });

  const rawAgents = overviewRes?.data?.agents || overviewRes?.agents || [];
  const agents = rawAgents.map((a: any) => ({
    _id: a.agentId ?? a._id ?? '',
    name: a.agentName ?? a.name ?? 'Unknown',
    totalActivities: a.totalCallsInRange ?? a.totalActivities ?? a.totalCallsToday ?? 0,
    outcomes: a.callOutcomeBreakdown ?? a.outcomes ?? { answered: 0, noAnswer: 0, promisedToPay: 0, partialPayment: 0 },
    conversionRate: a.conversionRate ?? 0,
    successfulCollections: a.successfulCollections ?? 0,
    lastActiveAt: a.lastActiveAt ?? a.lastCallAt ?? null
  }));

  const { 
    data: feedRes, 
    isLoading: isFeedLoading,
    isFetching: isFetchingFeed,
    error: feedError,
    refetch: refetchFeed
  } = useQuery({
    queryKey: ['agent-activity-feed', selectedAgentId, feedPage, dateFrom, dateTo, isExecutingAsAdmin],
    queryFn: () => isExecutingAsAdmin
      ? getAdminAgentActivityFeed(selectedAgentId!, { page: feedPage, dateFrom, dateTo })
      : getAgentActivityFeed(selectedAgentId!, { page: feedPage, dateFrom, dateTo }),
    enabled: !!selectedAgentId,
    staleTime: 0,
  });

  const rawEntries = feedRes?.data?.entries || feedRes?.entries || [];
  const activities = rawEntries.map((e: any) => ({
    _id: e.id || e._id,
    type: e.type,
    createdAt: e.timestamp || e.createdAt,
    borrowerName: e.borrowerName,
    borrowerPhone: e.borrowerMsisdn || e.borrowerPhone,
    loanReference: e.loanReference,
    outcome: e.outcome,
    notes: e.notes,
    promiseDetails: e.promiseDetails
  }));

  if (overviewError) {
    const errorBody = (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
        <div className="w-24 h-24 rounded-[2rem] bg-rose-50 flex items-center justify-center border-2 border-rose-100 shadow-xl shadow-rose-500/5">
          <AlertCircle className="h-12 w-12 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-foreground">Monitoring Sync Failed</h2>
          <p className="text-muted-foreground font-bold text-sm max-w-sm mx-auto">
            We couldn't fetch the latest team activity. This might be due to a session timeout or role restriction.
          </p>
        </div>
        <Button 
          onClick={() => refetchOverview()} 
          className="rounded-2xl h-12 px-8 font-black bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          Retry Connection
        </Button>
      </div>
    );
    
    return isExecutingAsAdmin ? <DashboardLayout>{errorBody}</DashboardLayout> : errorBody;
  }

  if (!isAllowed) {
    const deniedBody = (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6 shadow-pill shadow-red-500/10">
          <AlertCircle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-foreground">Access Denied</h2>
        <p className="text-muted-foreground mt-2 max-w-xs mx-auto font-medium">
          You do not have permission to view the Team Activity dashboard.
        </p>
      </div>
    );
    return isExecutingAsAdmin ? <DashboardLayout>{deniedBody}</DashboardLayout> : deniedBody;
  }

  const content = (
    <div className="space-y-6 pb-12 px-4 md:px-0 max-w-7xl mx-auto">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#FBEAF0] rounded-xl flex items-center justify-center border border-[#F4C0D1]/30">
              <Users className="h-5 w-5 text-[#D4537E]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-tight">Team monitoring</h1>
              <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B6D11]" />
                <p className="text-[11px] font-black uppercase tracking-widest opacity-70">
                  Customer Service Tracking
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-gray-200 shadow-sm">
             <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Log Refresh</span>
             <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg hover:bg-gray-50"
              onClick={() => {
                refetchOverview();
                if (selectedAgentId) refetchFeed();
              }}
              disabled={isOverviewLoading || isFetchingOverview || (!!selectedAgentId && isFetchingFeed)}
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-[#D4537E]", (isOverviewLoading || isFetchingOverview || (!!selectedAgentId && isFetchingFeed)) && "animate-spin")} />
            </Button>
          </div>
        </div>
        
        <div className="h-[2px] w-full bg-gradient-to-r from-[#D4537E] via-[#F4C0D1] to-transparent rounded-full -mt-2" />
      </div>


      <AnimatePresence mode="wait">
        {!selectedAgentId ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8"
          >
            {agents.length === 0 && !isOverviewLoading ? (
              <div className="flex flex-col items-center justify-center py-32 bg-card/40 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-border/40 text-center">
                <div className="h-24 w-24 bg-muted/50 rounded-full flex items-center justify-center mb-8 shadow-inner">
                  <Users className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <h3 className="text-2xl font-black text-foreground">No Agents Found</h3>
                <p className="text-muted-foreground font-bold text-sm max-w-xs mx-auto mt-2">
                  Start by assigning agents to the collections team or adjust your reporting dates.
                </p>
              </div>
            ) : (
              <AgentsOverviewGrid 
                agents={agents} 
                onSelectAgent={(id) => {
                  setSelectedAgentId(id);
                  setFeedPage(1);
                }}
                isLoading={isOverviewLoading}
                selectedAgentId={selectedAgentId}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="feed"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            
            <AgentActivityFeed 
              activities={activities}
              isLoading={isFeedLoading}
              agentName={agents.find((a: any) => a._id === selectedAgentId)?.name || 'Agent'}
              onBack={() => setSelectedAgentId(null)}
              pagination={{
                page: feedRes?.data?.pagination?.page ?? feedRes?.pagination?.page ?? 1,
                pages: feedRes?.data?.pagination?.pages ?? feedRes?.pagination?.pages ?? 1,
                total: feedRes?.data?.pagination?.total ?? feedRes?.pagination?.total ?? 0,
                hasNextPage: feedRes?.data?.pagination?.hasNextPage ?? feedRes?.pagination?.hasNextPage ?? ((feedRes?.data?.pagination?.page ?? feedRes?.pagination?.page ?? 1) < (feedRes?.data?.pagination?.pages ?? feedRes?.pagination?.pages ?? 1)),
                hasPrevPage: feedRes?.data?.pagination?.hasPrevPage ?? feedRes?.pagination?.hasPrevPage ?? ((feedRes?.data?.pagination?.page ?? feedRes?.pagination?.page ?? 1) > 1)
              }}
              onPageChange={setFeedPage}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return isExecutingAsAdmin ? <DashboardLayout>{content}</DashboardLayout> : content;
}

