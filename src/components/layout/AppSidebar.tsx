import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  CreditCard,
  Banknote,
  UserCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  subItems?: { to: string; label: string }[];
}

const NavItem = ({ to, icon: Icon, label, subItems }: NavItemProps) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isActive = location.pathname === to || location.pathname.startsWith(to + "/");
  const hasSubItems = subItems && subItems.length > 0;

  if (hasSubItems) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
            isActive
              ? "bg-accent text-accent-foreground"
              : "text-sidebar-foreground hover:bg-muted"
          )}
        >
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {isOpen && (
          <div className="ml-8 space-y-1">
            {subItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "block px-4 py-2 rounded-lg text-sm transition-all duration-200",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-muted"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-sidebar-foreground hover:bg-muted"
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  );
};

interface AppSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
  const navItems: NavItemProps[] = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/users", icon: Users, label: "Users" },
    {
      to: "/loans",
      icon: CreditCard,
      label: "Loans",
      subItems: [
        { to: "/loans/pending", label: "Pending" },
        { to: "/loans/active", label: "Active" },
        { to: "/loans/overdue", label: "Overdue" },
      ],
    },
    { to: "/repayments", icon: Banknote, label: "Repayments" },
    { to: "/agents", icon: UserCheck, label: "Agents" },
    { to: "/analytics", icon: BarChart3, label: "Analytics" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={onToggle}
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
        <div className="h-20 flex items-center justify-between px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-pink rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">Agenda Money</h1>
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
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

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-sidebar-border">
          <button className="flex items-center justify-start text-left gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200">
            <LogOut className="h-5 w-5 shrink-0" />
        <div className="mt-auto p-4 border-t border-sidebar-border">
          <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200">
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
