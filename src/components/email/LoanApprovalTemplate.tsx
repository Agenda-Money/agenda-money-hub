export function LoanApprovalTemplate() {
  return (
    <div className="max-w-lg mx-auto bg-white font-sans">
      {/* Header */}
      <div className="px-8 pt-12 pb-8 text-center bg-gradient-to-r from-green-600 to-green-700">
        <div className="w-16 h-16 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
          <span className="text-green-600 font-bold text-2xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Loan Approved!
        </h1>
        <p className="text-green-100 text-sm">
          Congratulations! Your application was successful
        </p>
      </div>

      {/* Hero Section */}
      <div className="px-8 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Application Approved
          </div>
          <p className="text-slate-700 text-lg leading-relaxed">
            Great news! Your loan has been <strong>approved</strong>. Funds will be disbursed to your account within <strong>24 hours</strong>.
          </p>
        </div>

        {/* Loan Summary Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 mb-8 border border-blue-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">₵</span>
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Loan Summary</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Loan Amount</span>
              <span className="font-bold text-slate-900 text-lg">₵ 5,000</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-blue-200">
              <span className="text-sm text-slate-600">Interest Rate</span>
              <span className="font-semibold text-slate-900">12% p.a.</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Loan Term</span>
              <span className="font-semibold text-slate-900">12 months</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-yellow-50 rounded-lg px-3 border border-yellow-200">
              <span className="text-sm font-medium text-slate-700">Monthly Payment</span>
              <span className="font-bold text-slate-900 text-lg">₵ 444.24</span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-8">
          <a 
            href="#" 
            className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            View Loan Dashboard
          </a>
          <p className="text-xs text-slate-500 mt-2">Track your loan and set up payments</p>
        </div>

        {/* Next Steps */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 text-center mb-4">What Happens Next?</h3>
          
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border-l-4 border-green-500">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full text-white text-sm font-bold flex items-center justify-center mt-0.5">1</div>
              <div>
                <p className="font-medium text-slate-900">Funds Disbursement</p>
                <p className="text-sm text-slate-600">Your loan will be transferred within 24 hours</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-4 border-l-4 border-yellow-500">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-yellow-500 rounded-full text-white text-sm font-bold flex items-center justify-center mt-0.5">2</div>
              <div>
                <p className="font-medium text-slate-900">Set Up Auto-Pay</p>
                <p className="text-sm text-slate-600">Avoid late fees and build credit automatically</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border-l-4 border-blue-500">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full text-white text-sm font-bold flex items-center justify-center mt-0.5">3</div>
              <div>
                <p className="font-medium text-slate-900">Track Progress</p>
                <p className="text-sm text-slate-600">Monitor payments and credit score improvements</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 border-t text-center">
        <p className="text-xs text-slate-500 mb-2">
          Questions about your loan? Contact your agent or email <strong>loans@agendamoney.com</strong>
        </p>
        <p className="text-xs text-slate-400">
          © 2024 Agenda Money - Your Financial Partner
        </p>
      </div>
    </div>
  );
}