export function LoanRejectionTemplate() {
  return (
    <div className="max-w-lg mx-auto bg-white font-sans">
      {/* Header */}
      <div className="px-8 pt-12 pb-8 text-center">
        <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-6 flex items-center justify-center">
          <span className="text-slate-600 font-bold text-lg">ℹ️</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Update on your application
        </h1>
        <p className="text-slate-500 text-sm">
          Regarding your recent loan request
        </p>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        <div className="mb-8">
          <p className="text-slate-600 leading-relaxed mb-6">
            Thank you for applying for a loan with Agenda Money. After careful review of your application 
            and current financial profile, we are unable to approve your request for ₵ 5,000 at this time.
          </p>
          <p className="text-slate-600 leading-relaxed mb-6">
            We understand this might be disappointing news, but this decision isn't final forever. 
            We encourage you to continue building your financial profile with us.
          </p>
        </div>

        {/* Next Steps */}
        <div className="bg-slate-50 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-slate-900 mb-4">What you can do next:</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></div>
              <p className="text-sm text-slate-700">Review your credit utilization and outstanding balances</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></div>
              <p className="text-sm text-slate-700">Apply for a smaller loan amount in 30 days</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></div>
              <p className="text-sm text-slate-700">Consult with your assigned agent for financial guidance</p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-8">
          <a 
            href="#" 
            className="inline-block bg-slate-900 text-white px-8 py-3 rounded-full font-medium hover:bg-slate-800 transition-colors"
          >
            Review Application Details
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 border-t text-center">
        <p className="text-xs text-slate-500 mb-1">
          Questions about this decision? Contact support@agendamoney.com
        </p>
        <p className="text-xs text-slate-400">
          © 2024 Agenda Money
        </p>
      </div>
    </div>
  );
}