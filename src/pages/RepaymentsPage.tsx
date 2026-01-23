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
import { CheckCircle2, Search, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoanInfo {
  id: string;
  user: string;
  amount: number;
  remaining: number;
  dueDate: string;
}

export default function RepaymentsPage() {
  const [phone, setPhone] = useState("");
  const [loanInfo, setLoanInfo] = useState<LoanInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSearch = () => {
    setIsSearching(true);
    // Simulated search
    setTimeout(() => {
      if (phone === "0244123456") {
        setLoanInfo({
          id: "LN001",
          user: "Kwame Asante",
          amount: 500,
          remaining: 320,
          dueDate: "2024-01-29",
        });
      } else if (phone) {
        setLoanInfo({
          id: "LN005",
          user: "Phone User",
          amount: 350,
          remaining: 200,
          dueDate: "2024-02-05",
        });
      }
      setIsSearching(false);
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto mt-12">
          <Card className="text-center">
            <CardContent className="pt-12 pb-8">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Payment Recorded!
              </h2>
              <p className="text-muted-foreground mb-6">
                Successfully recorded ₵{amount} repayment for {loanInfo?.user}
              </p>
              <div className="bg-muted/50 rounded-lg p-4 text-left mb-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Reference</p>
                    <p className="font-medium">{reference}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Method</p>
                    <p className="font-medium capitalize">{method}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Loan ID</p>
                    <p className="font-medium">{loanInfo?.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">New Balance</p>
                    <p className="font-medium">
                      ₵{((loanInfo?.remaining || 0) - parseFloat(amount || "0")).toFixed(2)}
                    </p>
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
                    setLoanInfo(null);
                    setAmount("");
                    setMethod("");
                    setReference("");
                    setNotes("");
                  }}
                >
                  New Repayment
                </Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90">
                  Print Receipt
                </Button>
              </div>
            </CardContent>
          </Card>
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
              {/* Phone Search */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    placeholder="Enter customer phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSearch}
                    disabled={!phone || isSearching}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>

              {/* Loan Info */}
              {loanInfo && (
                <div className="bg-background-pink-subtle rounded-lg p-4 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{loanInfo.user}</p>
                    <Badge variant="outline" className="bg-info/10 text-info border-info/20">
                      {loanInfo.id}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Loan Amount</p>
                      <p className="font-semibold text-foreground">
                        ₵{loanInfo.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Remaining</p>
                      <p className="font-semibold text-primary">
                        ₵{loanInfo.remaining.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Due Date</p>
                      <p className="font-semibold text-foreground">
                        {new Date(loanInfo.dueDate).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (GHS)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter repayment amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!loanInfo}
                />
                {loanInfo && amount && parseFloat(amount) > loanInfo.remaining && (
                  <p className="text-sm text-warning flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Amount exceeds remaining balance
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select value={method} onValueChange={setMethod} disabled={!loanInfo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="cash">Cash</SelectItem>
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
                  disabled={!loanInfo}
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
                  disabled={!loanInfo}
                  rows={3}
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={!loanInfo || !amount || !method || !reference}
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
