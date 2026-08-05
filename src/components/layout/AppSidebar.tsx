import { useSignedUrl } from "@/hooks/useSignedUrl";
import { useState, useEffect } from "react";
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
  X,
  CheckCircle,
  FileText,
  Send,
  PhoneCall,
  Gift,
  Repeat2,
  TreePine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/hooks/useSocket";
import { useQuery } from "@tanstack/react-query";
import sidebarApi from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  subItems?: { to: string; label: string }[];
  badge?: number;
}

const NavItem = ({ to, icon: Icon, label, subItems, badge }: NavItemProps) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const hasSubItems = subItems && subItems.length > 0;
  const isChildActive = hasSubItems ? subItems.some((item) => location.pathname === item.to || location.pathname.startsWith(item.to + "/")) : false;
  const isActive = location.pathname === to || location.pathname.startsWith(to + "/") || isChildActive;

  useEffect(() => {
    if (isChildActive) setIsOpen(true);
  }, [isChildActive]);

  if (hasSubItems) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
            isActive
              ? isChildActive
                ? "bg-primary/10 text-primary"
                : "bg-accent text-accent-foreground"
              : "text-sidebar-foreground hover:bg-muted"
          )}
        >
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5" />
            <span>{label}</span>
            {badge !== undefined && badge > 0 && (
              <Badge className="bg-red-500 text-white border-0 h-5 min-w-[20px] px-1.5 text-xs font-bold">
                {badge > 99 ? "99+" : badge}
              </Badge>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-0" : "-rotate-90")} />
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
      {badge !== undefined && badge > 0 && (
        <Badge className="bg-red-500 text-white border-0 h-5 min-w-[20px] px-1.5 text-xs font-bold ml-auto">
          {badge > 99 ? "99+" : badge}
        </Badge>
      )}
    </NavLink>
  );
};



interface AppSidebarProps {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}



