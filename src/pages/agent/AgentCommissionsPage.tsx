import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Banknote, 
  TrendingUp, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Mock data for initial UI build
const MOCK_STATS = {
  estimatedPayout: 145.00,
  totalEarned: 1250.00,
  pendingDeductions: 20.00
};

const MOCK_HISTORY = [
  { id: 1, type: "signup", description: "New Customer Signup (John D.)", amount: 5, date: "2026-02-24", status: "pending" },
  { id: 2, type: "repayment", description: "Loan Repayment (Sarah M.)", amount: 10, date: "2026-02-23", status: "paid" },
  { id: 3, type: "default", description: "Customer Default (Mike T.)", amount: -10, date: "2026-02-20", status: "deducted" },
  { id: 4, type: "signup", description: "New Customer Signup (Alice R.)", amount: 5, date: "2026-02-18", status: "paid" },
];

export default function AgentCommissionsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "earnings" | "deductions">("all");

  const filteredHistory = MOCK_HISTORY.filter(item => {
    if (activeTab === "earnings") return item.amount > 0;
    if (activeTab === "deductions") return item.amount < 0;
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Commissions</h1>
        <p className="text-muted-foreground mt-1">Track your earnings, payouts, and performance.</p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Estimated Payout */}
        <Card className="bg-pink-50/50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-pink-700 dark:text-pink-400 flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              Estimated Next Payout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-900 dark:text-pink-100">GHS {MOCK_STATS.estimatedPayout.toFixed(2)}</div>
            <p className="text-xs text-pink-600 dark:text-pink-400 mt-1 font-medium">Pending clearance</p>
          </CardContent>
        </Card>

        {/* Total Earned */}
        <Card>
          <CardHeader className="pb-2 bg-gray-50/50 rounded-t-xl">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Earned (All Time)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-gray-900">GHS {MOCK_STATS.totalEarned.toFixed(2)}</div>
            <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Looking good!
            </p>
          </CardContent>
        </Card>

        {/* Pending Deductions */}
        <Card>
          <CardHeader className="pb-2 bg-red-50/30 rounded-t-xl">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Pending Deductions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-gray-900">GHS {MOCK_STATS.pendingDeductions.toFixed(2)}</div>
            <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" /> From defaults
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Rules Info Box */}
      <Card className="border-blue-100 shadow-sm bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            How You Earn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-blue-100/50 shadow-sm">
              <div className="text-sm font-bold text-gray-900 mb-1">New Customer Signup</div>
              <div className="text-lg font-black text-green-600 mb-1">+ GHS 5.00</div>
              <div className="text-xs text-gray-500">Paid Bi-monthly</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-blue-100/50 shadow-sm">
              <div className="text-sm font-bold text-gray-900 mb-1">Successful Repayment</div>
              <div className="text-lg font-black text-green-600 mb-1">+ GHS 10.00</div>
              <div className="text-xs text-gray-500">Paid Bi-monthly</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-blue-100/50 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
              <div className="text-sm font-bold text-gray-900 mb-1">Customer Default</div>
              <div className="text-lg font-black text-red-600 mb-1">- GHS 10.00</div>
              <div className="text-xs text-gray-500">Deducted Monthly</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History Placeholder */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest commissions and deductions.</CardDescription>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab("all")}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === "all" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                All
              </button>
              <button 
                onClick={() => setActiveTab("earnings")}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === "earnings" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                Earnings
              </button>
              <button 
                onClick={() => setActiveTab("deductions")}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === "deductions" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                Deductions
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredHistory.map((item, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={item.id} 
                className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-gray-100/80 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.amount > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                    {item.amount > 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{item.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{item.date}</span>
                      <span className="text-gray-300">&bull;</span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${
                        item.status === 'paid' ? 'bg-green-100 text-green-700' :
                        item.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-bold ${item.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                  {item.amount > 0 ? "+" : ""}GHS {Math.abs(item.amount).toFixed(2)}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
