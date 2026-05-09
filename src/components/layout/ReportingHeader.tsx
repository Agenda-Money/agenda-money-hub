import { Menu, Bell, ChevronDown, UserCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useReportingAuthStore } from "@/store/reportingAuth.store";

interface ReportingHeaderProps {
  onMenuClick: () => void;
}

export function ReportingHeader({ onMenuClick }: ReportingHeaderProps) {
  const { displayName, role, logout } = useReportingAuthStore();

  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "RV";

  const handleLogout = () => {
    logout();
    window.location.href = "/reporting/login";
  };

  return (
    <header className="h-16 sm:h-20 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      {/* Left Side */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open sidebar"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Notifications (Placeholder for now) */}
        <Button variant="ghost" size="icon" className="text-muted-foreground opacity-50">
          <Bell className="h-5 w-5" />
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 sm:gap-3 px-1.5 sm:px-2 h-auto py-1.5 hover:bg-muted/50 rounded-xl transition-all outline-none group">
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-primary/10 group-hover:border-primary/30 transition-colors">
                <AvatarFallback className="bg-gradient-pink text-primary-foreground text-[10px] sm:text-xs font-black">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-black text-foreground tracking-tight leading-none">
                  {displayName || "Reporting Partner"}
                </p>
              </div>
              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground ml-0.5 sm:ml-1 group-hover:text-foreground transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl border-border/50">
            <div className="px-3 py-2 mb-2 bg-muted/30 rounded-xl">
               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Session Info</p>
               <p className="text-xs font-medium truncate">{displayName}</p>
            </div>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuItem 
              className="flex items-center gap-2 p-3 text-destructive focus:text-destructive focus:bg-destructive/10 rounded-xl cursor-pointer font-bold text-sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
