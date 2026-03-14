import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, User, Phone, MapPin, DollarSign, AlertCircle, CheckCircle2, Clock, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OnboardedUser {
  id: string;
  fullName: string;
  ghanaCardNumber: string;
  phoneNumber: string;
  region: string;
  kycStatus: string;
  loanStatus: string;
  loanAmount?: number;
  onboardedDate: string;
  lastPayment?: string;
}

interface PortfolioResponse {
  users: OnboardedUser[];
  pagination: { total: number; page: number; pages: number };
}

const getKycBadge = (status: string) => {
  const map: Record<string, { icon: React.ElementType; label: string; cls: string }> = {
    verified: { icon: CheckCircle2, label: "Verified", cls: "border-emerald-500/30 text-emerald-600 bg-emerald-500/5" },
    pending: { icon: Clock, label: "Pending", cls: "border-warning/30 text-warning bg-warning/5" },
    mismatch: { icon: AlertCircle, label: "Mismatch", cls: "border-destructive/30 text-destructive bg-destructive/5" },
  };
  const config = map[status] || { icon: Clock, label: "Unknown", cls: "" };
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("text-[10px] font-semibold", config.cls)}>
      <Icon className="h-3 w-3 mr-1" />{config.label}
    </Badge>
  );
};

const getLoanBadge = (status: string, amount?: number) => {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "border-primary/30 text-primary bg-primary/5" },
    repaid: { label: "Closed", cls: "border-emerald-500/30 text-emerald-600 bg-emerald-500/5" },
    overdue: { label: "Overdue", cls: "border-destructive/30 text-destructive bg-destructive/5" },
  };
  const config = map[status];
  if (!config) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="text-right">
      <p className="font-bold text-sm text-foreground">₵{amount || 0}</p>
      <Badge variant="outline" className={cn("text-[10px]", config.cls)}>{config.label}</Badge>
    </div>
  );
};

export default function AgentPortfolio() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery<PortfolioResponse>({
    queryKey: ["agent-portfolio", user?.email, page],
    queryFn: async () => {
      const res = await api.get("/api/agents/portfolio", { params: { page, limit: 10 } });
      let rawDirectory: Record<string, unknown>[] = [];
      let pagination = { total: 0, page: 1, pages: 1 };
      if (res.data?.data?.directory) { rawDirectory = res.data.data.directory; pagination = res.data.data.pagination || pagination; }
      else if (res.data?.directory) { rawDirectory = res.data.directory; pagination = res.data.pagination || pagination; }
      else if (Array.isArray(res.data?.data)) { rawDirectory = res.data.data; pagination = { total: rawDirectory.length, page: 1, pages: 1 }; }
      return {
        users: rawDirectory.map((u) => ({
          id: String(u._id ?? u.id ?? ""), fullName: u.fullName as string, ghanaCardNumber: u.ghanaCardNumber as string,
          phoneNumber: u.phoneNumber as string, region: u.region as string,
          kycStatus: (u.kycStatus as string)?.toLowerCase() || "pending",
          loanStatus: (u.loanStatus as string)?.toLowerCase() || "none",
          loanAmount: u.loanAmount as number | undefined,
          onboardedDate: u.onboardedDate as string, lastPayment: u.lastPayment as string | undefined,
        })),
        pagination,
      };
    },
    enabled: !!user,
  });

  const { data: myStatsData } = useQuery({
    queryKey: ["agent-my-stats", user?.email],
    queryFn: async () => { const res = await api.get("/api/agents/my-stats"); return res.data?.data || res.data; },
    enabled: !!user?.email,
  });

  const { users = [], pagination = { total: 0, page: 1, pages: 1 } } = data || {};
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || u.phoneNumber.includes(searchTerm);
    return matchesSearch && (filterStatus === "all" || u.kycStatus === filterStatus);
  });

  const globalMetrics = myStatsData?.metrics || { signUpsAllTime: 0 };
  const globalPortfolio = myStatsData?.portfolio || { loansActive: 0, loansOverdue: 0 };

  const statCards = [
    { label: "Total", value: globalMetrics.signUpsAllTime, icon: User, accent: "text-primary" },
    { label: "Verified", value: users.filter(u => u.kycStatus === "verified").length, icon: CheckCircle2, accent: "text-emerald-600" },
    { label: "Active Loans", value: globalPortfolio.loansActive, icon: DollarSign, accent: "text-warning" },
    { label: "Overdue", value: globalPortfolio.loansOverdue, icon: AlertCircle, accent: "text-destructive" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">My Portfolio</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Track all onboarded customers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border shadow-sm">
            <CardContent className="p-3 text-center">
              <stat.icon className={cn("h-4 w-4 mx-auto mb-1", stat.accent)} />
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Directory */}
      <Card>
        <CardHeader className="pb-3 px-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Customer Directory</CardTitle>
              <CardDescription className="text-xs">All customers under your code</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-[220px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="pl-8 h-9 bg-muted/50 border-0 text-sm" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[110px] h-9 bg-muted/50 border-0 text-xs">
                  <Filter className="h-3 w-3 mr-1" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="mismatch">Mismatch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4">
          {isError ? (
            <div className="p-6 text-center text-destructive bg-destructive/5 rounded-xl">
              <p className="font-semibold text-sm">Failed to load</p>
              <p className="text-xs mt-1">{(error as Error)?.message}</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10">
              <User className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{searchTerm ? "No results" : "No customers yet"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((customer, index) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-muted/30 hover:bg-muted/50 rounded-xl p-3 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-pink flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
                        {customer.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{customer.fullName}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{customer.phoneNumber}</span>
                          <span className="hidden sm:flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{customer.region}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {getKycBadge(customer.kycStatus)}
                      <div className="hidden sm:block">{getLoanBadge(customer.loanStatus, customer.loanAmount)}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <span className="text-xs text-muted-foreground">Page {pagination.page}/{pagination.pages}</span>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1} className="h-8">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={pagination.page >= pagination.pages} className="h-8">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