export function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
  const { logout, user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";


  // Support both camelCase and snake_case or fallback for KYC paths, using type assertions to avoid TS errors
  const ghanaCardFrontPath = (user && (
    (user as any).ghanaCardFrontPath ||
    (user as any).ghana_card_front_path ||
    (user as any).kycFrontPath
  )) || undefined;
  const ghanaCardBackPath = (user && (
    (user as any).ghanaCardBackPath ||
    (user as any).ghana_card_back_path ||
    (user as any).kycBackPath
  )) || undefined;
  const selfiePath = (user && (
    (user as any).selfiePath ||
    (user as any).selfie_path ||
    (user as any).kycSelfiePath
  )) || undefined;

  const ghanaCardFrontUrl = useSignedUrl(ghanaCardFrontPath);
  const ghanaCardBackUrl = useSignedUrl(ghanaCardBackPath);
  const selfieUrl = useSignedUrl(selfiePath);

  // Query for pending users count
  const { data: pendingData, refetch: refetchPending } = useQuery({
    queryKey: ["pending-users-count"],
    queryFn: async () => {
      const res = await sidebarApi.get("/api/admin/users/pending?limit=1000");
      const users = res.data?.data || res.data || [];
      return Array.isArray(users) ? users : [];
    },
    enabled: !!user && (user.role === "admin" || user.role === "viewer" || user.role === "superadmin"),
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  // Update pending count from query
  useEffect(() => {
    if (pendingData) {
      setPendingCount(pendingData.length);
    }
  }, [pendingData]);

  // WebSocket listener for NEW_APPLICATION
  useSocket(user && (user.role === "admin" || user.role === "viewer" || user.role === "superadmin") ? wsUrl : null, (message) => {
    if (message?.type === "NEW_APPLICATION") {
      // Increment count and refetch to get accurate data
      setPendingCount(prev => prev + 1);
      refetchPending();
    }
  });

  const navItems: NavItemProps[] = [
    { to: "/", icon: Home, label: "Dashboard" },
    // Admin/Viewer only items (top)
    ...(user && (user.role === "admin" || user.role === "viewer" || user.role === "superadmin")
      ? [
          { to: "/kyc-approvals", icon: CheckCircle, label: "KYC Approvals", badge: pendingCount },
          { to: "/agents", icon: UserCheck, label: "Agents" },
        ]
      : []),
    // Accessible to both admin and agents
    { to: "/users", icon: Users, label: "Users" },
    {
      to: "/loans",
      icon: CreditCard,
      label: "Loans",
      subItems: [
        { to: "/loans/pending", label: "Pending" },
        { to: "/loans/active", label: "Active" },
        { to: "/loans/closed", label: "Closed" },
        { to: "/loans/overdue", label: "Overdue" },
      ],
    },
    { 
      to: "/repayments", 
      icon: Banknote, 
      label: "Repayments",
      subItems: [
        { to: "/repayments", label: "Repayment Logs" },
        { to: "/admin/collections/monitoring", label: "Team Monitoring" },
        { to: "/repayments?tab=collections", label: "Collections List" },
      ]
    },
    // Admin/Viewer only items (bottom)
    ...(user && (user.role === "admin" || user.role === "viewer" || user.role === "superadmin")
      ? [
          { to: "/admin/loans/manual-disburse", icon: Send, label: "Manual Disbursement" },
          {
            to: "/admin/commissions",
            icon: Banknote,
            label: "Commissions",
            subItems: [
              { to: "/payouts", label: "Withdrawals" },
              { to: "/admin/commissions/deductions", label: "Deductions" },
            ],
          },
          {
            to: "/admin/direct-debit",
            icon: Repeat2,
            label: "Direct Debit",
            subItems: [
              { to: "/admin/direct-debit", label: "Overview" },
              { to: "/admin/direct-debit/mandates", label: "Mandates" },
              { to: "/admin/direct-debit/delinquent", label: "Delinquent Customers" },
            ],
          },
          {
            to: "/admin/orchard",
            icon: TreePine,
            label: "Orchard",
            subItems: [
              { to: "/admin/orchard", label: "Overview" },
              { to: "/admin/orchard/mandates", label: "Mandates" },
            ],
          },
          { to: "/analytics", icon: BarChart3, label: "Analytics" },
          { to: "/audit-logs", icon: FileText, label: "Audit Logs" },
          {
            to: "/admin/rewards",
            icon: Gift,
            label: "Rewards & Comms",
            subItems: [
              { to: "/admin/rewards/send-airtime", label: "Send airtime" },
              { to: "/admin/rewards/send-sms", label: "Send SMS" },
              { to: "/admin/rewards/momo-disbursement", label: "MoMo disbursement" },
              { to: "/admin/rewards/campaign-history", label: "Campaign history" },
            ],
          },
        ]
      : []),
  ];
  const settingsItem: NavItemProps = { to: "/settings", icon: Settings, label: "Settings" };

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
          "fixed top-0 left-0 z-50 h-full w-[280px] bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen",
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
              <h1 className="font-bold text-lg text-foreground">Agenda Money</h1>
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Close sidebar"
            onClick={onToggle}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 custom-scrollbar">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* KYC Images Preview (Admin/Viewer only, for demonstration) */}
        {user && (user.role === "admin" || user.role === "viewer" || user.role === "superadmin") && (ghanaCardFrontUrl || ghanaCardBackUrl || selfieUrl) && (
          <div className="border-t border-sidebar-border p-4 pb-4 flex-shrink-0 bg-sidebar/50 backdrop-blur-sm">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">KYC Images Preview</div>
            <div className="flex gap-2">
              {ghanaCardFrontUrl && (
                <img src={ghanaCardFrontUrl} alt="Ghana Card Front" className="w-16 h-12 rounded border" />
              )}
              {ghanaCardBackUrl && (
                <img src={ghanaCardBackUrl} alt="Ghana Card Back" className="w-16 h-12 rounded border" />
              )}
              {selfieUrl && (
                <img src={selfieUrl} alt="Selfie" className="w-12 h-12 rounded-full border" />
              )}
            </div>
          </div>
        )}

        {/* Footer status and actions - PERSISTENT */}
        <div className="border-t border-sidebar-border p-4 pb-8 flex-shrink-0 bg-sidebar/50 backdrop-blur-sm">
          <div className="mb-2">
            <NavItem {...settingsItem} />
          </div>
          <button 
            onClick={() => logout()}
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
