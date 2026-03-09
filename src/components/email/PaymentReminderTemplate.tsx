export function PaymentReminderTemplate() {
  return (
    <div className="max-w-lg mx-auto bg-white font-sans">
      {/* Header */}
      <div className="px-8 pt-12 pb-8 text-center bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="w-16 h-16 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
          <span className="text-orange-500 font-bold text-2xl">⏰</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Payment Reminder
        </h1>
        <p className="text-orange-100 text-sm">
          Your payment is due in 3 days
        </p>
      </div>

      {/* Hero Section */}
      <div className="px-8 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            Payment Due Soon
          </div>
          <p className="text-slate-700 text-lg leading-relaxed">
            This is a friendly reminder that your loan payment is due soon. Making timely 
            payments helps <strong>build your credit</strong> and keeps your account in good standing.
          </p>
        </div>

        {/* Payment Details Card */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 mb-8 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">💰</span>
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Payment Details</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Due Date</span>
              <span className="font-bold text-orange-600 text-lg">March 15, 2024</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-slate-200">
              <span className="text-sm text-slate-600">Payment Amount</span>
              <span className="font-bold text-slate-900 text-lg">₵ 444.24</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Remaining Balance</span>
              <span className="font-semibold text-slate-900">₵ 4,200.50</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-blue-50 rounded-lg px-3 border border-blue-200">
              <span className="text-sm font-medium text-slate-700">Account Status</span>
              <span className="font-bold text-green-600">Good Standing</span>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3 mb-8">
          <a 
            href="#" 
            className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-4 rounded-xl font-semibold text-center shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Make Payment Now
          </a>
          <a 
            href="#" 
            className="block w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-6 py-3 rounded-xl font-medium text-center shadow-md hover:shadow-lg transition-all duration-200"
          >
            Set Up Auto-Pay & Save Time
          </a>
        </div>

        {/* Benefits Section */}
        <div className="space-y-4 mb-8">
          <h3 className="font-semibold text-slate-900 text-center mb-4">Benefits of On-Time Payments</h3>
          
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border-l-4 border-green-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">📈</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Build Your Credit Score</h4>
                <p className="text-sm text-slate-600">Each payment improves your creditworthiness</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">💸</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Avoid Late Fees</h4>
                <p className="text-sm text-slate-600">Stay on track and keep more money in your pocket</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-4 border-l-4 border-yellow-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">⭐</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Qualify for Better Rates</h4>
                <p className="text-sm text-slate-600">Good payment history unlocks premium offers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-Pay Benefits */}
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">💡</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Why Set Up Auto-Pay?</h3>
              <ul className="text-sm text-slate-700 space-y-1">
                <li>• Never miss a payment again</li>
                <li>• Build consistent payment history</li>
                <li>• Save time and reduce stress</li>
                <li>• Get priority customer support</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 border-t text-center">
        <p className="text-xs text-slate-500 mb-2">
          Need help with your payment? Contact us at <strong>payments@agendamoney.com</strong> or call (233) 555-0123
        </p>
        <p className="text-xs text-slate-400">
          © 2024 Agenda Money - Your Financial Partner
        </p>
      </div>
    </div>
  );
}