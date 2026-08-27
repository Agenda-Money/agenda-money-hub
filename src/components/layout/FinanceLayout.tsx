import { Outlet, NavLink } from "react-router-dom";
import { Calculator, LogOut, LayoutGrid, Receipt, BookText, ArrowLeftRight, PieChart, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/finance", label: "Overview", end: true, icon: LayoutGrid },
  { to: "/finance/pnl", label: "P&L", icon: Receipt },
  { to: "/finance/ledger", label: "Ledger", icon: BookText },
  { to: "/finance/channels", label: "Channels", icon: ArrowLeftRight },
  { to: "/finance/portfolio", label: "Portfolio", icon: PieChart },
  { to: "/finance/cashflow", label: "Cash Flow", icon: Activity },
];

// Deliberately its own subdomain rather than a gated section inside admin —
// finance data (cost of funds, margin, payroll) is more sensitive than most
// of what's already behind the general admin role, so it gets its own
// access boundary rather than reusing AppSidebar/DashboardLayout wholesale.
export default function FinanceLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      <div className="h-1 w-full bg-gradient-to-r from-primary via-emerald-500 to-sky-500" />
      <header className="border-b bg-card px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Calculator className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold hidden sm:inline">Agenda Money Finance</span>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                )
              }
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-muted-foreground hidden sm:inline">{user?.fullName || "Admin"}</span>
          <Button variant="ghost" size="icon" onClick={() => logout()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
