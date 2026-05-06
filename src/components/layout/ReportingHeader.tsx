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
    <header className="h-20 bg-card border-b border-border flex items-center justify-between px-6">
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
            <Button variant="ghost" className="flex items-center gap-3 px-2 h-auto py-1.5 hover:bg-muted/50 rounded-xl transition-all">
              <Avatar className="h-9 w-9 border-2 border-primary/10">
                <AvatarFallback className="bg-gradient-pink text-primary-foreground text-xs font-black">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-black text-foreground tracking-tight">
                  {displayName || "Reporting Partner"}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {role === 'reporting_viewer' ? 'View Only' : role || "Partner"}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
            </Button>
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
