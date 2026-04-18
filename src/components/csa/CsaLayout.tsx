import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CsaSidebar } from './CsaSidebar';
import { CsaHeader } from './CsaHeader';
import { motion } from 'framer-motion';

export default function CsaLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-background flex w-full overflow-hidden">
      <CsaSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <CsaHeader
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
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
