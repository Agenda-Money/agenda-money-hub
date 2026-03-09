export function LoanDisbursementTemplate() {
  return (
    <div className="max-w-lg mx-auto bg-white font-sans">
      {/* Header */}
      <div className="px-8 pt-12 pb-8 text-center bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="w-16 h-16 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
          <span className="text-blue-600 font-bold text-2xl">💰</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Funds Sent!
        </h1>
        <p className="text-blue-100 text-sm">
          Your loan has been successfully disbursed
        </p>
      </div>

      {/* Hero Section */}
      <div className="px-8 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Transfer Complete
          </div>
          <p className="text-slate-700 text-lg leading-relaxed">
            Great news! Your loan amount of <strong>₵ 5,000</strong> has been successfully transferred to your account.
          </p>
        </div>

        {/* Transaction Summary Card */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 mb-8 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">📄</span>
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Transaction Summary</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Transaction ID</span>
              <span className="font-mono text-sm text-slate-900">AM-2024-0315-001</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-slate-200">
              <span className="text-sm text-slate-600">Amount Disbursed</span>
              <span className="font-bold text-green-600 text-lg">₵ 5,000</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Transfer Date</span>
              <span className="font-semibold text-slate-900">March 15, 2024</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Receiving Account</span>
              <span className="font-mono text-sm text-slate-900">****-****-1234</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-blue-50 rounded-lg px-3 border border-blue-200">
              <span className="text-sm font-medium text-slate-700">First Payment Due</span>
              <span className="font-bold text-slate-900">April 15, 2024</span>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-6 mb-8 border border-yellow-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">!</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Important Reminder</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Your first payment of <strong>₵ 444.24</strong> is due on <strong>April 15, 2024</strong>. 
                Set up auto-pay now to ensure you never miss a payment and build your credit score.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3 mb-8">
          <a 
            href="#" 
            className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-4 rounded-xl font-semibold text-center shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Set Up Auto-Pay Now
          </a>
          <a 
            href="#" 
            className="block w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-medium text-center transition-colors"
          >
            View Loan Dashboard
          </a>
        </div>

        {/* Trust & Security */}
        <div className="bg-slate-50 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-center">Your Trust & Security</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="w-10 h-10 bg-green-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <span className="text-green-600 font-bold">🔒</span>
              </div>
              <p className="text-xs text-slate-600">Bank-Grade Security</p>
            </div>
            <div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <span className="text-blue-600 font-bold">📱</span>
              </div>
              <p className="text-xs text-slate-600">Transparent Tracking</p>
            </div>
            <div>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <span className="text-yellow-600 font-bold">🤝</span>
              </div>
              <p className="text-xs text-slate-600">24/7 Support</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 border-t text-center">
        <p className="text-xs text-slate-500 mb-2">
          Questions about your disbursement? Contact us at <strong>support@agendamoney.com</strong>
        </p>
        <p className="text-xs text-slate-400">
          © 2024 Agenda Money - Your Financial Partner
        </p>
      </div>
    </div>
  );
}