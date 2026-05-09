import React, { useState } from "react";
import { PageShell } from "../../components/layout/PageShell";
import { Settings2, Save, Power, Info, AlertTriangle, MessageSquare, Wallet, Gift, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useRewardTiers, useUpdateRewardTier } from "@/hooks/useRewardTiers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RewardTiersPage() {
  const { data: tiers, isLoading } = useRewardTiers();
  const updateTier = useUpdateRewardTier();
  
  const [editingTier, setEditingTier] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    airtimeAmount: 0,
    momoAmount: 0,
    smsTemplate: "",
    senderId: "",
    isActive: false
  });

  const handleEdit = (tier: any) => {
    setEditingTier(tier.tier);
    setFormData({
      airtimeAmount: tier.airtimeAmount,
      momoAmount: tier.momoAmount,
      smsTemplate: tier.smsTemplate,
      senderId: tier.senderId,
      isActive: tier.isActive
    });
  };

  const handleSave = async () => {
    if (editingTier === null) return;
    
    try {
      await updateTier.mutateAsync({ 
        tier: editingTier, 
        updates: formData 
      });
      toast.success(`Tier L${editingTier} configuration updated.`);
      setEditingTier(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update tier");
    }
  };

  const toggleStatus = async (tier: any) => {
    try {
      await updateTier.mutateAsync({ 
        tier: tier.tier, 
        updates: { isActive: !tier.isActive } 
      });
      toast.success(`Tier L${tier.tier} ${!tier.isActive ? "activated" : "deactivated"}.`);
    } catch (error: any) {
      toast.error("Failed to toggle status");
    }
  };

  if (isLoading) {
    return (
      <PageShell title="Reward Tiers" description="Loading configurations..." icon={Settings2}>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell 
      title="Reward Tiers Configuration" 
      description="Manage loyalty milestones, payout amounts, and SMS templates for each user tier." 
      icon={Settings2}
    >
      <div className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {tiers?.map((tier) => (
            <Card 
              key={tier.tier} 
              className={cn(
                "relative overflow-hidden transition-all border-2", 
                editingTier === tier.tier ? "border-primary ring-2 ring-primary/20" : tier.isActive ? "border-emerald-100" : "opacity-70 grayscale-[0.5]"
              )}
            >
              <div className={cn("absolute top-0 right-0 p-3")}>
                <Switch 
                  checked={tier.isActive} 
                  onCheckedChange={() => toggleStatus(tier)}
                />
              </div>
              <CardHeader>
                <div className="flex items-center gap-2">
                   <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black">
                      L{tier.tier}
                   </div>
                   <div>
                     <CardTitle className="text-lg">{tier.label}</CardTitle>
                     <Badge variant={tier.isActive ? "secondary" : "outline"} className="text-[10px] uppercase">
                       {tier.isActive ? "Active" : "Disabled"}
                     </Badge>
                   </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-muted/50">
                       <p className="text-[9px] font-bold text-muted-foreground uppercase">Airtime</p>
                       <p className="text-sm font-black">GHS {tier.airtimeAmount}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                       <p className="text-[9px] font-bold text-muted-foreground uppercase">MoMo</p>
                       <p className="text-sm font-black">GHS {tier.momoAmount}</p>
                    </div>
                 </div>
                 <Button 
                  variant={editingTier === tier.tier ? "default" : "outline"} 
                  className="w-full text-xs"
                  onClick={() => handleEdit(tier)}
                 >
                   {editingTier === tier.tier ? "Editing..." : "Edit Configuration"}
                 </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {editingTier && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 border-primary/20 bg-primary/[0.02]">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configure Tier L{editingTier}</CardTitle>
                  <CardDescription>Adjust payout logic and communication templates.</CardDescription>
                </div>
                <div className="flex gap-2">
                   <Button variant="ghost" onClick={() => setEditingTier(null)}>Cancel</Button>
                   <Button onClick={handleSave} disabled={updateTier.isPending}>
                     {updateTier.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                     Save Changes
                   </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
               <div className="grid gap-6 lg:grid-cols-3">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                       <Gift className="h-4 w-4 text-primary" />
                       Reward Amounts
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Airtime Amount (GHS)</Label>
                        <Input 
                          type="number" 
                          value={formData.airtimeAmount} 
                          onChange={(e) => setFormData({...formData, airtimeAmount: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>MoMo Amount (GHS)</Label>
                        <Input 
                          type="number" 
                          value={formData.momoAmount} 
                          onChange={(e) => setFormData({...formData, momoAmount: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 lg:col-span-2">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                       <MessageSquare className="h-4 w-4 text-primary" />
                       Communication Template
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div className="sm:col-span-1 space-y-2">
                        <Label>Sender ID</Label>
                        <Input 
                          value={formData.senderId} 
                          onChange={(e) => setFormData({...formData, senderId: e.target.value})}
                          placeholder="AGENDA"
                        />
                      </div>
                      <div className="sm:col-span-3 space-y-2">
                        <Label>SMS Template</Label>
                        <Textarea 
                          value={formData.smsTemplate} 
                          onChange={(e) => setFormData({...formData, smsTemplate: e.target.value})}
                          className="min-h-32"
                          placeholder="Hi [firstname], you've reached L4! Enjoy your GHS 5 airtime reward."
                        />
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                           <p>Use <strong>[firstname]</strong> for personalization.</p>
                           <p>{formData.smsTemplate.length} chars</p>
                        </div>
                      </div>
                    </div>
                  </div>
               </div>

               <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-6">
                 <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                       <Info className="h-5 w-5" />
                    </div>
                    <div>
                       <h4 className="font-bold text-blue-900">Config Tips</h4>
                       <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                         Changing these values will affect all future reward triggers. It does not retroactively change 
                         amounts for rewards already queued or sent. Ensure the SMS template fits within 160 characters 
                         to avoid double billing.
                       </p>
                    </div>
                 </div>
               </div>
            </CardContent>
          </Card>
        )}

        {!editingTier && (
          <div className="rounded-lg border border-dashed p-12 text-center">
             <Settings2 className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
             <h3 className="font-bold text-muted-foreground">Select a tier card above to start editing.</h3>
             <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto mt-2">
               You can also toggle tiers on/off to hide them from the reward trigger screens.
             </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
