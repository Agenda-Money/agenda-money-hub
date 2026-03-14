import { Menu, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useSocketContext } from "@/contexts/SocketContext";

interface AgentHeaderProps {
  onMenuClick: () => void;
}

export function AgentHeader({ onMenuClick }: AgentHeaderProps) {
  const { user } = useAuth();
  const { notifications } = useSocketContext();

  const initials = user?.fullName
    ? user.fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
    : "AG";

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-14 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 rounded-lg" onClick={onMenuClick}>
          <Menu className="h-4 w-4" />
        </Button>
        <div className="hidden md:flex items-center relative">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search..." className="w-[220px] pl-8 h-9 bg-muted/50 border-0 rounded-lg text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center w-3.5 h-3.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
        <Avatar className="h-8 w-8 border border-border">
          <AvatarFallback className="bg-gradient-pink text-primary-foreground text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
