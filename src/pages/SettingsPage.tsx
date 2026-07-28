import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, {
  getVapidPublicKey,
  subscribeNotification,
  unsubscribeNotification,
} from "@/lib/api";
import {
  getUniwalletConfig, updateUniwalletConfig,
} from "@/api/payments.api";
import {
  getDirectDebitConfig, updateDirectDebitConfig,
} from "@/api/direct-debit.api";
import {
  getOrchardConfig, updateOrchardConfig,
  getDisbursementProvider, setDisbursementProvider,
  type DisbursementProviderName,
  getCollectionProvider, setCollectionProvider,
  triggerCollection, triggerOrchardCollection,
  type CollectionProviderName,
} from "@/api/orchard.api";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, Monitor, UserPlus, Bell, Smartphone, CheckCircle2, XCircle, Database, RefreshCw, BarChart2, Loader2, AlertTriangle } from "lucide-react";
import { AuthorizeAgentModal } from "@/components/agents/AuthorizeAgentModal";
import { InviteCsaModal } from "@/components/csa/InviteCsaModal";
import { InviteReportingModal } from "@/components/reporting/InviteReportingModal";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useParams, useNavigate } from "react-router-dom";

function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="flex gap-2">
      {themes.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200",
            theme === value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card hover:border-primary/50",
          )}
        >
          <Icon className="h-5 w-5" />
          <span className="font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
}

