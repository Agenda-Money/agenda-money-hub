export function MonthlyStatementTemplate() {
  return (
    <div className="max-w-lg mx-auto bg-white font-sans">
      {/* Header */}
      <div className="px-8 pt-12 pb-8 text-center">
        <div className="w-12 h-12 bg-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center">
          <span className="text-white font-bold text-lg">📄</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Monthly Statement
        </h1>
        <p className="text-slate-500 text-sm">
          Your statement for October 2024 is ready
        </p>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        <div className="mb-8">
          <p className="text-slate-600 leading-relaxed mb-6">
            Hi there, your monthly account statement for October 2024 is now available. 
            Here's a quick summary of your account activity.
          </p>
        </div>

        {/* Account Summary */}
        <div className="bg-slate-50 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-slate-900 mb-4">Account Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Opening Balance</span>
              <span className="font-medium text-slate-900">₵ 2,450.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Total Payments</span>
              <span className="font-medium text-green-600">- ₵ 450.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Interest Applied</span>
              <span className="font-medium text-slate-900">+ ₵ 45.00</span>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">Closing Balance</span>
                <span className="font-bold text-slate-900">₵ 2,045.00</span>
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
            Download Full Statement
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 border-t text-center">
        <p className="text-xs text-slate-500 mb-1">
          To stop receiving paperless statements, update your preferences
        </p>
        <p className="text-xs text-slate-400">
          © 2024 Agenda Money
        </p>
      </div>
    </div>
  );
}