export function WelcomeEmailTemplate() {
  return (
    <div className="max-w-lg mx-auto bg-white font-sans">
      {/* Header */}
      <div className="px-8 pt-12 pb-8 text-center bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="w-16 h-16 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
          <span className="text-blue-600 font-bold text-xl">AM</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Welcome to Agenda Money
        </h1>
        <p className="text-blue-100 text-sm">
          Your journey to financial empowerment starts here
        </p>
      </div>

      {/* Hero Section */}
      <div className="px-8 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            Account Created Successfully
          </div>
          <p className="text-slate-700 text-lg leading-relaxed">
            You now have access to <strong>fast micro-loans</strong>, credit building tools, 
            and expert financial guidance.
          </p>
        </div>

        {/* Benefits Cards */}
        <div className="space-y-4 mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">⚡</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Quick Loans</h3>
                <p className="text-sm text-slate-600">Get approved in minutes, funds in hours</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-4 border-l-4 border-yellow-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">📈</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Build Credit</h3>
                <p className="text-sm text-slate-600">Improve your credit score with every payment</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border-l-4 border-green-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">🤝</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Expert Support</h3>
                <p className="text-sm text-slate-600">Personal financial guidance from our agents</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-8">
          <a 
            href="#" 
            className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Complete Your Profile
          </a>
          <p className="text-xs text-slate-500 mt-2">Takes less than 5 minutes</p>
        </div>

        {/* Next Steps */}
        <div className="bg-slate-50 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-center">What's Next?</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full text-white text-xs font-bold flex items-center justify-center">1</div>
              <span className="text-sm text-slate-700">Verify your identity (2 minutes)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-yellow-500 rounded-full text-white text-xs font-bold flex items-center justify-center">2</div>
              <span className="text-sm text-slate-700">Connect your bank account</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full text-white text-xs font-bold flex items-center justify-center">3</div>
              <span className="text-sm text-slate-700">Apply for your first loan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 border-t text-center">
        <p className="text-xs text-slate-500 mb-2">
          Need help getting started? Contact us at <strong>support@agendamoney.com</strong>
        </p>
        <p className="text-xs text-slate-400">
          © 2024 Agenda Money - Your Financial Partner
        </p>
      </div>
    </div>
  );
}