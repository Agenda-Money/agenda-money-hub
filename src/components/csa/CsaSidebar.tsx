import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, PhoneCall, LogOut, X, ChevronRight, Landmark, MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCsaAuth } from '@/contexts/CsaAuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface CsaSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navItems = [
  { to: '/csa', icon: LayoutDashboard, label: 'Collections', description: 'Daily loan buckets' },
  { to: '/csa/activity', icon: PhoneCall, label: 'My Activity', description: "Today's calls" },
  { to: '/csa/templates', icon: MessageSquare, label: 'SMS Templates', description: 'View templates' },
];

const sidebarVariants = {
  open: { x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
  closed: { x: '-100%', transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.08, type: 'spring' as const, stiffness: 300, damping: 24 },
  }),
};

export function CsaSidebar({ isOpen, onToggle }: CsaSidebarProps) {
  const { logout, user } = useCsaAuth();
  const location = useLocation();

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={isOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-[280px] bg-card border-r border-border flex flex-col',
          'lg:sticky lg:top-0 lg:h-screen lg:!translate-x-0',
        )}
        style={{ willChange: 'transform' }}
      >
        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center shadow-pink"
            >
              <Landmark className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="font-bold text-base text-foreground">Collections</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">CSA Portal</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden hover:bg-muted" onClick={onToggle}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {((['supervisor', 'manager', 'admin'].includes((user?.role as string)?.toLowerCase())) ? [
            ...navItems,
            { to: '/csa/team', icon: Users, label: 'Team Activity', description: 'Monitor performance' }
          ] : navItems).map((item, i) => {
            const isActive = item.to === '/csa'
              ? location.pathname === '/csa'
              : location.pathname.startsWith(item.to);

            return (
              <motion.div key={item.to} custom={i} initial="hidden" animate="visible" variants={itemVariants}>
                <NavLink
                  to={item.to}
                  end={item.to === '/csa'}
                  onClick={() => { if (window.innerWidth < 1024) onToggle(); }}
                  className={cn(
                    'group flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-pink translate-x-1'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1',
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="csaActiveTab"
                      className="absolute inset-0 bg-primary"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div className={cn(
                    'relative z-10 p-2 rounded-lg transition-all duration-300 group-hover:scale-110',
                    isActive ? 'bg-primary-foreground/20' : 'bg-muted group-hover:bg-background shadow-sm',
                  )}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="relative z-10 flex-1 min-w-0">
                    <span className="block truncate font-bold">{item.label}</span>
                    <span className={cn(
                      'text-[10px] truncate block font-medium uppercase tracking-tight opacity-70',
                      isActive ? 'text-primary-foreground/70' : 'text-muted-foreground',
                    )}>
                      {item.description}
                    </span>
                  </div>
                  <ChevronRight className={cn(
                    'relative z-10 h-4 w-4 transition-all duration-300',
                    isActive ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100',
                  )} />
                </NavLink>
              </motion.div>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-border p-4 pb-8 flex-shrink-0 space-y-3 bg-card/50">
          <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-pink">
              {user?.fullName?.charAt(0) || 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user?.fullName || 'CSA Agent'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={logout}
            className="flex items-center justify-center gap-2 px-4 py-3 w-full rounded-xl text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </motion.button>
        </div>
      </motion.aside>
    </>
  );
}
