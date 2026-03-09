import { Button } from "@/components/ui/button";

export function LoanApprovalTemplate() {
  return (
    <div className="max-w-lg mx-auto bg-white font-sans">
      {/* Header */}
      <div className="px-8 pt-12 pb-8 text-center">
        <div className="w-12 h-12 bg-green-600 rounded-full mx-auto mb-6 flex items-center justify-center">
          <span className="text-white font-bold text-lg">✓</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Loan Approved
        </h1>
        <p className="text-slate-500 text-sm">
          Congratulations! Your application was successful
        </p>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        <div className="mb-8">
          <p className="text-slate-600 leading-relaxed mb-6">
            Great news! Your loan has been approved. Funds will be disbursed to your account 
            within 24 hours according to your loan agreement terms.
          </p>
        </div>

        {/* Loan Details */}
        <div className="bg-slate-50 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-slate-900 mb-4">Loan Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Amount</span>
              <span className="font-semibold text-slate-900">₵ 5,000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Interest Rate</span>
              <span className="font-semibold text-slate-900">12% p.a.</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Term</span>
              <span className="font-semibold text-slate-900">12 months</span>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Monthly Payment</span>
                <span className="font-bold text-slate-900">₵ 444.24</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-8">
          <a 
            href="#" 
            className="inline-block bg-primary text-white px-8 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            View Loan Dashboard
          </a>
        </div>

        {/* Next Steps */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <div className="w-5 h-5 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center mt-0.5 flex-shrink-0">1</div>
            <div>
              <p className="text-sm text-slate-700 font-medium">Funds will arrive within 24 hours</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5 flex-shrink-0">2</div>
            <div>
              <p className="text-sm text-slate-700 font-medium">Set up automatic payments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 border-t text-center">
        <p className="text-xs text-slate-500 mb-1">
          Questions? Contact your agent or reply to this email
        </p>
        <p className="text-xs text-slate-400">
          © 2024 Agenda Money
        </p>
      </div>
    </div>
  );
}