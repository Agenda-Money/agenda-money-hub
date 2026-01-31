import { NavLink } from "react-router-dom";
import { Home, UserPlus, Users, User, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface AgentSidebarProps {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}

export function AgentSidebar({ isOpen, onToggle }: AgentSidebarProps) {
  const { logout, user } = useAuth();

  const navItems = [
    { to: "/agent", icon: Home, label: "Dashboard" },
    { to: "/agent/onboard", icon: UserPlus, label: "New Onboarding" },
    { to: "/agent/portfolio", icon: Users, label: "My Portfolio" },
    { to: "/agent/profile", icon: User, label: "Account" },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={onToggle}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-[280px] bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo Section */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-pink rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">Agent Portal</h1>
              <p className="text-xs text-muted-foreground">{user?.agentCode || "Agent"}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onToggle}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/agent"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-sidebar-foreground hover:bg-muted"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout - Fixed at bottom */}
        <div className="border-t border-sidebar-border p-4 flex-shrink-0">
          <button 
            onClick={logout}
            className="flex items-center justify-start text-left gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
