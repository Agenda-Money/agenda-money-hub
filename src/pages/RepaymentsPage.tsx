import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoanInfo {
  id: string;
  user: string;
  amount: number;
  remaining: number;
  dueDate: string;
}

import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function RepaymentsPage() {
  const [phone, setPhone] = useState("");
  const [loanInfo, setLoanInfo] = useState<LoanInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  const handleSearch = async () => {
    if (!phone) return;
    setIsSearching(true);
    
    // Attempt to find loan by user phone (mock logic for now as endpoint wasn't specified for search)
    // In a real scenario we might hit /api/admin/loans?search={phone}
    try {
      const res = await api.get("/api/admin/loans", { params: { search: phone, status: "active" } });
      const loans = res.data?.data || res.data?.loans || [];
      const userLoan = loans.find((l: any) => l.userMsisdn === phone || l.phone === phone);

      if (userLoan) {
        setLoanInfo({
          id: userLoan.loanReference || userLoan.id || userLoan._id,
          user: userLoan.user?.fullName  || userLoan.user || "Unknown",
          amount: userLoan.principal || userLoan.amount,
          remaining: (userLoan.totalPayable || 0) - (userLoan.amountRepaid || 0),
          dueDate: userLoan.dueDate || new Date().toISOString()
        });
      } else {
        toast.error("No active loan found for this number");
        setLoanInfo(null);
      }
    } catch (e) {
      console.error("Search failed", e);
      toast.error("Failed to search for loan");
    } finally {
      setIsSearching(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/api/admin/repayments/record", data);
      return res.data;
    },
    onSuccess: (data) => {
      setSubmitted(true);
      setResultData(data.data || data); // Store result for receipt
      toast.success(data.message || "Payment recorded successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to record payment");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !amount || !method || !reference) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    mutation.mutate({
      msisdn: phone,
      amount: parseFloat(amount),
      method: method.toUpperCase(),
      reference,
      notes
    });
  };

  if (submitted && resultData) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto mt-12 bg-card rounded-xl shadow-sm border border-border p-6 animate-fade-in">
          <div className="text-center pt-8 pb-8">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Payment Recorded!
            </h2>
            <p className="text-muted-foreground mb-6">
              {resultData.message || `Successfully recorded GHS ${Number(amount || 0).toFixed(2)} repayment`}
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 text-left mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                 <div>
                   <p className="text-muted-foreground">Status</p>
                   <Badge variant="outline" className="bg-success/5 text-success border-success/20 mt-1">
                     {resultData.status || "SUCCESS"}
                   </Badge>
                 </div>
                 <div>
                   <p className="text-muted-foreground">Repayment ID</p>
                   <p className="font-mono text-xs mt-1">{resultData.repaymentId || "N/A"}</p>
                 </div>
                 <div>
                   <p className="text-muted-foreground">Wallet Balance</p>
                   <p className="font-medium text-lg text-primary">GHS{resultData.walletBalance ?? "0.00"}</p>
                 </div>
                 <div>
                   <p className="text-muted-foreground">Remaining Loan Balance</p>
                   <p className="font-bold text-lg">GHS{resultData.remainingBalance ?? "0.00"}</p>
                 </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSubmitted(false);
                  setPhone("");
                  setAmount("");
                  setMethod("");
                  setReference("");
                  setNotes("");
                  setResultData(null);
                }}
              >
                New Repayment
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Record Repayment
          </h1>
          <p className="text-muted-foreground mt-1">
            Manually record a loan repayment
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Repayment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Phone Input */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="Enter customer phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (GHS)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter repayment amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="momo">Mobile Money (MoMo)</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reference */}
              <div className="space-y-2">
                <Label htmlFor="reference">Reference Number</Label>
                <Input
                  id="reference"
                  placeholder="Enter transaction reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={!phone || !amount || !method || !reference}
              >
                Record Payment
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
