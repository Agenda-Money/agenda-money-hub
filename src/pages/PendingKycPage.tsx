import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, Clock, X, ZoomIn } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/hooks/useSocket";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PendingKycPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

  const { data: pendingUsers, refetch, isLoading: isPendingUsersLoading } = useQuery({
    queryKey: ["pending-kyc-users"],
    queryFn: async () => {
      const res = await api.get("/api/admin/users/pending?limit=1000");
      const users = res.data?.data || res.data || [];
      return Array.isArray(users) ? users : [];
    },
  });

  // Approve mutation
  const { mutate: approveUser, isPending: isApproving } = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.patch(`/api/admin/users/approve/${userId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("User Verified! 🎉", {
        description: "User can now apply for loans.",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-kyc-users"] });
      queryClient.invalidateQueries({ queryKey: ["pending-users-count"] });
      setSelectedUser(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error("Approval Failed", {
        description: error.response?.data?.message || "Could not approve user",
      });
    },
  });

  // WebSocket integration for real-time updates
  useSocket(wsUrl, (message) => {
    if (message?.type === "NEW_APPLICATION") {
      refetch();
    }
  });

  const filteredUsers = (pendingUsers || []).filter((user: any) =>
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.msisdn?.includes(searchTerm)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">KYC Verification Queue</h1>
            <p className="text-muted-foreground mt-1">
              Review and approve pending user identities
            </p>
          </div>
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-lg font-semibold px-4 py-2 w-fit">
            {filteredUsers.length} pending
          </Badge>
        </div>

        {/* Search */}
        <Card>
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
        </Card>

        {/* Pending Users List */}
        {isPendingUsersLoading ? (
          <div className="space-y-4 animate-pulse">
             <div className="h-32 bg-muted rounded-xl" />
             <div className="h-32 bg-muted rounded-xl" />
             <div className="h-32 bg-muted rounded-xl" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">All caught up!</h3>
              <p className="text-sm text-muted-foreground mt-2">
                No pending KYC verifications at the moment
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user: any, index: number) => (
              <Card
                key={user._id}
                className="hover:shadow-lg transition-all cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => setSelectedUser(user)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{user.fullName}</CardTitle>
                        <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">📱 {user.msisdn}</p>
                    </div>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* User Details */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Region</p>
                      <p className="font-medium text-sm">{user.region || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tier</p>
                      <p className="font-medium text-sm">L{user.currentTier || 1}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Agent Code</p>
                      <p className="font-mono text-xs font-medium">{user.referredByNodeCode}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Employment</p>
                      <p className="font-medium text-sm">{user.employmentStatus || "N/A"}</p>
                    </div>
                  </div>

                  {/* Image Preview */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-3 font-medium">Documents</p>
                    <div className="flex flex-wrap gap-2">
                      {user.selfieUrl && (
                        <button
                          type="button"
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded border-2 border-border bg-muted overflow-hidden group cursor-pointer relative"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomedImage(user.selfieUrl);
                          }}
                        >
                          <img
                            src={user.selfieUrl}
                            alt="Selfie"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                            <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      )}
                      {user.ghanaCardFrontUrl && (
                        <button
                          type="button"
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded border-2 border-border bg-muted overflow-hidden group cursor-pointer relative"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomedImage(user.ghanaCardFrontUrl);
                          }}
                        >
                          <img
                            src={user.ghanaCardFrontUrl}
                            alt="ID Front"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                            <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      )}
                      {user.ghanaCardBackUrl && (
                        <button
                          type="button"
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded border-2 border-border bg-muted overflow-hidden group cursor-pointer relative"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomedImage(user.ghanaCardBackUrl);
                          }}
                        >
                          <img
                            src={user.ghanaCardBackUrl}
                            alt="ID Back"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                            <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* KYC Review Details Modal */}
        {selectedUser && (
          <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl">KYC Verification Review</DialogTitle>
                <DialogDescription>
                  Review and approve this user's identity documents
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* User Info Section */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-2 min-w-0">
                      <h3 className="font-semibold text-lg break-words">{selectedUser.fullName}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="break-all">Phone: {selectedUser.msisdn}</span>
                        <span className="break-all">Joined: {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' }) : "N/A"}</span>
                      </div>
                    </div>
                    <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30 w-fit">
                      {selectedUser.kycStatus}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-3 border-t border-border text-sm">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">DOB</p>
                      <p className="font-medium break-words">
                        {selectedUser.dob ? new Date(selectedUser.dob).toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' }) : "N/A"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">Gender</p>
                      <p className="font-medium break-words">{selectedUser.gender || "N/A"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">Region</p>
                      <p className="font-medium break-words">{selectedUser.region || "N/A"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">ID Number</p>
                      <p className="font-mono font-medium text-xs break-all">{selectedUser.ghanaCardNumber || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Identity Documents - Large View */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Identity Documents</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Selfie */}
                    {selectedUser.selfieUrl && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Selfie Photo</p>
                        <button
                          type="button"
                          className="aspect-square bg-muted rounded-lg overflow-hidden border-2 border-border cursor-pointer hover:border-primary transition-colors group"
                          onClick={() => setZoomedImage(selectedUser.selfieUrl)}
                        >
                          <img
                            src={selectedUser.selfieUrl}
                            alt="Selfie"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </button>
                        <p className="text-xs text-muted-foreground text-center">Click to zoom</p>
                      </div>
                    )}

                    {/* Ghana Card Front */}
                    {selectedUser.ghanaCardFrontUrl && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Card Front</p>
                        <button
                          type="button"
                          className="aspect-square bg-muted rounded-lg overflow-hidden border-2 border-border cursor-pointer hover:border-primary transition-colors group"
                          onClick={() => setZoomedImage(selectedUser.ghanaCardFrontUrl)}
                        >
                          <img
                            src={selectedUser.ghanaCardFrontUrl}
                            alt="Ghana Card Front"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </button>
                        <p className="text-xs text-muted-foreground text-center">Click to zoom</p>
                      </div>
                    )}

                    {/* Ghana Card Back */}
                    {selectedUser.ghanaCardBackUrl && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Card Back</p>
                        <button
                          type="button"
                          className="aspect-square bg-muted rounded-lg overflow-hidden border-2 border-border cursor-pointer hover:border-primary transition-colors group"
                          onClick={() => setZoomedImage(selectedUser.ghanaCardBackUrl)}
                        >
                          <img
                            src={selectedUser.ghanaCardBackUrl}
                            alt="Ghana Card Back"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </button>
                        <p className="text-xs text-muted-foreground text-center">Click to zoom</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Info */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-medium">{selectedUser.address || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Accommodation</p>
                      <p className="font-medium">{selectedUser.accommodationType || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Employment Status</p>
                      <p className="font-medium">{selectedUser.employmentStatus || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly Income</p>
                      <p className="font-medium">{selectedUser.monthlyIncome || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedUser(null)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => approveUser(selectedUser._id)}
                    disabled={isApproving}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isApproving ? "Approving..." : "Approve Identity"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Image Zoom Modal */}
        {zoomedImage && (
          <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Image Preview</DialogTitle>
              </DialogHeader>
              <div className="w-full">
                <img
                  src={zoomedImage}
                  alt="Zoomed view"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
