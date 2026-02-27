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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface LoanInfo {
  id: string;
  user: string;
  amount: number;
  remaining: number;
  dueDate: string;
}

import { useQuery, useMutation } from "@tanstack/react-query";
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

  const { data: recentRepayments, isLoading: isLoadingRecent } = useQuery({
    queryKey: ["recent-repayments"],
    queryFn: async () => {
      const res = await api.get("/api/admin/repayments/recent?hours=24");
      return res.data?.data || [];
    },
  });

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
            Loan Repayments
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage loan repayments and view history
          </p>
        </div>

        <Tabs defaultValue="record" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="record">Manual Repayment</TabsTrigger>
            <TabsTrigger value="history">Repayment History</TabsTrigger>
          </TabsList>

          <TabsContent value="record">
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
      </TabsContent>

      <TabsContent value="history">
         <Card>
           <CardHeader>
             <CardTitle>Recent Repayments (24h)</CardTitle>
           </CardHeader>
           <CardContent>
             {isLoadingRecent ? (
                <div className="text-center p-6 text-muted-foreground">Loading...</div>
             ) : !recentRepayments || recentRepayments.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground">No recent repayments found.</div>
             ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 font-medium text-muted-foreground pl-2">Transaction</th>
                        <th className="pb-3 font-medium text-muted-foreground">Customer</th>
                        <th className="pb-3 font-medium text-muted-foreground">Amount Paid</th>
                        <th className="pb-3 font-medium text-right text-muted-foreground pr-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRepayments.map((rep: any) => (
                         <tr key={rep.repaymentId} className="border-b border-border/50 py-3 hover:bg-muted/50 transition-colors">
                            {/* Transaction Ref & Date */}
                            <td className="py-4 pl-2">
                              <div className="flex items-center gap-2">
                                {/* Simple icon to denote payment method, could expand later to real SVG icons */}
                                <div className="h-8 px-2 min-w-[32px] rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                                   {rep.method === 'MOMO' ? 'MoMo' : rep.method === 'BANK' ? 'Bank' : 'Pay'}
                                </div>
                                <div>
                                   <div className="font-medium text-foreground">{rep.loanReference}</div>
                                   <div className="text-xs text-muted-foreground">{rep.paidAt ? format(new Date(rep.paidAt), "MMM d, h:mm a") : "N/A"}</div>
                                </div>
                              </div>
                            </td>

                            {/* Customer Identity */}
                            <td className="py-4">
                              <div className="font-bold text-foreground">
                                 {rep.userName || "Unknown Customer"}
                                 {/* Example Badge placeholder if we eventually have node status in this endpoint */}
                                 {rep.isNode && <Badge variant="outline" className="ml-2 text-[10px] h-4 px-1 py-0 border-blue-200 text-blue-600 bg-blue-50">Node</Badge>}
                              </div>
                              <div className="text-xs text-muted-foreground">{rep.userMsisdn}</div>
                            </td>

                            {/* Money Visual Hierarchy */}
                            <td className="py-4">
                              <div className="font-bold text-success text-base">GHS {Number(rep.amountPaid ?? 0).toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">Bal: GHS {Number(rep.remainingBalance ?? 0).toFixed(2)}</div>
                            </td>

                            {/* Status */}
                            <td className="py-4 pr-2">
                              <div className="flex justify-end h-full items-center">
                                <Badge variant="outline" className={rep.isFullPayment ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}>
                                  {rep.isFullPayment ? "Fully Paid" : "Partial"}
                                </Badge>
                              </div>
                            </td>
                         </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             )}
           </CardContent>
         </Card>
      </TabsContent>
    </Tabs>
      </div>
    </DashboardLayout>
  );
}
