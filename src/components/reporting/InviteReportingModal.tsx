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
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import { Loader2, Check, UserPlus } from "lucide-react";

interface InviteReportingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const InviteReportingModal: React.FC<InviteReportingModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const resetForm = () => {
    setEmail("");
    setIsSuccess(false);
    submittingRef.current = false;
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const submittingRef = React.useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (submittingRef.current || loading) return;

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      toast.error("Please enter an email address");
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const response = await api.post("/api/reporting/auth/invite", { email: trimmedEmail });

      if (response.data.success || response.status === 200 || response.status === 201) {
        setIsSuccess(true);
        toast.success("Invitation Sent", {
          description: `Successfully sent a Reporting Viewer invite to ${trimmedEmail}.`,
        });
        if (onSuccess) {
            onSuccess();
        }
      } else {
        toast.error("Failed to send invitation.");
      }
    } catch (error: any) {
      console.error("Invite Reporting error:", error);
      toast.error(getFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-[425px] rounded-xl sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-indigo-600" />
            Invite Reporting Viewer
          </DialogTitle>
          <DialogDescription>
            Send an email invitation to a new Reporting Viewer. They will receive a link to set up their read-only portal access.
          </DialogDescription>
        </DialogHeader>

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reporting-email">User Email</Label>
              <Input
                id="reporting-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. viewer@agendamoney.com"
                required
              />
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invite...
                  </>
                ) : (
                  "Send Invite"
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
              <h3 className="text-lg font-medium">Invitation Sent!</h3>
              <p className="text-sm text-gray-500 max-w-[280px]">
                We've sent an invitation link to <strong>{email}</strong>. They can use it to create their Reporting Viewer account.
              </p>
            </div>

            <Button onClick={() => handleOpenChange(false)} className="w-full bg-indigo-600 hover:bg-indigo-700">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
