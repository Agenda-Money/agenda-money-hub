import { Button } from "@/components/ui/button";

export function LoanApprovalTemplate() {
  return (
    <div className="max-w-2xl mx-auto bg-white">
      {/* Header */}
      <div 
        className="px-8 py-6 text-center"
        style={{
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
        }}
      >
        <h1 className="text-2xl font-bold text-white mb-2">
          🎉 Loan Approved!
        </h1>
        <p className="text-green-100 text-sm">
          Your financial goals are now within reach
        </p>
      </div>

      {/* Content */}
      <div className="px-8 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-3">
            Congratulations! 🎊
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Great news! Your loan application has been approved. We're excited to support 
            your financial journey and help you achieve your goals.
          </p>
          <p className="text-slate-600 leading-relaxed mb-6">
            Your funds will be disbursed according to the terms outlined in your loan agreement.
          </p>
        </div>

        {/* Loan Details */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-6 mb-6">
          <h3 className="font-medium text-slate-800 mb-4">Loan Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 mb-1">Loan Amount</p>
              <p className="font-semibold text-slate-800">₵ 5,000</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Interest Rate</p>
              <p className="font-semibold text-slate-800">12% p.a.</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Loan Term</p>
              <p className="font-semibold text-slate-800">12 months</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Monthly Payment</p>
              <p className="font-semibold text-slate-800">₵ 444.24</p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-8">
          <Button 
            className="px-8 py-3 text-base font-medium"
            style={{
              background: 'linear-gradient(135deg, #EC1B84 0%, #C2185B 100%)',
              color: 'white',
              borderRadius: '40px'
            }}
          >
            View Loan Details
          </Button>
        </div>

        {/* Next Steps */}
        <div className="space-y-4 mb-8">
          <h3 className="font-medium text-slate-800 mb-3">Next Steps</h3>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mt-0.5 flex-shrink-0">1</div>
            <div>
              <h4 className="font-medium text-slate-800 mb-1">Fund Disbursement</h4>
              <p className="text-sm text-slate-600">Funds will be transferred to your account within 24 hours</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mt-0.5 flex-shrink-0">2</div>
            <div>
              <h4 className="font-medium text-slate-800 mb-1">Set Up Repayments</h4>
              <p className="text-sm text-slate-600">Configure automatic payments to ensure timely repayments</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mt-0.5 flex-shrink-0">3</div>
            <div>
              <h4 className="font-medium text-slate-800 mb-1">Build Your Credit</h4>
              <p className="text-sm text-slate-600">Make timely payments to improve your credit score</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 text-center border-t">
        <p className="text-xs text-slate-500 mb-2">
          Questions? Contact your agent or support@agendamoney.com
        </p>
        <p className="text-xs text-slate-400">
          © 2024 Agenda Money. All rights reserved.
        </p>
      </div>
    </div>
  );
}