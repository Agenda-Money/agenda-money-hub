import { useState, useEffect } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, Clock, X, ZoomIn, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/contexts/AuthContext";
import { cn, deduplicateWords } from "@/lib/utils";
import { getPendingKycUsers, getFailedKycUsers, verifyUserKyc, failUserKyc, restoreUserKyc } from "@/lib/api";
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
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const { canWrite } = useAuth();
  const queryClient = useQueryClient();
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";


  const { data: pendingUsers, refetch, isLoading: isPendingUsersLoading } = useQuery({
    queryKey: ["pending-kyc-users"],
    queryFn: async () => {
      const res = await getPendingKycUsers(1000);
      const users = res.data || res || [];
      return Array.isArray(users) ? users : [];
    },
  });

  const { data: failedUsers, refetch: refetchFailed, isLoading: isFailedUsersLoading } = useQuery({
    queryKey: ["failed-kyc-users"],
    queryFn: async () => {
      const res = await getFailedKycUsers(1, 1000);
      // Depending on the backend mapping, the payload might be inside data.data
      const users = res.data?.data || res.data || res || [];
      return Array.isArray(users) ? users : [];
    },
  });

  // Approve mutation
  const { mutate: approveUser, isPending: isApproving } = useMutation({
    mutationFn: ({ msisdn, reason }: { msisdn: string; reason: string }) => verifyUserKyc(msisdn, reason),
    onSuccess: () => {
      toast.success("User Verified! 🎉", {
        description: "User can now apply for loans.",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-kyc-users"] });
      queryClient.invalidateQueries({ queryKey: ["pending-users-count"] });
      setSelectedUser(null);
      refetch();
      refetchFailed();
    },
    onError: (error: any) => {
      toast.error("Approval Failed", {
        description: error.response?.data?.message || "Could not approve user",
      });
    },
  });

  // Reject mutation
  const { mutate: rejectUser, isPending: isRejecting } = useMutation({
    mutationFn: ({ msisdn, reason }: { msisdn: string; reason: string }) => failUserKyc(msisdn, reason),
    onSuccess: () => {
      toast.success("User KYC Rejected", {
        description: "The user has been moved to the failed/rejected queue and pending loans rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-kyc-users"] });
      queryClient.invalidateQueries({ queryKey: ["pending-users-count"] });
      setShowRejectPrompt(false);
      setRejectReason("");
      setSelectedUser(null);
      refetch();
      refetchFailed();
    },
    onError: (error: any) => {
      toast.error("Rejection Failed", {
        description: error.response?.data?.message || "Could not reject user KYC",
      });
    },
  });

  // Restore mutation
  const { mutate: restoreUser, isPending: isRestoring } = useMutation({
    mutationFn: ({ msisdn, reason }: { msisdn: string; reason: string }) => restoreUserKyc(msisdn, reason),
    onSuccess: () => {
      toast.success("User KYC Restored", {
        description: "The user has been moved back to the pending queue.",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-kyc-users"] });
      queryClient.invalidateQueries({ queryKey: ["failed-kyc-users"] });
      setSelectedUser(null);
      refetch();
      refetchFailed();
    },
    onError: (error: any) => {
      toast.error("Restoration Failed", {
        description: error.response?.data?.message || "Could not restore user KYC",
      });
    },
  });

  // WebSocket integration for real-time updates
  useSocket(wsUrl, (message) => {
    if (message?.type === "NEW_APPLICATION") {
      refetch();
      refetchFailed();
    }
  });

  const searchFilteredUsers = (pendingUsers || []).filter((user: any) =>
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.msisdn?.includes(searchTerm)
  );

  const searchFilteredFailedUsers = (failedUsers || []).filter((user: any) =>
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.msisdn?.includes(searchTerm)
  );

  const pendingList = searchFilteredUsers;
  const failedList = searchFilteredFailedUsers;

  const renderUserList = (users: any[], emptyMessage: string, emptyIcon: React.ReactNode, isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="space-y-4 animate-pulse">
           <div className="h-32 bg-muted rounded-xl" />
           <div className="h-32 bg-muted rounded-xl" />
           <div className="h-32 bg-muted rounded-xl" />
        </div>
      );
    }
    
    if (users.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            {emptyIcon}
            <h3 className="text-lg font-semibold text-foreground">All caught up!</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {emptyMessage}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {users.map((user: any, index: number) => (
          <Card
            key={user._id}
            className="hover:shadow-lg transition-all cursor-pointer animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => setSelectedUser(user)}
          >
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">{deduplicateWords(user.fullName)}</CardTitle>
                    {(user.kycStatus === 'FAILED' || user.kycStatus === 'REJECTED') && (
                      <Badge className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30 whitespace-nowrap">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {user.kycStatus}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">📱 {user.msisdn}</p>
                </div>
                <Button size="sm" className={cn("w-full sm:w-auto", user.kycStatus === 'FAILED' || user.kycStatus === 'REJECTED' ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700")}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Review
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* User Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Region</p>
                  <p className="font-medium">{user.region || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tier</p>
                  <p className="font-medium">L{user.currentTier || 1}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Agent Code</p>
                  <p className="font-mono text-sm font-medium">{user.referredByNodeCode}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Employment</p>
                  <p className="font-medium">{user.employmentStatus || "N/A"}</p>
                </div>
              </div>

              {/* Image Preview */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-3 font-medium">Documents</p>
                <div className="flex gap-3">
                  {user.selfieUrl && (
                    <button
                      type="button"
                      className="w-20 h-20 rounded border-2 border-border bg-muted overflow-hidden group cursor-pointer relative"
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
                      className="w-20 h-20 rounded border-2 border-border bg-muted overflow-hidden group cursor-pointer relative"
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
                      className="w-20 h-20 rounded border-2 border-border bg-muted overflow-hidden group cursor-pointer relative"
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
    );
  };

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
            {pendingList.length} pending
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

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">
              Pending KYC ({pendingList.length})
            </TabsTrigger>
            <TabsTrigger value="failed">
              Failed/Rejected KYC ({failedList.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="mt-4">
            {renderUserList(pendingList, "No pending KYC verifications at the moment", <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />, isPendingUsersLoading)}
          </TabsContent>
          
          <TabsContent value="failed" className="mt-4">
            {renderUserList(failedList, "No failed KYC verifications found", <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />, isFailedUsersLoading)}
          </TabsContent>
        </Tabs>

        {/* KYC Review Details Modal */}
        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedUser && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">KYC Verification Review</DialogTitle>
                  <DialogDescription>
                    Review and approve this user's identity documents
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* User Profile Header */}
                  <div className="bg-primary/5 rounded-xl p-4 sm:p-5 border border-primary/10">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl sm:text-2xl shadow-inner shrink-0">
                        {selectedUser.fullName?.split(' ').map((n: any) => n[0]).join('').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-xl sm:text-2xl font-black text-foreground truncate">{deduplicateWords(selectedUser.fullName)}</h2>
                        <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm">
                          <span className="flex items-center tracking-tight">📱 {selectedUser.msisdn}</span>
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
                  {canWrite && (
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                      {selectedUser.kycStatus === 'FAILED' || selectedUser.kycStatus === 'REJECTED' ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            const reason = prompt("Describe the reason for restoring this user to pending (required):");
                            if (reason?.trim()) restoreUser({ msisdn: selectedUser.msisdn, reason: reason.trim() });
                          }}
                          disabled={isRestoring}
                          className="flex-1 h-12 sm:h-10 text-amber-600 border-amber-600 hover:bg-amber-50 font-bold"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Restore to Pending
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => setShowRejectPrompt(true)}
                          disabled={isRejecting || isApproving}
                          className="flex-1 h-12 sm:h-10 text-red-600 border-red-600 hover:bg-red-50 font-bold"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      )}
                      {selectedUser.kycStatus !== 'VERIFIED' && (
                        <Button
                          onClick={() => {
                            approveUser({ msisdn: selectedUser.msisdn, reason: "Identity verified via admin dashboard" });
                          }}
                          disabled={isApproving}
                          className="flex-1 h-12 sm:h-10 bg-green-600 hover:bg-green-700 text-white font-bold"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {isApproving ? "Verifying..." : "Verify KYC"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

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

        {/* Reject Reason Modal */}
        <Dialog open={showRejectPrompt} onOpenChange={setShowRejectPrompt}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject KYC Application</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this KYC. Pending loans will also be rejected.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="e.g. Blurry ID, Mismatched names..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRejectPrompt(false)} disabled={isRejecting}>
                  Cancel
                </Button>
                 <Button 
                   variant="destructive" 
                   onClick={() => rejectUser({ msisdn: selectedUser?.msisdn, reason: rejectReason || "Rejected by Admin" })}
                   disabled={isRejecting || !rejectReason.trim() || !canWrite}
                 >
                   {isRejecting ? "Rejecting..." : "Confirm Rejection"}
                 </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
