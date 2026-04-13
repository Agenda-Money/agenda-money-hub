import { Menu, Target, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCsaAuth } from '@/contexts/CsaAuthContext';
import { motion } from 'framer-motion';

interface CsaHeaderProps {
  onMenuClick: () => void;
  callsToday?: number;
  dailyTarget?: number;
}

export function CsaHeader({ onMenuClick, callsToday = 0, dailyTarget = 30 }: CsaHeaderProps) {
  const { user } = useCsaAuth();
  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'CS';

  const pct = Math.min(100, Math.round((callsToday / dailyTarget) * 100));

  return (
    <header className="h-16 sm:h-20 bg-card/50 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-4">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button variant="ghost" size="icon" className="lg:hidden h-10 w-10 rounded-xl hover:bg-muted" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        </motion.div>

        {/* Daily progress pill */}
        <div className="hidden sm:flex items-center gap-3 bg-muted/50 rounded-2xl px-4 py-2 border border-border/50">
          <PhoneCall className="h-4 w-4 text-primary" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Today's Calls</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{callsToday}</span>
              <span className="text-xs text-muted-foreground">/ {dailyTarget}</span>
            </div>
          </div>
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-primary rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Target badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Target className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-bold text-primary uppercase tracking-wider">{pct}% of goal</span>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-border/50">
          <div className="hidden lg:block text-right">
            <p className="text-sm font-bold text-foreground leading-none">{user?.fullName}</p>
            <p className="text-[10px] text-muted-foreground">Collections Agent</p>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-pink cursor-pointer"
          >
            {initials}
          </motion.div>
        </div>
      </div>
    </header>
  );
}
