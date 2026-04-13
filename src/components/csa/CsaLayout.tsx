import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CsaSidebar } from './CsaSidebar';
import { CsaHeader } from './CsaHeader';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import csaApi from '@/lib/csaApi';

export default function CsaLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['csa-me-stats'],
    queryFn: () => csaApi.get('/api/csa/collections/stats/me').then((r) => r.data),
    refetchInterval: 60_000,
  });

  return (
    <div className="h-screen bg-background flex w-full overflow-hidden">
      <CsaSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <CsaHeader
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          callsToday={stats?.today?.callsLogged ?? 0}
          dailyTarget={stats?.dailyCallTarget ?? 30}
        />
        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-y-auto"
        >
          <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto w-full">
            <Outlet />
          </div>
        </motion.main>
      </div>
    </div>
  );
}
