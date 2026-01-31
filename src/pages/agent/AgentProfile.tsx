import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Shield, Award, Loader2, Moon, Sun, Monitor, Bell } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export default function AgentProfile() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

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
    // API integration pending - backend endpoint not yet available
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setIsEditing(false);
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

  // Mock stats - replace with real data
  const stats = {
    totalSignups: 24,
    totalCommission: 1240,
    joinedDate: "2024-01-01",
    tier: "Gold Agent",
  };

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile, preferences, and notifications</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Agent Code Card */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Agent Code</p>
                    <p className="text-3xl font-bold font-mono tracking-wider">{user?.agentCode || "N/A"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Use this code for customer onboarding</p>
                  </div>
                </div>
                <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 text-sm py-1 px-3">
                  <Award className="h-4 w-4 mr-1" />
                  {stats.tier}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Performance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Signups</p>
                <p className="text-2xl font-bold mt-1">{stats.totalSignups}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Commission</p>
                <p className="text-2xl font-bold mt-1 text-green-600">₵{stats.totalCommission.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="text-2xl font-bold mt-1">
                  {new Date(stats.joinedDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your contact details and account info</CardDescription>
                </div>
                {!isEditing && (
                  <Button onClick={() => setIsEditing(true)} variant="outline">
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Full Name
                    </div>
                  </Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    disabled={!isEditing}
                    className={isEditing ? "" : "bg-muted"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Email Address
                    </div>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    disabled={!isEditing}
                    className={isEditing ? "" : "bg-muted"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Primary Phone
                    </div>
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phoneNumber}
                    onChange={(e) => updateField("phoneNumber", e.target.value)}
                    disabled={!isEditing}
                    className={isEditing ? "" : "bg-muted"}
                    maxLength={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="altPhone">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Alternate Phone
                    </div>
                  </Label>
                  <Input
                    id="altPhone"
                    value={formData.alternatePhone}
                    onChange={(e) => updateField("alternatePhone", e.target.value)}
                    disabled={!isEditing}
                    className={isEditing ? "" : "bg-muted"}
                    maxLength={10}
                  />
                </div>
              </div>

              {isEditing && (
                <Alert>
                  <AlertDescription>
                    Contact information changes will be verified by admin before being applied to your account.
                  </AlertDescription>
                </Alert>
              )}

              {isEditing && (
                <div className="flex gap-3 justify-end">
                  <Button onClick={handleCancel} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <Shield className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              For security reasons, you will be automatically logged out after 15 minutes of inactivity.
              Always log out when using a shared device.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme Preferences</CardTitle>
              <CardDescription>Customize how the agent portal looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Theme</Label>
                <div className="flex gap-3">
                  {themes.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200 flex-1",
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <CardTitle>Notification Settings</CardTitle>
              </div>
              <CardDescription>Manage how you receive updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications" className="font-medium">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive real-time notifications for new signups</p>
                </div>
                <Switch
                  id="notifications"
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notif" className="font-medium">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Get daily summaries via email</p>
                </div>
                <Switch
                  id="email-notif"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sound" className="font-medium">Sound Alerts</Label>
                  <p className="text-sm text-muted-foreground">Play sound when new users verify KYC</p>
                </div>
                <Switch
                  id="sound"
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
