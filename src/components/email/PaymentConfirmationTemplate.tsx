export function PaymentConfirmationTemplate() {
  return (
    <div className="max-w-lg mx-auto bg-white font-sans">
      {/* Header */}
      <div className="px-8 pt-12 pb-8 text-center bg-gradient-to-r from-green-600 to-green-700">
        <div className="w-16 h-16 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
          <span className="text-green-600 font-bold text-2xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Payment Confirmed
        </h1>
        <p className="text-green-100 text-sm">
          Thank you for your on-time payment!
        </p>
      </div>

      {/* Hero Section */}
      <div className="px-8 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Payment Successful
          </div>
          <p className="text-slate-700 text-lg leading-relaxed">
            Your payment of <strong>₵ 444.24</strong> has been successfully processed. 
            Thank you for staying current on your loan!
          </p>
        </div>

        {/* Payment Details Card */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 mb-8 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">💳</span>
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Payment Details</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Payment Amount</span>
              <span className="font-bold text-green-600 text-lg">₵ 444.24</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-slate-200">
              <span className="text-sm text-slate-600">Payment Date</span>
              <span className="font-semibold text-slate-900">March 15, 2024</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Payment Method</span>
              <span className="font-mono text-sm text-slate-900">Bank Transfer (****-1234)</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Transaction ID</span>
              <span className="font-mono text-sm text-slate-900">PAY-2024-0315-002</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-blue-50 rounded-lg px-3 border border-blue-200">
              <span className="text-sm font-medium text-slate-700">Remaining Balance</span>
              <span className="font-bold text-slate-900">₵ 3,756.26</span>
            </div>
          </div>
        </div>

        {/* Credit Impact */}
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 mb-8 border border-green-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">📈</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Credit Score Impact</h3>
              <p className="text-sm text-slate-700 leading-relaxed mb-3">
                Excellent work! On-time payments like this help build your credit score and 
                improve your chances of getting better loan terms in the future.
              </p>
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">Payment history: Excellent</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Payment Info */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 mb-8 border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">📅</span>
            </div>
            <h3 className="font-semibold text-slate-900">Next Payment</h3>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Due Date: <strong>April 15, 2024</strong></span>
            <span className="font-bold text-slate-900">₵ 444.24</span>
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
          <p className="text-xs text-slate-500 mt-2">Track progress and manage payments</p>
        </div>

        {/* Rewards & Benefits */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900 text-center mb-4">Keep Up The Great Work!</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 text-center">
              <div className="w-8 h-8 bg-yellow-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-white font-bold text-xs">🎯</span>
              </div>
              <p className="text-xs font-medium text-slate-700">Building Credit</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 text-center">
              <div className="w-8 h-8 bg-purple-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-white font-bold text-xs">⭐</span>
              </div>
              <p className="text-xs font-medium text-slate-700">Better Rates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 border-t text-center">
        <p className="text-xs text-slate-500 mb-2">
          Questions about your payment? Contact us at <strong>payments@agendamoney.com</strong>
        </p>
        <p className="text-xs text-slate-400">
          © 2024 Agenda Money - Your Financial Partner
        </p>
      </div>
    </div>
  );
}