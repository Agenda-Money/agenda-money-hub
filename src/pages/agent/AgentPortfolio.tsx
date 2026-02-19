import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, User, Phone, MapPin, DollarSign, AlertCircle, CheckCircle2, Clock, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OnboardedUser {
  id: string;
  fullName: string;
  ghanaCardNumber: string;
  phoneNumber: string;
  region: string;
  kycStatus: string; // The API returns lowercase string, could be "verified", "pending", etc.
  loanStatus: string; // The API returns "none" or other statuses
  loanAmount?: number;
  onboardedDate: string;
  lastPayment?: string;
}

interface PortfolioResponse {
  users: OnboardedUser[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const getKycBadge = (status: string) => {
  switch (status) {
    case "verified":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case "mismatch":
      return (
        <Badge className="bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400">
          <AlertCircle className="h-3 w-3 mr-1" />
          Mismatch
        </Badge>
      );
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

const getLoanStatusBadge = (status: string, amount?: number) => {
  const baseClasses = "text-xs font-medium";
  switch (status) {
    case "active":
      return (
        <div className="text-right">
          <p className="font-bold text-foreground">₵{amount || 0}</p>
          <Badge className={cn(baseClasses, "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400")}>
            Active
          </Badge>
        </div>
      );
    case "repaid":
      return (
        <div className="text-right">
          <p className="font-bold text-foreground">₵{amount || 0}</p>
          <Badge className={cn(baseClasses, "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400")}>
            Repaid
          </Badge>
        </div>
      );
    case "overdue":
      return (
        <div className="text-right">
          <p className="font-bold text-foreground">₵{amount || 0}</p>
          <Badge className={cn(baseClasses, "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400")}>
            Overdue
          </Badge>
        </div>
      );
    default:
      return (
        <div className="text-right">
          <p className="text-sm text-muted-foreground">—</p>
          <Badge variant="secondary" className={baseClasses}>No Loan</Badge>
        </div>
      );
  }
};

export default function AgentPortfolio() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery<PortfolioResponse>({
    queryKey: ["agent-portfolio", user?.email, page],
    queryFn: async () => {
      try {
        const res = await api.get("/api/agents/portfolio", {
          params: { page, limit: 10 }
        });
        
        console.log(`Portfolio Response (Page ${page}):`, res.data);

        let rawDirectory: Record<string, unknown>[] = [];
        let pagination = { total: 0, page: 1, pages: 1 };

        // Robust parsing:
        // Case 1: Standard response { success: true, data: { directory: [], pagination: {} } }
        if (res.data?.data?.directory) {
          rawDirectory = res.data.data.directory;
          pagination = res.data.data.pagination || pagination;
        }
        // Case 2: Direct response { directory: [], pagination: {} }
        else if (res.data?.directory) {
          rawDirectory = res.data.directory;
          pagination = res.data.pagination || pagination;
        }
        // Case 3: Old/Array response { data: [] } or just []
        else if (Array.isArray(res.data?.data)) {
          rawDirectory = res.data.data;
          pagination = { total: rawDirectory.length, page: 1, pages: 1 };
        }
        
        const mappedUsers = rawDirectory.map((u) => ({
          id: String(u._id ?? u.id ?? ""),
          fullName: u.fullName as string,
          ghanaCardNumber: u.ghanaCardNumber as string,
          phoneNumber: u.phoneNumber as string,
          region: u.region as string,
          kycStatus: (u.kycStatus as string)?.toLowerCase() || "pending",
          loanStatus: (u.loanStatus as string)?.toLowerCase() || "none",
          loanAmount: u.loanAmount as number | undefined,
          onboardedDate: u.onboardedDate as string,
          lastPayment: u.lastPayment as string | undefined,
        }));

        return { users: mappedUsers, pagination };
      } catch (err: any) {
        console.error("Portfolio API Error Full Object:", err);
        console.error("Portfolio API Error Response Data:", err.response?.data);
        console.error("Portfolio API Error Status:", err.response?.status);
        throw err;
      }
    },
    enabled: !!user,
  });

  const { users = [], pagination = { total: 0, page: 1, pages: 1 } } = data || {};
  console.log("Current Pagination State:", pagination);

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.ghanaCardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phoneNumber.includes(searchTerm);
    
    const matchesFilter = filterStatus === "all" || u.kycStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: users.length,
    verified: users.filter(u => u.kycStatus === "verified").length,
    activeLoans: users.filter(u => u.loanStatus === "active").length,
    overdue: users.filter(u => u.loanStatus === "overdue").length,
  };

  const statCards = [
    { label: "Total Customers", value: stats.total, icon: User, color: "from-blue-500 to-blue-600" },
    { label: "KYC Verified", value: stats.verified, icon: CheckCircle2, color: "from-emerald-500 to-emerald-600" },
    { label: "Active Loans", value: stats.activeLoans, icon: DollarSign, color: "from-amber-500 to-orange-500" },
    { label: "Overdue", value: stats.overdue, icon: AlertCircle, color: "from-red-500 to-red-600" },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Portfolio</h1>
        <p className="text-muted-foreground mt-1">Track all customers you've onboarded</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-md overflow-hidden">
            <div className={cn("h-1 bg-gradient-to-r", stat.color)} />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className={cn("p-2 sm:p-2.5 rounded-xl bg-gradient-to-br text-white", stat.color)}>
                  <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Search & Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Customer Directory</CardTitle>
                <CardDescription>All customers under your agent code</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-muted/50 border-0"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px] bg-muted/50 border-0">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="mismatch">Mismatch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isError ? (
              <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-100">
                <p className="font-semibold">Failed to load portfolio</p>
                <p className="text-sm mt-1 text-red-400">{(error as Error)?.message || "Something went wrong"}</p>
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {searchTerm ? "No customers found matching your search" : "No onboarded customers yet"}
                </p>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-3">Customer</div>
                  <div className="col-span-2">Phone</div>
                  <div className="col-span-2">Region</div>
                  <div className="col-span-2">KYC Status</div>
                  <div className="col-span-2 text-right">Loan</div>
                  <div className="col-span-1 text-right">Date</div>
                </div>

                {/* Customer Cards/Rows */}
                {filteredUsers.map((customer, index) => (
                  <motion.div
                    key={customer.id}
                    variants={itemVariants}
                    custom={index}
                    whileHover={{ scale: 1.01 }}
                    className="bg-muted/30 hover:bg-muted/50 rounded-xl p-4 transition-all cursor-pointer"
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-pink flex items-center justify-center text-primary-foreground font-bold text-sm">
                            {customer.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{customer.fullName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{customer.ghanaCardNumber}</p>
                          </div>
                        </div>
                        {getKycBadge(customer.kycStatus)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phoneNumber}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {customer.region}
                          </span>
                        </div>
                        {getLoanStatusBadge(customer.loanStatus, customer.loanAmount)}
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-pink flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                          {customer.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{customer.fullName}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">{customer.ghanaCardNumber}</p>
                        </div>
                      </div>
                      <div className="col-span-2 text-sm text-muted-foreground">
                        {customer.phoneNumber}
                      </div>
                      <div className="col-span-2 text-sm text-muted-foreground">
                        {customer.region}
                      </div>
                      <div className="col-span-2">
                        {getKycBadge(customer.kycStatus)}
                      </div>
                      <div className="col-span-2">
                        {getLoanStatusBadge(customer.loanStatus, customer.loanAmount)}
                      </div>
                      <div className="col-span-1 text-right text-xs text-muted-foreground">
                        {new Date(customer.onboardedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
