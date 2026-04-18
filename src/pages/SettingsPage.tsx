import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getVapidPublicKey, subscribeNotification, unsubscribeNotification } from "@/lib/api";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, Monitor, UserPlus, Bell, Smartphone } from "lucide-react";
import { AuthorizeAgentModal } from "@/components/agents/AuthorizeAgentModal";
import { InviteCsaModal } from "@/components/csa/InviteCsaModal";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

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
              : "border-border bg-card hover:border-primary/50"
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
    }
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
    
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      checkBrowserPushStatus();
    }
  }, []);

  useEffect(() => {
    if (statusResp) {
      // Prioritize browser state, use backend as backup if not already set or if explicitly different
      if (statusResp.whatsappNumber) setWhatsappNumber(statusResp.whatsappNumber);
    }
  }, [statusResp]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
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
        const vapidPublicKey = keyRes.publicKey || keyRes.data?.publicKey || keyRes.data || keyRes;
        
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
        toast.error(err?.response?.data?.error || "Failed to enable push notifications.");
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
            endpoint: subscription.endpoint
          });
          await subscription.unsubscribe();
        }
        setNotificationsEnabled(false);
        toast.success("Push notifications disabled.");
        refetchStatus();
      } catch (err: any) {
        toast.error(err?.response?.data?.error || "Failed to disable push notifications.");
        console.error(err);
      } finally {
        setIsSubscribing(false);
      }
    }
  };

  const saveWhatsapp = async () => {
    try {
      await api.post("/api/admin/notifications/whatsapp", { number: whatsappNumber });
      toast.success("WhatsApp number updated.");
      refetchStatus();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Failed to update WhatsApp number.");
    }
  };

  return (
    <Card className="mb-6 border-primary/20">
      <CardHeader>
        <CardTitle>Admin Notifications</CardTitle>
        <CardDescription>Receive secure alerts for verification requests, large payouts, and system issues.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">Browser Push Notifications</p>
              <p className="text-sm text-muted-foreground">Receive instant desktop alerts even when the app is closed.</p>
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
              <p className="text-sm text-muted-foreground">Receive critical system alerts via WhatsApp directly to your phone.</p>
            </div>
          </div>
          <div className="flex gap-3 pl-14">
            <Input 
              placeholder="e.g. +233200000000" 
              value={whatsappNumber} 
              onChange={(e) => setWhatsappNumber(e.target.value)} 
              className="max-w-xs"
              disabled={!canWrite}
            />
            {canWrite && <Button onClick={saveWhatsapp} className="bg-green-600 hover:bg-green-700">Save</Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user, updateProfile, canWrite } = useAuth();
  const [hasChanges, setHasChanges] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [isAuthorizeModalOpen, setIsAuthorizeModalOpen] = useState(false);
  const [isInviteCsaModalOpen, setIsInviteCsaModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSave = () => {
    // Save logic for other settings would go here
    setHasChanges(false);
    toast.success("Settings saved successfully");
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const result = await updateProfile({ fullName, email });

      if (!result?.success) {
        const message = result?.message || "Failed to update profile. Please try again.";
        toast.error(message);
        return;
      }

      toast.success("Profile updated successfully");
      setHasChanges(false);
    } catch (error) {
      toast.error(
        "An unexpected error occurred while updating your profile. Please try again."
      );
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure loan tiers and platform settings
            </p>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
              Save Changes
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="profile" className="data-[state=active]:bg-card">
              Profile
            </TabsTrigger>
            <TabsTrigger value="general" className="data-[state=active]:bg-card">
              General
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-card">
              Appearance
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-card">
              Notifications
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
                  Authorize a new admin or higher-level agent to access this platform.
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
                <div className="space-y-2">
                  <Label>Platform Name</Label>
                  <Input defaultValue="Agenda Money" />
                </div>
                <div className="space-y-2">
                  <Label>Support Phone</Label>
                  <Input defaultValue="+233 55 858 7833" />
                </div>
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input defaultValue="support@agendamoney.com" />
                </div>
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
    </DashboardLayout>
  );
}
