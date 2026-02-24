import { Menu, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface AgentHeaderProps {
  onMenuClick: () => void;
}

export function AgentHeader({ onMenuClick }: AgentHeaderProps) {
  const { user } = useAuth();
  
  const initials = user?.fullName 
    ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : "AG";

  return (
    <header className="h-16 sm:h-20 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      {/* Left Side */}
      <div className="flex items-center gap-3 sm:gap-4">
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

        {/* Search - Hidden on mobile */}
        <div className="hidden md:flex items-center relative">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="w-[280px] pl-10 h-10 bg-muted/50 border-0 rounded-xl focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2 sm:gap-4">

        {/* Notifications */}
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl hover:bg-muted">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
          </Button>
        </motion.div>

        {/* User Avatar */}
        <motion.div 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }}
          className="cursor-pointer"
        >
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarFallback className="bg-gradient-pink text-primary-foreground text-sm font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </motion.div>
      </div>
    </header>
  );
}
