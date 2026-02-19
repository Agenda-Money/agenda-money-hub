import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import api from "@/lib/api";
import { Loader2, Copy, Check } from "lucide-react";

interface CampaignGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CampaignGenerationModal: React.FC<CampaignGenerationModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [msisdn, setMsisdn] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setMsisdn("");
    setGeneratedCode(null);
    setCopied(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  // Use ref to prevent double submission race conditions immediately
  const submittingRef = React.useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Immediate check against ref
    if (submittingRef.current || loading) return;

    // Trim and validate against trimmed values to prevent whitespace-only inputs
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedMsisdn = msisdn.trim();

    if (!trimmedFirstName || !trimmedLastName || !trimmedMsisdn) {
      toast.error("Please fill in all fields");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setGeneratedCode(null);

    try {
      const response = await api.post("/api/admin/nodes/generate-campaign", {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        msisdn: trimmedMsisdn,
      });

      if (response.data.success || response.status === 201) {
        const code = response.data.data?.nodeCode || response.data.nodeCode || response.data.code;
        
        if (code) {
          setGeneratedCode(code);
          toast.success(`Node Code: ${code} Created!`, {
            description: "SMS invitation has been sent successfully.",
          });
        } else {
          toast.error("Campaign created but Node Code missing in response.");
        }
      } else {
        toast.error(response.data.message || "Failed to generate campaign");
      }
    } catch (error: any) {
      console.error("Campaign generation error:", error);
      if (error.response) {
        // Handle specific "Already Exists" error
        if (error.response.status === 400 && error.response.data?.message?.includes("already has a Node Code")) {
          toast.warning("Campaign Already Active", {
            description: "This user already has a generated marketing campaign/Node Code.",
          });
          return; // Don't show generic error
        }
      }
      toast.error(
        error.response?.data?.message || "Failed to generate campaign. Please try again."
      );
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const copyToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Marketing Campaign</DialogTitle>
          <DialogDescription>
            Create a pre-qualified user invitation. An SMS with the Node Code will be sent automatically.
          </DialogDescription>
        </DialogHeader>

        {!generatedCode ? (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Doe"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="msisdn">Phone Number</Label>
              <Input
                id="msisdn"
                value={msisdn}
                onChange={(e) => setMsisdn(e.target.value)}
                placeholder="e.g. 233500383499"
                required
              />
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Campaign"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-6 space-y-6">
            <div className="flex flex-col items-center justify-center space-y-2 text-center">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium">Campaign Created!</h3>
              <p className="text-sm text-gray-500 max-w-[250px]">
                The invitation has been sent to {firstName} {lastName}.
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between border">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                  Node Code
                </span>
                <p className="text-xl font-mono font-bold tracking-widest text-primary">
                  {generatedCode}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={copyToClipboard}
                className="h-10 w-10 hover:bg-background"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>

            <Button onClick={resetForm} className="w-full" variant="outline">
              Generate Another
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
