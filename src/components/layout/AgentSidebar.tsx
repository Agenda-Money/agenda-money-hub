import { NavLink, useLocation } from "react-router-dom";
import { Home, UserPlus, Users, User, LogOut, X, ChevronRight, Sparkles, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface AgentSidebarProps {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}

const navItems = [
  { to: "/agent", icon: Home, label: "Dashboard", description: "Overview & stats" },
  { to: "/agent/onboard", icon: UserPlus, label: "New Onboarding", description: "Register customer" },
  { to: "/agent/portfolio", icon: Users, label: "My Portfolio", description: "Track customers" },
  { to: "/agent/profile", icon: User, label: "Account", description: "Settings & profile" },
];

const sidebarVariants = {
  open: { x: 0, transition: { type: "spring" as const, stiffness: 300, damping: 30 } },
  closed: { x: "-100%", transition: { type: "spring" as const, stiffness: 300, damping: 30 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1, type: "spring" as const, stiffness: 300, damping: 24 },
  }),
};

export function AgentSidebar({ isOpen, onToggle }: AgentSidebarProps) {
  const { logout, user } = useAuth();
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={isOpen ? "open" : "closed"}
        variants={sidebarVariants}
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-[280px] bg-card border-r border-border flex flex-col",
          "lg:translate-x-0 lg:static lg:animate-none"
        )}
        style={{ willChange: "transform" }}
      >
        {/* Logo Section */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-11 h-11 bg-gradient-pink rounded-xl flex items-center justify-center shadow-pink"
            >
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <div className="min-w-0">
              <h1 className="font-bold text-base text-foreground truncate">Agent Portal</h1>
              <p className="text-xs text-muted-foreground font-mono truncate">{user?.agentCode || "Loading..."}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0 hover:bg-muted"
            onClick={onToggle}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {navItems.map((item, index) => {
            const isActive = item.to === "/agent" 
              ? location.pathname === "/agent" 
              : location.pathname.startsWith(item.to);
            
            return (
              <motion.div
                key={item.to}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={itemVariants}
              >
                <NavLink
                  to={item.to}
                  end={item.to === "/agent"}
                  onClick={() => {
                    if (window.innerWidth < 1024) onToggle();
                  }}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-pink"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {/* Active indicator glow */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-pink opacity-100"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  
                  <div className={cn(
                    "relative z-10 p-2 rounded-lg transition-colors",
                    isActive ? "bg-primary-foreground/20" : "bg-muted group-hover:bg-background"
                  )}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  
                  <div className="relative z-10 flex-1 min-w-0">
                    <span className="block truncate">{item.label}</span>
                    <span className={cn(
                      "text-xs truncate block",
                      isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {item.description}
                    </span>
                  </div>
                  
                  <ChevronRight className={cn(
                    "relative z-10 h-4 w-4 transition-transform",
                    isActive ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-50"
                  )} />
                </NavLink>
              </motion.div>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-border p-4 flex-shrink-0 space-y-3">
          {/* User Info Card */}
          <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-pink flex items-center justify-center text-primary-foreground font-bold text-sm">
              {user?.fullName?.charAt(0) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.fullName || "Agent"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          {/* Logout Button */}
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={logout}
            className="flex items-center justify-center gap-2 px-4 py-3 w-full rounded-xl text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </motion.button>
        </div>
      </motion.aside>
    </>
  );
}