function NotificationPreferences() {
  const { user, canWrite } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const queryClient = useQueryClient();

  const { data: statusResp, refetch: refetchStatus } = useQuery({
    queryKey: ["notifications-status"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/admin/notifications/status");
        return res.data;
      } catch (e) {
        return { isPushEnabled: false, whatsappNumber: "" };
      }
    },
  });

  // Check browser-level push status on mount
  useEffect(() => {
    const checkBrowserPushStatus = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          setNotificationsEnabled(true);
        } else {
          setNotificationsEnabled(false);
        }
      } catch (err) {
        console.error("Failed to check push status:", err);
      }
    };

    if ("serviceWorker" in navigator && "PushManager" in window) {
      checkBrowserPushStatus();
    }
  }, []);

  useEffect(() => {
    if (statusResp) {
      // Prioritize browser state, use backend as backup if not already set or if explicitly different
      if (statusResp.whatsappNumber)
        setWhatsappNumber(statusResp.whatsappNumber);
    }
  }, [statusResp]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleTogglePush = async (checked: boolean) => {
    if (checked) {
      setIsSubscribing(true);
      try {
        const reg = await navigator.serviceWorker.ready;
        const keyRes = await getVapidPublicKey();

        const vapidPublicKey =
          keyRes.publicKey || keyRes.data?.publicKey || keyRes.data || keyRes;
        if (!vapidPublicKey || typeof vapidPublicKey !== "string") {
          toast.error(
            "Push notifications are not configured yet. Please contact your administrator.",
          );
          setNotificationsEnabled(false);
          return;
        }

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        // Backend expects the subscription object itself per integration guide
        await subscribeNotification(subscription);
        toast.success("Push notifications enabled!");
        setNotificationsEnabled(true);
        refetchStatus();
      } catch (err: any) {
        toast.error(
          err?.response?.data?.error || "Failed to enable push notifications.",
        );
        console.error(err);
        setNotificationsEnabled(false);
      } finally {
        setIsSubscribing(false);
      }
    } else {
      setIsSubscribing(true);
      try {
        const reg = await navigator.serviceWorker.ready;

        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          // Backend expects POST /unsubscribe with { endpoint }
          await unsubscribeNotification({
            endpoint: subscription.endpoint,
          });
          await subscription.unsubscribe();
        }
        setNotificationsEnabled(false);
        toast.success("Push notifications disabled.");
        refetchStatus();
      } catch (err: any) {
        toast.error(
          err?.response?.data?.error || "Failed to disable push notifications.",
        );
        console.error(err);
      } finally {
        setIsSubscribing(false);
      }
    }
  };

  const saveWhatsapp = async () => {
    try {
      await api.post("/api/admin/notifications/whatsapp", {
        number: whatsappNumber,
      });
      toast.success("WhatsApp number updated.");
      refetchStatus();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error || "Failed to update WhatsApp number.",
      );
    }
  };

  return (
    <Card className="mb-6 border-primary/20">
      <CardHeader>
        <CardTitle>Admin Notifications</CardTitle>
        <CardDescription>
          Receive secure alerts for verification requests, large payouts, and
          system issues.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">Browser Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive instant desktop alerts even when the app is closed.
              </p>
            </div>
          </div>
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={handleTogglePush}
            disabled={isSubscribing || !canWrite}
          />
        </div>

        <div className="space-y-3 p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-green-500/10 rounded-full text-green-600">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">WhatsApp Alerts</p>
              <p className="text-sm text-muted-foreground">
                Receive critical system alerts via WhatsApp directly to your
                phone.
              </p>
            </div>
          </div>
          <div className="flex gap-3 pl-0 sm:pl-14">
            <Input
              placeholder="e.g. +233200000000"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="max-w-xs"
              disabled={!canWrite}
            />
            {canWrite && (
              <Button
                onClick={saveWhatsapp}
                className="bg-green-600 hover:bg-green-700"
              >
                Save
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CredentialDot({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 className="h-4 w-4 text-green-500 inline-block" />
    : <XCircle className="h-4 w-4 text-red-400 inline-block" />;
}

function ToggleRow({
  label, description, checked, onCheckedChange, disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

function PaymentsSettings({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();

  // ── UniWallet ────────────────────────────────────────────────────────────
  const { data: uwData, isLoading: uwLoading } = useQuery({
    queryKey: ["uw-config"],
    queryFn: getUniwalletConfig,
  });

  const uwMut = useMutation({
    mutationFn: updateUniwalletConfig,
    onSuccess: () => { toast.success("UniWallet settings saved"); qc.invalidateQueries({ queryKey: ["uw-config"] }); },
    onError: () => toast.error("Failed to save UniWallet settings"),
  });

  const uw = uwData?.data;
  const env = uwData?.env;

  const [disbNarr, setDisbNarr] = useState("");
  const [collNarr, setCollNarr] = useState("");

  useEffect(() => {
    if (uw) {
      setDisbNarr(uw.disbursementNarration);
      setCollNarr(uw.collectionNarration);
    }
  }, [uw]);

  // ── Disbursement Provider Switch ─────────────────────────────────────────
  const { data: activeProvider, isLoading: providerLoading } = useQuery({
    queryKey: ["disbursement-provider"],
    queryFn: getDisbursementProvider,
  });

  const providerMut = useMutation({
    mutationFn: setDisbursementProvider,
    onSuccess: (provider) => {
      toast.success(`Disbursement provider switched to ${provider === "ORCHARD" ? "Orchard" : "Paystack"}`);
      qc.invalidateQueries({ queryKey: ["disbursement-provider"] });
    },
    onError: () => toast.error("Failed to switch disbursement provider"),
  });

  // ── Collection Provider Switch (governs customer USSD "Pay Now") ─────────
  const { data: activeCollectionProvider, isLoading: collectionProviderLoading } = useQuery({
    queryKey: ["collection-provider"],
    queryFn: getCollectionProvider,
  });

  const collectionProviderMut = useMutation({
    mutationFn: setCollectionProvider,
    onSuccess: (provider) => {
      toast.success(`Collection provider switched to ${provider === "ORCHARD" ? "Orchard" : "Paystack"}`);
      qc.invalidateQueries({ queryKey: ["collection-provider"] });
    },
    onError: () => toast.error("Failed to switch collection provider"),
  });

  // ── Generic Trigger Collection (any loan, either provider) ────────────────
  const [collectLoanRef, setCollectLoanRef] = useState("");
  const [collectAmount, setCollectAmount] = useState("");
  const [collectProviderOverride, setCollectProviderOverride] = useState<CollectionProviderName | "auto">("auto");

  const triggerCollectionMut = useMutation({
    mutationFn: triggerCollection,
    onSuccess: (result) => {
      toast.success(result?.message || "Collection attempt initiated");
      setCollectAmount("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to trigger collection");
    },
  });

  // ── Orchard ──────────────────────────────────────────────────────────────
  const { data: orchardData, isLoading: orchardLoading } = useQuery({
    queryKey: ["orchard-config"],
    queryFn: getOrchardConfig,
  });

  const orchardMut = useMutation({
    mutationFn: updateOrchardConfig,
    onSuccess: () => { toast.success("Orchard settings saved"); qc.invalidateQueries({ queryKey: ["orchard-config"] }); },
    onError: () => toast.error("Failed to save Orchard settings"),
  });

  const orchard = orchardData?.data;
  const orchardEnv = orchardData?.env;

  // ── Orchard manual collection (any loan, custom amount) ──────────────────
  const [orchardCollectLoanRef, setOrchardCollectLoanRef] = useState("");
  const [orchardCollectAmount, setOrchardCollectAmount] = useState("");

  const orchardCollectMut = useMutation({
    mutationFn: ({ loanReference, amount }: { loanReference: string; amount?: number }) =>
      triggerOrchardCollection(loanReference, amount),
    onSuccess: (result) => {
      toast.success(result?.message || "Orchard collection attempt initiated");
      setOrchardCollectAmount("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to trigger Orchard collection");
    },
  });

  // ── Direct Debit ─────────────────────────────────────────────────────────
  const { data: ddConfig, isLoading: ddLoading } = useQuery({
    queryKey: ["dd-config"],
    queryFn: getDirectDebitConfig,
  });

  const ddMut = useMutation({
    mutationFn: updateDirectDebitConfig,
    onSuccess: () => { toast.success("Direct Debit settings saved"); qc.invalidateQueries({ queryKey: ["dd-config"] }); },
    onError: () => toast.error("Failed to save Direct Debit settings"),
  });

  const [productId, setProductId] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [debitTime, setDebitTime] = useState("08:00");
  const [retryAttempts, setRetryAttempts] = useState("3");
  const [noticedays, setNoticeDays] = useState("1,3");

  useEffect(() => {
    if (ddConfig) {
      setProductId(ddConfig.productId);
      setMerchantId(ddConfig.merchantId);
      setDebitTime(ddConfig.defaultDebitTime);
      setRetryAttempts(String(ddConfig.retryAttempts));
      setNoticeDays(ddConfig.daysToDebitDayNotice.join(","));
    }
  }, [ddConfig]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Disbursement Provider</CardTitle>
          <CardDescription>Which PSP actually sends the money when a loan is approved</CardDescription>
        </CardHeader>
        <CardContent>
          {providerLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-sm">Active provider</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Switching takes effect on the next loan approval — in-flight disbursements aren't affected.
                </p>
              </div>
              <Select
                value={activeProvider ?? "PAYSTACK"}
                onValueChange={(v) => providerMut.mutate(v as DisbursementProviderName)}
                disabled={!canWrite || providerMut.isPending}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAYSTACK">Paystack</SelectItem>
                  <SelectItem value="ORCHARD">Orchard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Collection Provider</CardTitle>
          <CardDescription>Which PSP the customer's USSD "Pay Now" (STK push) flow uses to collect repayments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {collectionProviderLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-sm">Active provider</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Switching takes effect on the next repayment attempt — in-flight collections aren't affected.
                </p>
              </div>
              <Select
                value={activeCollectionProvider ?? "PAYSTACK"}
                onValueChange={(v) => collectionProviderMut.mutate(v as CollectionProviderName)}
                disabled={!canWrite || collectionProviderMut.isPending}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAYSTACK">Paystack</SelectItem>
                  <SelectItem value="ORCHARD">Orchard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="font-medium text-sm mb-0.5">Trigger Collection</p>
            <p className="text-xs text-muted-foreground mb-3">
              Manually start a live collection attempt for any loan — the customer gets a MoMo PIN prompt on their phone, same as the USSD flow.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <Input
                placeholder="Loan reference (e.g. AM-BER-819-9YN)"
                value={collectLoanRef}
                onChange={(e) => setCollectLoanRef(e.target.value)}
                className="sm:col-span-2"
              />
              <Input
                type="number"
                placeholder="Amount (optional)"
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
              />
              <Select
                value={collectProviderOverride}
                onValueChange={(v) => setCollectProviderOverride(v as CollectionProviderName | "auto")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Active provider</SelectItem>
                  <SelectItem value="PAYSTACK">Paystack</SelectItem>
                  <SelectItem value="ORCHARD">Orchard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="mt-3"
              size="sm"
              disabled={!canWrite || !collectLoanRef.trim() || triggerCollectionMut.isPending}
              onClick={() =>
                triggerCollectionMut.mutate({
                  loanReference: collectLoanRef.trim().toUpperCase(),
                  amount: collectAmount ? Number(collectAmount) : undefined,
                  provider: collectProviderOverride === "auto" ? undefined : collectProviderOverride,
                })
              }
            >
              {triggerCollectionMut.isPending ? "Triggering..." : "Trigger Collection"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="uniwallet">
      <TabsList className="bg-muted p-1 mb-4">
        <TabsTrigger value="uniwallet" className="data-[state=active]:bg-card">UniWallet (STK Push)</TabsTrigger>
        <TabsTrigger value="directdebit" className="data-[state=active]:bg-card">Direct Debit</TabsTrigger>
        <TabsTrigger value="orchard" className="data-[state=active]:bg-card">Orchard</TabsTrigger>
      </TabsList>

      {/* ── UniWallet Tab ── */}
      <TabsContent value="uniwallet" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>UniWallet Configuration</CardTitle>
            <CardDescription>Control disbursements and STK push collections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {uwLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <>
                <ToggleRow
                  label="Disbursements Enabled"
                  description="Allow loan disbursements via UniWallet credit endpoint"
                  checked={uw?.disbursementEnabled ?? true}
                  onCheckedChange={v => uwMut.mutate({ disbursementEnabled: v })}
                  disabled={!canWrite || uwMut.isPending}
                />
                <ToggleRow
                  label="Collections Enabled (STK Push)"
                  description="Allow repayment collection via UniWallet debit endpoint"
                  checked={uw?.collectionsEnabled ?? true}
                  onCheckedChange={v => uwMut.mutate({ collectionsEnabled: v })}
                  disabled={!canWrite || uwMut.isPending}
                />
                <ToggleRow
                  label="Name Enquiry Enabled"
                  description="Verify MoMo name before disbursement"
                  checked={uw?.nameEnquiryEnabled ?? true}
                  onCheckedChange={v => uwMut.mutate({ nameEnquiryEnabled: v })}
                  disabled={!canWrite || uwMut.isPending}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Narrations</CardTitle>
            <CardDescription>What shows on the customer's MoMo statement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Disbursement Narration</Label>
              <div className="flex gap-2">
                <Input
                  value={disbNarr}
                  onChange={e => setDisbNarr(e.target.value)}
                  placeholder="Agenda Money Loan Disbursement"
                  disabled={!canWrite}
                />
                {canWrite && (
                  <Button
                    variant="outline"
                    disabled={uwMut.isPending}
                    onClick={() => uwMut.mutate({ disbursementNarration: disbNarr })}
                  >
                    Save
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Collection Narration</Label>
              <div className="flex gap-2">
                <Input
                  value={collNarr}
                  onChange={e => setCollNarr(e.target.value)}
                  placeholder="Agenda Money Loan Repayment"
                  disabled={!canWrite}
                />
                {canWrite && (
                  <Button
                    variant="outline"
                    disabled={uwMut.isPending}
                    onClick={() => uwMut.mutate({ collectionNarration: collNarr })}
                  >
                    Save
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {env && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm">Environment (read-only)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base URL</span>
                <span className="font-mono text-xs">{env.baseUrl || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment</span>
                <Badge variant="outline">{env.nodeEnv}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">API Key</span>
                <CredentialDot ok={env.apiKeyConfigured} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Transflow ID</span>
                <CredentialDot ok={env.transflowIdConfigured} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Disbursement Product</span>
                <CredentialDot ok={env.disbursementProductConfigured} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Collections Product</span>
                <CredentialDot ok={env.collectionsProductConfigured} />
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ── Direct Debit Tab ── */}
      <TabsContent value="directdebit" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Direct Debit Configuration</CardTitle>
            <CardDescription>ITC standing orders — auto-debit on loan due date</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ddLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <>
                <ToggleRow
                  label="Direct Debit Enabled"
                  description="Master switch — turns the entire direct debit feature on or off"
                  checked={ddConfig?.enabled ?? false}
                  onCheckedChange={v => ddMut.mutate({ enabled: v })}
                  disabled={!canWrite || ddMut.isPending}
                />
                <ToggleRow
                  label="Auto-Setup on Disbursement"
                  description="Automatically send a standing order request when a loan is disbursed"
                  checked={ddConfig?.autoSetupOnDisbursement ?? false}
                  onCheckedChange={v => ddMut.mutate({ autoSetupOnDisbursement: v })}
                  disabled={!canWrite || ddMut.isPending}
                />
                <ToggleRow
                  label="Hybrid Mode (Trigger Failed Debits)"
                  description="Allow admin to manually retry failed subscription debits via ITC"
                  checked={ddConfig?.triggerDebitStatus ?? true}
                  onCheckedChange={v => ddMut.mutate({ triggerDebitStatus: v })}
                  disabled={!canWrite || ddMut.isPending}
                />
                <ToggleRow
                  label="Pre-Debit Customer Notification"
                  description="ITC notifies the customer before debiting (recommended)"
                  checked={ddConfig?.notificationStatus ?? true}
                  onCheckedChange={v => ddMut.mutate({ notificationStatus: v })}
                  disabled={!canWrite || ddMut.isPending}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ITC Credentials</CardTitle>
            <CardDescription>Product and merchant identifiers from ITC onboarding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Product ID", value: productId, set: setProductId, key: "productId" as const, placeholder: "e.g. PROD_67890" },
              { label: "Merchant ID", value: merchantId, set: setMerchantId, key: "merchantId" as const, placeholder: "e.g. MERCH_12345" },
            ].map(({ label, value, set, key, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <div className="flex gap-2">
                  <Input value={value} onChange={e => set(e.target.value)} placeholder={placeholder} disabled={!canWrite} />
                  {canWrite && (
                    <Button variant="outline" disabled={ddMut.isPending} onClick={() => ddMut.mutate({ [key]: value })}>Save</Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Debit Schedule Defaults</CardTitle>
            <CardDescription>Default values used when setting up a standing order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Default Debit Time (24h)</Label>
              <div className="flex gap-2">
                <Input type="time" value={debitTime} onChange={e => setDebitTime(e.target.value)} className="w-36" disabled={!canWrite} />
                {canWrite && (
                  <Button variant="outline" disabled={ddMut.isPending} onClick={() => ddMut.mutate({ defaultDebitTime: debitTime })}>Save</Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Max Retry Attempts</Label>
              <div className="flex gap-2">
                <Input type="number" min={1} max={4} value={retryAttempts} onChange={e => setRetryAttempts(e.target.value)} className="w-24" disabled={!canWrite} />
                {canWrite && (
                  <Button variant="outline" disabled={ddMut.isPending} onClick={() => ddMut.mutate({ retryAttempts: parseInt(retryAttempts) })}>Save</Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">ITC charges extra for more than 4 retries</p>
            </div>
            <div className="space-y-1.5">
              <Label>Days-Before-Debit Notification</Label>
              <div className="flex gap-2">
                <Input value={noticedays} onChange={e => setNoticeDays(e.target.value)} placeholder="1,3" className="w-36" disabled={!canWrite} />
                {canWrite && (
                  <Button variant="outline" disabled={ddMut.isPending} onClick={() => ddMut.mutate({ daysToDebitDayNotice: noticedays.split(",").map(s => s.trim()).filter(Boolean) })}>Save</Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Comma-separated days before debit date (e.g. 1,3 = notify 3 days and 1 day before)</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Orchard Tab ── */}
      <TabsContent value="orchard" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Orchard Products</CardTitle>
            <CardDescription>Enable each product only once it's sandbox-verified — all default off</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {orchardLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <>
                <ToggleRow
                  label="Disbursement Enabled"
                  description="Allow loan disbursements via Orchard (MTC)"
                  checked={orchard?.disbursementEnabled ?? false}
                  onCheckedChange={v => orchardMut.mutate({ disbursementEnabled: v })}
                  disabled={!canWrite || orchardMut.isPending}
                />
                <ToggleRow
                  label="Auto-Debit Enabled"
                  description="Allow recurring repayment collection via Orchard's auto-debit mandates"
                  checked={orchard?.autoDebitEnabled ?? false}
                  onCheckedChange={v => orchardMut.mutate({ autoDebitEnabled: v })}
                  disabled={!canWrite || orchardMut.isPending}
                />
                <ToggleRow
                  label="Airtime Top-Up Enabled"
                  description="Tier 2 product — not yet built"
                  checked={orchard?.airtimeEnabled ?? false}
                  onCheckedChange={v => orchardMut.mutate({ airtimeEnabled: v })}
                  disabled={!canWrite || orchardMut.isPending}
                />
                <ToggleRow
                  label="Bill Pay Enabled"
                  description="Tier 2 product — not yet built"
                  checked={orchard?.billPayEnabled ?? false}
                  onCheckedChange={v => orchardMut.mutate({ billPayEnabled: v })}
                  disabled={!canWrite || orchardMut.isPending}
                />
                <ToggleRow
                  label="Remittance Enabled"
                  description="Tier 2 product — not yet built"
                  checked={orchard?.remittanceEnabled ?? false}
                  onCheckedChange={v => orchardMut.mutate({ remittanceEnabled: v })}
                  disabled={!canWrite || orchardMut.isPending}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual Collection</CardTitle>
            <CardDescription>Trigger a one-off Orchard CTM charge against any loan — the customer gets a MoMo PIN prompt on their phone</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                placeholder="Loan reference (e.g. AM-BER-819-9YN)"
                value={orchardCollectLoanRef}
                onChange={(e) => setOrchardCollectLoanRef(e.target.value)}
                className="sm:col-span-2"
              />
              <Input
                type="number"
                placeholder="Amount (defaults to outstanding balance)"
                value={orchardCollectAmount}
                onChange={(e) => setOrchardCollectAmount(e.target.value)}
              />
            </div>
            <Button
              className="mt-3"
              size="sm"
              disabled={!canWrite || !orchardCollectLoanRef.trim() || orchardCollectMut.isPending}
              onClick={() =>
                orchardCollectMut.mutate({
                  loanReference: orchardCollectLoanRef.trim().toUpperCase(),
                  amount: orchardCollectAmount ? Number(orchardCollectAmount) : undefined,
                })
              }
            >
              {orchardCollectMut.isPending ? "Triggering..." : "Trigger Orchard Collection"}
            </Button>
          </CardContent>
        </Card>

        {orchardEnv && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm">Environment (read-only)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base URL</span>
                <span className="font-mono text-xs">{orchardEnv.baseUrl || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment</span>
                <Badge variant="outline">{orchardEnv.nodeEnv}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Client ID</span>
                <CredentialDot ok={orchardEnv.clientIdConfigured} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Client Secret</span>
                <CredentialDot ok={orchardEnv.clientSecretConfigured} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Service ID</span>
                <CredentialDot ok={orchardEnv.serviceIdConfigured} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Webhook Secret (ours)</span>
                <CredentialDot ok={orchardEnv.webhookSecretConfigured} />
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
    </div>
  );
}

function SystemJobsPanel({ canWrite }: { canWrite: boolean }) {
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<Record<string, number> | null>(null);
  const [overdueLoading, setOverdueLoading] = useState(false);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);

  const { data: failedJobs, refetch: refetchFailed } = useQuery({
    queryKey: ["system", "failed-jobs"],
    queryFn: () => api.get("/api/admin/system/jobs/failed").then((r) => r.data),
    refetchInterval: 15_000,
  });

  const totalFailed = (failedJobs?.shortQueue ?? 0) + (failedJobs?.longQueue ?? 0);

  const retryFailedJobs = async (queue: "short" | "long" | "all") => {
    setRetryLoading(true);
    try {
      const res = await api.post("/api/admin/system/jobs/retry-failed", { queue });
      const results = res.data.results as Record<string, { retried: number }>;
      const total = Object.values(results).reduce((s, r) => s + r.retried, 0);
      toast.success(`${total} failed job${total !== 1 ? "s" : ""} re-queued.`);
      refetchFailed();
    } catch {
      toast.error("Failed to retry jobs. Check server logs.");
    } finally {
      setRetryLoading(false);
    }
  };

  const runCleanup = async () => {
    setCleanupLoading(true);
    setCleanupResult(null);
    try {
      const res = await api.post("/api/admin/system/jobs/storage-cleanup");
      setCleanupResult(res.data.result);
      toast.success("Storage cleanup completed.");
    } catch {
      toast.error("Storage cleanup failed. Check server logs.");
    } finally {
      setCleanupLoading(false);
    }
  };

  const runOverdueCheck = async () => {
    setOverdueLoading(true);
    try {
      await api.post("/api/admin/system/jobs/overdue-check");
      toast.success("Overdue check enqueued — runs in the background.");
    } catch {
      toast.error("Failed to enqueue overdue check.");
    } finally {
      setOverdueLoading(false);
    }
  };

  const runScoreBatch = async () => {
    setScoreLoading(true);
    try {
      await api.post("/api/admin/system/jobs/score-batch");
      toast.success("Score batch refresh enqueued — may take a few minutes.");
    } catch {
      toast.error("Failed to enqueue score refresh.");
    } finally {
      setScoreLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 mt-0.5">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Storage Cleanup</CardTitle>
              <CardDescription>
                Strips recipients from completed campaigns, purges CSA activity
                logs (90d), eligibility traces (60d), and admin audit logs (90d).
                Never touches loans, users, repayments, or financial records.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {cleanupResult && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
              <p className="font-medium text-muted-foreground mb-3">Last run result</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                {[
                  ["Campaign recipient arrays stripped", cleanupResult.campaignRecipients],
                  ["CSA activity records deleted", cleanupResult.collectionActivities],
                  ["Eligibility audit logs deleted", cleanupResult.eligibilityAuditLogs],
                  ["Admin audit logs deleted", cleanupResult.auditLogs],
                ].map(([label, val]) => (
                  <>
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono font-semibold">{val}</span>
                  </>
                ))}
              </div>
            </div>
          )}
          {canWrite && (
            <Button
              onClick={runCleanup}
              disabled={cleanupLoading}
              variant="outline"
              className="border-orange-500/40 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20"
            >
              {cleanupLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running...</>
              ) : (
                <><Database className="h-4 w-4 mr-2" />Run Now</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-600 mt-0.5">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Overdue Loan Check</CardTitle>
              <CardDescription>
                Re-runs the daily overdue status check across all active loans.
                Enqueues in the background — safe to run at any time.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {canWrite && (
            <Button onClick={runOverdueCheck} disabled={overdueLoading} variant="outline">
              {overdueLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enqueuing...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" />Run Now</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 mt-0.5">
              <BarChart2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Credit Score Batch Refresh</CardTitle>
              <CardDescription>
                Recalculates credit scores for all users. Enqueues in the
                background — may take several minutes to complete.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {canWrite && (
            <Button onClick={runScoreBatch} disabled={scoreLoading} variant="outline">
              {scoreLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enqueuing...</>
              ) : (
                <><BarChart2 className="h-4 w-4 mr-2" />Run Now</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className={totalFailed > 0 ? "border-red-500/40" : ""}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg mt-0.5 ${totalFailed > 0 ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <CardTitle>Failed Jobs</CardTitle>
                {failedJobs && (
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-semibold ${
                    totalFailed > 0
                      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                      : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                  }`}>
                    {totalFailed === 0 ? "All clear" : `${totalFailed} failed`}
                  </span>
                )}
              </div>
              <CardDescription>
                SMS, overdue checks, and other background jobs that have exhausted
                retries. Fix the underlying issue first, then retry.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {failedJobs && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between">
                <span className="text-muted-foreground">Short queue (SMS)</span>
                <span className="font-mono font-bold">{failedJobs.shortQueue}</span>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between">
                <span className="text-muted-foreground">Long queue (batch jobs)</span>
                <span className="font-mono font-bold">{failedJobs.longQueue}</span>
              </div>
            </div>
          )}
          {canWrite && (
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => retryFailedJobs("short")}
                disabled={retryLoading || (failedJobs?.shortQueue ?? 0) === 0}
                variant="outline"
                className="border-red-500/40 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                {retryLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Retrying...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" />Retry SMS Jobs</>
                )}
              </Button>
              <Button
                onClick={() => retryFailedJobs("all")}
                disabled={retryLoading || totalFailed === 0}
                variant="outline"
              >
                {retryLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Retrying...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" />Retry All</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { user, updateProfile, canWrite } = useAuth();
  const { tab } = useParams();
  const navigate = useNavigate();
  const validTabs = ["profile", "general", "appearance", "notifications", "payments", "system"];
  const activeTab = validTabs.includes(tab ?? "") ? tab! : "profile";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [isAuthorizeModalOpen, setIsAuthorizeModalOpen] = useState(false);
  const [isInviteCsaModalOpen, setIsInviteCsaModalOpen] = useState(false);
  const [isInviteReportingModalOpen, setIsInviteReportingModalOpen] = useState(false);

  // General settings states
  const [platformName, setPlatformName] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [generalLoading, setGeneralLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const result = await updateProfile({ fullName, email });

      if (!result?.success) {
        const message =
          result?.message || "Failed to update profile. Please try again.";
        toast.error(message);
        return;
      }

      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(
        "An unexpected error occurred while updating your profile. Please try again.",
      );
    } finally {
      setProfileLoading(false);
    }
  };

  // Fetch general settings
  useQuery({
    queryKey: ["general-settings"],
    queryFn: async () => {
      const res = await api.get("/api/admin/settings/general");
      const data = res.data;
      setPlatformName(data.platformName || "");
      setSupportPhone(data.supportPhone || "");
      setSupportEmail(data.supportEmail || "");
      return data;
    },
  });

  // Placeholder for general settings save handler
  const handleSaveGeneral = async () => {
    setGeneralLoading(true);
    try {
      await api.post("/api/admin/settings/general", {
        platformName,
        supportPhone,
        supportEmail,
      });
      toast.success("General settings saved!");
    } catch (e: any) {
      if (e?.response?.status === 404) {
        toast.error("This feature isn't available yet — backend pending.");
      } else {
        toast.error("Failed to save general settings.");
      }
    } finally {
      setGeneralLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Configure loan tiers and platform settings
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => navigate(`/settings/${val}`)}
        >
          <TabsList className="bg-muted p-1 flex overflow-x-auto w-full sm:w-fit no-scrollbar">
            <TabsTrigger
              value="profile"
              className="data-[state=active]:bg-card"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="general"
              className="data-[state=active]:bg-card"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="data-[state=active]:bg-card"
            >
              Appearance
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-card"
            >
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="data-[state=active]:bg-card"
            >
              Payments
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="data-[state=active]:bg-card"
            >
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Manage your public profile and private information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>
                  {canWrite && (
                    <Button type="submit" disabled={profileLoading}>
                      {profileLoading ? "Saving..." : "Save Profile"}
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>

            <Card className="mt-6 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle>Admin Privileges</CardTitle>
                <CardDescription>
                  Authorize a new admin or higher-level agent to access this
                  platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canWrite && (
                  <Button onClick={() => setIsAuthorizeModalOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Authorize Admin
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6 border-pink-500/20 bg-pink-50/50 dark:bg-pink-950/10">
              <CardHeader>
                <CardTitle className="text-pink-600 dark:text-pink-400">CSR Agent Support</CardTitle>
                <CardDescription>
                  Invite a new Customer Service Representative to help manage collections and outreach.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canWrite && (
                  <Button onClick={() => setIsInviteCsaModalOpen(true)} className="bg-pink-600 hover:bg-pink-700 text-white">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite CSR Agent
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6 border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/10">
              <CardHeader>
                <CardTitle className="text-indigo-600 dark:text-indigo-400">Reporting Portal Access</CardTitle>
                <CardDescription>
                  Invite a new Reporting Viewer to access the read-only reporting dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canWrite && (
                  <Button onClick={() => setIsInviteReportingModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Reporting Viewer
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure general platform settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveGeneral();
                  }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label>Platform Name</Label>
                    <Input
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Support Phone</Label>
                    <Input
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Support Email</Label>
                    <Input
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                    />
                  </div>
                  {canWrite && (
                    <Button type="submit" disabled={generalLoading}>
                      {generalLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize the look and feel of the dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred color scheme
                  </p>
                  <ThemeSelector />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <PaymentsSettings canWrite={canWrite} />
          </TabsContent>

          <TabsContent value="system" className="mt-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">System Maintenance</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Run scheduled maintenance jobs on demand. These jobs also run
                automatically on their scheduled intervals.
              </p>
            </div>
            <SystemJobsPanel canWrite={canWrite} />
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <NotificationPreferences />

            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure SMS and notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Loan Disbursement SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Send SMS when loan is disbursed
                    </p>
                  </div>
                  <Switch defaultChecked disabled={!canWrite} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Payment Reminder SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Send reminders before due date
                    </p>
                  </div>
                  <Switch defaultChecked disabled={!canWrite} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Overdue Notification SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Send SMS when loan becomes overdue
                    </p>
                  </div>
                  <Switch defaultChecked disabled={!canWrite} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Repayment Confirmation SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Send confirmation after repayment
                    </p>
                  </div>
                  <Switch defaultChecked disabled={!canWrite} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AuthorizeAgentModal
        open={isAuthorizeModalOpen}
        onOpenChange={setIsAuthorizeModalOpen}
      />
      <InviteCsaModal 
        open={isInviteCsaModalOpen} 
        onOpenChange={setIsInviteCsaModalOpen}
      />
      <InviteReportingModal
        open={isInviteReportingModalOpen}
        onOpenChange={setIsInviteReportingModalOpen}
      />
    </DashboardLayout>
  );
}
