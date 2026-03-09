import { Button } from "@/components/ui/button";

export function PaymentReminderTemplate() {
  return (
    <div className="max-w-lg mx-auto bg-white font-sans">
      {/* Header */}
      <div className="px-8 pt-12 pb-8 text-center">
        <div className="w-12 h-12 bg-orange-500 rounded-full mx-auto mb-6 flex items-center justify-center">
          <span className="text-white font-bold text-lg">⏰</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Payment Reminder
        </h1>
        <p className="text-slate-500 text-sm">
          Your payment is due in 3 days
        </p>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        <div className="mb-8">
          <p className="text-slate-600 leading-relaxed mb-6">
            This is a friendly reminder that your loan payment is due soon. Making timely 
            payments helps build your credit and keeps your account in good standing.
          </p>
        </div>

        {/* Payment Details */}
        <div className="bg-slate-50 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-slate-900 mb-4">Payment Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Due Date</span>
              <span className="font-semibold text-slate-900">March 15, 2024</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Amount Due</span>
              <span className="font-semibold text-slate-900">₵ 444.24</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Remaining Balance</span>
              <span className="font-semibold text-slate-900">₵ 4,200.50</span>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3 mb-8">
          <a 
            href="#" 
            className="block w-full bg-primary text-white px-6 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors text-center"
          >
            Make Payment Now
          </a>
          <a 
            href="#" 
            className="block w-full bg-slate-100 text-slate-700 px-6 py-3 rounded-full font-medium hover:bg-slate-200 transition-colors text-center"
          >
            Set Up Auto-Pay
          </a>
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          <h3 className="font-medium text-slate-800 mb-3">Why pay on time?</h3>
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
            <span className="text-sm text-slate-700">Build your credit score</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
            <span className="text-sm text-slate-700">Avoid late fees</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></div>
            <span className="text-sm text-slate-700">Qualify for better rates</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 border-t text-center">
        <p className="text-xs text-slate-500 mb-1">
          Need help? Contact us at payments@agendamoney.com
        </p>
        <p className="text-xs text-slate-400">
          © 2024 Agenda Money
        </p>
      </div>
    </div>
  );
}