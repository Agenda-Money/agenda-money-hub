import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, Eye, Filter, Download, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { getAdminSensitiveAuditLogs } from "@/lib/api";
import { cn } from "@/lib/utils";

const actionBadgeStyles: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  "KYC_FAILED": { variant: "destructive", className: "bg-destructive/10 text-destructive border-destructive/20 font-bold" },
  "KYC_VERIFIED": { variant: "default", className: "bg-success/10 text-success border-success/20 font-bold" },
  "USER_BLOCKED": { variant: "destructive", className: "bg-destructive/10 text-destructive border-destructive/20 font-bold" },
  "USER_UNBLOCKED": { variant: "default", className: "bg-success/10 text-success border-success/20 font-bold" },
  "LOAN_REJECTED": { variant: "secondary", className: "bg-warning/10 text-warning border-warning/20 font-bold" },
  "LOAN_APPROVED": { variant: "default", className: "bg-success/10 text-success border-success/20 font-bold" },
  "LOAN_APPROVE": { variant: "default", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold" },
  "LOAN_FORCE_APPROVED": { variant: "default", className: "bg-purple-500/10 text-purple-600 border-purple-500/20 font-bold" },
  "USER_EDITED": { variant: "outline", className: "bg-primary/10 text-primary border-primary/20 font-bold" },
};

