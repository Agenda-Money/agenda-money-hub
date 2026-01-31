import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AgentOnboarding() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    ghanaCardNumber: "",
    phoneNumber: "",
    nodeCode: user?.agentCode || "",
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Customer Onboarding</h1>
        <p className="text-muted-foreground mt-1">Digital KYC Process - Coming Soon</p>
      </div>

      <Alert className="bg-amber-500/10 border-amber-500/30">
        <AlertDescription className="text-amber-800">
          The full 4-step onboarding wizard with Smile ID integration is under development.
          This placeholder page allows the application to compile successfully.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Enter customer details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              placeholder="John Kwame Mensah"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ghanaCard">Ghana Card Number</Label>
            <Input
              id="ghanaCard"
              value={formData.ghanaCardNumber}
              onChange={(e) => updateField("ghanaCardNumber", e.target.value.toUpperCase())}
              placeholder="GHA-XXXXXXXXX-X"
              maxLength={17}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phoneNumber}
              onChange={(e) => updateField("phoneNumber", e.target.value)}
              placeholder="0244123456"
              maxLength={10}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nodeCode">Agent Code</Label>
            <Input
              id="nodeCode"
              value={formData.nodeCode}
              disabled
              className="bg-muted"
            />
          </div>

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit (Placeholder)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
