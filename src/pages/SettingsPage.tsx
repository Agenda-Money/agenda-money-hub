import { useState } from "react";
import { useTheme } from "next-themes";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

interface TierConfig {
  id: string;
  name: string;
  enabled: boolean;
  minAmount: number;
  maxAmount: number;
  tenures: number[];
  interestRate: number;
  processingFee: number;
  loansRequired: number;
  onTimeRequired: number;
}

const defaultTiers: TierConfig[] = [
  { id: "L1", name: "Tier L1", enabled: true, minAmount: 50, maxAmount: 200, tenures: [7, 14], interestRate: 10, processingFee: 5, loansRequired: 0, onTimeRequired: 0 },
  { id: "L2", name: "Tier L2", enabled: true, minAmount: 100, maxAmount: 500, tenures: [7, 14, 21], interestRate: 8, processingFee: 10, loansRequired: 2, onTimeRequired: 2 },
  { id: "L3", name: "Tier L3", enabled: true, minAmount: 200, maxAmount: 1000, tenures: [14, 21, 30], interestRate: 7, processingFee: 15, loansRequired: 5, onTimeRequired: 4 },
  { id: "L4", name: "Tier L4", enabled: true, minAmount: 500, maxAmount: 2000, tenures: [21, 30], interestRate: 6, processingFee: 20, loansRequired: 10, onTimeRequired: 8 },
  { id: "L5", name: "Tier L5", enabled: false, minAmount: 1000, maxAmount: 5000, tenures: [30, 45, 60], interestRate: 5, processingFee: 25, loansRequired: 20, onTimeRequired: 18 },
];

const availableTenures = [1, 5, 7, 10, 14, 21, 30, 45, 60];

const tierColors: Record<string, string> = {
  L1: "border-muted-foreground",
  L2: "border-info",
  L3: "border-primary",
  L4: "border-success",
  L5: "border-warning",
};

function TierConfigCard({ tier, onUpdate }: { tier: TierConfig; onUpdate: (tier: TierConfig) => void }) {
  return (
    <Card className={cn("transition-opacity", !tier.enabled && "opacity-60")}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                "text-sm font-semibold px-3 py-1",
                tierColors[tier.id]
              )}
            >
              {tier.id}
            </Badge>
            <CardTitle className="text-lg">{tier.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`enabled-${tier.id}`} className="text-sm text-muted-foreground">
              Enabled
            </Label>
            <Switch
              id={`enabled-${tier.id}`}
              checked={tier.enabled}
              onCheckedChange={(enabled) => onUpdate({ ...tier, enabled })}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Min Amount (GHS)</Label>
            <Input
              type="number"
              value={tier.minAmount}
              onChange={(e) => onUpdate({ ...tier, minAmount: parseInt(e.target.value) || 0 })}
              disabled={!tier.enabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Amount (GHS)</Label>
            <Input
              type="number"
              value={tier.maxAmount}
              onChange={(e) => onUpdate({ ...tier, maxAmount: parseInt(e.target.value) || 0 })}
              disabled={!tier.enabled}
            />
          </div>
        </div>

        {/* Tenures */}
        <div className="space-y-2">
          <Label>Allowed Tenures (days)</Label>
          <div className="flex flex-wrap gap-3">
            {availableTenures.map((tenure) => (
              <div key={tenure} className="flex items-center gap-2">
                <Checkbox
                  id={`tenure-${tier.id}-${tenure}`}
                  checked={tier.tenures.includes(tenure)}
                  disabled={!tier.enabled}
                  onCheckedChange={(checked) => {
                    const newTenures = checked
                      ? [...tier.tenures, tenure].sort((a, b) => a - b)
                      : tier.tenures.filter((t) => t !== tenure);
                    onUpdate({ ...tier, tenures: newTenures });
                  }}
                />
                <Label
                  htmlFor={`tenure-${tier.id}-${tenure}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {tenure}d
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Rates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Interest Rate (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={tier.interestRate}
              onChange={(e) => onUpdate({ ...tier, interestRate: parseFloat(e.target.value) || 0 })}
              disabled={!tier.enabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Processing Fee (GHS)</Label>
            <Input
              type="number"
              value={tier.processingFee}
              onChange={(e) => onUpdate({ ...tier, processingFee: parseInt(e.target.value) || 0 })}
              disabled={!tier.enabled}
            />
          </div>
        </div>

        {/* Unlock Criteria */}
        <div className="pt-4 border-t border-border">
          <Label className="text-sm font-semibold text-muted-foreground mb-3 block">
            UNLOCK CRITERIA
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Loans Completed Required</Label>
              <Input
                type="number"
                value={tier.loansRequired}
                onChange={(e) => onUpdate({ ...tier, loansRequired: parseInt(e.target.value) || 0 })}
                disabled={!tier.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label>On-Time Repayments Required</Label>
              <Input
                type="number"
                value={tier.onTimeRequired}
                onChange={(e) => onUpdate({ ...tier, onTimeRequired: parseInt(e.target.value) || 0 })}
                disabled={!tier.enabled}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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

export default function SettingsPage() {
  const [tiers, setTiers] = useState(defaultTiers);
  const [hasChanges, setHasChanges] = useState(false);

  const updateTier = (updatedTier: TierConfig) => {
    setTiers(tiers.map((t) => (t.id === updatedTier.id ? updatedTier : t)));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Save logic here
    setHasChanges(false);
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
        <Tabs defaultValue="tiers">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="tiers" className="data-[state=active]:bg-card">
              Tier Configuration
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

          <TabsContent value="tiers" className="space-y-4 mt-4">
            {tiers.map((tier) => (
              <TierConfigCard key={tier.id} tier={tier} onUpdate={updateTier} />
            ))}
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
                  <Input defaultValue="+233 20 000 0000" />
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
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Payment Reminder SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Send reminders before due date
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Overdue Notification SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Send SMS when loan becomes overdue
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Repayment Confirmation SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Send confirmation after repayment
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
