import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
import { Gift, History, MessageSquare, Settings2, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

type RewardTier = "L4" | "L8" | "L12" | "L16";
type CampaignStatus = "Sent" | "Scheduled" | "Draft" | "Failed";
type CampaignType = "Airtime" | "SMS" | "MoMo";

interface RewardUser {
  id: string;
  firstName: string;
  surname: string;
  tier: RewardTier;
  phone: string;
  region: string;
}

interface CampaignRecord {
  id: string;
  type: CampaignType;
  status: CampaignStatus;
  title: string;
  recipients: number;
  deliveryRate: number;
  createdAt: string;
  message: string;
  recipientBreakdown: { name: string; phone: string; status: string }[];
}

const SMS_DRAFT_KEY = "rewards_comms_sms_drafts";
const HISTORY_KEY = "rewards_comms_campaign_history";
const ACTIVE_DRAFT_KEY = "rewards_comms_active_sms_draft";
const HIDDEN_CAMPAIGNS_KEY = "rewards_comms_hidden_campaigns";

const rewardTiers: { tier: RewardTier; amount: number; label: string }[] = [
  { tier: "L4", amount: 5, label: "Starter loyalty" },
  { tier: "L8", amount: 10, label: "Growth reward" },
  { tier: "L12", amount: 15, label: "Power user" },
  { tier: "L16", amount: 25, label: "Top advocate" },
];

const mockUsers: RewardUser[] = [
  { id: "u-101", firstName: "Ama", surname: "Mensah", tier: "L4", phone: "0241234567", region: "Greater Accra" },
  { id: "u-102", firstName: "Kojo", surname: "Owusu", tier: "L4", phone: "0559081122", region: "Ashanti" },
  { id: "u-103", firstName: "Esi", surname: "Boateng", tier: "L8", phone: "0273321188", region: "Central" },
  { id: "u-104", firstName: "Yaw", surname: "Addo", tier: "L8", phone: "0204421980", region: "Eastern" },
  { id: "u-105", firstName: "Afia", surname: "Adu", tier: "L12", phone: "0267123456", region: "Volta" },
  { id: "u-106", firstName: "Kwame", surname: "Asare", tier: "L12", phone: "0503214455", region: "Bono" },
  { id: "u-107", firstName: "Abena", surname: "Darko", tier: "L16", phone: "0541123456", region: "Northern" },
  { id: "u-108", firstName: "Kofi", surname: "Frimpong", tier: "L16", phone: "0592190088", region: "Western" },
];

const mockCampaigns: CampaignRecord[] = [
  {
    id: "cmp-001",
    type: "SMS",
    status: "Sent",
    title: "Repayment reminder batch",
    recipients: 320,
    deliveryRate: 94,
    createdAt: "2026-05-04T09:30:00.000Z",
    message: "Hello [firstname], your Agenda Money repayment is due soon.",
    recipientBreakdown: [
      { name: "Ama Mensah", phone: "0241234567", status: "Delivered" },
      { name: "Kojo Owusu", phone: "0559081122", status: "Delivered" },
      { name: "Esi Boateng", phone: "0273321188", status: "Pending" },
    ],
  },
  {
    id: "cmp-002",
    type: "Airtime",
    status: "Sent",
    title: "L8 reward payout",
    recipients: 48,
    deliveryRate: 89,
    createdAt: "2026-05-03T14:10:00.000Z",
    message: "Tier L8 airtime rewards",
    recipientBreakdown: [
      { name: "Esi Boateng", phone: "0273321188", status: "Success" },
      { name: "Yaw Addo", phone: "0204421980", status: "Success" },
    ],
  },
  {
    id: "cmp-003",
    type: "SMS",
    status: "Scheduled",
    title: "L16 VIP reward reminder",
    recipients: 22,
    deliveryRate: 0,
    createdAt: "2026-05-03T18:20:00.000Z",
    message: "Hi [firstname], your L16 reward is being prepared.",
    recipientBreakdown: [
      { name: "Abena Darko", phone: "0541123456", status: "Scheduled" },
      { name: "Kofi Frimpong", phone: "0592190088", status: "Scheduled" },
    ],
  },
  {
    id: "cmp-004",
    type: "MoMo",
    status: "Failed",
    title: "Manual vendor payout",
    recipients: 1,
    deliveryRate: 0,
    createdAt: "2026-05-02T16:45:00.000Z",
    message: "Single recipient disbursement",
    recipientBreakdown: [{ name: "Vendor payout", phone: "0249001122", status: "Failed" }],
  },
];

const formatGhs = (amount: number) => `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function addHistory(record: CampaignRecord) {
  const current = readJson<CampaignRecord[]>(HISTORY_KEY, []);
  writeJson(HISTORY_KEY, [record, ...current]);
}

function getDraftCampaigns(): CampaignRecord[] {
  const drafts = readJson<any[]>(SMS_DRAFT_KEY, []);
  return drafts.map((draft) => ({
    id: draft.id,
    type: "SMS",
    status: "Draft",
    title: draft.title || "SMS campaign draft",
    recipients: draft.recipientCount || 0,
    deliveryRate: 0,
    createdAt: draft.updatedAt,
    message: draft.message,
    recipientBreakdown: [],
  }));
}

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

function PageShell({ title, description, icon: Icon, children }: { title: string; description: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          </div>
        </div>
        {children}
      </div>
    </DashboardLayout>
  );
}

export function SendAirtimePage() {
  const [tier, setTier] = useState<RewardTier>("L4");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const amount = rewardTiers.find((item) => item.tier === tier)?.amount || 0;
  const eligibleUsers = mockUsers.filter((user) => user.tier === tier);
  const selectedUsers = eligibleUsers.filter((user) => selectedIds.includes(user.id));
  const templateMessage = `Hi [firstname], you've earned ${formatGhs(amount)} airtime from Agenda Money for reaching ${tier}.`;
  const previewName = selectedUsers[0]?.firstName || "customer";

  const toggleUser = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const submit = () => {
    const payload = { tier, userIds: selectedIds, templateMessage, amount };
    console.log("airtime_reward_payload", payload);
    addHistory({
      id: `airtime-${Date.now()}`,
      type: "Airtime",
      status: "Sent",
      title: `${tier} airtime rewards`,
      recipients: selectedIds.length,
      deliveryRate: 100,
      createdAt: new Date().toISOString(),
      message: templateMessage,
      recipientBreakdown: selectedUsers.map((user) => ({ name: `${user.firstName} ${user.surname}`, phone: user.phone, status: "Queued" })),
    });
    setIsOpen(false);
    setConfirmed(false);
    toast.success("Airtime payload logged");
  };

  return (
    <PageShell title="Send Airtime" description="Reward eligible customers by tier using mock local data." icon={Gift}>
      <div className="grid gap-4 xl:grid-cols-[1fr_1.35fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tier Selector</CardTitle>
            <CardDescription>Choose one reward band.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {rewardTiers.map((item) => (
              <button key={item.tier} type="button" onClick={() => { setTier(item.tier); setSelectedIds([]); }} className={cn("rounded-lg border p-4 text-left transition", tier === item.tier ? "border-primary bg-primary/8 ring-1 ring-primary/20" : "hover:bg-muted/60")}>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black">{item.tier}</span>
                  <Badge>{formatGhs(item.amount)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eligible Users</CardTitle>
            <CardDescription>{eligibleUsers.length} mock users available for {tier}.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead className="w-12" /><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Region</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {eligibleUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="w-12 align-middle">
                      <div className="flex items-center justify-center">
                        <Checkbox checked={selectedIds.includes(user.id)} onCheckedChange={() => toggleUser(user.id)} />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{user.firstName} {user.surname}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>{user.region}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SMS Preview</CardTitle>
            <CardDescription>First selected user is used for preview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">
              {templateMessage.replace("[firstname]", previewName)}
            </div>
            <div className="rounded-lg bg-primary/8 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selected</p>
              <p className="text-2xl font-black">{selectedIds.length}</p>
            </div>
            <Button className="w-full bg-gradient-pink" disabled={!selectedIds.length} onClick={() => setIsOpen(true)}>Review & Send</Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm airtime reward</DialogTitle>
            <DialogDescription>This will log a mock airtime send payload for {selectedIds.length} customer(s).</DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
            <Checkbox checked={confirmed} onCheckedChange={(value) => setConfirmed(Boolean(value))} />
            <span className="leading-none">I confirm these users are eligible for the selected tier reward.</span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button disabled={!confirmed} onClick={submit}>Send mock reward</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

export function SendSmsPage() {
  const activeDraft = readJson<any | null>(ACTIVE_DRAFT_KEY, null);
  const [senderId, setSenderId] = useState(activeDraft?.senderId || "AGENDA");
  const [recipientMode, setRecipientMode] = useState<"all" | "tier" | "manual">(activeDraft?.recipientMode || "all");
  const [tier, setTier] = useState<RewardTier>(activeDraft?.tier || "L4");
  const [manualPhones, setManualPhones] = useState(activeDraft?.manualPhones || "");
  const [message, setMessage] = useState(activeDraft?.message || "Hi [firstname], ");
  const [schedule, setSchedule] = useState(Boolean(activeDraft?.schedule));
  const [sendAt, setSendAt] = useState(activeDraft?.sendAt || "");
  const charCount = message.length;
  const parts = Math.max(1, Math.ceil(charCount / 160));
  const manualList = manualPhones.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean);
  const invalidManual = recipientMode === "manual" ? manualList.filter((phone) => !isValidGhanaPhone(phone)) : [];
  const recipientCount = recipientMode === "all" ? mockUsers.length : recipientMode === "tier" ? mockUsers.filter((user) => user.tier === tier).length : manualList.length;
  const scheduleInvalid = schedule && (!sendAt || new Date(sendAt).getTime() <= Date.now());
  const canSend = message.trim().length > 0 && recipientCount > 0 && invalidManual.length === 0 && !scheduleInvalid;

  const saveDraft = () => {
    const drafts = readJson<any[]>(SMS_DRAFT_KEY, []);
    const draft = {
      id: activeDraft?.id || `draft-${Date.now()}`,
      title: `${senderId} ${recipientMode} message`,
      senderId,
      recipientMode,
      tier,
      manualPhones,
      message,
      schedule,
      sendAt,
      recipientCount,
      updatedAt: new Date().toISOString(),
    };
    writeJson(SMS_DRAFT_KEY, [draft, ...drafts.filter((item) => item.id !== draft.id)]);
    localStorage.removeItem(ACTIVE_DRAFT_KEY);
    toast.success("Draft saved locally");
  };

  const sendCampaign = () => {
    addHistory({
      id: `sms-${Date.now()}`,
      type: "SMS",
      status: schedule ? "Scheduled" : "Sent",
      title: `${senderId} campaign`,
      recipients: recipientCount,
      deliveryRate: schedule ? 0 : 98,
      createdAt: new Date().toISOString(),
      message,
      recipientBreakdown: mockUsers.slice(0, Math.min(3, recipientCount)).map((user) => ({ name: `${user.firstName} ${user.surname}`, phone: user.phone, status: schedule ? "Scheduled" : "Queued" })),
    });
    localStorage.removeItem(ACTIVE_DRAFT_KEY);
    toast.success(schedule ? "Campaign scheduled locally" : "Campaign logged locally");
  };

  return (
    <PageShell title="Send SMS" description="Compose a campaign with sender, recipient, template, and scheduling controls." icon={MessageSquare}>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader><CardTitle>Campaign Composer</CardTitle><CardDescription>Use [firstname] for template-ready personalization.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Sender ID</Label>
                <select value={senderId} onChange={(event) => setSenderId(event.target.value)} className="h-11 w-full rounded-md border bg-background px-3 text-sm">
                  <option>AGENDA</option><option>AGENDA$</option><option>AGD MONEY</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Recipients</Label>
                <select value={recipientMode} onChange={(event) => setRecipientMode(event.target.value as any)} className="h-11 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="all">All customers</option><option value="tier">By tier</option><option value="manual">Manual numbers</option>
                </select>
              </div>
            </div>
            {recipientMode === "tier" && (
              <div className="space-y-2">
                <Label>Tier</Label>
                <select value={tier} onChange={(event) => setTier(event.target.value as RewardTier)} className="h-11 w-full rounded-md border bg-background px-3 text-sm">
                  {rewardTiers.map((item) => <option key={item.tier}>{item.tier}</option>)}
                </select>
              </div>
            )}
            {recipientMode === "manual" && (
              <div className="space-y-2">
                <Label>Manual phone numbers</Label>
                <Textarea value={manualPhones} onChange={(event) => setManualPhones(event.target.value)} placeholder="0241234567, +233551234567" className="min-h-24" />
                {invalidManual.length > 0 && <p className="text-sm font-medium text-red-600">Invalid Ghana number(s): {invalidManual.join(", ")}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-44" />
              <div className="flex justify-between text-xs text-muted-foreground"><span>{charCount} characters</span><span>{parts} SMS part{parts === 1 ? "" : "s"}</span></div>
            </div>
            <label className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox checked={schedule} onCheckedChange={(value) => setSchedule(Boolean(value))} />
              <span className="text-sm font-medium">Schedule for later</span>
            </label>
            {schedule && (
              <div className="space-y-2">
                <Label>Send date and time</Label>
                <Input type="datetime-local" value={sendAt} onChange={(event) => setSendAt(event.target.value)} />
                {scheduleInvalid && <p className="text-sm font-medium text-red-600">Choose a future date and time.</p>}
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={saveDraft}>Save Draft</Button>
              <Button disabled={!canSend} className="bg-gradient-pink" onClick={sendCampaign}>{schedule ? "Schedule Campaign" : "Send Campaign"}</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Campaign Summary</CardTitle><CardDescription>Local validation only.</CardDescription></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between rounded-lg bg-muted/50 p-3"><span>Recipients</span><strong>{recipientCount}</strong></div>
            <div className="flex justify-between rounded-lg bg-muted/50 p-3"><span>Sender</span><strong>{senderId}</strong></div>
            <div className="flex justify-between rounded-lg bg-muted/50 p-3"><span>SMS parts</span><strong>{parts}</strong></div>
            <div className="rounded-lg border p-3"><p className="text-xs font-bold uppercase text-muted-foreground">Preview</p><p className="mt-2">{message.replace("[firstname]", "Ama")}</p></div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

export function MomoDisbursementPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typedAmount, setTypedAmount] = useState("");
  const numericAmount = Number(amount);
  const network = detectNetwork(phone);
  const amountValid = numericAmount >= 1 && numericAmount <= 5000;

  const submit = () => {
    addHistory({
      id: `momo-${Date.now()}`,
      type: "MoMo",
      status: "Sent",
      title: reference || "Manual MoMo disbursement",
      recipients: 1,
      deliveryRate: 100,
      createdAt: new Date().toISOString(),
      message: `${formatGhs(numericAmount)} to ${phone}`,
      recipientBreakdown: [{ name: name || "Single recipient", phone, status: "Queued" }],
    });
    setConfirmOpen(false);
    setTypedAmount("");
    toast.success("MoMo disbursement logged locally");
  };

  return (
    <PageShell title="MoMo Disbursement" description="Prepare a single-recipient manual payout with local safety checks." icon={Wallet}>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader><CardTitle>Recipient Details</CardTitle><CardDescription>Amount is limited to GHS 1 - 5,000.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Recipient name</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div>
            <div className="space-y-2"><Label>MoMo number</Label><Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0241234567" /></div>
            <div className="space-y-2"><Label>Amount (GHS)</Label><Input type="number" min={1} max={5000} value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
            {!amountValid && amount && <p className="text-sm font-medium text-red-600">Amount must be between GHS 1 and GHS 5,000.</p>}
            <div className="space-y-2"><Label>Reference</Label><Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ops payout reference" /></div>
            <Button className="bg-gradient-pink" disabled={!phone || !amountValid} onClick={() => setConfirmOpen(true)}>Review Disbursement</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Live Summary</CardTitle><CardDescription>Detected from the number prefix.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3"><span>Network</span><NetworkBadge network={network} /></div>
            <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs font-bold uppercase text-muted-foreground">Amount in words</p><p className="mt-1 font-semibold">{amount ? numberToWords(numericAmount) : "Enter an amount"}</p></div>
            <div className="rounded-lg border p-4 text-sm"><p><strong>{name || "Recipient"}</strong></p><p>{phone || "No number yet"}</p><p className="mt-2 text-2xl font-black">{amount ? formatGhs(numericAmount) : "GHS 0.00"}</p></div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm payout amount</DialogTitle><DialogDescription>Re-type {amount || "the amount"} to confirm this local disbursement action.</DialogDescription></DialogHeader>
          <Input value={typedAmount} onChange={(event) => setTypedAmount(event.target.value)} placeholder={amount} />
          <DialogFooter><Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button><Button disabled={typedAmount !== amount} onClick={submit}>Confirm</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

export function OtpSettingsPage() {
  const [expiry, setExpiry] = useState(() => readJson("rewards_comms_otp_settings", { expiry: 10 }).expiry);
  const [maxAttempts, setMaxAttempts] = useState(() => readJson("rewards_comms_otp_settings", { maxAttempts: 3 }).maxAttempts || 3);
  const save = () => {
    writeJson("rewards_comms_otp_settings", { expiry, maxAttempts });
    toast.success("OTP settings saved locally");
  };
  return (
    <PageShell title="OTP Settings" description="Local controls for the next OTP integration sprint." icon={Settings2}>
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Verification Controls</CardTitle><CardDescription>Mock settings persisted in localStorage.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>OTP expiry minutes</Label><Input type="number" min={1} max={60} value={expiry} onChange={(event) => setExpiry(Number(event.target.value))} /></div>
          <div className="space-y-2"><Label>Maximum attempts</Label><Input type="number" min={1} max={10} value={maxAttempts} onChange={(event) => setMaxAttempts(Number(event.target.value))} /></div>
          <Button onClick={save}>Save Settings</Button>
        </CardContent>
      </Card>
    </PageShell>
  );
}

export function CampaignHistoryPage() {
  const [typeFilter, setTypeFilter] = useState<"All" | CampaignType>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | CampaignStatus>("All");
  const [selected, setSelected] = useState<CampaignRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const campaigns = useMemo(() => {
    const stored = readJson<CampaignRecord[]>(HISTORY_KEY, []);
    const hiddenIds = readJson<string[]>(HIDDEN_CAMPAIGNS_KEY, []);
    return [...stored, ...getDraftCampaigns(), ...mockCampaigns]
      .filter((item) => !hiddenIds.includes(item.id))
      .filter((item) => typeFilter === "All" || item.type === typeFilter)
      .filter((item) => statusFilter === "All" || item.status === statusFilter)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [typeFilter, statusFilter, refreshKey]);

  const deleteDraft = (id: string) => {
    writeJson(SMS_DRAFT_KEY, readJson<any[]>(SMS_DRAFT_KEY, []).filter((draft) => draft.id !== id));
    setRefreshKey((value) => value + 1);
    toast.success("Draft deleted");
  };

  const deleteCampaign = (id: string) => {
    const stored = readJson<CampaignRecord[]>(HISTORY_KEY, []);
    writeJson(HISTORY_KEY, stored.filter((campaign) => campaign.id !== id));
    if (!stored.some((campaign) => campaign.id === id)) {
      const hiddenIds = readJson<string[]>(HIDDEN_CAMPAIGNS_KEY, []);
      writeJson(HIDDEN_CAMPAIGNS_KEY, Array.from(new Set([...hiddenIds, id])));
    }
    setRefreshKey((value) => value + 1);
    toast.success("Campaign removed");
  };

  const continueDraft = (campaign: CampaignRecord) => {
    const draft = readJson<any[]>(SMS_DRAFT_KEY, []).find((item) => item.id === campaign.id);
    if (draft) {
      writeJson(ACTIVE_DRAFT_KEY, draft);
    }
    window.location.href = "/admin/rewards/send-sms";
  };

  const editScheduledCampaign = (campaign: CampaignRecord) => {
    writeJson(ACTIVE_DRAFT_KEY, {
      id: campaign.id,
      title: campaign.title,
      senderId: "AGENDA",
      recipientMode: "all",
      tier: "L4",
      manualPhones: "",
      message: campaign.message,
      schedule: true,
      sendAt: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
      recipientCount: campaign.recipients,
      updatedAt: new Date().toISOString(),
    });
    window.location.href = "/admin/rewards/send-sms";
  };

  return (
    <PageShell title="Campaign History" description="Review mock sends, scheduled campaigns, failures, and locally saved drafts." icon={History}>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><CardTitle>Campaigns</CardTitle><CardDescription>Newest campaigns appear first.</CardDescription></div>
            <div className="grid gap-3 rounded-lg border bg-muted/25 p-3 xl:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Type</p>
                <div className="flex flex-wrap gap-2">
                  {(["All", "SMS", "Airtime", "MoMo"] as const).map((item) => <Button key={item} size="sm" variant={typeFilter === item ? "default" : "outline"} onClick={() => setTypeFilter(item)}>{item === "All" ? "All types" : item}</Button>)}
                </div>
              </div>
              <div className="space-y-2 border-t pt-3 xl:border-l xl:border-t-0 xl:pl-3 xl:pt-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                <div className="flex flex-wrap gap-2">
                  {(["All", "Sent", "Scheduled", "Draft", "Failed"] as const).map((item) => <Button key={item} size="sm" variant={statusFilter === item ? "default" : "outline"} onClick={() => setStatusFilter(item)}>{item === "All" ? "All statuses" : item}</Button>)}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Recipients</TableHead><TableHead>Delivery Rate</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell><Badge variant="outline">{campaign.type}</Badge><p className="mt-1 font-medium">{campaign.title}</p></TableCell>
                  <TableCell><Badge className={cn(campaign.status === "Failed" && "bg-red-600", campaign.status === "Draft" && "bg-amber-600", campaign.status === "Scheduled" && "bg-sky-600")}>{campaign.status}</Badge></TableCell>
                  <TableCell>{campaign.recipients.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", campaign.deliveryRate >= 90 ? "bg-emerald-500" : campaign.deliveryRate >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${campaign.deliveryRate}%` }} /></div>
                      <span className="text-sm font-semibold">{campaign.deliveryRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(campaign.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {campaign.status === "Sent" ? <Button size="sm" variant="outline" onClick={() => setSelected(campaign)}>View</Button> : null}
                    {campaign.status === "Draft" ? <Button size="sm" variant="outline" onClick={() => continueDraft(campaign)}>Continue</Button> : null}
                    {campaign.status === "Scheduled" ? <Button size="sm" variant="outline" onClick={() => editScheduledCampaign(campaign)}>Edit</Button> : null}
                    {campaign.status === "Draft" ? <Button size="sm" variant="ghost" onClick={() => deleteDraft(campaign.id)}><Trash2 className="h-4 w-4" /></Button> : null}
                    {campaign.status === "Scheduled" ? <Button size="sm" variant="ghost" onClick={() => deleteCampaign(campaign.id)}><Trash2 className="h-4 w-4" /></Button> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader><SheetTitle>{selected?.title}</SheetTitle><SheetDescription>Per-recipient delivery breakdown.</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-3">
            {selected?.recipientBreakdown.map((item) => (
              <div key={`${item.phone}-${item.status}`} className="flex items-center justify-between rounded-lg border p-3">
                <div><p className="font-semibold">{item.name}</p><p className="text-sm text-muted-foreground">{item.phone}</p></div>
                <Badge variant="outline">{item.status}</Badge>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
