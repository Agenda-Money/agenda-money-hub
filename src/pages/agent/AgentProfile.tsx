import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { User, Mail, Phone, Shield, Loader2, Moon, Sun, Monitor, Bell, Copy, Check, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export default function AgentProfile() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const { data: dashboardStats } = useQuery({
    queryKey: ["agent-dashboard-stats", user?.email],
    queryFn: async () => { const res = await api.get("/api/agents/my-stats"); return res.data?.data || res.data; },
    enabled: !!user?.email,
  });

  const [formData, setFormData] = useState({
    fullName: user?.fullName || "", email: user?.email || "",
    phoneNumber: user?.phoneNumber || "", alternatePhone: user?.alternatePhone || "",
  });

  const updateField = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setIsEditing(false);
    toast.success("Profile updated");
  };

  const handleCancel = () => {
    setFormData({ fullName: user?.fullName || "", email: user?.email || "", phoneNumber: user?.phoneNumber || "", alternatePhone: user?.alternatePhone || "" });
    setIsEditing(false);
  };

  const copyAgentCode = () => {
    const code = dashboardStats?.agentCode || user?.agentCode;
    if (code) { navigator.clipboard.writeText(code); setCopied(true); toast.success("Copied!"); setTimeout(() => setCopied(false), 2000); }
  };

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "Auto", icon: Monitor },
  ];

  const fieldClass = "h-11 transition-colors rounded-xl";

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Profile, theme & notifications</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-10 p-0.5 bg-muted/50">
          <TabsTrigger value="profile" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">Profile</TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">Theme</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          {/* Agent Code */}
          <Card className="border shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-pink" />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-pink flex items-center justify-center shadow-pink">
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Agent Code</p>
                    <p className="text-xl font-bold font-mono tracking-wider text-foreground">{dashboardStats?.agentCode || user?.agentCode || "N/A"}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={copyAgentCode} className="h-9 w-9">
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Signups</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{dashboardStats?.metrics?.signUpsAllTime ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Active Loans</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{dashboardStats?.portfolio?.loansActive ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Personal Info */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Personal Info</CardTitle>
                  <CardDescription className="text-xs">Contact details</CardDescription>
                </div>
                {!isEditing && <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="h-8 text-xs rounded-lg">Edit</Button>}
              </div>
            </CardHeader>
            <CardContent className="px-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: "fullName", label: "Full Name", icon: User, value: formData.fullName },
                  { id: "email", label: "Email", icon: Mail, value: formData.email, type: "email" },
                  { id: "phoneNumber", label: "Phone", icon: Phone, value: formData.phoneNumber },
                  { id: "alternatePhone", label: "Alt Phone", icon: Phone, value: formData.alternatePhone },
                ].map((f) => (
                  <div key={f.id} className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><f.icon className="h-3 w-3" />{f.label}</Label>
                    <Input
                      value={f.value}
                      onChange={(e) => updateField(f.id, e.target.value)}
                      disabled={!isEditing}
                      type={f.type || "text"}
                      className={cn(fieldClass, isEditing ? "bg-background" : "bg-muted/50 border-transparent")}
                      maxLength={f.id.includes("Phone") ? 10 : undefined}
                    />
                  </div>
                ))}
              </div>
              {isEditing && (
                <div className="flex gap-2 pt-3 border-t">
                  <Button variant="outline" onClick={handleCancel} className="flex-1 h-10 rounded-xl text-xs">Cancel</Button>
                  <Button onClick={handleSave} disabled={isSaving} className="flex-1 h-10 rounded-xl bg-gradient-pink hover:opacity-90 text-xs">
                    {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Save
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Alert className="bg-warning/5 border-warning/20">
            <Shield className="h-3.5 w-3.5 text-warning" />
            <AlertDescription className="text-[11px] text-foreground/70">Auto-logout after 15 minutes of inactivity.</AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 px-4">
              <CardTitle className="text-base">Theme</CardTitle>
              <CardDescription className="text-xs">Choose your preferred appearance</CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              <div className="grid grid-cols-3 gap-2">
                {themes.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm",
                      theme === value ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted/30 hover:border-primary/50 text-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 px-4">
              <CardTitle className="text-base">Notifications</CardTitle>
              <CardDescription className="text-xs">Control your alerts</CardDescription>
            </CardHeader>
            <CardContent className="px-4 space-y-3">
              {[
                { id: "notifications", label: "Push Notifications", desc: "Real-time alerts", checked: notificationsEnabled, onChange: setNotificationsEnabled },
                { id: "email-notif", label: "Email Summaries", desc: "Daily digest", checked: emailNotifications, onChange: setEmailNotifications },
                { id: "sound", label: "Sound Alerts", desc: "Audio on KYC verify", checked: soundEnabled, onChange: setSoundEnabled },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div>
                    <Label htmlFor={item.id} className="font-medium text-sm">{item.label}</Label>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch id={item.id} checked={item.checked} onCheckedChange={item.onChange} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
