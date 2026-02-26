import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, Eye, Ban, CheckCircle, UserPlus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CampaignGenerationModal } from "@/components/users/CampaignGenerationModal";

interface User {
  id: string;
  phone: string;
  name: string;
  tier: string;
  totalBorrowed: number;
  activeLoan: boolean;
  status: "active" | "blocked";
  joinedAt: string;
}



const tierColors: Record<string, string> = {
  L1: "bg-muted text-muted-foreground border-muted",
  L2: "bg-info/10 text-info border-info/20",
  L3: "bg-primary/10 text-primary border-primary/20",
  L4: "bg-success/10 text-success border-success/20",
  L5: "bg-warning/10 text-warning border-warning/20",
};

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const navigate = useNavigate();

  const { data: responseData } = useQuery({
    queryKey: ["users", page, filter, searchQuery],
    queryFn: async () => {
      const params: any = { page, limit: 10 };
      if (searchQuery) params.search = searchQuery;
      if (filter !== "all") {
        if (filter.startsWith("L")) params.tier = filter;
        else params.status = filter;
      }
      const res = await api.get("/api/admin/users", { params });
      return res.data;
    },
    // Keep previous data while fetching new page for smoother transition
    placeholderData: (previousData) => previousData,
  });

  const rawUsers = responseData?.users ?? [];
  const totalPages = responseData?.pagination?.pages ?? 1;

  // Map API fields to UI interface
  const users: User[] = rawUsers.map((u: any) => ({
    id: u._id,
    phone: u.msisdn,
    name: u.fullName,
    tier: `L${u.currentTier ?? 1}`, // Default to L1 if missing
    totalBorrowed: u.totalLoansRepaid ?? 0, 
    activeLoan: Boolean(u.hasActiveLoan || u.activeLoan), 
    status: u.isBlocked ? "blocked" : "active",
    joinedAt: u.createdAt,
  }));

  // No client-side filtering needed anymore as API handles it
  const filteredUsers = users;

  // Helper function to calculate visible page numbers
  const getVisiblePages = (currentPage: number, total: number, maxVisible: number = 5): number[] => {
    const visibleCount = Math.min(maxVisible, total);
    let startPage = 1;

    if (total > maxVisible) {
      const middleOffset = Math.floor(visibleCount / 2);
      startPage = Math.max(1, currentPage - middleOffset);

      if (startPage + visibleCount - 1 > total) {
        startPage = Math.max(1, total - visibleCount + 1);
      }
    }

    return Array.from({ length: visibleCount }, (_, i) => startPage + i);
  };


  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground mt-1">
              Manage your platform users and their accounts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setIsCampaignModalOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Marketing Campaign
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="L1">Tier L1</SelectItem>
                <SelectItem value="L2">Tier L2</SelectItem>
                <SelectItem value="L3">Tier L3</SelectItem>
                <SelectItem value="L4">Tier L4</SelectItem>
                <SelectItem value="L5">Tier L5</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-card rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">
                    Phone
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">
                    Tier
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">
                    Total Borrowed
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">
                    Active Loan
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr
                    key={user.id}
                    onClick={() => navigate(`/users/${user.id}`)}
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors duration-150 animate-fade-in cursor-pointer"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {user.phone}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {user.name}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={cn("font-medium", tierColors[user.tier])}
                      >
                        {user.tier}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {user.totalBorrowed.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-medium",
                          user.activeLoan
                            ? "bg-info/10 text-info border-info/20"
                            : "bg-muted text-muted-foreground border-muted"
                        )}
                      >
                        {user.activeLoan ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-medium capitalize",
                          user.status === "active"
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        )}
                      >
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/users/${user.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredUsers.length} users (Page {page} of {totalPages})
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {getVisiblePages(page, totalPages).map((pNum) => (
                  <Button
                    key={pNum}
                    size="sm"
                    variant={page === pNum ? "default" : "outline"}
                    className={page === pNum ? "bg-primary text-primary-foreground" : ""}
                    onClick={() => setPage(pNum)}
                  >
                    {pNum}
                  </Button>
                ))}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => navigate(`/users/${user.id}`)}
              className="bg-card rounded-xl p-4 shadow-sm border border-border space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-foreground">{user.name}</h3>
                  <p className="text-sm text-muted-foreground">{user.phone}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize",
                    user.status === "active"
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  )}
                >
                  {user.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Tier</span>
                  <Badge
                    variant="outline"
                    className={cn("w-fit", tierColors[user.tier])}
                  >
                    {user.tier}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Borrowed</span>
                  <span className="font-medium text-foreground">
                    {user.totalBorrowed.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Active Loan:</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-medium",
                      user.activeLoan
                        ? "bg-info/10 text-info border-info/20"
                        : "bg-muted text-muted-foreground border-muted"
                    )}
                  >
                    {user.activeLoan ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
              
              <div className="pt-3 border-t border-border flex justify-between items-center">
                <Badge
                  variant="outline"
                  className={cn(
                    "font-medium capitalize",
                    user.status === "active"
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  )}
                >
                  {user.status}
                </Badge>
                <Link to={`/users/${user.id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
          {/* Mobile Pagination */}
          <div className="flex items-center justify-between pt-2">
            <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
               Page {page} of {totalPages}
            </span>
             <Button 
                variant="outline" 
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
      
      <CampaignGenerationModal 
        open={isCampaignModalOpen} 
        onOpenChange={setIsCampaignModalOpen} 
      />
    </DashboardLayout>
  );
}
