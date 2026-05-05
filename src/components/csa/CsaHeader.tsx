import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCsaAuth } from '@/contexts/CsaAuthContext';
import { motion } from 'framer-motion';

interface CsaHeaderProps {
  onMenuClick: () => void;
}

export function CsaHeader({ onMenuClick }: CsaHeaderProps) {
  const { user } = useCsaAuth();
  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'CS';

  return (
    <header className="h-16 sm:h-20 bg-card/50 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-4">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button variant="ghost" size="icon" className="lg:hidden h-10 w-10 rounded-xl hover:bg-muted" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        </motion.div>


      </div>

      {/* Right */}
      <div className="flex items-center gap-3">


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
