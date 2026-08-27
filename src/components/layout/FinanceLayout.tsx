import { Outlet, NavLink } from "react-router-dom";
import { Calculator, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/finance", label: "Overview", end: true },
  { to: "/finance/pnl", label: "P&L" },
  { to: "/finance/ledger", label: "Ledger" },
  { to: "/finance/channels", label: "Channels" },
  { to: "/finance/portfolio", label: "Portfolio" },
];

// Deliberately its own subdomain rather than a gated section inside admin —
// finance data (cost of funds, margin, payroll) is more sensitive than most
// of what's already behind the general admin role, so it gets its own
// access boundary rather than reusing AppSidebar/DashboardLayout wholesale.
export default function FinanceLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      <header className="border-b bg-card px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <span className="font-bold">Agenda Money Finance</span>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">{user?.fullName || "Admin"}</span>
          <Button variant="ghost" size="icon" onClick={() => logout()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