const RenderStateData = ({ data, isAfter }: { data: any, isAfter?: boolean }) => {
  if (!data || Object.keys(data).length === 0) return <span className="text-muted-foreground italic text-[11px] font-bold">No data recorded</span>;
  
  return (
    <div className="space-y-3">
      {Object.entries(data).map(([key, value]) => {
        // Skip internal Mongoose keys
        if (key.startsWith('_')) return null;

        return (
          <div key={key} className="flex flex-col gap-1 border-b border-border/10 last:border-0 pb-2 last:pb-0">
            <span className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-wider">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            
            {typeof value === 'object' && value !== null ? (
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {Object.entries(value).map(([subK, subV]) => (
                  subV === true ? (
                    <Badge key={subK} variant="secondary" className="px-2 py-0.5 text-[10px] bg-destructive/10 text-destructive border-destructive/20 font-bold uppercase tracking-tight">
                      {subK} Disabled
                    </Badge>
                  ) : null
                ))}
                {!Object.values(value).some(v => v === true) && (
                  <Badge variant="secondary" className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase">
                    All Access Active
                  </Badge>
                )}
              </div>
            ) : (
              <span className={cn(
                "text-[13px] font-bold tracking-tight",
                (value === 'FAILED' || value === 'REJECTED') ? "text-destructive" :
                (value === 'VERIFIED' || value === 'APPROVED') ? "text-emerald-600" : 
                isAfter ? "text-foreground" : "text-muted-foreground"
              )}>
                {String(value)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function AuditLogs() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: logsResponse, isLoading } = useQuery({
    queryKey: ["audit-logs", page, debouncedSearch],
    queryFn: async () => {
      const res = await getAdminSensitiveAuditLogs({ 
        page, 
        limit, 
        search: debouncedSearch 
      });
      return res;
    }
  });

  const logs = Array.isArray(logsResponse?.logs) ? logsResponse.logs : [];
  const totalLogs = logsResponse?.total || logs.length;
  const totalPages = Math.ceil(totalLogs / limit);



  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24 lg:pb-6">
        {/* Page Title & Subtitle */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground font-medium">Monitor administrative actions and security events.</p>
        </div>



        {/* Table Section */}
        <Card className="rounded-[1.5rem] border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-full overflow-hidden">
                <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary shrink-0" />
                  Security Registry
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground/70 leading-relaxed break-words">
                  Comprehensive ledger of all sensitive admin operations.
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search logs..."
                    className="pl-9 h-10 border-border/60 font-bold text-sm bg-background/50 focus:bg-background transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon" className="h-10 w-10 border-border/60 hover:bg-background">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-10 w-10 border-border/60 hover:bg-background text-primary">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                    <TableHead className="font-bold text-xs uppercase tracking-wider px-6 py-4">Time</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider px-6 py-4">Admin</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider px-6 py-4">Action</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider px-6 py-4">Target</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider px-6 py-4 text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [1, 2, 3].map((i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} className="p-6">
                          <div className="h-12 bg-muted/30 animate-pulse rounded-xl" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-24 text-center">
                        <p className="text-muted-foreground font-bold">No matching audit logs found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log: any, index) => {
                      const style = actionBadgeStyles[log.action] || { variant: "outline", className: "font-bold" };
                      return (
                        <TableRow 
                          key={log._id || log.id}
                          className="group border-b border-border/40 hover:bg-muted/20 transition-colors animate-in fade-in fill-mode-both"
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <TableCell className="px-6 py-5">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-sm text-foreground">
                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {new Date(log.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xs shadow-inner">
                                {(log.adminName || "SY").split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-foreground">
                                  {log.adminName || "System Admin"}
                                </span>
                                <span className="text-[10px] font-medium text-muted-foreground/60 leading-none">
                                  {log.adminMsisdn || log.adminEmail || "Internal"}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-5">
                            <Badge variant={style.variant} className={cn("px-2.5 py-1 text-[11px]", style.className)}>
                              {log.action}
                            </Badge>
                            {log.targetMeta?.loanStatus && (
                              <Badge variant="outline" className="ml-2 px-1.5 py-0.5 text-[9px] font-black border-primary/20 text-primary uppercase tracking-tighter">
                                {log.targetMeta.loanStatus}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-5">
                            {log.targetName ? (
                              <div className="flex flex-col gap-0.5">
                                <p 
                                  className="text-sm font-bold text-foreground truncate max-w-[200px] hover:text-primary cursor-pointer transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (log.targetType === 'loan' && (log.targetId || log.targetUserId)) {
                                      navigate(`/loans?search=${log.targetId || log.targetUserId}`);
                                    }
                                  }}
                                >
                                  {log.targetName}
                                </p>
                                <p className="text-[11px] font-mono font-medium text-muted-foreground/80">{log.targetUserMsisdn || log.targetId || "—"}</p>
                              </div>
                            ) : (
                              <Badge variant="outline" className="bg-muted font-medium px-2 py-0.5 text-xs text-muted-foreground max-w-[140px] truncate">
                                {log.targetUserMsisdn || log.targetId || log.targetUserId || "System"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-5 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="font-bold text-[11px] uppercase tracking-wider hover:bg-primary/10 hover:text-primary transition-all rounded-lg border border-border/40 px-4"
                              onClick={() => setSelectedLog(log)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border/40">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="p-4 space-y-3">
                    <div className="h-6 w-1/3 bg-muted/30 animate-pulse rounded" />
                    <div className="h-20 bg-muted/30 animate-pulse rounded-xl" />
                  </div>
                ))
              ) : logs.length === 0 ? (
                <div className="py-20 text-center px-6">
                  <p className="text-muted-foreground font-bold">No matching audit logs found.</p>
                </div>
              ) : (
                logs.map((log: any, index) => {
                  const style = actionBadgeStyles[log.action] || { variant: "outline", className: "font-bold" };
                  return (
                    <div 
                      key={log._id || log.id}
                      className="p-5 space-y-4 active:bg-muted/30 transition-colors"
                      onClick={() => setSelectedLog(log)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="font-bold text-base text-foreground">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">
                            {new Date(log.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>
                        <Badge variant={style.variant} className={cn("px-2.5 py-0.5 text-[10px] font-black", style.className)}>
                          {log.action}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                          {(log.adminName || "SY").split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-foreground truncate">
                            {log.adminName || "System Admin"}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground/60 truncate">
                            {log.adminMsisdn || log.adminEmail || "Internal"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 flex justify-between items-center">
                            Target
                          </span>
                          <span className="text-sm font-bold text-foreground truncate max-w-[150px] hover:text-primary active:text-primary transition-all">
                            {log.targetName || log.targetUserMsisdn || log.targetId || "System"}
                          </span>
                          {log.targetMeta?.loanStatus && (
                            <Badge variant="outline" className="mt-1 px-1.5 py-0.25 text-[8px] font-black border-primary/20 text-primary uppercase tracking-tighter w-fit">
                              {log.targetMeta.loanStatus}
                            </Badge>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="font-bold text-[10px] h-8 px-4 uppercase tracking-wider border-border/60"
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>

          {/* Footer */}
          <div className="p-6 bg-muted/10 border-t flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalLogs)} of {totalLogs} entries
            </span>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ‹
              </Button>
              <div className="flex items-center gap-1 px-2">
                <span className="text-xs font-bold">{page}</span>
                <span className="text-xs text-muted-foreground">/</span>
                <span className="text-xs text-muted-foreground">{totalPages || 1}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0" 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                ›
              </Button>
            </div>
          </div>
        </Card>

        {/* Details Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4">
              <DialogTitle className="text-2xl font-bold">Audit Log Details</DialogTitle>
              <DialogDescription className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Detailed log overview and state transitions.</DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-8 py-4">
                <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Action</span>
                    <Badge variant={actionBadgeStyles[selectedLog.action]?.variant || "outline"} className={cn("px-3 py-1 font-bold", actionBadgeStyles[selectedLog.action]?.className)}>
                      {selectedLog.action}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Date & Time</span>
                    <span className="font-bold text-foreground">
                      {new Date(selectedLog.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(selectedLog.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Admin Involved</span>
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-[10px]">
                        {(selectedLog.adminName || "SY").split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground leading-none">{selectedLog.adminName}</p>
                        <p className="text-[10px] font-semibold text-muted-foreground/80 mt-1">{selectedLog.adminMsisdn || selectedLog.adminId || "Internal System"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Network Metadata</span>
                    <p className="text-sm font-bold text-foreground">{selectedLog.ipAddress || "::1"}</p>
                    <p className="text-[10px] font-semibold text-muted-foreground/80 lowercase">IP Address</p>
                  </div>
                  
                  <div className="col-span-2 pt-4 border-t border-dashed">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Audit Subject</span>
                      {selectedLog.targetType && (
                        <Badge variant="outline" className="px-2 py-0.5 text-[9px] font-black border-primary/20 text-primary uppercase tracking-widest">{selectedLog.targetType}</Badge>
                      )}
                    </div>
                    <span className="font-bold text-foreground text-lg tracking-tight">{selectedLog.targetName || selectedLog.targetUserMsisdn || selectedLog.targetId || selectedLog.targetUserId || "System Environment"}</span>
                  </div>
                  
                  {selectedLog.reason && (
                    <div className="col-span-2 p-5 bg-destructive/5 border border-destructive/10 rounded-2xl">
                      <span className="text-[10px] font-bold text-destructive uppercase tracking-wider block mb-1">Reason Provided</span>
                      <p className="text-sm font-semibold text-destructive leading-relaxed">{selectedLog.reason}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6 pt-6 border-t font-mono">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">State Transitions</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <div className="text-[9px] font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md w-fit mb-3 uppercase tracking-wider">STATE BEFORE</div>
                       <div className="bg-muted/40 p-5 rounded-2xl border border-border/40 min-h-[120px]">
                         <RenderStateData data={selectedLog.before || selectedLog.beforeState || {}} />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <div className="text-[9px] font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md w-fit mb-3 uppercase tracking-wider">STATE AFTER</div>
                       <div className="bg-muted/20 p-5 rounded-2xl border border-border/60 min-h-[120px] shadow-sm">
                         <RenderStateData data={selectedLog.after || selectedLog.afterState || selectedLog.changes || selectedLog.payload || {}} isAfter />
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setSelectedLog(null)} className="font-bold uppercase tracking-wider text-[10px] h-10 px-8">Close Details</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
