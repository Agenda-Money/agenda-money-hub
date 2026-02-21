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
import { Loader2, Check } from "lucide-react";

interface AuthorizeAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AuthorizeAgentModal: React.FC<AuthorizeAgentModalProps> = ({
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

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      toast.error("Please enter an email address");
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const response = await api.post("/api/admin/auth/authorize", {
        email: trimmedEmail,
        role: "agent",
      });

      if (response.data.success || response.status === 200 || response.status === 201) {
        setIsSuccess(true);
        toast.success("Admin Authorized", {
          description: `Successfully authorized ${trimmedEmail} as an admin.`,
        });
        if (onSuccess) {
            onSuccess();
        }
      } else {
        toast.error(response.data.message || "Failed to authorize admin");
      }
    } catch (error: any) {
      console.error("Authorize admin error:", error);
      toast.error(
        error.response?.data?.message || "Failed to authorize admin. Please try again."
      );
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-[425px] rounded-xl sm:w-full">
        <DialogHeader>
          <DialogTitle>Authorize Admin</DialogTitle>
          <DialogDescription>
            Grant an existing user admin privileges. They must register with this email.
          </DialogDescription>
        </DialogHeader>

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. baowusu-dankwah@st.ug.edu.gh"
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
                    Authorizing...
                  </>
                ) : (
                  "Authorize"
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
              <h3 className="text-lg font-medium">Authorization Successful!</h3>
              <p className="text-sm text-gray-500 max-w-[250px]">
                The user {email} has been granted admin privileges.
              </p>
            </div>

            <Button onClick={() => handleOpenChange(false)} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
