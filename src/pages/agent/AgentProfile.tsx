import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { User, Mail, Phone, Loader2, Moon, Sun, Monitor, Bell, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getAgentMyStats } from "@/lib/api";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

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
    queryFn: async () => {
      const res = await getAgentMyStats();
      return res.data || res;
    },
    enabled: !!user?.email,
  });

  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phoneNumber: user?.phoneNumber || "",
    alternatePhone: user?.alternatePhone || "",
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setIsEditing(false);
    toast.success("Profile updated successfully");
  };

  const handleCancel = () => {
    setFormData({
      fullName: user?.fullName || "",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
      alternatePhone: user?.alternatePhone || "",
    });
    setIsEditing(false);
  };

  const copyAgentCode = () => {
    const agentCode = dashboardStats?.agentCode || user?.agentCode;
    if (agentCode) {
      navigator.clipboard.writeText(agentCode);
      setCopied(true);
      toast.success("Agent code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const stats = {
    totalSignups: dashboardStats?.portfolio?.metrics?.signUpsAllTime ?? dashboardStats?.metrics?.signUpsAllTime ?? 0,
    activeLoans: dashboardStats?.portfolio?.metrics?.loansActive ?? dashboardStats?.portfolio?.loansActive ?? 0,
  };

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "Auto", icon: Monitor },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile, preferences, and notifications</p>
      </motion.div>

      <Tabs defaultValue="profile" className="space-y-6">
        <motion.div variants={itemVariants}>
          <TabsList className="grid w-full grid-cols-3 h-12 p-1 bg-muted/50">
            <TabsTrigger value="profile" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="h-4 w-4 mr-2 hidden sm:inline" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Sun className="h-4 w-4 mr-2 hidden sm:inline" />
              Theme
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Bell className="h-4 w-4 mr-2 hidden sm:inline" />
              Alerts
            </TabsTrigger>
          </TabsList>
        </motion.div>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Agent Code Hero Card - Cleaned up */}
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="h-2 bg-gradient-pink" />
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground">Your Agent Code</p>
                  <p className="text-2xl sm:text-3xl font-bold font-mono tracking-wider text-foreground">
                    {dashboardStats?.agentCode || user?.agentCode || "N/A"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg font-medium border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1 w-full max-w-xs justify-center"
                    onClick={() => {
                      const nodeCode = dashboardStats?.agentCode || user?.agentCode || "";
                      const url = nodeCode ? `https://apply.agendamoney.com/${nodeCode}` : "https://apply.agendamoney.com/";
                      const text = `Join Agenda Money with my referral link: ${url}`;
                      if (globalThis.navigator.share) {
                        // Only use text to avoid duplication on platforms like WhatsApp/Telegram
                        globalThis.navigator.share({ title: 'Agenda Money Referral', text });
                      } else {
                        // Only include the message with the link once
                        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                        globalThis.open(whatsappUrl, '_blank');
                      }
                    }}
                    title="Share via WhatsApp or other apps"
                  >
                    <span className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-emerald-600" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.031-.967-.273-.099-.472-.148-.67.15-.198.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.007-.372-.009-.571-.009-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.099 3.205 5.077 4.372.71.306 1.263.489 1.695.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor"/><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/></svg>
                      Share Referral Link
                    </span>
                  </Button>
                  <span className="text-xs text-muted-foreground mt-2 mb-1 w-full max-w-xs block">Share this with customers during onboarding</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Performance Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-0 shadow-md">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Signups</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalSignups}</p>
                <p className="text-xs text-emerald-600 mt-1">Customers onboarded so far</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Active Loans</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.activeLoans}</p>
                <p className="text-xs text-muted-foreground mt-1">Current customer loans in progress</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Personal Information */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">Personal Information</CardTitle>
                    <CardDescription>Your contact details and account info</CardDescription>
                  </div>
                  {!isEditing && (
                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                      disabled={!isEditing}
                      className={cn(
                        "h-12 transition-colors",
                        isEditing ? "bg-background" : "bg-muted/50 border-transparent"
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      disabled={!isEditing}
                      className={cn(
                        "h-12 transition-colors",
                        isEditing ? "bg-background" : "bg-muted/50 border-transparent"
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      Primary Phone
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phoneNumber}
                      onChange={(e) => updateField("phoneNumber", e.target.value)}
                      disabled={!isEditing}
                      className={cn(
                        "h-12 transition-colors",
                        isEditing ? "bg-background" : "bg-muted/50 border-transparent"
                      )}
                      maxLength={10}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="altPhone" className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      Alternate Phone
                    </Label>
                    <Input
                      id="altPhone"
                      value={formData.alternatePhone}
                      onChange={(e) => updateField("alternatePhone", e.target.value)}
                      disabled={!isEditing}
                      placeholder="Optional"
                      className={cn(
                        "h-12 transition-colors",
                        isEditing ? "bg-background" : "bg-muted/50 border-transparent"
                      )}
                      maxLength={10}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                    <Button onClick={handleCancel} variant="outline" className="flex-1 sm:flex-none">
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none bg-gradient-pink hover:opacity-90">
                      {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Theme Preferences</CardTitle>
                <CardDescription>Choose how the portal looks to you</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {themes.map(({ value, label, icon: Icon }) => (
                    <motion.button
                      key={value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setTheme(value)}
                      className={cn(
                        "flex flex-col items-center gap-3 p-4 sm:p-6 rounded-xl border-2 transition-all duration-200",
                        theme === value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/30 hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-6 w-6 sm:h-8 sm:w-8" />
                      <span className="font-medium text-sm">{label}</span>
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Notification Preferences</CardTitle>
                <CardDescription>Control how you receive updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications" className="font-medium">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Real-time alerts for new signups</p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notif" className="font-medium">Email Summaries</Label>
                    <p className="text-sm text-muted-foreground">Daily digest of your activity</p>
                  </div>
                  <Switch
                    id="email-notif"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div className="space-y-0.5">
                    <Label htmlFor="sound" className="font-medium">Sound Alerts</Label>
                    <p className="text-sm text-muted-foreground">Audio cue when KYC is verified</p>
                  </div>
                  <Switch
                    id="sound"
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
