import { useMemo, useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Gift, History, MessageSquare, Settings2, Trash2, Wallet, Download, Loader2, AlertTriangle, RefreshCw, Send, Calendar, Users, List, Play, Info, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useRewardTiers } from "@/hooks/useRewardTiers";
import { useCampaigns, useCampaignReport, useRetryCampaign } from "@/hooks/useCampaigns";
import { useQuery } from "@tanstack/react-query";
import { triggerAirtimeReward, redownloadAirtimeCsv, sendBulkSms, disburseMomo, sendAirtimeSms, getPendingAirtimeCampaign } from "@/api/rewards.api";
import { downloadBlob } from "@/utils/download";
import { useBundleBalance } from "@/hooks/useBundleBalance";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

// Reward types
export type RewardTier = "L4" | "L8" | "L12" | "L16";

const formatGhs = (amount: number) => `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Utility helpers

function isValidGhanaPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return true;
  if (/^233\d{9}$/.test(digits)) return true;
  return /^\+233\d{9}$/.test(value.trim());
}

function detectNetwork(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("233") ? `0${digits.slice(3)}` : digits;
  const prefix = local.slice(0, 3);
  if (["024", "025", "053", "054", "055", "059"].includes(prefix)) return "MTN";
  if (["027", "057", "026", "056"].includes(prefix)) return "AirtelTigo";
  if (["020", "050"].includes(prefix)) return "Telecel";
  return "Unknown";
}

function NetworkBadge({ network }: { network: string }) {
  if (network === "MTN") {
    return <span className="rounded-md bg-yellow-400 px-3 py-1 text-xs font-black text-black">MTN</span>;
  }

  if (network === "Telecel") {
    return <span className="rounded-md bg-red-600 px-3 py-1 text-xs font-black text-white">Telecel</span>;
  }

  if (network === "AirtelTigo") {
    return (
      <span className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-black shadow-sm">
        <span className="text-red-600">Airtel</span>
        <span className="text-blue-600">Tigo</span>
      </span>
    );
  }

  return <Badge variant="secondary">Unknown</Badge>;
}

const smallNumbers = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function numberToWords(value: number): string {
  const whole = Math.floor(value);
  if (!whole) return "Zero Ghana cedis";
  if (whole < 20) return `${smallNumbers[whole]} Ghana cedis`;
  if (whole < 100) return `${tens[Math.floor(whole / 10)]}${whole % 10 ? ` ${smallNumbers[whole % 10]}` : ""} Ghana cedis`;
  if (whole < 1000) return `${smallNumbers[Math.floor(whole / 100)]} Hundred${whole % 100 ? ` ${numberToWords(whole % 100).replace(" Ghana cedis", "")}` : ""} Ghana cedis`;
  return `${smallNumbers[Math.floor(whole / 1000)]} Thousand${whole % 1000 ? ` ${numberToWords(whole % 1000).replace(" Ghana cedis", "")}` : ""} Ghana cedis`;
}

// PageShell moved to standalone component

export function SendAirtimePage() {
  const { data: tiers, isLoading: isTiersLoading } = useRewardTiers();
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [isCsvDownloaded, setIsCsvDownloaded] = useState(false);
  
  const activeTiers = tiers?.filter(t => t.isActive) || [];
  const selectedTierConfig = tiers?.find(t => t.tier === selectedTier);
  const amount = selectedTierConfig?.airtimeAmount || 0;
  
  const templateMessage = selectedTierConfig?.smsTemplate || "";
  const previewMessage = templateMessage.replace("[firstname]", "Kwame");

  const handleConfirm = async () => {
    if (selectedTier === null) return;
    
    setIsTriggering(true);
    try {
      const { blob, filename, unknownNetworks, campaignId } = await triggerAirtimeReward(selectedTier);
      downloadBlob(blob, filename);

      setCurrentCampaignId(campaignId);
      setIsCsvDownloaded(true);

      if (unknownNetworks.length > 0) {
        toast.warning(`${unknownNetworks.length} MSISDNs had unknown networks — check CSV before uploading`);
      } else {
        toast.success(`Airtime reward triggered for L${selectedTier}. CSV downloaded.`);
      }
      setIsConfirmOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to trigger reward");
    } finally {
      setIsTriggering(false);
    }
  };

  const handleRedownload = async () => {
    if (selectedTier === null) return;
    try {
      const { blob, filename } = await redownloadAirtimeCsv(selectedTier);
      downloadBlob(blob, filename);
      toast.success("Existing CSV re-downloaded.");
    } catch (error: any) {
      toast.error("Failed to re-download. No existing reward file found for this tier.");
    }
  };

  const handleSendSms = async () => {
    if (!currentCampaignId) return;
    setIsSendingSms(true);
    try {
      const result = await sendAirtimeSms(currentCampaignId);
      toast.success(`SMS notifications queued for ${result.recipientCount} recipients.`);
      // Reset state
      setCurrentCampaignId(null);
      setIsCsvDownloaded(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send SMS notifications");
    } finally {
      setIsSendingSms(false);
    }
  };

  // Recovery on mount / selection
  const { data: pendingCampaign, isLoading: isCheckingPending } = useQuery({
    queryKey: ["pending-airtime-campaign", selectedTier],
    queryFn: () => selectedTier ? getPendingAirtimeCampaign(selectedTier) : Promise.resolve(null),
    enabled: !!selectedTier,
  });

  useEffect(() => {
    if (pendingCampaign) {
      setCurrentCampaignId(pendingCampaign._id);
      setIsCsvDownloaded(true);
    } else if (!isCheckingPending) {
      setCurrentCampaignId(null);
      setIsCsvDownloaded(false);
    }
  }, [pendingCampaign, isCheckingPending]);

  return (
    <PageShell title="Send Airtime" description="Reward eligible customers by tier using the backend trigger." icon={Gift}>
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Select Reward Tier</CardTitle>
            <CardDescription>Choose one active loyalty tier.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {isTiersLoading ? (
               <div className="space-y-3">
                 {[1, 2, 3, 4].map(i => <div key={i} className="h-20 w-full animate-pulse rounded-lg bg-muted" />)}
               </div>
            ) : activeTiers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border rounded-lg border-dashed">
                <AlertTriangle className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm font-medium">No active tiers configured</p>
                <p className="text-xs px-4">Go to Reward Tiers Config to activate tiers.</p>
              </div>
            ) : (
              activeTiers.map((item) => (
                <button 
                  key={item.tier} 
                  type="button" 
                  onClick={() => setSelectedTier(item.tier)} 
                  className={cn(
                    "rounded-lg border p-4 text-left transition", 
                    selectedTier === item.tier ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black">{item.label}</span>
                    <Badge variant="secondary">{formatGhs(item.airtimeAmount)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Amount: {formatGhs(item.airtimeAmount)} Airtime</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Campaign Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {!selectedTier ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                <Gift className="h-12 w-12 opacity-10" />
                <p className="mt-4">Select a tier on the left to see the campaign details.</p>
              </div>
            ) : isCheckingPending ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin opacity-20" />
                <p className="mt-4 font-medium">Checking for pending campaigns...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-xl border bg-primary/5 p-6">
                  <h3 className="text-lg font-bold">Triggering rewards for {selectedTierConfig?.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    This will identify all users who reached {selectedTierConfig?.label} and have not yet been rewarded. 
                    A CSV will be generated for portal upload.
                  </p>
                  
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-background p-4 shadow-sm border">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reward Amount</p>
                      <p className="mt-1 text-2xl font-black">{formatGhs(amount)}</p>
                    </div>
                    <div className="rounded-lg bg-background p-4 shadow-sm border">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sender ID</p>
                      <p className="mt-1 text-2xl font-black">{selectedTierConfig?.senderId}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                   <Label>SMS Preview (Read-only)</Label>
                   <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed italic text-muted-foreground">
                    "{previewMessage}"
                   </div>
                   <p className="text-[10px] text-muted-foreground">Templates are edited in Reward Tier Configuration.</p>
                </div>

                {isCsvDownloaded && currentCampaignId ? (
                  <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-3 text-primary mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold">Step 2: Upload CSV to Rancard Portal</h4>
                        <p className="text-xs opacity-80">CSV downloaded for {selectedTierConfig?.label}</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Once you have uploaded the CSV to the Rancard portal and confirmed airtime is loaded, 
                      click below to send the reward SMS notifications to recipients.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Button 
                        className="h-11 font-bold shadow-md bg-primary hover:bg-primary/90" 
                        onClick={handleSendSms}
                        disabled={isSendingSms}
                      >
                        {isSendingSms ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending SMS...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Send Reward SMS →
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-11" 
                        onClick={handleRedownload}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Re-download CSV
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button 
                      className="h-12 text-lg font-bold shadow-lg" 
                      onClick={() => setIsConfirmOpen(true)}
                      disabled={isTriggering}
                    >
                      {isTriggering ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-5 w-5" />
                          Download CSV & Lock Rewards
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-12" 
                      onClick={handleRedownload}
                      disabled={isTriggering}
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Re-download Last CSV
                    </Button>
                  </div>
                )}

                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 flex items-start gap-3">
                   <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      This will mark all eligible users as rewarded and download the airtime CSV. 
                      Upload the CSV to the Rancard portal, then return here to send the notification SMS.
                    </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm reward trigger</DialogTitle>
            <DialogDescription>
              Are you sure you want to trigger <strong>{formatGhs(amount)}</strong> airtime rewards for all eligible <strong>{selectedTierConfig?.label}</strong> users?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
             <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
             <div className="text-xs text-amber-800 space-y-1">
                <p className="font-bold">Important Note:</p>
                <p>This action will mark users as rewarded. You cannot "Undo" this from the dashboard.</p>
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={isTriggering}>
              {isTriggering ? "Processing..." : "Yes, Trigger Rewards"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

export function SendSmsPage() {
  const { data: tiers, isLoading: isTiersLoading } = useRewardTiers();
  const [senderId, setSenderId] = useState("AGENDA");
  const [recipientMode, setRecipientMode] = useState<"all" | "tier" | "manual">("all");
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [manualPhones, setManualPhones] = useState("");
  const [message, setMessage] = useState("");
  const [label, setLabel] = useState("");
  const [schedule, setSchedule] = useState(false);
  const [sendAt, setSendAt] = useState("");
  const [isSending, setIsSending] = useState(false);

  const senderIds = [...new Set(tiers?.map(t => t.senderId) ?? ["AGENDA"])];
  const charCount = message.length;
  const parts = Math.max(1, Math.ceil(charCount / 160));
  
  const manualList = manualPhones.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean);
  const invalidManual = recipientMode === "manual" ? manualList.filter((phone) => !isValidGhanaPhone(phone)) : [];
  
  const scheduleInvalid = schedule && (!sendAt || new Date(sendAt).getTime() <= Date.now());
  const canSend = message.trim().length > 0 && label.trim().length > 0 && (recipientMode !== "manual" || (manualList.length > 0 && invalidManual.length === 0)) && !scheduleInvalid;

  const handleTierChange = (tier: string) => {
    const tierNum = parseInt(tier);
    setSelectedTier(tierNum);
    const config = tiers?.find(t => t.tier === tierNum);
    if (config) {
      setMessage(config.smsTemplate);
      setSenderId(config.senderId);
    }
  };

  const sendCampaign = async () => {
    setIsSending(true);
    try {
      const payload: any = {
        senderId,
        message,
        label,
        scheduled: schedule,
      };

      if (recipientMode === "tier" && selectedTier) {
        payload.tier = selectedTier;
      } else if (recipientMode === "manual") {
        payload.contacts = manualList;
      }
      // If mode is "all", backend handles it or we might need another flag. 
      // Current spec says { tier } or { contacts }. If none, assume all? 
      // Let's assume 'all' is not directly supported yet or needs verification.

      if (schedule) {
        payload.startDate = new Date(sendAt).toISOString();
      }

      const { campaignId } = await sendBulkSms(payload);
      toast.success(`Campaign queued — ID: ${campaignId}`);
      // Reset form
      setMessage("");
      setLabel("");
      setManualPhones("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send campaign");
    } finally {
      setIsSending(false);
    }
  };

  const { data: bundleData, isLoading: isBundleLoading, isError: isBundleError } = useBundleBalance();
  const bundleCount = bundleData?.bundleCount ?? 0;

  return (
    <PageShell title="Send SMS" description="Compose a campaign with real sender IDs and backend integration." icon={MessageSquare}>
        <div className="flex items-center justify-end mb-4">
           <Card className="p-3 bg-muted/30 border-dashed">
              <div className="flex items-center gap-4">
                 <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SMS bundle balance</p>
                    <p className="text-xl font-black">{isBundleLoading ? "---" : isBundleError ? "Error" : bundleCount.toLocaleString()} credits</p>
                 </div>
                 <div className={cn(
                   "h-2 w-2 rounded-full",
                   isBundleLoading ? "bg-muted animate-pulse" : 
                   isBundleError ? "bg-red-500" : 
                   bundleCount > 500 ? "bg-emerald-500" : 
                   bundleCount > 100 ? "bg-amber-500" : "bg-red-500"
                 )} />
              </div>
           </Card>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Composer</CardTitle>
            <CardDescription>Select recipients and craft your message.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Campaign Label (Internal Reference)</Label>
              <Input 
                placeholder="e.g. May Promo - Tier 4" 
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Sender ID</Label>
                <select 
                  value={senderId} 
                  onChange={(event) => setSenderId(event.target.value)} 
                  className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {senderIds.map(id => <option key={id} value={id}>{id}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Recipients</Label>
                <select 
                  value={recipientMode} 
                  onChange={(event) => setRecipientMode(event.target.value as any)} 
                  className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="all">All customers</option>
                  <option value="tier">By tier</option>
                  <option value="manual">Manual numbers</option>
                </select>
              </div>
            </div>
            
            {recipientMode === "tier" && (
              <div className="space-y-2">
                <Label>Select Tier</Label>
                <select 
                  value={selectedTier || ""} 
                  onChange={(event) => handleTierChange(event.target.value)} 
                  className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="" disabled>Choose a tier</option>
                  {tiers?.map((item) => (
                    <option key={item.tier} value={item.tier}>{item.label}</option>
                  ))}
                </select>
              </div>
            )}

            {recipientMode === "manual" && (
              <div className="space-y-2">
                <Label>Manual phone numbers</Label>
                <Textarea 
                  value={manualPhones} 
                  onChange={(event) => setManualPhones(event.target.value)} 
                  placeholder="0241234567, +233551234567" 
                  className="min-h-24" 
                />
                {invalidManual.length > 0 && (
                  <p className="text-sm font-medium text-red-600">
                    Invalid Ghana number(s): {invalidManual.join(", ")}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Message</Label>
                <span className={cn("text-[10px] font-bold uppercase", parts > 1 ? "text-amber-600" : "text-muted-foreground")}>
                  {parts} SMS part{parts === 1 ? "" : "s"}
                </span>
              </div>
              <Textarea 
                value={message} 
                onChange={(event) => setMessage(event.target.value)} 
                className="min-h-44" 
                placeholder="Type your message here..."
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{charCount} characters</span>
                <span>Max 160 per part</span>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition">
              <Checkbox checked={schedule} onCheckedChange={(value) => setSchedule(Boolean(value))} />
              <div className="flex flex-col">
                <span className="text-sm font-bold">Schedule for later</span>
                <span className="text-[10px] text-muted-foreground uppercase">Set a specific time to blast</span>
              </div>
            </label>

            {schedule && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label>Send date and time</Label>
                <Input 
                  type="datetime-local" 
                  value={sendAt} 
                  onChange={(event) => setSendAt(event.target.value)} 
                />
                {scheduleInvalid && (
                  <p className="text-sm font-medium text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Choose a future date and time.
                  </p>
                )}
              </div>
            )}

            <Button 
              disabled={!canSend || isSending} 
              className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90" 
              onClick={sendCampaign}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  {schedule ? "Schedule Campaign" : "Send Campaign Now"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Summary</CardTitle>
            <CardDescription>Final check before sending.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between rounded-lg bg-muted/50 p-3">
                <span className="text-muted-foreground">Mode</span>
                <span className="font-bold uppercase">{recipientMode}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-muted/50 p-3">
                <span className="text-muted-foreground">Sender</span>
                <span className="font-bold">{senderId}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-muted/50 p-3">
                <span className="text-muted-foreground">Estimated Parts</span>
                <span className="font-bold">{parts}</span>
              </div>
            </div>

            <div className="rounded-lg border border-dashed p-4">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Message Preview</p>
              <p className="text-sm leading-relaxed">
                {message || <span className="text-muted-foreground italic">No message yet...</span>}
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 p-4 flex items-start gap-3">
               <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
               <p className="text-[10px] text-blue-700 leading-relaxed uppercase font-bold">
                 SMS credits will be deducted from your bundle balance upon sending.
               </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

export function MomoDisbursementPage() {
  const { data: tiers, isLoading: isTiersLoading } = useRewardTiers();
  const [mode, setMode] = useState<"single" | "tier">("single");
  const [msisdn, setMsisdn] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDisbursing, setIsDisbursing] = useState(false);
  const [typedAmount, setTypedAmount] = useState("");
  const [typedTier, setTypedTier] = useState("");

  const activeTiers = tiers?.filter(t => t.isActive) || [];
  const selectedTierConfig = tiers?.find(t => t.tier === selectedTier);
  const network = detectNetwork(msisdn);
  const numericAmount = Number(amount);
  const amountValid = numericAmount >= 1 && numericAmount <= 5000;

  const handleConfirm = async () => {
    setIsDisbursing(true);
    try {
      let result;
      if (mode === "single") {
        result = await disburseMomo({
          msisdn: msisdn.trim(),
          amount: numericAmount,
          reference: reference.trim(),
          note: note.trim() || undefined,
        });
      } else {
        result = await disburseMomo({
          tier: selectedTier!,
          note: note.trim() || undefined,
        });
      }
      
      toast.success(
        mode === "single" 
          ? `Disbursement queued — Campaign ID: ${result.campaignId}`
          : `Bulk MoMo queued for ${result.recipientCount} users. Campaign: ${result.campaignId}`
      );
      
      setIsConfirmOpen(false);
      // Reset form
      if (mode === "single") {
        setMsisdn("");
        setAmount("");
        setReference("");
        setTypedAmount("");
      } else {
        setSelectedTier(null);
        setTypedTier("");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Disbursement failed");
    } finally {
      setIsDisbursing(false);
    }
  };

  const canReview = mode === "single" 
    ? (msisdn && amountValid && reference) 
    : selectedTier;

  return (
    <PageShell title="MoMo Disbursement" description="Prepare single or tier-based MoMo payouts." icon={Wallet}>
      <div className="space-y-6">
        <div className="flex justify-center">
           <div className="inline-flex p-1 bg-muted rounded-xl border">
              <Button 
                variant={mode === "single" ? "default" : "ghost"} 
                onClick={() => setMode("single")}
                className="rounded-lg"
              >
                Single Recipient
              </Button>
              <Button 
                variant={mode === "tier" ? "default" : "ghost"} 
                onClick={() => setMode("tier")}
                className="rounded-lg"
              >
                By Loyalty Tier
              </Button>
           </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <Card>
            <CardHeader>
              <CardTitle>{mode === "single" ? "Recipient Details" : "Select Tier for Bulk Payout"}</CardTitle>
              <CardDescription>
                {mode === "single" 
                  ? "Standard manual disbursement (GHS 1 - 5,000)." 
                  : "Send MoMo to all eligible users in a specific tier."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mode === "single" ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Recipient MSISDN</Label>
                      <Input 
                        value={msisdn} 
                        onChange={(e) => setMsisdn(e.target.value)} 
                        placeholder="0241234567" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (GHS)</Label>
                      <Input 
                        type="number" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)} 
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Unique Reference</Label>
                    <Input 
                      value={reference} 
                      onChange={(e) => setReference(e.target.value)} 
                      placeholder="e.g. REF-12345" 
                    />
                  </div>
                </>
              ) : (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  {isTiersLoading ? (
                    <div className="col-span-full h-20 animate-pulse bg-muted rounded-lg" />
                  ) : activeTiers.map((t) => (
                    <button 
                      key={t.tier}
                      onClick={() => setSelectedTier(t.tier)}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-center",
                        selectedTier === t.tier ? "border-primary bg-primary/5" : "border-transparent bg-muted/40 hover:bg-muted"
                      )}
                    >
                      <p className="text-xl font-black">{t.label}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{formatGhs(t.momoAmount)}</p>
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Note / Internal Reason (Optional)</Label>
                <Textarea 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
                  placeholder="Will be visible in audit logs..." 
                />
              </div>

              <Button 
                className="w-full h-12 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg" 
                disabled={!canReview} 
                onClick={() => setIsConfirmOpen(true)}
              >
                Review Disbursement
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Disbursement Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mode === "single" ? (
                  <>
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Network</span>
                      <NetworkBadge network={network} />
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Amount in words</p>
                      <p className="mt-1 text-sm font-semibold leading-tight">
                        {amount ? numberToWords(numericAmount) : "Enter an amount"}
                      </p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Total Payout</p>
                      <p className="text-3xl font-black">{amount ? formatGhs(numericAmount) : "GHS 0.00"}</p>
                    </div>
                  </>
                ) : (
                  <>
                    {!selectedTier ? (
                      <div className="py-12 text-center text-muted-foreground italic text-sm">
                        Select a tier to see summary
                      </div>
                    ) : (
                      <div className="space-y-4">
                         <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                           <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Amount Per Recipient</p>
                           <p className="text-3xl font-black">{formatGhs(selectedTierConfig?.momoAmount || 0)}</p>
                         </div>
                         <div className="space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Targets</p>
                            <p className="text-sm">All users who reached <strong>{selectedTierConfig?.label}</strong> and have unrewarded MoMo milestones.</p>
                         </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4 flex items-start gap-3">
               <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
               <p className="text-[10px] text-amber-700 leading-relaxed uppercase font-bold">
                 This action is sensitive and will be recorded in the system audit logs.
               </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm {mode === "tier" ? "Bulk" : "Single"} Disbursement</DialogTitle>
            <DialogDescription>
              {mode === "single" 
                ? `You are sending ${formatGhs(numericAmount)} to ${msisdn}.` 
                : `You are sending ${formatGhs(selectedTierConfig?.momoAmount || 0)} to all eligible ${selectedTierConfig?.label} users.`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {mode === "single" ? (
              <div className="space-y-2">
                <Label>Re-type amount to confirm (<strong>{amount}</strong>)</Label>
                <Input 
                  value={typedAmount} 
                  onChange={(e) => setTypedAmount(e.target.value)} 
                  placeholder={amount} 
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Type tier label to confirm (<strong>{selectedTierConfig?.label}</strong>)</Label>
                <Input 
                  value={typedTier} 
                  onChange={(e) => setTypedTier(e.target.value)} 
                  placeholder={selectedTierConfig?.label} 
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
            <Button 
              disabled={(mode === "single" ? typedAmount !== amount : typedTier !== selectedTierConfig?.label) || isDisbursing} 
              onClick={handleConfirm}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isDisbursing ? "Processing..." : "Confirm & Disburse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}


export function CampaignHistoryPage() {
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const { data, isLoading } = useCampaigns({ 
    type: typeFilter || undefined, 
    status: statusFilter || undefined, 
    page, 
    limit: 15 
  });
  
  const campaigns = data?.campaigns ?? [];
  const totalPages = data?.pages ?? 1;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-gray-500";
      case "csv_ready": return "bg-amber-500";
      case "processing": return "bg-blue-500 animate-pulse";
      case "completed": return "bg-emerald-500";
      case "partial": return "bg-amber-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <PageShell title="Campaign History" description="Review real-time campaign execution and delivery reports." icon={History}>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>All Campaigns</CardTitle>
              <CardDescription>History of all rewards and communications sent.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <select 
                className="h-9 rounded-md border bg-background px-3 text-xs"
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Types</option>
                <option value="sms">SMS</option>
                <option value="airtime">Airtime</option>
                <option value="momo">MoMo</option>
                <option value="otp">OTP</option>
              </select>
              <select 
                className="h-9 rounded-md border bg-background px-3 text-xs"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="csv_ready">Awaiting SMS</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="partial">Partial</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Recipients</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3].map(i => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><div className="h-12 w-full animate-pulse bg-muted rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No campaigns found matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((c) => {
                    const rate = c.totalCount > 0 ? (c.deliveredCount / c.totalCount) * 100 : 0;
                    return (
                      <TableRow key={c._id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm uppercase tracking-tight">{c.label}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{c.type} {c.tier ? `• L${c.tier}` : ""}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-[10px] uppercase font-bold", getStatusColor(c.status))}>
                            {c.status === "csv_ready" ? "Awaiting SMS" : c.status}
                          </Badge>
                          {c.status === "pending" && c.scheduledFor && (
                            <p className="text-[9px] text-muted-foreground mt-1">
                              Sched: {format(new Date(c.scheduledFor), "MMM d, HH:mm")}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">{c.totalCount.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span>{rate.toFixed(1)}%</span>
                              <span className="text-muted-foreground">{c.deliveredCount} / {c.totalCount}</span>
                            </div>
                            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn("h-full transition-all", rate >= 90 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-500")}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(c.createdAt), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setSelectedId(c._id)}>
                            Report
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-28 w-full animate-pulse bg-muted rounded-2xl" />)
            ) : campaigns.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm border rounded-2xl border-dashed">No campaigns found.</div>
            ) : campaigns.map((c) => {
              const rate = c.totalCount > 0 ? (c.deliveredCount / c.totalCount) * 100 : 0;
              return (
                <div key={c._id} className="bg-muted/30 rounded-2xl border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm uppercase tracking-tight">{c.label}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{c.type}{c.tier ? ` • L${c.tier}` : ""} • {format(new Date(c.createdAt), "MMM d, HH:mm")}</p>
                    </div>
                    <Badge className={cn("text-[10px] uppercase font-bold shrink-0", getStatusColor(c.status))}>
                      {c.status === "csv_ready" ? "Awaiting SMS" : c.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold">{rate.toFixed(1)}% delivered</span>
                      <span className="text-muted-foreground">{c.deliveredCount} / {c.totalCount}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full transition-all", rate >= 90 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => setSelectedId(c._id)}>View Report</Button>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-end gap-2">
               <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
               <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
               <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CampaignReportDrawer 
        id={selectedId} 
        onClose={() => setSelectedId(null)} 
      />
    </PageShell>
  );
}

function CampaignReportDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [recipientFilter, setRecipientFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const { data: report, isLoading } = useCampaignReport(id!, { status: recipientFilter, page, limit: 50 });
  const { mutate: retry, isPending: isRetrying } = useRetryCampaign(id!);
  
  const recipients = report?.recipients ?? [];
  const totalPages = report ? Math.ceil(report.total / report.limit) : 1;

  const handleRetry = () => {
    retry(undefined, {
      onSuccess: (data) => {
        toast.success(`Retry campaign created with ${data.retryCount} recipients.`);
        onClose();
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || "Failed to initiate retry.");
      }
    });
  };

  return (
    <Sheet open={!!id} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {isLoading ? (
           <div className="flex items-center justify-center h-full">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
        ) : !report ? (
          <div className="p-12 text-center">Failed to load report.</div>
        ) : (
          <div className="space-y-6 pb-12">
            <SheetHeader>
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-xl">{report.label}</SheetTitle>
                  <SheetDescription className="uppercase text-[10px] font-bold tracking-widest mt-1">
                    {report.type} Campaign • Status: {report.status}
                  </SheetDescription>
                </div>
                {(report.status === "completed" || report.status === "partial") && report.failedCount > 0 && (
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={handleRetry} 
                    disabled={isRetrying}
                  >
                    {isRetrying ? "Retrying..." : `Retry Failed (${report.failedCount})`}
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="grid grid-cols-4 gap-2">
               <div className="rounded-lg border p-3 bg-muted/30 text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Total</p>
                  <p className="text-xl font-black">{report.totalCount}</p>
               </div>
               <div className="rounded-lg border border-emerald-100 p-3 bg-emerald-50/30 text-center text-emerald-700">
                  <p className="text-[10px] font-bold uppercase">Delivered</p>
                  <p className="text-xl font-black">{report.deliveredCount}</p>
               </div>
               <div className="rounded-lg border border-red-100 p-3 bg-red-50/30 text-center text-red-700">
                  <p className="text-[10px] font-bold uppercase">Failed</p>
                  <p className="text-xl font-black">{report.failedCount}</p>
               </div>
               <div className="rounded-lg border border-blue-100 p-3 bg-blue-50/30 text-center text-blue-700">
                  <p className="text-[10px] font-bold uppercase">Rate</p>
                  <p className="text-xl font-black">{report.deliveryRate}</p>
               </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Recipient Breakdown</h3>
                <div className="flex gap-2">
                  <select 
                    className="h-8 rounded-md border text-[10px] px-2 bg-background"
                    value={recipientFilter || ""}
                    onChange={(e) => { setRecipientFilter(e.target.value || undefined); setPage(1); }}
                  >
                    <option value="">All Statuses</option>
                    <option value="delivered">Delivered</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                    <option value="undelivered">Undelivered</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {recipients.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm border rounded-lg border-dashed">
                    No recipients found in this filter.
                  </div>
                ) : (
                  recipients.map((r, i) => (
                    <div key={`${r.msisdn}-${i}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition">
                      <div>
                        <p className="font-bold text-sm">{r.firstName || "Customer"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{r.msisdn}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={cn(
                          "text-[9px] uppercase font-bold",
                          r.status === "delivered" ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
                          r.status === "failed" ? "border-red-200 text-red-700 bg-red-50" :
                          "border-gray-200 text-gray-700 bg-gray-50"
                        )}>
                          {r.status}
                        </Badge>
                        {r.status === "delivered" && r.deliveredAt && (
                           <p className="text-[9px] text-muted-foreground mt-1">
                             {format(new Date(r.deliveredAt), "HH:mm:ss")}
                           </p>
                        )}
                        {r.status === "failed" && r.failureReason && (
                           <p className="text-[9px] text-red-600 mt-1 max-w-[150px] truncate" title={r.failureReason}>
                             {r.failureReason}
                           </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4">
                  <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <span className="text-xs">Page {page} / {totalPages}</span>
                  <Button size="sm" variant="ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
