import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { editUser } from "@/lib/api";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface EditUserSheetProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  userPhone: string;
  userId: string;
  initialData: {
    fullName: string;
    surname?: string;
    email: string;
    address: string;
    region: string;
    employmentStatus: string;
    monthlyIncome?: string;
    kycStatus?: string;
  };
}

export function EditUserSheet({ isOpen, setIsOpen, userPhone, userId, initialData }: EditUserSheetProps) {
  const { canWrite } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ ...initialData, newMsisdn: "", reason: "" });

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...initialData, newMsisdn: "", reason: "" });
    }
  }, [isOpen, initialData]);

  const { mutate: handleEdit, isPending } = useMutation({
    mutationFn: (data: any) => editUser(userPhone, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      toast.success("User profile updated successfully");
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(getFriendlyErrorMessage(error));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newMsisdn && !/^[0-9+]{7,20}$/.test(formData.newMsisdn)) {
      toast.error("Invalid phone number format. Use 7-20 digits/plus.");
      return;
    }

    if (!formData.reason.trim()) {
      toast.error("Please provide a reason for this audit log.");
      return;
    }

    handleEdit(formData);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex flex-col h-full overflow-y-auto w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Edit Member Profile</SheetTitle>
          <SheetDescription>
            Update personal details, region, and employment status.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 mt-6">
          <div className="space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">First Name</Label>
                <Input 
                  id="fullName" 
                  value={formData.fullName} 
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Surname</Label>
                <Input 
                  id="surname" 
                  value={formData.surname || ""} 
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newMsisdn" className="text-amber-600">Change Phone Number (Cascade)</Label>
              <Input 
                id="newMsisdn" 
                placeholder="e.g. 233240000000"
                value={formData.newMsisdn} 
                onChange={(e) => setFormData({ ...formData, newMsisdn: e.target.value })} 
              />
              <p className="text-[10px] text-muted-foreground italic">Updating this will sync all loans and repayments to the new number.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input 
                id="address" 
                value={formData.address} 
                onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Select 
                value={formData.region} 
                onValueChange={(val) => setFormData({ ...formData, region: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Greater Accra">Greater Accra</SelectItem>
                  <SelectItem value="Ashanti">Ashanti</SelectItem>
                  <SelectItem value="Eastern">Eastern</SelectItem>
                  <SelectItem value="Central">Central</SelectItem>
                  <SelectItem value="Western">Western</SelectItem>
                  <SelectItem value="Volta">Volta</SelectItem>
                  <SelectItem value="Northern">Northern</SelectItem>
                  <SelectItem value="Upper East">Upper East</SelectItem>
                  <SelectItem value="Upper West">Upper West</SelectItem>
                  <SelectItem value="Bono">Bono</SelectItem>
                  <SelectItem value="Bono East">Bono East</SelectItem>
                  <SelectItem value="Ahafo">Ahafo</SelectItem>
                  <SelectItem value="Savannah">Savannah</SelectItem>
                  <SelectItem value="North East">North East</SelectItem>
                  <SelectItem value="Oti">Oti</SelectItem>
                  <SelectItem value="Western North">Western North</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employment">Employment Status</Label>
              <Select 
                value={formData.employmentStatus} 
                onValueChange={(val) => setFormData({ ...formData, employmentStatus: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Employed">Employed</SelectItem>
                  <SelectItem value="Self-employed">Self-employed</SelectItem>
                  <SelectItem value="Unemployed">Unemployed</SelectItem>
                  <SelectItem value="Student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyIncome">Monthly Income</Label>
              <Input 
                id="monthlyIncome" 
                value={formData.monthlyIncome || ""} 
                onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })} 
              />
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="reason" className="text-red-500 font-bold">Reason for Change (Audit Log) *</Label>
              <Input 
                id="reason" 
                placeholder="Required for security audit..."
                value={formData.reason} 
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="border-red-200 focus:border-red-500"
                required
              />
            </div>
          </div>

          <SheetFooter className="mt-8 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => setIsOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !canWrite}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
