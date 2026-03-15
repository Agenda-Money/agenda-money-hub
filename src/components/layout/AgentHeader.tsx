import { Menu, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useSocketContext } from "@/contexts/SocketContext";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface AgentHeaderProps {
  onMenuClick: () => void;
}

export function AgentHeader({ onMenuClick }: AgentHeaderProps) {
  const { user } = useAuth();
  const { notifications } = useSocketContext();
  
  const initials = user?.fullName 
    ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : "AG";

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-16 sm:h-20 bg-card/50 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      {/* Left Side */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10 rounded-xl hover:bg-muted"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </motion.div>

        {/* Search */}
        <div className="max-w-md w-full relative group hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search customers..."
            className="w-full pl-10 pr-12 h-11 bg-muted/30 border-border/50 rounded-2xl focus-visible:ring-primary focus-visible:bg-muted/50 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-1 rounded bg-muted border border-border/50 text-[10px] font-bold text-muted-foreground">
            <span className="text-[8px]">⌘</span>K
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3 sm:gap-4">
        
        {/* Online Status Toggle */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Online</span>
        </div>

        {/* Notifications */}
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button variant="ghost" size="icon" className="relative h-11 w-11 rounded-2xl hover:bg-muted bg-muted/30 border border-border/50">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
               <span className="absolute top-2 right-2 flex items-center justify-center w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full border-2 border-card">
                 {unreadCount > 9 ? '9+' : unreadCount}
               </span>
            )}
          </Button>
        </motion.div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-2 border-l border-border/50">
          <div className="hidden lg:block text-right">
            <p className="text-sm font-bold text-foreground leading-none">{user?.fullName || "Agent"}</p>
          </div>
          <motion.div 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            className="cursor-pointer relative"
          >
            <Avatar className="h-11 w-11 border-2 border-primary/20 shadow-lg">
              <AvatarFallback className="bg-gradient-pink text-primary-foreground text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full sm:hidden" />
          </motion.div>
        </div>
      </div>
    </header>
  );
}
