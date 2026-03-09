export function PromotionalOfferTemplate() {
  return (
    <div className="max-w-lg mx-auto bg-white font-sans">
      {/* Header */}
      <div className="px-8 pt-12 pb-8 text-center bg-gradient-to-r from-yellow-500 to-yellow-600">
        <div className="w-16 h-16 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
          <span className="text-yellow-500 font-bold text-2xl">🎉</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Special Offer Just For You!
        </h1>
        <p className="text-yellow-100 text-sm">
          Exclusive loan offer with better rates
        </p>
      </div>

      {/* Hero Section */}
      <div className="px-8 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            Limited Time - 48 Hours Only
          </div>
          <p className="text-slate-700 text-lg leading-relaxed">
            Based on your excellent payment history, you qualify for our 
            <strong> Premium Loan Package</strong> with reduced interest rates!
          </p>
        </div>

        {/* Offer Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 mb-8 text-white shadow-lg">
          <div className="text-center mb-6">
            <div className="inline-block bg-yellow-400 text-blue-900 px-4 py-2 rounded-full text-sm font-bold mb-4">
              PREMIUM OFFER
            </div>
            <h2 className="text-3xl font-bold mb-2">Up to ₵ 15,000</h2>
            <p className="text-blue-100">at just 8% APR</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-blue-900 font-bold text-xs">✓</span>
              </div>
              <span className="text-sm">Reduced rate - Save ₵ 400+ per year</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-blue-900 font-bold text-xs">✓</span>
              </div>
              <span className="text-sm">Higher loan amounts up to ₵ 15,000</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-blue-900 font-bold text-xs">✓</span>
              </div>
              <span className="text-sm">Flexible terms - 6 to 24 months</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-blue-900 font-bold text-xs">✓</span>
              </div>
              <span className="text-sm">No processing fees</span>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-200">
          <h3 className="font-bold text-slate-900 text-center mb-4">Rate Comparison</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-sm font-medium text-slate-600">Loan Package</span>
              <div className="flex gap-4">
                <span className="text-sm text-slate-500 w-20 text-center">Regular</span>
                <span className="text-sm text-green-600 w-20 text-center font-semibold">Premium</span>
              </div>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-700">Interest Rate</span>
              <div className="flex gap-4">
                <span className="text-sm text-slate-900 w-20 text-center">12% APR</span>
                <span className="text-sm text-green-600 w-20 text-center font-bold">8% APR</span>
              </div>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-700">Max Amount</span>
              <div className="flex gap-4">
                <span className="text-sm text-slate-900 w-20 text-center">₵ 5,000</span>
                <span className="text-sm text-green-600 w-20 text-center font-bold">₵ 15,000</span>
              </div>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-700">Processing Fee</span>
              <div className="flex gap-4">
                <span className="text-sm text-slate-900 w-20 text-center">₵ 50</span>
                <span className="text-sm text-green-600 w-20 text-center font-bold">FREE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Urgency Timer */}
        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6 mb-8 border border-red-200">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500 rounded-full mx-auto mb-3 flex items-center justify-center">
              <span className="text-white font-bold">⏰</span>
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Offer Expires Soon!</h3>
            <p className="text-sm text-slate-700 mb-4">This exclusive rate is available for the next 48 hours only.</p>
            <div className="bg-white rounded-lg p-3 inline-block border border-red-200">
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">47</div>
                  <div className="text-xs text-slate-500">Hours</div>
                </div>
                <div className="text-red-500">:</div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">23</div>
                  <div className="text-xs text-slate-500">Minutes</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-8">
          <a 
            href="#" 
            className="inline-block bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-lg"
          >
            Claim Your Premium Offer
          </a>
          <p className="text-xs text-slate-500 mt-2">Apply now - Decision in 5 minutes</p>
        </div>

        {/* Social Proof */}
        <div className="bg-slate-50 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-center">Why Choose Agenda Money?</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600 mb-1">98%</div>
              <p className="text-xs text-slate-600">Customer Satisfaction</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 mb-1">24hr</div>
              <p className="text-xs text-slate-600">Fast Approval</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 mb-1">10k+</div>
              <p className="text-xs text-slate-600">Happy Customers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 border-t text-center">
        <p className="text-xs text-slate-500 mb-2">
          Questions about this offer? Contact us at <strong>offers@agendamoney.com</strong>
        </p>
        <p className="text-xs text-slate-400 mb-2">
          © 2024 Agenda Money - Your Financial Partner
        </p>
        <p className="text-xs text-slate-400">
          *Offer subject to credit approval. Terms and conditions apply.
        </p>
      </div>
    </div>
  );
}